"use client"

import React, { useEffect, useState } from "react"
import { usePage, router, Link } from "@inertiajs/react"
import { DragDropContext } from "react-beautiful-dnd"
import { Search, ChevronDown, User, LogOut, Settings, Pin, PinOff } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { Column } from "./components/Column"
import { BoardFormDialog } from "@/Pages/Board/components/BoardFormDialog"
import { PostFormDialog } from "@/Pages/Board/components/PostFormDialog"
import DeleteButton from "@/Pages/Board/components/DeleteButton"
import InlineNotificationCenter from "@/Pages/Board/components/NotificationBell"
import { DateFilter } from "./components/DateFilter"
import { AISettingsDialog } from "@/Pages/Board/components/AiIntegrationFormDialog"

import { BoardProvider, useBoardContext } from "./BoardContext"
import {clsx} from "clsx";

const PreventCloseMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuItem>>(
    ({ children, ...props }, forwardedRef) => (
        <DropdownMenuItem
            {...props}
            ref={forwardedRef}
            onSelect={(event) => {
                event.preventDefault()
            }}
        >
            {children}
        </DropdownMenuItem>
    ),
)
PreventCloseMenuItem.displayName = "PreventCloseMenuItem"

function getOpenTaskParam(): string | null {
    if (typeof window === "undefined") return null
    const params = new URLSearchParams(window.location.search)
    return params.get("openTask")
}

export function BoardLayout() {
    const {
        columns: columnsArray,
        posts: postsArray,
        boards,
        assignees,
        boardsColumns,
        priorities,
        boardTitle,
        boardId,
        authUserId,
        openPostId,
        dateFrom,
        dateTo,
        dateField,
    } = usePage().props as any

    return (
        <BoardProvider
            boardId={boardId}
            columnsArray={columnsArray}
            postsArray={postsArray}
            boards={boards}
            assignees={assignees}
            boardsColumns={boardsColumns}
            priorities={priorities}
            boardTitle={boardTitle}
            authUserId={authUserId}
            openPostId={openPostId}
            dateFrom={dateFrom}
            dateTo={dateTo}
            dateField={dateField}
        >
            <InnerBoardLayout />
        </BoardProvider>
    )
}

function InnerBoardLayout() {
    const {
        boards,
        boardTitle,
        boardId,
        authUserId,
        columns,
        tasks,
        handleBoardClick,
        onDragEnd,
        selectedTask,
        isEditDialogOpen,
        openDialog,
        closeDialog,
        boardsColumns,
        assignees,
        priorities,
        openPostId,
        dateFrom,
        dateTo,
        dateField,
        isPremium,
    } = useBoardContext()

    const [activeDateFrom, setActiveDateFrom] = useState<Date | null>(dateFrom ? new Date(dateFrom) : null)
    const [activeDateTo, setActiveDateTo] = useState<Date | null>(dateTo ? new Date(dateTo) : null)
    const [isDateFilterActive, setIsDateFilterActive] = useState(!!dateFrom || !!dateTo)

    const [aiIntegrationOpen, setAiIntegrationOpen] = useState(false)
    const [selectedBoardForAI, setSelectedBoardForAI] = useState<{ id: string; title: string } | null>(null)

    const [didAutoOpen, setDidAutoOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
    const [selectedAuthors, setSelectedAuthors] = useState<string[]>([])
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
    const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("")
    const [authorSearchQuery, setAuthorSearchQuery] = useState("")

    // Sidebar State
    const [isSidebarPinned, setIsSidebarPinned] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    useEffect(() => {
        const openTaskId = getOpenTaskParam()
        const postIdToOpen = openTaskId || openPostId

        if (!didAutoOpen && postIdToOpen && tasks[postIdToOpen]) {
            openDialog(postIdToOpen)
            setDidAutoOpen(true)
        }
    }, [didAutoOpen, openDialog, tasks, openPostId])

    const uniqueAuthors = Array.from(new Set(Object.values(tasks).map((task: any) => task.post_author)))

    const filterBySearch = (items: any[], searchQuery: string, getItemName: (item: any) => string) => {
        if (!searchQuery) return items
        return items.filter((item) => getItemName(item).toLowerCase().includes(searchQuery.toLowerCase()))
    }

    const handleApplyDateFilter = (dateFrom: Date | null, dateTo: Date | null, dateField: string) => {
        if (boardId) {
            const params = new URLSearchParams()
            params.set("board_id", boardId)

            if (dateFrom) {
                params.set("date_from", format(dateFrom, "yyyy-MM-dd"))
                setActiveDateFrom(dateFrom)
            }

            if (dateTo) {
                params.set("date_to", format(dateTo, "yyyy-MM-dd"))
                setActiveDateTo(dateTo)
            }

            if (dateField) {
                params.set("date_field", dateField)
            }

            setIsDateFilterActive(true)
            router.get(`/boards?${params.toString()}`)
        }
    }

    const handleClearDateFilter = () => {
        setActiveDateFrom(null)
        setActiveDateTo(null)
        setIsDateFilterActive(false)
        if (boardId) {
            router.get(`/boards?board_id=${boardId}`)
        }
    }

    const openAIIntegration = (board: { id: string; title: string }) => {
        setSelectedBoardForAI(board)
        setAiIntegrationOpen(true)
    }

    // Define a basic Task type based on usage in filter/sort
    interface FilterableTask {
        id: string;
        title: string;
        desc: string;
        assignee_id: string; // Assuming ID is string, adjust if number
        post_author: string;
        priority: string;
        pinned?: number;
    }

    const handlePinToggle = () => {
        const newPinState = !isSidebarPinned
        setIsSidebarPinned(newPinState)
        if (newPinState) {
            // If pinning, force it open
            setIsSidebarOpen(true)
        }
        // If unpinning, hover will control opening/closing
    }

    const handleMouseEnter = () => {
        if (!isSidebarPinned) {
            setIsSidebarOpen(true)
        }
    }

    const handleMouseLeave = () => {
        if (!isSidebarPinned) {
            setIsSidebarOpen(false)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-zinc-950 to-neutral-950 text-zinc-200">
            {/* Sidebar - Added hover handlers */}
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    fixed top-0 left-0 h-full z-30 flex-shrink-0
                    bg-gradient-to-b from-zinc-900 to-zinc-950 border-r border-white/10
                    transition-transform duration-300 ease-in-out flex flex-col
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                    w-60 // Consistent width
                `}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 h-16 flex-shrink-0">
                    <h2 className="px-2 text-lg font-semibold text-zinc-100">Projects</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePinToggle}
                        aria-label={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                        className={clsx(
                            "border border-white/10 transition-colors",

                            "hover:bg-transparent hover:ring-0",

                            "hover:text-zinc-100",

                            isSidebarPinned ? "text-zinc-100" : "text-zinc-400"
                        )}
                    >
                        <Pin
                            className={clsx(
                                "h-4 w-4 transition-colors",
                                isSidebarPinned
                                    ? "fill-current stroke-current"
                                    : "fill-none stroke-current"
                            )}
                        />
                    </Button>
                </div>

                {/* Sidebar Content */}
                <ScrollArea className="flex-1 -mx-2">
                    <div className="px-2">
                        {boards.map((board: any) => (
                            <div key={board.id} className="flex items-center mb-1 group px-2">
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start text-sm font-medium h-8 px-2 ${boardId === board.id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                    onClick={() => handleBoardClick(board.id)}
                                >
                                    {board.title}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 p-0 ml-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 flex-shrink-0"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl w-48">
                                        <DropdownMenuItem
                                            className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer rounded-sm"
                                            onClick={() => console.log(`Edit board ${board.id}`)}
                                        >
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer rounded-sm"
                                            onClick={() => openAIIntegration(board)}
                                        >
                                            AI Integration
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Sidebar Footer */}
                <div className="mt-auto p-4 space-y-2 border-t border-white/10">
                    <BoardFormDialog />

                    <div className="flex items-center gap-2 mt-3">
                        <Link
                            href={route("profile.edit")}
                            className="flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-transparent hover:bg-zinc-800 hover:ring-1 hover:ring-white/20 transition-all text-zinc-400 hover:text-zinc-100"
                            aria-label="User Profile"
                        >
                            <User className="h-4 w-4" />
                        </Link>
                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-transparent text-zinc-400 hover:bg-red-800/50 hover:text-red-100 hover:ring-1 hover:ring-red-500/30 transition-all"
                            aria-label="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Updated padding logic */}
            <div
                className={`
                    flex-1 flex flex-col overflow-hidden transition-padding duration-300 ease-in-out overflow-x-auto
                    ${isSidebarOpen ? "pl-60" : "pl-0"} // Padding whenever sidebar is open
                `}
            >
                {/* Header/Toolbar */}
                <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-zinc-850 to-zinc-950 h-16 px-6 flex-shrink-0">
                    {/* Left Side: Title & Delete */}
                    <div className="flex items-center space-x-3">
                        <h1 className="text-xl font-semibold text-zinc-100 truncate">{boardTitle}</h1>
                        {boardId &&
                            <DeleteButton
                                resourceId={boardId}
                                type="Board"
                                className="h-8 w-8 border border-white/10 bg-transparent transition-all text-zinc-400 hover:bg-red-800/50 hover:text-red-100 hover:ring-1 hover:ring-red-500/30"
                            />
                        }
                    </div>

                    {/* Middle: Notifications (Optional - Keep or remove for minimalism) */}
                    <InlineNotificationCenter buttonClassName="text-zinc-400 hover:text-zinc-100 hover:bg-white/10" />

                    {/* Right Side: Filters & Actions */}
                    <div className="flex items-center gap-2">
                        {/* Add Task Button - Slightly more prominent? */}
                        <PostFormDialog
                            boards={boardsColumns}
                            assignees={assignees}
                            priorities={priorities}
                            authUserId={authUserId}
                            isPremium={isPremium}
                        />

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
                                <Input
                                    type="search"
                                    placeholder="Search tasks..."
                                    className="pl-8 w-[200px] bg-zinc-850 text-white border border-white/40 placeholder:text-zinc-400 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 hover:border-zinc-600 transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all"
                                    >
                                        {selectedAssignees.length > 0 ? `${selectedAssignees.length} selected` : "All Assignees"}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="my-1 bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl p-1"
                                    onKeyDown={(e) => e.preventDefault()}
                                >
                                    <div className="relative p-2">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
                                        <Input
                                            type="search"
                                            placeholder="Search assignees..."
                                            value={assigneeSearchQuery}
                                            onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="pl-8 w-full bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                                        />
                                    </div>
                                    <PreventCloseMenuItem
                                        onClick={() => setSelectedAssignees([])}
                                        className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:bg-zinc-800 focus:text-zinc-50 cursor-pointer rounded-sm p-2"
                                    >
                                        All Assignees
                                    </PreventCloseMenuItem>
                                    {filterBySearch(assignees, assigneeSearchQuery, (assignee) => assignee.name).map(
                                        (assignee: any) => (
                                            <PreventCloseMenuItem
                                                key={assignee.id}
                                                className={clsx(
                                                    "text-sm cursor-pointer rounded-sm my-1 p-2",
                                                    selectedAssignees.includes(assignee.id)
                                                        ? "bg-zinc-700 text-zinc-100"
                                                        : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:bg-zinc-800 focus:text-zinc-50"
                                                )}
                                            >
                                                <div
                                                    onClick={() =>
                                                        setSelectedAssignees((prev) =>
                                                            prev.includes(assignee.id)
                                                                ? prev.filter((id) => id !== assignee.id)
                                                                : [...prev, assignee.id],
                                                        )
                                                    }
                                                    className="w-full h-full"
                                                >
                                                    {assignee.name}
                                                </div>
                                            </PreventCloseMenuItem>
                                        ),
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all"
                                    >
                                        {selectedAuthors.length > 0 ? `${selectedAuthors.length} selected` : "All Authors"}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="my-1 bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl p-1"
                                    onKeyDown={(e) => e.preventDefault()}
                                >
                                    <div className="relative p-2">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
                                        <Input
                                            type="search"
                                            placeholder="Search authors..."
                                            value={authorSearchQuery}
                                            onChange={(e) => setAuthorSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="pl-8 w-full bg-zinc-900 text-zinc-100 border-zinc-700 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                                        />
                                    </div>
                                    <PreventCloseMenuItem onClick={() => setSelectedAuthors([])} className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:bg-zinc-800 focus:text-zinc-50 cursor-pointer rounded-sm p-2">
                                        All Authors
                                    </PreventCloseMenuItem>
                                    {filterBySearch(uniqueAuthors, authorSearchQuery, (author) => author).map((author: string) => (
                                        <PreventCloseMenuItem
                                            key={author}
                                            className={clsx(
                                                "text-sm cursor-pointer rounded-sm my-1 p-2",
                                                selectedAuthors.includes(author)
                                                    ? "bg-zinc-700 text-zinc-100"
                                                    : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:bg-zinc-800 focus:text-zinc-50"
                                            )}
                                        >
                                            <div
                                                onClick={() =>
                                                    setSelectedAuthors((prev) =>
                                                        prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author],
                                                    )
                                                }
                                                className="w-full h-full"
                                            >
                                                {author}
                                            </div>
                                        </PreventCloseMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="border border-white/40 bg-zinc-850 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all"
                                    >
                                        {selectedPriorities.length > 0 ? `${selectedPriorities.length} selected` : "All Priorities"}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="my-1 bg-gradient-to-br from-zinc-850 to-zinc-900 rounded-lg border border-white/10 text-zinc-100 shadow-xl p-1">
                                    <PreventCloseMenuItem onClick={() => setSelectedPriorities([])} className="text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:bg-zinc-800 focus:text-zinc-50 cursor-pointer rounded-sm p-2">
                                        All Priorities
                                    </PreventCloseMenuItem>
                                    {["low", "medium", "high"].map((priority) => (
                                        <PreventCloseMenuItem
                                            key={priority}
                                            onClick={() =>
                                                setSelectedPriorities((prev) =>
                                                    prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority],
                                                )
                                            }
                                            className={clsx(
                                                "text-sm cursor-pointer rounded-sm my-1 p-2 capitalize",
                                                selectedPriorities.includes(priority)
                                                    ? "bg-zinc-700 text-zinc-100"
                                                    : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 focus:bg-zinc-800 focus:text-zinc-50"
                                            )}
                                        >
                                            {priority}
                                        </PreventCloseMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DateFilter
                                onApplyFilter={handleApplyDateFilter}
                                onClearFilter={handleClearDateFilter}
                                initialDateFrom={activeDateFrom}
                                initialDateTo={activeDateTo}
                                initialDateField={dateField ?? undefined}
                                isActive={isDateFilterActive}
                                className={isDateFilterActive ? "ring-2 ring-primary ring-offset-1 ring-offset-zinc-800" : ""}
                            />
                        </div>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex flex-1 p-4 space-x-4 h-full">
                        {Object.values(columns).map((column: any) => {
                            const columnTasks = column.taskIds
                                .map((taskId: string) => tasks[taskId] as FilterableTask)
                                .filter((task: FilterableTask) => {
                                    if (!task) return false;
                                    const matchesSearch =
                                        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        task.desc.toLowerCase().includes(searchQuery.toLowerCase())
                                    const matchesAssignee =
                                        selectedAssignees.length === 0 || selectedAssignees.includes(task.assignee_id)
                                    const matchesAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(task.post_author)
                                    const matchesPriority =
                                        selectedPriorities.length === 0 || selectedPriorities.includes(task.priority.toLowerCase())
                                    return matchesSearch && matchesAssignee && matchesAuthor && matchesPriority
                                })
                                .sort((a: FilterableTask, b: FilterableTask) => {
                                    if (!a || !b) return 0;

                                    if (a.pinned === 1 && b.pinned !== 1) return -1; // Pinned a comes first
                                    if (a.pinned !== 1 && b.pinned === 1) return 1;  // Pinned b comes first

                                    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
                                    const priorityA = priorityOrder[a.priority?.toLowerCase() || 'low'] || 0;
                                    const priorityB = priorityOrder[b.priority?.toLowerCase() || 'low'] || 0;

                                    if (priorityA !== priorityB) {
                                        return priorityB - priorityA; // Higher priority value comes first
                                    }

                                    return 0; // Keep original relative order if pinned and priority are the same
                                })
                            return (
                                <div key={column.id} className="flex-1 min-w-[250px] max-w-screen">
                                    <Column column={column} tasks={columnTasks} />
                                </div>
                            )
                        })}
                    </div>
                </DragDropContext>

                {isEditDialogOpen && selectedTask && (
                    <PostFormDialog
                        boards={boardsColumns}
                        assignees={assignees}
                        priorities={priorities}
                        task={selectedTask}
                        onClose={closeDialog}
                        authUserId={authUserId}
                        isPremium={isPremium}
                    />
                )}

                {aiIntegrationOpen && selectedBoardForAI && (
                    <AISettingsDialog
                        isOpen={aiIntegrationOpen}
                        onClose={() => setAiIntegrationOpen(false)}
                        boardId={selectedBoardForAI.id}
                        boardTitle={selectedBoardForAI.title}
                        boards={boards}
                        isPremium={isPremium}
                    />
                )}
            </div>
        </div>
    )
}

export default BoardLayout
