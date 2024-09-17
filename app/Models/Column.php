<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Column extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'fid_board'];

    public function board(): BelongsTo
    {
        return $this->belongsTo(BoardConfig::class, 'fid_board');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'fid_column');
    }
}
