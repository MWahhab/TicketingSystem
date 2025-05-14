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
        Schema::create('notifications', self::definition());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }

    /**
     * Reusable table definition for replaying structure.
     */
    public static function definition(): \Closure
    {
        return function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();
            $table->text('content');
            $table->foreignId('fid_post')->constrained('posts')->onDelete('cascade');
            $table->foreignId('fid_board')->constrained('board_configs')->onDelete('cascade');
            $table->dateTime('seen_at')->nullable();
            $table->foreignId('fid_user')->constrained('users');
            $table->foreignId('created_by')->constrained('users');
            $table->boolean('is_mention')->default(null);
            $table->timestamps();
            $table->index('created_at');
            $table->index('updated_at');

            $table->index(['fid_post', 'type', 'created_at']);
        };
    }

    public static function table(): string
    {
        return 'notifications';
    }
};
