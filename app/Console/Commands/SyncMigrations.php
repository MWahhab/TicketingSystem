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

class SyncMigrations extends Command
{
    protected $signature   = 'migrate:sync';
    protected $description = 'Sync table indexes and drop orphaned columns not in migration definitions (FK-protected excluded).';

    public function handle(): int
    {
        $this->info('Syncing migration definitions...');

        foreach ($this->getMigrationClasses() as $migration) {
            $table   = $migration::table();
            $closure = $migration::definition();

            $this->syncSchema($table, $closure);
            $this->info("✔ Synced: $table");
        }

        return self::SUCCESS;
    }

    private function syncSchema(string $table, \Closure $definition): void
    {
        $blueprint = new Blueprint($table);
        $definition($blueprint);

        $definedColumnNames = collect($blueprint->getColumns())
            ->pluck('name')
            ->map('strtolower')
            ->merge(['created_at', 'updated_at'])
            ->unique()
            ->toArray();

        $existingIndexes     = $this->getExistingIndexes($table);
        $fkColumns           = $this->getForeignKeyColumns($table);
        $existingColumnNames = $this->getExistingColumns($table);

        $this->replayCommandIndexes($table, $blueprint, $existingIndexes, $fkColumns);
        $this->replayColumnIndexes($table, $blueprint, $existingIndexes, $fkColumns);
        $this->syncColumns($table, $blueprint, $existingColumnNames, $definedColumnNames, $fkColumns);
    }

    private function replayCommandIndexes(string $table, Blueprint $blueprint, array $existing, array $fkColumns): void
    {
        foreach ($this->getBlueprintCommands($blueprint) as $cmd) {
            if (!$cmd instanceof Fluent) {
                continue;
            }
            if (data_get($cmd, 'name') !== 'index') {
                continue;
            }
            $columns = array_map('strtolower', (array) $cmd->columns);
            $match   = collect($existing)->search(fn ($cols) => $cols === $columns);

            if ($match !== false && $this->isFKProtected($columns, $fkColumns)) {
                $this->warn("Skipped FK-backed index `$match` on `$table`.");
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

            $name  = strtolower((string) $col->name);
            $match = collect($existing)->search(fn ($cols) => $cols === [$name]);

            if ($match !== false && in_array($name, $fkColumns, true)) {
                $this->warn("Skipped FK-backed column index on `$name` in `$table`.");
                continue;
            }

            if ($match !== false) {
                DB::statement("DROP INDEX `$match` ON `$table`");
            }

            Schema::table($table, fn ($t) => $t->index([$name]));
        }
    }

    private function syncColumns(
        string    $table,
        Blueprint $blueprint,
        array     $existingColumns,
        array     $definedColumnNames,
        array     $fkColumns
    ): void {
        $existingSet = array_map('strtolower', $existingColumns);
        $definedSet  = array_map('strtolower', $definedColumnNames);

        $toDrop = array_diff($existingSet, $definedSet, $fkColumns);
        foreach ($toDrop as $column) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn($column));
            $this->warn("Dropped orphan column `$column` from `$table`.");
        }

        $toAdd = array_diff($definedSet, $existingSet);
        foreach ($toAdd as $name) {
            $col = collect($blueprint->getColumns())
                ->first(fn ($c) => strtolower($c->name) === $name);

            if (! $col) {
                $this->warn("Cannot find definition for `$name` in `$table`.");
                continue;
            }

            Schema::table($table, function (Blueprint $t) use ($col) {
                $column = $t->{$col->type}($col->name);

                if ($col->nullable ?? false) {
                    $column->nullable();
                }

                if (property_exists($col, 'default') && $col->default !== null) {
                    $column->default($col->default);
                }
            });

            $this->info("Added missing column `$name` to `$table`.");
        }
    }



    private function getBlueprintCommands(Blueprint $blueprint): array
    {
        $prop = (new ReflectionClass($blueprint))->getProperty('commands');
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

    private function getExistingColumns(string $table): array
    {
        return collect(DB::select('
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ', [$table]))->pluck('COLUMN_NAME')->map('strtolower')->toArray();
    }

    private function getForeignKeyColumns(string $table): array
    {
        return collect(DB::select('
            SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL
        ', [$table]))->pluck('COLUMN_NAME')->map('strtolower')->unique()->toArray();
    }

    private function isFKProtected(array $columns, array $fkColumns): bool
    {
        return array_intersect($columns, $fkColumns) !== [];
    }

    private function getMigrationClasses(): array
    {
        return collect(Finder::create()->files()->in(database_path('migrations'))->name('*.php'))
            ->map(fn ($file) => require $file->getRealPath())
            ->filter(fn ($migration) => $migration instanceof HasMigrationDefinition)
            ->values()
            ->all();
    }
}
