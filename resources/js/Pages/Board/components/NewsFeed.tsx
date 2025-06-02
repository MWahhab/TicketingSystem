"use client"

import React, { useState, useEffect } from "react"
import { usePage, Head, Link } from "@inertiajs/react"
import { format } from "date-fns"
import { Calendar, ChevronDown, User, Activity, Clock, AlertCircle, GitBranch, CheckCircle, ArrowLeft, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateFilter } from "./DateFilter"

interface Notification {
    [key: string]: string[]
}

interface FeedItem {
    id: number
    notifications?: Record<string, string[]>
}

interface FeedSection {
    [postTitle: string]: FeedItem
}

interface FeedData {
    personal_feed: {
        worked_on: FeedSection
        tagged_in: FeedSection
        commented_on: FeedSection
        created: FeedSection
        generated_branches: FeedSection
        done_this_week: FeedSection
    }
    overview_feed: {
        activity_on: FeedSection
        upcoming_deadlines: FeedSection
        blocked_issues: FeedSection
        done_this_week: FeedSection
        generated_branches: FeedSection
    }
}

interface Board {
    id: string
    title: string
}

interface User {
    id: number
    name: string
}

const FEED_ICONS = {
    worked_on: Activity,
    tagged_in: User,
    commented_on: Activity,
    created: Activity,
    generated_branches: GitBranch,
    done_this_week: CheckCircle,
    activity_on: Activity,
    upcoming_deadlines: Clock,
    blocked_issues: AlertCircle,
}

export default function NewsFeed() {
    const { boards, users, authUserId } = usePage().props as any
    
    const [selectedBoard, setSelectedBoard] = useState<string | null>(boards?.[0]?.id || null)
    const [selectedUser, setSelectedUser] = useState<number | null>(authUserId || null)
    const [feedData, setFeedData] = useState<FeedData | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("personal")
    const [dateFrom, setDateFrom] = useState<Date | null>(null)
    const [dateTo, setDateTo] = useState<Date | null>(null)
    const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({})

    const PERSONAL_FEED_ORDER = [
        'worked_on',
        'tagged_in',
        'commented_on',
        'created',
        'generated_branches',
        'done_this_week',
    ]
    
    const OVERVIEW_FEED_ORDER = [
        'activity_on',
        'upcoming_deadlines',
        'blocked_issues',
        'done_this_week',
        'generated_branches',
    ]
    
    const FEED_LABELS = {
        worked_on: 'Worked on',
        tagged_in: 'Tagged in',
        commented_on: 'Commented on',
        created: 'Created',
        generated_branches: 'Generated branches',
        done_this_week: 'Done this week',
        activity_on: 'Activity on',
        upcoming_deadlines: 'Upcoming deadlines',
        blocked_issues: 'Blocked issues',
    }

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const fetchFeedData = async () => {
        if (!selectedBoard) return

        setLoading(true)
        try {
            const params = new URLSearchParams({
                fid_board: selectedBoard.toString(),
                ...(selectedUser && activeTab === "personal" && { fid_user: selectedUser.toString() }),
                ...(dateFrom && { dateFrom: format(dateFrom, "yyyy-MM-dd") }),
                ...(dateTo && { dateTo: format(dateTo, "yyyy-MM-dd") }),
            })

            const response = await window.axios.get(`/newsfeed?${params.toString()}`)
            setFeedData(response.data)
        } catch (error) {
            console.error("Error fetching feed data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFeedData()
    }, [selectedBoard, selectedUser, activeTab, dateFrom, dateTo])

    const handleDateFilterApply = (from: Date | null, to: Date | null) => {
        setDateFrom(from)
        setDateTo(to)
    }

    const handleDateFilterClear = () => {
        setDateFrom(null)
        setDateTo(null)
    }

    const toggleNotifications = (postKey: string) => {
        setExpandedPosts((prev) => ({
            ...prev,
            [postKey]: !prev[postKey],
        }))
    }

    const renderFeedSection = (title: string, data: FeedSection) => {
        const Icon = FEED_ICONS[title as keyof typeof FEED_ICONS] || Activity
        const isEmpty = Object.keys(data).length === 0
        return (
            <div key={title} id={`category-${title}`} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-base font-semibold text-zinc-100 capitalize">
                        {title.replace(/_/g, " ")}
                    </h3>
                </div>
                {isEmpty ? (
                    <div className="text-sm text-zinc-500 italic pl-6">No activity</div>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(data).map(([postTitle, item]) => {
                            const postKey = `${title}-${item.id}`
                            const hasNotifications = item.notifications && Object.keys(item.notifications).length > 0
                            const expanded = expandedPosts[postKey]
                            return (
                                <div
                                    key={postKey}
                                    className="bg-zinc-900 border border-white/10 rounded-lg p-3 hover:bg-zinc-800/70 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <a
                                            href={`/boards?board_id=${selectedBoard}&openTask=${item.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-base font-semibold text-zinc-100 hover:text-primary transition-colors block text-left"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            {postTitle}
                                        </a>
                                        {hasNotifications && (
                                            <button
                                                onClick={() => toggleNotifications(postKey)}
                                                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 focus:outline-none"
                                            >
                                                {expanded ? 'Hide contributions' : 'Show contributions'}
                                                {expanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {hasNotifications && expanded && (
                                        <div className="ml-4 mt-4 relative">
                                            {/* Vertical timeline line */}
                                            <div className="absolute left-0 top-2 bottom-2 w-px bg-zinc-700"></div>
                                            
                                            {/* Flatten all notifications into a single array */}
                                            {Object.entries(item.notifications!)
                                                .flatMap(([type, notifications]) => 
                                                    notifications.map(notification => ({ type, notification }))
                                                )
                                                .map((item, idx, arr) => (
                                                    <div key={`${item.type}-${idx}`} className={`relative flex items-start ${idx < arr.length - 1 ? 'mb-5' : ''}`}>
                                                        {/* Timeline dot */}
                                                        <div className="absolute left-0 w-2 h-2 bg-zinc-600 rounded-full -translate-x-[3.5px] mt-1.5 z-10"></div>
                                                        
                                                        {/* Notification content */}
                                                        <div className="ml-5 text-xs text-zinc-400 leading-relaxed font-sans">
                                                            {item.notification}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <Head title="News Feed" />
            
            <div className="min-h-screen bg-gradient-to-br from-zinc-850 to-zinc-950 text-zinc-200">
                <div className="max-w-7xl mx-auto p-6 flex">
                    {/* Legend Sidebar */}
                    <div className="hidden md:flex flex-col sticky top-6 h-fit mr-8 min-w-[180px]">
                        <div className="mb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-2">Jump to</div>
                        <div className="space-y-1">
                            {(() => {
                                const currentOrder = activeTab === 'personal' ? PERSONAL_FEED_ORDER : OVERVIEW_FEED_ORDER
                                const currentFeed = activeTab === 'personal' ? feedData?.personal_feed : feedData?.overview_feed
                                
                                return currentOrder.map((cat) => {
                                    if (!currentFeed || !(cat in currentFeed)) return null
                                    
                                    const Icon = FEED_ICONS[cat as keyof typeof FEED_ICONS] || Activity
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => scrollToSection(`category-${cat}`)}
                                            className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                                        >
                                            <Icon className="h-4 w-4 text-zinc-400" />
                                            <span className="text-sm font-medium">{FEED_LABELS[cat as keyof typeof FEED_LABELS]}</span>
                                        </button>
                                    )
                                })
                            })()}
                        </div>
                    </div>
                    {/* Main Feed Content */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-semibold text-zinc-100 mb-2">News Feed</h1>
                                <p className="text-sm text-zinc-400">Track activity across your projects</p>
                            </div>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-white/10 rounded-md hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </div>
                        <div className="flex gap-2 mb-6">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all"
                                    >
                                        {boards?.find((b: Board) => b.id == selectedBoard)?.title || "Select Board"}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl">
                                    {boards?.map((board: Board) => (
                                        <DropdownMenuItem
                                            key={board.id}
                                            onClick={() => setSelectedBoard(board.id)}
                                            className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer rounded-sm"
                                        >
                                            {board.title}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {activeTab === "personal" && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all"
                                        >
                                            {users?.find((u: User) => u.id == selectedUser)?.name || "Select User"}
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl">
                                        {users?.map((user: User) => (
                                            <DropdownMenuItem
                                                key={user.id}
                                                onClick={() => setSelectedUser(user.id)}
                                                className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer rounded-sm"
                                            >
                                                {user.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <DateFilter
                                onApplyFilter={(from, to) => handleDateFilterApply(from, to)}
                                onClearFilter={handleDateFilterClear}
                                initialDateFrom={dateFrom}
                                initialDateTo={dateTo}
                                className={(dateFrom || dateTo) ? "ring-2 ring-primary ring-offset-1 ring-offset-zinc-800" : ""}
                            />
                        </div>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 border border-white/10">
                                <TabsTrigger
                                    value="personal"
                                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
                                >
                                    Involved In
                                </TabsTrigger>
                                <TabsTrigger
                                    value="overview"
                                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
                                >
                                    Overall
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="personal" className="mt-6">
                                <ScrollArea className="h-[calc(100vh-300px)]">
                                    {loading ? (
                                        <div className="text-center text-zinc-400 py-8">Loading...</div>
                                    ) : feedData ? (
                                        <div className="pr-4">
                                            {PERSONAL_FEED_ORDER.map((key) => {
                                                const data = feedData.personal_feed[key as keyof typeof feedData.personal_feed]
                                                if (!data) return null
                                                return renderFeedSection(key, data)
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center text-zinc-400 py-8">No data available</div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="overview" className="mt-6">
                                <ScrollArea className="h-[calc(100vh-300px)]">
                                    {loading ? (
                                        <div className="text-center text-zinc-400 py-8">Loading...</div>
                                    ) : feedData ? (
                                        <div className="pr-4">
                                            {OVERVIEW_FEED_ORDER.map((key) => {
                                                const data = feedData.overview_feed[key as keyof typeof feedData.overview_feed]
                                                if (!data) return null
                                                return renderFeedSection(key, data)
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center text-zinc-400 py-8">No data available</div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </>
    )
} 