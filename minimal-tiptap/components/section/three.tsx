import * as React from 'react'
import type { Editor } from '@tiptap/react'
import { CaretDownIcon, CheckIcon } from '@radix-ui/react-icons'
import { ToolbarButton } from '../toolbar-button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '../../hooks/use-theme'
import type { toggleVariants } from '@/components/ui/toggle'
import type { VariantProps } from 'class-variance-authority'

interface ColorItem {
  cssVar: string
  label: string
  darkLabel?: string
  hexValue: string
}

interface ColorPalette {
  label: string
  colors: ColorItem[]
  inverse: string
}

const COLORS: ColorPalette[] = [
  {
    label: 'Palette 1',
    inverse: 'hsl(var(--background))',
    colors: [
      { cssVar: 'hsl(var(--foreground))', label: 'Default', hexValue: '#333333' },
      { cssVar: 'var(--mt-accent-bold-blue)', label: 'Bold blue', hexValue: '#05c' },
      { cssVar: 'var(--mt-accent-bold-teal)', label: 'Bold teal', hexValue: '#206a83' },
      { cssVar: 'var(--mt-accent-bold-green)', label: 'Bold green', hexValue: '#216e4e' },
      { cssVar: 'var(--mt-accent-bold-orange)', label: 'Bold orange', hexValue: '#a54800' },
      { cssVar: 'var(--mt-accent-bold-red)', label: 'Bold red', hexValue: '#ae2e24' },
      { cssVar: 'var(--mt-accent-bold-purple)', label: 'Bold purple', hexValue: '#5e4db2' },
    ],
  },
  {
    label: 'Palette 2',
    inverse: 'hsl(var(--background))',
    colors: [
      { cssVar: 'var(--mt-accent-gray)', label: 'Gray', hexValue: '#758195' },
      { cssVar: 'var(--mt-accent-blue)', label: 'Blue', hexValue: '#1d7afc' },
      { cssVar: 'var(--mt-accent-teal)', label: 'Teal', hexValue: '#2898bd' },
      { cssVar: 'var(--mt-accent-green)', label: 'Green', hexValue: '#22a06b' },
      { cssVar: 'var(--mt-accent-orange)', label: 'Orange', hexValue: '#fea362' },
      { cssVar: 'var(--mt-accent-red)', label: 'Red', hexValue: '#c9372c' },
      { cssVar: 'var(--mt-accent-purple)', label: 'Purple', hexValue: '#8270db' },
    ],
  },
  {
    label: 'Palette 3',
    inverse: 'hsl(var(--foreground))',
    colors: [
      { cssVar: 'hsl(var(--background))', label: 'White', darkLabel: 'Black', hexValue: '#ffffff' },
      { cssVar: 'var(--mt-accent-blue-subtler)', label: 'Blue subtle', hexValue: '#cce0ff' },
      { cssVar: 'var(--mt-accent-teal-subtler)', label: 'Teal subtle', hexValue: '#c6edfb' },
      { cssVar: 'var(--mt-accent-green-subtler)', label: 'Green subtle', hexValue: '#baf3db' },
      { cssVar: 'var(--mt-accent-yellow-subtler)', label: 'Yellow subtle', hexValue: '#f8e6a0' },
      { cssVar: 'var(--mt-accent-red-subtler)', label: 'Red subtle', hexValue: '#ffd5d2' },
      { cssVar: 'var(--mt-accent-purple-subtler)', label: 'Purple subtle', hexValue: '#dfd8fd' },
    ],
  },
]

const findColorByHexValue = (hexValue: string) => {
  for (const palette of COLORS) {
    for (const color of palette.colors) {
      if (color.hexValue === hexValue) {
        return color
      }
    }
  }
  return COLORS[0].colors[0]
}

const MemoizedColorButton = React.memo<{
  color: ColorItem
  isSelected: boolean
  inverse: string
  onClick: (value: string) => void
}>(({ color, isSelected, inverse, onClick }) => {
  const isDarkMode = useTheme()
  const label = isDarkMode && color.darkLabel ? color.darkLabel : color.label

  const isLightColor = label === "White" || label.includes("subtle") || color.hexValue === "#ffffff"
  const checkColor = isLightColor ? "#000000" : "#ffffff"

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    onClick(color.hexValue)
  }

  return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onClick(color.hexValue)
                  }
                }}
                className="relative"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "4px",
                  backgroundColor: color.hexValue,
                  border: "1px solid #e1e1e1",
                  cursor: "pointer !important",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "2px",
                  pointerEvents: "auto"
                }}
                aria-label={label}
            >
              {isSelected && (
                  <CheckIcon
                      style={{
                        color: checkColor,
                        width: "16px",
                        height: "16px",
                      }}
                  />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
  )
})

MemoizedColorButton.displayName = "MemoizedColorButton"

const MemoizedColorPicker = React.memo<{
  palette: ColorPalette
  selectedColor: string
  inverse: string
  onColorChange: (value: string) => void
}>(({ palette, selectedColor, inverse, onColorChange }) => (
    <div>
      <div className="text-sm font-medium mb-2">{palette.label}</div>
      <div className="flex flex-wrap gap-1">
        {palette.colors.map((color, index) => (
            <MemoizedColorButton
                key={index}
                inverse={inverse}
                color={color}
                isSelected={selectedColor === color.hexValue}
                onClick={onColorChange}
            />
        ))}
      </div>
    </div>
))

MemoizedColorPicker.displayName = "MemoizedColorPicker"

interface SectionThreeProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
}

export const SectionThree: React.FC<SectionThreeProps> = ({ editor, size, variant }) => {
  const [selectedColor, setSelectedColor] = React.useState<string>("#333333")

  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const allowCloseRef = React.useRef(true)

  const handleColorChange = React.useCallback(
      (hexColor: string) => {
        setSelectedColor(hexColor)

        editor.commands.focus()

        editor.commands.setColor(hexColor)
      },
      [editor],
  )

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPopoverOpen(!popoverOpen)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !allowCloseRef.current) {
      return
    }
    setPopoverOpen(open)
  }

  const handleDone = () => {
    allowCloseRef.current = true
    setPopoverOpen(false)
  }

  return (
      <TooltipProvider>
        <div className="relative"
             onMouseDown={(e) => {
               e.stopPropagation()
             }}
        >
          <Popover
              open={popoverOpen}
              onOpenChange={handleOpenChange}
          >
            <PopoverTrigger asChild>
              <ToolbarButton
                  tooltip="Text color"
                  aria-label="Text color"
                  className="w-8 mt-2"
                  size={size}
                  variant={variant}
                  onClick={handleTriggerClick}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    allowCloseRef.current = false
                  }}
              >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                    style={{ color: selectedColor }}
                >
                  <path d="M4 20h16" />
                  <path d="m6 16 6-12 6 12" />
                  <path d="M8 12h8" />
                </svg>
                <CaretDownIcon className="size-5" />
              </ToolbarButton>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-72 p-3"
                onMouseEnter={() => {
                  allowCloseRef.current = false
                }}
                onMouseLeave={() => {
                  allowCloseRef.current = true
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                style={{
                  cursor: 'default',
                  pointerEvents: 'auto',
                  zIndex: 100
                }}
            >
              <div className="space-y-3">
                {COLORS.map((palette, index) => (
                    <MemoizedColorPicker
                        key={index}
                        palette={palette}
                        inverse={palette.inverse}
                        selectedColor={selectedColor}
                        onColorChange={handleColorChange}
                    />
                ))}
                <div className="flex justify-end pt-2">
                  <button
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80"
                      onClick={handleDone}
                  >
                    Done
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>
  )
}

SectionThree.displayName = "SectionThree"

export default SectionThree