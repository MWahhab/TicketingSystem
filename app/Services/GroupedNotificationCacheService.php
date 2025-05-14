<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;

class GroupedNotificationCacheService
{
    public const MAX_GROUPS = 10;

    protected function prefix(int $userId): string
    {
        return "notif:u:$userId";
    }

    /**
     * @param array<string, mixed> $notification
     */
    public function pushNotification(int $userId, int $postId, array $notification): void
    {
        $prefix   = $this->prefix($userId);
        $groupKey = "{$prefix}:p:$postId";
        $indexKey = "{$prefix}:index";

        $rawGroup = Redis::exists($groupKey)
            ? json_decode(Redis::get($groupKey), true)
            : [];

        array_unshift($rawGroup, $notification);

        Redis::set($groupKey, json_encode($rawGroup));
        Redis::zadd($indexKey, now()->timestamp, (string)$postId);

        $this->enforceGroupLimit($userId);
    }

    protected function enforceGroupLimit(int $userId): void
    {
        $prefix   = $this->prefix($userId);
        $indexKey = "{$prefix}:index";

        $count = (int) Redis::zcard($indexKey);

        if ($count <= self::MAX_GROUPS) {
            return;
        }

        $toEvict = Redis::zrange($indexKey, 0, -self::MAX_GROUPS - 1);

        foreach ($toEvict as $postId) {
            Redis::del("{$prefix}:p:$postId");
            Redis::zrem($indexKey, (string)$postId);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getGroupedNotifications(int $userId): array
    {
        $prefix                       = $this->prefix($userId);
        $postIds                      = Redis::zrevrange("{$prefix}:index", 0, -1);
        $finalProcessedNotifications  = [];

        foreach ($postIds as $postId) {
            $groupKey                = "{$prefix}:p:$postId";
            $rawNotificationsInGroup = json_decode(Redis::get($groupKey), true);
            if (empty($rawNotificationsInGroup)) {
                continue;
            }
            if (!is_array($rawNotificationsInGroup)) {
                continue;
            }

            $generalUpdateCandidates = [];

            foreach ($rawNotificationsInGroup as $rawNotification) {
                $isMention = $rawNotification['is_mention'] ?? false;
                $seenAt    = $rawNotification['seen_at']    ?? null;
                $createdAt = $rawNotification['created_at'] ?? null;

                if ($isMention && is_null($seenAt)) {
                    $finalProcessedNotifications[] = [
                        'id'              => $rawNotification['id'] ?? 'mention_' . ($rawNotification['fid_post'] ?? 'unknownpost') . '_' . substr(md5($rawNotification['content'] ?? ''), 0, 8),
                        'fid_post'        => $rawNotification['fid_post'],
                        'fid_board'       => $rawNotification['fid_board'],
                        'content'         => $rawNotification['content'],
                        'time'            => $createdAt ? Carbon::parse($createdAt)->diffForHumans() : 'N/A',
                        'type'            => $rawNotification['type'],
                        'additionalCount' => 0,
                        'seen'            => false,
                        'timestamp'       => $createdAt ? Carbon::parse($createdAt)->timestamp : 0,
                        'is_mention'      => true,
                        'raw_group'       => [$rawNotification],
                    ];
                } else {
                    $generalUpdateCandidates[] = $rawNotification;
                }
            }

            if ($generalUpdateCandidates !== []) {
                usort($generalUpdateCandidates, function ($a, $b) {
                    $tsA = isset($a['created_at']) ? Carbon::parse($a['created_at'])->timestamp : 0;
                    $tsB = isset($b['created_at']) ? Carbon::parse($b['created_at'])->timestamp : 0;

                    if ($tsB !== $tsA) {
                        return $tsB <=> $tsA;
                    }

                    $isMentionA = (bool)($a['is_mention'] ?? false);
                    $isMentionB = (bool)($b['is_mention'] ?? false);

                    return (int)$isMentionB <=> (int)$isMentionA;
                });

                $primaryGroupNotification = $generalUpdateCandidates[0];
                $count                    = count($generalUpdateCandidates);
                $createdAtPrimary         = $primaryGroupNotification['created_at'] ?? null;

                $finalProcessedNotifications[] = [
                    'id'              => $primaryGroupNotification['id'] ?? 'group_' . ($primaryGroupNotification['fid_post'] ?? 'unknownpost'),
                    'fid_post'        => $primaryGroupNotification['fid_post'],
                    'fid_board'       => $primaryGroupNotification['fid_board'],
                    'content'         => $primaryGroupNotification['content'],
                    'time'            => $createdAtPrimary ? Carbon::parse($createdAtPrimary)->diffForHumans() : 'N/A',
                    'type'            => $primaryGroupNotification['type'],
                    'additionalCount' => $count > 1 ? $count - 1 : 0,
                    'seen'            => !is_null($primaryGroupNotification['seen_at'] ?? null),
                    'timestamp'       => $createdAtPrimary ? Carbon::parse($createdAtPrimary)->timestamp : 0,
                    'is_mention'      => $primaryGroupNotification['is_mention'] ?? false,
                    'raw_group'       => $generalUpdateCandidates,
                ];
            }
        }
        return $finalProcessedNotifications;
    }

    public function markAsSeen(int $userId, int $postId): void
    {
        $prefix   = $this->prefix($userId);
        $seenKey  = "{$prefix}:p:$postId:seen";
        Redis::set($seenKey, now()->timestamp);
    }

    public function clearUserCache(int $userId): void
    {
        $prefix   = $this->prefix($userId);
        $indexKey = "{$prefix}:index";
        $postIds  = Redis::zrange($indexKey, 0, -1);

        foreach ($postIds as $postId) {
            Redis::del("{$prefix}:p:$postId");
        }
        Redis::del($indexKey);
    }

    public function clearPostGroup(int $userId, int $postId): void
    {
        $prefix = $this->prefix($userId);
        Redis::del("{$prefix}:p:$postId");
        Redis::zrem("{$prefix}:index", (string)$postId);
    }

    public function primeFromDatabase(int $userId, array $processedNotificationsFromDB): void
    {
        $this->clearUserCache($userId);

        foreach ($processedNotificationsFromDB as $notificationEntry) {
            if (!isset($notificationEntry['fid_post'], $notificationEntry['raw_group'])) {
                continue;
            }

            $postId          = $notificationEntry['fid_post'];
            $rawGroupToCache = $notificationEntry['raw_group'];

            $groupKey = $this->prefix($userId) . ':p:' . $postId;
            $indexKey = $this->prefix($userId) . ':index';

            Redis::set($groupKey, json_encode($rawGroupToCache));

            $latestTimestampInRawGroup = 0;
            if (!empty($rawGroupToCache) && isset($rawGroupToCache[0]['created_at'])) {
                uasort(
                    $rawGroupToCache,
                    fn ($a, $b) =>
                    (isset($b['created_at']) ? Carbon::parse($b['created_at'])->timestamp : 0)
                    <=>
                    (isset($a['created_at']) ? Carbon::parse($a['created_at'])->timestamp : 0)
                );
                $latestTimestampInRawGroup = Carbon::parse($rawGroupToCache[0]['created_at'])->timestamp;
            } elseif (isset($notificationEntry['timestamp'])) {
                $latestTimestampInRawGroup = $notificationEntry['timestamp'];
            }

            Redis::zadd($indexKey, $latestTimestampInRawGroup, (string)$postId);
        }
        $this->enforceGroupLimit($userId);
    }

    public function markAllGroupsAsSeen(int $userId): void
    {
        $nowIso      = now()->toIso8601String();
        $redisPrefix = $this->prefix($userId);
        $postIds     = Redis::zrevrange("{$redisPrefix}:index", 0, -1);

        foreach ($postIds as $postId) {
            $groupKey             = "{$redisPrefix}:p:{$postId}";
            $rawNotificationsJson = Redis::get($groupKey);

            if ($rawNotificationsJson) {
                $rawNotificationsArray = json_decode($rawNotificationsJson, true);
                if (is_array($rawNotificationsArray)) {
                    $updated = false;
                    foreach ($rawNotificationsArray as &$rawNotification) {
                        if (isset($rawNotification['fid_user']) && $rawNotification['fid_user'] == $userId && empty($rawNotification['seen_at'])) {
                            $rawNotification['seen_at'] = $nowIso;
                            $updated                    = true;
                        }
                    }
                    unset($rawNotification);

                    if ($updated) {
                        Redis::set($groupKey, json_encode($rawNotificationsArray));
                    }
                }
            }
        }
    }

}
