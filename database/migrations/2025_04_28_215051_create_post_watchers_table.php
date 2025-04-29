<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_watchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_fid')->constrained('posts')->onDelete('cascade');
            $table->foreignId('user_fid')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['post_fid', 'user_fid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_watchers');
    }
};
