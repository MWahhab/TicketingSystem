<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Mockery\Exception;
use Tests\DuskTestCase;

class RegistrationTest extends DuskTestCase
{
    /**
     * Test a successful registration with valid details.
     */
    public function testSuccessfulRegistration(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/register')
                ->type('name', 'Test User')
                ->type('email', 'newuser@example.com')
                ->type('password', 'validpassword')
                ->type('password_confirmation', 'validpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/dashboard')
                ->assertSee('Welcome, Test User');
        });
    }

    /**
     * Test registration with an already registered email.
     */
    public function testDuplicateEmailRegistration(): void
    {
        $this->browse(function (Browser $browser) {
            if(!$this->makeTestUser()){
                throw new Exception('Something has gone wrong. Couldn\'t create test user');
            }

            $browser->visit('/register')
                ->type('name', 'Test User')
                ->type('email', 'test1986968215513@test.com')
                ->type('password', 'validpassword')
                ->type('password_confirmation', 'validpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/register')
                ->assertSee('The email has already been taken.');
        });
    }

    /**
     * Test registration with missing fields.
     */
    public function testMissingFields(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/register')
                ->click('button[type="submit"]')
                ->assertPathIs('/register')
                ->assertSee('The name field is required.')
                ->assertSee('The email field is required.')
                ->assertSee('The password field is required.');
        });
    }

    /**
     * Test registration with mismatched password confirmation.
     */
    public function testPasswordMismatch(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/register')
                ->type('name', 'Test User')
                ->type('email', 'newuser@example.com')
                ->type('password', 'validpassword')
                ->type('password_confirmation', 'differentpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/register')
                ->assertSee('The password confirmation does not match.');
        });
    }

    /**
     * Test registration with a weak password.
     */
    public function testWeakPassword(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/register')
                ->type('name', 'Test User')
                ->type('email', 'newuser@example.com')
                ->type('password', '123')
                ->type('password_confirmation', '123')
                ->click('button[type="submit"]')
                ->assertPathIs('/register')
                ->assertSee('The password must be at least 8 characters.');
        });
    }

    /**
     * Test that the registration page is displayed correctly.
     */
    public function testRegistrationPageDisplay(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/register')
                ->assertSee('Register')
                ->assertSee('Name')
                ->assertSee('Email')
                ->assertSee('Password')
                ->assertSee('Confirm Password');
        });
    }

    private function makeTestUser(): bool
    {
        $user = User::where('email', 'test1986968215513@test.com')->first();

        if (empty($user->id)) {
            $user = User::create([
                'name'     => 'Test User',
                'email'    => 'test1986968215513@test.com',
                'password' => 'password',
            ]);

            return true;
        }

        throw new \Exception('Something has gone wrong. The test user already exists!');
    }

    private function deleteTestUser(): void
    {
        User::where('email', 'test1986968215513@test.com')->delete();
    }
}