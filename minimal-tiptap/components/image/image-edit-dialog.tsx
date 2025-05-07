import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { ImageIcon, Cross2Icon } from '@radix-ui/react-icons'
import { ToolbarButton } from '../toolbar-button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { ImageEditBlock } from './image-edit-block'
import type { VariantProps } from 'class-variance-authority'
import type { toggleVariants } from '@/components/ui/toggle'

interface ImageEditDialogProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
}

const ImageEditDialog = ({ editor, size, variant }: ImageEditDialogProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ToolbarButton
          isActive={editor.isActive('image')}
          tooltip="Image"
          aria-label="Image"
          size={size}
          variant={variant}
        >
          <ImageIcon className="h-6 w-6" />
        </ToolbarButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 bg-gradient-to-br from-zinc-850 to-zinc-900 border-zinc-700 shadow-xl rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-zinc-100 text-lg font-semibold">Select or Upload Image</DialogTitle>
          <DialogDescription className="sr-only">Upload an image from your computer or provide a URL</DialogDescription>
        </DialogHeader>
        <ImageEditBlock editor={editor} close={() => setOpen(false)} />
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <Cross2Icon className="h-5 w-5 text-zinc-50 outline-zinc-50 border-zinc-50" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

export { ImageEditDialog }
