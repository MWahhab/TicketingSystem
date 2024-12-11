<?php

namespace App\Services;

use App\Enums\NotificationTypeEnums;
use app\Interfaces\NotificationServiceInterface;
use App\Models\BoardConfig;
use App\Models\Comment;
use App\Models\Notification;
use App\Models\Post;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class NotificationService
{

    const NOTIFICATION_GROUPING_INTERVAL=5;

    public function notify(Object $object): void
    {
        switch (true) {
            case $object instanceof Comment:
                $notifications = $this->parseCommentNotification($object);
                Notification::insert($notifications);

                break;
            case $object instanceof Post:
                $notifications = $this->parsePostNotification($object);
                Notification::insert($notifications);

                break;
            case $object instanceof BoardConfig:
                break;
            default:
                throw new \InvalidArgumentException('Unsupported object type for notification.');
        }
    }

    /**
     * @param  Comment $object
     *
     * @return array
     */
    public function parseCommentNotification(Comment $object): array
    {
        $post = Post::find($object->fid_post);
        $post->load('board');

        $boardName = $post->board->title;

        $userIds[$post->assignee_id] = true;
        $userIds[$post->fid_user]    = true;

        $notifications = [];
        foreach ($userIds as $userId => $value) {
            if ($userId == Auth::id()) {
                continue;
            }

            $notifications[] = [
                'created_by' => Auth::id(),
                'type'       => NotificationTypeEnums::COMMENT->value,
                'content'    => $object->creator->name . " commented on post #" . $object->fid_post . " ($boardName)",
                'fid_post'   => $object->fid_post,
                'fid_user'   => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $notifications;
    }

    public function parsePostNotification(Post $object): array
    {
        $changes = $object->getChanges();

        $userIds[$object->assignee_id] = true;
        $userIds[$object->fid_user]    = true;

        $board     = BoardConfig::find($object->fid_board);
        $boardName = $board->title;

        $fiveMinutesAgo = Carbon::now()->subMinutes(5);
        $postCreatedAt  = Carbon::parse($object->created_at);

        $truncatedTitle = Str::limit($object->title, 15, '...');

        if (empty($changes) && $postCreatedAt->gte($fiveMinutesAgo)) {
            $content = [sprintf(
                '%s created a new post #%d: %s (%s)',
                $object->creator->name,
                $object->id,
                $truncatedTitle,
                $boardName
            )];
        } else {
            $content = $this->parsePostChangeNotification($changes, $object, $truncatedTitle, $boardName);
        }

        if (empty($content)) {
            return [];
        }

        $notifications = [];
        foreach ($userIds as $userId => $value) {
            foreach ($content as $notification) {
                $notifications[] = [
                    'created_by' => Auth::id(),
                    'type'       => NotificationTypeEnums::POST->value,
                    'content'    => $notification,
                    'fid_post'   => $object->id,
                    'fid_user'   => $userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        return $notifications;
    }

    /**
     * @param array $changes
     * @param Post $object
     * @param string $truncatedTitle
     * @param $boardName
     * @return array
     */
    public function parsePostChangeNotification(array $changes, Post $object, string $truncatedTitle, $boardName): array
    {
        $content = [];
        foreach ($changes as $changedColumn => $newValue) {

            // no need to create a notification for this, we can just read the created_at timestamp
            // of other notifications
            if ($changedColumn == 'updated_at') {
                continue;
            }

            if ($changedColumn == "assignee_id") { // this column needs special formatting and additional information
                $assigneeIds = [(int) $object->getOriginal($changedColumn), (int) $newValue];
                $assignees   = User::whereIn('id', $assigneeIds)->pluck('name', 'id');

                $content[] = sprintf(
                    'Assignee changed from "%s" to "%s" on post #%d: %s (%s)',
                    $assignees[$object->getOriginal($changedColumn)],
                    $assignees[$newValue],
                    $object->id,
                    $truncatedTitle,
                    $boardName
                );

                continue;
            }

            if ($changedColumn == "fid_board") { // this column needs special formatting and additional information
                $newBoard = BoardConfig::find($newValue);

                $content[] = sprintf(
                    'Post #%d: %s has been moved to board "%s"',
                    $object->id,
                    $truncatedTitle,
                    $newBoard->title
                );

                continue;
            }

            $content[] = sprintf(
                '%s changed from "%s" to "%s" on post #%d: %s (%s)',
                ucfirst($changedColumn),
                $object->getOriginal($changedColumn),
                $newValue,
                $object->id,
                $truncatedTitle,
                $boardName
            );
        }

        return $content;
    }

    public function getGroupedNotifications(int $userId): array
    {
        $rawNotifications = Notification::where('fid_user', $userId)
            ->orderBy('created_at', 'asc')
            ->take(50)
            ->get();

        $groupedByPost = [];

        foreach ($rawNotifications as $notification) {
            $postId = $notification->fid_post;

            if (!isset($groupedByPost[$postId])) {
                $groupedByPost[$postId] = [[$notification]];
                continue;
            }

            $lastGroupIndex   = count($groupedByPost[$postId]) - 1;
            $lastGroup        = $groupedByPost[$postId][$lastGroupIndex];
            $lastNotification = end($lastGroup);

            $diffMinutes = $lastNotification->created_at->diffInMinutes($notification->created_at);

            if ($diffMinutes > self::NOTIFICATION_GROUPING_INTERVAL) {
                $groupedByPost[$postId][] = [$notification];
            } else {
                $groupedByPost[$postId][$lastGroupIndex][] = $notification;
            }
        }

        $finalNotifications = [];

        foreach ($groupedByPost as $groups) {
            foreach ($groups as $group) {
                $firstNotification = $group[0];
                $count = count($group);

                $finalNotifications[] = [
                    'id'              => $firstNotification->id,
                    'content'         => $firstNotification->content,
                    'time'            => $firstNotification->created_at->diffForHumans(),
                    'type'            => $firstNotification->type,
                    'additionalCount' => $count > 1 ? $count - 1 : 0,
                    'seen'            => !is_null($firstNotification->seen_at),
                    'timestamp'       => $firstNotification->created_at->timestamp,
                ];
            }
        }

        usort($finalNotifications, function ($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        foreach ($finalNotifications as &$fn) {
            unset($fn['timestamp']);
        }

        return $finalNotifications;
    }

}
