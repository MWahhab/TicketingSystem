<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class LoginTest extends DuskTestCase
{
    /**
     * Test a successful login with valid credentials.
     */
    public function testSuccessfulLoginAndLogout(): void
    {
        $this->makeLoginTestUser();

        try {
            $this->browse(function (Browser $browser) {
                $browser->logout()
                ->visit('/login')
                    ->waitForText('Log in')
                    ->assertSee('Email')
                    ->assertSee('Password')
                    ->assertSee('Remember me')
                    ->assertSee('Forgot your password?')
                    ->assertSee('Log in');

                $browser->type('input[name="email"]', 'test1986968215513@test.com')
                    ->type('input[name="password"]', 'password')
                    ->click('button[type="submit"]')
                    ->waitForLocation('/dashboard')
                    ->assertPathIs('/dashboard');

                $browser->waitFor('button[aria-label="Logout"]')
                ->click('button[aria-label="Logout"]')
                ->waitForLocation('/');
            });
        } finally {
            $this->deleteLoginTestUser();
        }
    }

    public function testInvalidLogin(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
            ->visit('/login')
                ->waitForText('Log in')
                ->type('input[name="email"]', 'invaliduser@example.com')
                ->type('input[name="password"]', 'wrongpassword')
                ->click('button[type="submit"]')
                ->waitForText('These credentials do not match our records.')
                ->assertPathIs('/login');
        });
    }

    public function testMissingFields(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
            ->visit('/login')
                ->waitForText('Log in');

            $browser->script("document.querySelectorAll('input').forEach(el => el.removeAttribute('required'));");

            $browser->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->waitForText('The email field is required.')
                ->assertSee('The password field is required.');
        });
    }

    public function testMissingPassword(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
            ->visit('/login')
                ->waitForText('Log in');

            $browser->script("document.querySelectorAll('input').forEach(el => el.removeAttribute('required'));");

            $browser->type('input[name="email"]', 'validuser@example.com')
                ->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->waitForText('The password field is required.');
        });
    }

    public function testMissingEmail(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
            ->visit('/login')
                ->waitForText('Log in');

            $browser->script("document.querySelectorAll('input').forEach(el => el.removeAttribute('required'));");

            $browser->type('input[name="password"]', 'validpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/login')
                ->waitForText('The email field is required.');
        });
    }

    public function testLoginPageDisplay(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
            ->visit('/login')
                ->waitForText('Log in')
                ->assertSee('Log in')
                ->assertSee('Email')
                ->assertSee('Password')
                ->assertSee('Remember me');
        });
    }

    /**
     * Helper: Create a user for testing.
     * Uses firstOrCreate to avoid duplicates and Hash for password security.
     */
    private function makeLoginTestUser(): void
    {
        User::firstOrCreate(
            ['email' => 'test1986968215513@test.com'],
            [
                'name'     => 'Test User',
                'password' => Hash::make('password'),
            ]
        );
    }

    /**
     * Helper: Delete the test user.
     */
    private function deleteLoginTestUser(): void
    {
        User::where('email', 'test1986968215513@test.com')->delete();
    }
}
