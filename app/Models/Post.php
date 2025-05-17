<?php

namespace App\Models;

use App\Interfaces\NotificationServiceInterface;
use App\Traits\HasNotificationService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Class Post
 *
 * @property int $id
 * @property string $title
 * @property string $desc
 * @property string $priority
 * @property int $pinned
 * @property string $column
 * @property int $assignee_id
 * @property Carbon|null $deadline
 * @property int|null $had_branch
 * @property int $fid_board
 * @property int $fid_user
 * @property string $migrated_from
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read User $assignee
 * @property-read User $creator
 * @property-read BoardConfig $board
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Comment> $comments
 * @property-read int|null $comments_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LinkedIssues> $linkedIssues
 * @property-read int|null $linked_issues_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PostWatcher> $watchers
 * @property-read int|null $watchers_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereAssigneeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereColumn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereDeadline($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereDesc($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereFidBoard($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereFidUser($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereMigratedFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Post whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Post extends Model implements NotificationServiceInterface
{
    use HasFactory;
    use HasNotificationService;

    protected $fillable = [
        'title', 'desc', 'priority', 'pinned', 'column', 'assignee_id', 'deadline',
        'had_branch', 'fid_board', 'fid_user', 'migrated_from',
    ];

    protected $casts = [
        'deadline' => 'date:Y-m-d', // Specify the format explicitly to avoid timezone issues
    ];

    /**
     * Override the deadline attribute setter to ensure consistent date formatting
     *
     */
    public function setDeadlineAttribute($value): void
    {
        $this->attributes['deadline'] = $value ?: null;
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(BoardConfig::class, 'fid_board');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'fid_post');
    }

    public function linkedIssues(): HasMany
    {
        return $this->hasMany(LinkedIssues::class, 'fid_origin_post');
    }

    public function watchers(): HasMany
    {
        return $this->hasMany(PostWatcher::class, 'post_fid');
    }

    /**
     * @return array<int, true> A user_id-indexed map of all watchers
     */
    public function getWatcherIds(): array
    {
        $map = [];
        foreach ($this->watchers as $watcher) {
            $map[$watcher->user_fid] = true;
        }
        return $map;
    }
}
