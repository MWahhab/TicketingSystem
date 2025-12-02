<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class RegistrationTest extends DuskTestCase
{
    protected function tearDown(): void
    {
        User::whereIn('email', [
            'newuser@example.com',
            'test1986968215513@test.com'
        ])->delete();

        parent::tearDown();
    }

    public function testSuccessfulRegistration(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
                ->visit('/register')
                ->type('#name', 'Test User')
                ->type('#email', 'newuser@example.com')
                ->type('#password', 'validpassword')
                ->type('#password_confirmation', 'validpassword')
                ->click('button[type="submit"]')
                ->waitForLocation('/dashboard')
                ->assertPathIs('/dashboard');

            $browser->waitFor('button[aria-label="Logout"]')
                ->click('button[aria-label="Logout"]')
                ->waitForLocation('/');
        });
    }

    public function testDuplicateEmailRegistration(): void
    {
        $this->makeTestUser();

        $this->browse(function (Browser $browser) {
            $browser->logout()
                ->visit('/register')
                ->type('#name', 'Test User')
                ->type('#email', 'test1986968215513@test.com')
                ->type('#password', 'validpassword')
                ->type('#password_confirmation', 'validpassword')
                ->click('button[type="submit"]')
                ->waitForText('The email has already been taken.')
                ->assertPathIs('/register');
        });
    }

    public function testMissingFields(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
                ->visit('/register');

            $browser->script("document.querySelectorAll('input').forEach(el => el.removeAttribute('required'));");

            $browser->click('button[type="submit"]')
                ->assertPathIs('/register')
                ->waitForText('The name field is required.')
                ->assertSee('The email field is required.')
                ->assertSee('The password field is required.');
        });
    }

    public function testPasswordMismatch(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
                ->visit('/register')
                ->type('#name', 'Test User')
                ->type('#email', 'newuser@example.com')
                ->type('#password', 'validpassword')
                ->type('#password_confirmation', 'differentpassword')
                ->click('button[type="submit"]')
                ->assertPathIs('/register')
                // Note the word "field" might be needed depending on your validation.php
                ->waitForText('confirmation does not match');
        });
    }

    public function testWeakPassword(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
                ->visit('/register')
                ->type('#name', 'Test User')
                ->type('#email', 'newuser@example.com')
                ->type('#password', '123')
                ->type('#password_confirmation', '123')
                ->click('button[type="submit"]')
                ->assertPathIs('/register')
                ->waitForText('The password field must be at least 8 characters.');
        });
    }

    public function testRegistrationPageDisplay(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->logout()
                ->visit('/register')
                ->assertSee('Register')
                ->assertSee('Name')
                ->assertSee('Email')
                ->assertSee('Password')
                ->assertSee('Confirm Password');
        });
    }

    private function makeTestUser(): void
    {
        User::firstOrCreate(
            ['email' => 'test1986968215513@test.com'],
            [
                'name'     => 'Test User',
                'password' => Hash::make('password'),
            ]
        );
    }
}
