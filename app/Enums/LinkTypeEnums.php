<?php

namespace App\Enums;

enum LinkTypeEnums: string
{
    case RELATES_TO    = 'relates to';
    case CAUSED_BY     = 'caused by';
    case CAUSES        = 'causes';
    case BLOCKED_BY    = 'blocked by';
    case BLOCKS        = 'blocks';
    case DUPLICATED_BY = 'duplicated by';
    case DUPLICATES    = 'duplicates';

    /**
     * Convert enum cases to a select-friendly array format.
     *
     * @return array<int, array<string, string>>
     */
    public static function asSelectArray(): array
    {
        return array_map(
            fn($case) => ['name' => $case->value, 'value' => $case->value],
            self::cases()
        );
    }
}
