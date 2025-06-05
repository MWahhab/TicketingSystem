<?php

use App\Enums\NewsFeedCategoryEnums;
use App\Enums\NewsFeedModeEnums;
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
        Schema::create(self::table(), self::definition());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists(self::table());
    }

    public static function definition(): \Closure
    {
        return function (Blueprint $table) {
            $table->id();
            $table->enum('mode', array_column(NewsFeedModeEnums::cases(), 'value'))->index();
            $table->enum('category', array_column(NewsFeedCategoryEnums::cases(), 'value'))->index();
            $table->text('content');
            $table->foreignId('fid_post')->constrained('posts')->onDelete('cascade');
            $table->foreignId('fid_board')->constrained('board_configs')->onDelete('cascade');
            $table->foreignId('fid_user')->constrained('users');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('created_at');
            $table->index('updated_at');

            $table->index(['fid_post', 'mode', 'created_at']);
            $table->index(['fid_user', 'mode', 'created_at']);
            $table->index(['fid_board', 'mode']);
        };
    }

    public static function table(): string
    {
        return 'news_feeds';
    }
};
