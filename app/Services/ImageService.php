<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

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
     * Extracts image src paths from HTML description.
     *
     * @param  string $desc
     * @return array
     */
    public function extractImagePaths(string $desc): array
    {
        preg_match_all('/<img[^>]+src="([^"]+)"/i', $desc, $matches);
        return $matches[1] ?? [];
    }

    /**
     * Converts embedded base64 images in HTML to stored public files.
     *
     * @param  string  $desc
     * @return string
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
                $dir       = public_path('posts/images');
                if (!File::exists($dir)) {
                    File::makeDirectory($dir, 0755, true);
                }

                $filename = Str::uuid() . '.' . $extension;
                $path     = $dir . '/' . $filename;

                $success = file_put_contents($path, $imageData);

                if (!$success) {
                    Log::error("Failed to write image file: {$path}");
                    return '';
                }

                $publicPath = "/posts/images/{$filename}";
                return '<img src="' . e($publicPath) . '">';
            },
            $desc
        );
    }

    /**
     * Converts and cleans up images in a post's HTML description.
     *
     * @param  string      $desc
     * @param  string|null $oldDesc
     * @return string
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
     * @param string $oldDesc
     * @param string $newDesc
     * @return void
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
     * @param  string $desc
     * @return void
     */
    public function deleteAllImagesInDesc(string $desc): void
    {
        foreach ($this->extractImagePaths($desc) as $path) {
            $this->deleteStorageImage($path);
        }
    }

    /**
     * Deletes an image from disk, scoped only to public/posts/images directory.
     *
     * @param  string $path
     * @return void
     */
    protected function deleteStorageImage(string $path): void
    {
        $parsedPath = parse_url($path, PHP_URL_PATH);

        if (!str_starts_with($parsedPath, '/posts/images/')) {
            return;
        }

        $localPath = public_path($parsedPath);

        if (file_exists($localPath)) {
            unlink($localPath);
        }
    }
}