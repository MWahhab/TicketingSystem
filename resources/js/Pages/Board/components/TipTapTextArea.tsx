import {Content} from "@tiptap/react"
import {MinimalTiptapEditor} from '../../../../../minimal-tiptap'

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
            className="w-full bg-stone-50 text-stone-800"
            editorContentClassName="p-5"
            output="html"
            placeholder="Type your description here..."
            autofocus={true}
            immediatelyRender={true}
            editable={true}
            injectCSS={true}
            editorClassName="focus:outline-none min-h-[200px]"
            assignees={assignees}
        />
    )
}
