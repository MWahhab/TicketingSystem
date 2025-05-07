"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { router } from "@inertiajs/react"
import type { DropResult } from "react-beautiful-dnd"

export interface Board {
    id: string
    title: string
    columns: string[]
}

export interface Assignee {
    id: number
    name: string
}

interface Watcher {
    watcher_id: number
    id: number
    name: string
}

interface Comment { 
    id: string;
    content: string;
    author: string;
    createdAt: string;
} 

export interface Task {
    id: string
    title: string
    desc: string
    column: string
    assignee_id: string | number
    deadline: string | null
    fid_board: string | number
    post_author: string | number
    watchers: Watcher[]
    created_at?: string
    updated_at?: string
    priority: "high" | "medium" | "low"
    assignee: {
        name: string
    }
    pinned?: number
    had_branch?: number
    deadline_color?: 'gray' | 'yellow' | 'red' | null
    comments?: Comment[]
    history?: Record<string, Array<{ id: string; type: string; content: string | null; createdAt: string | null }>>
    linked_issues?: Array<{
        id: number;
        type: string;
        related_post: {
            id: number;
            title: string;
        };
    }>
}

interface ColumnState {
    id: string
    title: string
    taskIds: string[]
}

interface BoardProviderProps {
    children: React.ReactNode
    boardId?: string
    columnsArray: string[]
    postsArray: any[]
    boards: Board[]
    assignees: Assignee[]
    boardsColumns: Board[]
    priorities: string[]
    boardTitle?: string
    authUserId: string
    openPostId?: string | null
    dateFrom?: string | null
    dateTo?: string | null
    dateField?: string | null
}

interface BoardContextValue {
    boardId?: string
    boards: Board[]
    assignees: Assignee[]
    boardsColumns: Board[]
    priorities: string[]
    boardTitle?: string
    authUserId: string
    openPostId?: string | null
    dateFrom?: string | null
    dateTo?: string | null
    dateField?: string | null
    isPremium: string

    columns: Record<string, ColumnState>
    tasks: Record<string, Task>

    selectedTask: Task | null
    isEditDialogOpen: boolean

    handleBoardClick: (boardId: string) => void
    onDragEnd: (result: DropResult) => void
    openDialog: (taskId: string) => void
    closeDialog: () => void

    updateTaskWatchers: (taskId: string, watchers: Watcher[]) => void
    pinTask: (taskId: string, isPinned: boolean) => void

    // New context values for focus/dimming
    focusedTaskId: string | null
    setFocusedTaskId: (id: string | null) => void
}

const BoardContext = createContext<BoardContextValue>({
    boards: [],
    assignees: [],
    boardsColumns: [],
    priorities: [],
    authUserId: "",
    openPostId: null,
    dateFrom: null,
    dateTo: null,
    dateField: "created_at",
    columns: {},
    tasks: {},
    selectedTask: null,
    isEditDialogOpen: false,
    handleBoardClick: () => {},
    onDragEnd: () => {},
    openDialog: () => {},
    closeDialog: () => {},
    isPremium: "standard",
    updateTaskWatchers: () => {},
    pinTask: () => {},

    // Default values for new context fields
    focusedTaskId: null,
    setFocusedTaskId: () => {},
})

/**
 * Hook so any child can do `const { openDialog } = useBoardContext()`
 */
export function useBoardContext() {
    return useContext(BoardContext)
}

export function BoardProvider({
                                  children,
                                  boardId,
                                  columnsArray,
                                  postsArray,
                                  boards,
                                  assignees,
                                  boardsColumns,
                                  priorities,
                                  boardTitle,
                                  authUserId,
                                  openPostId,
                                  dateFrom,
                                  dateTo,
                                  dateField = "created_at",
                              }: BoardProviderProps) {
    // Log the assignees prop as soon as the provider receives it
    // console.log("[BoardProvider] Received assignees prop:", assignees);

    const [columns, setColumns] = useState<Record<string, ColumnState>>({})
    const [tasks, setTasks] = useState<Record<string, Task>>({})

    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isPremium, setIsPremium] = useState("standard")
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null) // State for focused task

    useEffect(() => {
        // Log assignees again when the effect processing posts runs
        // console.log("[BoardProvider useEffect] Assignees when processing posts:", assignees);

        const initialColumns: Record<string, ColumnState> = {}
        columnsArray.forEach((colTitle) => {
            const colId = colTitle.toString()
            initialColumns[colId] = {
                id: colId,
                title: colTitle,
                taskIds: [],
            }
        })

        const initialTasks: Record<string, Task> = {}
        postsArray.forEach((post: any) => {
            const taskId = post.id.toString()
            const assigneeIdNum = parseInt(post.assignee_id, 10)
            const assigneeName = assignees.find(a => a.id === assigneeIdNum)?.name || 'Unassigned'
            const taskPriority = post.priority === 'med' ? 'medium' : post.priority

            initialTasks[taskId] = {
                id: taskId,
                title: post.title,
                desc: post.desc,
                priority: taskPriority,
                column: post.column,
                assignee_id: post.assignee_id,
                deadline: post.deadline,
                fid_board: post.fid_board,
                post_author: post.post_author,
                watchers: post.watchers || [],
                created_at: post.created_at,
                updated_at: post.updated_at,
                assignee: { name: assigneeName },
                pinned: post.pinned,
                had_branch: post.had_branch,
                deadline_color: post.deadline_color,
                comments: post.comments,
                history: post.history,
                linked_issues: post.linked_issues,
            }

            const colId = post.column.toString()
            if (initialColumns[colId]) {
                initialColumns[colId].taskIds.push(taskId)
            }
        })

        setColumns(initialColumns)
        setTasks(initialTasks)
    }, [columnsArray, postsArray, assignees])

    useEffect(() => {
        fetch("/premium/status", {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((res) => res.json())
            .then((data) => {
                // console.log("Received data:", data)
                if (typeof data?.data?.isPremium === "string") {
                    setIsPremium(data.data.isPremium)
                }
            })
            .catch((err) => {
                // console.error("Error fetching premium status:", err)
            })
    }, [])

    const handleBoardClick = useCallback(
        (targetBoardId: string) => {
            if (dateFrom || dateTo) {
                const params = new URLSearchParams()
                params.set("board_id", targetBoardId)

                if (dateFrom) {
                    params.set("date_from", dateFrom)
                }

                if (dateTo) {
                    params.set("date_to", dateTo)
                }

                if (dateField) {
                    params.set("date_field", dateField)
                }

                router.get(`/boards?${params.toString()}`)
            } else {
                router.get(`/boards?board_id=${targetBoardId}`)
            }
        },
        [dateFrom, dateTo, dateField],
    )

    const onDragEnd = useCallback((result: DropResult) => {
        const { destination, source, draggableId } = result
        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return
        }

        setTasks((prevTasks) => ({
            ...prevTasks,
            [draggableId]: {
                ...prevTasks[draggableId],
                column: destination.droppableId,
            },
        }))

        setColumns((prevColumns) => {
            const currentTasks = tasks;

            const sourceColumn = prevColumns[source.droppableId];
            const finishColumn = prevColumns[destination.droppableId];

            const sourceStateTaskIds = Array.from(sourceColumn.taskIds);
            const destStateTaskIds =
                source.droppableId === destination.droppableId
                    ? sourceStateTaskIds
                    : Array.from(finishColumn.taskIds);

            const removalIndex = sourceStateTaskIds.findIndex((id) => id === draggableId);
            if (removalIndex === -1) {
                // console.error("Dragged item not found in source column state");
                return prevColumns;
            }

            sourceStateTaskIds.splice(removalIndex, 1);

            const destTaskObjects = prevColumns[destination.droppableId].taskIds
                 .map(tid => currentTasks[tid])
                 .filter(task => !!task);

            const sortedDestTaskObjects = [...destTaskObjects].sort((a, b) => {
                if (a.pinned === 1 && b.pinned !== 1) return -1;
                if (a.pinned !== 1 && b.pinned === 1) return 1;
                return 0;
            });

            const sortedDestTaskIds = sortedDestTaskObjects.map(t => t.id);

            const targetItemId = sortedDestTaskIds[destination.index];

            let insertionIndex;
            if (targetItemId) {
                insertionIndex = destStateTaskIds.findIndex(id => id === targetItemId);
                if (insertionIndex === -1) {
                    // console.warn("Target item for insertion not found in destination state, adding to end.");
                    insertionIndex = destStateTaskIds.length;
                }
            } else {
                insertionIndex = destStateTaskIds.length;
            }

            const finalDestTaskIds = (source.droppableId === destination.droppableId) ? sourceStateTaskIds : destStateTaskIds;
            finalDestTaskIds.splice(insertionIndex, 0, draggableId);

            if (source.droppableId === destination.droppableId) {
                return {
                    ...prevColumns,
                    [source.droppableId]: {
                        ...sourceColumn,
                        taskIds: finalDestTaskIds,
                    },
                };
            } else {
                return {
                    ...prevColumns,
                    [source.droppableId]: {
                        ...sourceColumn,
                        taskIds: sourceStateTaskIds,
                    },
                    [destination.droppableId]: {
                        ...finishColumn,
                        taskIds: finalDestTaskIds,
                    },
                };
            }
        })

        fetch(`/move/${draggableId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({
                _token: document.querySelector('meta[name="csrf-token"]')?.getAttribute("content"),
                _method: "POST",
                column: destination.droppableId,
            }),
            credentials: "same-origin",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`)
                }
            })
            .catch((error) => {
                // console.error("Error during fetch:", error)
            })
    }, [tasks])

    /**
     * Open the PostFormDialog for a specific Task
     */
    const openDialog = useCallback(
        (taskId: string) => {
            const foundTask = tasks[taskId]
            if (!foundTask) return
            setSelectedTask(foundTask)
            setIsEditDialogOpen(true)
        },
        [tasks],
    )

    /**
     * Close the PostFormDialog
     */
    const closeDialog = useCallback(() => {
        setIsEditDialogOpen(false)
        setSelectedTask(null)
    }, [])

    /**
     * Update watchers for a specific task
     */
    const updateTaskWatchers = useCallback((taskId: string, watchers: Watcher[]) => {
        setTasks((prevTasks) => {
            if (!prevTasks[taskId]) return prevTasks

            return {
                ...prevTasks,
                [taskId]: {
                    ...prevTasks[taskId],
                    watchers: watchers,
                },
            }
        })

        setSelectedTask((prevSelectedTask: Task | null) => {
            if (prevSelectedTask && prevSelectedTask.id === taskId) {
                return {
                    ...prevSelectedTask,
                    watchers: watchers,
                }
            }
            return prevSelectedTask
        })
    }, [])

    const pinTask = useCallback((taskId: string, isPinned: boolean) => {
        setTasks((prevTasks) => {
            const task = prevTasks[taskId]
            if (!task) return prevTasks

            return {
                ...prevTasks,
                [taskId]: {
                    ...task,
                    pinned: isPinned ? 1 : 0,
                },
            }
        })

        fetch(`/pin/${taskId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({
                _token: document.querySelector('meta[name="csrf-token"]')?.getAttribute("content"),
                _method: "POST",
                pinned: isPinned ? 1 : 0,
            }),
            credentials: "same-origin",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`)
                }
            })
            .catch((error) => {
                // console.error("Error during pin operation:", error)
                setTasks((prevTasks) => {
                    const task = prevTasks[taskId]
                    if (!task) return prevTasks

                    return {
                        ...prevTasks,
                        [taskId]: {
                            ...task,
                            pinned: isPinned ? 0 : 1,
                        },
                    }
                })
            })
    }, [])

    return (
        <BoardContext.Provider
            value={{
                boardId,
                boards,
                assignees,
                boardsColumns,
                priorities,
                boardTitle,
                authUserId,
                openPostId,
                dateFrom,
                dateTo,
                dateField,
                columns,
                tasks,
                selectedTask,
                isEditDialogOpen,
                handleBoardClick,
                onDragEnd,
                openDialog,
                closeDialog,
                isPremium,
                updateTaskWatchers,
                pinTask,
                focusedTaskId,
                setFocusedTaskId,
            }}
        >
            {children}
        </BoardContext.Provider>
    )
}
