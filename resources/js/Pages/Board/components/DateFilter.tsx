"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarIcon, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { clsx } from "clsx"

interface DateFilterProps {
    onApplyFilter: (dateFrom: Date | null, dateTo: Date | null, dateField: string) => void
    onClearFilter: () => void
    initialDateFrom?: Date | null
    initialDateTo?: Date | null
    initialDateField?: string
    isActive?: boolean
    className?: string
}

export function DateFilter({
                               onApplyFilter,
                               onClearFilter,
                               initialDateFrom = null,
                               initialDateTo = null,
                               initialDateField = "created_at",
                               isActive = false,
                               className = "",
                           }: DateFilterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [dateFrom, setDateFrom] = useState<Date | null>(initialDateFrom)
    const [dateTo, setDateTo] = useState<Date | null>(initialDateTo)
    const [dateField, setDateField] = useState<string>(initialDateField || "created_at")
    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false)
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false)

    useEffect(() => {
        setDateFrom(initialDateFrom)
        setDateTo(initialDateTo)
    }, [initialDateFrom, initialDateTo])

    useEffect(() => {
        if (initialDateField) setDateField(initialDateField)
    }, [initialDateField])

    const handleApplyFilter = () => {
        onApplyFilter(dateFrom, dateTo, dateField)
        setIsOpen(false)
    }

    const handleClearFilter = () => {
        setDateFrom(null)
        setDateTo(null)
        onClearFilter()
        setIsOpen(false)
    }

    const formatDate = (date: Date | null) => {
        return date ? format(date, "MMM dd, yyyy") : "Select date"
    }

    const getButtonLabel = () => {
        if (dateFrom && dateTo) {
            return `${format(dateFrom, "MMM dd")} - ${format(dateTo, "MMM dd, yyyy")}`
        } else if (dateFrom) {
            return `From ${format(dateFrom, "MMM dd, yyyy")}`
        } else if (dateTo) {
            return `Until ${format(dateTo, "MMM dd, yyyy")}`
        }
        return isActive ? `${dateField.replace('_', ' ')} Filter (Active)` : "Date Filter"
    }

    const isApplyDisabled = !dateFrom || !dateTo

    return (
        <div className={className}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={clsx(
                            "border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all",
                            className
                        )}
                    >
                        {getButtonLabel()}
                        <CalendarIcon className="ml-2 h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl">
                    <div className="space-y-4">
                        <h4 className="font-medium text-zinc-100">Filter by date range</h4>

                        <div className="space-y-2">
                            <Label htmlFor="date-from" className="text-sm text-zinc-300">
                                From Date
                            </Label>
                            <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-from"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal bg-zinc-900 border border-zinc-700 text-zinc-100 hover:border-zinc-600 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-zinc-400" />
                                        {formatDate(dateFrom)}
                                        {dateFrom && (
                                            <X
                                                className="ml-auto h-4 w-4 text-zinc-400 opacity-70 hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDateFrom(null)
                                                }}
                                            />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl">
                                    <Calendar
                                        className="text-zinc-100 p-1"
                                        classNames={{
                                            day_selected: "bg-zinc-700 text-zinc-100 hover:bg-zinc-600 focus:bg-zinc-700 focus:text-zinc-100",
                                            day_today: "text-zinc-200",
                                            day_outside: "text-zinc-500 opacity-50",
                                            day_disabled: "text-zinc-600 opacity-50",
                                            head_cell: "text-zinc-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
                                            nav_button: "hover:bg-zinc-800",
                                            nav_button_previous: "absolute left-1",
                                            nav_button_next: "absolute right-1",
                                            caption_label: "text-zinc-100",
                                            day: "hover:bg-zinc-800 rounded-md",
                                            day_range_middle: "aria-selected:bg-zinc-700/50 aria-selected:text-zinc-100",
                                        }}
                                        mode="single"
                                        selected={dateFrom}
                                        onSelect={(date) => {
                                            setDateFrom(date)
                                            setIsFromCalendarOpen(false)
                                            if (!dateTo && date) {
                                                setIsToCalendarOpen(true)
                                            }
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date-to" className="text-sm text-zinc-300">
                                To Date
                            </Label>
                            <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-to"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal bg-zinc-900 border border-zinc-700 text-zinc-100 hover:border-zinc-600 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-zinc-400" />
                                        {formatDate(dateTo)}
                                        {dateTo && (
                                            <X
                                                className="ml-auto h-4 w-4 text-zinc-400 opacity-70 hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDateTo(null)
                                                }}
                                            />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl">
                                    <Calendar
                                        className="text-zinc-100 p-1"
                                        classNames={{
                                            day_selected: "bg-zinc-700 text-zinc-100 hover:bg-zinc-600 focus:bg-zinc-700 focus:text-zinc-100",
                                            day_today: "text-zinc-200",
                                            day_outside: "text-zinc-500 opacity-50",
                                            day_disabled: "text-zinc-600 opacity-50",
                                            head_cell: "text-zinc-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
                                            nav_button: "hover:bg-zinc-800",
                                            nav_button_previous: "absolute left-1",
                                            nav_button_next: "absolute right-1",
                                            caption_label: "text-zinc-100",
                                            day: "hover:bg-zinc-800 rounded-md",
                                            day_range_middle: "aria-selected:bg-zinc-700/50 aria-selected:text-zinc-100",
                                        }}
                                        mode="single"
                                        selected={dateTo}
                                        onSelect={(date) => {
                                            setDateTo(date)
                                            setIsToCalendarOpen(false)
                                        }}
                                        initialFocus
                                        fromDate={dateFrom || undefined}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2 pt-4">
                            <Label className="text-sm text-zinc-300">Filter By:</Label>
                            <RadioGroup
                                value={dateField}
                                onValueChange={(value) => setDateField(value)}
                                className="flex flex-col space-y-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="created_at"
                                        id="created_at"
                                        className="border-zinc-600 text-white focus-visible:ring-offset-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 data-[state=checked]:border-white/50 data-[state=checked]:bg-zinc-700"
                                    />
                                    <Label htmlFor="created_at" className="text-sm text-zinc-300 self-center">Creation Date</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="updated_at"
                                        id="updated_at"
                                        className="border-zinc-600 text-white focus-visible:ring-offset-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 data-[state=checked]:border-white/50 data-[state=checked]:bg-zinc-700"
                                    />
                                    <Label htmlFor="updated_at" className="text-sm text-zinc-300 self-center">Update Date</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="deadline"
                                        id="deadline"
                                        className="border-zinc-600 text-white focus-visible:ring-offset-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 data-[state=checked]:border-white/50 data-[state=checked]:bg-zinc-700"
                                    />
                                    <Label htmlFor="deadline" className="text-sm text-zinc-300 self-center">Deadline</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button
                                variant="ghost"
                                onClick={handleClearFilter}
                                className="border border-white/20 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white hover:ring-1 hover:ring-white/30 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all px-3 h-9"
                            >
                                Clear
                            </Button>
                            <Button
                                onClick={handleApplyFilter}
                                disabled={isApplyDisabled}
                                className={clsx(
                                    "border border-white/20 bg-transparent text-zinc-400 hover:bg-green-800/30 hover:text-green-200 hover:ring-1 hover:ring-green-500/50 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-all px-3 h-9",
                                    isApplyDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-zinc-400 hover:ring-0"
                                )}
                            >
                                Apply Filter
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}