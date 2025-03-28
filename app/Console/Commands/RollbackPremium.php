<?php

namespace App\Console\Commands;

use App\Traits\HasSymlinkMigrations;
use Illuminate\Console\Command;

class RollbackPremium extends Command
{
    use HasSymlinkMigrations;

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:rollback-premium {--step= : Number of steps to rollback}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Symlinks PremiumAddons migrations and performs a rollback';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $this->symlinkMigrations();

        $this->call('migrate:rollback', [
            '--step' => $this->option('step'),
        ]);
    }
}
