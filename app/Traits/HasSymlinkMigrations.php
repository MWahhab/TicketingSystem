<?php

namespace app\Traits;

trait HasSymlinkMigrations
{
    public function symlinkMigrations(): void
    {
        $mainPath = base_path('database/migrations');
        $addonPath = base_path('PremiumAddons/migrations');

        if (!is_dir($addonPath)) {
            return;
        }

        foreach (glob("$addonPath/*.php") as $file) {
            $linkName = $mainPath . '/' . basename($file);
            if (!file_exists($linkName)) {
                symlink($file, $linkName);
            }
        }
    }
}
