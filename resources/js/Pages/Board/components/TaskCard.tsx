"use client";

import React from "react";
import {User as UserIcon} from "lucide-react"; // Renamed to UserIcon
import {Card, CardContent, CardHeader, CardTitle,} from "@/components/ui/card";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Task} from "../types";

interface TaskCardProps {
    task: Task;
}

const priorityColors: { [key in Task["priority"]]: string } = {
    high: "bg-red-500",
    med: "bg-yellow-500",
    low: "bg-green-500",
};

function getInitials(name: string) {
    const names = name.split(' ');
    return names.map(n => n.charAt(0).toUpperCase()).join('');
}

export function TaskCard({ task }: TaskCardProps) {
    return (
        <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="p-3">
                <div className="flex justify-between items-center">
                    <div
                        className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}
                    />
                </div>
                <CardTitle className="text-sm font-medium mt-2">
                    {task.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        <span>{task.assignee.name}</span>
                    </div>
                    <Avatar className="w-6 h-6">
                        <AvatarFallback>{getInitials(task.assignee.name)}</AvatarFallback>
                    </Avatar>
                </div>
            </CardContent>
        </Card>
    );
}
