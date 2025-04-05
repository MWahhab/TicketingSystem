"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { FileIcon, FolderIcon } from "lucide-react"

// Add import for the FileItem type
import type { FileItem } from "@/app/types/file-browser"

interface FileBrowserProps {
    isOpen: boolean
    onClose: () => void
    onFilesSelected: (files: string[]) => void
    postId?: string
    fileStructure?: FileItem[]
}

const Portal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body)
}

export function FileBrowser({ isOpen, onClose, onFilesSelected, postId, fileStructure }: FileBrowserProps) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
    const [localFileStructure] = useState(fileStructure)

    const capacityUsed = Math.min(Math.floor((selectedItems.size / 100) * 100), 100)

    useEffect(() => {
        if (isOpen) {
            setSelectedItems(new Set())
            setExpandedFolders(new Set())
        }
    }, [isOpen])

    /**
     * Recursively select an item (file or folder) and all its descendants.
     */
    const selectItem = (item: FileItem, selected: Set<string>) => {
        selected.add(item.path)
        if (item.children && item.children.length > 0) {
            item.children.forEach((child) => selectItem(child, selected))
        }
    }

    /**
     * Recursively deselect an item (file or folder) and all its descendants.
     */
    const deselectItem = (item: FileItem, selected: Set<string>) => {
        selected.delete(item.path)
        if (item.children && item.children.length > 0) {
            item.children.forEach((child) => deselectItem(child, selected))
        }
    }

    /**
     * Toggle selection for a file.
     */
    const toggleFileSelection = (file: FileItem) => {
        const newSelected = new Set(selectedItems)
        if (newSelected.has(file.path)) {
            newSelected.delete(file.path)
        } else {
            newSelected.add(file.path)
        }
        setSelectedItems(newSelected)
    }

    /**
     * Toggle selection for a folder.
     * This will recursively select/deselect the folder and its descendants.
     * Also, it auto-expands the folder when selecting.
     */
    const toggleFolderSelection = (folder: FileItem) => {
        const newSelected = new Set(selectedItems)
        const newExpanded = new Set(expandedFolders)
        if (newSelected.has(folder.path)) {
            // Deselect folder and all its descendants
            deselectItem(folder, newSelected)
        } else {
            // Select folder and all its descendants and expand it
            selectItem(folder, newSelected)
            newExpanded.add(folder.id)
        }
        setSelectedItems(newSelected)
        setExpandedFolders(newExpanded)
    }

    /**
     * Checks if any descendant of the folder is selected.
     */
    const checkSomeSelected = (folder: FileItem, selected: Set<string>): boolean => {
        if (!folder.children || folder.children.length === 0) return false
        for (const child of folder.children) {
            if (selected.has(child.path)) return true
            if (child.type === "folder" && checkSomeSelected(child, selected)) return true
        }
        return false
    }

    /**
     * Toggle folder expansion (without affecting selection)
     */
    const toggleFolderExpansion = (id: string) => {
        const newExpanded = new Set(expandedFolders)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedFolders(newExpanded)
    }

    /**
     * Handles submitting the selected items.
     */
    const handleSubmit = () => {
        onFilesSelected(Array.from(selectedItems))
        onClose()
    }

    /**
     * Handles skipping file selection.
     */
    const handleSkip = () => {
        onFilesSelected([])
        onClose()
    }

    /**
     * Recursively render file/folder structure.
     */
    const renderFileTree = (items: FileItem[]) => {
        return items.map((item) => {
            if (item.type === "folder") {
                const isSelected = selectedItems.has(item.path)
                const isEmpty = !item.children || item.children.length === 0
                const someSelected =
                    !isSelected && item.children && item.children.length > 0 ? checkSomeSelected(item, selectedItems) : false

                return (
                    <div key={item.id} className="select-none">
                        <div className="flex items-center py-1.5 hover:bg-zinc-700/50 px-2 rounded">
                            <Checkbox
                                id={`checkbox-${item.id}`}
                                checked={isSelected}
                                indeterminate={someSelected}
                                disabled={isEmpty}
                                onCheckedChange={() => toggleFolderSelection(item)}
                                className="mr-2 data-[state=indeterminate]:bg-zinc-600 data-[state=checked]:bg-zinc-500"
                            />
                            <div className="flex items-center flex-1 cursor-pointer" onClick={() => toggleFolderExpansion(item.id)}>
                                <FolderIcon className="h-4 w-4 mr-2 text-blue-400" />
                                <span className="text-sm text-white">{item.name}</span>
                                {isEmpty && <span className="ml-2 text-xs text-zinc-400">(empty)</span>}
                                {item.size && <span className="ml-auto text-xs text-zinc-400">{item.size}</span>}
                            </div>
                        </div>
                        {expandedFolders.has(item.id) && item.children && item.children.length > 0 && (
                            <div className="pl-6">{renderFileTree(item.children)}</div>
                        )}
                    </div>
                )
            } else {
                return (
                    <div key={item.id} className="flex items-center py-1.5 hover:bg-zinc-700/50 px-2 rounded select-none">
                        <Checkbox
                            id={`checkbox-${item.id}`}
                            checked={selectedItems.has(item.path)}
                            onCheckedChange={() => toggleFileSelection(item)}
                            className="mr-2 data-[state=checked]:bg-zinc-500"
                        />
                        <div className="flex items-center flex-1">
                            <FileIcon className="h-4 w-4 mr-2 text-zinc-400" />
                            <span className="text-sm text-white">{item.name}</span>
                            {item.size && <span className="ml-auto text-xs text-zinc-400">{item.size}</span>}
                        </div>
                    </div>
                )
            }
        })
    }

    return (
        <Portal>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-zinc-800 text-white border border-zinc-700 sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="text-white text-xl">Select context files</DialogTitle>
                    </DialogHeader>

                    <div className="overflow-y-auto flex-1 border border-zinc-700 rounded-md mb-4">
                        {renderFileTree(localFileStructure)}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-zinc-400">{selectedItems.size} items selected</div>
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                            <Progress value={capacityUsed} className="h-2 bg-zinc-700" />
                            <span className="text-xs text-zinc-400">{capacityUsed}% of capacity used</span>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSkip} className="bg-zinc-500 text-white hover:bg-zinc-400">
                                Skip
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={selectedItems.size === 0}
                                className="bg-white text-zinc-900 hover:bg-zinc-100 disabled:bg-zinc-600 disabled:text-zinc-400"
                            >
                                Add files
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Portal>
    )
}

