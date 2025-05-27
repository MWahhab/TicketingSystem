<?php

namespace App\DataTransferObjects;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;

readonly class JiraSessionDataDTO
{
    private function __construct(public string $accessToken, public string $cloudId, public ?string $refreshToken, public ?CarbonInterface $expiresAt)
    {
    }

    public static function fromSessionData(mixed $sessionData): ?self
    {
        if (!is_array($sessionData)) {
            if ($sessionData !== null) {
                Log::warning('JiraSessionDataDTO: Expected array from session, got ' . gettype($sessionData));
            }
            return null;
        }

        if (!isset($sessionData['access_token']) || !is_string($sessionData['access_token']) || $sessionData['access_token'] === '') {
            Log::warning('JiraSessionDataDTO: Session data missing or invalid access_token.');
            return null;
        }
        $accessToken = $sessionData['access_token'];

        if (!isset($sessionData['cloud_id']) || !is_string($sessionData['cloud_id']) || $sessionData['cloud_id'] === '') {
            Log::warning('JiraSessionDataDTO: Session data missing or invalid cloud_id.');
            return null;
        }
        $cloudId = $sessionData['cloud_id'];

        $refreshToken = (isset($sessionData['refresh_token']) && is_string($sessionData['refresh_token']))
            ? $sessionData['refresh_token']
            : null;

        $expiresAt = null;
        if (isset($sessionData['expires_at']) && $sessionData['expires_at'] instanceof CarbonInterface) {
            $expiresAt = $sessionData['expires_at'];
        } elseif (isset($sessionData['expires_at'])) {
            Log::warning('JiraSessionDataDTO: Session data expires_at is not a Carbon instance.', ['type' => gettype($sessionData['expires_at'])]);
        }

        return new self($accessToken, $cloudId, $refreshToken, $expiresAt);
    }

    public function isExpired(): bool
    {
        if (!$this->expiresAt instanceof \Carbon\CarbonInterface) {
            return false;
        }
        return now()->gte($this->expiresAt);
    }
}
