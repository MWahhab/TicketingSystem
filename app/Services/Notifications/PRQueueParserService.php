<?php

namespace App\Services\Notifications;

use App\Enums\NotificationTypeEnums;
use App\Interfaces\NotificationParserInterface;
use App\Models\Post;
use Illuminate\Support\Str;
use InvalidArgumentException;
use PremiumAddons\enums\PRQueueOutcomeEnum;
use PremiumAddons\models\PRQueue;
use PremiumAddons\services\PRQueueService;

readonly class PRQueueParserService implements NotificationParserInterface
{
    /**
     * @throws InvalidArgumentException
     * @return list<array<string,mixed>>
     */
    public function parse(object $entity): array
    {
        if (! $entity instanceof PRQueue) {
            throw new InvalidArgumentException(
                sprintf('PRQueueParserService expects %s, %s given', PRQueue::class, $entity::class)
            );
        }

        /** @var PRQueue $queue */
        $queue = $entity;
        /**
         * @var Post $post
         */
        $post        = $queue->post()->with(['board', 'creator'])->firstOrFail();
        $title       = Str::limit($post->title, 5, '…');
        $changes     = $queue->getChanges();
        $maxRetries  = PRQueueService::MAX_RETRIES;
        $event       = $this->classifyQueueEvent($queue, $changes, $maxRetries);

        if ($event === null) {
            return [];
        }

        $message      = $this->renderQueueNotification($event, $post, $title);
        $actorId      = $queue->fid_user;
        $recipientIds = array_unique(array_merge(
            [$post->assignee_id, $actorId],
            array_keys($post->getWatcherIds())
        ));

        $nowIso = now()->toIso8601String();

        return array_map(
            fn (int $userId): array => [
                'created_by' => $actorId,
                'type'       => NotificationTypeEnums::BRANCH->value,
                'content'    => $message,
                'fid_post'   => $post->id,
                'fid_board'  => $post->fid_board,
                'fid_user'   => $userId,
                'created_at' => $nowIso,
                'updated_at' => $nowIso,
                'is_mention' => false,
            ],
            $recipientIds
        );
    }

    /**
     * @throws InvalidArgumentException
     * @return list<int>
     */
    public function getNewlyNotifiedUserIds(object $entity): array
    {
        if (! $entity instanceof PRQueue) {
            throw new InvalidArgumentException(
                sprintf('PRQueueParserService expects %s, %s given', PRQueue::class, $entity::class)
            );
        }

        return [];
    }

    /**
     * @param 'submitted'|'max_retries_failed'|'outcome_success'|'outcome_failed' $event
     * @throws \RuntimeException
     */
    private function renderQueueNotification(string $event, Post $post, string $title): string
    {
        $board = $post->board->title;

        return match ($event) {
            'submitted' => sprintf(
                '%s submitted branch generation on post #%d: %s (%s)',
                $post->creator->name,
                $post->id,
                $title,
                $board
            ),
            'max_retries_failed' => sprintf(
                'Branch generation failed on post #%d: %s (%s). Reached the maximum number of retry attempts. Try splitting the issue into smaller parts and try again.',
                $post->id,
                $title,
                $board
            ),
            'outcome_success' => sprintf(
                'Branch creation successful on post #%d: %s (%s)',
                $post->id,
                $title,
                $board
            ),
            'outcome_failed' => sprintf(
                'Branch creation failed on post #%d: %s (%s)',
                $post->id,
                $title,
                $board
            ),
            default => throw new \RuntimeException("Unknown event: {$event}"),
        };
    }

    /**
     * @param array<string,mixed> $changes
     * @return 'submitted'|'max_retries_failed'|'outcome_success'|'outcome_failed'|null
     */
    private function classifyQueueEvent(PRQueue $queue, array $changes, int $maxRetries): ?string
    {
        if ($changes === []) {
            return 'submitted';
        }

        if (
            isset($changes['outcome'])
            && $queue->retries >= $maxRetries
            && $queue->outcome === PRQueueOutcomeEnum::Failure->value
        ) {
            return 'max_retries_failed';
        }

        if (isset($changes['outcome'])) {
            return $queue->outcome === PRQueueOutcomeEnum::Success->value
                ? 'outcome_success'
                : 'outcome_failed';
        }

        return null;
    }
}
