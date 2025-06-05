<?php

namespace App\Services\Notifications;

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
use App\Enums\NotificationTypeEnums;
use App\Interfaces\NotificationParserInterface;
use App\Models\LinkedIssues;
use App\Models\Post;
use App\Services\NewsFeedService;
use Illuminate\Support\Facades\Auth;

readonly class LinkedIssueParserService implements NotificationParserInterface
{
    public function __construct(
        private NewsFeedService $newsFeedService = new NewsFeedService(),
    ) {
    }

    /**
     * @inheritdoc
     */
    public function parse(object $entity): array
    {
        if (!$entity instanceof LinkedIssues) {
            throw new \InvalidArgumentException(sprintf(
                'LinkedIssuesParserService expects %s, %s given',
                LinkedIssues::class,
                $entity::class
            ));
        }

        $action = match (true) {
            $entity->wasRecentlyCreated => 'created',
            !$entity->exists            => 'deleted',
            default                     => 'updated',
        };

        if ($entity->fid_origin_post === null && $entity->fid_related_post === null) {
            return [];
        }

        $entity->load(['creator', 'post', 'relatedPost']);

        /** @var Post $post */
        $post = $entity->post;

        /** @var Post $relatedPost */
        $relatedPost = $entity->relatedPost;

        $userIds = array_unique(array_merge(
            [
                $entity->fid_user,
                $relatedPost->assignee_id,
                $relatedPost->fid_user,
                $post->assignee_id,
                $post->fid_user,
            ],
            array_keys($post->getWatcherIds())
        ));
        $authId = auth()->id();

        $userName = $entity->creator->name ?? 'Unknown User';

        $contentMap = [
            'created' => '%s linked post #%s - %s to #%s - %s',
            'updated' => '%s updated link between post #%s - %s and #%s - %s',
            'deleted' => '%s removed link between post #%s - %s and #%s - %s',
        ];
        $personalVariantMap = [
            'created' => 'You linked post #%s - %s to #%s - %s',
            'updated' => 'You updated link between post #%s - %s and #%s - %s',
            'deleted' => 'You removed link between post #%s - %s and #%s - %s',
        ];

        $template = $contentMap[$action];

        $content = sprintf(
            $template,
            $userName,
            $relatedPost->id,
            $relatedPost->title,
            $post->id,
            $post->title
        );

        $personalVariant = sprintf(
            $personalVariantMap[$action],
            $relatedPost->id,
            $relatedPost->title,
            $post->id,
            $post->title
        );

        $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
            NewsFeedModeEnums::PERSONAL,
            NewsFeedCategoryEnums::WORKED_ON,
            $personalVariant,
            $post,
            $authId,
            $authId,
        ));

        $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
            NewsFeedModeEnums::OVERVIEW,
            NewsFeedCategoryEnums::ACTIVITY_ON,
            $content,
            $post,
            $authId,
            $authId,
        ));

        $notifications = [];
        foreach ($userIds as $userId) {
            $content = sprintf(
                $template,
                $userName,
                $relatedPost->id,
                $relatedPost->title,
                $post->id,
                $post->title
            );

            $notifications[] = [
                'created_by' => Auth::id(),
                'type'       => NotificationTypeEnums::LINKED_ISSUE->value,
                'content'    => $content,
                'fid_post'   => $post->id,
                'fid_board'  => $post->fid_board,
                'fid_user'   => $userId,
                'created_at' => now()->toIso8601String(),
                'updated_at' => now()->toIso8601String(),
                'is_mention' => false,
            ];
        }

        return [$notifications, $this->newsFeedService->getStoredEntries()];
    }
}
