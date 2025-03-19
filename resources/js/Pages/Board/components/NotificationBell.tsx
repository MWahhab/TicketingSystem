"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, MessageSquare, FileText, Layout, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useBoardContext } from "../BoardContext";
import { router } from "@inertiajs/react";

interface Notification {
    id: string;
    fid_post: string;
    fid_board: string;
    content: string;
    time: string;
    type: "comment" | "post" | "board" | "linked_issue";
    additionalCount: number;
    seen: boolean;
}

const typeColors = {
    comment: "bg-blue-500",
    post: "bg-green-500",
    board: "bg-purple-500",
    linked_issue: "bg-purple-500"
};

const typeIcons = {
    comment: MessageSquare,
    post: FileText,
    board: Layout,
    linked_issue: Link
};

const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get("/api/notifications");
            setNotifications(response.data.notifications);
            setUnseenCount(response.data.unseenCount);
            setLoading(false);
        } catch (err) {
            setError("Failed to fetch notifications");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    return { notifications, unseenCount, loading, error, refetch: fetchNotifications };
};

/**
 * Export default as you had, but we'll rename it to InlineNotificationCenter
 * so it matches how you're importing it in BoardLayout.
 */
export default function InlineNotificationCenter() {
    const { boardId: currentBoardId, openDialog } = useBoardContext();
    const { notifications, unseenCount, loading, error, refetch } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    const handleClose = () => {
        if (unseenCount > 0) {
            axios
                .post("/api/notifications/mark-as-seen")
                .then(() => refetch())
                .catch((error) =>
                    console.error("Error marking notifications as seen:", error)
                );
        }
        setIsOpen(false);
    };

    const handleBellClick = () => {
        if (isOpen) {
            handleClose();
        } else {
            setIsOpen(true);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    function onNotificationClick(notification: Notification) {
        const { fid_post, fid_board } = notification;
        if (fid_board === currentBoardId) {
            openDialog(fid_post);
        } else {
            router.get(`/boards?board_id=${fid_board}&openTask=${fid_post}`);
        }
    }

    function renderNotificationsInner(notifs: Notification[]) {
        return notifs.map((notification) => {
            const IconComponent = typeIcons[notification.type];
            return (
                <div
                    key={notification.id}
                    onClick={() => onNotificationClick(notification)}
                    data-notification-post-id={notification.fid_post}
                    data-notification-board-id={notification.fid_board}
                    className={`p-4 border-b cursor-pointer last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ${
                        notification.seen
                            ? "bg-white dark:bg-gray-800"
                            : "bg-blue-50 dark:bg-blue-900"
                    }`}
                >
                    <div className="flex items-start space-x-4">
                        <div className={`${typeColors[notification.type]} p-2 rounded-full flex-shrink-0`}>
                            <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className={`text-sm font-medium mb-1 line-clamp-2 ${
                                    notification.seen
                                        ? "text-gray-900 dark:text-gray-100"
                                        : "text-blue-800 dark:text-blue-200"
                                }`}
                            >
                                {notification.content}
                            </p>
                            {notification.additionalCount > 0 && (
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                    +{notification.additionalCount} more action(s)
                                </p>
                            )}
                            <div className="flex items-center space-x-2">
                <span
                    className={`inline-block w-2 h-2 rounded-full ${typeColors[notification.type]}`}
                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {notification.time}
                                </p>
                            </div>
                        </div>
                        {!notification.seen && (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                    </div>
                </div>
            );
        });
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Button
                variant="outline"
                size="icon"
                className="rounded-full shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={handleBellClick}
            >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                {unseenCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold"
                    >
                        {unseenCount}
                    </Badge>
                )}
            </Button>
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                            Notifications
                        </h3>
                        <Button variant="ghost" size="icon" onClick={handleClose}>
                            <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </Button>
                    </div>
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 p-1">
                            <TabsTrigger
                                value="all"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600"
                            >
                                All
                            </TabsTrigger>
                            <TabsTrigger
                                value="comment"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600"
                            >
                                Comments
                            </TabsTrigger>
                            <TabsTrigger
                                value="post"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600"
                            >
                                Posts
                            </TabsTrigger>
                        </TabsList>
                        <ScrollArea className="h-[300px] overflow-y-auto">
                            <TabsContent value="all">
                                {renderNotificationsInner(notifications)}
                            </TabsContent>
                            <TabsContent value="comment">
                                {renderNotificationsInner(
                                    notifications.filter((n) => n.type === "comment")
                                )}
                            </TabsContent>
                            <TabsContent value="post">
                                {renderNotificationsInner(
                                    notifications.filter((n) => n.type === "post")
                                )}
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
