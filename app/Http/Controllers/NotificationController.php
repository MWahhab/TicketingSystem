<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(NotificationService $notificationService): JsonResponse
    {
        $userId = Auth::id();

        $unseenCount = Notification::where('fid_user', $userId)
            ->whereNull('seen_at')
            ->count();

        // Move the grouping logic into the service
        $finalNotifications = $notificationService->getGroupedNotifications($userId);

        return response()->json([
            'notifications' => $finalNotifications,
            'unseenCount'   => $unseenCount,
        ]);
    }

    /**
     * @return JsonResponse
     */
    public function markAsSeen(): JsonResponse
    {
        $userId = Auth::id();

        Notification::where('fid_user', $userId)
            ->whereNull('seen_at')
            ->update(['seen_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Notification $notification)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Notification $notification)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Notification $notification)
    {
        //
    }
}
