"use client"

import { useState, type PropsWithChildren, type ReactNode } from "react"
import { usePage } from "@inertiajs/react"

export default function Authenticated({ header, children }: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false)

    return (
        <div className="h-screen bg-neutral-900 flex flex-col">
            <></>

            {header && (
                <header className="bg-zinc-800 shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    )
}

