"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
    ClipboardListIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    AtSignIcon,
    FlagIcon,
    LayoutListIcon as ColumnLayoutIcon,
    UserIcon,
    CalendarIcon,
    MessageSquareIcon,
    EyeIcon,
    LockIcon,
} from "lucide-react"
import axios from "axios"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import DescriptionChangePopup from "./activity-history-components/description-change-popup"
import HTMLRenderer from "./activity-history-components/html-renderer"

interface Activity {
    id: string
    type: string
    content: string
    createdAt: string
    createdBy: string
    seenAt?: string
    user?: {
        id: string
        name: string
        email: string
    } | null
}

interface ActivityHistoryProps {
    postId: string
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ postId }) => {
    const [activities, setActivities] = useState<Activity[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [visibleActivities, setVisibleActivities] = useState<Activity[]>([])
    const [showAllActivities, setShowAllActivities] = useState(false)
    const [subscriptionTier, setSubscriptionTier] = useState("standard")
    const activitiesPerPage = 4

    useEffect(() => {
        loadActivities()
    }, [postId])

    const loadActivities = () => {
        axios
            .get(`/api/activity/${postId}`)
            .then((response) => {
                const fetchedActivities = Object.values(response.data[0]).map((activity: any) => ({
                    id: activity.id,
                    type: activity.type,
                    content: activity.content,
                    createdAt: activity.created_at,
                    createdBy: activity.created_by,
                    seenAt: activity.seen_at,
                    user: activity.user
                        ? {
                            id: activity.user.id,
                            name: activity.user.name,
                            email: activity.user.email,
                        }
                        : null,
                }))

                setActivities(fetchedActivities)
                setVisibleActivities(fetchedActivities.slice(0, activitiesPerPage))
                setSubscriptionTier(response.data[1].subscriptionTier)
            })
            .catch((error) => {
                console.error(error)
            })
    }

    const handleShowAllActivities = () => {
        setVisibleActivities(activities)
        setShowAllActivities(true)
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "mention":
                return <AtSignIcon className="h-4 w-4 text-blue-400" />
            case "priority":
                return <FlagIcon className="h-4 w-4 text-yellow-400" />
            case "column":
                return <ColumnLayoutIcon className="h-4 w-4 text-green-400" />
            case "assignee":
                return <UserIcon className="h-4 w-4 text-purple-400" />
            case "deadline":
                return <CalendarIcon className="h-4 w-4 text-red-400" />
            case "comment":
                return <MessageSquareIcon className="h-4 w-4 text-orange-400" />
            default:
                return <ClipboardListIcon className="h-4 w-4 text-gray-400" />
        }
    }

    const containsHTML = (content: string): boolean => {
        return /<[a-z][\s\S]*>/i.test(content)
    }

    const HTMLPreviewPopup: React.FC<{ content: string }> = ({ content }) => {
        const isNotStandard = subscriptionTier !== "standard"
        const descChange = parseDescriptionChange(content)

        // Dummy content for non-premium users
        const dummyContent = `<h2>Sample Content</h2><p>This is a placeholder for premium content. Upgrade to access the full feature.</p>`
        const displayContent = isNotStandard ? content : dummyContent

        if (!descChange) {
            return (
                <div className="p-4 bg-zinc-800 rounded-md relative">
                    <h3 className="text-sm font-medium text-zinc-100 mb-2">HTML Preview</h3>
                    <div
                        className="p-3 bg-zinc-700 rounded border border-zinc-600 text-zinc-200"
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                    />
                </div>
            )
        }

        return (
            <div className="p-4 bg-zinc-800 rounded-md w-full relative">
                <h3 className="text-sm font-medium text-zinc-100 mb-3">Description Change</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-zinc-400 mb-2">Previous</h4>
                        <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                            <FormattedHTML html={isNotStandard ? descChange.from : dummyContent} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-zinc-400 mb-2">Current</h4>
                        <div className="p-4 bg-zinc-700 rounded border border-zinc-600 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                            <FormattedHTML html={isNotStandard ? descChange.to : dummyContent} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const FormattedHTML: React.FC<{ html: string }> = ({ html }) => {
        const processedHTML = html
            .replace(/<h([1-6])(.*?)>(.*?)<\/h\1>/g, '<h$1$2 style="margin-bottom: 0.5rem; font-weight: 600;">$3</h$1>')
            .replace(/<p(.*?)>(.*?)<\/p>/g, '<p$1 style="margin-bottom: 0.5rem;">$2</p>')
            .replace(/<ul(.*?)>/g, '<ul$1 style="list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem;">')
            .replace(/<ol(.*?)>/g, '<ol$1 style="list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem;">')
            .replace(/<li(.*?)>(.*?)<\/li>/g, '<li$1 style="margin-bottom: 0.25rem;">$2</li>')
            .replace(
                /<span(.*?)>(.*?)<\/span>/g,
                '<span$1 style="background-color: rgba(59, 130, 246, 0.2); color: #fff;">$2</span>',
            )

        return <div dangerouslySetInnerHTML={{ __html: processedHTML }} />
    }

    const parseDescriptionChange = (content: string) => {
        if (content.includes("Desc changed from") && content.includes("to")) {
            try {
                let fromContent = ""
                let toContent = ""

                const fromStartIndex = content.indexOf('from "') + 6
                if (fromStartIndex > 6) {
                    const fromEndIndex = content.indexOf('" to', fromStartIndex)
                    if (fromEndIndex > fromStartIndex) {
                        fromContent = content.substring(fromStartIndex, fromEndIndex)
                    }
                }

                const toStartIndex = content.lastIndexOf('to "') + 4
                if (toStartIndex > 4) {
                    const toEndIndex = content.lastIndexOf('"')
                    if (toEndIndex > toStartIndex) {
                        toContent = content.substring(toStartIndex, toEndIndex)
                    }
                }

                if (!fromContent || !toContent) {
                    const parts = content.split('" to "')
                    if (parts.length >= 2) {
                        fromContent = parts[0].replace('Desc changed from "', "")
                        toContent = parts[1].replace('"', "")
                    }
                }

                return {
                    from: fromContent,
                    to: toContent,
                }
            } catch (error) {
                console.error("Error parsing description change:", error)
                return { from: "", to: "" }
            }
        }
        return null
    }

    const highlightChanges = (oldContent: string, newContent: string) => {
        if (oldContent !== newContent) {
            return newContent
        }
        return newContent
    }

    return (
        <Card className="mt-8 bg-zinc-800 border border-zinc-700">
            <CardHeader className="py-3 px-4 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between text-zinc-100">
                    <div className="flex items-center gap-2 font-semibold">
                        <ClipboardListIcon className="h-5 w-5" />
                        <span>Activity History</span>
                        <div className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                            {activities.length}
                        </div>
                    </div>
                    {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-3">
                    <Separator className="bg-zinc-700" />
                    <ScrollArea className="pr-4 -mr-4 max-h-[440px] overflow-y-auto hide-scrollbar">
                        <div className="space-y-3">
                            {visibleActivities.map((activity) => (
                                <div key={activity.id} className="flex items-start space-x-3 border-b border-zinc-700 last:border-b-0 pb-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-zinc-700 text-zinc-300">{activity.createdBy.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col space-y-1 flex-1 pt-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-zinc-100">{activity.createdBy}</span>
                                            <span className="text-xs text-zinc-500">{new Date(activity.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-zinc-300 pt-1">
                                            <div className="flex items-center space-x-2">
                                                {getActivityIcon(activity.type)}
                                                <span>{activity.content}</span>
                                            </div>

                                            {containsHTML(activity.content) && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button
                                                                        className="ml-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <EyeIcon className="h-4 w-4" />
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[700px] p-0" align="start" sideOffset={5}>
                                                                    {parseDescriptionChange(activity.content) ? (
                                                                        <DescriptionChangePopup
                                                                            oldContent={parseDescriptionChange(activity.content)?.from || ""}
                                                                            newContent={parseDescriptionChange(activity.content)?.to || ""}
                                                                            subscriptionTier={subscriptionTier}
                                                                        />
                                                                    ) : (
                                                                        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-md relative">
                                                                            <h3 className="text-sm font-medium text-zinc-100 mb-2">HTML Preview</h3>
                                                                            <div className="p-4 bg-zinc-800 rounded border border-zinc-700 text-zinc-200 min-h-[200px] max-h-[400px] overflow-auto">
                                                                                <HTMLRenderer
                                                                                    html={
                                                                                        subscriptionTier !== "standard"
                                                                                            ? activity.content
                                                                                            : `<h2>Sample Content</h2><p>This is a placeholder for premium content. Upgrade to access the full feature.</p>`
                                                                                    }
                                                                                />
                                                                            </div>

                                                                            {/* Premium overlay for standard users */}
                                                                            {subscriptionTier !== "standard" && (
                                                                                <div className="absolute inset-0 backdrop-blur-md bg-zinc-900/50 flex flex-col items-center justify-center z-10 rounded">
                                                                                    <LockIcon className="h-10 w-10 text-zinc-400 mb-3" />
                                                                                    <p className="text-zinc-200 font-medium text-center px-6">
                                                                                        This feature is available only for premium users
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </PopoverContent>
                                                            </Popover>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {subscriptionTier !== "standard" ? (
                                                                <p>View rendered HTML</p>
                                                            ) : (
                                                                <p>HTML preview is a premium feature</p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!showAllActivities && activities.length > activitiesPerPage && (
                                <div className="mt-4 text-center">
                                    <Button
                                        onClick={handleShowAllActivities}
                                        variant="secondary"
                                        size="sm"
                                        className="bg-white text-zinc-900 hover:bg-zinc-100"
                                    >
                                        Show All Activities
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    )
}

export default ActivityHistory

