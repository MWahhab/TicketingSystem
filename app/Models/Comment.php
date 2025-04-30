<?php

namespace App\Models;

use App\Interfaces\NotificationServiceInterface;
use App\Traits\HasNotificationService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Class Comment
 *
 * @property int $id
 * @property string $content
 * @property int $fid_post
 * @property int $fid_user
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read \App\Models\Post $post
 * @property-read User $user
 * @property-read \App\Models\User $creator
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereContent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereFidPost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereFidUser($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Comment whereUpdatedAt($value)
 * @mixin \Eloquent
 */

class Comment extends Model implements NotificationServiceInterface
{
    use HasFactory, HasNotificationService;

    protected $fillable = ['content', 'fid_post', 'fid_user'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'fid_post');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }
}
