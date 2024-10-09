"use client"

import {useEffect, useState} from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm } from "react-hook-form"
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

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

import axios from 'axios';

const formSchema = z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    columns: z
        .string()
        .min(5, { message: "Columns must be at least 5 characters." })
        .transform((val) =>
            val.split(',').map(col => col.trim()).filter(col => col.length > 0)
        )
        .refine((columns) => new Set(columns).size === columns.length, {
            message: "Column names must be unique.",
        }),
});

type FormData = z.infer<typeof formSchema>;

export function BoardFormDialog({isBeingEdited = false, boardName = "", cols = "", boardId = null}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: boardName,
            columns: cols,
        },
    })

    async function onSubmit(values: FormData) {
        try {
            const payload = {
                title  : values.title,
                columns: values.columns, // Array of strings
            }

            const response = isBeingEdited ?
                await axios.put(`/boards/${boardId}`, payload) : await axios.post('/boards', payload);

            toast({
                variant: "success",
                title: isBeingEdited ? `${values.title} board has been edited!` : "New board has been created!",
                description: response.data.message,
            });

            form.reset();
            setIsDialogOpen(false);
        } catch (error: any) {
            if (error.response && error.response.status === 422) {
                const errors = error.response.data.errors;
                Object.keys(errors).forEach((key) => {
                    form.setError(key as keyof FormData, {
                        type: 'server',
                        message: errors[key][0],
                    });
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "An error occurred!",
                    description: "Something went wrong. Please try again or check for latest updates.",
                });
            }
        }
    }

    useEffect(() => {
        if (isBeingEdited) {
            setIsDialogOpen(true);
        }
    }, [isBeingEdited]);

    return (
        <div className="flex justify-center pb-24">
            {!isBeingEdited && (
                <Button className="mt-4 w-full max-w-md bg-white text-zinc-900 hover:bg-zinc-100" onClick={() => setIsDialogOpen(true)}>
                    Add new board
                </Button>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[550px] bg-zinc-800 text-white border border-zinc-700" aria-describedby="dialog-description">
                    <DialogHeader>
                        <DialogTitle>{isBeingEdited ? `${boardName} Board` : "New Board"}</DialogTitle>
                        <DialogDescription className="text-zinc-300">
                            {isBeingEdited ? `Edit Board.` : "Create a new board."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Project Name" {...field} className="w-full bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white" />
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="columns"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Columns</FormLabel>
                                        <FormDescription className="text-zinc-300">
                                            Please enter columns as comma-separated values!
                                        </FormDescription>
                                        <FormControl>
                                            <Input value={isBeingEdited ? cols : ""} placeholder="Backlog, Estimated, In Progress, Review" {...field} className="w-full bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white" />
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-100" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
