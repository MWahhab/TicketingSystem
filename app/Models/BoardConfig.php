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
 * Class BoardConfig
 *
 * @property int $id
 * @property string $title
 * @property array $columns
 * @property int $fid_user
 * @property Carbon $created_at
 * @property Carbon $updated_at
 *
 * @property-read User $owner
 */
class BoardConfig extends Model implements NotificationServiceInterface
{
    use HasFactory, HasNotificationService;
    protected $fillable = ['title', 'columns', 'fid_user'];

    protected $casts = [
        'columns' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'fid_board');
    }
}
