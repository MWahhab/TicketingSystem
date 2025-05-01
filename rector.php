<?php

declare(strict_types=1);

use Rector\CodeQuality\Rector\If_\SimplifyIfReturnBoolRector;
use Rector\CodingStyle\Rector\ClassMethod\NewlineBeforeNewAssignSetRector;
use Rector\Config\RectorConfig;
use Rector\DeadCode\Rector\ClassMethod\RemoveUselessParamTagRector;
use Rector\DeadCode\Rector\ClassMethod\RemoveUselessReturnTagRector;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;
use Rector\TypeDeclaration\Rector\ClassMethod\ParamTypeByParentCallTypeRector;

return static function (RectorConfig $config): void {
    $config->paths([
        __DIR__ . '/app',
        __DIR__ . '/PremiumAddons',
        __DIR__ . '/routes',
        __DIR__ . '/tests',
    ]);

    $config->sets([
        LevelSetList::UP_TO_PHP_83,
        SetList::CODE_QUALITY,
        SetList::DEAD_CODE,
        SetList::EARLY_RETURN,
    ]);

    $config->rules([
        RemoveUselessParamTagRector::class,
        RemoveUselessReturnTagRector::class,
        SimplifyIfReturnBoolRector::class,
        NewlineBeforeNewAssignSetRector::class,
        ParamTypeByParentCallTypeRector::class,
    ]);

    $config->skip([
        Rector\TypeDeclaration\Rector\ClassMethod\ReturnTypeFromStrictTypedCallRector::class,
    ]);
};
