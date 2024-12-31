'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ClipboardListIcon, ChevronUpIcon, ChevronDownIcon, AtSignIcon, FlagIcon, LayoutListIcon as ColumnLayoutIcon, UserIcon, CalendarIcon, MessageSquareIcon } from 'lucide-react';
import axios from 'axios';

interface Activity {
    id: string;
    type: string;
    content: string;
    createdAt: string;
    createdBy: string;
}

interface ActivityHistoryProps {
    postId: string;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ postId }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleActivities, setVisibleActivities] = useState<Activity[]>([]);
    const [showAllActivities, setShowAllActivities] = useState(false);
    const activitiesPerPage = 4;

    useEffect(() => {
        loadActivities();
    }, [postId]);

    const loadActivities = () => {
        axios
            .get(`/api/activity/${postId}`)
            .then((response) => {

                // Flatten the nested structure and map to desired format
                const fetchedActivities = Object.values(response.data[0]).map((activity: any) => ({
                    id: activity.id,
                    type: activity.type,
                    content: activity.content,
                    createdAt: activity.created_at,
                    createdBy: activity.created_by,
                    seenAt: activity.seen_at,
                    user: activity.user ? {
                        id: activity.user.id,
                        name: activity.user.name,
                        email: activity.user.email
                    } : null,
                }));

                // Update state with the flattened and mapped activities
                setActivities(fetchedActivities);
                setVisibleActivities(fetchedActivities.slice(0, activitiesPerPage));
            })
            .catch((error) => {
                console.error(error);
            });
    };



    const handleShowAllActivities = () => {
        setVisibleActivities(activities);
        setShowAllActivities(true);
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'mention':
                return <AtSignIcon className="h-4 w-4 text-blue-400" />;
            case 'priority':
                return <FlagIcon className="h-4 w-4 text-yellow-400" />;
            case 'column':
                return <ColumnLayoutIcon className="h-4 w-4 text-green-400" />;
            case 'assignee':
                return <UserIcon className="h-4 w-4 text-purple-400" />;
            case 'deadline':
                return <CalendarIcon className="h-4 w-4 text-red-400" />;
            case 'comment':
                return <MessageSquareIcon className="h-4 w-4 text-orange-400" />;
            default:
                return <ClipboardListIcon className="h-4 w-4 text-gray-400" />;
        }
    };

    return (
        <Card className="mt-8 bg-zinc-700 border-zinc-600">
            <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between text-zinc-100">
                    <div className="flex items-center gap-2 font-semibold">
                        <ClipboardListIcon className="h-5 w-5" />
                        <span>Activity History</span>
                        <div className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                            {activities.length}
                        </div>
                    </div>
                    {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                        <ChevronDownIcon className="h-5 w-5" />
                    )}
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-3">
                    <Separator className="bg-zinc-700" />
                    <ScrollArea className="pr-4 -mr-4 max-h-[440px] overflow-y-auto hide-scrollbar">
                        <div className="space-y-4">
                            {visibleActivities.map((activity) => (
                                <div key={activity.id} className="flex items-start space-x-3">
                                    <Avatar className="h-8 w-8 bg-zinc-800 text-zinc-800">
                                        <AvatarFallback>
                                            {activity.createdBy.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col space-y-1 flex-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-bold text-zinc-100">{activity.createdBy}</span>
                                            <span className="text-xs text-zinc-500">
                                                {new Date(activity.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="rounded-lg bg-zinc-800 p-3 text-sm text-zinc-300">
                                            <div className="flex items-center space-x-2">
                                                {getActivityIcon(activity.type)}
                                                <span>{activity.content}</span>
                                            </div>
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
                                        className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
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
    );
};

export default ActivityHistory;

