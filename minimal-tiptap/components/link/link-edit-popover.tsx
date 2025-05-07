import type { Editor } from '@tiptap/react'
import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Link2Icon } from '@radix-ui/react-icons'
import { ToolbarButton } from '../toolbar-button'
import { LinkEditBlock } from './link-edit-block'
import type { VariantProps } from 'class-variance-authority'
import type { toggleVariants } from '@/components/ui/toggle'

interface LinkEditPopoverProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
}

const LinkEditPopover = ({ editor, size, variant }: LinkEditPopoverProps) => {
  const [open, setOpen] = React.useState(false)
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  const { from, to } = editor.state.selection
  const text = editor.state.doc.textBetween(from, to, ' ')

  React.useEffect(() => {
    if (open) {
      // Prevent editor from handling blur events while popover is open
      editor.setOptions({ 
        editorProps: {
          handleDOMEvents: {
            blur: (view, event) => {
              // Check if the blur target is inside the popover 
              // (This check might need refinement based on exact DOM structure/event target)
              const popoverContent = (event.relatedTarget as HTMLElement)?.closest('[data-radix-popper-content-wrapper]');
              if (popoverContent) {
                return true; // Prevent editor blur if focus moves within popover
              }
              return false; // Allow editor blur otherwise
            }
          }
        }
      });
      // Focus the input
      const timer = setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100); 
      return () => {
        clearTimeout(timer);
        // Restore default blur handling when popover closes
        editor.setOptions({ 
          editorProps: {
            handleDOMEvents: {
              blur: undefined 
            }
          }
        });
      };
    } else {
      // Ensure blur handler is removed if popover is closed externally
      editor.setOptions({ 
        editorProps: {
          handleDOMEvents: {
            blur: undefined 
          }
        }
      });
    }
  }, [open, editor]);

  const onSetLink = React.useCallback(
    (url: string, text?: string, openInNewTab?: boolean) => {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .insertContent({
          type: 'text',
          text: text || url,
          marks: [
            {
              type: 'link',
              attrs: {
                href: url,
                target: openInNewTab ? '_blank' : ''
              }
            }
          ]
        })
        .setLink({ href: url })
        .run()

      editor.commands.enter()
    },
    [editor]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          isActive={editor.isActive('link')}
          tooltip="Link"
          aria-label="Insert link"
          disabled={editor.isActive('codeBlock')}
          size={size}
          variant={variant}
        >
          <Link2Icon className="h-6 w-6" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full min-w-[320px] p-4 bg-gradient-to-br from-zinc-850 to-zinc-900 border border-zinc-700 text-zinc-200 shadow-xl rounded-lg"
        align="start" 
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <LinkEditBlock 
          onSave={onSetLink} 
          defaultText={text} 
          inputRef={urlInputRef}
        />
      </PopoverContent>
    </Popover>
  )
}

export { LinkEditPopover }
