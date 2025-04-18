<?php

namespace App\Services;

use App\Enums\NotificationTypeEnums;
use App\Models\BoardConfig;
use App\Models\Comment;
use App\Models\LinkedIssues;
use App\Models\Notification;
use App\Models\Post;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use PremiumAddons\enums\PRQueueOutcomeEnum;
use PremiumAddons\models\PRQueue;
use PremiumAddons\services\PRQueueService;

class NotificationService
{
    const NOTIFICATION_GROUPING_INTERVAL = 5;

    /**
     * @param Object $object
     *
     * @return void
     */
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

    /**
     * @param  Comment $object
     *
     * @return array
     */
    public function parseCommentNotification(Comment $object): array
    {
        $post = Post::find($object->fid_post);
        $post->load('board');

        $boardName = $post->board->title;

        $userIds[$post->assignee_id] = true;
        $userIds[$post->fid_user]    = true;

        $truncatedTitle = Str::limit($post->title, 5, '...');
        $scopeContext   = "#" . $object->fid_post . ": " . $truncatedTitle . $boardName;

        $notifications = $this->parseMentions(
            $object->content,
            NotificationTypeEnums::COMMENT,
            $object->fid_post,
            $post->fid_board,
            $scopeContext
        );

        foreach ($userIds as $userId => $value) {
            if ($userId == Auth::id()) {
                continue;
            }

            $notifications[] = [
                'created_by' => Auth::id(),
                'type'       => NotificationTypeEnums::COMMENT->value,
                'content'    => $object->creator->name . " commented on post " . $scopeContext,
                'fid_post'   => $object->fid_post,
                'fid_board'  => $post->board->id,
                'fid_user'   => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $notifications;
    }

    /**
     * @param Post   $object
     * @return array
     */
    public function parsePostNotification(Post $object): array
    {
        $changes = $object->getChanges();

        $userIds[$object->assignee_id] = true;
        $userIds[$object->fid_user]    = true;

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
        }

        if (empty($content)) {
            return [];
        }

        $scopeContext = "#" . $object->id . ":$truncatedTitle ($boardName)";

        $notifications = $this->parseMentions(
            $object->desc,
            NotificationTypeEnums::POST,
            $object->id,
            $object->fid_board,
            $scopeContext
        );

        foreach ($userIds as $userId => $value) {
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

    /**
     * @param array $changes
     * @param Post $object
     * @param string $truncatedTitle
     * @param $boardName
     * @return array
     */
    public function parsePostChangeNotification(array $changes, Post $object, string $truncatedTitle, $boardName): array
    {
        $content = [];
        foreach ($changes as $changedColumn => $newValue) {

            // no need to create a notification for this, we can just read the created_at timestamp
            // of other notifications
            if ($changedColumn == 'updated_at') {
                continue;
            }

            if ($changedColumn == "assignee_id") { // this column needs special formatting and additional information
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

            if ($changedColumn == "fid_board") { // this column needs special formatting and additional information
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

    /**
     * @param int   $userId
     * @return array
     */
    public function getGroupedNotifications(int $userId): array
    {
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
                ];
            }
        }

        usort($finalNotifications, function ($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        foreach ($finalNotifications as &$fn) {
            unset($fn['timestamp']);
        }

        return $finalNotifications;
    }

    /**
     * @param string                $content
     * @param NotificationTypeEnums $objectContext
     * @param int                   $postId
     * @param int                   $boardId
     * @param string                $scopeContext
     *
     * @return array
     */
    public function parseMentions(
        string                $content,
        NotificationTypeEnums $objectContext,
        int                   $postId,
        int                   $boardId,
        string                $scopeContext
    ): array {
        $mentions = $this->extractAndCleanSpanContent($content);

        if (empty($mentions)) {
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
                'content'    => "You were mentioned in a " . $objectContext->value . " on $scopeContext",
                'fid_post'   => $postId,
                'fid_board'  => $boardId,
                'fid_user'   => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $notifications;
    }

    /**
     * @param string $contents
     * @return array
     */
    function extractAndCleanSpanContent(string $contents): array
    {
        $pattern = '/<span[^>]*>\s*@([^<]+)<\/span>/i';

        preg_match_all($pattern, $contents, $matches);

        $cleanedContents = [];

        if (!empty($matches[1])) {
            foreach ($matches[1] as $content) {
                $cleanedContents[] = trim($content);
            }
        }

        return $cleanedContents;
    }

    /**
     * @param LinkedIssues $object
     * @return array
     */
    private function parseLinkedIssueNotification(LinkedIssues $object): array
    {
        if ($object->wasRecentlyCreated) {
            $action = 'created';
        } elseif (!$object->exists) {
            $action = 'deleted';
        } else {
            $action = 'updated';
        }

        if (!isset($object->fid_origin_post, $object->fid_related_post)) {
            return [];
        }

        // 3. Eager-load relationships before building the notification.
        $object->load(['creator', 'post', 'relatedPost']);

        /** @var Post $post */
        $post        = $object->post;

        /** @var Post $relatedPost */
        $relatedPost = $object->relatedPost;

        $userIds     = array_unique([
            $object->fid_user,
            $relatedPost->assignee_id,
            $relatedPost->fid_user,
            $post->assignee_id,
            $post->fid_user,
        ]);

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

    /**
     * @param PRQueue $queue
     * @return array
     */
    private function parsePRQueueNotifications(PRQueue $queue): array
    {
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
        $recipientIds = array_unique([$post->assignee_id, $actorId]);
        $now          = now();

        return array_map(fn($userId) => [
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

    /**
     * @param PRQueue $queue
     * @param array   $changes
     * @param int     $maxRetries
     * @return string|null
     */
    private function classifyQueueEvent(PRQueue $queue, array $changes, int $maxRetries): ?string
    {
        if (empty($changes)) {
            return 'submitted';
        }

        if (isset($changes['outcome']) &&
            $queue->retries >= $maxRetries &&
            $queue->outcome === PRQueueOutcomeEnum::Failure->value)
        {
            return 'max_retries_failed';
        }

        if (isset($changes['outcome'])) {
            return $queue->outcome === 'success' ? 'outcome_success' : 'outcome_failed';
        }

        return null;
    }
}
