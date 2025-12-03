<?php

namespace Tests\Browser;

use App\Models\BoardConfig;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Mockery\Exception;
use Tests\DuskTestCase;

class PostInteractionTes
{
    /**
     * Test a successful board creation
     */
//    public function testSuccessfulCreation(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $userId = $this->reachDashboard("login");
//
//            if(!$userId) {
//                throw new Exception("No user id provided for test board");
//            }
//
//            $this->makeTestingBoard($userId);
//
//            $browser->assertSee("Auto Gen Test Board")
//                ->press("Auto Gen Test Board")
//
//                ->assertSee("Create New Post")
//                ->press("Create New Post")
//
//                ->assertSee("Title")
//                ->assertSee("Board")
//                ->assertSee("Priority")
//                ->assertSee("Description")
//                ->assertSee("Assignee")
//                ->assertSee("Deadline")
//                ->assertSee("Submit")
//
//                ->type("title", "Some Title")
//                ->type("description", "Some Description")
//
//                ->press("Select board")
//                ->press("Auto Gen Test Board")
//
//                ->press("Select column")
//                ->press("secondCol")
//
//                ->press("Select priority")
//                ->press("medium")
//
//                ->press("Select assignee")
//                ->press("Test User")
//
//                ->press("Pick a date")
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->press("5")
//
//                ->press("Select board")
//                ->press("Auto Gen Test Board")
//
//
//                ->press("Submit")
//                ->assertSee("New post has been created!");
//
//            $this->reachDashboard("logout");
//
//        });
//    }
//
//    /**
//     * Test creation with missing fields.
//     */
//    public function testMissingFields(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $userId = $this->reachDashboard("login");
//
//            if (!$userId) {
//                throw new Exception("No user id provided for test board");
//            }
//
//            $browser->assertSee("Auto Gen Test Board")
//                ->press("Auto Gen Test Board")
//
//                ->assertSee("Create New Post")
//                ->press("Create New Post")
//
//                ->assertSee("Title")
//                ->assertSee("Board")
//                ->assertSee("Priority")
//                ->assertSee("Description")
//                ->assertSee("Assignee")
//                ->assertSee("Deadline")
//                ->assertSee("Submit")
//
//                ->press("Submit")
//                ->assertSee('Title is required')
//                ->assertSee('Board is required')
//                ->assertSee('Priority is required')
//                ->assertSee('Description is required')
//                ->assertSee('Assignee is required')
//                ->assertSee('Submit is required');
//
//            $this->reachDashboard("logout");
//        });
//    }
//
//    /**
//     * Test deletion
//     */
//    public function testDeletion(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $userId = $this->reachDashboard("login");
//
//            if (!$userId) {
//                throw new Exception("No user id provided for test board");
//            }
//
//            $boardId = $this->makeTestingBoard($userId);
//
//            if (!$boardId) {
//                throw new Exception("No board id provided for test post");
//            }
//
//            if(!$this->makeTestingPost($userId, $boardId)){
//                throw new Exception('Something has gone wrong. Couldn\'t create test post');
//            }
//
//            $browser->assertSee("Auto Gen Test Board")
//                ->press("Auto Gen Test Board")
//
//                ->assertSee("some test post")
//                ->press("some test post")
//
//                ->assertSeeIn('svg.lucide-trash2', 'trash')
//                ->click('svg.lucide-trash2')
//
//                ->assertSee("Confirm Deletion")
//                ->assertSee("Are you sure you want to delete this board? This action cannot be undone.")
//
//
//                ->press("Delete")
//
//                ->assertDontSee("some test post");
//
//            $this->reachDashboard("logout");
//        });
//    }
//
//    /**
//     * Test editing an existing post
//     */
//    public function testEditPost(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $userId = $this->reachDashboard("login");
//
//            if(!$userId) {
//                throw new Exception("No user id provided for test board");
//            }
//
//            $boardId = $this->makeTestingBoard($userId);
//
//            if (!$boardId) {
//                throw new Exception("No board id provided for test post");
//            }
//
//            if(!$this->makeTestingPost($userId, $boardId)){
//                throw new Exception('Something has gone wrong. Couldn\'t create test post');
//            }
//
//            $browser->assertSee("Auto Gen Test Board")
//                ->press("Auto Gen Test Board")
//
//                ->assertSee("some test post")
//                ->press("some test post")
//
//                ->assertSee("Edit Post")
//                ->assertSee("Update")
//
//                ->type("title", "Updated Title")
//                ->type("description", "Updated Description")
//
//                ->press("Select board")
//                ->press("Auto Gen Test Board")
//
//                ->press("Select column")
//                ->press("secondCol")
//
//                ->press("Select priority")
//                ->press("medium")
//
//                ->press("Select assignee")
//                ->press("Test User")
//
//                ->press("Pick a date")
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->click('button[name="next-month"]')
//                ->press("5")
//
//                ->press("Select board")
//                ->press("Auto Gen Test Board")
//
//                ->press("Update")
//                ->assertSee("Post has been updated!");
//
//            $this->reachDashboard("logout");
//
//        });
//    }
//
//
//    private function reachDashboard(string $intent): int|null
//    {
//        if($intent !== "login" || $intent !== "logout"){
//            throw new Exception("Login/Logout intent unspecified");
//        }
//
//        if($intent == "logout") {
//            $this->deleteLoginTestUser();
//
//            return null;
//        }
//
//        $userId = $this->makeLoginTestUser();
//
//        if ($userId) {
//            throw new \Exception('Something has gone wrong. Couldn\'t create test user');
//        }
//
//        $this->browse(function (Browser $browser) {
//            $browser->visit('/login')
//                ->waitForText('Email')
//                ->assertSee('Password')
//                ->assertSee('LOG IN');
//
//            $browser->type('email', 'test1986968215513@test.com')
//                ->type('password', 'password')
//                ->click('button[type="submit"]')
//                ->assertPathIs('/dashboard');
//
//        });
//
//        return $userId;
//
//    }
//
//    private function makeTestingPost(int $userFid, int $boardFid): bool
//    {
//        $post = BoardConfig::where('title', 'some test post')->first();
//
//        if (empty($post->id)) {
//            BoardConfig::create([
//                'title'       => 'some test post',
//                'desc'        => 'firstCol, secondCol, spaced col, extra col',
//                'priority'    => 'medium',
//                'column'      => 'secondCol',
//                'assignee_id' => $userFid,
//                'deadline'    => '30/12/2025',
//                'fid_board'   => $boardFid,
//                'fid_user'    => $userFid,
//            ]);
//
//            return true;
//        }
//
//        throw new \Exception('Something has gone wrong. The test post already exists!');
//    }
//
//    private function makeTestingBoard(int $userFid): int
//    {
//        $board = BoardConfig::where('title', 'Auto Gen Test Board')->first();
//
//        if (empty($board->id)) {
//            $board = BoardConfig::create([
//                'title'     => 'Auto Gen Test Board',
//                'columns'   => 'firstCol, secondCol, spaced col, extra col',
//                'fid_user'  => $userFid,
//            ]);
//
//            return $board->id;
//        }
//
//        throw new \Exception('Something has gone wrong. The test board already exists!');
//    }
//
//    private function makeLoginTestUser(): int
//    {
//        $user = User::where('email', 'test1986968215513@test.com')->first();
//
//        if (empty($user->id)) {
//            $user = User::create([
//                'name'     => 'Test User',
//                'email'    => 'test1986968215513@test.com',
//                'password' => 'password',
//            ]);
//
//            return $user->id;
//        }
//
//        throw new \Exception('Something has gone wrong. The test user already exists!');
//    }
//
//    private function deleteLoginTestUser(): void
//    {
//        User::where('email', 'test1986968215513@test.com')->delete();
//    }
}
