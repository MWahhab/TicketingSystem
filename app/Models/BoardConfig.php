<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BoardConfig extends Model
{
    use HasFactory;
    protected $fillable = ['title', 'columns', 'fid_user'];

    protected $casts = [
        'columns' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fid_user');
    }

    public function columns(): HasMany
    {
        return $this->hasMany(Column::class, 'fid_board');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'fid_board');
    }
}
