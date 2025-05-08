<?php

return [

    'backup' => [

        'name' => env('APP_NAME', 'laravel-backup'),

        'source' => [
            'files' => [
                'include'                       => [],
                'exclude'                       => [],
                'follow_links'                  => false,
                'ignore_unreadable_directories' => false,
                'relative_path'                 => base_path(),
            ],
            'databases' => [
                'mysql',
            ],
        ],

        'destination' => [
            'filename_prefix' => '',
            'disks'           => [
                'backup_disk',
            ],
            'compression_method' => ZipArchive::CM_DEFAULT,
        ],
    ],

    'cleanup' => [
        'strategy' => Spatie\Backup\Tasks\Cleanup\Strategies\DefaultStrategy::class,

        'default_strategy' => [
            'keep_all_backups_for_days'                            => 7,
            'keep_daily_backups_for_days'                          => 0,
            'keep_weekly_backups_for_weeks'                        => 0,
            'keep_monthly_backups_for_months'                      => 0,
            'keep_yearly_backups_for_years'                        => 0,
            'delete_oldest_backups_when_using_more_megabytes_than' => 500,
        ],
    ],

    'monitor_backups' => [],

    'notifications' => [
        'notifiable'    => Spatie\Backup\Notifications\Notifiable::class,
        'notifications' => [],
    ],
];
