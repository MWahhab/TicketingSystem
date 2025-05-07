import React from 'react';
import { TipTapTextArea } from '@/Pages/Board/components/TipTapTextArea';
import DOMPurify from 'dompurify';
import { Content } from "@tiptap/react";

interface ExpandableTipTapTextAreaProps {
    value: Content;
    onChange: (value: Content) => void;
    className?: string;
    isPreview: boolean;
    assignees?: [];
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
                
                .minimal-tiptap-editor .ProseMirror span[style*="color:"] {
                    color: inherit !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        return () => {
            // Clean up is optional as the style might be used across multiple instances
        };
    }, []);

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
                    />
                </div>
            )}
        </div>
    );
}
