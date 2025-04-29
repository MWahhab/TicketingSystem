"use client"

import { useState, useEffect } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { useBoardContext } from "../../BoardContext"
import axios from "axios"

interface Watcher {
    watcher_id: number
    id: number
    name: string
}

interface WatcherProps {
    postId: string
    userId: string
    watchers: Watcher[]
    onWatcherUpdate?: (newWatchers: Watcher[]) => void
}

export function Watcher({ postId, userId, watchers = [], onWatcherUpdate }: WatcherProps) {
    const [isWatching, setIsWatching] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoadingWatcher, setIsLoadingWatcherWatcher] = useState(false)
    const [localWatchers, setLocalWatchers] = useState<Watcher[]>(watchers)
    const { toast } = useToast()

    const { updateTaskWatchers, assignees } = useBoardContext()

    useEffect(() => {
        setLocalWatchers(watchers)
        const userIdNum = Number.parseInt(userId)
        const isUserWatching = watchers.some((watcher) => watcher.id === userIdNum)
        setIsWatching(isUserWatching)
    }, [watchers, userId])

    const handleToggleWatch = async () => {
        if (!postId || !userId) return

        setIsLoadingWatcherWatcher(true)
        try {
            const userIdNum = Number.parseInt(userId)
            const postIdNum = Number.parseInt(postId)

            const requestData = {
                post_fid: postIdNum,
                user_fid: userIdNum,
            }

            if (isWatching) {
                await axios.delete("/post-watchers", {
                    data: requestData,
                })

                const updatedWatchers = localWatchers.filter((w) => w.id !== userIdNum)
                setLocalWatchers(updatedWatchers)
                setIsWatching(false)

                toast({
                    title: "Stopped watching",
                    description: "You will no longer receive updates for this post",
                })

                if (onWatcherUpdate) {
                    onWatcherUpdate(updatedWatchers)
                }

                updateTaskWatchers(postId, updatedWatchers)
            } else {
                await axios.post("/post-watchers", requestData)

                const currentUser     = assignees.find((a) => a.id === userId)
                const currentUserName = currentUser ? currentUser.name : "You"

                const newWatcher: Watcher = {
                    watcher_id: Date.now(),
                    id: userIdNum,
                    name: currentUserName,
                }

                const updatedWatchers = [...localWatchers, newWatcher]
                setLocalWatchers(updatedWatchers)
                setIsWatching(true)

                toast({
                    title: "Started watching",
                    description: "You will receive updates for this post",
                })

                if (onWatcherUpdate) {
                    onWatcherUpdate(updatedWatchers)
                }

                updateTaskWatchers(postId, updatedWatchers)
            }
        } catch (error) {
            console.error("Error updating watcher status:", error)
            toast({
                title: "Error",
                description: "Failed to update watcher status",
                variant: "destructive",
            })
        } finally {
            setIsLoadingWatcherWatcher(false)
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`text-zinc-400 hover:text-zinc-300 hover:bg-zinc-100/10 p-1`}
                    title={isWatching ? "Stop watching" : "Watch this post"}
                >
                    <EyeIcon className={`h-5 w-5 ${isWatching ? "text-zinc-100" : ""}`} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-zinc-800 border border-zinc-700 text-white" align="end">
                <div className="p-3 border-b border-zinc-700 bg-zinc-800/90">
                    <h3 className="text-sm font-medium">{isWatching ? "Watching this post" : "Watch this post"}</h3>
                </div>

                {localWatchers.length > 0 && (
                    <div className="p-2 border-b border-zinc-700">
                        {localWatchers.map((watcher) => (
                            <div key={watcher.watcher_id} className="flex items-center gap-2 p-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white">
                                    {watcher.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm">{watcher.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-2">
                    <Button
                        variant="ghost"
                        className={`w-full justify-start text-sm ${isWatching ? "text-red-400 hover:text-red-500" : "text-zinc-100 hover:text-zinc-800"}`}
                        onClick={handleToggleWatch}
                        disabled={isLoadingWatcher}
                    >
                        {isLoadingWatcher ? (
                            <div className="flex items-center">
                                <svg
                                    className="animate-spin h-4 w-4 mr-2"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                <span>Processing...</span>
                            </div>
                        ) : isWatching ? (
                            <>
                                <EyeOffIcon className="h-4 w-4 mr-2" />
                                <span>Stop watching</span>
                            </>
                        ) : (
                            <>
                                <EyeIcon className="h-4 w-4 mr-2" />
                                <span>Start watching</span>
                            </>
                        )}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
