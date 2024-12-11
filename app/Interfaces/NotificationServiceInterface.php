<?php

namespace App\Interfaces;

/**
 * Interface NotificationServiceInterface
 *
 * Defines the contract for handling notifications across different models.
 */
interface NotificationServiceInterface
{
    /**
     * Notify users associated with a given object.
     *
     * @return void
     */
    public function notify(): void;
}
