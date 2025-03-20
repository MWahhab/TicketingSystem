"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import {
    LinkIcon,
    SendIcon,
    PlusIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    XIcon,
    ArrowRightIcon,
    Trash2Icon,
    EditIcon,
    SearchIcon,
    PlusCircleIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import axios from "axios"
import { useBoardContext } from "../BoardContext"

interface LinkType {
    name: string
    value: string
}

interface LinkedIssue {
    id: string
    relatedPostId: string
    relatedPostTitle: string
    linkType: string
    userId: string
    userName: string
    createdAt: string
    fid_board?: string
}

interface LinkedIssuesSectionProps {
    taskId: string
    currentUserId: string
}

const linkedIssueSchema = z.object({
    linkType: z.string().min(1, "Link type is required"),
    relatedPostId: z.coerce.string().min(1, "Related issue is required"),
})

const editLinkTypeSchema = z.object({
    linkType: z.string().min(1, "Link type is required"),
})

const LinkedIssuesSection: React.FC<LinkedIssuesSectionProps> = ({ taskId, currentUserId }) => {
    const [linkedIssues, setLinkedIssues] = useState<LinkedIssue[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [isLinkedIssuesExpanded, setIsLinkedIssuesExpanded] = useState(false)
    const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [currentEditingIssue, setCurrentEditingIssue] = useState<LinkedIssue | null>(null)
    const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null)
    const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1)
    const [isIssueSelected, setIsIssueSelected] = useState(false)

    const { openDialog } = useBoardContext()

    const handleIssueClick = (issueId: string) => {
        openDialog(issueId)
    }

    useEffect(() => {
        if (taskId) {
            loadLinkedIssues()
        }
    }, [taskId])

    useEffect(() => {
        setSelectedResultIndex(searchResults.length > 0 ? 0 : -1)
    }, [searchResults])

    const loadLinkedIssues = async () => {
        try {
            const response = await axios.get(`/linkedIssues?fid_origin_post=${taskId}`)
            const data = response.data

            if (data.link_types) {
                setLinkTypes(Array.isArray(data.link_types) ? data.link_types : [])
            } else {
                try {
                    const typesResponse = await axios.get("/linkTypes")
                    setLinkTypes(Array.isArray(typesResponse.data) ? typesResponse.data : [])
                } catch (error) {
                    console.error("Error loading link types:", error)
                }
            }

            const issues = Array.isArray(data) ? data : data.issues || []

            setLinkedIssues(
                issues.map((issue) => ({
                    id: issue.id.toString(),
                    relatedPostId: issue.fid_related_post?.toString() || "Unknown",
                    relatedPostTitle: issue.related_post?.title || "Unknown Issue",
                    linkType: issue.link_type || "Unknown",
                    userId: issue.fid_user?.toString() || "Unknown",
                    userName: issue.creator?.name || "Unknown User",
                    createdAt: issue.created_at?.toString() || "Unknown Date",
                    fid_board: issue.related_post?.fid_board?.toString() || "",
                })),
            )
        } catch (error) {
            console.error("Error loading linked issues:", error)
        }
    }

    const linkedIssueForm = useForm({
        resolver: zodResolver(linkedIssueSchema),
        defaultValues: {
            linkType: "",
            relatedPostId: "",
            searchQuery: "",
        },
    })

    const editLinkTypeForm = useForm({
        resolver: zodResolver(editLinkTypeSchema),
        defaultValues: {
            linkType: "",
        },
    })

    const searchIssues = (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        setIsSearching(true)
        axios
            .get(`/postSearch?query=${encodeURIComponent(query)}`)
            .then((response) => {
                setSearchResults(Array.isArray(response.data) ? response.data : [])
            })
            .catch((error) => {
                console.error("Error searching issues:", error)
            })
            .finally(() => {
                setIsSearching(false)
            })
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)
        setIsIssueSelected(false)

        if (searchTimeoutId) {
            clearTimeout(searchTimeoutId)
        }

        const timeoutId = setTimeout(() => {
            searchIssues(query)
        }, 800)

        setSearchTimeoutId(timeoutId)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (searchResults.length === 0) return

        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev))
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : 0))
        }
        else if (e.key === "Enter" && selectedResultIndex >= 0) {
            e.preventDefault()
            selectIssue(searchResults[selectedResultIndex])
        }
    }

    const selectIssue = (issue: any) => {
        linkedIssueForm.setValue("relatedPostId", issue.id.toString())
        setSearchQuery(issue.title)
        setSearchResults([])
        setIsIssueSelected(true)
    }

    const addLinkedIssue = (values: any) => {
        const { linkType, relatedPostId } = values

        if (linkType && relatedPostId) {
            const data = {
                fid_origin_post: String(taskId),
                fid_related_post: String(relatedPostId),
                link_type: linkType,
            }

            axios
                .post("/linkedIssues", data)
                .then((response) => {
                    const newLinkedIssue = response.data

                    if (newLinkedIssue.id) {
                        const formattedNewLinkedIssue = {
                            id: newLinkedIssue.id.toString(),
                            relatedPostId: newLinkedIssue.fid_related_post.toString(),
                            relatedPostTitle: newLinkedIssue.related_post?.title || "Unknown Issue",
                            linkType: newLinkedIssue.link_type,
                            userId: newLinkedIssue.fid_user.toString(),
                            userName: newLinkedIssue.creator?.name || "Unknown User",
                            createdAt: newLinkedIssue.created_at.toString(),
                        }
                        setLinkedIssues((prevLinkedIssues) => [formattedNewLinkedIssue, ...prevLinkedIssues])
                    }
                    linkedIssueForm.reset()
                    setIsExpanded(false)
                    setSearchQuery("")
                    setIsIssueSelected(false)
                })
                .catch((error) => {
                    console.error(error)
                })
        }
    }

    const openEditDialog = (issue: LinkedIssue) => {
        setCurrentEditingIssue(issue)
        editLinkTypeForm.setValue("linkType", issue.linkType)
        setIsEditDialogOpen(true)
    }

    const updateLinkType = (values: any) => {
        if (!currentEditingIssue) return

        const { linkType } = values

        axios
            .put(`/linkedIssues/${currentEditingIssue.id}`, { link_type: linkType })
            .then((response) => {
                const updatedIssue = response.data

                setLinkedIssues((prevLinkedIssues) =>
                    prevLinkedIssues.map((issue) =>
                        issue.id === currentEditingIssue.id
                            ? {
                                ...issue,
                                linkType: updatedIssue.link_type,
                            }
                            : issue,
                    ),
                )

                setIsEditDialogOpen(false)
                setCurrentEditingIssue(null)
            })
            .catch((error) => {
                if (error.response && error.response.status === 403) {
                    alert("You are not authorized to edit this linked issue.")
                } else {
                    console.error(error)
                }
            })
    }

    const deleteLinkedIssue = (linkedIssueId: string) => {
        axios
            .delete(`/linkedIssues/${linkedIssueId}`)
            .then(() => {
                setLinkedIssues((prevLinkedIssues) => prevLinkedIssues.filter((issue) => issue.id !== linkedIssueId))
            })
            .catch((error) => {
                if (error.response && error.response.status === 403) {
                    alert("You are not authorized to delete this linked issue.")
                } else {
                    console.error(error)
                }
            })
    }

    const getLinkTypeColor = (linkType) => {
        const colors = {
            blocks: "bg-red-900 text-red-200",
            "blocked by": "bg-orange-900 text-orange-200",
            duplicates: "bg-blue-900 text-blue-200",
            "duplicated by": "bg-blue-900 text-blue-200",
            "relates to": "bg-purple-900 text-purple-200",
        }
        return colors[linkType] || "bg-zinc-700 text-zinc-300"
    }

    const getIssueTypeColor = (issue: any) => {
        const type = issue.type || "default"
        const colors = {
            Bug: "bg-red-500",
            Feature: "bg-blue-500",
            Task: "bg-green-500",
            default: "bg-zinc-500",
        }
        return colors[type] || colors.default
    }

    return (
        <>
            <Card className="mt-8 bg-zinc-700 border-zinc-600">
                <CardHeader
                    className="pb-3 cursor-pointer select-none"
                    onClick={() => setIsLinkedIssuesExpanded(!isLinkedIssuesExpanded)}
                >
                    <div className="flex items-center justify-between text-zinc-100">
                        <div className="flex items-center gap-2 font-semibold">
                            <LinkIcon className="h-5 w-5" />
                            <span>Linked Issues</span>
                            <div className="bg-purple-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                                {linkedIssues.length}
                            </div>
                        </div>
                        {isLinkedIssuesExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                    </div>
                </CardHeader>
                {isLinkedIssuesExpanded && (
                    <CardContent className="space-y-3">
                        <Form {...linkedIssueForm}>
                            <form onSubmit={linkedIssueForm.handleSubmit(addLinkedIssue)}>
                                {isExpanded ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-[1fr_2fr] gap-2">
                                            <FormField
                                                control={linkedIssueForm.control}
                                                name="linkType"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-zinc-800 text-zinc-300 border-zinc-700 focus:border-zinc-600 focus:ring-zinc-600">
                                                                    <SelectValue placeholder="Link type" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                                                {linkTypes.map((type, index) => (
                                                                    <SelectItem
                                                                        className="hover:bg-zinc-700 hover:text-white"
                                                                        key={`${type.value}-${index}`}
                                                                        value={type.value}
                                                                    >
                                                                        {type.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-red-400" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={linkedIssueForm.control}
                                                name="relatedPostId"
                                                render={({ field }) => (
                                                    <FormItem className="relative">
                                                        <FormControl>
                                                            <div className="relative">
                                                                <div className="relative">
                                                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                                                    <Input
                                                                        placeholder="Search for issues..."
                                                                        value={searchQuery}
                                                                        onChange={handleSearchChange}
                                                                        onKeyDown={handleKeyDown}
                                                                        className="bg-zinc-800 text-zinc-300 border-zinc-700 focus:border-zinc-600 focus:ring-zinc-600 pl-9 pr-8"
                                                                    />
                                                                    {searchQuery && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-zinc-400"
                                                                            onClick={() => {
                                                                                setSearchQuery("")
                                                                                setSearchResults([])
                                                                                linkedIssueForm.setValue("relatedPostId", "")
                                                                                setIsIssueSelected(false)
                                                                            }}
                                                                        >
                                                                            <XIcon className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-red-400" />

                                                        {searchQuery && !isIssueSelected && (
                                                            <div className="absolute z-10 mt-2 w-full bg-zinc-800 border border-zinc-600 rounded-md shadow-lg overflow-hidden">
                                                                <div className="grid gap-1 p-1">
                                                                    {searchResults.length > 0 ? (
                                                                        searchResults.map((issue, index) => (
                                                                            <div
                                                                                key={`${issue.id}-${index}`}
                                                                                className={`group rounded-md overflow-hidden hover:bg-zinc-700 transition-all duration-200 ${
                                                                                    index === selectedResultIndex ? "bg-zinc-700" : ""
                                                                                }`}
                                                                                onClick={() => selectIssue(issue)}
                                                                            >
                                                                                <div className="p-3 flex items-center gap-3">
                                                                                    <div className={`w-1.5 h-12 rounded-sm ${getIssueTypeColor(issue)}`} />
                                                                                    <div className="flex-grow">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-zinc-400 text-sm">#{issue.id}</span>
                                                                                            <span className="text-zinc-200 font-medium">{issue.title}</span>
                                                                                        </div>
                                                                                        <div className="text-xs text-zinc-400 mt-1">
                                                                                            {issue.type || "Issue"} • Created{" "}
                                                                                            {issue.createdAt
                                                                                                ? new Date(issue.createdAt).toLocaleDateString()
                                                                                                : "recently"}
                                                                                        </div>
                                                                                    </div>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            selectIssue(issue)
                                                                                        }}
                                                                                    >
                                                                                        <PlusCircleIcon className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="p-4 text-center text-zinc-400">No search results found</div>
                                                                    )}
                                                                </div>
                                                                {searchResults.length > 5 && (
                                                                    <div className="p-2 bg-zinc-700 text-center text-sm text-zinc-300 hover:bg-zinc-600 cursor-pointer transition-colors">
                                                                        View all results ({searchResults.length})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div></div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setIsExpanded(false)
                                                        linkedIssueForm.reset()
                                                        setSearchQuery("")
                                                        setSearchResults([])
                                                        setIsIssueSelected(false)
                                                    }}
                                                    className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                                                    disabled={linkedIssueForm.formState.isSubmitting}
                                                >
                                                    <SendIcon className="h-4 w-4 mr-2" />
                                                    {linkedIssueForm.formState.isSubmitting ? "Linking..." : "Link Issue"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="flex items-center bg-zinc-800 border border-zinc-700 rounded-md p-2 cursor-text hover:bg-zinc-800/80 hover:border-zinc-600 transition-colors"
                                        onClick={() => setIsExpanded(true)}
                                    >
                                        <PlusIcon className="h-5 w-5 text-zinc-500 mr-2" />
                                        <span className="text-zinc-500">Link an issue...</span>
                                    </div>
                                )}
                            </form>
                        </Form>

                        <Separator className="bg-zinc-700" />

                        <ScrollArea className="max-h-[320px]">
                            {linkedIssues.length > 0 ? (
                                <ul className="space-y-1">
                                    {linkedIssues.map((issue) => {
                                        const linkTypeColor = getLinkTypeColor(issue.linkType)

                                        return (
                                            <li
                                                key={issue.id}
                                                className="bg-zinc-800 rounded-md px-3 py-2 hover:bg-zinc-750 transition-colors group flex items-center cursor-pointer"
                                                onClick={() => {
                                                    window.open(
                                                        `/boards?board_id=${issue.fid_board || ""}&post_id=${issue.relatedPostId}`,
                                                        "_blank",
                                                    )
                                                }}
                                            >
                                                <Badge className={`mr-2 ${linkTypeColor} border-none text-xs`}>{issue.linkType}</Badge>

                                                <ArrowRightIcon className="h-3.5 w-3.5 text-zinc-500 mr-2" />

                                                <div className="font-medium text-zinc-200 flex-1 truncate">
                                                    #{issue.relatedPostId} - {issue.relatedPostTitle}
                                                </div>

                                                <div className="flex items-center gap-2 ml-2 text-xs text-zinc-500">
                                                    <span>{issue.userName}</span>

                                                    {
                                                        <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-zinc-500 hover:text-blue-400"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    openEditDialog(issue)
                                                                }}
                                                            >
                                                                <EditIcon className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-zinc-500 hover:text-red-400"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    deleteLinkedIssue(issue.id)
                                                                }}
                                                            >
                                                                <Trash2Icon className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    }
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : (
                                <div className="text-center py-6 text-zinc-400">No linked issues yet</div>
                            )}
                        </ScrollArea>
                    </CardContent>
                )}
                <style jsx>{`
                    .hide-scrollbar {
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-zinc-800 text-zinc-200 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle>Edit Link Type</DialogTitle>
                    </DialogHeader>

                    <Form {...editLinkTypeForm}>
                        <form onSubmit={editLinkTypeForm.handleSubmit(updateLinkType)} className="space-y-4">
                            <FormField
                                control={editLinkTypeForm.control}
                                name="linkType"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-zinc-800 text-zinc-300 border-zinc-700 focus:border-zinc-600 focus:ring-zinc-600">
                                                    <SelectValue placeholder="Link type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                                {linkTypes.map((type, index) => (
                                                    <SelectItem key={`edit-${type.value}-${index}`} value={type.value}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsEditDialogOpen(false)}
                                    className="bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-white text-zinc-900 hover:bg-zinc-100"
                                    disabled={editLinkTypeForm.formState.isSubmitting}
                                >
                                    {editLinkTypeForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default LinkedIssuesSection

