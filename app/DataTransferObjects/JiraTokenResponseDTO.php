<?php

namespace App\DataTransferObjects;

use Illuminate\Support\Facades\Log;

readonly class JiraTokenResponseDTO
{
    private function __construct(public readonly string $accessToken, public readonly ?string $refreshToken, public readonly int $expiresIn)
    {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromApiResponse(array $data): ?self
    {
        if (!isset($data['access_token']) || !is_string($data['access_token']) || $data['access_token'] === '') {
            Log::error('JiraTokenResponseDTO: API response missing or invalid access_token.', ['response_data_keys' => array_keys($data)]);
            return null;
        }
        $accessToken = $data['access_token'];

        $refreshToken = null;
        if (isset($data['refresh_token']) && is_string($data['refresh_token'])) {
            $refreshToken = $data['refresh_token'];
        }

        $expiresIn = 3600;
        if (isset($data['expires_in']) && is_numeric($data['expires_in']) && (int)$data['expires_in'] > 0) {
            $expiresIn = (int)$data['expires_in'];
        }

        return new self($accessToken, $refreshToken, $expiresIn);
    }
}
