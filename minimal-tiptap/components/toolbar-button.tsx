import * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import type { TooltipContentProps } from '@radix-ui/react-tooltip'

interface ToolbarButtonProps extends Omit<React.ComponentPropsWithoutRef<typeof Toggle>, 'pressed'> {
  isActive?: boolean
  tooltip?: string
  tooltipOptions?: TooltipContentProps
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ isActive, children, tooltip, className, tooltipOptions, ...props }, ref) => {

    const toggleButton = (
      <Toggle
        size="sm"
        ref={ref}
        pressed={isActive}
        className={cn(
          'group',
          'size-8 p-0',
          'rounded-md',
          'bg-transparent',
          'text-zinc-400',
          'hover:bg-transparent',
          'hover:text-zinc-50',
          'aria-pressed:bg-transparent',
          'aria-pressed:text-zinc-50',
          'aria-pressed:border',
          'aria-pressed:border-zinc-50',
          className
        )}
        {...props}
      >
        {children}
      </Toggle>
    )

    if (!tooltip) {
      return toggleButton
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
        <TooltipContent {...tooltipOptions}>
          <div className="flex flex-col items-center text-center">{tooltip}</div>
        </TooltipContent>
      </Tooltip>
    )
  }
)

ToolbarButton.displayName = 'ToolbarButton'

export default ToolbarButton
