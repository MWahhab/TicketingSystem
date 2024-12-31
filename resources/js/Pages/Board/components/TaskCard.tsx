"use client";

import React from "react";
import { UserIcon } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// NEW import:
import { useBoardContext } from "../BoardContext";

interface Task {
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    assignee: {
        name: string;
    };
    // ...any other fields you had
}

const priorityColors: { [key in Task["priority"]]: string } = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500"
};

function getInitials(name: string) {
    const names = name.split(" ");
    return names.map((n) => n.charAt(0).toUpperCase()).join("");
}

export function TaskCard({ task }: { task: Task }) {
    const { openDialog } = useBoardContext();

    return (
        <Card
            onClick={() => openDialog(task.id)}
            data-post-id={task.id}
            className="mb-4 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-white border border-gray-200 cursor-pointer"
        >
            <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                    <div
                        className={`w-3 h-3 rounded-full ${priorityColors[task.priority]} ring-2 ring-offset-2 ring-opacity-50 ${
                            task.priority === "high"
                                ? "ring-red-200"
                                : task.priority === "medium"
                                    ? "ring-yellow-200"
                                    : "ring-green-200"
                        }`}
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase">
            {task.priority} Priority
          </span>
                </div>
                <CardTitle className="text-lg font-semibold mt-3 text-gray-800">
                    {task.id}. {task.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{task.assignee.name}</span>
                    </div>
                    <Avatar className="w-8 h-8 bg-zinc-800 text-stone-100 font-bold">
                        <AvatarFallback className="bg-zinc-700">
                            {getInitials(task.assignee.name)}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </CardContent>
        </Card>
    );
}
