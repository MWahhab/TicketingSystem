<?php

namespace App\Services;

use App\Enums\NotificationTypeEnums;
use App\Events\BranchNotificationReceived;
use App\Events\CommentNotificationReceived;
use App\Events\LinkedIssueNotificationReceived;
use App\Events\UserNotificationReceived;
use App\Interfaces\NotificationParserInterface;
use App\Models\Comment;
use App\Models\LinkedIssues;
use App\Models\Notification;
use App\Models\Post;
use App\Services\Notifications\CommentParserService;
use App\Services\Notifications\LinkedIssueParserService;
use App\Services\Notifications\MentionParserService;
use App\Services\Notifications\PostParserService;
use App\Services\Notifications\PRQueueParserService;
use PremiumAddons\models\PRQueue;

class NotificationService
{
    public const int NOTIFICATION_GROUPING_INTERVAL = 5;

    /** @var array<class-string, NotificationParserInterface> */
    private array $parsers;

    public function __construct(
        private readonly GroupedNotificationCacheService $cacheService,
        private readonly CommentParserService            $commentParserService,
        private readonly PostParserService               $postParserService,
        private readonly LinkedIssueParserService        $linkedIssueParserService,
        private readonly PRQueueParserService            $PRQueueParserService,
        private readonly MentionParserService            $mentionsParser,
        private readonly NewsFeedService                 $newsFeedService,
    ) {
        $this->parsers = [
            Comment::class      => $this->commentParserService,
            Post::class         => $this->postParserService,
            LinkedIssues::class => $this->linkedIssueParserService,
            PRQueue::class      => $this->PRQueueParserService,
        ];
    }

    public function notify(object $object): void
    {
        $parser = $this->parsers[$object::class]
            ?? throw new \InvalidArgumentException('Unsupported object type.');

        [$notifications, $newsFeedEntries] = $parser->parse($object);

        $this->dispatchAndCacheNotifications(
            $notifications,
            $object
        );

        $this->newsFeedService->write($newsFeedEntries);
    }

    /**
     * Dispatch notifications and cache them.
     *
     * @param list<array<string, mixed>> $notifications
     */
    public function dispatchAndCacheNotifications(array $notifications, object $object): void
    {
        if ($notifications === []) {
            return;
        }

        if ($object->exists) {
            Notification::insert($notifications);
        }

        foreach ($notifications as $data) {
            if (!isset($data['fid_user'], $data['fid_post'])) {
                continue;
            }
            if (!is_numeric($data['fid_user'])) {
                continue;
            }
            if (!is_numeric($data['fid_post'])) {
                continue;
            }
            if (!$object->exists) {
                $data['is_deleted'] = 1;
            }

            $userId = $data['fid_user'];
            $postId = $data['fid_post'];

            $this->cacheService->pushNotification($userId, $postId, $data);
            event(new UserNotificationReceived($userId, $data));

            if (!$object->exists) {
                return;
            }

            $type = $data['type'] ?? null;

            match ($type) {
                NotificationTypeEnums::COMMENT->value      => event(new CommentNotificationReceived($userId, $data)),
                NotificationTypeEnums::LINKED_ISSUE->value => event(new LinkedIssueNotificationReceived($userId, $data)),
                NotificationTypeEnums::BRANCH->value       => event(new BranchNotificationReceived($userId, $data)),
                default                                    => null,
            };
        }

        if ($object instanceof Post) {
            $object->desc = $this->mentionsParser->markMentionsAsNotified($object->desc);
            $object->saveQuietly();
        }

        if ($object instanceof Comment) {
            $object->content = $this->mentionsParser->markMentionsAsNotified($object->content);
            $object->saveQuietly();
        }
    }

    public function getGroupedNotifications(int $userId): array
    {
        $redisResults = $this->cacheService->getGroupedNotifications($userId);

        if ($redisResults !== []) {
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

            usort($groupOfModels, function ($a, $b) {
                $firstA = $a[0];
                $firstB = $b[0];
                if ($firstB->created_at->timestamp !== $firstA->created_at->timestamp) {
                    return $firstB->created_at->timestamp <=> $firstA->created_at->timestamp;
                }

                $isMentionA = ($firstA->is_mention ?? false);
                $isMentionB = ($firstB->is_mention ?? false);

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

        $this->cacheService->primeFromDatabase($userId, $finalNotifications);

        foreach ($finalNotifications as &$r) {
            unset($r['timestamp']);
        }

        return $finalNotifications;
    }
}
