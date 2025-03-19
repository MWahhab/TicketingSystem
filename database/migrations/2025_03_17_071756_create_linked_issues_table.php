<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('linked_issues', function (Blueprint $table) {
            $table->id();
            $table->text('link_type');
            $table->foreignId('fid_origin_post')->constrained('posts')->onDelete('cascade');
            $table->foreignId('fid_related_post')->constrained('posts');
            $table->foreignId('fid_user')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('linked_issues');
    }
};
