'use client'

import React, { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'
import { Separator } from '../../ui/separator'
import { cn } from '@/lib/utils'

interface ImageEditBlockProps {
  editor: Editor;
  onClose: () => void;
  className?: string;
}

const ImageEditBlock: React.FC<ImageEditBlockProps> = ({ editor, className, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<string>('')
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);

  const handleClickToUpload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleEmbedLink = async () => {
    if (!editor || !link) return;
    setIsFetchingUrl(true);
    try {
      const response = await fetch(link);
      if (!response.ok) {
        console.error('Failed to fetch image from URL:', response.statusText);
        alert('Failed to fetch image from URL. Please check the link and try again.');
        setIsFetchingUrl(false);
        return;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        console.warn('Provided URL did not resolve to an image content type.');
        alert('The provided URL does not point to a valid image. Please check the link.');
        setIsFetchingUrl(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const base64DataUrl = readerEvent.target?.result;
        if (typeof base64DataUrl === 'string') {
          editor.chain().focus().setImage({ src: base64DataUrl }).run();
          onClose();
        }
        setIsFetchingUrl(false);
      };
      reader.onerror = () => {
        console.error('Failed to read image blob as Data URL.');
        alert('An error occurred while processing the image from the URL.');
        setIsFetchingUrl(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error fetching or processing image from URL:', error);
      alert('An error occurred while fetching the image. Please check the URL and your network connection.');
      setIsFetchingUrl(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      e.target.value = ""; // Reset file input
      return;
    }

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const src = readerEvent.target?.result as string
      editor.chain().focus().setImage({ src }).run()
      onClose()
    }
    reader.onerror = () => {
      console.error('Failed to read file as Data URL.');
      alert('An error occurred while reading the image file.');
    };
    reader.readAsDataURL(file)
    e.target.value = ""; // Reset file input after processing
  }

  return (
    <div className={cn(className, "mx-auto")}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium leading-6 text-foreground text-center">
            Add Image
          </h3>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            Embed an image from a URL or upload from your computer.
          </p>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div>
            <Label htmlFor="imageUrl" className="text-sm font-medium">
              Image URL
            </Label>
            <div className="flex items-center mt-1">
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.png"
                value={link}
                disabled={isFetchingUrl}
                onChange={e => setLink(e.target.value)}
                className="flex-grow"
              />
              <Button
                type="button"
                onClick={handleEmbedLink}
                disabled={isFetchingUrl || !link.trim()}
                className={"ml-2 border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-green-800/30 hover:text-green-200 hover:ring-1 hover:ring-green-500/30 focus-visible:ring-offset-1 focus-visible:ring-1 focus-visible:ring-white/30 transition-all flex items-center gap-1"}
              >
                {isFetchingUrl ? 'Fetching...' : 'Embed Link'}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleClickToUpload}
          disabled={isFetchingUrl}
        >
          Upload from computer
        </Button>
        <input type="file" accept="image/*" ref={fileInputRef} multiple={false} className="hidden" onChange={handleFileChange} />

        <Separator className="my-4" />
        <div className="flex justify-end space-x-2 pt-2">
            <Button type="button"
                className="border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 hover:ring-1 hover:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-1 focus-visible:ring-white/30 transition-all"
                onClick={onClose}>
              Cancel
            </Button>
        </div>
      </div>
    </div>
  )
}

export { ImageEditBlock } 