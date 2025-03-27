"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarIcon, X } from "lucide-react"
import { Label } from "@/components/ui/label"

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
                        className={`bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 ${
                            dateFrom || dateTo || isActive ? "text-white" : "text-white"
                        } ${className}`}
                    >
                        {getButtonLabel()}
                        <CalendarIcon className="ml-2 h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-zinc-800 border-zinc-700">
                    <div className="space-y-4">
                        <h4 className="font-medium text-white">Filter by date range</h4>

                        <div className="space-y-2">
                            <Label htmlFor="date-from" className="text-zinc-200">
                                From Date
                            </Label>
                            <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-from"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal bg-zinc-100 hover:bg-zinc-400 border-zinc-700"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formatDate(dateFrom)}
                                        {dateFrom && (
                                            <X
                                                className="ml-auto h-4 w-4 opacity-70 hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDateFrom(null)
                                                }}
                                            />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-800 border-zinc-700">
                                    <Calendar
                                        className="text-zinc-100"
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
                            <Label htmlFor="date-to" className="text-zinc-200">
                                To Date
                            </Label>
                            <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-to"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal bg-zinc-100 hover:bg-zinc-400 border-zinc-700"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formatDate(dateTo)}
                                        {dateTo && (
                                            <X
                                                className="ml-auto h-4 w-4 opacity-70 hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDateTo(null)
                                                }}
                                            />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-800 border-zinc-700">
                                    <Calendar
                                        className="text-zinc-100"
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
                            <Label className="text-zinc-200">Filter By:</Label>
                            <RadioGroup
                                value={dateField}
                                onValueChange={(value) => setDateField(value)}
                                className="flex flex-col space-y-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="created_at"
                                        id="created_at"
                                        className="border-zinc-500 text-white"
                                    />
                                    <Label htmlFor="created_at" className="text-zinc-200">Creation Date</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="updated_at"
                                        id="updated_at"
                                        className="border-zinc-500 text-white"
                                    />
                                    <Label htmlFor="updated_at" className="text-zinc-200">Update Date</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="deadline"
                                        id="deadline"
                                        className="border-zinc-500 text-white"
                                    />
                                    <Label htmlFor="deadline" className="text-zinc-200">Deadline</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button
                                variant="ghost"
                                onClick={handleClearFilter}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                            >
                                Clear
                            </Button>
                            <Button
                                onClick={handleApplyFilter}
                                disabled={isApplyDisabled}
                                className={`bg-white text-zinc-900 hover:bg-zinc-200 ${isApplyDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
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