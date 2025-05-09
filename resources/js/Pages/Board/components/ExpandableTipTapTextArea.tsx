import React from 'react';
import { TipTapTextArea } from '@/Pages/Board/components/TipTapTextArea';
import DOMPurify from 'dompurify';
import { Content } from "@tiptap/react";

interface ExpandableTipTapTextAreaProps {
    value: Content;
    onChange: (value: Content) => void;
    className?: string;
    isPreview: boolean;
    assignees?: any[];
}

export function ExpandableTipTapTextArea({ value, onChange, className, isPreview, assignees }: ExpandableTipTapTextAreaProps) {
    const sanitizedContent = typeof value === 'string' ? DOMPurify.sanitize(value) : '';

    // Add custom CSS to handle preview mode code blocks
    React.useEffect(() => {
        const styleId = 'tiptap-preview-code-styles';
        
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                /* Override any container styles for code blocks */
                .ProseMirror pre, 
                .tiptap-preview-content pre {
                    background-color: #18181b !important; /* zinc-900 */
                    border-radius: 0.375rem !important;
                    border: 1px solid #3f3f46 !important;
                    padding: 1rem !important;
                    max-width: 100% !important;
                    overflow-x: auto !important;
                    white-space: pre-wrap !important;
                    word-break: break-all !important;
                    box-shadow: none !important;
                }
                
                /* Outer container for code blocks */
                div[data-code-block-wrapper], 
                .tiptap-preview-content pre {
                    background-color: #18181b !important; /* zinc-900 */
                    border-radius: 0.375rem !important;
                    border: 1px solid #3f3f46 !important;
                    box-shadow: none !important;
                }
                
                /* Fix inline code */
                .ProseMirror code.inline,
                .tiptap-preview-content code.inline {
                    background-color: #18181b !important; /* zinc-900 */
                    border-radius: 0.25rem !important;
                    padding: 0.1rem 0.3rem !important;
                    border: 1px solid #3f3f46 !important;
                    color: #d4d4d8 !important; /* zinc-300 */
                    font-size: 0.875rem !important;
                    white-space: pre-wrap !important;
                    word-break: break-all !important;
                }
                
                /* Set all code text to a neutral color by default */
                .ProseMirror pre code,
                .tiptap-preview-content pre code {
                    color: #d4d4d8 !important; /* zinc-300 */
                    background-color: transparent !important;
                    white-space: pre-wrap !important;
                    word-break: break-all !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                }
                
                /* Simplified syntax highlighting with muted colors */
                .ProseMirror pre .hljs-keyword,
                .ProseMirror pre .hljs-built_in,
                .ProseMirror pre .hljs-selector-tag,
                .tiptap-preview-content pre .hljs-keyword,
                .tiptap-preview-content pre .hljs-built_in,
                .tiptap-preview-content pre .hljs-selector-tag {
                    color: #93c5fd !important; /* blue-300 */
                }
                
                .ProseMirror pre .hljs-string,
                .ProseMirror pre .hljs-regexp,
                .ProseMirror pre .hljs-title,
                .tiptap-preview-content pre .hljs-string,
                .tiptap-preview-content pre .hljs-regexp,
                .tiptap-preview-content pre .hljs-title {
                    color: #fb923c !important; /* orange-400 */
                }
                
                .ProseMirror pre .hljs-comment,
                .ProseMirror pre .hljs-quote,
                .ProseMirror pre .hljs-meta,
                .tiptap-preview-content pre .hljs-comment,
                .tiptap-preview-content pre .hljs-quote,
                .tiptap-preview-content pre .hljs-meta {
                    color: #71717a !important; /* zinc-500 */
                }
                
                /* Styles for mentions in editor */
                .ProseMirror .mention-span,
                .tiptap-preview-content .mention-span {
                    color: #f4f4f5 !important; /* zinc-100 (light text) */
                    background-color: #3f3f46 !important; /* zinc-700 (darker grey background) */
                    /* border: 1px solid rgba(255, 255, 255, 0.25) !important; */ /* REMOVED white border */
                    border-radius: 4px !important;
                    padding: 2px 6px !important;
                    margin: 0 1px !important;
                    font-size: 0.9em !important;
                    font-weight: 700 !important; /* bold */
                    display: inline-block !important;
                    white-space: nowrap !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        return () => {
            // Clean up is optional as the style might be used across multiple instances
        };
    }, []);

    // DEV: Log to check for mention spans after a delay
    React.useEffect(() => {
        if (!isPreview) { // Only run this check when the editor is active
            const timer = setTimeout(() => {
                const editorView = document.querySelector('.ProseMirror');
                if (editorView) {
                    const mentionSpans = editorView.querySelectorAll('span.mention-span');
                    console.log('[ExpandableTextArea] Found mention spans in .ProseMirror after delay:', mentionSpans);
                    mentionSpans.forEach(span => console.log('[ExpandableTextArea] Mention span HTML:', span.outerHTML));
                }
            }, 2000); // 2 second delay, adjust if needed
            return () => clearTimeout(timer);
        }
    }, [value, isPreview]); // Rerun if value changes or preview mode toggles

    return (
        <div className={`${className} min-h-[200px] overflow-hidden`}>
            {isPreview ? (
                <div
                    className="tiptap-preview-content bg-zinc-800 text-white border border-zinc-700 rounded-md p-4 min-h-[200px] prose prose-invert max-w-none overflow-y-auto overflow-x-hidden"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    style={{
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        letterSpacing: 'normal',
                        overflowWrap: 'break-word',
                    }}
                />
            ) : (
                <div className="w-full overflow-hidden">
                    <TipTapTextArea
                        value={value}
                        onChange={onChange}
                        assignees={assignees}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 shadow-sm min-h-72"
                    />
                </div>
            )}
        </div>
    );
}
