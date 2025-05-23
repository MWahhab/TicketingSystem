<?php

namespace App\Services\Notifications;

use App\Enums\NotificationTypeEnums;
use App\Interfaces\NotificationParserInterface;
use App\Models\BoardConfig;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;

readonly class PostParserService implements NotificationParserInterface
{
    public function __construct(
        private MentionParserService $mentionsParser = new MentionParserService(),
    ) {
    }

    /**
     * @throws InvalidArgumentException
     * @return list<array<string,mixed>>
     */
    public function parse(object $entity): array
    {
        if (!$entity instanceof Post) {
            throw new InvalidArgumentException(
                sprintf('PostParserService expects %s, %s given', Post::class, $entity::class)
            );
        }

        return $this->build($entity)[0];
    }

    /**
     * @return array{0: list<array<string,mixed>>, 1: list<int>}
     */
    public function build(Post $post): array
    {
        $changes    = $post->getChanges();
        $nowIso     = now()->toIso8601String();
        $notifySelf = false;

        if (in_array('fid_board', array_keys($changes)) && is_numeric($changes['fid_board'])) {
            $post->fid_board = (int) $changes['fid_board'];
            $notifySelf      = true;
        }

        $userIds    = $this->collectNotifiableUserIds($post);

        $boardName  = BoardConfig::find($post->fid_board)->title ?? 'Unknown';
        $shortTitle = Str::limit((string) $post->title, config('formatting.titleLength'), '...');
        $scope      = "#{$post->id}:{$shortTitle} ({$boardName})";

        $desc       = $this->extractRelevantDescription($post, $changes);

        $mentionResult = $this->mentionsParser->parse(
            $desc,
            NotificationTypeEnums::POST,
            $post->id,
            $post->fid_board,
            $scope
        );

        $finalNotifications = $mentionResult['notifications'];
        $newlyMentioned     = array_column(
            array_filter($mentionResult['notifications'], fn ($n) => $n['is_mention'] ?? false),
            'fid_user'
        );

        $changeMessages = $this->generateChangeMessages($post, $changes, $shortTitle, $boardName);

        if (!empty($changes) || !$post->exists) {
            $this->broadcastRealtimeUpdateIfNeeded($post);
        }

        if ($changeMessages !== []) {
            $finalNotifications = array_merge(
                $finalNotifications,
                $this->fanOutToUsers($post, $userIds, $changes, $changeMessages, $nowIso, $notifySelf)
            );
        }

        return [
            $finalNotifications,
            array_unique($newlyMentioned),
        ];
    }

    /** @return array<int,true> */
    public function collectNotifiableUserIds(Post $post): array
    {
        $ids = [];
        if ($post->assignee_id) {
            $ids[$post->assignee_id] = true;
        }
        if ($post->fid_user) {
            $ids[$post->fid_user]    = true;
        }

        $changes = $post->getChanges();
        if (isset($changes['assignee_id'])) {
            $ids[$changes['assignee_id']] = true;
        }

        return $ids + $post->getWatcherIds();
    }

    /** @param array<string,mixed> $changes */
    private function extractRelevantDescription(Post $post, array $changes): string
    {
        if (isset($changes['desc'])) {
            $change = $changes['desc'];
            if (is_array($change) && array_key_exists(1, $change)) {
                return (string) $change[1];
            }
            return (string) $change;
        }

        if ($post->wasRecentlyCreated && array_key_exists('desc', $post->getAttributes())) {
            return (string) $post->getAttributes()['desc'];
        }

        return (string) $post->desc;
    }

    /** @param array<string,mixed> $changes
     * @return list<string>
     */
    private function generateChangeMessages(Post $post, array $changes, string $shortTitle, string $boardName): array
    {
        if ($changes === []
            && $post->wasRecentlyCreated
            && now()->diffInMinutes($post->created_at) <= 5
        ) {
            return [sprintf(
                '%s created a new post #%d: %s (%s)',
                $post->creator->name,
                $post->id,
                $shortTitle,
                $boardName
            )];
        }

        return $changes !== []
            ? $this->parsePostChangeNotification($changes, $post, $boardName)
            : [];
    }

    /** @param array<string,mixed> $changes
     * @return list<string>
     */
    private function parsePostChangeNotification(array $changes, Post $post, string $boardName): array
    {
        $messages = [];
        foreach ($changes as $field => $change) {
            [$old, $new] = is_array($change) && count($change) === 2
                ? $change
                : [null, $change];

            switch ($field) {
                case 'title':
                    $messages[] = sprintf(
                        'Title of post #%d (%s) was changed from "%s" to "%s"',
                        $post->id,
                        $boardName,
                        $old,
                        $new
                    );
                    break;
                case 'column':
                    $messages[] = sprintf(
                        'Post #%d (%s) was moved to column "%s"',
                        $post->id,
                        $boardName,
                        $new
                    );
                    break;
                case 'desc':
                    $messages[] = sprintf(
                        'Description of post #%d (%s) was updated',
                        $post->id,
                        $boardName
                    );
                    break;
                case 'assignee_id':
                    $ids           = [$post->assignee_id, $new];
                    $existingUsers = User::whereIn('id', $ids)
                        ->orderByRaw('FIELD(id, ?, ?)', $ids)
                        ->pluck('name');

                    // this handling is supposed to not alert a tampering user
                    // just silently log the attempt so we can remedy carefully
                    if (count($existingUsers) < 2) {
                        $messages = [];
                        Log::error('Tampered code. Unsafe for execution');
                        break;
                    }

                    $messages[] = sprintf(
                        'Post #%d (%s) was reassigned from %s to %s',
                        $post->id,
                        $boardName,
                        $existingUsers[0],
                        $existingUsers[1]
                    );
                    break;
            }
        }
        return $messages;
    }

    private function broadcastRealtimeUpdateIfNeeded(Post $post): void
    {
        if (!$post->exists) {
            app(\App\Services\RealTimeSyncService::class)->postMoved($post, $post->column);
            return;
        }

        foreach (['column','title','desc','assignee_id','deadline','priority','pinned'] as $attr) {
            if ($post->wasChanged($attr)) {
                $post->refresh();
                if ($attr === 'assignee_id') {
                    $post->load('assignee');
                }
                app(\App\Services\RealTimeSyncService::class)->postMoved($post, $post->column);
                return;
            }
        }
    }

    /**
     * @param array<int,true> $userIds
     * @param array<string,mixed> $changes
     * @param list<string> $messages
     * @return list<array<string,mixed>>
     */
    private function fanOutToUsers(Post $post, array $userIds, array $changes, array $messages, string $nowIso, bool $includeSelf = false): array
    {
        $out = [];
        foreach (array_keys($userIds) as $uid) {
            $isSelf           = $uid                                                 === Auth::id();
            $isAssigneeChange = isset($changes['assignee_id']) && $post->assignee_id === Auth::id();

            if ($isSelf && !$post->wasRecentlyCreated && !$isAssigneeChange && !$includeSelf) {
                continue;
            }

            foreach ($messages as $message) {
                $out[] = [
                    'created_by' => Auth::id(),
                    'type'       => NotificationTypeEnums::POST->value,
                    'content'    => $message,
                    'fid_post'   => $post->id,
                    'fid_board'  => $post->fid_board,
                    'fid_user'   => $uid,
                    'created_at' => $nowIso,
                    'updated_at' => $nowIso,
                    'is_mention' => false,
                ];
            }
        }

        return $out;
    }
}
