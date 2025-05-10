"use client"

import * as React from "react"
import { type Editor } from "@tiptap/react"

// --- Icons ---
import { ImagePlusIcon } from "@/components/tiptap-icons/image-plus-icon"
import { Cross2Icon } from '@radix-ui/react-icons'

// --- UI Primitives ---
import type { ButtonProps as TiptapButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button as TiptapButton } from "@/components/tiptap-ui-primitive/button"

// --- ShadCN UI Dialog ---
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

// --- Custom Image Edit Block ---
import { ImageEditBlock } from './ImageEditBlock'
import { MODAL_CONTENT_CLASSNAMES } from '@/components/tiptap-templates/simple/simple-editor';

export interface ImageUploadButtonProps extends TiptapButtonProps {
  editor: Editor | null
  text?: string
}

export const ImageUploadButton = React.forwardRef<
  HTMLButtonElement,
  ImageUploadButtonProps
>(
  (
    {
      editor,
      text,
      className = "",
      disabled,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    if (!editor || !editor.isEditable) {
      return null
    }

    const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
    };

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <TiptapButton
            ref={ref}
            type="button"
            className={className.trim()}
            data-style="ghost"
            role="button"
            tabIndex={-1}
            aria-label={text || "Add image"}
            tooltip={text || "Add image"}
            onClick={handleTriggerClick}
            disabled={disabled}
            {...buttonProps}
          >
            {children || (
              <>
                <ImagePlusIcon className="tiptap-button-icon" />
                {text && <span className="tiptap-button-text">{text}</span>}
              </>
            )}
          </TiptapButton>
        </DialogTrigger>
        <DialogContent 
            className="sm:max-w-lg p-0"
            onInteractOutside={(e) => {
                if ((e.target as HTMLElement).closest('.rdp') || (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]')) {
                    e.preventDefault();
                }
            }}
        >
          <DialogHeader className="pb-4">
            <DialogDescription className="sr-only">
              Upload an image from your computer or provide a URL. Images will be embedded as Base64.
            </DialogDescription>
          </DialogHeader>
          <ImageEditBlock editor={editor} onClose={() => setIsDialogOpen(false)} className={MODAL_CONTENT_CLASSNAMES} />
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
  }
)

ImageUploadButton.displayName = "ImageUploadButton"

export default ImageUploadButton
