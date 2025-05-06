<?php

namespace App\Console\Commands;

use App\Interfaces\HasMigrationDefinition;
use Illuminate\Console\Command;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Fluent;
use ReflectionClass;
use Symfony\Component\Finder\Finder;

class FixIndexes extends Command
{
    protected $signature   = 'migrate:indexes';
    protected $description = 'Replay index definitions from migration definition() methods';

    public function handle(): int
    {
        $this->info('Replaying index definitions...');

        foreach ($this->getMigrationClasses() as $migration) {
            $table   = $migration::table();
            $closure = $migration::definition();

            $this->replayIndexes($table, $closure);
            $this->info("✔ Indexes replayed for: $table");
        }

        return self::SUCCESS;
    }

    private function replayIndexes(string $table, \Closure $definition): void
    {
        $blueprint = new Blueprint($table);
        $definition($blueprint);

        $existing  = $this->getExistingIndexes($table);
        $fkColumns = $this->getForeignKeyColumns($table);

        $this->replayCommandIndexes($table, $blueprint, $existing, $fkColumns);
        $this->replayColumnIndexes($table, $blueprint, $existing, $fkColumns);
    }

    private function replayCommandIndexes(string $table, Blueprint $blueprint, array $existing, array $fkColumns): void
    {
        $commands = $this->getBlueprintCommands($blueprint);

        foreach ($commands as $cmd) {
            if (!$cmd instanceof Fluent) {
                continue;
            }
            if (data_get($cmd, 'name') !== 'index') {
                continue;
            }
            $columns = array_map('strtolower', (array) data_get($cmd, 'columns', []));
            $match   = collect($existing)->search(fn ($cols) => $cols === $columns);

            if ($match !== false && $this->isFKProtected($columns, $fkColumns)) {
                $this->warn("⛔ Skipped FK-backed index `$match` on `$table`.");
                continue;
            }

            if ($match !== false) {
                DB::statement("DROP INDEX `$match` ON `$table`");
            }

            Schema::table($table, fn ($t) => $t->index($columns));
        }
    }

    private function replayColumnIndexes(string $table, Blueprint $blueprint, array $existing, array $fkColumns): void
    {
        foreach ($blueprint->getColumns() as $col) {
            if (!data_get($col, 'index')) {
                continue;
            }

            $name  = strtolower((string) data_get($col, 'name'));
            $match = collect($existing)->search(fn ($cols) => $cols === [$name]);

            if ($match !== false && in_array($name, $fkColumns, true)) {
                $this->warn("⛔ Skipped FK-backed column index on `$name` in `$table`.");
                continue;
            }

            if ($match !== false) {
                DB::statement("DROP INDEX `$match` ON `$table`");
            }

            Schema::table($table, fn ($t) => $t->index([$name]));
        }
    }

    private function getBlueprintCommands(Blueprint $blueprint): array
    {
        $ref  = new ReflectionClass($blueprint);
        $prop = $ref->getProperty('commands');
        $prop->setAccessible(true);

        return (array) $prop->getValue($blueprint);
    }

    private function getExistingIndexes(string $table): array
    {
        return collect(DB::select("SHOW INDEX FROM `$table`"))
            ->groupBy('Key_name')
            ->map(fn ($rows) => collect($rows)->pluck('Column_name')->map('strtolower')->values()->all())
            ->all();
    }

    private function getForeignKeyColumns(string $table): array
    {
        return collect(DB::select('
            SELECT COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL
        ', [$table]))->pluck('COLUMN_NAME')->map('strtolower')->unique()->all();
    }

    private function isFKProtected(array $columns, array $fkColumns): bool
    {
        return array_intersect($columns, $fkColumns) !== [];
    }

    private function getMigrationClasses(): array
    {
        return collect(
            Finder::create()->files()->in(database_path('migrations'))->name('*.php')
        )->map(fn ($file) => require $file->getRealPath())
            ->filter(fn ($migration) => $migration instanceof HasMigrationDefinition)
            ->values()
            ->all();
    }
}
