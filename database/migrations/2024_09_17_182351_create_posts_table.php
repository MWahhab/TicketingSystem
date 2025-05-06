<?php

use App\Interfaces\HasMigrationDefinition;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration implements HasMigrationDefinition {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('posts', self::definition());
    }

    public static function definition(): \Closure
    {
        return function (Blueprint $table) {
            $table->id();
            $table->string('title')->index();
            $table->longText('desc');
            $table->string('priority')->index();
            $table->boolean('pinned')->nullable()->index();
            $table->string('column')->index();
            $table->foreignId('assignee_id')->constrained('users');
            $table->date('deadline')->nullable()->index();
            $table->integer('had_branch')->nullable();
            $table->foreignId('fid_board')->constrained('board_configs')->onDelete('cascade');
            $table->foreignId('fid_user')->constrained('users');
            $table->string('migrated_from')->nullable();
            $table->timestamps();
            $table->index('created_at');
            $table->index('updated_at');

            $table->index(['fid_board', 'created_at']);
            $table->index(['fid_board', 'deadline']);
            $table->index(['fid_board', 'pinned', 'priority', 'created_at']);
        };
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }

    public static function table(): string
    {
        return 'posts';
    }
};
