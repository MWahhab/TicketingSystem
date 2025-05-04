"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X, MessageSquare, FileText, Layout, Link, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import axios from "axios"
import { useBoardContext } from "../BoardContext"
import { router } from "@inertiajs/react"

interface Notification {
    id: string
    fid_post: string
    fid_board: string
    content: string
    time: string
    type: "comment" | "post" | "board" | "linked_issue" | "branch"
    additionalCount: number
    seen: boolean
}

const typeColors = {
    comment: "bg-blue-500",
    post: "bg-green-500",
    board: "bg-purple-500",
    linked_issue: "bg-purple-500",
    branch: "bg-violet-500",
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
        const interval = setInterval(fetchNotifications, 60000) // Refresh every minute
        return () => clearInterval(interval)
    }, [])

    return { notifications, unseenCount, loading, error, refetch: fetchNotifications }
}

/**
 * Export default as you had, but we'll rename it to InlineNotificationCenter
 * so it matches how you're importing it in BoardLayout.
 */
export default function InlineNotificationCenter() {
    const { boardId: currentBoardId, openDialog } = useBoardContext()
    const { notifications, unseenCount, loading, error, refetch } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const [dimensions, setDimensions] = useState({ width: 320, height: 450 }) // Initial dimensions (w-80 is 320px)
    const [isResizing, setIsResizing] = useState(false)
    const resizeRef = useRef<HTMLDivElement>(null) // Ref for the resizable container
    const startPos = useRef({ x: 0, y: 0 })
    const startSize = useRef({ width: 0, height: 0 })

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true)
        startPos.current = { x: e.clientX, y: e.clientY }
        startSize.current = { width: dimensions.width, height: dimensions.height }
        // Attach mousemove and mouseup listeners to the window
        window.addEventListener('mousemove', handleResizeMouseMove)
        window.addEventListener('mouseup', handleResizeMouseUp)
    }

    const handleResizeMouseMove = (e: MouseEvent) => {
        e.preventDefault() // Prevent text selection
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        let newWidth = startSize.current.width - dx
        let newHeight = startSize.current.height - dy

        // Add constraints (min/max dimensions)
        newWidth = Math.max(320, Math.min(newWidth, 600)) // Use original width as min
        newHeight = Math.max(450, Math.min(newHeight, 800)) // Use original height as min

        setDimensions({ width: newWidth, height: newHeight })
    }

    const handleResizeMouseUp = () => {
        setIsResizing(false)
        // Remove listeners
        window.removeEventListener('mousemove', handleResizeMouseMove)
        window.removeEventListener('mouseup', handleResizeMouseUp)
    }

    // Cleanup listeners on component unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleResizeMouseMove)
            window.removeEventListener('mouseup', handleResizeMouseUp)
        }
    }, [])

    // Effect to disable text selection during resize
    useEffect(() => {
        if (isResizing) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'nwse-resize'; // Optional: maintain resize cursor globally
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        // Cleanup function to reset styles if component unmounts while resizing
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
    }

    function renderNotificationsInner(notifs: Notification[]) {
        return notifs.map((notification) => {
            const IconComponent = typeIcons[notification.type]
            return (
                <div
                    key={notification.id}
                    onClick={() => onNotificationClick(notification)}
                    data-notification-post-id={notification.fid_post}
                    data-notification-board-id={notification.fid_board}
                    className={`p-4 border-b border-gray-100 cursor-pointer last:border-b-0 hover:bg-gray-50 transition-colors duration-150 ${
                        notification.seen ? "bg-white" : "bg-blue-50"
                    }`}
                >
                    <div className="flex items-start space-x-4">
                        <div className={`${typeColors[notification.type]} p-2 rounded-full flex-shrink-0`}>
                            <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-sm font-medium mb-1 line-clamp-2 ${
                                    notification.seen ? "text-gray-800" : "text-blue-700"
                                }`}
                            >
                                {notification.content}
                            </p>
                            {notification.additionalCount > 0 && (
                                <p className="text-xs font-semibold text-blue-600 mb-1">
                                    +{notification.additionalCount} more action(s)
                                </p>
                            )}
                            <div className="flex items-center space-x-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${typeColors[notification.type]}`} />
                                <p className="text-xs text-gray-500">{notification.time}</p>
                            </div>
                        </div>
                        {!notification.seen && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>}
                    </div>
                </div>
            )
        })
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Button
                variant="outline"
                size="icon"
                className="rounded-full shadow-lg bg-white border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                onClick={handleBellClick}
            >
                <Bell className="h-5 w-5 text-gray-700" />
                {unseenCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold">
                        {unseenCount}
                    </Badge>
                )}
            </Button>
            {isOpen && (
                <div
                    ref={resizeRef}
                    className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 flex flex-col"
                    style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                >
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <Tabs defaultValue="all" className="w-full flex flex-col h-full">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-none flex-shrink-0">
                            <TabsTrigger value="all" className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-800">
                                All
                            </TabsTrigger>
                            <TabsTrigger
                                value="comment"
                                className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-800"
                            >
                                Comments
                            </TabsTrigger>
                            <TabsTrigger value="post" className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-800">
                                Posts
                            </TabsTrigger>
                            <TabsTrigger value="branch" className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-800">
                                Branches
                            </TabsTrigger>
                        </TabsList>
                        <ScrollArea className="flex-1 overflow-y-auto hide-scrollbar">
                            <TabsContent value="all">{renderNotificationsInner(notifications)}</TabsContent>
                            <TabsContent value="comment">
                                {renderNotificationsInner(notifications.filter((n) => n.type === "comment"))}
                            </TabsContent>
                            <TabsContent value="post">
                                {renderNotificationsInner(notifications.filter((n) => n.type === "post"))}
                            </TabsContent>
                            <TabsContent value="branch">
                                {renderNotificationsInner(notifications.filter((n) => n.type === "branch"))}
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                    {/* Resize Handle (Invisible) */}
                    <div
                        onMouseDown={handleResizeMouseDown}
                        className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize rounded-br-md"
                        style={{ zIndex: 10 }} // Ensure handle is clickable over ScrollArea
                    ></div>
                </div>
            )}
        </div>
    )
}
