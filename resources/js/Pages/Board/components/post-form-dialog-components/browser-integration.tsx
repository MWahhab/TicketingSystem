"use client"

import { useState } from "react"
import { FileBrowser } from "./file-browser"

export function FileBrowserIntegration({ postId }: { postId?: string }) {
    const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<string[]>([])

    const handleFilesSelected = (files: string[]) => {
        setSelectedFiles(files)
        console.log("Selected files:", files)
    }

    return (
        <div>
            <button
                onClick={() => setIsFileBrowserOpen(true)}
                className="bg-zinc-800/90 backdrop-blur-sm hover:bg-zinc-700/90 text-white rounded-md px-2.5 py-0.5 text-xs flex items-center gap-1 border border-zinc-700/50"
            >
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
                <span>Generate PR</span>
            </button>

            <FileBrowser
                isOpen={isFileBrowserOpen}
                onClose={() => setIsFileBrowserOpen(false)}
                onFilesSelected={handleFilesSelected}
                postId={postId}
            />
        </div>
    )
}

