<?php

namespace App\Interfaces;

interface NotificationParserInterface
{
    public function parse(object $entity): array;

    /**
     * @return list<int>
     */
    public function getNewlyNotifiedUserIds(object $entity): array;
}
