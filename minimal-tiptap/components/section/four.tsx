import * as React from 'react'
import type { Editor } from '@tiptap/react'
import {
  CaretDownIcon,
  DotsHorizontalIcon,
  HeadingIcon,
  ListBulletIcon
} from '@radix-ui/react-icons'
import type { FormatAction } from '../../types'
import { ToolbarSection } from '../toolbar-section'
import type { toggleVariants } from '@/components/ui/toggle'
import type { VariantProps } from 'class-variance-authority'

type ListAction = 'bulletList' | 'orderedList'

interface ListStyle extends FormatAction {
  value: ListAction
}

const formatActions: ListStyle[] = [
  {
    value: 'bulletList',
    label: 'Bullet list',
    icon: <ListBulletIcon className="h-6 w-6" />,
    isActive: editor => editor.isActive('bulletList'),
    action: editor => editor.chain().focus().toggleBulletList().run(),
    canExecute: editor => editor.can().chain().focus().toggleBulletList().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'shift', '8']
  },
  {
    value: 'orderedList',
    label: 'Ordered list',
    icon: <HeadingIcon className="h-6 w-6" />,
    isActive: editor => editor.isActive('orderedList'),
    action: editor => editor.chain().focus().toggleOrderedList().run(),
    canExecute: editor => editor.can().chain().focus().toggleOrderedList().run() && !editor.isActive('codeBlock'),
    shortcuts: ['mod', 'shift', '7']
  }
]

interface SectionFourProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
  activeActions?: ListAction[]
  mainActionCount?: number
}

export const SectionFour: React.FC<SectionFourProps> = ({
  editor,
  activeActions = formatActions.map(action => action.value),
  mainActionCount = 2,
  size,
  variant
}) => {
  return (
    <ToolbarSection
      editor={editor}
      actions={formatActions}
      activeActions={activeActions}
      mainActionCount={mainActionCount}
      dropdownIcon={
        <>
          <ListBulletIcon className="h-6 w-6" />
          <CaretDownIcon className="h-6 w-6" />
        </>
      }
      dropdownTooltip="Lists"
      size={size}
      variant={variant}
    />
  )
}

SectionFour.displayName = 'SectionFour'

export default SectionFour
