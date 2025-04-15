<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PremiumAddons\services\PRQueueService;

class ProcessQueuedPRsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pr:process-next';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process the next queued PR in prs_queue';

    /**
     * Execute the console command.
     */
    public function handle(PRQueueService $service): int
    {
        $service->processNext();
        return self::SUCCESS;
    }
}
