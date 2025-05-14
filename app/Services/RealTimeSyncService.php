<?php

namespace App\Services;

use App\Events\CardMoved;
use App\Models\Post;

class RealTimeSyncService
{
    public function postMoved(Post $post, string $newColumn): void
    {
        broadcast(new CardMoved($post, $newColumn))->toOthers();
    }
}
