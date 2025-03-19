<?php

namespace app\Traits;

use App\Services\NotificationService;

trait HasNotificationService
{
    public function notify(): void
    {
        app(NotificationService::class)->notify($this);
    }
}
