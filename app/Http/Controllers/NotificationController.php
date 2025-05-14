<?php

namespace App\Http\Controllers;

use App\Enums\SubscriptionTierEnums;
use App\Models\Notification;
use App\Models\Post;
use App\Services\GroupedNotificationCacheService;
use App\Services\NotificationService;
use Carbon\Carbon;
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
        $userId      = Auth::id();
        $unseenCount = Notification::where('fid_user', $userId)
            ->whereNull('seen_at')
            ->count();

        $finalNotifications = $notificationService->getGroupedNotifications($userId);

        return response()->json([
            'notifications' => $finalNotifications,
            'unseenCount'   => $unseenCount,
        ]);
    }

    public function markAsSeen(Request $request, GroupedNotificationCacheService $groupedNotificationCacheService): JsonResponse
    {
        $userId = Auth::id();

        Notification::where('fid_user', $userId)
            ->whereNull('seen_at')
            ->update(['seen_at' => now()]);

        $groupedNotificationCacheService->markAllGroupsAsSeen($userId);

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

    public function getActivityHistory(Post $post): JsonResponse
    {
        $rawNotifications = Notification::where('fid_post', $post->id)
            ->with(['user', 'createdBy', ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();

        $subscriptionTier = SubscriptionTierEnums::STANDARD->value;
        if (is_dir(base_path('PremiumAddons'))) {
            $subscriptionService = new \PremiumAddons\services\PremiumSubscriptionService();
            $subscriptionTier    = $subscriptionService->getSubscriptionTier();
        }

        $seenContent = [];
        foreach ($rawNotifications as $index => $notification) {
            if (str_contains((string) $notification['content'], 'mention')) {
                unset($rawNotifications[$index]);
                continue;
            }

            $position = strpos((string) $notification['content'], ' on post');

            if ($position !== false) {
                $rawNotifications[$index]['content'] = substr((string) $notification['content'], 0, $position);
            }

            if (!isset($seenContent[$rawNotifications[$index]['content']])) {
                $seenContent[$rawNotifications[$index]['content']] = $rawNotifications[$index]['created_at'];
            } else {
                $oldNotification    = Carbon::parse($seenContent[$rawNotifications[$index]['content']]);
                $latestNotification = Carbon::parse($notification['created_at']);

                if ($oldNotification->isSameMinute($latestNotification)) {
                    unset($rawNotifications[$index]);
                    continue;
                }
            }
            if (isset($notification['created_by']) && is_array($notification['created_by'])) {
                $rawNotifications[$index]['created_by'] = $notification['created_by']['name'] ?? 'Unknown';
            } elseif (isset($notification['created_by'])) {
                $rawNotifications[$index]['created_by'] = $notification['created_by'] ?? 'Unknown';
            } else {
                $rawNotifications[$index]['created_by'] = 'Unknown';
            }
        }
        $rawNotifications = array_values($rawNotifications);

        return response()->json([$rawNotifications, ['subscriptionTier' => $subscriptionTier]]);
    }
}
