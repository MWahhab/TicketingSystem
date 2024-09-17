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
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('desc');
            $table->string('priority');
            $table->string('status');
            $table->foreignId('assignee_id')->constrained('users');
            $table->date('deadline')->nullable();
            $table->foreignId('fid_board')->constrained('board_configs');
            $table->foreignId('fid_column')->constrained('columns');
            $table->foreignId('fid_user')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
