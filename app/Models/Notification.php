<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Class Notification
 *
 * @property int $id
 * @property string $type
 * @property string $content
 * @property int $fid_post
 * @property int $fid_board
 * @property int $fid_user
 * @property int $created_by
 * @property Carbon|null $seen_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 *
 * @property-read Post $post
 * @property-read User $user
 * @property-read User $createdBy
 */

class Notification extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'type',
        'content',
        'fid_post',
        'fid_board',
        'seen_at',
        'fid_user',
        'created_by',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'seen_at' => 'datetime',
    ];

    /**
     * Get the post associated with the notification.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'fid_post');
    }

    /**
     * Get the user who received the notification.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }

    /**
     * Get the user who created the notification.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
