<?php

namespace App\Models;

use App\Interfaces\NotificationServiceInterface;
use App\Services\NotificationService;
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
 * @property string $column
 * @property int $assignee_id
 * @property Carbon|null $deadline
 * @property int $fid_board
 * @property int $fid_user
 * @property Carbon $created_at
 * @property Carbon $updated_at
 *
 * @property-read User $assignee
 * @property-read User $author
 * @property-read BoardConfig $board
 */
class Post extends Model implements NotificationServiceInterface
{
    use HasFactory;

    protected $fillable = [
        'title', 'desc', 'priority', 'column', 'assignee_id', 'deadline',
        'fid_board', 'fid_user'
    ];

    protected $casts = [
        'deadline' => 'date',
    ];

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

    /**
     * In case of an update, we need the original object so we can show both new and old values
     *
     * @return void
     */
    public function notify(): void
    {
        app(NotificationService::class)->notify($this);
    }
}
