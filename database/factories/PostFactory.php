<?php

namespace Database\Factories;

use App\Models\BoardConfig;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Post>
 */
class PostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'desc' => $this->faker->paragraph,
            'priority' => Arr::random(['low', 'medium', 'high']),
            'pinned' => $this->faker->boolean(10),
            'deadline' => $this->faker->optional()->date,
            'had_branch' => $this->faker->boolean ? 1 : null,
            'fid_user' => null,
            'assignee_id' => null,
            'fid_board' => null,
            'column' => 'Backlog',
            'migrated_from' => null,
        ];
    }

    public function forBoard(BoardConfig $board): self
    {
        return $this->state(function () use ($board) {
            return [
                'fid_board' => $board->id,
                'column' => Arr::random($board->columns),
                'fid_user' => $board->fid_user,
            ];
        });
    }

    public function withAssignee(array $userIds): self
    {
        return $this->state(fn () => [
            'assignee_id' => Arr::random($userIds),
        ]);
    }
}
