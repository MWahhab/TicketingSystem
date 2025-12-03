<?php

namespace Tests\Browser;

use App\Models\BoardConfig;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Mockery\Exception;
use Tests\DuskTestCase;

class BoardInteractionTest
{
    /**
     * Test a successful board creation
     */
//    public function testSuccessfulCreation(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $userId = $this->reachDashboard("login");
//
//            if(!$userId){
//                throw new Exception("Issue with user login");
//            }
//
//            $browser->assertSee("Add new board")
//                ->press("Add new board")
//                ->assertSee("New Board")
//                ->assertSee("Create a new board.")
//                ->assertSee("Title")
//                ->assertSee("Columns")
//                ->assertSee("Create a new board.")
//                ->assertSee("Please enter columns as comma-separated values!")
//                ->assertSee("Save")
//
//                ->type("name", "Testing Board")
//                ->type("columns", "firstCol, secondCol, spaced col")
//                ->press("Save")
//                ->assertSee("New board has been created!");
//
//            $this->reachDashboard("logout");
//
//        });
//    }
//
//    /**
//     * Test board creation with missing fields.
//     */
//    public function testMissingFields(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $this->reachDashboard("login");
//
//            $browser
//                ->press("Save")
//                ->assertSee('Title must be at least 2 characters.')
//                ->assertSee('Columns must be at least 5 characters.');
//
//            $this->reachDashboard("logout");
//        });
//    }
//
//    /**
//     * Test board deletion
//     */
//    public function testDeletion(): void
//    {
//        $this->browse(function (Browser $browser) {
//            $userId = $this->reachDashboard("login");
//
//            if (!$userId){
//                throw new Exception("No user id provided for test board");
//            }
//
//            $this->makeTestingBoard($userId);
//
//            $browser->assertSee("Auto Gen Test Board")
//                ->press("Auto Gen Test Board")
//
//                ->assertSeeIn('span.sr-only', 'Delete')
//                ->click('button.text-red-500')
//
//                ->assertSee("Confirm Deletion")
//                ->assertSee("Are you sure you want to delete this board? This action cannot be undone.")
//
//                ->press("Delete")
//
//                ->assertDontSee("Auto Gen Test Board");
//
//            $this->reachDashboard("logout");
//
//        });
//    }
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
//    private function makeTestingBoard(int $userFid): bool
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
//            return true;
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
