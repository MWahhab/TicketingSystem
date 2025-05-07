import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface LinkEditorProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultUrl?: string
  defaultText?: string
  defaultIsNewTab?: boolean
  onSave: (url: string, text?: string, isNewTab?: boolean) => void
  inputRef?: React.RefObject<HTMLInputElement>
}

export const LinkEditBlock = React.forwardRef<HTMLDivElement, LinkEditorProps>(
  ({ onSave, defaultIsNewTab, defaultUrl, defaultText, className, inputRef }, ref) => {
    const formRef = React.useRef<HTMLDivElement>(null)
    const [url, setUrl] = React.useState(defaultUrl || '')
    const [text, setText] = React.useState(defaultText || '')
    const [isNewTab, setIsNewTab] = React.useState(defaultIsNewTab || false)

    const handleSave = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault()
        if (formRef.current) {
          const isValid = Array.from(formRef.current.querySelectorAll('input')).every(input => input.checkValidity())

          if (isValid) {
            onSave(url, text, isNewTab)
          } else {
            formRef.current.querySelectorAll('input').forEach(input => {
              if (!input.checkValidity()) {
                input.reportValidity()
              }
            })
          }
        }
      },
      [onSave, url, text, isNewTab]
    )

    React.useImperativeHandle(ref, () => formRef.current as HTMLDivElement)

    return (
      <div 
        ref={formRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={cn('space-y-4', className)}>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 font-medium">URL</Label>
            <Input 
              ref={inputRef}
              type="url" 
              required 
              placeholder="https://example.com"
              value={url} 
              onChange={e => setUrl(e.target.value)}
              className="bg-zinc-800 border-zinc-600 text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 font-medium">Display Text (optional)</Label>
            <Input 
              type="text" 
              placeholder="Enter display text" 
              value={text} 
              onChange={e => setText(e.target.value)}
              className="bg-zinc-800 border-zinc-600 text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="link-new-tab" className="text-zinc-300 font-medium">Open in New Tab</Label>
            <Switch 
              id="link-new-tab"
              checked={isNewTab} 
              onCheckedChange={setIsNewTab}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-zinc-700"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 transition-colors"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

LinkEditBlock.displayName = 'LinkEditBlock'
