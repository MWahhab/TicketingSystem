"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Download, Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { router } from "@inertiajs/react"

const formSchema = z
    .object({
        copyFrom: z.string().optional(),
        githubRepo: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
        githubToken: z.string().optional(),
        aiProvider: z.string().min(1, "Please select an AI provider"),
        aiToken: z.string().optional(),
    })
    .refine((data) => !data.githubRepo || data.githubToken, {
        message: "GitHub token is required when a repository URL is provided.",
        path: ["githubToken"],
    })
    .refine((data) => data.aiToken, {
        message: "AI token is required when an AI provider is selected.",
        path: ["aiToken"],
    })

export function AISettingsDialog({ isOpen, onClose, boardId, boardTitle, boards, isPremium }) {
    const [showGithubToken, setShowGithubToken] = useState(false)
    const [showAiToken, setShowAiToken] = useState(false)
    const [revealGithub, setRevealGithub] = useState(false)
    const [revealAI, setRevealAI] = useState(false)
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            copyFrom: "",
            githubRepo: "",
            githubToken: "",
            aiProvider: "",
            aiToken: "",
        },
    })

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        fetch(`/premiumSettings/board/${boardId}/edit`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    form.reset({
                        copyFrom: "",
                        githubRepo: data.repository_address || "",
                        githubToken: data.repository_token || "",
                        aiProvider: data.ai_model || "",
                        aiToken: data.ai_token || "",
                    })
                } else {
                    form.reset()
                }
            })
            .finally(() => setLoading(false))
    }, [isOpen])

    const githubRepo = form.watch("githubRepo")
    const aiProvider = form.watch("aiProvider")
    const copyFrom = form.watch("copyFrom")

    useEffect(() => setShowGithubToken(!!githubRepo), [githubRepo])
    useEffect(() => setShowAiToken(!!aiProvider), [aiProvider])

    useEffect(() => {
        if (!copyFrom || copyFrom === "") return
        fetch(`/premiumSettings/board/${copyFrom}/copy`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    form.setValue("githubRepo", data.repository_address || "")
                    form.setValue("githubToken", data.repository_token || "")
                    form.setValue("aiProvider", data.ai_model || "")
                    form.setValue("aiToken", data.ai_token || "")

                    toast({
                        variant: "success",
                        title: "Settings copied",
                        description: "Settings were loaded from the selected board.",
                    })
                }
            })
            .catch(() => {
                toast({
                    variant: "destructive",
                    title: "Copy failed",
                    description: "Could not load settings from the selected board.",
                })
            })
    }, [copyFrom])

    function onSubmit(values) {
        if (!isPremium) {
            toast({ variant: "destructive", title: "Premium subscription required" })
            return
        }
        const payload = {
            fid_board: boardId,
            repository_address: values.githubRepo || null,
            repository_token: values.githubToken || null,
            ai_model: values.aiProvider,
            ai_token: values.aiToken || null,
        }
        fetch(`/premiumSettings/board/${boardId}/edit`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then((res) => (res.ok ? res.json() : null))
            .then((existing) => {
                const method = existing ? "put" : "post"
                const url = existing ? `/premiumSettings/${boardId}` : `/premiumSettings`
                router[method](url, payload, {
                    preserveScroll: true,
                    preserveState: true,
                    only: [],
                    onSuccess: () => {
                        toast({ variant: "success", title: "AI settings saved" })
                        onClose()
                    },
                    onError: () => {
                        toast({ variant: "destructive", title: "Save failed" })
                    },
                })
            })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] bg-zinc-800 text-white border border-zinc-700">
                <DialogHeader>
                    <DialogTitle className="text-white text-2xl">AI Settings for {boardTitle}</DialogTitle>
                </DialogHeader>
                {!loading && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="copyFrom"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Copy Setting From:</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ""}
                                                disabled={boards.filter((b) => b.id !== boardId).length === 0}
                                            >
                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600">
                                                    <SelectValue
                                                        placeholder={
                                                            boards.filter((b) => b.id !== boardId).length === 0
                                                                ? "No other boards available"
                                                                : "Select board"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                    {boards
                                                        .filter((b) => b.id !== boardId)
                                                        .map((b) => (
                                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                                {b.title}
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
                                name="githubRepo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Repository:</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://github.com/user/repo" {...field} className="bg-zinc-700 text-white border-zinc-600" />
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            {showGithubToken && (
                                <FormField
                                    control={form.control}
                                    name="githubToken"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Access Token:</FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input type={revealGithub ? "text" : "password"} {...field} className="bg-zinc-700 text-white border-zinc-600 pr-10" />
                                                </FormControl>
                                                <button type="button" onClick={() => setRevealGithub(!revealGithub)} className="absolute inset-y-0 right-2 flex items-center">
                                                    {revealGithub ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">This token is encrypted upon saving.</p>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />
                            )}
                            <FormField
                                control={form.control}
                                name="aiProvider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">AI Provider:</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="bg-zinc-700 text-white border-zinc-600">
                                                    <SelectValue placeholder="Select AI provider" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 text-white border-zinc-600">
                                                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                                                    <SelectItem value="claude">Claude</SelectItem>
                                                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                                                    <SelectItem value="custom">Custom</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            {showAiToken && (
                                <FormField
                                    control={form.control}
                                    name="aiToken"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">AI Access Token:</FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input type={revealAI ? "text" : "password"} {...field} className="bg-zinc-700 text-white border-zinc-600 pr-10" />
                                                </FormControl>
                                                <button type="button" onClick={() => setRevealAI(!revealAI)} className="absolute inset-y-0 right-2 flex items-center">
                                                    {revealAI ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">This token is encrypted upon saving.</p>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />
                            )}
                            <Button type="submit" disabled={!isPremium} className="w-full bg-white text-zinc-900 hover:bg-zinc-100">
                                {!isPremium ? "Premium Required" : "Apply Settings"}
                            </Button>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}
