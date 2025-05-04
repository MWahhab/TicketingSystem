<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ImageService
{
    /**
     * Allowed MIME types for image uploads.
     *
     * SVG is excluded due to common XSS vulnerabilities.
     *
     * @var array<string, string>
     */
    protected array $allowedMimeTypes = [
        'image/png'  => 'png',
        'image/jpeg' => 'jpg',
        'image/jpg'  => 'jpg',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];

    /**
     * Base directory for storing images relative to the public folder.
     *
     */
    protected string $publicImagePath = 'images';

    /**
     * Extracts image src paths from HTML description.
     *
     */
    public function extractImagePaths(string $desc): array
    {
        preg_match_all('/<img[^>]+src="([^"]+)"/i', $desc, $matches);
        return $matches[1] ?? [];
    }

    /**
     * Converts embedded base64 images in HTML to stored public files.
     *
     */
    public function convertEmbeddedImages(string $desc): string
    {
        return preg_replace_callback(
            '/<img[^>]+src="data:image\/(.*?);base64,([^"]+)"[^>]*>/i',
            function ($matches) {
                $base64    = str_replace(' ', '+', $matches[2]);
                $imageData = base64_decode($base64, true);

                if ($imageData === false) {
                    Log::warning('Base64 decoding failed for image.');
                    return '';
                }

                $finfo    = finfo_open();
                $mimeType = finfo_buffer($finfo, $imageData, FILEINFO_MIME_TYPE);
                finfo_close($finfo);

                if (!array_key_exists($mimeType, $this->allowedMimeTypes)) {
                    Log::warning("Rejected image with MIME type: {$mimeType}");
                    return '';
                }

                $extension = $this->allowedMimeTypes[$mimeType];
                $dir       = public_path($this->publicImagePath);
                if (!File::exists($dir)) {
                    File::makeDirectory($dir, 0o755, true);
                }

                $filename = Str::uuid() . '.' . $extension;
                $path     = $dir . '/' . $filename;

                $success = file_put_contents($path, $imageData);

                if (!$success) {
                    Log::error("Failed to write image file: {$path}");
                    return '';
                }

                $publicPath = '/' . trim($this->publicImagePath, '/') . '/' . $filename;
                return '<a href="' . e($publicPath) . '" target="_blank" rel="noopener noreferrer" data-inertia-external><img src="' . e($publicPath) . '" style="max-width: 100%; height: auto; display: block; margin: 0.5em 0;"></a>';
            },
            $desc
        );
    }

    /**
     * Converts and cleans up images in a post's HTML description.
     *
     */
    public function handlePostImages(string $desc, ?string $oldDesc = null): string
    {
        $convertedDesc = $this->convertEmbeddedImages($desc);

        if ($oldDesc !== null) {
            $this->deleteRemovedImages($oldDesc, $convertedDesc);
        }

        return $convertedDesc;
    }

    /**
     * Deletes images that were removed between old and new descriptions.
     *
     */
    public function deleteRemovedImages(string $oldDesc, string $newDesc): void
    {
        $oldImages = $this->extractImagePaths($oldDesc);
        $newImages = $this->extractImagePaths($newDesc);

        $removed = array_diff($oldImages, $newImages);

        foreach ($removed as $path) {
            $this->deleteStorageImage($path);
        }
    }

    /**
     * Deletes all images found in the provided HTML description.
     *
     */
    public function deleteAllImagesInDesc(string $desc): void
    {
        foreach ($this->extractImagePaths($desc) as $path) {
            $this->deleteStorageImage($path);
        }
    }

    /**
     * Deletes an image from disk, scoped only to public/images directory.
     *
     */
    protected function deleteStorageImage(string $path): void
    {
        $parsedPath = parse_url($path, PHP_URL_PATH);
        $baseUrl    = '/' . trim($this->publicImagePath, '/') . '/';

        if (!str_starts_with($parsedPath, $baseUrl)) {
            return;
        }

        $localPath = public_path($parsedPath);

        if (file_exists($localPath)) {
            unlink($localPath);
        }
    }
}
