import {Content} from "@tiptap/react"
import {MinimalTiptapEditor} from '../../../../../minimal-tiptap'
import React from 'react';

interface TipTapTextAreaProps {
    value: Content,
    onChange: (value: Content) => void,
    assignees?: []
}

export const TipTapTextArea = ({value, onChange, assignees}: TipTapTextAreaProps) => {
    return (
        <MinimalTiptapEditor
            value={value}
            onChange={onChange}
            throttleDelay={200}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500" 
            editorContentClassName="p-4 prose prose-sm prose-invert max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-200 prose-strong:text-zinc-100 prose-code:bg-zinc-700 prose-code:text-pink-400 prose-li:text-zinc-200 marker:text-zinc-400"
            output="html"
            placeholder="Type your description here..."
            autofocus={false}
            immediatelyRender={true}
            editable={true}
            injectCSS={true}
            editorClassName="focus:outline-none min-h-[200px] caret-white"
            assignees={assignees}
        />
    )
}
