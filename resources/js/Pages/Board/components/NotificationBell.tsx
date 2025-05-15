"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Bell, X, MessageSquare, FileText, Layout, Link, GitBranch, MoveDiagonal2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import axios from "axios"
import { useBoardContext } from "../BoardContext"
import { router } from "@inertiajs/react"
import StateMachine from "@/utils/state-machine"
import type { RawNotificationPayload } from "@/types/events"

interface Notification {
    id: string
    fid_post: string
    fid_board: string
    content: string
    time: string
    type: "comment" | "post" | "board" | "linked_issue" | "branch"
    additionalCount: number
    seen: boolean
    raw_group?: RawNotificationPayload[]
}

const typeColors = {
    comment: { text: "text-blue-300", iconBg: "bg-blue-500/80", border: "border-l-blue-400" },
    post: { text: "text-green-300", iconBg: "bg-green-500/80", border: "border-l-green-400" },
    board: { text: "text-purple-300", iconBg: "bg-purple-500/80", border: "border-l-purple-400" },
    linked_issue: { text: "text-orange-300", iconBg: "bg-orange-500/80", border: "border-l-orange-400" },
    branch: { text: "text-violet-300", iconBg: "bg-violet-500/80", border: "border-l-violet-400" },
}

const typeIcons = {
    comment: MessageSquare,
    post: FileText,
    board: Layout,
    linked_issue: Link,
    branch: GitBranch,
}

const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unseenCount, setUnseenCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchNotifications = async () => {
        try {
            const response = await axios.get("/api/notifications")
            setNotifications(response.data.notifications)
            setUnseenCount(response.data.unseenCount)
            setLoading(false)
        } catch (err) {
            setError("Failed to fetch notifications")
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    return { notifications, unseenCount, setUnseenCount, loading, error, refetch: fetchNotifications }
}

/**
 * Export default as you had, but we'll rename it to InlineNotificationCenter
 * so it matches how you're importing it in BoardLayout.
 */
export default function InlineNotificationCenter() {
    const { boardId: currentBoardId, openDialog } = useBoardContext()
    const { notifications, unseenCount, setUnseenCount, loading, error, refetch } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const [dimensions, setDimensions] = useState({ width: 320, height: 450 })
    const [isResizing, setIsResizing] = useState(false)
    const resizeRef = useRef<HTMLDivElement>(null)
    const startPos = useRef({ x: 0, y: 0 })
    const startSize = useRef({ width: 0, height: 0 })

    const categorizedNotifications = useMemo(() => {
        const allRaw: Array<RawNotificationPayload & {
            group_fid_post: string;
            group_fid_board: string;
            unique_render_key: string;
            original_group_id: string;
        }> = [];
        const seenRawKeys = new Set<string>();

        notifications.forEach((groupSummary: Notification) => {
            if (groupSummary.raw_group && Array.isArray(groupSummary.raw_group)) {
                groupSummary.raw_group.forEach((rawNotif: RawNotificationPayload) => {
                    const renderKey = `${groupSummary.fid_post}-${rawNotif.type}-${rawNotif.created_at}-${(rawNotif.id || (rawNotif.content ? rawNotif.content.slice(0,10) : 'no_content'))}`;
                    if (!seenRawKeys.has(renderKey)) {
                        allRaw.push({
                            ...rawNotif,
                            group_fid_post: groupSummary.fid_post,
                            group_fid_board: groupSummary.fid_board,
                            unique_render_key: renderKey,
                            original_group_id: groupSummary.id,
                        });
                        seenRawKeys.add(renderKey);
                    }
                });
            }
        });

        allRaw.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
            allGroupSummaries: notifications,
            allFlat: allRaw,
            comments: allRaw.filter(n => n.type === 'comment'),
            posts: allRaw.filter(n => n.type === 'post'),
            branches: allRaw.filter(n => n.type === 'branch'),
            linked_issues: allRaw.filter(n => n.type === 'linked_issue'),
        };
    }, [notifications]);

    useEffect(() => {
        const handleLiveNotification = (payload: { notification: RawNotificationPayload }) => {
            refetch();
        };

        const disposeUserNotification = StateMachine.define('UserNotificationReceived', handleLiveNotification);
        const disposeCommentNotification = StateMachine.define('CommentNotificationReceived', handleLiveNotification);
        const disposeLinkedIssueNotification = StateMachine.define('LinkedIssueNotificationReceived', handleLiveNotification);
        const disposeBranchNotification = StateMachine.define('BranchNotificationReceived', handleLiveNotification);

        return () => {
            disposeUserNotification();
            disposeCommentNotification();
            disposeLinkedIssueNotification();
            disposeBranchNotification();
        };
    }, [refetch]);

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true)
        startPos.current = { x: e.clientX, y: e.clientY }
        startSize.current = { width: dimensions.width, height: dimensions.height }
        window.addEventListener('mousemove', handleResizeMouseMove)
        window.addEventListener('mouseup', handleResizeMouseUp)
    }

    const handleResizeMouseMove = (e: MouseEvent) => {
        e.preventDefault()
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        let newWidth = startSize.current.width - dx
        let newHeight = startSize.current.height - dy

        newWidth = Math.max(320, Math.min(newWidth, 600))
        newHeight = Math.max(450, Math.min(newHeight, 800))

        setDimensions({ width: newWidth, height: newHeight })
    }

    const handleResizeMouseUp = () => {
        setIsResizing(false)
        // Remove listeners
        window.removeEventListener('mousemove', handleResizeMouseMove)
        window.removeEventListener('mouseup', handleResizeMouseUp)
    }

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleResizeMouseMove)
            window.removeEventListener('mouseup', handleResizeMouseUp)
        }
    }, [])

    useEffect(() => {
        if (isResizing) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'nwse-resize';
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizing]);

    const handleClose = () => {
        if (unseenCount > 0) {
            axios
                .post("/api/notifications/mark-as-seen")
                .then(() => refetch())
                .catch((error) => console.error("Error marking notifications as seen:", error))
        }
        setIsOpen(false)
    }

    const handleBellClick = () => {
        if (isOpen) {
            handleClose()
        } else {
            setIsOpen(true)
        }
    }

    if (loading) return <div>Loading...</div>
    if (error) return <div>Error: {error}</div>

    function onNotificationClick(notification: Notification) {
        const { fid_post, fid_board } = notification
        if (fid_board === currentBoardId) {
            openDialog(fid_post)
        } else {
            router.get(`/boards?board_id=${fid_board}&openTask=${fid_post}`)
        }
        handleClose()
    }

    const onIndividualNotificationClick = (params: {
        fid_post: string;
        fid_board: string;
        original_group_id: string;
        individual_notif_id?: string | number;
    }) => {
        const { fid_post, fid_board } = params;
        if (fid_board === currentBoardId) {
            openDialog(fid_post);
        } else {
            router.get(`/boards?board_id=${fid_board}&openTask=${fid_post}`);
        }
        handleClose();
    };

    function renderNotificationsInner(notifs: Notification[]) {
        return notifs.map((notification) => {
            const IconComponent = typeIcons[notification.type]
            return (
                <div
                    key={notification.id}
                    onClick={() => { onNotificationClick(notification); handleClose(); }}
                    data-notification-post-id={notification.fid_post}
                    data-notification-board-id={notification.fid_board}
                    className={`
                        p-3 border-b border-zinc-700/50 cursor-pointer last:border-b-0
                        hover:bg-zinc-700/50 transition-colors duration-150
                        ${!notification.seen ? `${typeColors[notification.type].border} border-l-2` : ""}
                    `}
                >
                    <div className="flex items-start space-x-3">
                        <div className={`${typeColors[notification.type].iconBg} p-2 rounded-full flex-shrink-0`}>
                            <IconComponent className="h-4 w-4 text-zinc-100" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-sm font-medium mb-1 text-zinc-200 truncate`}
                            >
                                {notification.content}
                            </p>
                            {notification.additionalCount > 0 && (
                                <p className={`text-xs font-semibold ${typeColors[notification.type].text} mb-1`}>
                                    +{notification.additionalCount} more action(s)
                                </p>
                            )}
                            <div className="flex items-center">
                                {!notification.seen && (
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${typeColors[notification.type].iconBg} mr-2`} />
                                )}
                                <p className="text-xs text-zinc-400">{notification.time}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        })
    }

    function renderIndividualNotification(
        rawNotif: RawNotificationPayload & { group_fid_post: string; group_fid_board: string; unique_render_key: string; original_group_id: string }
    ) {
        const IconComponent = typeIcons[rawNotif.type as keyof typeof typeIcons] || FileText;
        const effectiveType = rawNotif.type as keyof typeof typeColors;
        const colorScheme = typeColors[effectiveType] || typeColors.post; // Fallback to post style

        return (
            <div
                key={rawNotif.unique_render_key}
                onClick={() => onIndividualNotificationClick({ 
                    fid_post: rawNotif.group_fid_post, 
                    fid_board: rawNotif.group_fid_board,
                    original_group_id: rawNotif.original_group_id,
                    individual_notif_id: rawNotif.id
                })}
                className={`
                    p-3 border-b border-zinc-700/50 cursor-pointer last:border-b-0
                    hover:bg-zinc-700/50 transition-colors duration-150
                    ${!rawNotif.seen_at ? `${colorScheme.border} border-l-2` : ""}
                `}
            >
                <div className="flex items-start space-x-3">
                    <div className={`${colorScheme.iconBg} p-2 rounded-full flex-shrink-0`}>
                        <IconComponent className="h-4 w-4 text-zinc-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium mb-1 text-zinc-200 truncate`}>
                            {rawNotif.content}
                        </p>
                        <div className="flex items-center">
                            {!rawNotif.seen_at && (
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${colorScheme.iconBg} mr-2`} />
                            )}
                            <p className="text-xs text-zinc-400">
                                {rawNotif.created_at ? new Date(rawNotif.created_at).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Button
                className="relative h-9 w-9 p-0 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-white/20 rounded-full shadow-sm"
                onClick={handleBellClick}
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unseenCount > 0 && (
                    <Badge
                        className="absolute -top-1.5 -right-1.5 h-4 min-w-[1rem] px-1 flex items-center justify-center text-xs rounded-full bg-red-600 text-white border border-zinc-900"
                    >
                        {unseenCount}
                    </Badge>
                )}
            </Button>
            {isOpen && (
                <div
                    ref={resizeRef}
                    className="absolute bottom-full min-w-[420px] right-0 mb-2 z-50 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/20 rounded-lg shadow-xl overflow-hidden flex flex-col"
                    style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                >
                    <div className="flex items-center justify-between p-3 border-b border-zinc-700 flex-shrink-0">
                        <h3 className="text-base font-semibold text-zinc-100">Notifications</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-white/10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <Tabs defaultValue="all" className="w-full flex flex-col h-full overflow-hidden">
                        <TabsList className="grid w-full grid-cols-5 bg-zinc-800 p-1 border-b border-zinc-700 rounded-none flex-shrink-0">
                            <TabsTrigger value="all" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm text-sm py-1">
                                All
                            </TabsTrigger>
                            <TabsTrigger
                                value="comment"
                                className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm text-sm py-1"
                            >
                                Comments
                            </TabsTrigger>
                            <TabsTrigger value="post" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm text-sm py-1">
                                Posts
                            </TabsTrigger>
                            <TabsTrigger value="linked_issue" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm text-sm py-1">
                                Links
                            </TabsTrigger>
                            <TabsTrigger value="branch" className="text-zinc-300 data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 rounded-sm text-sm py-1">
                                Branches
                            </TabsTrigger>
                        </TabsList>
                        <div className="overflow-y-auto flex-grow">
                            <TabsContent value="all" className="h-full">
                                {categorizedNotifications.allGroupSummaries.length > 0 ? 
                                 renderNotificationsInner(categorizedNotifications.allGroupSummaries) : 
                                 <p className="text-sm text-zinc-400 text-center p-4">No notifications yet.</p>}
                            </TabsContent>
                            <TabsContent value="comment" className="h-full">
                                {categorizedNotifications.comments.length > 0 ? 
                                 categorizedNotifications.comments.map(notif => renderIndividualNotification(notif)) : 
                                 <p className="text-sm text-zinc-400 text-center p-4">No comment notifications.</p>}
                            </TabsContent>
                            <TabsContent value="post" className="h-full">
                                {categorizedNotifications.posts.length > 0 ? 
                                 categorizedNotifications.posts.map(notif => renderIndividualNotification(notif)) : 
                                 <p className="text-sm text-zinc-400 text-center p-4">No post notifications.</p>}
                            </TabsContent>
                            <TabsContent value="linked_issue" className="h-full">
                                {categorizedNotifications.linked_issues.length > 0 ? 
                                 categorizedNotifications.linked_issues.map(notif => renderIndividualNotification(notif)) : 
                                 <p className="text-sm text-zinc-400 text-center p-4">No linked issue notifications.</p>}
                            </TabsContent>
                            <TabsContent value="branch" className="h-full">
                                {categorizedNotifications.branches.length > 0 ? 
                                 categorizedNotifications.branches.map(notif => renderIndividualNotification(notif)) : 
                                 <p className="text-sm text-zinc-400 text-center p-4">No branch notifications.</p>}
                            </TabsContent>
                        </div>
                    </Tabs>

                    <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize overflow-hidden border-t border-l border-zinc-600 border-b border-r border-zinc-800 bg-zinc-700/50 flex items-center justify-center"
                        onMouseDown={handleResizeMouseDown}
                        title="Resize"
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 10L10 0" stroke="#a1a1aa" strokeWidth="1"/> {/* zinc-400 */} 
                            <path d="M3 10L10 3" stroke="#a1a1aa" strokeWidth="1"/> {/* zinc-400 */} 
                            <path d="M6 10L10 6" stroke="#a1a1aa" strokeWidth="1"/> {/* zinc-400 */} 
                        </svg>
                    </div>
                </div>
            )}
        </div>
    )
}
