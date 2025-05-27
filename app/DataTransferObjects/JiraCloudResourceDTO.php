<?php

namespace App\DataTransferObjects;

use Illuminate\Support\Facades\Log;

readonly class JiraCloudResourceDTO
{
    private function __construct(public readonly string $cloudId)
    {
    }

    /**
     * @param array<int, array<string, mixed>> $data
     */
    public static function fromApiResponse(array $data): ?self
    {
        if ($data === [] || !isset($data[0])) {
            Log::error('JiraCloudResourceDTO: API response is empty or first resource is not set.', ['response_data_sample' => array_slice($data, 0, 1)]);
            return null;
        }

        /** @var array<string, mixed> $firstResource */
        $firstResource = $data[0];

        if (!isset($firstResource['id']) || !is_string($firstResource['id']) || $firstResource['id'] === '') {
            Log::error('JiraCloudResourceDTO: First resource in API response is missing or invalid cloudId.', ['first_resource_keys' => array_keys($firstResource)]);
            return null;
        }

        return new self($firstResource['id']);
    }
}
