"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Eye, EyeOff, Loader2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"


const formSchema = z
    .object({
        copyFrom: z.string().optional(),
        githubRepo: z
            .string()
            .url("Please enter a valid URL")
            .optional()
            .or(z.literal("")),
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
    const [submitting, setSubmitting] = useState(false)
    const [agents, setAgents] = useState([])
    const [repositoryError, setRepositoryError] = useState(false)
    const [aiIntegrationError, setAiIntegrationError] = useState(false)
    const [repositorySuccess, setRepositorySuccess] = useState(false)
    const [aiIntegrationSuccess, setAiIntegrationSuccess] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
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
        setRepositoryError(false)
        setAiIntegrationError(false)

        fetch(`/premiumSettings/board/${boardId}/edit`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setAgents(data.agents || [])
                    const settings = data.settings || {}
                    form.reset({
                        copyFrom: "",
                        githubRepo: settings.repository_address || "",
                        githubToken: settings.repository_token || "",
                        aiProvider: settings.ai_model || "",
                        aiToken: settings.ai_token || "",
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

        setSubmitting(true)
        setRepositoryError(false)
        setAiIntegrationError(false)
        setRepositorySuccess(false)
        setAiIntegrationSuccess(false)

        const payload = {
            fid_board: boardId,
            repository_address: values.githubRepo || null,
            repository_token: values.githubToken || null,
            ai_model: values.aiProvider,
            ai_token: values.aiToken || null,
        }

        fetch(`/premiumSettings/board/${boardId}/edit`, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((existing) => {
                const method = existing && existing.settings ? "put" : "post"
                const url = method === "put" ? `/premiumSettings/${boardId}` : `/premiumSettings`
                fetch(url, {
                    method: method.toUpperCase(),
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN":
                            document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
                    },
                    body: JSON.stringify(payload),
                })
                    .then((response) => response.json())
                    .then((dataArray) => {
                        let repoValid = false
                        let aiValid = false

                        dataArray.forEach((item) => {
                            if (item.json.integration === "repository") {
                                const success = item.json.statusCode === 200
                                repoValid = success
                                setRepositorySuccess(success)
                                setRepositoryError(!success)
                            }
                            if (item.json.integration === "ai_integration") {
                                const success = item.json.statusCode === 200
                                aiValid = success
                                setAiIntegrationSuccess(success)
                                setAiIntegrationError(!success)
                            }
                        })

                        if (!repoValid) {
                            toast({
                                variant: "destructive",
                                title: "Repository integration failed",
                                description: "Could not authenticate with the provided repository credentials.",
                            })
                        }
                        if (!aiValid) {
                            toast({
                                variant: "destructive",
                                title: "AI integration failed",
                                description: "Could not authenticate with the provided AI credentials.",
                            })
                        }
                        if (repoValid && aiValid) {
                            toast({ variant: "success", title: "AI settings saved" })
                            setIsSuccess(true)
                            setTimeout(() => {
                                onClose()
                                setIsSuccess(false)
                            }, 1500)
                        }
                    })
                    .catch(() => {
                        toast({
                            variant: "destructive",
                            title: "Save failed",
                            description: "An unexpected error occurred.",
                        })
                    })
                    .finally(() => {
                        setSubmitting(false)
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
                                                onValueChange={(value) => {
                                                    field.onChange(value)
                                                    field.onBlur()
                                                }}
                                                value={field.value || ""}
                                                disabled={boards.filter((b) => b.id !== boardId).length === 0}
                                            >
                                                <SelectTrigger
                                                    className="relative flex h-10 w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                                                >
                                                    <SelectValue
                                                        placeholder={
                                                            boards.filter((b) => b.id !== boardId).length === 0
                                                                ? "No other boards available"
                                                                : "Select board"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 border border-zinc-600 text-white rounded-md">
                                                    {boards
                                                        .filter((b) => b.id !== boardId)
                                                        .map((b) => (
                                                            <SelectItem
                                                                className="hover:bg-zinc-500 text-sm"
                                                                key={b.id}
                                                                value={b.id.toString()}
                                                            >
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
                                        <FormLabel className="text-white">Project Repository:</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    placeholder="Example: https://api.github.com/repos/user/repository"
                                                    {...field}
                                                    className={`h-10 px-3 py-2 text-sm bg-zinc-700 text-white border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-600 ${
                                                        repositoryError
                                                            ? "border-red-500 focus:ring-red-500"
                                                            : repositorySuccess
                                                                ? "border-green-500 focus:ring-green-500"
                                                                : ""
                                                    }`}
                                                />
                                                {repositorySuccess && !repositoryError && (
                                                    <Check className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500 animate-pulse" />
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                        {repositoryError && (
                                            <p className="text-red-400 text-sm mt-1">
                                                Could not authenticate with this repository
                                            </p>
                                        )}
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
                                                    <Input
                                                        type={revealGithub ? "text" : "password"}
                                                        {...field}
                                                        className={`h-10 px-3 py-2 text-sm bg-zinc-700 text-white border border-zinc-600 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-zinc-600 ${
                                                            repositoryError
                                                                ? "border-red-500 focus:ring-red-500"
                                                                : repositorySuccess
                                                                    ? "border-green-500 focus:ring-green-500"
                                                                    : ""
                                                        }`}
                                                    />
                                                </FormControl>
                                                {repositorySuccess && !repositoryError && (
                                                    <Check className="absolute right-8 top-1/2 -translate-y-1/2 text-green-500 animate-pulse" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setRevealGithub(!revealGithub)}
                                                    className="absolute inset-y-0 right-2 flex items-center"
                                                >
                                                    {revealGithub ? (
                                                        <EyeOff className="w-4 h-4" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">
                                                This token is encrypted upon saving.
                                            </p>
                                            <FormMessage className="text-red-400" />
                                            {repositoryError && (
                                                <p className="text-red-400 text-sm mt-1">
                                                    Invalid token or insufficient permissions
                                                </p>
                                            )}
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
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value)
                                                    field.onBlur()
                                                }}
                                                value={field.value}
                                            >
                                                <SelectTrigger
                                                    className={`relative flex h-10 w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600 ${
                                                        aiIntegrationError
                                                            ? "border-red-500 focus:ring-red-500"
                                                            : aiIntegrationSuccess
                                                                ? "border-green-500 focus:ring-green-500"
                                                                : ""
                                                    }`}
                                                >
                                                    <SelectValue placeholder="Select AI provider" />
                                                    {aiIntegrationSuccess && !aiIntegrationError && (
                                                        <Check className="absolute right-8 top-1/2 -translate-y-1/2 text-green-500 animate-pulse" />
                                                    )}
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-700 border border-zinc-600 text-white rounded-md">
                                                    {agents.map((agent) => (
                                                        <SelectItem
                                                            key={agent.name}
                                                            value={agent.name}
                                                            className="hover:bg-zinc-500 text-sm"
                                                        >
                                                            {agent.value}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                        {aiIntegrationError && (
                                            <p className="text-red-400 text-sm mt-1">
                                                Could not authenticate with this AI provider
                                            </p>
                                        )}
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
                                                    <Input
                                                        type={revealAI ? "text" : "password"}
                                                        {...field}
                                                        className={`h-10 px-3 py-2 text-sm bg-zinc-700 text-white border border-zinc-600 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-zinc-600 ${
                                                            aiIntegrationError
                                                                ? "border-red-500 focus:ring-red-500"
                                                                : aiIntegrationSuccess
                                                                    ? "border-green-500 focus:ring-green-500"
                                                                    : ""
                                                        }`}
                                                    />
                                                </FormControl>
                                                {aiIntegrationSuccess && !aiIntegrationError && (
                                                    <Check className="absolute right-8 top-1/2 -translate-y-1/2 text-green-500 animate-pulse" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setRevealAI(!revealAI)}
                                                    className="absolute inset-y-0 right-2 flex items-center"
                                                >
                                                    {revealAI ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">
                                                This token is encrypted upon saving.
                                            </p>
                                            <FormMessage className="text-red-400" />
                                            {aiIntegrationError && (
                                                <p className="text-red-400 text-sm mt-1">
                                                    Invalid token or insufficient permissions
                                                </p>
                                            )}
                                        </FormItem>
                                    )}
                                />
                            )}

                            <Button
                                type="submit"
                                disabled={!isPremium || submitting}
                                className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-900" />
                                        <span>Processing...</span>
                                    </>
                                ) : !isPremium ? (
                                    "Premium Required"
                                ) : (
                                    "Apply Settings"
                                )}
                            </Button>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}
