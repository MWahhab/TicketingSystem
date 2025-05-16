<?php

namespace Database\Seeders;

use App\Models\BoardConfig;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    private const int     SEED_POSTS_AMOUNT = 100;
    private const string  TEST_BOARD_TITLE = 'Seeded Demo Board';

    public function run(): void
    {
        if (BoardConfig::where('title', self::TEST_BOARD_TITLE)->exists()) {
            $this->command->info("Skipped: board already exists.");
            return;
        }

        $user  = User::first() ?? User::factory()->create();

        $board = BoardConfig::create([
            'title'    => self::TEST_BOARD_TITLE,
            'columns'  => ['Planning', 'Backlog', 'In Progress', 'Review', 'Done'],
            'fid_user' => $user->id,
        ]);

        $userIds = User::pluck('id')->all();
        $this->command->info('Users found: ' . count($userIds));

        $this->command->info('Creating posts...');
        Post::factory()
            ->count(self::SEED_POSTS_AMOUNT)
            ->forBoard($board)
            ->withAssignee($userIds)
            ->create();

        $this->command->info('Done creating posts.');
        $this->command->info("Seeded '{$board->title}' with " . self::SEED_POSTS_AMOUNT . " posts.");
    }
}
