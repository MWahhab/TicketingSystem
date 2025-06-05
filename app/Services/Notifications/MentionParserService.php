<?php

namespace App\Services\Notifications;

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
use App\Enums\NotificationTypeEnums;
use App\Models\Post;
use App\Models\User;
use App\Services\NewsFeedService;
use DOMDocument;
use Illuminate\Support\Facades\Auth;

readonly class MentionParserService
{
    public function __construct(
        private NewsFeedService $newsFeedService = new NewsFeedService(),
    ) {
    }

    /**
     * @return array{notifications: list<array<string, mixed>>, newlyNotifiedTexts: list<string>}
     */
    public function parse(string $content, NotificationTypeEnums $type, int $fid_target, ?int $fid_board = null, ?string $context = null): array
    {
        $notifications      = [];
        $newlyNotifiedTexts = [];
        $validUserIds       = [];
        $userIdToLabel      = [];

        if ($content === '' || $content === '0') {
            return [
                'notifications'      => [],
                'newlyNotifiedTexts' => [],
            ];
        }

        $document = new DOMDocument();
        libxml_use_internal_errors(true);
        $document->loadHTML(mb_convert_encoding($content, 'HTML-ENTITIES', 'UTF-8'));
        libxml_clear_errors();

        $spans = $document->getElementsByTagName('span');

        foreach ($spans as $span) {
            if (
                $span->hasAttribute('data-type')               &&
                $span->getAttribute('data-type') === 'mention' &&
                !$span->hasAttribute('data-notified')          &&
                $span->hasAttribute('data-id')                 &&
                $span->hasAttribute('data-label')
            ) {
                $idAttr = $span->getAttribute('data-id');
                if (!is_numeric($idAttr)) {
                    continue;
                }
                if ((int)$idAttr <= 0) {
                    continue;
                }

                $userId = (int)$idAttr;
                $label  = trim($span->getAttribute('data-label')) ?: 'Unknown';

                $validUserIds[]         = $userId;
                $userIdToLabel[$userId] = $label;
            }
        }

        if ($validUserIds === []) {
            return [
                'notifications'      => [],
                'newlyNotifiedTexts' => [],
            ];
        }

        $existingUsers = User::whereIn('id', $validUserIds)->pluck('id')->all();
        $authId        = Auth::id();
        $authName      = Auth::user()->name ?? 'Someone';
        $post          = Post::select(['id', 'fid_board'])->findOrFail($fid_target);

        foreach ($existingUsers as $userId) {
            $username             = $userIdToLabel[$userId] ?? 'Unknown';
            $newlyNotifiedTexts[] = $username;
            $postRef              = sprintf('#%d', $post->id);

            $notifContent = sprintf('You were mentioned in %s', $postRef);
            $overviewText = sprintf('%s mentioned %s in %s', $authName, $username, $postRef);

            $notifications[] = [
                'created_by'          => $authId,
                'type'                => $type->value,
                'content'             => $notifContent,
                'fid_' . $type->value => $fid_target,
                'fid_board'           => $fid_board,
                'fid_user'            => $userId,
                'created_at'          => now()->toIso8601String(),
                'updated_at'          => now()->toIso8601String(),
                'is_mention'          => true,
            ];

            $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
                NewsFeedModeEnums::PERSONAL,
                NewsFeedCategoryEnums::TAGGED_IN,
                $notifContent,
                $post,
                $userId,
                $authId
            ));

            $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
                NewsFeedModeEnums::OVERVIEW,
                NewsFeedCategoryEnums::ACTIVITY_ON,
                $overviewText,
                $post,
                $userId,
                $authId
            ));
        }

        $this->newsFeedService->write($this->newsFeedService->getStoredEntries());

        return [
            'notifications'      => $notifications,
            'newlyNotifiedTexts' => $newlyNotifiedTexts,
        ];
    }

    /**
     * Returns modified HTML where matched mentions are flagged with data-notified="1"
     */
    public function markMentionsAsNotified(string $html): string
    {
        if ($html === '' || $html === '0') {
            return '';
        }

        $doc = new DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
        libxml_clear_errors();

        $spans = $doc->getElementsByTagName('span');

        foreach ($spans as $span) {
            if (
                $span->hasAttribute('data-type')               &&
                $span->getAttribute('data-type') === 'mention' &&
                !$span->hasAttribute('data-notified')          &&
                $span->hasAttribute('data-id')
            ) {
                $idAttr = $span->getAttribute('data-id');

                if (!is_numeric($idAttr)) {
                    continue;
                }

                $span->setAttribute('data-notified', '1');
            }
        }

        $body = $doc->getElementsByTagName('body')->item(0);
        return $body ? $doc->saveHTML($body) : $html;
    }
}
