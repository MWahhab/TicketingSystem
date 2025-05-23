"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm, useWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { FileBrowser } from "./post-form-dialog-components/file-browser"
import { WatcherButton } from "./post-form-dialog-components/watcher-button"
import 'highlight.js/styles/github-dark.css'
import hljs from 'highlight.js'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Trash, Eye, Edit, Maximize2Icon, Minimize2Icon, Link2 } from "lucide-react"
import { format, parseISO, isValid } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import CommentSection from "@/Pages/Board/components/CommentSection"
import DeleteConfirmationDialog from "@/Pages/Board/components/DeleteConfirmation"
import ActivityHistory from "@/Pages/Board/components/ActivityHistory"
import LinkedIssuesSection from "@/Pages/Board/components/LinkedIssues"
import axios from "axios"
import { useBoardContext, type Assignee, type Task, type Board } from "../BoardContext"
import {router} from "@inertiajs/react";

interface FileItem {
    path: string
    content: string
}
const Portal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body)
}

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    desc: z.string().min(1, "Description is required"),
    priority: z.enum(["low", "medium", "high"], { errorMap: () => ({ message: "Priority is required" }) }),
    column: z.string().min(1, "Column is required"),
    assignee_id: z.string().min(1, "Assignee is required"),
    deadline: z.string().nullable(),
    fid_board: z.string().min(1, "Board is required"),
})

type FormData = z.infer<typeof formSchema>

interface PostFormDialogProps {
    boards: Board[];
    assignees: Assignee[];
    priorities: string[];
    task?: Task | null;
    onClose?: () => void;
    authUserId: string;
    isPremium: string;
}

interface Comment {
    id: string
    content: string
    author: string
    createdAt: string
}

const hasPremiumAccess = (premiumLevel: string): boolean => {
    return premiumLevel === "pro" || premiumLevel === "premium"
}

interface SimpleEditorAssignee {
    id: string;
    name: string;
    avatar?: string;
}

const previewStyles = `
/* Basic mention styling */
.prose .mention,
.description-preview .mention {
    color: #f4f4f5 !important; /* Brighter text (zinc-100) for better contrast */
    background-color: #27272a;
    padding: 0.15em 0.4em;
    border-radius: 0.3em;
    text-decoration: none;
    font-weight: 700; /* Changed from 500 to 700 for bold text */
    display: inline-block;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    font-size: 0.9em;
}

/* Ensure mentions stand out in the preview context */
.bg-zinc-800 .mention,
.description-preview .mention {
    background-color: #3f3f46; /* Slightly lighter than container */
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Code block styling */
.description-preview pre {
    background-color: #1e1e1e;
    border-radius: 0.375rem;
    padding: 1rem;
    margin: 1rem 0;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.description-preview pre code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #e4e4e7;
    display: block;
    white-space: pre;
}

.description-preview code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    background-color: #27272a;
    padding: 0.2em 0.4em;
    border-radius: 0.25rem;
}

.description-preview .hljs {
    background: transparent;
    padding: 0;
}
`;

const DescriptionPreview = React.memo(({ htmlContent }: { htmlContent: string }) => {

    useEffect(() => {
        if (htmlContent) {
            document.querySelectorAll('.description-preview pre code').forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
        }
    }, [htmlContent]);
    
    return (
        <div
            className="bg-zinc-800 text-white border border-zinc-700 rounded-md p-4 min-h-[200px] prose prose-invert max-w-none overflow-y-auto overflow-x-hidden description-preview"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                letterSpacing: 'normal',
                overflowWrap: 'break-word',
            }}
        />
    );
});

export function PostFormDialog({
                                   boards = [],
                                   assignees = [],
                                   priorities = [],
                                   task,
                                   onClose,
                                   authUserId,
                                   isPremium,
                               }: PostFormDialogProps) {

    const [isDialogOpen, setIsDialogOpen] = useState(!!task)

    const [boardSelectOpen, setBoardSelectOpen] = useState(false)
    const [columnSelectOpen, setColumnSelectOpen] = useState(false)
    const [prioritySelectOpen, setPrioritySelectOpen] = useState(false)
    const [assigneeSelectOpen, setAssigneeSelectOpen] = useState(false)
    const [deadlinePopoverOpen, setDeadlinePopoverOpen] = useState(false)

    const [availableColumns, setAvailableColumns] = useState<string[]>([])
    const [isPreview, setIsPreview] = useState(!!task)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isOptimizing, setIsOptimizing] = useState(false)
    const [isGeneratingPR, setIsGeneratingPR] = useState(false)
    const [fileStructure, setFileStructure] = useState<FileItem[]>([])

    const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false)
    const [selectedPRFiles, setSelectedPRFiles] = useState<string[]>([])

    const { toast } = useToast()

    const [originalDescription, setOriginalDescription] = useState("")
    const [isDescriptionModified, setIsDescriptionModified] = useState(false)

    const [branches, setBranches] = useState<Array<{ name: string; url: string; protected: boolean }>>([])
    const [isLoadingBranches, setIsLoadingBranches] = useState(false)

    const [generationCount, setGenerationCount] = useState<number | null>(null)
    const [generationCap, setGenerationCap] = useState<number | null>(null)

    const dialogContentRef = useRef<HTMLDivElement>(null);

    const handleDialogInteraction = useCallback(() => {
        if (dialogContentRef.current) {
            dialogContentRef.current.style.outline = 'none';
        }
    }, []);

    const getInitialFormValues = useCallback((): FormData => {
        return task
            ? {
                title: task.title || "",
                desc: task.desc || "",
                priority: task.priority || "medium",
                column: task.column || "",
                assignee_id: task.assignee_id?.toString() || "",
                deadline: task.deadline || null,
                fid_board: task.fid_board?.toString() || "",
            }
            : {
                title: "",
                desc: "",
                priority: "medium",
                column: "",
                assignee_id: "",
                deadline: null,
                fid_board: "",
            }
    }, [task]);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: getInitialFormValues(),
    })

    const { createTask, updateTask, closeDialog: contextCloseDialog, openDialog: contextOpenDialog } = useBoardContext();

    const commentSchema = z.object({
        content: z.string().min(3, "Comment is required and must be longer than 3 characters."),
    })
    const commentForm = useForm({
        resolver: zodResolver(commentSchema),
        defaultValues: {
            content: "",
        },
    })

    const selectedBoardId = useWatch({
        control: form.control,
        name: "fid_board",
    }).toString()

    useEffect(() => {
        if (!selectedBoardId) {
            setAvailableColumns([])
            form.setValue("column", "")
            return
        }

        const selectedBoard = boards.find((board) => board.id.toString() === selectedBoardId)

        if (selectedBoard && selectedBoard.columns && selectedBoard.columns.length > 0) {
            setAvailableColumns(selectedBoard.columns)
            if (!selectedBoard.columns.includes(form.getValues("column"))) {
                form.setValue("column", "")
            }
        } else {
            setAvailableColumns([])
            form.setValue("column", "")
        }
    }, [selectedBoardId, boards, form])

    useEffect(() => {
        form.reset(getInitialFormValues());
        if (task) {
            setOriginalDescription(task.desc || "");
            setIsDescriptionModified(false);
            setIsPreview(true);
        } else {
            setOriginalDescription("");
            setIsDescriptionModified(false);
            setIsPreview(false);
        }
    }, [task, form, getInitialFormValues]);

    useEffect(() => {
        if (isDialogOpen) {
            setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 0);
        }
    }, [isDialogOpen]);

    async function onSubmit(values: FormData) {

        setIsDescriptionModified(false)

        let submissionSuccessful = false;
        let submittedTaskData: Task | null = null;

        if (task) {
            const apiResponse = await updateTask(task.id, values);
            if (apiResponse) {
                submissionSuccessful = true;
                submittedTaskData = apiResponse;
                toast({
                    title: "Post Updated",
                    description: "The post has been successfully updated.",
                });
            }
        } else {
            const apiResponse = await createTask({ ...values, post_author: authUserId });
            if (apiResponse) {
                submissionSuccessful = true;
                submittedTaskData = apiResponse;
                toast({
                    title: "Post Created",
                    description: "The new post has been successfully created.",
                });
            }
        }

        if (submissionSuccessful && submittedTaskData) {
            form.reset(getInitialFormValues());

            if (onClose) {
                onClose();
            } else {
                setIsDialogOpen(false);
            }
        } else {
            // console.error("Submission failed, see console/alerts for details.");
        }
    }

    const handleDialogClose = () => {
        setShowDeleteConfirmation(false)
    }

    const handlePostDeletedSuccessfully = () => {
        setIsDialogOpen(false);
    }

    function onDelete() {
        setShowDeleteConfirmation(true)
    }

    const toggleExpansion = () => {
        setIsExpanded(!isExpanded)
    }

    const fetchBranches = useCallback(async () => {
        if (!task || !task.id || !hasPremiumAccess(isPremium)) return
        setIsLoadingBranches(true)
        try {
            const metaTokenBeforeFetchBranches = document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
            const response = await axios.post("/premium/branches/get", {
                post_id: task.id,
            })
            if (response.data && response.data.data) {
                setBranches(response.data.data)
                if (isGeneratingPR && response.data.data.length > 0) {
                    setIsGeneratingPR(false)
                }
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load branches",
            })
        } finally {
            setIsLoadingBranches(false)
        }
    }, [task, isPremium, toast, isGeneratingPR]);

    useEffect(() => {
        if (isDialogOpen && task && task.id && hasPremiumAccess(isPremium)) {
            fetchBranches()
        }
    }, [isDialogOpen, task, isPremium, fetchBranches])

    useEffect(() => {
        const fetchGenerationCount = async () => {
            try {
                const { data } = await axios.post("/premium/generation/count")
                if (data) {
                    setGenerationCount(data.generation_count)
                    setGenerationCap(data.generation_cap)
                }
            } catch (err) {
                // console.error("Failed to fetch generation count:", err)
            }
        }
        if (hasPremiumAccess(isPremium)) {
            fetchGenerationCount()
        }
    }, [isPremium])

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            if (onClose) onClose();
            setIsDialogOpen(false);

            const params = new URLSearchParams(window.location.search);
            const keysToRemove = ['post_id', 'openTask'];

            let changed = false;
            for (const key of keysToRemove) {
                if (params.has(key)) {
                    params.delete(key);
                    changed = true;
                }
            }

            if (changed) {
                const query = params.toString();
                const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
                router.replace(newUrl, { scroll: false });
            }
        } else {
            setIsDialogOpen(true);
        }
    };

    const checkQueueStatus = useCallback(async () => {
        if (!task?.id || !hasPremiumAccess(isPremium)) return
        try {
            const { data } = await axios.post("/premium/queue/status", {
                post_id: task.id,
            })
            if (data?.queued) {
                setIsGeneratingPR(true)
            }
        } catch (err) {
            // console.error("Failed to check queue status:", err)
        }
    }, [task, isPremium]);

    useEffect(() => {
        checkQueueStatus()
    }, [checkQueueStatus])

    const editorAssignees = useMemo(() => {
        return assignees.map((a: any) => ({
            id: String(a.id),
            name: a.name,
        })) as SimpleEditorAssignee[];
    }, [assignees]);

    const handleSelectChange = useCallback((setValue: (value: string) => void, setOpen: (open: boolean) => void) => (value: string) => {
        setValue(value);
        setOpen(false);
        setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 10);
    }, []);

    useEffect(() => {
        hljs.configure({
            languages: ['javascript', 'typescript', 'css', 'html', 'php', 'java', 'python', 'bash', 'json', 'sql'],
            ignoreUnescapedHTML: true
        });
    }, []);

    return (
        <>
            <style>{previewStyles}</style>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                {!task && (
                    <DialogTrigger asChild>
                        <Button variant="outline" className="bg-white text-sm text-light text-zinc-900 hover:bg-zinc-50 hover:text-zinc-800">
                            Create New Post
                        </Button>
                    </DialogTrigger>
                )}

                    <DialogContent
                        ref={dialogContentRef}
                        tabIndex={-1}
                        className={`bg-gradient-to-b from-zinc-900 to-zinc-950 text-white border border-white/10 transition-all duration-300 focus:outline-none ${
                            isExpanded ? "sm:max-w-[90vw] w-[90vw] h-[98vh]" : "sm:max-w-[1000px]"
                        }`}
                        onClick={handleDialogInteraction}
                        onFocus={handleDialogInteraction}
                        onInteractOutside={(event) => {
                            const target = event.target as HTMLElement;
                            if (target.closest('.mention-suggestions-list')) {
                                event.preventDefault();
                            }
                        }}
                        aria-describedby={task ? "post-edit-dialog-description" : "post-create-dialog-description"}
                    >
                        <DialogHeader>
                            <div className="flex items-center w-full">
                                <div className="flex items-center gap-2">
                                    <DialogTitle className="text-white text-2xl flex items-center">
                                        {task ? "Editing Post #" + task.id : "Create New Post"}
                                    </DialogTitle>
                                    {task && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={onDelete}
                                                className="border border-white/10 bg-transparent text-red-400 hover:bg-red-800/50 hover:text-red-100 hover:ring-1 hover:ring-red-500/30 p-1 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            >
                                                <Trash className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={toggleExpansion}
                                                className="border border-white/10 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 hover:ring-1 hover:ring-white/20 p-1 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2"
                                            >
                                                {isExpanded ? <Minimize2Icon className="h-5 w-5" /> : <Maximize2Icon className="h-5 w-5" />}
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {task && (
                                    <div className="ml-auto flex items-center">
                                        <WatcherButton postId={task.id} userId={authUserId} watchers={task.watchers || []} />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const url = `${window.location.origin}/boards?board_id=${task.fid_board}&post_id=${task.id}`
                                                navigator.clipboard.writeText(url)
                                                toast({
                                                    title: "Link copied",
                                                    description: "Post link has been copied to clipboard",
                                                })
                                            }}
                                            className="border border-white/10 bg-transparent text-purple-400 hover:bg-purple-800/30 hover:text-purple-200 hover:ring-1 hover:ring-purple-500/50 p-1 ml-2 mr-8 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
                                            title="Copy link to post"
                                        >
                                            <Link2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <DialogDescription id={task ? "post-edit-dialog-description" : "post-create-dialog-description"} className="sr-only">
                                {task ? `Dialog to edit details for post number ${task.id}.` : "Dialog to create a new post."}
                            </DialogDescription>
                        </DialogHeader>
                        <div
                            style={{
                                height: isExpanded ? 'calc(98vh - 180px)' : undefined,
                                maxHeight: !isExpanded ? 'calc(100vh - 240px)' : undefined,
                                paddingRight: '1rem'
                            }}
                            className="overflow-y-auto"
                        >
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                    <div className="grid grid-cols-[2fr_1fr] gap-6">
                                        <div className="space-y-8 min-w-0">
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
                                                                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                                                                onFocus={handleDialogInteraction}
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
                                                        <div className="flex justify-between items-center mb-2">
                                                            <FormLabel className="text-white">Description</FormLabel>
                                                            <div className="flex items-center gap-2">
                                                                {task && (
                                                                    <>
                                                                        <Button
                                                                            disabled={isOptimizing || !hasPremiumAccess(isPremium)}
                                                                            onClick={async (e) => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()
                                                                                if (isOptimizing) return
                                                                                setIsOptimizing(true)
                                                                                try {
                                                                                    const metaTokenBeforeOptimizeDesc = document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
                                                                                    const { data } = await axios.post("/premium/description/optimise", {
                                                                                        post_id: task.id,
                                                                                    })
                                                                                    if (data?.description) {
                                                                                        const currentDesc = form.getValues("desc")
                                                                                        setOriginalDescription(currentDesc)
                                                                                        form.setValue("desc", data.description)
                                                                                        setIsDescriptionModified(true)
                                                                                        setIsPreview(true)
                                                                                        toast({
                                                                                            title: "Description optimized",
                                                                                            description: "Updated description has been set, but not saved yet.",
                                                                                        })
                                                                                    } else {
                                                                                        toast({
                                                                                            title: "No description returned",
                                                                                            description: "The optimization service did not return any content.",
                                                                                        })
                                                                                    }
                                                                                } catch (err) {
                                                                                    toast({
                                                                                        title: "Failed to optimize",
                                                                                        description: "Something went wrong during the optimization.",
                                                                                        variant: "destructive",
                                                                                    })
                                                                                    // console.error(err)
                                                                                } finally {
                                                                                    setIsOptimizing(false)
                                                                                }
                                                                            }}
                                                                            className="border border-white/10 bg-transparent text-zinc-300 hover:bg-purple-800/30 hover:text-purple-200 hover:ring-1 hover:ring-purple-500/50 rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:opacity-50"
                                                                            title={!hasPremiumAccess(isPremium) ? "This is a paid feature" : "Optimize Description"}
                                                                        >
                                                                            {isOptimizing ? (
                                                                                <>
                                                                                    <svg
                                                                                        className="animate-spin h-3.5 w-3.5 text-purple-400"
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        fill="none"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <circle
                                                                                            className="opacity-25"
                                                                                            cx="12"
                                                                                            cy="12"
                                                                                            r="10"
                                                                                            stroke="currentColor"
                                                                                            strokeWidth="4"
                                                                                        ></circle>
                                                                                        <path
                                                                                            className="opacity-75"
                                                                                            fill="currentColor"
                                                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                                        ></path>
                                                                                    </svg>
                                                                                    <span>Optimizing...</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {!hasPremiumAccess(isPremium) && (
                                                                                        <svg
                                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                                            width="14"
                                                                                            height="14"
                                                                                            viewBox="0 0 24 24"
                                                                                            fill="none"
                                                                                            stroke="currentColor"
                                                                                            strokeWidth="2"
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                            className="text-zinc-400 mr-1"
                                                                                        >
                                                                                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                                                        </svg>
                                                                                    )}
                                                                                    <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        width="14"
                                                                                        height="14"
                                                                                        viewBox="0 0 24 24"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        strokeWidth="2"
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        className="text-purple-400"
                                                                                    >
                                                                                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" />
                                                                                        <path d="M5 3v4" />
                                                                                        <path d="M3 5h4" />
                                                                                        <path d="M19 17v4" />
                                                                                        <path d="M17 19h4" />
                                                                                    </svg>
                                                                                    <span>Optimize</span>
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                        {isDescriptionModified && originalDescription && (
                                                                            <Button
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    form.setValue("desc", originalDescription);
                                                                                    setIsDescriptionModified(false);
                                                                                    setIsPreview(true);
                                                                                    toast({
                                                                                        title: "Description restored",
                                                                                        description: "Original description has been restored.",
                                                                                    });
                                                                                }}
                                                                                className="border border-white/10 bg-transparent text-zinc-300 hover:bg-amber-800/30 hover:text-amber-200 hover:ring-1 hover:ring-amber-500/50 rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                                                                                title="Undo Optimization"
                                                                            >
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    width="14"
                                                                                    height="14"
                                                                                    viewBox="0 0 24 24"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="2"
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    className="text-amber-400"
                                                                                >
                                                                                    <path d="M3 7v6h6" />
                                                                                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                                                                </svg>
                                                                                <span>Undo</span>
                                                                            </Button>
                                                                        )}

                                                                        <Button
                                                                            disabled={isGeneratingPR || isDescriptionModified || !hasPremiumAccess(isPremium) || (hasPremiumAccess(isPremium) && (generationCount ?? 0) === 0)}
                                                                            onClick={async (e) => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()
                                                                                if (isGeneratingPR || !task || !task.id) return
                                                                                setIsGeneratingPR(true)
                                                                                try {
                                                                                    const metaTokenBeforeFileStructure = document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
                                                                                    const response = await axios.post("/premium/file-structure/get", {
                                                                                        post_id: task.id,
                                                                                    })
                                                                                    if (response.data && response.data.fileStructure) {
                                                                                        setFileStructure(response.data.fileStructure)
                                                                                        setIsFileBrowserOpen(true)
                                                                                    } else {
                                                                                        toast({
                                                                                            title: "Error",
                                                                                            description: "Failed to retrieve file structure",
                                                                                            variant: "destructive",
                                                                                        })
                                                                                    }
                                                                                } catch (error: any) {
                                                                                    // console.error("Error generating PR files:", error)
                                                                                    toast({
                                                                                        title: "Error",
                                                                                        description: axios.isAxiosError(error) ? error.response?.data?.error : error.message || "Failed to generate PR files",
                                                                                        variant: "destructive",
                                                                                    })
                                                                                } finally {
                                                                                    setIsGeneratingPR(false)
                                                                                }
                                                                            }}
                                                                            className="border border-white/10 bg-transparent text-zinc-300 hover:bg-teal-800/30 hover:text-teal-200 hover:ring-1 hover:ring-teal-500/50 rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:opacity-50"
                                                                            title={!hasPremiumAccess(isPremium) ? "This is a paid feature" : isDescriptionModified ? "Save changes before generating PR" : (generationCount ?? 0) === 0 ? "No generations left" : "Generate PR"}
                                                                        >
                                                                            {isGeneratingPR ? (
                                                                                <>
                                                                                    <svg
                                                                                        className="animate-spin h-3.5 w-3.5 text-teal-400"
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        fill="none"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <circle
                                                                                            className="opacity-25"
                                                                                            cx="12"
                                                                                            cy="12"
                                                                                            r="10"
                                                                                            stroke="currentColor"
                                                                                            strokeWidth="4"
                                                                                        ></circle>
                                                                                        <path
                                                                                            className="opacity-75"
                                                                                            fill="currentColor"
                                                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                                        ></path>
                                                                                    </svg>
                                                                                    <span>Generating...</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {(!hasPremiumAccess(isPremium) || (hasPremiumAccess(isPremium) && (generationCount ?? 0) === 0)) && (
                                                                                        <svg
                                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                                            width="14"
                                                                                            height="14"
                                                                                            viewBox="0 0 24 24"
                                                                                            fill="none"
                                                                                            stroke="currentColor"
                                                                                            strokeWidth="2"
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                            className="text-zinc-400 mr-1"
                                                                                        >
                                                                                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                                                        </svg>
                                                                                    )}
                                                                                    <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        width="14"
                                                                                        height="14"
                                                                                        viewBox="0 0 24 24"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        strokeWidth="2"
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                        className="text-teal-400"
                                                                                    >
                                                                                        <circle cx="18" cy="18" r="3" />
                                                                                        <circle cx="6" cy="6" r="3" />
                                                                                        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                                                                                        <path d="M6 9v12" />
                                                                                    </svg>
                                                                                    <span>{isDescriptionModified ? "Save Changes First" : `Generate PR${hasPremiumAccess(isPremium) && generationCount !== null && generationCap !== null ? ` (${generationCount}/${generationCap})` : ""}`}</span>
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        setIsPreview(!isPreview)
                                                                    }}
                                                                    className="border border-white/10 bg-transparent text-zinc-300 hover:bg-amber-800/30 hover:text-amber-200 hover:ring-1 hover:ring-amber-500/50 rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 transition-all focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                                                                    title={isPreview ? "Edit" : "Preview"}
                                                                >
                                                                    {isPreview ? <Edit className="h-4 w-4 text-amber-400" /> : <Eye className="h-4 w-4 text-amber-400" />}
                                                                    <span>{isPreview ? "Edit" : "Preview"}</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <FormControl>
                                                            {isPreview ? (
                                                                <DescriptionPreview htmlContent={field.value} />
                                                            ) : (
                                                                <SimpleEditor
                                                                    value={field.value}
                                                                    onChange={(value) => {
                                                                        field.onChange(value)
                                                                        if (value !== getInitialFormValues().desc) {
                                                                            setIsDescriptionModified(true)
                                                                        }
                                                                    }}
                                                                    assignees={editorAssignees}
                                                                    className="p-4"
                                                                />
                                                            )}
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-4 min-w-[200px]">
                                            <FormField
                                                control={form.control}
                                                name="fid_board"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Board</FormLabel>
                                                        <Select
                                                            open={boardSelectOpen}
                                                            onOpenChange={(open) => {
                                                                setBoardSelectOpen(open);
                                                                if (!open) {
                                                                    setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 10);
                                                                }
                                                            }}
                                                            onValueChange={handleSelectChange(field.onChange, setBoardSelectOpen)}
                                                            value={field.value || ""}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-zinc-500 focus:outline-none focus:ring-0">
                                                                    <SelectValue placeholder="Select board" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-800 text-white border-zinc-700">
                                                                {boards.map((board) => (
                                                                    <SelectItem key={board.id} value={board.id.toString()} className="focus:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                                                                        {board.title}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
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
                                                        <Select
                                                            open={columnSelectOpen}
                                                            onOpenChange={(open) => {
                                                                setColumnSelectOpen(open);
                                                                if (!open) {
                                                                    setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 10);
                                                                }
                                                            }}
                                                            onValueChange={handleSelectChange(field.onChange, setColumnSelectOpen)}
                                                            value={field.value || ""}
                                                            disabled={!availableColumns.length}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-zinc-500 focus:outline-none focus:ring-0">
                                                                    <SelectValue placeholder={availableColumns.length ? "Select column" : "Select a board first"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-800 text-white border-zinc-700">
                                                                {availableColumns.map((col) => (
                                                                    <SelectItem
                                                                        key={col}
                                                                        value={col}
                                                                        className="hover:bg-zinc-700 focus:bg-zinc-700"
                                                                    >
                                                                        {col}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
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
                                                        <Select
                                                            open={prioritySelectOpen}
                                                            onOpenChange={(open) => {
                                                                setPrioritySelectOpen(open);
                                                                if (!open) {
                                                                    setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 10);
                                                                }
                                                            }}
                                                            onValueChange={handleSelectChange(field.onChange, setPrioritySelectOpen)}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-zinc-500 focus:outline-none focus:ring-0">
                                                                    <SelectValue placeholder="Select priority" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-800 text-white border-zinc-700">
                                                                {priorities.map((priority) => (
                                                                    <SelectItem
                                                                        key={priority}
                                                                        value={priority}
                                                                        className="focus:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                                                    >
                                                                        {priority}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            {task && (
                                                <FormItem>
                                                    <FormLabel className="text-white">Author</FormLabel>
                                                    <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded-md border border-zinc-700">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-white">{assignees.find((a) => a.id.toString() === task.post_author?.toString())?.name || task.post_author || 'Unknown Author'}</span>
                                                        </div>
                                                    </div>
                                                </FormItem>
                                            )}
                                            <FormField
                                                control={form.control}
                                                name="assignee_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-white">Assignee</FormLabel>
                                                        <Select
                                                            open={assigneeSelectOpen}
                                                            onOpenChange={(open) => {
                                                                setAssigneeSelectOpen(open);
                                                                if (!open) {
                                                                    setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 10);
                                                                }
                                                            }}
                                                            onValueChange={handleSelectChange(field.onChange, setAssigneeSelectOpen)}
                                                            value={field.value || ""}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-zinc-500 focus:outline-none focus:ring-0">
                                                                    <SelectValue placeholder="Select assignee" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-800 text-white border-zinc-700">
                                                                {assignees.map((assignee) => (
                                                                    <SelectItem key={assignee.id} value={assignee.id.toString()} className="focus:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                                                                        {assignee.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="deadline"
                                                render={({ field }) => {
                                                    const dateValue = field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : null;
                                                    return (
                                                        <FormItem className="flex flex-col mt-2">
                                                            <FormLabel className="text-white">Deadline</FormLabel>
                                                            <Popover 
                                                                open={deadlinePopoverOpen} 
                                                                onOpenChange={(open) => {
                                                                    setDeadlinePopoverOpen(open);
                                                                    if (!open) {
                                                                        setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 10);
                                                                    }
                                                                }}
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant="outline"
                                                                            className={cn(
                                                                                "w-full pl-3 text-left font-normal bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500",
                                                                                !field.value && "text-muted-foreground",
                                                                            )}
                                                                        >
                                                                            {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <Portal>
                                                                    <PopoverContent
                                                                        side="bottom"
                                                                        align="start"
                                                                        sideOffset={4}
                                                                        className="z-[9999] w-auto p-0 bg-zinc-700 pointer-events-auto"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <div onClick={(e) => e.stopPropagation()}>
                                                                            <Calendar
                                                                                mode="single"
                                                                                selected={dateValue || undefined}
                                                                                onSelect={(date) => {
                                                                                    field.onChange(date ? format(date, "yyyy-MM-dd") : null);
                                                                                    setTimeout(() => setDeadlinePopoverOpen(false), 0);
                                                                                    setTimeout(() => dialogContentRef.current?.focus({ preventScroll: true }), 0);
                                                                                }}
                                                                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date < new Date("1900-01-01")}
                                                                                initialFocus
                                                                                className="bg-zinc-800 border-zinc-700 text-white"
                                                                                classNames={{
                                                                                    day: "h-9 w-9 p-0 font-normal rounded-md relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-800 hover:bg-zinc-500 hover:text-white aria-selected:opacity-100",
                                                                                    day_selected: "bg-zinc-600 text-white rounded-md hover:bg-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-800 aria-selected:bg-zinc-600",
                                                                                    day_today: "aria-selected:opacity-100 rounded-md", // Keep today noticeable but ensure selected/hover overrides
                                                                                    head_cell: "text-zinc-400 rounded-md w-9 font-normal text-[0.8rem]",
                                                                                    nav_button: "h-6 w-6 hover:bg-zinc-700 rounded-md",
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Portal>
                                                            </Popover>
                                                            <FormMessage className="text-red-400" />
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                            {task && (
                                                <div className="mt-4">
                                                    <h3 className="text-white font-medium mb-2">Branches</h3>
                                                    <div
                                                        className="bg-zinc-800 rounded-md border border-zinc-700 p-2 max-h-[150px] overflow-y-auto"
                                                        title={!hasPremiumAccess(isPremium) ? "This is a paid feature" : ""}
                                                    >
                                                        {!hasPremiumAccess(isPremium) ? (
                                                            <div className="flex items-center py-2">
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="16"
                                                                    height="16"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="text-zinc-400 mr-2"
                                                                >
                                                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                                </svg>
                                                                <span className="text-sm text-zinc-400">This is a paid feature</span>
                                                            </div>
                                                        ) : isLoadingBranches ? (
                                                            <div className="flex items-center justify-center py-2">
                                                                <svg
                                                                    className="animate-spin h-5 w-5 text-white"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <circle
                                                                        className="opacity-25"
                                                                        cx="12"
                                                                        cy="12"
                                                                        r="10"
                                                                        stroke="currentColor"
                                                                        strokeWidth="4"
                                                                    ></circle>
                                                                    <path
                                                                        className="opacity-75"
                                                                        fill="currentColor"
                                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                    ></path>
                                                                </svg>
                                                                <span className="ml-2 text-sm text-zinc-300">Loading branches...</span>
                                                            </div>
                                                        ) : branches.length > 0 ? (
                                                            <ul className="space-y-1">
                                                                {branches.map((branch, index) => (
                                                                    <li key={index} className="text-sm">
                                                                        <a
                                                                            href={branch.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-teal-400 hover:text-teal-300 hover:underline flex items-center"
                                                                        >
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                width="16"
                                                                                height="16"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                className="mr-1"
                                                                            >
                                                                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                                                                <circle cx="18" cy="6" r="3"></circle>
                                                                                <circle cx="6" cy="18" r="3"></circle>
                                                                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                                                                            </svg>
                                                                            {branch.name}
                                                                        </a>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-zinc-400 py-1">No branches available for this post.</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={fetchBranches}
                                                        disabled={!hasPremiumAccess(isPremium)}
                                                        className={`mt-2 text-xs ${!hasPremiumAccess(isPremium) ? "text-zinc-600" : "text-zinc-400 hover:text-white"} flex items-center`}
                                                        title={!hasPremiumAccess(isPremium) ? "This is a paid feature" : "Refresh branches"}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="12"
                                                            height="12"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="mr-1"
                                                        >
                                                            <path d="M21 2v6h-6"></path>
                                                            <path d="M3 12a9 9 0 0 1 15-6.7l3-3"></path>
                                                            <path d="M3 12a9 9 0 0 0 15 6.7l3 3"></path>
                                                        </svg>
                                                        Refresh
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </Form>
                            {task && task.comments && <CommentSection taskId={task.id} currentUserId={authUserId} assignees={assignees} />}
                            {task && <ActivityHistory postId={task.id} />}
                            {task && <LinkedIssuesSection taskId={task.id} currentUserId={authUserId} />}
                        </div>

                        <div className="mt-6">
                            <Button type="submit" onClick={form.handleSubmit(onSubmit)} className="w-full bg-white text-zinc-900 hover:bg-zinc-100">
                                {task ? "Update" : "Submit"}
                            </Button>
                        </div>
                    </DialogContent>

            </Dialog>
            {showDeleteConfirmation && <DeleteConfirmationDialog
                id={task?.id ?? ""}
                type="Post"
                isOpen={true}
                onClose={handleDialogClose}
                onSuccessfulDelete={handlePostDeletedSuccessfully}
            />}
            {isFileBrowserOpen && (
                <FileBrowser
                    isOpen={isFileBrowserOpen}
                    onClose={() => setIsFileBrowserOpen(false)}
                    fileStructure={fileStructure}
                    onFilesSelected={async (files) => {
                        setSelectedPRFiles(files)
                        setIsFileBrowserOpen(false)

                        if (!task || !task.id) {
                            toast({
                                title: "Error",
                                description: "Task not found for PR generation.",
                                variant: "destructive",
                            });
                            setIsGeneratingPR(false);
                            return;
                        }
                        setIsGeneratingPR(true)

                        try {
                            const metaTokenBeforeGeneratePR = document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
                            const { data } = await axios.post("/premium/generate/pr", {
                                post_id: task.id,
                                context_files: files,
                            })
                            if ((generationCount ?? 0) < 1) {
                                toast({
                                    title: "Generation count",
                                    description: "You have no generations left this week.",
                                    variant: "destructive",
                                })
                                setIsGeneratingPR(false);
                                return
                            }

                            if (data?.success) {
                                toast({
                                    title: "Queued successfully!",
                                    description: data.message,
                                })
                                setGenerationCount((generationCount ?? 1) - 1)
                                await fetchBranches()
                            } else {
                                toast({
                                    title: "Branch failed",
                                    description: data?.message || "Unknown error occurred.",
                                    variant: "destructive",
                                })
                                setIsGeneratingPR(false)
                            }
                        } catch (err: any) {
                            const message = axios.isAxiosError(err) ? err.response?.data?.message : err.message;
                            toast({
                                title: "Branch failed",
                                description: message || "An unexpected error occurred while generating the pull request.",
                                variant: "destructive",
                            })
                            setIsGeneratingPR(false)
                        }
                    }}
                    postId={task?.id}
                />
            )}
        </>
    )
}

export default React.memo(PostFormDialog)
