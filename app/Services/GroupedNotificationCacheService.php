<?php

namespace App\Services;

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
        $seenKey  = "{$groupKey}:seen";

        $group = Redis::exists($groupKey)
            ? json_decode(Redis::get($groupKey), true)
            : [];

        // Invalidate seen if pushing into an already-seen group
        if (Redis::exists($groupKey) && Redis::exists($seenKey)) {
            Redis::del($seenKey);
        }

        array_unshift($group, $notification);

        Redis::set($groupKey, json_encode($group));
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
            Redis::del("{$prefix}:p:$postId:seen");
            Redis::zrem($indexKey, (string)$postId);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getGroupedNotifications(int $userId): array
    {
        $prefix   = $this->prefix($userId);
        $postIds  = Redis::zrevrange("{$prefix}:index", 0, -1);
        $results  = [];

        foreach ($postIds as $postId) {
            $groupKey = "{$prefix}:p:$postId";

            $group = json_decode(Redis::get($groupKey), true);
            if (empty($group)) {
                continue;
            }

            $primary                    = $group[0];
            $primary['additionalCount'] = count($group) - 1;

            $seenAt    = isset($primary['seen_at']) ? strtotime((string) $primary['seen_at']) : 0;
            $createdAt = isset($primary['created_at']) ? strtotime((string) $primary['created_at']) : 0;

            $primary['seen']      = $seenAt >= $createdAt;
            $primary['timestamp'] = $createdAt;
            $primary['time']      = \Carbon\Carbon::parse($primary['created_at'])->diffForHumans();

            $results[] = $primary;
        }

        return $results;
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
            Redis::del("{$prefix}:p:$postId:seen");
        }

        Redis::del($indexKey);
    }

    public function clearPostGroup(int $userId, int $postId): void
    {
        $prefix = $this->prefix($userId);
        Redis::del("{$prefix}:p:$postId");
        Redis::del("{$prefix}:p:$postId:seen");
        Redis::zrem("{$prefix}:index", (string)$postId);
    }

    /**
     * @param array<string, mixed> $grouped
     */
    public function primeFromDatabase(int $userId, array $grouped): void
    {
        foreach ($grouped as $notification) {
            if (!isset($notification['fid_post'], $notification['raw_group'])) {
                continue;
            }

            $groupKey = $this->prefix($userId) . ':p:' . $notification['fid_post'];
            $indexKey = $this->prefix($userId) . ':index';

            Redis::set($groupKey, json_encode($notification['raw_group']));
            Redis::zadd($indexKey, now()->timestamp, (string)$notification['fid_post']);
        }

        $this->enforceGroupLimit($userId);
    }

}
