import {Content} from "@tiptap/react"
import {MinimalTiptapEditor} from '../../../../../minimal-tiptap'
import React from 'react';

interface TipTapTextAreaProps {
    value: Content,
    onChange: (value: Content) => void,
    assignees?: any[],
    className?: string,
    placeholder?: string
}

export const TipTapTextArea = ({value, onChange, assignees, className, placeholder}: TipTapTextAreaProps) => {
    return (
        <div className="w-full overflow-hidden">
            <MinimalTiptapEditor
                value={value}
                onChange={onChange}
                throttleDelay={200}
                className={className}
                editorContentClassName="p-4 prose prose-sm prose-invert max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-200 prose-strong:text-zinc-100 prose-code:bg-zinc-700 prose-code:text-pink-400 prose-li:text-zinc-200 marker:text-zinc-400 overflow-hidden"
                output="html"
                placeholder={placeholder}
                autofocus={false}
                immediatelyRender={true}
                editable={true}
                injectCSS={true}
                editorClassName="focus:outline-none min-h-[200px] caret-white overflow-hidden break-all"
                assignees={assignees}
            />
        </div>
    )
}
