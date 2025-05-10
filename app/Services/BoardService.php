<?php

namespace App\Services;

use App\DataTransferObjects\BoardFilterDataTransferObject;
use App\Enums\NotificationTypeEnums;
use App\Models\BoardConfig;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BoardService
{
    /**
     * Get the board data for display.
     *
     */
    public function getBoardData(BoardFilterDataTransferObject $boardFilterDTO): ?array
    {
        $board = $this->getBoard($boardFilterDTO);

        if (!$board || !$board->exists()) {
            return [
                'columns'    => [],
                'posts'      => [],
                'boardTitle' => 'No Board Found',
                'id'         => null,
            ];
        }

        $columns = is_array($board->columns) ? $board->columns : [];
        $posts   = $this->formatPosts($board->posts);

        return [
            'columns'    => $columns,
            'posts'      => $posts,
            'boardTitle' => $board->title ?? 'Untitled Board',
            'id'         => $board->id,
        ];
    }

    /**
     * Fetch the board with posts and related data.
     *
     */
    /**
     * Fetch the board with posts and related data.
     */
    private function getBoard(BoardFilterDataTransferObject $dto): ?BoardConfig
    {
        $boardId   = $dto->getBoardId();
        $dateFrom  = $dto->getDateFrom();
        $dateTo    = $dto->getDateTo();
        $dateField = $dto->getFilterColumn();

        $board = BoardConfig::query()
            ->when($boardId, fn ($q) => $q->whereKey($boardId))
            ->first();

        if (!$board) {
            return null;
        }

        $board->load([
            'posts' => function ($q) use ($dateFrom, $dateTo, $dateField) {
                $q->orderByDesc('pinned')
                    ->orderByRaw("
                      CASE 
                        WHEN priority = 'high'   THEN 1
                        WHEN priority = 'medium' THEN 2
                        WHEN priority = 'low'    THEN 3
                        ELSE 4
                      END
                    ")
                    ->orderByDesc('created_at');

                if ($dateFrom instanceof \Carbon\Carbon) {
                    $q->where($dateField, '>=', $dateFrom->toDateString());
                }
                if ($dateTo instanceof \Carbon\Carbon) {
                    $q->where($dateField, '<=', $dateTo->toDateString());
                }

                $q->limit(100);
            },
            'posts.creator:id,name',
            'posts.assignee:id,name',
            'posts.comments' => fn ($q) => $q->orderByDesc('created_at'),
            'posts.comments.creator:id,name',
            'posts.watchers.user:id,name',
            'posts.linkedIssues.relatedPost:id,title',
        ]);


        $postIds = $board->posts->pluck('id');

        $latestNotificationIds = DB::table('notifications')
            ->select(DB::raw('MAX(id) as id'))
            ->whereIn('fid_post', $postIds)
            ->whereIn('type', [
                NotificationTypeEnums::COMMENT->value,
                NotificationTypeEnums::POST->value,
                NotificationTypeEnums::LINKED_ISSUE->value,
                NotificationTypeEnums::BRANCH->value,
            ])
            ->groupBy('fid_post', 'type')
            ->pluck('id');

        $notifications = DB::table('notifications')
            ->join('users', 'notifications.created_by', '=', 'users.id')
            ->select([
                'notifications.id',
                'notifications.type',
                'notifications.content',
                'notifications.fid_post',
                'notifications.created_at',
                'users.name as created_by_name',
            ])
            ->whereIn('notifications.id', $latestNotificationIds)
            ->orderByDesc('notifications.created_at')
            ->get()
            ->groupBy('fid_post')
            ->map(fn ($group) => $group->take(5));

        $board->posts->each(function ($post) use ($notifications) {
            $post->setRelation('limitedHistory', $notifications->get($post->id, collect()));
        });

        return $board;
    }


    /**
     * Format posts into array structure for frontend.
     */
    private function formatPosts(?Collection $posts): array
    {
        return $posts instanceof \Illuminate\Support\Collection ? $posts->map(fn ($post) => [
            'id'                   => $post->id,
            'title'                => $post->title,
            'desc'                 => $post->desc,
            'priority'             => $post->priority,
            'pinned'               => $post->pinned,
            'column'               => $post->column,
            'assignee_id'          => $post->assignee_id,
            'deadline'             => $post->deadline,
            'deadline_color'       => match (true) {
                !$post->deadline => null,
                $post->deadline->isPast(),
                now()->diffInDays($post->deadline, false) <= 3 => 'red',
                now()->diffInDays($post->deadline, false) <= 7 => 'yellow',
                default                                        => 'gray',
            },
            'had_branch'  => $post->had_branch,
            'fid_board'   => $post->fid_board,
            'assignee'    => $post->assignee ? [
                'id'   => $post->assignee->id,
                'name' => $post->assignee->name,
            ] : null,
            'post_author' => $post->creator->name,
            'comments'    => $post->comments ? $post->comments->map(fn ($comment) => [
                'id'        => $comment->id,
                'content'   => $comment->content,
                'author'    => $comment->creator ? $comment->creator->name : 'Unknown',
                'createdAt' => $comment->created_at->toDateTimeString(),
            ])->toArray() : [],
            'watchers'    => $post->watchers ? $post->watchers->map(fn ($watcher) => [
                'watcher_id' => $watcher->id,
                'id'         => $watcher->user->id,
                'name'       => $watcher->user->name,
            ])->toArray() : [],
            'history' => $post->limitedHistory
                ? $post->limitedHistory
                    ->groupBy('type')
                    ->map(fn ($group) => $group->map(fn ($entry) => [
                        'id'             => $entry->id,
                        'type'           => $entry->type,
                        'content'        => $entry->content         ?? null,
                        'createdAt'      => $entry->created_at      ?? null,
                        'createdByName'  => $entry->created_by_name ?? null,
                    ])->toArray())
                    ->toArray()
                : [],
            'linked_issues' => $post->linkedIssues->map(fn ($link) => [
                'id'            => $link->id,
                'type'          => $link->link_type,
                'related_post'  => [
                    'id'    => $link->relatedPost->id    ?? null,
                    'title' => $link->relatedPost->title ?? 'Unknown',
                ],
            ])->toArray(),
        ])->toArray() : [];
    }
}
