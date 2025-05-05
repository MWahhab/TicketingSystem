"use client"

import type React from "react"
import { UserIcon, Pin, PinOff, CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useBoardContext } from "../BoardContext"

interface Task {
    id: string
    title: string
    priority: "high" | "medium" | "low"
    assignee: {
        name: string
    }
    pinned?: number
    had_branch?: number
    deadline?: string | null
    deadline_color?: 'gray' | 'yellow' | 'red' | null
}

const priorityColors: { [key in Task["priority"]]: { bg: string; ring: string } } = {
    high: { bg: "bg-red-500", ring: "ring-red-500/30" },
    medium: { bg: "bg-yellow-500", ring: "ring-yellow-500/30" },
    low: { bg: "bg-green-500", ring: "ring-green-500/30" },
}

// Map deadline colors to Tailwind background classes for badge style
const deadlineBgColors: { [key: string]: string } = {
    gray: "bg-zinc-700",
    yellow: "bg-yellow-600/30", // Using semi-transparent versions for yellow/red
    red: "bg-red-600/30",
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
                        {/* Badge-style Deadline display with Shadcn UI Tooltip */}
                        {task.deadline && (
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span
                                            className={`flex items-center text-xs rounded-sm px-1.5 py-0.5 ${deadlineBgColors[task.deadline_color ?? 'gray']} ml-2 cursor-default`}
                                        >
                                            <span className="text-zinc-200">
                                                {new Date(task.deadline).toLocaleDateString()}
                                            </span>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-zinc-900 border-zinc-700">
                                        <p className="text-xs text-zinc-200">Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <button
                        onClick={handleStarClick}
                        className={`group p-1 rounded-full transition-colors duration-200 hover:bg-white/10`}
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
                    <div className="flex items-center space-x-2">
                        {task.had_branch === 1 && (
                            <div className="flex items-center" title="Branch created for this task">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-teal-400"
                                >
                                    <circle cx="18" cy="18" r="3" />
                                    <circle cx="6" cy="6" r="3" />
                                    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                                    <path d="M6 9v12" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
