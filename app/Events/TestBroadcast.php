<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TestBroadcast implements ShouldBroadcast, ShouldQueue
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;
    public float $serverTimestamp;

    /**
     * Create a new event instance.
     */
    public function __construct(public int $userId, public string $message = 'Default test message')
    {
        $this->serverTimestamp = microtime(true);
    }

    public function broadcastOn(): array
    {
        logger('🧠 broadcastOn during queue runtime', [
            'userId'  => $this->userId,
            'channel' => "notifications.{$this->userId}",
        ]);

        return [new PrivateChannel("notifications.{$this->userId}")];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'TestBroadcast';
    }

    public function broadcastWith(): array
    {
        logger('🚚 broadcastWith (queue hit)', [
            'userId'    => $this->userId,
            'message'   => $this->message,
            'timestamp' => $this->serverTimestamp,
        ]);

        return [
            'message'         => $this->message,
            'serverTimestamp' => $this->serverTimestamp,
        ];
    }
}
