<?php

namespace App\Services;

use App\Enums\NotificationTypeEnums;
use App\Models\BoardConfig;
use App\Models\Comment;
use App\Models\LinkedIssues;
use App\Models\Notification;
use App\Models\Post;
use App\Models\PostWatcher;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use PremiumAddons\enums\PRQueueOutcomeEnum;
use PremiumAddons\models\PRQueue;
use PremiumAddons\services\PRQueueService;

class NotificationService
{
    public const NOTIFICATION_GROUPING_INTERVAL = 5;

    public function notify(Object $object): void
    {
        switch ($object) {
            case $object instanceof Comment:
                $notifications = $this->parseCommentNotification($object);
                Notification::insert($notifications);

                break;
            case $object instanceof Post:
                $notifications = $this->parsePostNotification($object);
                Notification::insert($notifications);

                break;
            case $object instanceof LinkedIssues:
                $notifications = $this->parseLinkedIssueNotification($object);
                Notification::insert($notifications);

                break;
            case $object instanceof BoardConfig:

                break;
            case is_dir(base_path('PremiumAddons')) && $object instanceof PRQueue:
                $notifications = $this->parsePRQueueNotifications($object);
                Notification::insert($notifications);
                break;
            default:
                throw new \InvalidArgumentException('Unsupported object type for notification.');
        }
    }

    public function parseCommentNotification(Comment $object): array
    {
        $post = Post::find($object->fid_post);
        $post->load('board');

        $boardName = $post->board->title;

        $userIds[$post->assignee_id] = true;
        $userIds[$post->fid_user]    = true;

        $userIds += $this->getWatcherIds($object->fid_post);

        $truncatedTitle = Str::limit($post->title, 5, '...');
        $scopeContext   = '#' . $object->fid_post . ': ' . $truncatedTitle . $boardName;

        $notifications = $this->parseMentions(
            $object->content,
            NotificationTypeEnums::COMMENT,
            $object->fid_post,
            $post->fid_board,
            $scopeContext
        );

        foreach (array_keys($userIds) as $userId) {
            if ($userId == Auth::id()) {
                continue;
            }

            $notifications[] = [
                'created_by' => Auth::id(),
                'type'       => NotificationTypeEnums::COMMENT->value,
                'content'    => $object->creator->name . ' commented on post ' . $scopeContext,
                'fid_post'   => $object->fid_post,
                'fid_board'  => $post->board->id,
                'fid_user'   => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $notifications;
    }

    public function parsePostNotification(Post $object): array
    {
        $changes = $object->getChanges();
        $content = [];

        $userIds[$object->assignee_id] = true;
        $userIds[$object->fid_user]    = true;

        $userIds += $this->getWatcherIds($object->id);

        $board          = BoardConfig::find($object->fid_board);
        $boardName      = $board->title;

        $fiveMinutesAgo = Carbon::now()->subMinutes(5);
        $postCreatedAt  = Carbon::parse($object->created_at);

        $truncatedTitle = Str::limit($object->title, 5, '...');

        if (empty($changes) && $postCreatedAt->gte($fiveMinutesAgo)) {
            $content = [sprintf(
                '%s created a new post #%d: %s (%s)',
                $object->creator->name,
                $object->id,
                $truncatedTitle,
                $boardName
            )];
        } elseif (count($changes) > 0) {
            $content = $this->parsePostChangeNotification($changes, $object, $truncatedTitle, $boardName);

            // Define attributes that should trigger a real-time update via CardMoved event
            $attributesForRealTimeUpdate = [
                'column', 'title', 'desc', // desc was not explicitly requested for live update, but often changes with title
                'assignee_id', 'deadline', 'priority', 'pinned',
            ];

            $shouldBroadcastUpdate = false;
            foreach ($attributesForRealTimeUpdate as $attribute) {
                if (array_key_exists($attribute, $changes)) {
                    $shouldBroadcastUpdate = true;
                    break;
                }
            }

            if ($shouldBroadcastUpdate) {
                // If the model exists (it was an update, not a create) and has changes,
                // refresh it to get the absolute latest attributes before broadcasting.
                if ($object->exists && count($changes) > 0) {
                    $object->refresh();
                }

                // If 'column' changed, use the new value from $changes. Otherwise, use the post's current column.
                $columnToBroadcast = $changes['column'] ?? $object->column;

                // Log the state before broadcasting
                logger('Broadcasting CardMoved', [
                    'post_id'                       => $object->id,
                    'changed_attributes'            => $changes,
                    'full_post_object_to_broadcast' => $object->toArray(), // Log the entire post object being used
                    'column_to_broadcast'           => $columnToBroadcast,
                ]);

                app(RealTimeSyncService::class)->postMoved($object, $columnToBroadcast);
            }
        }

        if ($content === []) {
            return [];
        }

        $scopeContext = '#' . $object->id . ":$truncatedTitle ($boardName)";

        $notifications = $this->parseMentions(
            $object->desc,
            NotificationTypeEnums::POST,
            $object->id,
            $object->fid_board,
            $scopeContext
        );

        foreach (array_keys($userIds) as $userId) {
            foreach ($content as $notification) {
                $notifications[] = [
                    'created_by' => Auth::id(),
                    'type'       => NotificationTypeEnums::POST->value,
                    'content'    => $notification,
                    'fid_post'   => $object->id,
                    'fid_board'  => $object->fid_board,
                    'fid_user'   => $userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        return $notifications;
    }

    public function parsePostChangeNotification(array $changes, Post $object, string $truncatedTitle, $boardName): array
    {
        $content = [];
        foreach ($changes as $changedColumn => $newValue) {

            // no need to create a notification for this, we can just read the created_at timestamp
            // of other notifications
            if ($changedColumn == 'updated_at') {
                continue;
            }

            if ($changedColumn == 'assignee_id') { // this column needs special formatting and additional information
                $assigneeIds = [(int) $object->getOriginal($changedColumn), (int) $newValue];
                $assignees   = User::whereIn('id', $assigneeIds)->pluck('name', 'id');

                $content[] = sprintf(
                    'Assignee changed from "%s" to "%s" on post #%d: %s (%s)',
                    $assignees[$object->getOriginal($changedColumn)],
                    $assignees[$newValue],
                    $object->id,
                    $truncatedTitle,
                    $boardName
                );

                continue;
            }

            if ($changedColumn == 'fid_board') { // this column needs special formatting and additional information
                $newBoard = BoardConfig::find($newValue);

                $content[] = sprintf(
                    'Post #%d: %s has been moved to board "%s"',
                    $object->id,
                    $truncatedTitle,
                    $newBoard->title
                );

                continue;
            }

            $content[] = sprintf(
                '%s changed from "%s" to "%s" on post #%d: %s (%s)',
                ucfirst($changedColumn),
                $object->getOriginal($changedColumn),
                $newValue,
                $object->id,
                $truncatedTitle,
                $boardName
            );
        }

        return $content;
    }

    public function getGroupedNotifications(int $userId): array
    {
        $cacheService = app(GroupedNotificationCacheService::class);
        $redisResults = $cacheService->getGroupedNotifications($userId);

        if (!empty($redisResults)) {
            return $redisResults;
        }

        $rawNotifications = Notification::where('fid_user', $userId)
            ->orderBy('created_at', 'DESC')
            ->take(50)
            ->get();

        $groupedByPost = [];

        foreach ($rawNotifications as $notification) {
            $postId = $notification->fid_post;

            if (!isset($groupedByPost[$postId])) {
                $groupedByPost[$postId] = [[$notification]];
                continue;
            }

            $lastGroupIndex   = count($groupedByPost[$postId]) - 1;
            $lastGroup        = $groupedByPost[$postId][$lastGroupIndex];
            $lastNotification = end($lastGroup);

            $diffMinutes = $lastNotification->created_at->diffInMinutes($notification->created_at);

            if ($diffMinutes > self::NOTIFICATION_GROUPING_INTERVAL) {
                $groupedByPost[$postId][] = [$notification];
            } else {
                $groupedByPost[$postId][$lastGroupIndex][] = $notification;
            }
        }

        $finalNotifications = [];

        foreach ($groupedByPost as $groups) {
            foreach ($groups as $group) {
                $firstNotification = $group[0];
                $count             = count($group);

                $finalNotifications[] = [
                    'id'              => $firstNotification->id,
                    'fid_post'        => $firstNotification->fid_post,
                    'fid_board'       => $firstNotification->fid_board,
                    'content'         => $firstNotification->content,
                    'time'            => $firstNotification->created_at->diffForHumans(),
                    'type'            => $firstNotification->type,
                    'additionalCount' => $count > 1 ? $count - 1 : 0,
                    'seen'            => !is_null($firstNotification->seen_at),
                    'timestamp'       => $firstNotification->created_at->timestamp,
                    'raw_group'       => array_map(fn ($n) => $n->toArray(), $group),
                ];
            }
        }

        usort($finalNotifications, fn ($a, $b) => $b['timestamp'] <=> $a['timestamp']);

        $cacheService->primeFromDatabase($userId, $finalNotifications);

        foreach ($finalNotifications as &$r) {
            unset($r['timestamp']);
        }

        return $finalNotifications;
    }

    public function parseMentions(
        string                $content,
        NotificationTypeEnums $objectContext,
        int                   $postId,
        int                   $boardId,
        string                $scopeContext
    ): array {
        $mentions = $this->extractAndCleanSpanContent($content);

        if ($mentions === []) {
            return [];
        }

        $notifications    = [];
        $mentionedUserIds = User::whereIn('name', $mentions)->pluck('id')->toArray();

        if (empty($mentionedUserIds)) {
            return [];
        }

        foreach ($mentionedUserIds as $userId) {
            $notifications[] = [
                'created_by' => Auth::id(),
                'type'       => $objectContext->value,
                'content'    => 'You were mentioned in a ' . $objectContext->value . " on $scopeContext",
                'fid_post'   => $postId,
                'fid_board'  => $boardId,
                'fid_user'   => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $notifications;
    }

    public function extractAndCleanSpanContent(string $contents): array
    {
        $pattern = '/<span[^>]*>\s*@([^<]+)<\/span>/i';

        preg_match_all($pattern, $contents, $matches);

        $cleanedContents = [];

        foreach ($matches[1] as $content) {
            $cleanedContents[] = trim($content);
        }

        return $cleanedContents;
    }

    private function parseLinkedIssueNotification(LinkedIssues $object): array
    {
        if ($object->wasRecentlyCreated) {
            $action = 'created';
        } elseif (!$object->exists) {
            $action = 'deleted';
        } else {
            $action = 'updated';
        }

        if ($object->fid_origin_post === null && $object->fid_related_post === null) {
            return [];
        }

        // 3. Eager-load relationships before building the notification.
        $object->load(['creator', 'post', 'relatedPost']);

        /** @var Post $post */
        $post        = $object->post;

        /** @var Post $relatedPost */
        $relatedPost = $object->relatedPost;

        $userIds     = array_unique(array_merge(
            [
                $object->fid_user,
                $relatedPost->assignee_id,
                $relatedPost->fid_user,
                $post->assignee_id,
                $post->fid_user,
            ],
            array_keys($this->getWatcherIds($post->id))
        ));

        $userName   = $object->creator->name ?? 'Unknown User';

        $contentMap = [
            'created' => '%s linked post #%s - %s to #%s - %s',
            'updated' => '%s updated link between post #%s - %s and #%s - %s',
            'deleted' => '%s removed link between post #%s - %s and #%s - %s',
        ];

        $template = $contentMap[$action] ?? $contentMap['updated'];

        $notifications = [];
        foreach ($userIds as $userId) {
            $content = sprintf(
                $template,
                $userName,
                $relatedPost->id,
                $relatedPost->title,
                $post->id,
                $post->title
            );

            $notifications[] = [
                'created_by' => Auth::id(),
                'type'       => NotificationTypeEnums::LINKED_ISSUE->value,
                'content'    => $content,
                'fid_post'   => $post->id,
                'fid_board'  => $post->fid_board,
                'fid_user'   => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $notifications;
    }

    private function parsePRQueueNotifications(PRQueue $queue): array
    {
        /**
         * @var Post $post
         */
        $post       = $queue->post()->with(['board', 'creator'])->firstOrFail();
        $title      = Str::limit($post->title, 5, '…');
        $changes    = $queue->getChanges();
        $maxRetries = PRQueueService::MAX_RETRIES;

        $event = $this->classifyQueueEvent($queue, $changes, $maxRetries);

        if (!$event) {
            return [];
        }

        $message      = $this->renderQueueNotification($event, $post, $title);
        $actorId      = $queue->fid_user;
        $recipientIds = array_unique(array_merge(
            [$post->assignee_id, $actorId],
            array_keys($this->getWatcherIds($post->id))
        ));

        $now = now();

        return array_map(fn ($userId) => [
            'created_by' => $actorId,
            'type'       => NotificationTypeEnums::BRANCH->value,
            'content'    => $message,
            'fid_post'   => $post->id,
            'fid_board'  => $post->fid_board,
            'fid_user'   => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ], $recipientIds);
    }

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
                'Branch generation failed on post #%d: %s (%s). '
                . 'Reached the maximum number of retry attempts. '
                . 'Try splitting the issue into smaller parts and try again.',
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

    private function classifyQueueEvent(PRQueue $queue, array $changes, int $maxRetries): ?string
    {
        if ($changes === []) {
            return 'submitted';
        }

        if (isset($changes['outcome'])     &&
            $queue->retries >= $maxRetries &&
            $queue->outcome === PRQueueOutcomeEnum::Failure->value) {
            return 'max_retries_failed';
        }

        if (isset($changes['outcome'])) {
            return $queue->outcome === 'success' ? 'outcome_success' : 'outcome_failed';
        }

        return null;
    }

    private function getWatcherIds(int $postId): array
    {
        $watcherIds = [];
        /**
         * @var $watchers PostWatcher
         */
        $watchers   = PostWatcher::where('post_fid', $postId)->get();

        foreach ($watchers as $watcher) {
            $watcherIds[$watcher->user_fid] = true;
        }

        return $watcherIds;
    }
}
