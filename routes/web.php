<?php

use App\Http\Controllers\BoardConfigController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect('/dashboard');
    }

    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [BoardConfigController::class, 'index'])->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::resource('boards', BoardConfigController::class);
    Route::resource('boards.posts', PostController::class)->shallow();
    Route::resource('posts', PostController::class);
    Route::resource('comments', CommentController::class);

    Route::post('/move/{post}', [PostController::class, 'move']);

    Route::get('/api/notifications', [NotificationController::class, 'index']);
    Route::get('/api/activity/{post}', [NotificationController::class, 'getActivityHistory']);
    Route::post('/api/notifications/mark-as-seen', [NotificationController::class, 'markAsSeen']);
});

require __DIR__.'/auth.php';
