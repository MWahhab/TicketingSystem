// resources/js/Pages/Board/components/PostFormDialog.tsx

'use client';

import React, {useState, useEffect, useMemo} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {useForm, useWatch} from "react-hook-form";
import { Inertia } from "@inertiajs/inertia";
import { Button } from "@/components/ui/button";
import { TipTapTextArea } from "@/Pages/Board/components/TipTapTextArea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {toast, useToast} from "@/hooks/use-toast";
import {usePage} from "@inertiajs/react";

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    desc: z.string().min(1, "Description is required"),
    priority: z.string().min(1, "Priority is required"),
    column: z.string().min(1, "Column is required"),
    assignee_id: z.string().min(1, "Assignee is required"),
    deadline: z.date().nullable(),
    fid_board: z.string().min(1, "Board is required"),
});

type FormData = z.infer<typeof formSchema>;

interface Board {
    id: string;
    title: string;
    columns: string[];
}

interface Assignee {
    id: string;
    name: string;
}

interface PostFormDialogProps {
    priorities: string[];
    boards: Board[];
    assignees: Assignee[];
}

export function PostFormDialog({ boards = [], assignees = [], priorities = [] }: PostFormDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const { flash } = usePage().props;

    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "Some post title, don't worry about it",
            desc: "Really exciting task, worth losing sleep over..",
            priority: "low",
            column: "In Progress",
            assignee_id: "1",
            deadline: null,
            fid_board: "1",
        },
    });

    const selectedBoardId = useWatch({
        control: form.control,
        name: "fid_board",
    }).toString();

    useEffect(() => {
        if (flash.success) {
            toast({
                variant: "success",
                title: flash.success,
            });
        }

        if (!selectedBoardId) {
            setAvailableColumns([]);
            form.setValue("column", "");
            return;
        }

        const selectedBoard = boards.find(board => board.id.toString() === selectedBoardId);

        if (selectedBoard && selectedBoard.columns && selectedBoard.columns.length > 0) {
            setAvailableColumns(selectedBoard.columns);
            if (!selectedBoard.columns.includes(form.getValues("column"))) {
                form.setValue("column", "");
            }
        } else {
            setAvailableColumns([]);
            form.setValue("column", "");
        }
    }, [selectedBoardId, boards, flash]);

    function onSubmit(values: FormData) {
        Inertia.post('/posts', values, {
            onSuccess: () => {
                form.reset();
                setIsDialogOpen(false);
            },
            onError: (errors) => {
                console.error(errors);
            },
        });
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white text-zinc-900 hover:bg-zinc-100">
                    Create New Post
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="dialog-description" className="sm:max-w-[900px] bg-zinc-800 text-white border border-zinc-700" >
                <DialogHeader>
                    <DialogTitle className="text-white">Create New Post</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Title Field */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter title"
                                            {...field}
                                            className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-400" />
                                </FormItem>
                            )}
                        />
                        {/* Description Field */}
                        <FormField
                            control={form.control}
                            name="desc"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Description</FormLabel>
                                    <FormControl>
                                        <TipTapTextArea
                                            value={field.value}
                                            onChange={field.onChange}
                                            className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-400" />
                                </FormItem>
                            )}
                        />
                        {/* Board, Priority, and Column Fields */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Board */}
                            <FormField
                                control={form.control}
                                name="fid_board"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Board</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                value={field.value || ""}
                                            >
                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                    <SelectValue placeholder="Select board" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                    {boards.map((board) => (
                                                        <SelectItem
                                                            key={board.id}
                                                            value={board.id.toString()}
                                                            className="focus:bg-zinc-600"
                                                        >
                                                            {board.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />


                            {/* Column */}
                            <FormField
                                control={form.control}
                                name="column"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Column</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ""}
                                                disabled={!availableColumns.length}
                                            >
                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                    <SelectValue placeholder={availableColumns.length ? "Select column" : "Select a board first"} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                    {availableColumns.map((column, index) => (
                                                        <SelectItem
                                                            key={index}
                                                            value={column}
                                                            className="focus:bg-zinc-600"
                                                        >
                                                            {column}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />

                            {/* Priority */}
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Priority</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                    {priorities.map((priority) => (
                                                        <SelectItem
                                                            key={priority}
                                                            value={priority}
                                                            className="focus:bg-zinc-600"
                                                        >
                                                            {priority}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {/* Assignee and Deadline Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Assignee */}
                            <FormField
                                control={form.control}
                                name="assignee_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Assignee</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={(value) => {
                                                    console.log("Assignee selected:", value);
                                                    field.onChange(value);
                                                }}
                                                value={field.value || ""}
                                            >
                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white">
                                                    <SelectValue placeholder="Select assignee" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                    {assignees.map((assignee) => (
                                                        <SelectItem
                                                            key={assignee.id}
                                                            value={assignee.id.toString()}
                                                            className="focus:bg-zinc-600"
                                                        >
                                                            {assignee.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />

                            {/* Deadline */}
                            <FormField
                                control={form.control}
                                name="deadline"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col mt-2">
                                        <FormLabel className="text-white">Deadline</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(new Date(field.value), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-zinc-700" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                    className="bg-zinc-700 text-white"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {/* Submit Button */}
                        <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-100">
                            Submit
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default React.memo(PostFormDialog);
