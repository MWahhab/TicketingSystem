<?php

namespace App\Services;

use App\Enums\LinkTypeEnums;

/**
 * If an issue blocks another issue, this means that the issue which is being blocked
 * needs to display a status indicating it is being blocked by another issue
 *
 * This service is here to make sure these relations are created/removed appropriately
 */
class LinkedIssuesService
{
    /**
     * @var array contains status opposites
     */
    public array $reverseStatuses = [
        LinkTypeEnums::BLOCKED_BY->value    => LinkTypeEnums::BLOCKS->value,
        LinkTypeEnums::BLOCKS->value        => LinkTypeEnums::BLOCKED_BY->value,
        LinkTypeEnums::CAUSED_BY->value     => LinkTypeEnums::CAUSES->value,
        LinkTypeEnums::CAUSES->value        => LinkTypeEnums::CAUSED_BY->value,
        LinkTypeEnums::DUPLICATED_BY->value => LinkTypeEnums::DUPLICATES->value,
        LinkTypeEnums::DUPLICATES->value    => LinkTypeEnums::DUPLICATED_BY->value,
        LinkTypeEnums::RELATES_TO->value    => LinkTypeEnums::RELATES_TO->value,
    ];

    /**
     * Expects a value of LinkTypeEnums, returns the opposite of it.
     * Example: 'causes' -> 'caused by'
     *
     * @param string $status
     * @return string
     */
    public function getReverseStatus(string $status): string
    {
        return $this->reverseStatuses[$status] ?? $status;
    }
}