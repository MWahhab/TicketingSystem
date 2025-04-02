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
        .transform((val) =>
            val
                .split(",")
                .map((col) => col.trim())
                .filter((col) => col.length > 0),
        )
        .refine((columns) => new Set(columns).size === columns.length, {
            message: "Column names must be unique.",
        }),
})

type FormData = z.infer<typeof formSchema>

export function BoardFormDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const { toast } = useToast()

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            columns: "",
        },
    })

    async function onSubmit(values: FormData) {
        const payload = {
            title: values.title,
            columns: values.columns,
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
                className="sm:max-w-[550px] bg-zinc-800 text-white border border-zinc-700"
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
                                            className="w-full bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
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
                                            {...field}
                                            className="w-full bg-zinc-700 text-white border-zinc-600 focus:border-white focus:ring-1 focus:ring-white"
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

