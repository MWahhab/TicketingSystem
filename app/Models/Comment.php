<?php

namespace App\Models;

use App\Interfaces\NotificationServiceInterface;
use App\Services\NotificationService;
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
 *
 * @property-read \App\Models\Post $post
 * @property-read User $user
 */

class Comment extends Model implements NotificationServiceInterface
{
    use HasFactory;

    protected $fillable = ['content', 'fid_post', 'fid_user'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'fid_post');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }

    public function notify(): void
    {
        app(NotificationService::class)->notify($this);
    }
}
