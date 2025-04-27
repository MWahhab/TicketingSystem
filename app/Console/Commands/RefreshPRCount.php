<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RefreshPRCount extends Command
{
    /**
     * @var string
     */
    protected $signature   = 'pr:refresh-pr-count';

    /**
     * @var string
     */
    protected $description = 'Refresh the PR count for the instance based on configured cap.';

    public function handle(): int
    {
        try {
            if (!class_exists(\PremiumAddons\models\PremiumSubscriptions::class) ||
                !class_exists(\PremiumAddons\services\PremiumSubscriptionService::class)) {
                $this->warn('Premium module is not installed. Skipping.');
                return self::SUCCESS;
            }

            $subscription = \PremiumAddons\models\PremiumSubscriptions::orderBy('created_at', 'desc')->first();

            if (!$subscription) {
                $this->warn('No subscription found. Skipping.');
                return self::SUCCESS;
            }

            $generationStatus = app(\PremiumAddons\services\PremiumSubscriptionService::class)
                ->getGenerationStatus();

            $subscription->pr_count = $generationStatus['generation_cap'] ?? 0;
            $subscription->save();

            $this->info('PR count refreshed.');
        } catch (\Exception $e) {
            Log::error('Error refreshing PR count: ' . $e->getMessage());
            $this->error('An error occurred while refreshing PR count. Please check the logs.');
            return self::SUCCESS;
        }

        return self::FAILURE;
    }
}
