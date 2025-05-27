<?php

namespace App\Traits;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

trait ADF2HTML
{
    protected function adfToHtml(mixed $adfNode): string
    {
        if (is_string($adfNode)) {
            return nl2br(htmlspecialchars($adfNode));
        }

        if (!is_array($adfNode) || ($adfNode['type'] ?? null) !== 'doc' || !isset($adfNode['content']) || !is_array($adfNode['content'])) {
            Log::debug('adfToHtml: Input was not a valid ADF document structure or content was empty/not an array.', [
                'adf_node_type'           => gettype($adfNode),
                'adf_node_structure_type' => is_array($adfNode) ? ($adfNode['type'] ?? 'N/A') : 'N/A',
            ]);
            return '';
        }

        $html = '';
        foreach ($adfNode['content'] as $topLevelNode) {
            if (is_array($topLevelNode)) {
                $html .= $this->renderAdfNodeToHtml($topLevelNode);
            }
        }
        return $html;
    }

    protected function renderAdfNodeToHtml(array $node): string
    {
        $html = '';
        $type = $node['type'] ?? null;

        $contentToRender = $node['content'] ?? [];
        $textToRender    = isset($node['text']) && is_string($node['text']) ? htmlspecialchars($node['text']) : '';

        if ($type === 'text' && isset($node['marks']) && is_array($node['marks'])) {
            foreach (array_reverse($node['marks']) as $mark) {
                if (!is_array($mark)) {
                    continue;
                }
                $markType = $mark['type'] ?? null;
                switch ($markType) {
                    case 'strong':
                        $textToRender = "<strong>{$textToRender}</strong>";
                        break;
                    case 'em':
                        $textToRender = "<em>{$textToRender}</em>";
                        break;
                    case 'strike':
                        $textToRender = "<s>{$textToRender}</s>";
                        break;
                    case 'underline':
                        $textToRender = "<u>{$textToRender}</u>";
                        break;
                    case 'code':
                        $textToRender = "<code>{$textToRender}</code>";
                        break;
                    case 'link':
                        $href         = isset($mark['attrs']['href']) && is_string($mark['attrs']['href']) ? htmlspecialchars($mark['attrs']['href']) : '#';
                        $textToRender = "<a href=\"{$href}\">{$textToRender}</a>";
                        break;
                }
            }
        }

        switch ($type) {
            case 'paragraph':
                $html .= '<p>';
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $childNode) {
                        if (is_array($childNode)) {
                            $html .= $this->renderAdfNodeToHtml($childNode);
                        }
                    }
                }
                $html .= '</p>';
                break;
            case 'text':
                $html .= $textToRender;
                break;
            case 'heading':
                $level = $node['attrs']['level'] ?? 1;
                $level = max(1, min(6, (int)$level));
                $html .= "<h{$level}>";
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $childNode) {
                        if (is_array($childNode)) {
                            $html .= $this->renderAdfNodeToHtml($childNode);
                        }
                    }
                }
                $html .= "</h{$level}>";
                break;
            case 'bulletList':
                $html .= '<ul>';
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $listItemNode) {
                        if (is_array($listItemNode)) {
                            $html .= $this->renderAdfNodeToHtml($listItemNode);
                        }
                    }
                }
                $html .= '</ul>';
                break;
            case 'orderedList':
                $html .= '<ol>';
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $listItemNode) {
                        if (is_array($listItemNode)) {
                            $html .= $this->renderAdfNodeToHtml($listItemNode);
                        }
                    }
                }
                $html .= '</ol>';
                break;
            case 'listItem':
                $html .= '<li>';
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $childNode) {
                        if (is_array($childNode)) {
                            $html .= $this->renderAdfNodeToHtml($childNode);
                        }
                    }
                }
                $html .= '</li>';
                break;
            case 'codeBlock':
                $langAttr = isset($node['attrs']['language']) && is_string($node['attrs']['language']) ? ' class="language-' . htmlspecialchars($node['attrs']['language']) . '"' : '';
                $html .= "<pre><code{$langAttr}>";
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $childNode) {
                        if (is_array($childNode) && ($childNode['type'] ?? null) === 'text' && isset($childNode['text']) && is_string($childNode['text'])) {
                            $html .= htmlspecialchars($childNode['text']);
                        } elseif (is_array($childNode)) {
                            $html .= $this->renderAdfNodeToHtml($childNode);
                        }
                    }
                }
                $html .= '</code></pre>';
                break;
            case 'blockquote':
                $html .= '<blockquote>';
                if (is_array($contentToRender)) {
                    foreach ($contentToRender as $childNode) {
                        if (is_array($childNode)) {
                            $html .= $this->renderAdfNodeToHtml($childNode);
                        }
                    }
                }
                $html .= '</blockquote>';
                break;
            case 'rule':
                $html .= '<hr />';
                break;
            case 'hardBreak':
                $html .= '<br />';
                break;
            case 'mention':
                $mentionText = isset($node['attrs']['text']) && is_string($node['attrs']['text']) ? htmlspecialchars($node['attrs']['text']) : 'mention';
                $html .= "<strong>{$mentionText}</strong>";
                break;
            case 'emoji':
                $emojiShortName = isset($node['attrs']['shortName']) && is_string($node['attrs']['shortName']) ? htmlspecialchars($node['attrs']['shortName']) : '';
                $html .= $emojiShortName;
                break;
            default:
                if (is_array($contentToRender) && $contentToRender !== []) {
                    Log::debug("Rendering content of unhandled ADF node type (from Trait): {$type}", ['node_content_sample' => Str::limit(json_encode($contentToRender), 100)]);
                    foreach ($contentToRender as $childNode) {
                        if (is_array($childNode)) {
                            $html .= $this->renderAdfNodeToHtml($childNode);
                        }
                    }
                } elseif ($type !== null) {
                    Log::debug("Unhandled ADF node type (from Trait, no content or content not array): {$type}", ['node_structure' => $node]);
                }
                break;
        }
        return $html;
    }
}
