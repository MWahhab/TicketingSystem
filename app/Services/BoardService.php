<?php

namespace App\Services;

use App\Models\BoardConfig;

class BoardService
{
    /**
     * Gets each board with their respective posts and each post with their respective comments. If $boardId is null -
     * assumed this is the first render and attempts to retrieve the first board config found in the table.
     *
     * @param  $boardId
     * @return array|null
     */
    public function getBoardData($boardId = null): ?array
    {
        $board = BoardConfig::with([
            'posts.assignee:id,name',
            'posts.comments.creator:id,name',
        ])
            ->when($boardId, function ($query) use ($boardId) {
                return $query->find($boardId);
            }, function ($query) {
                return $query->first();
            });

        if (!$board->exists()) {
            return [
                'columns'    => [],
                'posts'      => [],
                'boardTitle' => 'No Board Found',
                'id'         => null
            ];
        }

        $columns = is_array($board->columns) ? $board->columns : [];

        $posts = $board->posts ? $board->posts->map(function ($post) {
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
                'comments'    => $post->comments ? $post->comments->map(function ($comment) {
                    return [
                        'id'        => $comment->id,
                        'content'   => $comment->content,
                        'author'    => $comment->creator ? $comment->creator->name : 'Unknown',
                        'createdAt' => $comment->created_at->toDateTimeString(),
                    ];
                })->toArray() : [],
            ];
        })->toArray() : [];

        return [
            'columns'    => $columns,
            'posts'      => $posts,
            'boardTitle' => $board->title ?? 'Untitled Board',
            'id'         => $board->id
        ];
    }
}
