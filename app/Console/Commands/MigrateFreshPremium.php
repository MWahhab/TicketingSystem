<?php

namespace App\Console\Commands;

use App\Traits\HasSymlinkMigrations;
use Illuminate\Console\Command;

class MigrateFreshPremium extends Command
{
    use HasSymlinkMigrations;

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature   = 'migrate:fresh-premium {--seed}';
    protected $description = 'Symlink PremiumAddons migrations and run migrate:fresh';

    /**
     * @return void
     */
    public function handle(): void
    {
        $this->symlinkMigrations();

        $this->call('migrate:fresh', [
            '--seed' => $this->option('seed'),
        ]);
    }
}
