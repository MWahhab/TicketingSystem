<?php

namespace App\Http\Controllers;

use App\Enums\NewsFeedEnums;
use App\Services\NewsFeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class NewsFeedController extends Controller
{
    public function index(Request $request, NewsFeedService $newsFeedService): JsonResponse
    {
        $validated = $request->validate([
            'fid_board' => ['required', 'numeric', 'exists:board_configs,id'],
            'fid_user'  => ['nullable', 'numeric', 'exists:users,id'],
            'feed_type' => ['required', new Enum(NewsFeedEnums::class)],
            'dateFrom'  => ['nullable', 'date'],
            'dateTo'    => ['nullable', 'date', 'after_or_equal:dateFrom'],
        ]);

        $feed = $newsFeedService->getFeed($validated);

        return response()->json(['feed' => $feed]);
    }
}
