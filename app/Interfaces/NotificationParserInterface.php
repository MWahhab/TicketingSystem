<?php

namespace App\Interfaces;

interface NotificationParserInterface
{
    public function parse(object $entity): array;
}
