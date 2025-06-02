"use client"

import { useState, useEffect } from "react"
import { usePage, Head, Link } from "@inertiajs/react"
import { format } from "date-fns"
import {
    ChevronDown,
    Activity,
    Clock,
    GitBranch,
    CheckCircle,
    ArrowLeft,
    ChevronUp,
    Wrench,
    AtSign,
    MessageSquare,
    Plus,
    AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface AppUser {
    id: number
    name: string
}

const FEED_ICONS = {
    worked_on: Wrench,
    tagged_in: AtSign,
    commented_on: MessageSquare,
    created: Plus,
    generated_branches: GitBranch,
    done_this_week: CheckCircle,
    activity_on: Activity,
    upcoming_deadlines: Clock,
    blocked_issues: AlertTriangle,
}

const getPresets = () => {
    const now = new Date()
    const today = new Date(now.setHours(23, 59, 59, 999))

    const startOfToday = new Date(today)
    startOfToday.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const fourteenDaysAgo = new Date(today)
    fourteenDaysAgo.setDate(today.getDate() - 14)

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    return {
        last_week: {
            label: "Last Week",
            from: fourteenDaysAgo,
            to: sevenDaysAgo,
        },
        today: {
            label: "Today",
            from: startOfToday,
            to: today,
        },
        this_week: {
            label: "This Week",
            from: sevenDaysAgo,
            to: today,
        },
        last_month: {
            label: "This Month",
            from: thirtyDaysAgo,
            to: today,
        },
    }
}

export default function NewsFeed() {
    const { boards, users, authUserId } = usePage().props as any

    const [selectedBoard, setSelectedBoard] = useState<string | null>(boards?.[0]?.id || null)
    const [selectedUser, setSelectedUser] = useState<number | null>(authUserId || null)
    const [feedData, setFeedData] = useState<FeedData | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("personal")
    const [datePreset, setDatePreset] = useState<"today" | "this_week" | "last_week" | "last_month">("today")
    const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({})
    const [enabledCategories, setEnabledCategories] = useState<{ [key: string]: boolean }>({})

    const PERSONAL_FEED_ORDER = [
        "worked_on",
        "tagged_in",
        "commented_on",
        "created",
        "generated_branches",
        "done_this_week",
    ]

    const OVERVIEW_FEED_ORDER = [
        "activity_on",
        "upcoming_deadlines",
        "blocked_issues",
        "generated_branches",
        "done_this_week",
    ]

    const FEED_LABELS = {
        worked_on: "Worked on",
        tagged_in: "Tagged in",
        commented_on: "Commented on",
        created: "Created",
        generated_branches: "Generated branches",
        done_this_week: "Done this week",
        activity_on: "Activity on",
        upcoming_deadlines: "Upcoming deadlines",
        blocked_issues: "Blocked issues",
    }

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    const fetchFeedData = async () => {
        if (!selectedBoard) return

        setLoading(true)
        try {
            const presets = getPresets()
            const dateFrom = presets[datePreset].from
            const dateTo = presets[datePreset].to

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
    }, [selectedBoard, selectedUser, activeTab, datePreset])

    useEffect(() => {
        const allCategories = [...PERSONAL_FEED_ORDER, ...OVERVIEW_FEED_ORDER]
        const initialState = allCategories.reduce(
            (acc, category) => {
                acc[category] = true
                return acc
            },
            {} as { [key: string]: boolean },
        )
        setEnabledCategories(initialState)
    }, [])

    const toggleNotifications = (postKey: string) => {
        setExpandedPosts((prev) => ({
            ...prev,
            [postKey]: !prev[postKey],
        }))
    }

    const toggleCategory = (category: string) => {
        setEnabledCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }))
    }

    const renderFeedSection = (title: string, data: FeedSection) => {
        const Icon = FEED_ICONS[title as keyof typeof FEED_ICONS] || Activity
        const isEmpty = Object.keys(data).length === 0
        return (
            <div key={title} id={`category-${title}`} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-base font-semibold text-zinc-100 capitalize">{title.replace(/_/g, " ")}</h3>
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
                                            style={{ textDecoration: "none" }}
                                        >
                                            {postTitle}
                                        </a>
                                        {hasNotifications && (
                                            <button
                                                onClick={() => toggleNotifications(postKey)}
                                                className="flex items-center gap-1 text-s text-zinc-200 hover:text-zinc-100 focus:outline-none"
                                            >
                                                {expanded ? "Hide contributions" : "Show contributions"}
                                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </div>
                                    {hasNotifications && expanded && (
                                        <div className="ml-4 mt-4 relative">
                                            <div className="absolute left-0 top-2 bottom-2 w-px bg-zinc-700"></div>
                                            {Object.entries(item.notifications!)
                                                .flatMap(([type, notifications]) =>
                                                    notifications.map((notification) => ({ type, notification })),
                                                )
                                                .map((item, idx, arr) => (
                                                    <div
                                                        key={`${item.type}-${idx}`}
                                                        className={`relative flex items-start ${idx < arr.length - 1 ? "mb-5" : ""}`}
                                                    >
                                                        <div className="absolute left-0 w-2 h-2 bg-zinc-200 rounded-full -translate-x-[3.5px] mt-1.5 z-10"></div>
                                                        <div className="ml-5 text-xs text-zinc-200 leading-relaxed font-sans">
                                                            {item.notification}
                                                        </div>
                                                    </div>
                                                ))}
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

    const presets = getPresets()

    return (
        <>
            <Head title="News Feed" />

            <div className="min-h-screen bg-gradient-to-br from-zinc-850 to-zinc-950 text-zinc-200">
                <div className="max-w-7xl mx-auto p-6 flex">
                    <div className="hidden md:flex flex-col sticky top-6 h-fit mr-8 min-w-[180px]">
                        <div className="mb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-2">Categories</div>
                        <div className="space-y-1">
                            {(() => {
                                const currentOrder = activeTab === "personal" ? PERSONAL_FEED_ORDER : OVERVIEW_FEED_ORDER
                                const currentFeed = activeTab === "personal" ? feedData?.personal_feed : feedData?.overview_feed

                                return currentOrder.map((cat) => {
                                    if (!currentFeed || !(cat in currentFeed)) return null

                                    const Icon = FEED_ICONS[cat as keyof typeof FEED_ICONS] || Activity
                                    const isEnabled = enabledCategories[cat] !== false

                                    return (
                                        <div key={cat} className="flex items-center gap-3 w-full group">
                                            <button
                                                onClick={() => toggleCategory(cat)}
                                                className={`relative flex-shrink-0 w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center ${
                                                    isEnabled
                                                        ? "bg-zinc-50 border-zinc-50"
                                                        : "border-zinc-600 bg-transparent hover:border-zinc-500"
                                                }`}
                                                title={isEnabled ? "Hide category" : "Show category"}
                                            >
                                                {isEnabled && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="black" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => scrollToSection(`category-${cat}`)}
                                                className={`flex items-center gap-2 flex-1 text-left px-2 py-2 rounded-md transition-all duration-200 ${
                                                    isEnabled
                                                        ? "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 group-hover:bg-zinc-800/50"
                                                        : "text-zinc-500 hover:text-zinc-400 opacity-60"
                                                }`}
                                                disabled={!isEnabled}
                                            >
                                                <Icon
                                                    className={`h-4 w-4 transition-colors ${isEnabled ? "text-zinc-400" : "text-zinc-600"}`}
                                                />
                                                <span className="text-sm font-medium">{FEED_LABELS[cat as keyof typeof FEED_LABELS]}</span>
                                            </button>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    </div>
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
                                            {users?.find((u: AppUser) => u.id == selectedUser)?.name || "Select User"}
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl">
                                        {users?.map((user: AppUser) => (
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
                            <div className="flex gap-1">
                                {Object.entries(presets).map(([key, preset]) => (
                                    <Button
                                        key={key}
                                        variant="ghost"
                                        className={
                                            datePreset === key
                                                ? "bg-zinc-800 text-white border-b-2 border-b-zinc-50 border-x-0 border-t-0 rounded-md font-medium"
                                                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border-0"
                                        }
                                        onClick={() => setDatePreset(key as typeof datePreset)}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
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
                                            {PERSONAL_FEED_ORDER.filter((key) => enabledCategories[key] !== false).map((key) => {
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
                                            {OVERVIEW_FEED_ORDER.filter((key) => enabledCategories[key] !== false).map((key) => {
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
