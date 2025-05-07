import type { Editor } from '@tiptap/react'
import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ImageEditBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  editor: Editor
  close: () => void
}

const ImageEditBlock = ({ editor, className, close, ...props }: ImageEditBlockProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<string>('')

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleLink = () => {
    editor.chain().focus().setImage({ src: link }).run()
    close()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const reader = new FileReader()
    reader.onload = e => {
      const src = e.target?.result as string
      editor.chain().setImage({ src }).focus().run()
    }

    reader.readAsDataURL(files[0])

    close()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLink()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={cn('space-y-6 p-6 pt-0', className)} {...props}>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 font-medium">Attach an image link</Label>
          <div className="flex items-center rounded-md border border-zinc-600 bg-zinc-800 overflow-hidden">
            <Input
              type="url"
              required
              placeholder="https://example.com/image.png"
              value={link}
              className="grow bg-transparent border-0 text-zinc-200 placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={e => setLink(e.target.value)}
            />
            <Button 
              type="button"
              onClick={handleSubmit}
              className="h-9 px-3 text-sm font-medium bg-transparent text-zinc-200 border-0 border-l border-zinc-700 rounded-none hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-0 transition-colors"
            >
              Submit
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-850 px-2 text-zinc-100">
              Or
            </span>
          </div>
        </div>

        <Button 
          className="w-full px-3 py-1.5 text-sm font-medium bg-transparent text-zinc-200 border border-white/20 rounded-md hover:bg-white/10 hover:text-zinc-100 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 transition-colors"
          onClick={handleClick}
        >
          Upload from your computer
        </Button>
        <input type="file" accept="image/*" ref={fileInputRef} multiple className="hidden" onChange={handleFile} />
      </div>
    </form>
  )
}

export { ImageEditBlock }
