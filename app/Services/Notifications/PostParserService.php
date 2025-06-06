<?php

namespace App\Services\Notifications;

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
use App\Enums\NotificationTypeEnums;
use App\Interfaces\NotificationParserInterface;
use App\Models\BoardConfig;
use App\Models\Post;
use App\Models\User;
use App\Services\NewsFeedService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;

readonly class PostParserService implements NotificationParserInterface
{
    public function __construct(
        private MentionParserService $mentionsParser  = new MentionParserService(),
        private NewsFeedService      $newsFeedService = new NewsFeedService(),
    ) {
    }

    /**
     * @throws InvalidArgumentException
     * @return list<array<array<string,mixed>,array<string,mixed>>>
     */
    public function parse(object $entity): array
    {
        if (!$entity instanceof Post) {
            throw new InvalidArgumentException(
                sprintf('PostParserService expects %s, %s given', Post::class, $entity::class)
            );
        }

        return [$this->build($entity)[0], $this->newsFeedService->getStoredEntries()];
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

        $post->loadMissing('creator');

        $userIds    = $this->collectNotifiableUserIds($post);

        $boardName  = BoardConfig::find($post->fid_board)->title ?? 'Unknown';
        $shortTitle = Str::limit((string) $post->title, config('formatting.titleLength'), '...');
        $scope      = "#{$post->id}: {$shortTitle} ({$boardName})";

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
            $content = sprintf(
                '%s created a new post #%d: %s (%s)',
                $post->creator->name,
                $post->id,
                $shortTitle,
                $boardName
            );
            $personalVariant = sprintf(
                'You created a new post #%d',
                $post->id,
            );
            $overviewVariant = sprintf(
                '%s created a new post #%d',
                $post->creator->name,
                $post->id,
            );

            $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
                NewsFeedModeEnums::PERSONAL,
                NewsFeedCategoryEnums::CREATED,
                $personalVariant,
                $post,
                $post->creator->id,
                $post->creator->id,
            ));

            $this->newsFeedService->addStoredEntry($this->newsFeedService->makeFeedRow(
                NewsFeedModeEnums::OVERVIEW,
                NewsFeedCategoryEnums::CREATED,
                $overviewVariant,
                $post,
                $post->creator->id,
                $post->creator->id,
            ));

            return [$content];
        }

        return $changes !== []
            ? $this->parsePostChangeNotification($changes, $post, $boardName, Auth::user()?->name)
            : [];
    }

    /**
     * @param array<string,mixed> $changes
     * @return list<string>
     */
    private function parsePostChangeNotification(array $changes, Post $post, string $boardName, string $actorName): array
    {
        $messages    = [];
        $authUserId  = auth()->id();

        foreach ($changes as $field => $change) {
            [$old, $new] = is_array($change) && count($change) === 2
                ? $change
                : [null, $change];

            $personalMessage = null;
            $overviewMessage = null;

            switch ($field) {
                case 'title':
                    $messages[] = sprintf(
                        'Post #%d (%s) title was changed from "%s" to "%s"',
                        $post->id,
                        $boardName,
                        $post->title,
                        $new
                    );
                    $personalMessage = sprintf(
                        'You changed the title of post #%d from "%s" to "%s"',
                        $post->id,
                        $post->title,
                        $new
                    );
                    $overviewMessage = sprintf(
                        '%s changed the title of post #%d from "%s" to "%s"',
                        $actorName,
                        $post->id,
                        $post->title,
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
                    $personalMessage = sprintf(
                        'You moved post #%d to column "%s"',
                        $post->id,
                        $new
                    );
                    $overviewMessage = sprintf(
                        '%s moved post #%d to column "%s"',
                        $actorName,
                        $post->id,
                        $new
                    );

                    if ($new === 'Done') {
                        $this->newsFeedService->addStoredEntry(
                            $this->newsFeedService->makeFeedRow(
                                NewsFeedModeEnums::OVERVIEW,
                                NewsFeedCategoryEnums::DONE_THIS_WEEK,
                                $overviewMessage,
                                $post,
                                $authUserId,
                                $authUserId
                            )
                        );

                        $this->newsFeedService->addStoredEntry(
                            $this->newsFeedService->makeFeedRow(
                                NewsFeedModeEnums::PERSONAL,
                                NewsFeedCategoryEnums::DONE_THIS_WEEK,
                                $personalMessage,
                                $post,
                                $authUserId,
                                $authUserId
                            )
                        );
                    }

                    break;
                case 'priority':
                    $messages[] = sprintf(
                        'Post #%d (%s) priority was changed from "%s" to "%s"',
                        $post->id,
                        $boardName,
                        $post->priority,
                        $new
                    );

                    $personalMessage = sprintf(
                        'You changed the priority of post #%d from "%s" to "%s"',
                        $post->id,
                        $post->priority,
                        $new
                    );
                    $overviewMessage = sprintf(
                        '%s changed the priority of post #%d from "%s" to "%s"',
                        $actorName,
                        $post->id,
                        $post->priority,
                        $new
                    );
                    break;
                case 'desc':
                    $messages[] = sprintf(
                        'Post #%d (%s) description was updated',
                        $post->id,
                        $boardName
                    );
                    $personalMessage = sprintf(
                        'You updated the description of post #%d',
                        $post->id
                    );
                    $overviewMessage = sprintf(
                        '%s updated the description of post #%d',
                        $actorName,
                        $post->id
                    );
                    break;
                case 'assignee_id':
                    $ids   = [$post->assignee_id, $new];
                    $users = User::whereIn('id', $ids)
                        ->orderByRaw('FIELD(id, ?, ?)', $ids)
                        ->pluck('name');

                    if (count($users) < 2) {
                        Log::error('Tampered code. Unsafe for execution');
                        continue 2;
                    }
                    $messages[] = sprintf(
                        'Post #%d (%s) was reassigned from %s to %s',
                        $post->id,
                        $boardName,
                        $users[0],
                        $users[1]
                    );
                    $personalMessage = sprintf(
                        'You reassigned post #%d from %s to %s',
                        $post->id,
                        $users[0],
                        $users[1]
                    );
                    $overviewMessage = sprintf(
                        '%s reassigned post #%d from %s to %s',
                        $actorName,
                        $post->id,
                        $users[0],
                        $users[1]
                    );
                    break;
                case 'fid_board':
                    $messages[] = sprintf(
                        'Post #%d (%s) was moved to board %s',
                        $post->id,
                        $boardName,
                        $new
                    );
                    $personalMessage = sprintf(
                        'You moved post #%d to board %s',
                        $post->id,
                        $new
                    );
                    $overviewMessage = sprintf(
                        '%s moved post #%d to board %s',
                        $actorName,
                        $post->id,
                        $new
                    );

                    break;
                case 'deadline':
                    $oldDeadline = $post->deadline ? Carbon::parse($post->deadline)->format('d-m-Y') : null;
                    $newDeadline = $new ? Carbon::parse($new)->format('d-m-Y') : null;

                    if (!$oldDeadline) {
                        $messages[] = sprintf(
                            'Post #%d (%s) deadline was set to %s',
                            $post->id,
                            $boardName,
                            $newDeadline
                        );
                        $personalMessage = sprintf(
                            'You set the deadline of post #%d to %s',
                            $post->id,
                            $newDeadline
                        );
                        $overviewMessage = sprintf(
                            '%s set the deadline of post #%d to %s',
                            $actorName,
                            $post->id,
                            $newDeadline
                        );

                        break;
                    }

                    $messages[] = sprintf(
                        'Post #%d (%s) deadline was changed from %s to %s',
                        $post->id,
                        $boardName,
                        $oldDeadline,
                        $newDeadline
                    );
                    $personalMessage = sprintf(
                        'You changed the deadline of post #%d from %s to %s',
                        $post->id,
                        $oldDeadline,
                        $newDeadline
                    );
                    $overviewMessage = sprintf(
                        '%s changed the deadline of post #%d from %s to %s',
                        $actorName,
                        $post->id,
                        $oldDeadline,
                        $newDeadline
                    );
                    break;
            }

            if ($personalMessage !== null) {
                $this->newsFeedService->addStoredEntry(
                    $this->newsFeedService->makeFeedRow(
                        NewsFeedModeEnums::PERSONAL,
                        NewsFeedCategoryEnums::WORKED_ON,
                        $personalMessage,
                        $post,
                        $authUserId,
                        $authUserId
                    )
                );
            }

            if ($overviewMessage !== null) {
                $this->newsFeedService->addStoredEntry(
                    $this->newsFeedService->makeFeedRow(
                        NewsFeedModeEnums::OVERVIEW,
                        NewsFeedCategoryEnums::ACTIVITY_ON,
                        $overviewMessage,
                        $post,
                        $authUserId,
                        $authUserId
                    )
                );
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
