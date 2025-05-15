<?php

namespace App\Services;

use App\Enums\NotificationTypeEnums;
use App\Events\BranchNotificationReceived;
use App\Events\CommentNotificationReceived;
use App\Events\LinkedIssueNotificationReceived;
use App\Events\UserNotificationReceived;
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
        $preparedNotificationsData        = [];
        $cacheService                     = app(GroupedNotificationCacheService::class);
        $newlyNotifiedMentionTextsForPost = [];

        switch ($object) {
            case $object instanceof Comment:
                $preparedNotificationsData = $this->parseCommentNotification($object);
                break;
            case $object instanceof Post:
                $postProcessingResult             = $this->parsePostNotification($object);
                $preparedNotificationsData        = $postProcessingResult['notifications'];
                $newlyNotifiedMentionTextsForPost = $postProcessingResult['newlyNotifiedTexts'];
                break;
            case $object instanceof LinkedIssues:
                $preparedNotificationsData = $this->parseLinkedIssueNotification($object);
                break;
            case $object instanceof BoardConfig:
                break;
            case is_dir(base_path('PremiumAddons')) && $object instanceof PRQueue:
                $preparedNotificationsData = $this->parsePRQueueNotifications($object);
                break;
            default:
                throw new \InvalidArgumentException('Unsupported object type for notification.');
        }

        if (!empty($preparedNotificationsData)) {
            Notification::insert($preparedNotificationsData);

            foreach ($preparedNotificationsData as $notificationArrayWithoutId) {
                if (isset($notificationArrayWithoutId['fid_user'], $notificationArrayWithoutId['fid_post'])) {
                    $cacheService->pushNotification(
                        (int)$notificationArrayWithoutId['fid_user'],
                        (int)$notificationArrayWithoutId['fid_post'],
                        $notificationArrayWithoutId
                    );
                    event(new UserNotificationReceived((int)$notificationArrayWithoutId['fid_user'], $notificationArrayWithoutId));

                    $notificationType = $notificationArrayWithoutId['type'] ?? null;

                    if ($notificationType === NotificationTypeEnums::COMMENT->value) {
                        event(new CommentNotificationReceived((int)$notificationArrayWithoutId['fid_user'], $notificationArrayWithoutId));
                    } elseif ($notificationType === NotificationTypeEnums::LINKED_ISSUE->value) {
                        event(new LinkedIssueNotificationReceived((int)$notificationArrayWithoutId['fid_user'], $notificationArrayWithoutId));
                    } elseif ($notificationType === NotificationTypeEnums::BRANCH->value) {
                        event(new BranchNotificationReceived((int)$notificationArrayWithoutId['fid_user'], $notificationArrayWithoutId));
                    }
                }
            }

            if ($object instanceof Post && !empty($newlyNotifiedMentionTextsForPost)) {
                $this->updatePostDescriptionWithNotifiedMentions($object, $newlyNotifiedMentionTextsForPost);
            }
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

        $finalNotifications = [];

        $mentionParseResult = $this->parseMentions(
            $object->content,
            NotificationTypeEnums::COMMENT,
            $object->fid_post,
            $post->fid_board,
            $scopeContext
        );
        if (!empty($mentionParseResult['notifications'])) {
            $finalNotifications = array_merge($finalNotifications, $mentionParseResult['notifications']);
        }

        foreach (array_keys($userIds) as $userId) {
            if ($userId == Auth::id()) {
                continue;
            }

            $finalNotifications[] = [
                'created_by' => Auth::id(),
                'type'       => NotificationTypeEnums::COMMENT->value,
                'content'    => $object->creator->name . ' commented on post ' . $scopeContext,
                'fid_post'   => $object->fid_post,
                'fid_board'  => $post->board->id,
                'fid_user'   => $userId,
                'created_at' => now()->toIso8601String(),
                'updated_at' => now()->toIso8601String(),
                'is_mention' => false,
            ];
        }

        return $finalNotifications;
    }

    public function parsePostNotification(Post $object): array
    {
        $changes               = $object->getChanges();
        $finalNotifications    = [];
        $allNewlyNotifiedTexts = [];

        $userIds[$object->assignee_id] = true;
        $userIds[$object->fid_user]    = true;
        $userIds += $this->getWatcherIds($object->id);

        $board          = BoardConfig::find($object->fid_board);
        $boardName      = $board->title;
        $truncatedTitle = Str::limit($object->title, 5, '...');
        $scopeContext   = '#' . $object->id . ':' . $truncatedTitle . ' (' . $boardName . ')';

        $descriptionForMentionParsing = $object->desc;

        if (isset($changes['desc'])) {
            $changeEntryForDesc = $changes['desc'];

            if (is_array($changeEntryForDesc) && count($changeEntryForDesc) === 2 && array_key_exists(0, $changeEntryForDesc) && array_key_exists(1, $changeEntryForDesc)) {
                $descriptionForMentionParsing = $changeEntryForDesc[1];
            } else {
                $descriptionForMentionParsing = $changeEntryForDesc;
            }
        } elseif ($object->wasRecentlyCreated && array_key_exists('desc', $object->getAttributes())) {
            $descriptionForMentionParsing = $object->getAttributes()['desc'];
        }

        $mentionsResult = $this->parseMentions(
            $descriptionForMentionParsing,
            NotificationTypeEnums::POST,
            $object->id,
            $object->fid_board,
            $scopeContext
        );

        $finalNotifications    = array_merge($finalNotifications, $mentionsResult['notifications']);
        $allNewlyNotifiedTexts = array_merge($allNewlyNotifiedTexts, $mentionsResult['newlyNotifiedTexts']);

        $generatedContentForChanges = [];
        $fiveMinutesAgo             = Carbon::now()->subMinutes(5);
        $postCreatedAt              = Carbon::parse($object->created_at);

        if (empty($changes) && $object->wasRecentlyCreated && $postCreatedAt->gte($fiveMinutesAgo)) {
            $generatedContentForChanges = [sprintf(
                '%s created a new post #%d: %s (%s)',
                $object->creator->name,
                $object->id,
                $truncatedTitle,
                $boardName
            )];
        } elseif (count($changes) > 0) {
            $generatedContentForChanges = $this->parsePostChangeNotification($changes, $object, $truncatedTitle, $boardName);

            $attributesForRealTimeUpdate = [
                'column', 'title', 'desc',
                'assignee_id', 'deadline', 'priority', 'pinned',
            ];
            $shouldBroadcastUpdate = false;
            foreach ($attributesForRealTimeUpdate as $attribute) {
                if ($object->wasChanged($attribute)) {
                    $shouldBroadcastUpdate = true;
                    break;
                }
            }

            if ($shouldBroadcastUpdate) {
                $object->refresh();

                if ($object->wasChanged('assignee_id')) {
                    $object->load('assignee');
                }

                $columnToBroadcast = $object->column;
                app(RealTimeSyncService::class)->postMoved($object, $columnToBroadcast);
            }
        }

        if ($generatedContentForChanges !== []) {
            foreach (array_keys($userIds) as $userId) {
                if ($userId == Auth::id() && !$object->wasRecentlyCreated && !($object->assignee_id == Auth::id() && array_key_exists('assignee_id', $changes))) {
                    continue;
                }

                foreach ($generatedContentForChanges as $notificationMessage) {
                    $finalNotifications[] = [
                        'created_by' => Auth::id(),
                        'type'       => NotificationTypeEnums::POST->value,
                        'content'    => $notificationMessage,
                        'fid_post'   => $object->id,
                        'fid_board'  => $object->fid_board,
                        'fid_user'   => $userId,
                        'created_at' => now()->toIso8601String(),
                        'updated_at' => now()->toIso8601String(),
                        'is_mention' => false,
                    ];
                }
            }
        }

        return ['notifications' => $finalNotifications, 'newlyNotifiedTexts' => array_unique($allNewlyNotifiedTexts)];
    }

    public function parsePostChangeNotification(array $changes, Post $object, string $truncatedTitle, $boardName): array
    {
        $content = [];
        foreach ($changes as $changedColumn => $newValue) {

            if ($changedColumn == 'updated_at') {
                continue;
            }

            if ($changedColumn == 'assignee_id') {
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

            if ($changedColumn == 'fid_board') {
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

        foreach ($groupedByPost as $groupOfModels) {
            if ($groupOfModels === []) {
                continue;
            }

            usort($groupOfModels, function ($a, $b) {
                if ($b->created_at->timestamp !== $a->created_at->timestamp) {
                    return $b->created_at->timestamp <=> $a->created_at->timestamp;
                }

                $isMentionA = ($a->is_mention ?? false);
                $isMentionB = ($b->is_mention ?? false);

                return (int)$isMentionB <=> (int)$isMentionA;
            });

            $firstNotificationModel = $groupOfModels[0][0];

            $finalNotifications[] = [
                'id'              => $firstNotificationModel->id,
                'fid_post'        => $firstNotificationModel->fid_post,
                'fid_board'       => $firstNotificationModel->fid_board,
                'content'         => $firstNotificationModel->content,
                'time'            => $firstNotificationModel->created_at->diffForHumans(),
                'type'            => $firstNotificationModel->type,
                'additionalCount' => count($groupOfModels) > 1 ? count($groupOfModels) - 1 : 0,
                'seen'            => !is_null($firstNotificationModel->seen_at),
                'timestamp'       => $firstNotificationModel->created_at->timestamp,
                'raw_group'       => array_map(fn ($n) => $n->toArray(), array_merge(...$groupOfModels)),
            ];
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
        $extractedMentions = $this->extractAndCleanSpanContent($content);

        if ($extractedMentions === []) {
            return ['notifications' => [], 'newlyNotifiedTexts' => []];
        }

        $notificationsToReturn     = [];
        $newlyNotifiedMentionTexts = [];

        $mentionsToConsider = array_filter($extractedMentions, fn ($mention) => !$mention['notified']);
        $userNamesToQuery   = array_column($mentionsToConsider, 'text');

        if ($userNamesToQuery === []) {
            return ['notifications' => [], 'newlyNotifiedTexts' => []];
        }

        $mentionedUsers = User::whereIn('name', array_unique($userNamesToQuery))->pluck('id', 'name')->toArray();

        if (empty($mentionedUsers)) {
            return ['notifications' => [], 'newlyNotifiedTexts' => []];
        }

        foreach ($mentionsToConsider as $mention) {
            $userName = $mention['text'];
            if (isset($mentionedUsers[$userName])) {
                $userId = $mentionedUsers[$userName];

                if ($userId == Auth::id()) {
                    continue;
                }

                $notificationsToReturn[] = [
                    'created_by' => Auth::id(),
                    'type'       => $objectContext->value,
                    'content'    => 'You were mentioned in a ' . $objectContext->value . " on $scopeContext",
                    'fid_post'   => $postId,
                    'fid_board'  => $boardId,
                    'fid_user'   => $userId,
                    'created_at' => now()->toIso8601String(),
                    'updated_at' => now()->toIso8601String(),
                    'is_mention' => true,
                ];
                $newlyNotifiedMentionTexts[] = $userName;
            }
        }

        return ['notifications' => $notificationsToReturn, 'newlyNotifiedTexts' => array_unique($newlyNotifiedMentionTexts)];
    }

    public function extractAndCleanSpanContent(string $contents): array
    {
        if (in_array(trim($contents), ['', '0'], true)) {
            return [];
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);

        if (!$dom->loadHTML('<?xml encoding="utf-8" ?><body>' . $contents . '</body>')) {
            libxml_clear_errors();
            return [];
        }
        libxml_clear_errors();

        $xpath = new \DOMXPath($dom);
        $spans = $xpath->query("//span[@data-type='mention']");

        $extractedMentions = [];
        if ($spans) {
            foreach ($spans as $spanNode) {
                if ($spanNode instanceof \DOMElement) {
                    $text = trim((string) $spanNode->nodeValue);
                    if (str_starts_with($text, '@')) {
                        $username            = substr($text, 1);
                        $notified            = $spanNode->hasAttribute('data-notified') && $spanNode->getAttribute('data-notified') === 'true';
                        $extractedMentions[] = [
                            'text'     => $username,
                            'notified' => $notified,
                        ];
                    }
                }
            }
        }
        return $extractedMentions;
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
                'created_at' => now()->toIso8601String(),
                'updated_at' => now()->toIso8601String(),
                'is_mention' => false,
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

        $now    = now();
        $nowIso = $now->toIso8601String();

        return array_map(fn ($userId) => [
            'created_by' => $actorId,
            'type'       => NotificationTypeEnums::BRANCH->value,
            'content'    => $message,
            'fid_post'   => $post->id,
            'fid_board'  => $post->fid_board,
            'fid_user'   => $userId,
            'created_at' => $nowIso,
            'updated_at' => $nowIso,
            'is_mention' => false,
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

    protected function updatePostDescriptionWithNotifiedMentions(Post $post, array $newlyNotifiedTexts): void
    {
        if ($newlyNotifiedTexts === []) {
            return;
        }

        $currentDesc = $post->desc;
        if (in_array(trim($currentDesc), ['', '0'], true)) {
            return;
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        if (!$dom->loadHTML('<?xml encoding="utf-8" ?><body>' . $currentDesc . '</body>')) {
            libxml_clear_errors();
            return;
        }
        libxml_clear_errors();

        $xpath = new \DOMXPath($dom);
        $spans = $xpath->query("//span[@data-type='mention']");

        $modified = false;
        if ($spans && $spans->length > 0) {
            foreach ($spans as $spanNode) {
                if ($spanNode instanceof \DOMElement) {
                    $text = trim((string) $spanNode->nodeValue);
                    if (str_starts_with($text, '@')) {
                        $username = substr($text, 1);
                        if (in_array($username, $newlyNotifiedTexts) && (!$spanNode->hasAttribute('data-notified') || $spanNode->getAttribute('data-notified') !== 'true')) {
                            $spanNode->setAttribute('data-notified', 'true');
                            $modified = true;
                        }
                    }
                }
            }
        }

        if ($modified) {
            $bodyNode = $dom->getElementsByTagName('body')->item(0);
            $newDesc  = '';
            if ($bodyNode && $bodyNode->hasChildNodes()) {
                foreach ($bodyNode->childNodes as $child) {
                    $newDesc .= $dom->saveHTML($child);
                }
            }

            if (!in_array(trim($newDesc), ['', '0'], true)) {
                $post->desc = $newDesc;
                $post->saveQuietly();
            }
        }
    }
}
