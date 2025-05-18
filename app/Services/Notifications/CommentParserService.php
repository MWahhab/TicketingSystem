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
        if (!$entity instanceof Comment) {
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

        return $this->filterNotifications($mentionResult['notifications'], $post, $authId);
    }

    /**
     * @param array<int, array<string, mixed>> $notifications
     * @return array <int, array<string, mixed>>
     */
    private function filterNotifications(array $notifications, Post $post, int $authId): array
    {
        $seenParticipants = [];
        foreach ($notifications as $index => $notification) {
            $targetUserId = $notification['fid_user'];
            if ($targetUserId === $authId || isset($seenParticipants[$targetUserId])) {
                unset($notifications[$index]);
                continue;
            }

            $seenParticipants[$targetUserId]     = true;
            $notifications[$index]['fid_post']   = $post->id;
            $notifications[$index]['created_at'] = now()->toIso8601String();
            $notifications[$index]['updated_at'] = now()->toIso8601String();
            unset($notifications[$index]['fid_comment']);
        }

        return $notifications;
    }

    public function getNewlyNotifiedUserIds(object $entity): array
    {
        return [];
    }
}
