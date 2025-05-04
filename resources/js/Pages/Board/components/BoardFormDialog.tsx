"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Inertia } from "@inertiajs/inertia"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

import axios from "axios"

const formSchema = z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    columns: z
        .string()
        .min(5, { message: "Columns must be at least 5 characters." })
})

// Single type inferred from the simplified schema
type FormData = z.infer<typeof formSchema>;

export function BoardFormDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const { toast } = useToast()

    // Use FormData for useForm
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            columns: "", // Correct default for string type
        },
    })

    // The 'values' here will be of type FormData {title: string, columns: string}
    async function onSubmit(values: FormData) { 
        // Manually transform columns after validation
        const transformedColumns = values.columns
            .split(",")
            .map((col) => col.trim())
            .filter((col) => col.length > 0);

        // Simple validation for uniqueness after splitting
        if (new Set(transformedColumns).size !== transformedColumns.length) {
            form.setError("columns", {
                type: "manual",
                message: "Column names must be unique.",
            });
            return; // Stop submission if columns are not unique
        }

        const payload = {
            title: values.title,
            columns: transformedColumns, // Use the transformed array
        };

        Inertia.post("/boards", payload, {
            onSuccess: () => {
                setTimeout(() => {
                    form.reset();
                }, 100);

                setIsDialogOpen(false);
            },
            onError: (errors) => {
                toast({
                    variant: "destructive",
                    title: "An error occurred!",
                    description: "Something went wrong. Please try again or check for latest updates.",
                })
            },
        });
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-white text-zinc-900 hover:bg-zinc-100">Add new board</Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[550px] bg-gradient-to-b from-zinc-900 to-zinc-950 text-white border border-white/10"
                aria-describedby="dialog-description"
            >
                <DialogHeader>
                    <DialogTitle>New Board</DialogTitle>
                    <DialogDescription className="text-zinc-300">Create a new board.</DialogDescription>
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
                                        <Input
                                            placeholder="Project Name"
                                            {...field}
                                            className="w-full bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                                        />
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
                                        <Input
                                            placeholder="Backlog, Estimated, In Progress, Review"
                                            {...field} // Field value is now correctly a string
                                            className="w-full bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-400" />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

