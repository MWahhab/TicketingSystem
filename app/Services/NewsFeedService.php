<?php

namespace App\Services;

use App\Enums\LinkTypeEnums;
use App\Enums\NewsFeedEnums;
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
     *     feed_type: string,
     *     dateFrom?: string,
     *     dateTo?: string
     * } $validated
     * @return array<string, array>
     */
    public function getFeed(array $validated): array
    {
        $userId        = auth()->id();
        $notifications = $this->fetchNotifications($validated);

        /** @var Collection<int, Collection<int, Notification>> $grouped */
        $grouped = $notifications->groupBy('fid_post')
            ->sortByDesc(fn(Collection $group) => $group->max('created_at'));

        $posts = $this->hydratePosts($grouped);

        return match ($validated['feed_type']) {
            NewsFeedEnums::PERSONAL->value => $this->buildPersonalFeed($grouped, $posts, $userId),
            NewsFeedEnums::OVERVIEW->value => $this->buildOverallFeed($grouped, $posts),
        };
    }

    /**
     * @param array{
     *     fid_board: int,
     *     fid_user?: int,
     *     feed_type: string,
     *     dateFrom?: string,
     *     dateTo?: string
     * } $validated
     * @return Collection<int, Notification>
     */
    private function fetchNotifications(array $validated): Collection
    {
        return match ($validated['feed_type']) {
            NewsFeedEnums::PERSONAL->value => $this->fetchPersonalNotifications($validated),
            NewsFeedEnums::OVERVIEW->value => $this->fetchOverallNotifications($validated),
            default                        => collect(),
        };
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
    private function fetchPersonalNotifications(array $validated): Collection
    {
        /** @var int $userId */
        $userId = $validated['fid_user'] ?? auth()->id();

        return Notification::query()
            ->where('fid_board', $validated['fid_board'])
            ->where(function ($q) use ($userId): void {
                $q->where('fid_user', $userId)
                    ->orWhere('created_by', $userId);
            })
            ->when(isset($validated['dateFrom']), fn ($q) => $q->whereDate('created_at', '>=', $validated['dateFrom']))
            ->when(isset($validated['dateTo']), fn ($q) => $q->whereDate('created_at', '<=', $validated['dateTo']))
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param array{
     *     fid_board: int,
     *     dateFrom?: string,
     *     dateTo?: string
     * } $validated
     * @return Collection<int, Notification>
     */
    private function fetchOverallNotifications(array $validated): Collection
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
        [$workedOn, $doneThisWeek] = $this->filterWorkedOn($grouped, $posts, $userId);

        return [
            'Worked on'          => $workedOn,
            'Tagged in'          => $this->filterTagged($grouped, $posts, $userId),
            'Commented on'       => $this->filterCommented($grouped, $posts, $userId),
            'Created'            => $this->filterCreated($grouped, $posts, $userId),
            'Generated branches' => $this->filterBranches($grouped, $posts, $userId),
            'Done this week'     => $doneThisWeek,
        ];
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array>
     */
    private function buildOverallFeed(Collection $grouped, Collection $posts): array
    {
        return [
            'Activity on'        => $this->filterRecent($grouped, $posts),
            'Upcoming deadlines' => $this->filterUpcoming($grouped, $posts),
            'Blocked issues'     => $this->filterBlocked($grouped, $posts),
            'Done this week'     => $this->filterOverviewDone($grouped, $posts),
            'Generated branches' => $this->filterOverviewBranches($grouped, $posts),
        ];
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array{0: array<string, array<string, array<int, string>|int>>, 1: array<string, int>}
     */
    private function filterWorkedOn(Collection $grouped, Collection $posts, int $userId): array
    {
        $result       = [];
        $doneThisWeek = [];

        foreach ($grouped as $postId => $notifications) {
            $post = $posts[$postId] ?? null;
            if (!$post) {
                continue;
            }

            $postTitle = $post->title;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                if ($notification->is_mention) {
                    continue;
                }

                if ($type === NotificationTypeEnums::BRANCH->value) {
                    continue;
                }

                if ($notification->created_by !== $userId) {
                    continue;
                }

                $existing = $result[$postTitle][$type] ?? [];
                if (in_array($notification->content, $existing, true)) {
                    continue;
                }

                $result[$postTitle][$type][] = $notification->content;
                $result[$postTitle]['id'] ??= $postId;
            }

            if (!isset($result[$postTitle])) {
                continue;
            }

            if ($post->column === 'Done') {
                $doneThisWeek[$postTitle] = $postId;
            }
        }

        return [$result, $doneThisWeek];
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
     */
    private function filterTagged(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];
        foreach ($grouped as $index => $notifications) {
            $postTitle = $posts[$index]->title;

            foreach ($notifications as $notification) {
                $notificationType = $notification->type;

                if (!$notification->is_mention) {
                    continue;
                }

                if ($notification->created_by === $userId) {
                    continue;
                }

                if (in_array($notification->content, $result[$postTitle][$notificationType] ?? [], true)) {
                    continue;
                }

                $result[$postTitle][$notificationType][] = $notification->content;
                $result[$postTitle]['id'] ??= $posts[$index]->id;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
     */
    private function filterCommented(Collection $grouped, Collection $posts, int $userId): array
    {
        $result   = [];
        $userName = (string) User::where('id', $userId)->value('name');

        foreach ($grouped as $index => $notifications) {
            $postTitle = $posts[$index]->title;

            foreach ($notifications as $notification) {
                $notificationType = $notification->type;

                if ($notificationType !== NotificationTypeEnums::COMMENT->value) {
                    continue;
                }

                if ($notification->created_by !== $userId) {
                    continue;
                }

                $toReplace = 'You were mentioned in';
                $with      = $userName . ' commented in';

                $transformed = str_replace($toReplace, $with, $notification->content);

                if (in_array($transformed, $result[$postTitle][$notificationType] ?? [], true)) {
                    continue;
                }

                $result[$postTitle][$notificationType][] = $transformed;
                $result[$postTitle]['id'] ??= $posts[$index]->id;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
     */
    private function filterCreated(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];
        foreach ($grouped as $index => $notifications) {
            $postTitle = $posts[$index]->title;

            foreach ($notifications as $notification) {
                $notificationType = $notification->type;

                $needle = 'created a new post';
                if (!str_contains($notification->content, $needle)) {
                    continue;
                }

                if ($notification->fid_user !== $userId) {
                    continue;
                }

                $result[$postTitle][$notificationType][] = $notification->content;
                $result[$postTitle]['id'] ??= $posts[$index]->id;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
     */
    private function filterBranches(Collection $grouped, Collection $posts, int $userId): array
    {
        $result = [];
        foreach ($grouped as $index => $notifications) {
            $postTitle = $posts[$index]->title;

            foreach ($notifications as $notification) {
                $notificationType = $notification->type;

                if ($notificationType !== NotificationTypeEnums::BRANCH->value) {
                    continue;
                }

                if ($notification->created_by !== $userId) {
                    continue;
                }

                if ($notification->fid_user !== $userId) {
                    continue;
                }

                $result[$postTitle][$notificationType][] = $notification->content;
                $result[$postTitle]['id'] ??= $posts[$index]->id;
            }
        }

        return $result;
    }


    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array<string, mixed>>
     */
    private function filterRecent(Collection $grouped, Collection $posts): array
    {
        $result = [];
        foreach ($grouped as $postId => $notifications) {
            $post = $posts->get($postId);
            if (!$post instanceof Post) {
                continue;
            }

            $postTitle = $post->title;

            foreach ($notifications as $notification) {
                if ($notification->is_mention) {
                    continue;
                }
                if ($notification->type === null) {
                    continue;
                }
                $content = $notification->content;
                $type    = $notification->type;

                if (in_array($content, $result[$postTitle][$type] ?? [], true)) {
                    continue;
                }

                $result[$postTitle][$type][] = $content;
                $result[$postTitle]['id'] ??= $postId;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
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

            $result[$post->title]['id'] = $postId;
            $notifications              = $grouped[$postId] ?? collect();

            foreach ($notifications as $notification) {

                if ($notification->is_mention) {
                    continue;
                }

                $type    = $notification->type;
                $content = $notification->content;

                if (in_array($notification->content, $result[$post->title]['notifications'][$type] ?? [], true)) {
                    continue;
                }

                $result[$post->title]['notifications'][$type][] = $content;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
     */
    private function filterOverviewDone(Collection $grouped, Collection $posts): array
    {
        $result = [];
        foreach ($posts as $postId => $post) {
            if ($post->column !== 'Done') {
                continue;
            }

            $result[$post->title]['id'] = $postId;
            $notifications              = $grouped[$postId] ?? collect();

            foreach ($notifications as $notification) {
                $type    = $notification->type;
                $content = $notification->content;


                $result[$post->title]['notifications'][$type][] = $content;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<int, mixed>
     */
    private function filterBlocked(Collection $grouped, Collection $posts): array
    {
        $result = [];

        foreach ($posts as $postId => $post) {
            if (!$post->linkedIssues->firstWhere('link_type', LinkTypeEnums::BLOCKED_BY->value)) {
                continue;
            }

            $result[$post->title]['id'] = $postId;
            $notifications              = $grouped[$postId] ?? collect();

            foreach ($notifications as $notification) {
                if ($notification->is_mention) {
                    continue;
                }

                $type    = $notification->type;
                $content = $notification->content;

                if (in_array($content, $result[$post->title]['notifications'][$type] ?? [], true)) {
                    continue;
                }

                $result[$post->title]['notifications'][$type][] = $content;
            }
        }

        return $result;
    }

    /**
     * @param Collection<int, Collection<int, Notification>> $grouped
     * @param Collection<int, Post> $posts
     * @return array<string, array{branch: string[], id: int}>
     */
    private function filterOverviewBranches(Collection $grouped, Collection $posts): array
    {
        $result = [];

        foreach ($grouped as $index => $notifications) {
            $post = $posts->get($index);
            if (!$post) {
                continue;
            }

            $postTitle = $post->title;

            foreach ($notifications as $notification) {
                $type = $notification->type;

                if ($type !== NotificationTypeEnums::BRANCH->value) {
                    continue;
                }

                if (in_array($notification->content, $result[$post->title]['notifications'][$type] ?? [], true)) {
                    continue;
                }

                $result[$postTitle]['notifications'][$type][] = $notification->content;
                $result[$postTitle]['id'] ??= $post->id;
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

        return Post::with('linkedIssues')
            ->whereIn('id', $postIds)
            ->get()
            ->keyBy('id');
    }
}
