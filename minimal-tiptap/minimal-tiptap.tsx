import * as React from 'react'
import './styles/index.css'
import './hooks/use-mentions'

import { EditorContent } from '@tiptap/react'
import type { Content, Editor } from '@tiptap/react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { SectionOne } from './components/section/one'
import { SectionTwo } from './components/section/two'
import { SectionThree } from './components/section/three'
import { SectionFour } from './components/section/four'
import { SectionFive } from './components/section/five'
import { LinkBubbleMenu } from './components/bubble-menu/link-bubble-menu'
import { ImageBubbleMenu } from './components/bubble-menu/image-bubble-menu'
import type { UseMinimalTiptapEditorProps } from './hooks/use-minimal-tiptap'
import { useMinimalTiptapEditor } from './hooks/use-minimal-tiptap'
import { useMentions } from "./hooks/use-mentions";

export interface MinimalTiptapProps extends Omit<UseMinimalTiptapEditorProps, 'onUpdate'> {
  value?: Content
  onChange?: (value: Content) => void
  className?: string
  editorContentClassName?: string
  id?: string
  assignees?: any[]
}

const Toolbar = ({ editor }: { editor: Editor }) => (
  <div className="shrink-0 overflow-x-auto border-b border-border p-2">
    <div className="flex w-max items-center gap-6">
      <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />

      <Separator orientation="vertical" className="mx-3 h-7" />

      <SectionTwo
        editor={editor}
        activeActions={['bold', 'italic', 'strikethrough', 'code', 'clearFormatting']}
        mainActionCount={2}
      />

      <Separator orientation="vertical" className="mx-3 h-7" />

      <SectionThree editor={editor} />

      <Separator orientation="vertical" className="mx-3 h-7" />

      <SectionFour editor={editor} activeActions={['orderedList', 'bulletList']} mainActionCount={0} />

      <Separator orientation="vertical" className="mx-3 h-7" />

      <SectionFive editor={editor} activeActions={['codeBlock', 'blockquote', 'horizontalRule']} mainActionCount={0} />
    </div>
  </div>
)

export const MinimalTiptapEditor = React.forwardRef<HTMLDivElement, MinimalTiptapProps>(
  ({ value, onChange, className, editorContentClassName,id, assignees, ...props }, ref) => {

      const { initEventListeners } = useMentions(); // Import the function

    const editor = useMinimalTiptapEditor({
      value,
      onUpdate: onChange,
      ...props
    })

      React.useEffect(() => {
          if (editor) {
              initEventListeners(assignees);
          }
      }, [editor, initEventListeners]);

    if (!editor) {
      return null
    }

    return (
      <div
          id="TipTapTextArea"
          ref={ref}
        className={cn(
          'flex h-auto min-h-72 w-full flex-col rounded-md border border-input shadow-sm focus-within:border-primary',
          className
        )}
      >
        <Toolbar editor={editor} />
        <EditorContent editor={editor} className={cn('minimal-tiptap-editor', editorContentClassName)} />
        <LinkBubbleMenu editor={editor} />
        <ImageBubbleMenu editor={editor} />
      </div>
    )
  }
)

MinimalTiptapEditor.displayName = 'MinimalTiptapEditor'

export default MinimalTiptapEditor
