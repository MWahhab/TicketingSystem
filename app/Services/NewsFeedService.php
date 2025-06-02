<?php

namespace App\Services;

use App\Enums\LinkTypeEnums;
use App\Enums\NotificationTypeEnums;
use App\Models\Notification;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Collection;

class NewsFeedService
{
    /**
     * @param array{
     *     fid_board: int,
     *     fid_user?: int,
     *     dateFrom?: string,
     *     dateTo?: string
     * } $validated
     * @return array{personal: array<string, array>, overview: array<string, array>}
     */
    public function getFeed(array $validated): array
    {
        $userId           = $validated['fid_user'] ?? auth()->id();

        $allNotifications = $this->fetchAllNotifications($validated);

        /** @var Collection<int, Collection<int, Notification>> $grouped */
        $grouped = $allNotifications->groupBy('fid_post')
            ->sortByDesc(fn (Collection $group) => $group->max('created_at'));

        $posts = $this->hydratePosts($grouped);

        $personalFeed = $this->buildPersonalFeed($grouped, $posts, $userId);
        $overviewFeed = $this->buildOverviewFeed($grouped, $posts);

        return [
            'personal' => $personalFeed,
            'overview' => $overviewFeed,
        ];
    }

    /**
     * @param array{
     *     fid_board: int,
     *     fid_user?: int,
     *     dateFrom?: string,
     *     dateTo?: string
     * } $validated
     * @return Collection<int, Notification>
     */
    private function fetchAllNotifications(array $validated): Collection
    {
        return Notification::query()
            ->where('fid_board', $validated['fid_board'])
            ->when(isset($validated['dateFrom']), fn ($q) => $q->whereDate('created_at', '>=', $validated['dateFrom']))
            ->when(isset($validated['dateTo']), fn ($q) => $q->whereDate('created_at', '<=', $validated['dateTo']))
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array>
     */
    private function buildPersonalFeed(Collection $grouped, Collection $posts, int $userId): array
    {
        return [
            'worked_on'          => $this->filterWorkedOn($grouped, $posts, $userId),
            'tagged_in'          => $this->filterTagged($grouped, $posts, $userId),
            'commented_on'       => $this->filterCommented($grouped, $posts, $userId),
            'created'            => $this->filterCreated($grouped, $posts, $userId),
            'generated_branches' => $this->filterBranches($grouped, $posts, $userId),
            'done_this_week'     => $this->filterDoneThisWeek($grouped, $posts, $userId),
        ];
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array>
     */
    private function buildOverviewFeed(Collection $grouped, Collection $posts): array
    {
        return [
            'activity_on'        => $this->filterRecent($grouped, $posts),
            'upcoming_deadlines' => $this->filterUpcoming($grouped, $posts),
            'blocked_issues'     => $this->filterBlocked($grouped, $posts),
            'done_this_week'     => $this->filterOverviewDone($grouped, $posts),
            'generated_branches' => $this->filterOverviewBranches($grouped, $posts),
        ];
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterWorkedOn(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle         = $post->title;
            $userNotifications = $notifications->filter(
                fn ($n) => $n->created_by === $userId && !$n->is_mention && $n->type !== NotificationTypeEnums::BRANCH->value
            );

            $hasActivity = false;

            foreach ($userNotifications as $notification) {
                $type     = $notification->type;
                $existing = $result[$postTitle]['notifications'][$type] ?? [];

                if (!in_array($notification->content, $existing, true)) {
                    $result[$postTitle]['notifications'][$type][] = $notification->content;
                    $result[$postTitle]['id']                     = $postId;
                    $hasActivity                                  = true;
                }
            }

            $isAssignee = $post->assignee_id === $userId;

            if (!$hasActivity && !$isAssignee) {
                unset($result[$postTitle]);
            }

            if ($isAssignee && !isset($result[$postTitle])) {
                $result[$postTitle] = [
                    'notifications' => [],
                    'id'            => $postId,
                ];
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterDoneThisWeek(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            if ($post->column !== 'Done') {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                if ($notification->created_by !== $userId) {
                    continue;
                }

                $type     = $notification->type;
                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($notification->content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $notification->content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterTagged(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                if (!$notification->is_mention) {
                    continue;
                }

                if ($notification->fid_user !== $userId) {
                    continue;
                }

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($notification->content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $notification->content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterCommented(Collection $grouped, Collection $posts, int $userId): array
    {
        $result   = [];
        $userName = (string) User::where('id', $userId)->value('name');

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                if ($type !== NotificationTypeEnums::COMMENT->value) {
                    continue;
                }

                if ($notification->created_by !== $userId) {
                    continue;
                }

                $toReplace   = 'You were mentioned in';
                $with        = $userName . ' commented in';
                $transformed = str_replace($toReplace, $with, $notification->content);

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($transformed, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $transformed;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterCreated(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                $needle = 'created a new post';
                if (!str_contains($notification->content, $needle)) {
                    continue;
                }

                if ($notification->fid_user !== $userId) {
                    continue;
                }

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($notification->content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $notification->content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterBranches(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                if ($type !== NotificationTypeEnums::BRANCH->value) {
                    continue;
                }
                if ($notification->created_by !== $userId) {
                    continue;
                }
                if ($notification->fid_user !== $userId) {
                    continue;
                }

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($notification->content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $notification->content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterRecent(Collection $grouped, Collection $posts): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                if ($notification->is_mention) {
                    continue;
                }
                if ($notification->type === null) {
                    continue;
                }
                $type    = $notification->type;
                $content = $notification->content;

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterUpcoming(Collection $grouped, Collection $posts): array
    {
        $result = [];
        $now    = now();

        foreach ($posts as $postId => $post) {
            if (empty($post->deadline)) {
                continue;
            }
            if ($now->isAfter($post->deadline)) {
                continue;
            }
            $postTitle     = $post->title;
            $notifications = $grouped->get($postId, collect());
            $hasContent    = false;

            foreach ($notifications as $notification) {
                if ($notification->is_mention) {
                    continue;
                }

                $type    = $notification->type;
                $content = $notification->content;

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent) {
                $result[$postTitle] = [
                    'notifications' => [],
                    'id'            => $postId,
                ];
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterOverviewDone(Collection $grouped, Collection $posts): array
    {
        $result = [];

        foreach ($posts as $postId => $post) {
            if ($post->column !== 'Done') {
                continue;
            }

            $postTitle     = $post->title;
            $notifications = $grouped->get($postId, collect());

            foreach ($notifications as $notification) {
                if ($notification->is_mention) {
                    continue;
                }

                $type    = $notification->type;
                $content = $notification->content;

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $content;
                $result[$postTitle]['id']                     = $postId;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterBlocked(Collection $grouped, Collection $posts): array
    {
        $result = [];

        foreach ($posts as $postId => $post) {
            if (!$post->linkedIssues->firstWhere('link_type', LinkTypeEnums::BLOCKED_BY->value)) {
                continue;
            }

            $postTitle     = $post->title;
            $notifications = $grouped->get($postId, collect());
            $hasContent    = false;

            foreach ($notifications as $notification) {
                if ($notification->is_mention) {
                    continue;
                }

                $type    = $notification->type;
                $content = $notification->content;

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent) {
                $result[$postTitle] = [
                    'notifications' => [],
                    'id'            => $postId,
                ];
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{notifications: array<string, array<int, string>>, id: int}>
     */
    private function filterOverviewBranches(Collection $grouped, Collection $posts): array
    {
        $result = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post) {
                continue;
            }

            $postTitle  = $post->title;
            $hasContent = false;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                if ($type !== NotificationTypeEnums::BRANCH->value) {
                    continue;
                }

                if ($notification->is_mention) {
                    continue;
                }

                $existing = $result[$postTitle]['notifications'][$type] ?? [];
                if (in_array($notification->content, $existing, true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $notification->content;
                $result[$postTitle]['id']                     = $postId;
                $hasContent                                   = true;
            }

            if (!$hasContent && isset($result[$postTitle])) {
                unset($result[$postTitle]);
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @return Collection<int, Post>
     */
    private function hydratePosts(Collection $grouped): Collection
    {
        $postIds = $grouped->keys()->all();

        return Post::with('linkedIssues', 'watchers')
            ->whereIn('id', $postIds)
            ->get()
            ->keyBy('id');
    }
}
