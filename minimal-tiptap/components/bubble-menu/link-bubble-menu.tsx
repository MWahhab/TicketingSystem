import React, { useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react'
import { LinkEditBlock } from '../link/link-edit-block'
import { LinkPopoverBlock } from '../link/link-popover-block'
import { ShouldShowProps } from '../../types'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Cross2Icon } from '@radix-ui/react-icons'

interface LinkBubbleMenuProps {
  editor: Editor
}

interface LinkAttributes {
  href: string
  target: string
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [linkAttrs, setLinkAttrs] = useState<LinkAttributes>({ href: '', target: '' })
  const [selectedText, setSelectedText] = useState('')

  const updateLinkStateAndPrepareEdit = useCallback(() => {
    const { from, to } = editor.state.selection
    const linkAttributes = editor.getAttributes('link')
    const text = editor.state.doc.textBetween(from, to, ' ')

    setLinkAttrs({ href: linkAttributes.href, target: linkAttributes.target })
    setSelectedText(text)
  }, [editor])

  const shouldShowBubbleMenu = useCallback(
    ({ editor: currentEditor, from, to }: ShouldShowProps) => {
      if (from === to) {
        return false
      }
      const { href } = currentEditor.getAttributes('link')

      if (href) {
        updateLinkStateAndPrepareEdit()
        return true
      }
      return false
    },
    [updateLinkStateAndPrepareEdit]
  )

  const handleEditClick = useCallback(() => {
    updateLinkStateAndPrepareEdit()
    setShowEditDialog(true)
  }, [updateLinkStateAndPrepareEdit, setShowEditDialog])

  const onSetLinkAndCloseDialog = useCallback(
    (url: string, textToSet?: string, openInNewTab?: boolean) => {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .insertContent({
          type: 'text',
          text: textToSet || url,
          marks: [
            {
              type: 'link',
              attrs: {
                href: url,
                target: openInNewTab ? '_blank' : '',
              },
            },
          ],
        })
        .setLink({ href: url, target: openInNewTab ? '_blank' : '' })
        .run()
      setShowEditDialog(false)
    },
    [editor, setShowEditDialog]
  )

  const handleUnsetFromPopover = useCallback(() => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [editor])

  return (
    <>
      <BubbleMenu
        editor={editor}
        shouldShow={shouldShowBubbleMenu}
        tippyOptions={{
          placement: 'bottom-start',
          onHidden: () => {
          },
        }}
      >
        <LinkPopoverBlock
          onClear={handleUnsetFromPopover}
          url={linkAttrs.href}
          onEdit={handleEditClick}
        />
      </BubbleMenu>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-full min-w-[320px] sm:max-w-md p-0 bg-gradient-to-br from-zinc-850 to-zinc-900 border-zinc-700 shadow-xl rounded-lg text-zinc-200">
          <DialogHeader className="p-5 pb-3 border-b border-zinc-700">
            <DialogTitle className="text-zinc-100 text-lg font-semibold">Edit Link</DialogTitle>
          </DialogHeader>
          <div className="p-5">
            <LinkEditBlock
              defaultUrl={linkAttrs.href}
              defaultText={selectedText}
              defaultIsNewTab={linkAttrs.target === '_blank'}
              onSave={onSetLinkAndCloseDialog}
            />
          </div>
          <DialogClose className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:ring-offset-0 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <Cross2Icon className="h-5 w-5 text-zinc-400 hover:text-zinc-100" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
