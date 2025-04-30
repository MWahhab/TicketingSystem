<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * App\Models\PostWatcher
 *
 * @property int         $id
 * @property int         $post_fid
 * @property int         $user_fid
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read \App\Models\Post $post
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher wherePostFid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PostWatcher whereUserFid($value)
 * @mixin \Eloquent
 */
class PostWatcher extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_fid',
        'user_fid',
    ];

    /**
     * @return BelongsTo
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'post_fid');
    }

    /**
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_fid');
    }

}
