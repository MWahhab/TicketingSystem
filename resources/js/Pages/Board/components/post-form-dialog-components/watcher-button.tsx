"use client"
import { useState } from "react"
import { Watcher } from "./watcher"

interface WatcherButtonProps {
    postId: string
    userId: string
    watchers: {
        watcher_id: number
        id: number
        name: string
    }[]
}

export function WatcherButton({ postId, userId, watchers = [] }: WatcherButtonProps) {
    const [currentWatchers, setCurrentWatchers] = useState(watchers)

    const handleWatcherUpdate = (
        newWatchers: {
            watcher_id: number
            id: number
            name: string
        }[],
    ) => {
        setCurrentWatchers(newWatchers)
    }

    return <Watcher postId={postId} userId={userId} watchers={currentWatchers} onWatcherUpdate={handleWatcherUpdate} />
}
