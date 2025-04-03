<?php

namespace app\Services;

class HTMLContentService
{

    /**
     * @param string $text
     * @return string
     */
    public function stripHTMLTags(string $text): string
    {
        return strip_tags($text);
    }
    
}