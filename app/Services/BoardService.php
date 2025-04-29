<?php

namespace App\Services;

use App\Models\BoardConfig;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class BoardService
{
    /**
     * Get the board data for display.
     *
     * @param int|null $boardId
     * @param Carbon|null $dateFrom
     * @param Carbon|null $dateTo
     * @param string $dateField
     * @return array|null
     */
    public function getBoardData(?int $boardId = null, ?Carbon $dateFrom = null, ?Carbon $dateTo = null, string $dateField = 'created_at'): ?array
    {
        $board = $this->getBoard($boardId, $dateFrom, $dateTo, $dateField);

        if (!$board || !$board->exists()) {
            return [
                'columns'    => [],
                'posts'      => [],
                'boardTitle' => 'No Board Found',
                'id'         => null,
            ];
        }

        $columns = is_array($board->columns) ? $board->columns : [];

        $posts = $this->formatPosts($board->posts);

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
     * @param int|null $boardId
     * @param Carbon|null $dateFrom
     * @param Carbon|null $dateTo
     * @param string $dateField
     * @return BoardConfig|null
     */
    private function getBoard(?int $boardId, ?Carbon $dateFrom, ?Carbon $dateTo, string $dateField): ?BoardConfig
    {
        return BoardConfig::with([
            'posts.assignee:id,name',
            'posts.comments' => function ($query) {
                $query->orderBy('created_at', 'desc')->with('creator:id,name');
            },
            'posts.watchers.user:id,name', // ← preload watchers and their users
            'posts' => function ($query) use ($dateFrom, $dateTo, $dateField) {
                $query->orderByRaw("
                    CASE 
                        WHEN priority = 'high' THEN 1
                        WHEN priority = 'medium' THEN 2
                        WHEN priority = 'low' THEN 3
                        ELSE 4
                    END
                ");

                if ($dateFrom) {
                    $query->whereDate($dateField, '>=', $dateFrom->toDateString());
                }

                if ($dateTo) {
                    $query->whereDate($dateField, '<=', $dateTo->toDateString());
                }

                if (!$dateFrom && !$dateTo) {
                    $query->limit(100);
                }
            },
        ])
            ->when($boardId, fn($query) => $query->find($boardId), fn($query) => $query->first());
    }

    /**
     * Format posts into array structure for frontend.
     *
     * @param Collection|null $posts
     * @return array
     */
    private function formatPosts(?Collection $posts): array
    {
        return $posts ? $posts->map(function ($post) {
            return [
                'id'          => $post->id,
                'title'       => $post->title,
                'desc'        => $post->desc,
                'priority'    => $post->priority,
                'column'      => $post->column,
                'assignee_id' => $post->assignee_id,
                'deadline'    => $post->deadline,
                'fid_board'   => $post->fid_board,
                'assignee'    => $post->assignee ? [
                    'id'   => $post->assignee->id,
                    'name' => $post->assignee->name,
                ] : null,
                'post_author' => $post->creator->name,
                'comments'    => $post->comments ? $post->comments->map(function ($comment) {
                    return [
                        'id'        => $comment->id,
                        'content'   => $comment->content,
                        'author'    => $comment->creator ? $comment->creator->name : 'Unknown',
                        'createdAt' => $comment->created_at->toDateTimeString(),
                    ];
                })->toArray() : [],
                'watchers'    => $post->watchers ? $post->watchers->map(function ($watcher) {
                    return [
                        'watcher_id' => $watcher->id,
                        'id'         => $watcher->user->id,
                        'name'       => $watcher->user->name,
                    ];
                })->toArray() : [],
            ];
        })->toArray() : [];
    }
}
