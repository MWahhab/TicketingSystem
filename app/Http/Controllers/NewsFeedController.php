<?php

namespace App\Http\Controllers;

use App\Models\BoardConfig;
use App\Models\User;
use App\Services\NewsFeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NewsFeedController extends Controller
{
    public function index(Request $request, NewsFeedService $newsFeedService): JsonResponse|Response
    {
        if ($request->wantsJson()) {
            $validated = $request->validate([
                'fid_board' => ['required', 'numeric', 'exists:board_configs,id'],
                'fid_user'  => ['nullable', 'numeric', 'exists:users,id'],
                'dateFrom'  => ['nullable', 'date'],
                'dateTo'    => ['nullable', 'date', 'after_or_equal:dateFrom'],
            ]);

            $feeds = $newsFeedService->getFeed($validated);

            return response()->json([
                'personal_feed' => $feeds['personal'],
                'overview_feed' => $feeds['overview'],
            ]);
        }

        $boards = BoardConfig::all(['id', 'title']);

        $users = User::all(['id', 'name']);

        return Inertia::render('Board/components/NewsFeed', [
            'boards'     => $boards,
            'users'      => $users,
            'authUserId' => auth()->id(),
        ]);
    }
}
