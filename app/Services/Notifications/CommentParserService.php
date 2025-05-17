<?php

namespace App\Services\Notifications;

use App\Enums\NotificationTypeEnums;
use App\Interfaces\NotificationParserInterface;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

readonly class CommentParserService implements NotificationParserInterface
{
    public function __construct(
        private MentionParserService $mentionsParser
    ) {
    }

    public function parse(object $entity): array
    {
        if (! $entity instanceof Comment) {
            throw new \InvalidArgumentException(
                'Expected Comment, got ' . $entity::class
            );
        }

        $comment = $entity;
        $post    = Post::with('board')->findOrFail($comment->fid_post);
        $authId  = Auth::id();

        $mentionResult = $this->mentionsParser->parse(
            $comment->content,
            NotificationTypeEnums::COMMENT,
            $comment->fid_post,
            $post->fid_board,
            '#' . $comment->fid_post . ': ' . Str::limit($post->title, 5, '…')
        );

        $notifications = $mentionResult['notifications'];

        $participants = array_unique(array_merge(
            [$post->assignee_id, $comment->fid_user],
            array_keys($post->getWatcherIds())
        ));

        foreach ($participants as $uid) {
            if ($uid === $authId) {
                continue;
            }

            $notifications[] = [
                'created_by' => $authId,
                'type'       => NotificationTypeEnums::COMMENT->value,
                'content'    => "{$comment->creator->name} commented on post #{$comment->fid_post}",
                'fid_post'   => $comment->fid_post,
                'fid_board'  => $post->fid_board,
                'fid_user'   => $uid,
                'created_at' => now()->toIso8601String(),
                'updated_at' => now()->toIso8601String(),
                'is_mention' => false,
            ];
        }

        return $notifications;
    }

    public function getNewlyNotifiedUserIds(object $entity): array
    {
        return [];
    }
}
