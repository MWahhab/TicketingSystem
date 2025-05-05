"use client"

import type React from "react"
import { UserIcon, Pin, PinOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useBoardContext } from "../BoardContext"

interface Task {
    id: string
    title: string
    priority: "high" | "medium" | "low"
    assignee: {
        name: string
    }
    pinned?: number
}

const priorityColors: { [key in Task["priority"]]: { bg: string; ring: string } } = {
    high: { bg: "bg-red-500", ring: "ring-red-500/30" },
    medium: { bg: "bg-yellow-500", ring: "ring-yellow-500/30" },
    low: { bg: "bg-green-500", ring: "ring-green-500/30" },
}

function getInitials(name: string) {
    const names = name.split(" ")
    return names.map((n) => n.charAt(0).toUpperCase()).join("")
}

export function TaskCard({ task }: { task: Task }) {
    const { openDialog, pinTask } = useBoardContext()

    const handleStarClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        pinTask(task.id, task.pinned !== 1)
    }

    return (
        <Card
            onClick={() => openDialog(task.id)}
            data-post-id={task.id}
            className={`
                mb-4 shadow-md hover:shadow-lg transition duration-150 ease-in-out
                bg-zinc-800 hover:bg-zinc-700/50 border border-white/10 cursor-pointer rounded-lg
                ${task.pinned === 1 ? "border-l-blue-400 border-l-2 bg-zinc-800/50" : ""}
            `}
        >
            <CardHeader className="p-3 overflow-hidden">
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <div
                            className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority].bg} ring-2 ring-offset-2 ring-offset-zinc-800 ${priorityColors[task.priority].ring}`}
                        />
                        <span className="text-xs font-medium text-zinc-400 uppercase ml-2">{task.priority} Priority</span>
                    </div>
                    <button
                        onClick={handleStarClick}
                        className={`group -mr-1 p-1 rounded-full transition-colors duration-200 hover:bg-white/10`}
                        aria-label={task.pinned === 1 ? "Unstar task" : "Star task"}
                    >
                        {task.pinned === 1 ? (
                            <Pin
                                className="w-4 h-4 stroke-blue-400 fill-blue-400 transition-colors duration-200"
                            />
                        ) : (
                            <PinOff className="w-4 h-4 stroke-zinc-500 group-hover:stroke-zinc-300 transition-colors duration-200" />
                        )}
                    </button>
                </div>
                <CardTitle className="text-base font-medium mt-2 text-zinc-100 truncate">
                    {task.id}. {task.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center text-zinc-300">
                        <UserIcon className="w-4 h-4 mr-2 text-zinc-400" />
                        <span>{task.assignee.name}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
