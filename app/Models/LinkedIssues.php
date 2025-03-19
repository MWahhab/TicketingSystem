<?php

namespace App\Models;

use App\Interfaces\NotificationServiceInterface;
use App\Traits\HasNotificationService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class LinkedIssues
 *
 * @property int    $id
 * @property int    $fid_origin_post
 * @property int    $fid_related_post
 * @property string $link_type
 * @property int    $fid_user
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class LinkedIssues extends Model implements NotificationServiceInterface
{
    use HasFactory, HasNotificationService;

    /**
     * @var string[]
     */
    protected $fillable = [
        'fid_origin_post',
        'fid_related_post',
        'link_type',
        'fid_user'
    ];

    /**
     * @return BelongsTo
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'fid_origin_post', 'id');
    }

    /**
     * @return BelongsTo
     */
    public function relatedPost(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'fid_related_post', 'id');
    }

    /**
     * @return BelongsTo
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user', 'id');
    }
}
