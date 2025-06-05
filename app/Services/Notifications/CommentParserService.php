<?php

namespace App\Services\Notifications;

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
use App\Enums\NotificationTypeEnums;
use App\Interfaces\NotificationParserInterface;
use App\Models\Comment;
use App\Models\Post;
use App\Services\NewsFeedService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

readonly class CommentParserService implements NotificationParserInterface
{
    public function __construct(
        private MentionParserService $mentionsParser,
        private NewsFeedService      $newsFeedService = new NewsFeedService()
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
        $post    = Post::with(['board', 'watchers', 'creator'])->findOrFail($comment->fid_post);
        $authId  = Auth::id();
        $title   = '#' . $comment->fid_post . ': ' . Str::limit($post->title, config('formatting.titleLength'), '…');

        $mentionResult = $this->mentionsParser->parse(
            $comment->content,
            NotificationTypeEnums::COMMENT,
            $comment->fid_post,
            $post->fid_board,
            $title
        );

        $notifications = array_merge($mentionResult['notifications'], $this->getNotifications($post, $authId));

        $notifications = $this->filterNotifications($notifications, $post, $authId);

        $newsFeed      = $this->newsFeedService->getStoredEntries();

        return [$notifications, $newsFeed];
    }

    /**
     * @return list<array{
     *     created_by: int|string|null,
     *     type: string,
     *     content: string,
     *     fid_board: int,
     *     fid_user: int,
     *     created_at: string,
     *     updated_at: string
     * }>
     */
    private function getNotifications(
        Post              $post,
        int               $authId,
        PostParserService $postParser = new PostParserService()
    ): array {
        $notifications   = [];
        $userName        = Auth::user()?->name;
        $content         = sprintf('%s commented on post %s', $userName, '#'.$post->id);
        $personalVariant = sprintf('You commented on post %s', '#'.$post->id);

        $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
            NewsFeedModeEnums::PERSONAL,
            NewsFeedCategoryEnums::COMMENTED,
            $personalVariant,
            $post,
            $authId,
            $authId
        ));

        $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
            NewsFeedModeEnums::OVERVIEW,
            NewsFeedCategoryEnums::ACTIVITY_ON,
            $content,
            $post,
            $authId,
            $authId
        ));

        foreach (array_keys($postParser->collectNotifiableUserIds($post)) as $userId) {
            if ($authId == $userId) {
                continue;
            }

            $notifications[] = [
                'created_by'          => Auth::id(),
                'type'                => NotificationTypeEnums::COMMENT->value,
                'content'             => $content,
                'fid_board'           => $post->fid_board,
                'fid_user'            => $userId,
                'is_mention'          => false,
                'created_at'          => now()->toIso8601String(),
                'updated_at'          => now()->toIso8601String(),
            ];
        }

        return $notifications;
    }

    /**
     * @param list<array<string, mixed>> $notifications
     * @return list<array{
     *     fid_user: int,
     *     type?: NotificationTypeEnums,
     *     content?: string,
     *     fid_board?: int,
     *     created_by?: int|null,
     *     is_mention?: bool,
     *     fid_post: int,
     *     created_at: string,
     *     updated_at: string
     * }>
     */
    private function filterNotifications(array $notifications, Post $post, int $authId): array
    {
        $this->sortByMentionsFirst($notifications);

        $seenParticipants = [];
        foreach ($notifications as $index => $notification) {

            if ($this->shouldSkipNotification($notification, $seenParticipants, $authId)) {
                unset($notifications[$index]);
                continue;
            }

            $notifications[$index]['fid_post']   = $post->id;
            $notifications[$index]['created_at'] = now()->toIso8601String();
            $notifications[$index]['updated_at'] = now()->toIso8601String();
            unset($notifications[$index]['fid_comment']);
        }

        return $notifications;
    }

    /**
     * @param array{
     *     fid_user: int,
     *     is_mention?: bool
     * } $notification
     * @param array<int, true> $seenParticipants
     */
    private function shouldSkipNotification(array $notification, array &$seenParticipants, int $authId): bool
    {
        $targetUserId = $notification['fid_user'];
        $seen         = isset($seenParticipants[$targetUserId]);
        $isCreator    = $targetUserId === $authId;
        $isMention    = isset($notification['is_mention']) && $notification['is_mention'];

        $seenParticipants[$targetUserId] = true;

        if ($isMention && !$seen) {
            return false;
        }
        return $isCreator || $seen;
    }

    /**
     * @param list<array<string, mixed>> $notifications
     */
    private function sortByMentionsFirst(array &$notifications): void
    {
        usort(
            $notifications,
            fn ($a, $b) =>
              ($b['is_mention'] ?? false) <=> ($a['is_mention'] ?? false)
        );
    }
}
