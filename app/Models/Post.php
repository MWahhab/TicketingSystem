<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'desc', 'priority', 'status', 'assignee_id', 'deadline',
        'fid_board', 'fid_column', 'fid_user'
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

    public function column(): BelongsTo
    {
        return $this->belongsTo(Column::class, 'fid_column');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'fid_post');
    }
}
