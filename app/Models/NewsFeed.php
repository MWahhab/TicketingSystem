<?php

namespace App\Models;

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property NewsFeedModeEnums $type
 * @property NewsFeedModeEnums $category
 * @property string $content
 * @property int $fid_post
 * @property int $fid_board
 * @property int $fid_user
 * @property int $created_by
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class NewsFeed extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'mode',
        'category',
        'content',
        'fid_post',
        'fid_board',
        'fid_user',
        'created_by',
    ];

    /** @var array<string, class-string> */
    protected $casts = [
        'category' => NewsFeedCategoryEnums::class,
        'mode'     => NewsFeedModeEnums::class,
    ];

    /** @return BelongsTo<Post, NewsFeed> */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'fid_post');
    }

    /** @return BelongsTo<BoardConfig, NewsFeed> */
    public function board(): BelongsTo
    {
        return $this->belongsTo(BoardConfig::class, 'fid_board');
    }

    /** @return BelongsTo<User, NewsFeed> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }

    /** @return BelongsTo<User, NewsFeed> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
