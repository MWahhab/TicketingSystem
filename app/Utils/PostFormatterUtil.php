<?php

namespace App\Utils;

use App\Enums\DeadlineColorEnums;

class PostFormatterUtil
{
    public static function getDeadlineColor(null|string|\DateTimeInterface $deadline): string
    {
        if (!$deadline) {
            return DeadlineColorEnums::GRAY->value;
        }

        try {
            $deadline = $deadline instanceof \DateTimeInterface
                ? \Carbon\Carbon::instance($deadline)
                : \Carbon\Carbon::parse($deadline);
        } catch (\Throwable) {
            return DeadlineColorEnums::GRAY->value;
        }

        if ($deadline->isPast()) {
            return DeadlineColorEnums::RED->value;
        }

        $daysDiff = now()->diffInDays($deadline);

        if ($daysDiff <= 3) {
            return DeadlineColorEnums::RED->value;
        }

        if ($daysDiff <= 7) {
            return DeadlineColorEnums::YELLOW->value;
        }

        return DeadlineColorEnums::GRAY->value;
    }
}
