<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', fn($user, $id) => (int) $user->id === (int) $id);

Broadcast::channel('notifications.{userId}', fn($user, $userId) => (int) $user->id === (int) $userId);
