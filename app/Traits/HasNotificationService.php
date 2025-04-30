<?php

namespace App\Traits;

use App\Services\NotificationService;

trait HasNotificationService
{
    public function notify(): void
    {
        app(NotificationService::class)->notify($this);
    }
}
