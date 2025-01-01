<?php

namespace Tests\Browser;

use App\Models\User;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class LoginTest extends DuskTestCase
{
    /**
     * Test a successful login with valid credentials.
     */
    public function testSuccessfulLoginAndLogout(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->waitForText('Email')
                ->assertSee('Password')
                ->assertSee('Remember me')
                ->assertSee('Forgot your password?')
                ->assertSee('LOG IN');

            if (!$this->makeLoginTestUser()) {
                throw new \Exception('Something has gone wrong. Couldn\'t create test user');
            }

            $browser->type('email', 'test1986968215513@test.com')
                ->type('password', 'password')
                ->click('button[type="submit"]')
                ->pause(2000)
                ->screenshot('what_happened_login')
                ->assertPathIs('/dashboard');

            $browser->press("Test User")
                ->press("Log Out")
                ->pause(2000)
                ->screenshot('what_happened_logout')
                ->assertPathIs("/");

            $this->deleteLoginTestUser();
        });
    }

    /**
     * Test login with invalid credentials.
     */
    public function testInvalidLogin(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('email', 'invaliduser@example.com')
                ->type('password', 'wrongpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->assertSee('These credentials do not match our records.');
        });
    }

    /**
     * Test login with missing email and password.
     */
    public function testMissingFields(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->assertSee('The email field is required.')
                ->assertSee('The password field is required.');
        });
    }

    /**
     * Test login with valid email but missing password.
     */
    public function testMissingPassword(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('email', 'validuser@example.com')
                ->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->assertSee('The password field is required.');
        });
    }

    /**
     * Test login with valid password but missing email.
     */
    public function testMissingEmail(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('password', 'validpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->assertSee('The email field is required.');
        });
    }

    /**
     * Test that the login page is displayed correctly.
     */
    public function testLoginPageDisplay(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->assertSee('Login')
                ->assertSee('Email')
                ->assertSee('Password')
                ->assertSee('Remember Me');
        });
    }

    private function makeLoginTestUser(): bool
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

    private function deleteLoginTestUser(): void
    {
        User::where('email', 'test1986968215513@test.com')->delete();
    }
}