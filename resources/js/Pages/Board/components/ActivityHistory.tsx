"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    FileText,
    Layout,
    Link2,
    GitBranchIcon,
} from "lucide-react"
import axios from "axios"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import DescriptionChangePopup from "./activity-history-components/description-change-popup"
import HTMLRenderer from "./activity-history-components/html-renderer"
import { clsx } from "clsx"
import type { LucideIcon } from 'lucide-react';

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

// Apply dark theme styling similar to PostFormDialog bin button structure
const tabButtonStyles: { [key: string]: { baseText: string, hoverBg: string, hoverText: string, hoverRing: string, activeBg: string, activeText: string, activeRing: string, focusRing: string } } = {
    all: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-zinc-800/50",
        hoverText: "hover:text-zinc-100",
        hoverRing: "hover:ring-zinc-500/30",
        activeBg: "data-[state=active]:bg-zinc-800/50",
        activeText: "data-[state=active]:text-zinc-100",
        activeRing: "data-[state=active]:ring-zinc-500/30",
        focusRing: "focus-visible:ring-zinc-600"
    },
    comment: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-blue-800/50",
        hoverText: "hover:text-blue-100",
        hoverRing: "hover:ring-blue-500/30",
        activeBg: "data-[state=active]:bg-blue-800/50",
        activeText: "data-[state=active]:text-blue-100",
        activeRing: "data-[state=active]:ring-blue-500/30",
        focusRing: "focus-visible:ring-blue-600"
    },
    post: { // Matches 'mention' color scheme potentially
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-green-800/50", // Using green for 'post' related
        hoverText: "hover:text-green-100",
        hoverRing: "hover:ring-green-500/30",
        activeBg: "data-[state=active]:bg-green-800/50",
        activeText: "data-[state=active]:text-green-100",
        activeRing: "data-[state=active]:ring-green-500/30",
        focusRing: "focus-visible:ring-green-600"
    },
    board: { // Matches 'assignee' color scheme potentially
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-purple-800/50",
        hoverText: "hover:text-purple-100",
        hoverRing: "hover:ring-purple-500/30",
        activeBg: "data-[state=active]:bg-purple-800/50",
        activeText: "data-[state=active]:text-purple-100",
        activeRing: "data-[state=active]:ring-purple-500/30",
        focusRing: "focus-visible:ring-purple-600"
    },
    linked_issue: { // Matches 'comment' color scheme potentially
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-orange-800/50",
        hoverText: "hover:text-orange-100",
        hoverRing: "hover:ring-orange-500/30",
        activeBg: "data-[state=active]:bg-orange-800/50",
        activeText: "data-[state=active]:text-orange-100",
        activeRing: "data-[state=active]:ring-orange-500/30",
        focusRing: "focus-visible:ring-orange-600"
    },
    branch: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-teal-800/50",
        hoverText: "hover:text-teal-100",
        hoverRing: "hover:ring-teal-500/30",
        activeBg: "data-[state=active]:bg-teal-800/50",
        activeText: "data-[state=active]:text-teal-100",
        activeRing: "data-[state=active]:ring-teal-500/30",
        focusRing: "focus-visible:ring-teal-600"
    },
    // Added specific types based on getActivityIcon usage
    mention: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-blue-800/50", // Using blue like 'comment'
        hoverText: "hover:text-blue-100",
        hoverRing: "hover:ring-blue-500/30",
        activeBg: "data-[state=active]:bg-blue-800/50",
        activeText: "data-[state=active]:text-blue-100",
        activeRing: "data-[state=active]:ring-blue-500/30",
        focusRing: "focus-visible:ring-blue-600"
    },
    priority: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-yellow-800/50", // Using yellow
        hoverText: "hover:text-yellow-100",
        hoverRing: "hover:ring-yellow-500/30",
        activeBg: "data-[state=active]:bg-yellow-800/50",
        activeText: "data-[state=active]:text-yellow-100",
        activeRing: "data-[state=active]:ring-yellow-500/30",
        focusRing: "focus-visible:ring-yellow-600"
    },
    column: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-green-800/50", // Using green like 'post'
        hoverText: "hover:text-green-100",
        hoverRing: "hover:ring-green-500/30",
        activeBg: "data-[state=active]:bg-green-800/50",
        activeText: "data-[state=active]:text-green-100",
        activeRing: "data-[state=active]:ring-green-500/30",
        focusRing: "focus-visible:ring-green-600"
    },
    assignee: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-purple-800/50", // Using purple like 'board'
        hoverText: "hover:text-purple-100",
        hoverRing: "hover:ring-purple-500/30",
        activeBg: "data-[state=active]:bg-purple-800/50",
        activeText: "data-[state=active]:text-purple-100",
        activeRing: "data-[state=active]:ring-purple-500/30",
        focusRing: "focus-visible:ring-purple-600"
    },
    deadline: {
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-red-800/50", // Using red
        hoverText: "hover:text-red-100",
        hoverRing: "hover:ring-red-500/30",
        activeBg: "data-[state=active]:bg-red-800/50",
        activeText: "data-[state=active]:text-red-100",
        activeRing: "data-[state=active]:ring-red-500/30",
        focusRing: "focus-visible:ring-red-600"
    },
    default: { // Fallback style
        baseText: "text-zinc-300",
        hoverBg: "hover:bg-zinc-800/50",
        hoverText: "hover:text-zinc-100",
        hoverRing: "hover:ring-zinc-500/30",
        activeBg: "data-[state=active]:bg-zinc-800/50",
        activeText: "data-[state=active]:text-zinc-100",
        activeRing: "data-[state=active]:ring-zinc-500/30",
        focusRing: "focus-visible:ring-zinc-600"
    }
}

const ActivityItem: React.FC<{
    activity: Activity;
    subscriptionTier: string;
    IconComponent: LucideIcon | null;
    parseDescriptionChange: (content: string) => { from: string; to: string } | null;
    containsHTML: (content: string) => boolean;
}> = ({ activity, subscriptionTier, IconComponent, parseDescriptionChange, containsHTML }) => {
    return (
        <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-zinc-700 last:border-b-0">
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
                        {IconComponent && <IconComponent className="h-4 w-4 text-zinc-400 flex-shrink-0" />}
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
                                                    {subscriptionTier === "standard" && (
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
    );
};

// Helper function to format activity type names for display
const formatTabName = (typeName: string): string => {
    return typeName
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ')        // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
        .join(' ');       // Join back with spaces
};

// Define all possible tab types based on NotificationTypeEnums
const allPossibleTabTypes = [
    'comment', 
    'post', 
    'linked_issue', 
    'branch'
].sort(); // Sort alphabetically for consistent order

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ postId }) => {
    const [allActivities, setAllActivities] = useState<Activity[]>([])
    const [groupedActivities, setGroupedActivities] = useState<Record<string, Activity[]>>({})
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("All")
    const [subscriptionTier, setSubscriptionTier] = useState("standard")

    useEffect(() => {
        loadActivities()
    }, [postId])

    const loadActivities = () => {
        axios
            .get(`/api/activity/${postId}`)
            .then((response) => {
                const fetchedActivities: Activity[] = Object.values(response.data[0]).map((activity: any) => ({
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

                setAllActivities(fetchedActivities)

                const groups: Record<string, Activity[]> = {}
                fetchedActivities.forEach((activity) => {
                    if (!groups[activity.type]) {
                        groups[activity.type] = []
                    }
                    groups[activity.type].push(activity)
                })
                setGroupedActivities(groups)

                setActiveTab(fetchedActivities.length > 0 ? "All" : Object.keys(groups)[0] || "All")

                setSubscriptionTier(response.data[1].subscriptionTier)
            })
            .catch((error) => {
                console.error(error)
            })
    }

    const getActivityIcon = (type: string): LucideIcon | null => {
        switch (type) {
            case "mention":
                return AtSignIcon;
            case "priority":
                return FlagIcon;
            case "column":
                return ColumnLayoutIcon;
            case "assignee":
                return UserIcon;
            case "deadline":
                return CalendarIcon;
            case "comment":
                return MessageSquareIcon;
            case "post":
                return FileText;
            case "board":
                return Layout;
            case "linked_issue":
                return Link2;
            case "branch":
                return GitBranchIcon;
            default:
                return ClipboardListIcon;
        }
    }

    const containsHTML = (content: string): boolean => {
        return /<[a-z][\s\S]*>/i.test(content)
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

    return (
        <Card className="mt-8 bg-zinc-800 border border-zinc-700">
            <CardHeader className="py-3 px-4 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between text-zinc-100">
                    <div className="flex items-center gap-2 font-semibold">
                        <ClipboardListIcon className="h-5 w-5" />
                        <span>Activity History</span>
                        <div className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                            {allActivities.length}
                        </div>
                    </div>
                    {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-3 pt-3">
                    <Separator className="bg-zinc-700" />

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="flex flex-wrap items-center gap-1 mb-4 bg-transparent p-0 rounded-none text-inherit h-auto">
                            {(() => {
                                const styles = tabButtonStyles['all'];
                                const allTabTrigger = (
                                    <TabsTrigger
                                        key="All"
                                        value="All"
                                        className={clsx(
                                            "border border-zinc-700 bg-zinc-800 rounded-md px-2.5 py-1 text-sm flex items-center gap-1.5 transition-all",
                                            styles.baseText,
                                            styles.hoverBg, styles.hoverText, "hover:ring-1", styles.hoverRing,
                                            styles.activeBg, styles.activeText, "data-[state=active]:ring-1", styles.activeRing
                                        )}
                                    >
                                        All ({allActivities.length})
                                    </TabsTrigger>
                                );

                                // Interleave triggers with separators - Iterate over all possible types
                                const childrenWithSeparators: React.ReactNode[] = [];
                                childrenWithSeparators.push(allTabTrigger);
                                allPossibleTabTypes.forEach((type) => {
                                    const styleKey = type in tabButtonStyles ? type : 'default';
                                    const styles = tabButtonStyles[styleKey];
                                    const count = groupedActivities[type]?.length || 0;
                                    const trigger = (
                                        <TabsTrigger
                                            key={type}
                                            value={type}
                                            className={clsx(
                                                "border border-zinc-700 bg-zinc-800 rounded-md px-2.5 py-1 text-sm flex items-center gap-1.5 transition-all capitalize", // Explicitly set base bg
                                                styles.baseText,
                                                styles.hoverBg, styles.hoverText, "hover:ring-1", styles.hoverRing,
                                                styles.activeBg, styles.activeText, "data-[state=active]:ring-1", styles.activeRing
                                            )}
                                        >
                                            {formatTabName(type)} ({count})
                                        </TabsTrigger>
                                    );
                                    childrenWithSeparators.push(
                                        <Separator key={`sep-${type}`} orientation="vertical" className="h-4 bg-zinc-600 mx-1" />
                                    );
                                    childrenWithSeparators.push(trigger);
                                });

                                return childrenWithSeparators;
                            })()}
                        </TabsList>

                        <ScrollArea className="pr-4 -mr-4 max-h-[400px] overflow-y-auto hide-scrollbar">
                            <TabsContent value="All" className="mt-0 pt-2" tabIndex={-1}>
                                <div className="space-y-3">
                                    {allActivities.map((activity) => {
                                        const Icon = getActivityIcon(activity.type);
                                        return (
                                            <ActivityItem key={activity.id} activity={activity} subscriptionTier={subscriptionTier} IconComponent={Icon} parseDescriptionChange={parseDescriptionChange} containsHTML={containsHTML} />
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* Iterate over all possible types for content rendering */}
                            {allPossibleTabTypes.map((type) => (
                                <TabsContent key={type} value={type} className="mt-0 pt-2" tabIndex={-1}>
                                    <div className="space-y-3">
                                        {/* Map over activities for this type, or empty array if none exist */}
                                        {(groupedActivities[type] || []).map((activity) => {
                                            const Icon = getActivityIcon(activity.type);
                                            return (
                                                <ActivityItem key={activity.id} activity={activity} subscriptionTier={subscriptionTier} IconComponent={Icon} parseDescriptionChange={parseDescriptionChange} containsHTML={containsHTML} />
                                            );
                                        })}
                                    </div>
                                </TabsContent>
                            ))}
                        </ScrollArea>
                    </Tabs>
                </CardContent>
            )}
        </Card>
    )
}

export default ActivityHistory

