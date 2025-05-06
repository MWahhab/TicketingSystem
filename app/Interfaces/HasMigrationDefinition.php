<?php

namespace App\Interfaces;

interface HasMigrationDefinition
{
    public static function definition(): \Closure;
    public static function table(): string;
}
