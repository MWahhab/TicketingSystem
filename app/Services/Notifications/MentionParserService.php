<?php

namespace App\Services\Notifications;

use App\Enums\NotificationTypeEnums;
use App\Models\User;
use DOMDocument;
use Illuminate\Support\Facades\Auth;

readonly class MentionParserService
{
    /**
     * @inheritdoc
     */
    public function parse(string $content, NotificationTypeEnums $type, int $fid_target, ?int $fid_board = null, ?string $context = null): array
    {
        $notifications      = [];
        $newlyNotifiedTexts = [];
        $validUserIds       = [];
        $userIdToLabel      = [];

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

                $userId = (int) $idAttr;
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

        foreach ($existingUsers as $userId) {
            $username             = $userIdToLabel[$userId] ?? 'Unknown';
            $newlyNotifiedTexts[] = $username;

            $notifications[] = [
                'created_by'          => Auth::id(),
                'type'                => $type->value,
                'content'             => sprintf('You were mentioned in %s', $context ?? $type->name),
                'fid_' . $type->value => $fid_target,
                'fid_board'           => $fid_board,
                'fid_user'            => $userId,
                'created_at'          => now()->toIso8601String(),
                'updated_at'          => now()->toIso8601String(),
                'is_mention'          => true,
            ];
        }

        return [
            'notifications'      => $notifications,
            'newlyNotifiedTexts' => $newlyNotifiedTexts,
        ];
    }

    /**
     * Returns modified HTML where matched mentions are flagged with data-notified="1"
     *
     * @param int[] $notifiedUserIds
     */
    public function markMentionsAsNotified(string $html, array $notifiedUserIds): string
    {
        if ($notifiedUserIds === []) {
            return $html;
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

                $userId = (int) $idAttr;

                if (in_array($userId, $notifiedUserIds, true)) {
                    $span->setAttribute('data-notified', '1');
                }
            }
        }

        $body = $doc->getElementsByTagName('body')->item(0);
        return $body ? $doc->saveHTML($body) : $html;
    }
}
