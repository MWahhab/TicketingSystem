<?php

use PhpCsFixer\Config;
use PhpCsFixer\Finder;

$finder = Finder::create()
    ->in([
        __DIR__ . '/app',
        __DIR__ . '/PremiumAddons',
        __DIR__ . '/tests',
    ])
    ->name('*.php')
    ->ignoreDotFiles(true)
    ->ignoreVCS(true);

return (new Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@PSR12'                    => true,
        '@PHP82Migration'           => true,
        '@PHPUnit84Migration:risky' => true,
        'ordered_imports'           => true,
        'no_unused_imports'         => true,
        'single_quote'              => true,
        'array_syntax'              => ['syntax' => 'short'],
        'binary_operator_spaces'    => [
            'default'   => 'align_single_space',
            'operators' => [
                '=>' => 'align_single_space',
                '='  => 'align_single_space',
            ],
        ],
        'phpdoc_align'                  => ['align' => 'left'],
        'phpdoc_order'                  => true,
        'phpdoc_scalar'                 => true,
        'trailing_comma_in_multiline'   => ['elements' => ['arrays']],
        'no_empty_phpdoc'               => true,
        'no_superfluous_phpdoc_tags'    => true,
        'return_type_declaration'       => ['space_before' => 'none'],
        'single_line_throw'             => false,
    ])
    ->setFinder($finder);
