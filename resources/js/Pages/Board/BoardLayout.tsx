"use client"

import React, { useEffect, useState } from "react"
import { usePage, router, Link } from "@inertiajs/react"
import { DragDropContext } from "react-beautiful-dnd"
import { Search, ChevronDown, User, LogOut } from "lucide-react"
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

// Context imports
import { BoardProvider, useBoardContext } from "./BoardContext"

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
    } = useBoardContext()

    const [activeDateFrom, setActiveDateFrom] = useState<Date | null>(dateFrom ? new Date(dateFrom) : null)
    const [activeDateTo, setActiveDateTo] = useState<Date | null>(dateTo ? new Date(dateTo) : null)
    const [activeDateField, setActiveDateField] = useState<string>(dateField || "created_at")
    const [isDateFilterActive, setIsDateFilterActive] = useState(!!dateFrom || !!dateTo)

    const [didAutoOpen, setDidAutoOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedAssignees, setSelectedAssignees] = useState([])
    const [selectedAuthors, setSelectedAuthors] = useState([])
    const [selectedPriorities, setSelectedPriorities] = useState([])
    const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("")
    const [authorSearchQuery, setAuthorSearchQuery] = useState("")

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
            // Update local state
            setActiveDateFrom(dateFrom)
            setActiveDateTo(dateTo)
            setActiveDateField(dateField)
            setIsDateFilterActive(true)
            
            const params = new URLSearchParams()
            params.set("board_id", boardId)

            if (dateFrom) {
                params.set("date_from", format(dateFrom, "yyyy-MM-dd"))
            }
            
            params.set("date_field", dateField)

            if (dateTo) {
                params.set("date_to", format(dateTo, "yyyy-MM-dd"))
            }

            router.get(`/boards?${params.toString()}`)
        }
    }

    const handleClearDateFilter = () => {
        setActiveDateFrom(null)
        setActiveDateTo(null)
        setActiveDateField("created_at")
        setIsDateFilterActive(false)
        if (boardId) {
            router.get(`/boards?board_id=${boardId}&date_field=created_at`)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-900 text-white">
            <div className="w-64 border-r border-zinc-700 p-4 flex flex-col min-h-0">
                <h2 className="mb-4 text-lg font-semibold text-white">Projects</h2>
                <ScrollArea className="flex-1 overflow-y-auto">
                    {boards.map((board: any) => (
                        <Button
                            key={board.id}
                            variant="ghost"
                            className="w-full justify-start mb-1 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            onClick={() => handleBoardClick(board.id)}
                        >
                            {board.title}
                        </Button>
                    ))}
                </ScrollArea>

                <div className="mt-auto pt-4 space-y-2">
                    <Button
                        className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                        onClick={() => document.querySelector('[data-dialog-trigger="board-form"]')?.click()}
                    >
                        Add new board
                    </Button>

                    <div className="flex items-center gap-2 mt-3">
                        <Link
                            href={route("profile.edit")}
                            className="flex items-center justify-center w-10 h-10 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            <User className="h-5 w-5 text-zinc-300" />
                        </Link>
                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="flex items-center justify-between w-full h-10 px-3 rounded-md bg-zinc-800 text-zinc-300 hover:bg-red-100 hover:text-red-900 transition-colors"
                        >
                            <span>Logout</span>
                            <LogOut className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {/* Hidden trigger for the board form dialog */}
                <div className="hidden">
                    <BoardFormDialog />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-700 p-4">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl font-bold text-white">{boardTitle}</h1>
                            {boardId && <DeleteButton resourceId={boardId} type="Board" />}
                        </div>

                        <InlineNotificationCenter />

                        <div className="flex items-center gap-3">
                            <PostFormDialog
                                boards={boardsColumns}
                                assignees={assignees}
                                priorities={priorities}
                                authUserId={authUserId}
                            />

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
                                    <Input
                                        type="search"
                                        placeholder="Search tasks..."
                                        className="pl-8 w-[200px] bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                                        >
                                            {selectedAssignees.length > 0 ? `${selectedAssignees.length} selected` : "All Assignees"}
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="my-1 bg-zinc-800 border-zinc-700 text-white"
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
                                                className="pl-8 w-full bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
                                            />
                                        </div>
                                        <PreventCloseMenuItem
                                            onClick={() => setSelectedAssignees([])}
                                            className="hover:bg-zinc-700 hover:text-white"
                                        >
                                            All Assignees
                                        </PreventCloseMenuItem>
                                        {filterBySearch(assignees, assigneeSearchQuery, (assignee) => assignee.name).map(
                                            (assignee: any) => (
                                                <PreventCloseMenuItem
                                                    key={assignee.id}
                                                    className={`my-1 hover:bg-zinc-700 ${
                                                        selectedAssignees.includes(assignee.id) ? "bg-zinc-700 text-white" : ""
                                                    }`}
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
                                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                                        >
                                            {selectedAuthors.length > 0 ? `${selectedAuthors.length} selected` : "All Authors"}
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="my-1 bg-zinc-800 border-zinc-700 text-white"
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
                                                className="pl-8 w-full bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
                                            />
                                        </div>
                                        <PreventCloseMenuItem onClick={() => setSelectedAuthors([])} className="hover:bg-zinc-700">
                                            All Authors
                                        </PreventCloseMenuItem>
                                        {filterBySearch(uniqueAuthors, authorSearchQuery, (author) => author).map((author: string) => (
                                            <PreventCloseMenuItem
                                                key={author}
                                                className={`my-1 hover:bg-zinc-700 ${
                                                    selectedAuthors.includes(author) ? "bg-zinc-700 text-white" : ""
                                                }`}
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
                                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                                        >
                                            {selectedPriorities.length > 0 ? `${selectedPriorities.length} selected` : "All Priorities"}
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-white">
                                        <PreventCloseMenuItem onClick={() => setSelectedPriorities([])} className="my-1 hover:bg-zinc-700">
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
                                                className={`my-1 hover:bg-zinc-700 ${selectedPriorities.includes(priority) ? "bg-zinc-700 text-white" : ""}`}
                                            >
                                                <span className="capitalize">{priority}</span>
                                            </PreventCloseMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DateFilter
                                    onApplyFilter={handleApplyDateFilter}
                                    onClearFilter={handleClearDateFilter}
                                    initialDateFrom={activeDateFrom}
                                    initialDateTo={activeDateTo}
                                    initialDateField={activeDateField}
                                    isActive={isDateFilterActive}
                                    className={isDateFilterActive ? "ring-2 ring-primary ring-offset-1 ring-offset-zinc-800" : ""}
                                    
                                />
                            </div>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex flex-1 overflow-x-auto p-4 space-x-4">
                            {Object.values(columns).map((column: any) => {
                                const columnTasks = column.taskIds
                                    .map((taskId: string) => tasks[taskId])
                                    .filter((task) => {
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
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default BoardLayout

