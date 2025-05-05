<?php

namespace App\Services;

use App\DataTransferObjects\BoardFilterDataTransferObject;
use App\Models\BoardConfig;
use Illuminate\Support\Collection;

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
    private function getBoard(BoardFilterDataTransferObject $dto): ?BoardConfig
    {
        $boardId   = $dto->getBoardId();
        $dateFrom  = $dto->getDateFrom();
        $dateTo    = $dto->getDateTo();
        $dateField = $dto->getFilterColumn();

        $board = BoardConfig::query()
            ->when($boardId, fn ($q) => $q->whereKey($boardId))
            ->first();

        if (! $board) {
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
            'posts.assignee:id,name',
            'posts.comments' => function ($q) {
                $q->orderBy('created_at', 'desc')
                    ->with('creator:id,name');
            },
            'posts.watchers.user:id,name',
        ]);

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
        ])->toArray() : [];
    }
}
