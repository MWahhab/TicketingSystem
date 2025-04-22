<?php

namespace app\Utils;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    /**
     * @param string $message
     * @param array  $data
     * @param int    $code
     * @return JsonResponse
     */
    public static function success(string $message = '', array $data = [], int $code = 200): JsonResponse
    {
        return response()
            ->json([
                'success' => true,
                'message' => $message,
                'data'    => $data,
            ])
            ->setStatusCode($code)
            ->header('X-Inertia', false);
    }

    /**
     * @param string $message
     * @param int $code
     * @return JsonResponse
     */
    public static function error(string $message = '', int $code = 500): JsonResponse
    {
        return response()
            ->json([
                'success' => false,
                'message' => $message ?: 'Something went wrong.',
            ])
            ->setStatusCode($code)
            ->header('X-Inertia', false);
    }
}