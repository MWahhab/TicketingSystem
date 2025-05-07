import * as React from 'react'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { CaretDownIcon } from '@radix-ui/react-icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ToolbarButton } from './toolbar-button'
import { ShortcutKey } from './shortcut-key'
import { getShortcutKey } from '../utils'
import type { FormatAction } from '../types'
import type { VariantProps } from 'class-variance-authority'
import type { toggleVariants } from '@/components/ui/toggle'

interface ToolbarSectionProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
  actions: FormatAction[]
  activeActions?: string[]
  mainActionCount?: number
  dropdownIcon?: React.ReactNode
  dropdownTooltip?: string
  dropdownClassName?: string
}

export const ToolbarSection: React.FC<ToolbarSectionProps> = ({
  editor,
  actions,
  activeActions = actions.map(action => action.value),
  mainActionCount = 0,
  dropdownIcon,
  dropdownClassName = 'w-12',
  size,
  variant
}) => {
  const { mainActions, dropdownActions } = React.useMemo(() => {
    const sortedActions = actions
      .filter(action => activeActions.includes(action.value))
      .sort((a, b) => activeActions.indexOf(a.value) - activeActions.indexOf(b.value))

    return {
      mainActions: sortedActions.slice(0, mainActionCount),
      dropdownActions: sortedActions.slice(mainActionCount)
    }
  }, [actions, activeActions, mainActionCount])

  const renderToolbarButton = React.useCallback(
    (action: FormatAction) => {
      const active = action.isActive(editor);
      return (
        <ToolbarButton
          key={action.label}
          onClick={() => action.action(editor)}
          disabled={!action.canExecute(editor)}
          isActive={active}
          tooltip={`${action.label} ${action.shortcuts.map(s => getShortcutKey(s).symbol).join(' ')}`}
          aria-label={action.label}
          size={size}
          variant={variant}
        >
          {action.icon}
        </ToolbarButton>
      )
    },
    [editor, size, variant]
  )

  const renderDropdownMenuItem = React.useCallback(
    (action: FormatAction) => (
      <DropdownMenuItem
        key={action.label}
        onClick={() => action.action(editor)}
        disabled={!action.canExecute(editor)}
        className={cn(
          'flex flex-row items-center justify-between gap-4 w-full rounded-md',
          {
            'bg-white/10 text-white focus:bg-white/15 focus:text-white': action.isActive(editor),
            'hover:bg-white/5 hover:text-zinc-100 focus:bg-white/5 focus:text-zinc-100': !action.isActive(editor),
          }
        )}
        aria-label={action.label}
      >
        <span className="grow">{action.label}</span>
        <ShortcutKey keys={action.shortcuts} />
      </DropdownMenuItem>
    ),
    [editor]
  )

  const isDropdownActive = React.useMemo(
    () => dropdownActions.some(action => action.isActive(editor)),
    [dropdownActions, editor]
  )

  // Determine if the dropdown trigger itself should appear active.
  // It should be active if its own dropdown items make it active, OR
  // if there is exactly one main action and that main action is active (for a unified button look).
  const triggerIsActive = React.useMemo(() => {
    const singleMainActionIsActive = 
      mainActionCount === 1 && 
      mainActions.length === 1 && 
      mainActions[0].isActive(editor);
    return singleMainActionIsActive || isDropdownActive;
  }, [mainActionCount, mainActions, isDropdownActive, editor]);

  return (
    <>
      {mainActions.map(renderToolbarButton)}
      {dropdownActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolbarButton
              isActive={triggerIsActive}
              className={cn(dropdownClassName)}
              size={size}
              variant={variant}
            >
              {dropdownIcon}
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[240px] p-3 bg-gradient-to-br from-zinc-850 to-zinc-900 border border-zinc-700 text-zinc-200 shadow-xl rounded-lg"
          >
            {dropdownActions.map(renderDropdownMenuItem)}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}

export default ToolbarSection
