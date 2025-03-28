<?php

namespace App\Console\Commands;

use App\Traits\HasSymlinkMigrations;
use Illuminate\Console\Command;

class AddPremiumMigrations extends Command
{
    use HasSymlinkMigrations;
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:premium';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Also migrated the premium addon tables';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $this->symlinkMigrations();

        $this->call('migrate');
    }
}
