'use client';

import React, {useState, useEffect} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {useForm, useWatch} from 'react-hook-form';
import {Inertia} from '@inertiajs/inertia';
import {Button} from '@/components/ui/button';
import {TipTapTextArea} from '@/Pages/Board/components/TipTapTextArea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Trash2Icon } from 'lucide-react';
import {format} from 'date-fns';
import {cn} from '@/lib/utils';
import {Calendar} from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {useToast} from '@/hooks/use-toast';
import {usePage} from '@inertiajs/react';

const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    desc: z.string().min(1, 'Description is required'),
    priority: z.string().min(1, 'Priority is required'),
    column: z.string().min(1, 'Column is required'),
    assignee_id: z.string().min(1, 'Assignee is required'),
    deadline: z.date().nullable(),
    fid_board: z.string().min(1, 'Board is required'),
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

interface Task {
    id: string;
    title: string;
    desc: string;
    priority: string;
    column: string;
    assignee_id: string;
    deadline: string | null;
    fid_board: string;
}

interface PostFormDialogProps {
    priorities: string[];
    boards: Board[];
    assignees: Assignee[];
    task?: Task;
    onClose?: () => void;
}

export function PostFormDialog({
                                   boards = [],
                                   assignees = [],
                                   priorities = [],
                                   task,
                                   onClose,
                               }: PostFormDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(!!task);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);

    const {toast} = useToast();

    const defaultValues = task
        ? {
            title: task.title || '',
            desc: task.desc || '',
            priority: task.priority || '',
            column: task.column || '',
            assignee_id: task.assignee_id?.toString() || '',
            deadline: task.deadline ? new Date(task.deadline) : null,
            fid_board: task.fid_board?.toString() || '',
        }
        : {
            title: '',
            desc: '',
            priority: '',
            column: '',
            assignee_id: '',
            deadline: null,
            fid_board: '',
        };

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const selectedBoardId = useWatch({
        control: form.control,
        name: 'fid_board',
    }).toString();

    useEffect(() => {
        if (!selectedBoardId) {
            setAvailableColumns([]);
            form.setValue('column', '');
            return;
        }

        const selectedBoard = boards.find(
            (board) => board.id.toString() === selectedBoardId
        );

        if (selectedBoard && selectedBoard.columns && selectedBoard.columns.length > 0) {
            setAvailableColumns(selectedBoard.columns);
            if (!selectedBoard.columns.includes(form.getValues('column'))) {
                form.setValue('column', '');
            }
        } else {
            setAvailableColumns([]);
            form.setValue('column', '');
        }
    }, [selectedBoardId, boards]);

    function onSubmit(values: FormData) {
        if (task) {
            Inertia.put(`/posts/${task.id}`, values, {
                onSuccess: () => {
                    form.reset();
                    setIsDialogOpen(false);
                    onClose && onClose();
                },
                onError: (errors) => {
                    console.error(errors);
                },
            });
        } else {
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
    }

    function onDelete() {
        if (task) {
            Inertia.delete(`/posts/${task.id}`, {
                onSuccess: () => {
                    setIsDialogOpen(false);
                    onClose && onClose();
                    toast({
                        variant: 'success',
                        title: 'Post deleted successfully',
                    });
                },
                onError: (errors) => {
                    console.error(errors);
                    toast({
                        variant: 'destructive',
                        title: 'Failed to delete post',
                    });
                },
            });
        }
    }

    return (
        <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open && onClose) onClose();
            }}
        >
            {!task && (
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="bg-white text-zinc-900 hover:bg-zinc-100"
                    >
                        Create New Post
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent
                aria-describedby="dialog-description"
                className="sm:max-w-[900px] bg-zinc-800 text-white border border-zinc-700"
            >
                <DialogHeader className="flex flex-row items-center space-x-2">
                    <DialogTitle className="text-white text-2xl flex items-center">
                        {task ? 'Edit Post' : 'Create New Post'}
                        {task && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDelete}
                                className="ml-2 text-red-400 hover:text-red-300 hover:bg-red-100/10 p-1"
                            >
                                <Trash2Icon className="h-5 w-5" />
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                            <div className="grid grid-cols-3 gap-4">
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
                            <div className="grid grid-cols-2 gap-4">
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
                        </form>
                    </Form>
                </div>
                <div className="mt-6">
                    <Button
                        type="submit"
                        onClick={form.handleSubmit(onSubmit)}
                        className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                    >
                        {task ? 'Update' : 'Submit'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default React.memo(PostFormDialog);
