"use client"

import { useState, useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm, useFieldArray, Control } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Inertia } from "@inertiajs/inertia"
import {
    PlusCircle,
    Trash2,
    BookOpen,
    Loader2,
    ArrowUp,
    ArrowDown,
    Undo2,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const columnSchema = z.object({
    id: z.string().optional(),
    value: z.string().min(1, { message: "Column name cannot be empty." }),
    isFixed: z.boolean().optional(),
})
const formSchema = z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    columns: z
        .array(columnSchema)
        .min(1, { message: "At least one column is required." })
        .refine(
            (cols) => {
                const idx = cols.findIndex(
                    (c) => c.isFixed && c.value.trim().toLowerCase() === "done"
                )
                return idx === cols.length - 1
            },
            { message: "The 'Done' column must be the last column.", path: ["columns"] }
        )
        .refine(
            (cols) => {
                const names = cols.map((c) => c.value.trim().toLowerCase())
                return new Set(names).size === names.length
            },
            { message: "Column names must be unique.", path: ["columns"] }
        ),
})
type FormData = z.infer<typeof formSchema>

interface BoardToEdit {
    id: number | string
    title: string
    columns: string[]
}
interface BoardFormDialogProps {
    editingBoardId?: number | string
    triggerButton?: React.ReactNode
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

const DONE_COLUMN_NAME = "Done"
const initialDefaultColumns = [{ value: DONE_COLUMN_NAME, isFixed: true }]
const templateColumnNamesBeforeDone = [
    "Planning",
    "Backlog",
    "In Progress",
    "In Review",
]

export function BoardFormDialog({
                                    editingBoardId,
                                    triggerButton,
                                    isOpen: externalOpen,
                                    onOpenChange,
                                }: BoardFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [board, setBoard] = useState<BoardToEdit | null>(null)
    const [loading, setLoading] = useState(false)
    const [reassignMap, setReassignMap] = useState<Record<string, string>>({})
    const [staleMap, setStaleMap] = useState<Record<string, boolean>>({})
    const { toast } = useToast()

    const isEdit = !!editingBoardId
    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { title: "", columns: initialDefaultColumns },
        mode: "onChange",
    })
    const { fields, remove, insert, replace, move } = useFieldArray({
        control: form.control as Control<any>,
        name: "columns",
    })

    const handleClose = (open: boolean) => {
        if (onOpenChange) onOpenChange(open)
        else setInternalOpen(open)
        if (!open) {
            form.reset({ title: "", columns: initialDefaultColumns })
            setBoard(null)
            setReassignMap({})
            setStaleMap({})
        }
    }

    useEffect(() => {
        if (!editingBoardId) return
        setLoading(true)
        fetch(`/boards/${editingBoardId}/edit`)
            .then((res) => res.json())
            .then((data) =>
                setBoard({ id: data.id, title: data.title, columns: data.columns })
            )
            .catch(() =>
                toast({ title: "Failed to fetch board.", variant: "destructive" })
            )
            .finally(() => setLoading(false))
    }, [editingBoardId])

    useEffect(() => {
        if (!isOpen) return
        if (isEdit && board) {
            const cols = board.columns.filter((c) => c !== DONE_COLUMN_NAME)
            form.reset({
                title: board.title,
                columns: [
                    ...cols.map((v) => ({ value: v, isFixed: false })),
                    { value: DONE_COLUMN_NAME, isFixed: true },
                ],
            })
        } else {
            form.reset({ title: "", columns: initialDefaultColumns })
        }
        setReassignMap({})
        setStaleMap({})
    }, [isOpen, board])

    const findDoneIndex = () =>
        fields.findIndex((f) => f.isFixed && f.value === DONE_COLUMN_NAME)
    const addColumn = () => {
        const idx = findDoneIndex()
        if (idx >= 0) insert(idx, { value: "", isFixed: false })
        else
            replace([
                ...form.getValues("columns"),
                { value: "", isFixed: false },
                { value: DONE_COLUMN_NAME, isFixed: true },
            ])
    }
    const loadTemplate = () => {
        const templ = templateColumnNamesBeforeDone.map((v) => ({
            value: v,
            isFixed: false,
        }))
        replace([...templ, { value: DONE_COLUMN_NAME, isFixed: true }])
        toast({ title: "Template Loaded", variant: "success" })
    }

    const submitButtonText = isEdit ? "Update Board" : "Save Board"

    const handleMarkDelete = (col: string) => {
        const nextMap = { ...reassignMap }
        const nextStale = { ...staleMap }
        Object.entries(reassignMap).forEach(([from, to]) => {
            if (to === col) {
                delete nextMap[from]
                nextStale[from] = true
            }
        })
        nextMap[col] = ""
        setReassignMap(nextMap)
        setStaleMap(nextStale)
    }
    const handleUndoDelete = (col: string) => {
        setReassignMap((prev) => {
            const n = { ...prev }
            delete n[col]
            return n
        })
        setStaleMap((prev) => {
            const n = { ...prev }
            delete n[col]
            return n
        })
    }

    const onSubmit = (vals: FormData) => {
        if (isEdit) {
            const missing = Object.entries(reassignMap).filter(([, to]) => !to)
            if (missing.length)
                return toast({
                    title: "Please assign replacements.",
                    variant: "destructive",
                })
        }
        const cols = vals.columns
            .map((c) => c.value.trim())
            .filter((c) => !reassignMap[c])
        const payload = {
            title: vals.title.trim(),
            columns: cols,
            reassignments: Object.entries(reassignMap).map(([from, to]) => ({
                from,
                to,
            })),
        }
        const opts = {
            onSuccess: () => {
                toast({
                    title: isEdit ? "Board Updated!" : "Board Created!",
                    variant: "success",
                })
                handleClose(false)
            },
            onError: (e: any) =>
                toast({ title: e.message || "Error", variant: "destructive" }),
        }
        if (isEdit && board)
            Inertia.put(`/boards/${board.id}`, payload, opts)
        else Inertia.post(`/boards`, payload, opts)
    }

    if (isEdit && loading) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent>
                    <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />
                </DialogContent>
            </Dialog>
        )
    }

    const dialogTitle = isEdit ? "Edit Board" : "New Board"
    const triggerBtn = triggerButton || (
        <Button className="w-full bg-white text-zinc-900 hover:bg-zinc-200 focus-visible:ring-white/50">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add new board
        </Button>
    )

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            {!isEdit && externalOpen === undefined && (
                <DialogTrigger asChild>{triggerBtn}</DialogTrigger>
            )}
            <DialogContent
                className="sm:max-w-[550px] bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-200 border border-white/10 flex flex-col p-0"
                style={{ maxHeight: "90vh" }}
            >
                <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                    <DialogTitle className="text-zinc-100 text-2xl">
                        {dialogTitle}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 h-5">
                        {isEdit
                            ? `Editing board: ${board?.title}`
                            : "Create a new board to organize your tasks."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex flex-col flex-grow overflow-hidden px-6 space-y-5"
                    >
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-zinc-300">
                                        Title
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Project Name"
                                            {...field}
                                            className="h-10 mt-1 px-3 py-2 text-sm bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-white/40 placeholder-zinc-500"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-400" />
                                </FormItem>
                            )}
                        />

                        <FormItem className="flex flex-col flex-grow overflow-hidden min-h-0">
                            <FormLabel className="text-zinc-300">
                                Columns
                            </FormLabel>
                            <FormDescription className="text-zinc-400 text-sm mt-1">
                                Define the stages for your board. "{DONE_COLUMN_NAME}" is a required
                                final stage.
                            </FormDescription>

                            <ScrollArea className="mt-3 rounded-md max-h-[300px] overflow-y-auto">
                                <div className="space-y-3 pr-3 pb-1">
                                    {fields.map((item, idx) => {
                                        const isFixedDone =
                                            item.isFixed && item.value === DONE_COLUMN_NAME
                                        const marked = reassignMap[item.value] !== undefined
                                        const error = marked && !reassignMap[item.value]
                                        const isStale = staleMap[item.value]
                                        const options = fields.filter(
                                            (f) => f.value !== item.value && !(f.value in reassignMap)
                                        )

                                        let containerClass = ""
                                        if (marked) {
                                            containerClass = error
                                                ? "bg-red-900/30 border border-red-500/30"
                                                : "bg-zinc-700/30 border border-white/10"
                                        } else if (isStale) {
                                            containerClass = "bg-yellow-900/30 border border-yellow-500/30"
                                        }

                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded p-2 ${containerClass}`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <FormControl>
                                                        <Input
                                                            {...form.register(
                                                                `columns.${idx}.value` as const
                                                            )}
                                                            placeholder={`Column ${idx + 1}`}
                                                            disabled={isFixedDone || marked}
                                                            className={`flex-grow h-10 px-3 py-2 text-sm bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-white/40 ${
                                                                isFixedDone || marked
                                                                    ? "opacity-70 cursor-not-allowed"
                                                                    : ""
                                                            }`}
                                                        />
                                                    </FormControl>
                                                    {!isFixedDone && !marked && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleMarkDelete(item.value)}
                                                                className="text-zinc-400 hover:text-red-500 shrink-0"
                                                                aria-label="Remove column"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => move(idx, idx - 1)}
                                                                disabled={idx === 0}
                                                                className="text-zinc-400 hover:text-zinc-100 shrink-0"
                                                                aria-label="Move up"
                                                            >
                                                                <ArrowUp className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => move(idx, idx + 1)}
                                                                disabled={idx === fields.length - 1}
                                                                className="text-zinc-400 hover:text-zinc-100 shrink-0"
                                                                aria-label="Move down"
                                                            >
                                                                <ArrowDown className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!isFixedDone && marked && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleUndoDelete(item.value)}
                                                            className="text-zinc-400 hover:text-green-500 shrink-0"
                                                            aria-label="Undo delete"
                                                        >
                                                            <Undo2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {isStale && !marked && (
                                                    <p className="text-yellow-300 text-sm mt-1">
                                                        Previous reassignment cleared because its target was deleted.
                                                    </p>
                                                )}
                                                {marked && (
                                                    <div className="mt-2">
                                                        <Label className="text-sm text-zinc-300">
                                                            Reassign posts from "{item.value}" to:
                                                        </Label>
                                                        <Select
                                                            value={reassignMap[item.value]}
                                                            onValueChange={(v) =>
                                                                setReassignMap((m) => ({ ...m, [item.value]: v }))
                                                            }
                                                        >
                                                            <SelectTrigger className="mt-1 bg-zinc-800 text-zinc-200 border border-zinc-700">
                                                                <SelectValue placeholder="Select column..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-zinc-900 text-zinc-200 border border-zinc-700">
                                                                {options.map((o) => (
                                                                    <SelectItem key={o.value} value={o.value}>
                                                                        {o.value}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {error && (
                                                            <p className="text-red-400 text-sm mt-1">
                                                                Please select a reassignment target.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>
                            <div className="flex space-x-2 mt-3 flex-shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addColumn}
                                    className="text-sm border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Column
                                </Button>
                                {!isEdit && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={loadTemplate}
                                        className="text-sm border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
                                    >
                                        <BookOpen className="mr-2 h-4 w-4" /> Load Template
                                    </Button>
                                )}
                            </div>
                            <FormMessage className="text-red-400 mt-2">
                                {form.formState.errors.columns?.message}
                            </FormMessage>
                        </FormItem>
                        <div className="mt-auto pt-3 pb-6 flex-shrink-0">
                            <Button
                                type="submit"
                                className="w-full bg-white text-zinc-900 hover:bg-zinc-200 focus-visible:ring-white/50 disabled:opacity-70"
                                disabled={form.formState.isSubmitting || !form.formState.isValid}
                            >
                                {form.formState.isSubmitting ? submitButtonText : submitButtonText}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
