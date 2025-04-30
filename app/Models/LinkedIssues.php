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
 * @property-read \App\Models\User $creator
 * @property-read \App\Models\Post $post
 * @property-read \App\Models\Post $relatedPost
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereFidOriginPost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereFidRelatedPost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereFidUser($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereLinkType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkedIssues whereUpdatedAt($value)
 * @mixin \Eloquent
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
