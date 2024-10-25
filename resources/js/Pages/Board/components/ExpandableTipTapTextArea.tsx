import React from 'react';
import { TipTapTextArea } from '@/Pages/Board/components/TipTapTextArea';
import DOMPurify from 'dompurify';
import { Content } from "@tiptap/react";

interface ExpandableTipTapTextAreaProps {
    value: Content;
    onChange: (value: Content) => void;
    className?: string;
    isPreview: boolean;
}

export function ExpandableTipTapTextArea({ value, onChange, className, isPreview }: ExpandableTipTapTextAreaProps) {
    const sanitizedContent = typeof value === 'string' ? DOMPurify.sanitize(value) : '';

    return (
        <div className={`${className} min-h-[200px]`}>
            {isPreview ? (
                <div
                    className="bg-zinc-700 text-white border border-zinc-600 rounded-md p-4 min-h-[200px] prose prose-invert max-w-none overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        letterSpacing: 'normal',
                    }}
                />
            ) : (
                <TipTapTextArea
                    value={value}
                    onChange={onChange}
                />
            )}
        </div>
    );
}