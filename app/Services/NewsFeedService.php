<?php

namespace App\Services;

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
use App\Models\NewsFeed;
use App\Models\Post;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class NewsFeedService
{
    /** @var list<array<string, mixed>> */
    private array $storedEntries = [];

    /**
     * @param array{fid_board: int, fid_user?: int, dateFrom?: string, dateTo?: string} $filters
     * @return array{
     *     personal: array<string, array<string, mixed>>,
     *     overview: array<string, array<string, mixed>>
     * }
     */
    public function getFeed(array $filters): array
    {
        $dateFrom = Carbon::parse($filters['dateFrom'])->setTimezone('UTC')->startOfDay();
        $dateTo   = Carbon::parse($filters['dateTo'])->setTimezone('UTC')->endOfDay();

        $baseQuery = NewsFeed::query()
            ->where('fid_board', $filters['fid_board'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->orderByDesc('created_at');

        /** @var Collection<int, NewsFeed> $personalFeedRaw */
        $personalFeedRaw = $baseQuery->clone()->where('mode', NewsFeedModeEnums::PERSONAL->value)
            ->when($filters['fid_user'] ?? auth()->id(), fn ($q, $fidUser) => $q->where('fid_user', $fidUser))
            ->get();

        /** @var Collection<int, NewsFeed> $overviewFeedRaw */
        $overviewFeedRaw = $baseQuery->clone()->where('mode', NewsFeedModeEnums::OVERVIEW->value)
            ->get();

        /** @var list<int> $postIds */
        $postIds = $personalFeedRaw->pluck('fid_post')
            ->merge($overviewFeedRaw->pluck('fid_post'))
            ->unique()
            ->values()
            ->all();

        /** @var Collection<int, Post> $hydratedPosts */
        $hydratedPosts = Post::with(['linkedIssues', 'watchers'])
            ->whereIn('id', $postIds)
            ->get()
            ->keyBy('id');

        /** @var array<string, array<string, mixed>> $personalFeed */
        $personalFeed = $this->groupFeedRows($personalFeedRaw, $hydratedPosts);

        /** @var array<string, array<string, mixed>> $overviewFeed */
        $overviewFeed = $this->groupFeedRows($overviewFeedRaw, $hydratedPosts);

        return [
            NewsFeedModeEnums::PERSONAL->value => $this->normalizeFeed($personalFeed, [
                NewsFeedCategoryEnums::WORKED_ON->value,
                NewsFeedCategoryEnums::TAGGED_IN->value,
                NewsFeedCategoryEnums::COMMENTED->value,
                NewsFeedCategoryEnums::CREATED->value,
                NewsFeedCategoryEnums::GENERATED_BRANCHES->value,
                NewsFeedCategoryEnums::DONE_THIS_WEEK->value,
            ]),
            NewsFeedModeEnums::OVERVIEW->value => $this->normalizeFeed($overviewFeed, [
                NewsFeedCategoryEnums::ACTIVITY_ON->value,
                NewsFeedCategoryEnums::UPCOMING_DEADLINES->value,
                NewsFeedCategoryEnums::BLOCKED->value,
                NewsFeedCategoryEnums::GENERATED_BRANCHES->value,
                NewsFeedCategoryEnums::DONE_THIS_WEEK->value,
            ]),
        ];
    }

    /**
     * Ensures each category is always an associative array of post titles to objects
     * @param Collection<int, NewsFeed> $rows
     * @param Collection<int, Post> $hydratedPosts
     * @return array<string, array<string, mixed>>
     */
    private function groupFeedRows(Collection $rows, Collection $hydratedPosts): array
    {
        /** @var array<string, array<string, mixed>> $result */
        $result = [];
        foreach ($rows->groupBy('category') as $category => $categoryGroup) {
            /** @var array<string, mixed> $postsGroup */
            $postsGroup = [];
            foreach ($categoryGroup->groupBy('fid_post') as $postId => $posts) {
                $post               = $hydratedPosts->get((int)$postId);
                $title              = $post ? $post->title : 'Untitled';
                $notifications      = $posts->pluck('content')->toArray();
                $postsGroup[$title] = [
                    'id'            => (int)$postId,
                    'notifications' => $notifications,
                    'deadline'      => $post && $post->deadline ? (string)$post->deadline : null,
                ];
            }
            $result[$category] = $postsGroup;
        }
        return $result;
    }

    /**
     * Guarantees every key is present as an object (not a list)
     * @param array<string, array<string, mixed>> $feed
     * @param list<string> $expectedKeys
     * @return array<string, array<string, mixed>>
     */
    private function normalizeFeed(array $feed, array $expectedKeys): array
    {
        $normalized = [];
        foreach ($expectedKeys as $key) {
            $normalized[$key] = isset($feed[$key]) && $this->isAssoc($feed[$key]) ? $feed[$key] : (object)[];
        }
        return $normalized;
    }

    /**
     * Helper to determine if an array is associative (object-like)
     * @param array<mixed> $arr
     */
    private function isAssoc(array $arr): bool
    {
        if ([] === $arr) {
            return true;
        }
        return array_keys($arr) !== range(0, count($arr) - 1);
    }

    /**
     * @param list<array{
     *     mode: string,
     *     category: string,
     *     content: string,
     *     fid_post: int,
     *     fid_board: int,
     *     fid_user: int|null,
     *     created_by: int,
     *     created_at: string,
     *     updated_at: string
     * }> $entries
     */
    public function write(array $entries): void
    {
        if ($entries === []) {
            return;
        }
        NewsFeed::insert($entries);
    }

    /**
     * @return array{
     *     mode: string,
     *     category: string,
     *     content: string,
     *     fid_post: int,
     *     fid_board: int,
     *     fid_user: int|null,
     *     created_by: int,
     *     created_at: \Illuminate\Support\Carbon,
     *     updated_at: \Illuminate\Support\Carbon
     * }
     */
    public function makeFeedRow(
        NewsFeedModeEnums     $mode,
        NewsFeedCategoryEnums $category,
        string                $content,
        Post                  $post,
        int                   $viewerId,
        int                   $actorId
    ): array {
        return [
            'mode'        => $mode->value,
            'category'    => $category->value,
            'content'     => $content,
            'fid_post'    => $post->id,
            'fid_board'   => $post->fid_board,
            'fid_user'    => $viewerId,
            'created_by'  => $actorId,
            'created_at'  => now(),
            'updated_at'  => now(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getStoredEntries(): array
    {
        return $this->storedEntries;
    }

    /**
     * @param array<string, mixed> $entry
     */
    public function addStoredEntry(array $entry): void
    {
        $this->storedEntries[] = $entry;
    }
}
