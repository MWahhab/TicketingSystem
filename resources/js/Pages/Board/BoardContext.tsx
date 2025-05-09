"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
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
    priorities: Array<{id: string; name: string; is_default?: boolean}>
    statuses: Array<{id: string; name: string; is_default?: boolean; fid_column_template?: string}>
    boardTitle?: string
    authUserId: string
    openPostId?: string | null
    dateFrom?: string | null
    dateTo?: string | null
    dateField?: string | null
    defaultAssignee?: Assignee
}

interface BoardContextValue {
    boardId?: string
    boards: Board[]
    assignees: Assignee[]
    boardsColumns: Board[]
    priorities: Array<{id: string; name: string; is_default?: boolean}>
    statuses: Array<{id: string; name: string; is_default?: boolean; fid_column_template?: string}>
    boardTitle?: string
    authUserId: string
    openPostId?: string | null
    dateFrom?: string | null
    dateTo?: string | null
    dateField?: string | null
    isPremium: string
    defaultAssignee?: Assignee

    columns: Record<string, ColumnState>
    tasks: Record<string, Task>

    selectedTask: Task | null
    isEditDialogOpen: boolean

    handleBoardClick: (boardId: string) => void
    onDragEnd: (result: DropResult) => void
    openDialog: (taskId: string | null, type?: "edit" | "new") => void
    closeDialog: () => void

    updateTaskWatchers: (taskId: string, watchers: Watcher[]) => void
    pinTask: (taskId: string, isPinned: boolean) => void

    // New context values for focus/dimming
    focusedTaskId: string | null
    setFocusedTaskId: (id: string | null) => void

    // Functions for creating and updating tasks
    createTask: (taskData: Omit<Task, "id" | "watchers" | "comments" | "history" | "linked_issues" | "created_at" | "updated_at" | "assignee" | "pinned" | "had_branch" | "deadline_color"> & { fid_board: string | number }) => Promise<Task | null>
    updateTask: (taskId: string, taskData: Partial<Omit<Task, "id" | "watchers" | "comments" | "history" | "linked_issues" | "created_at" | "updated_at" | "assignee" | "pinned" | "had_branch" | "deadline_color"> & { fid_board: string | number }>) => Promise<Task | null>
    deleteTask: (taskId: string) => Promise<{deleted_post_id: string; board_id: string} | null >
}

const BoardContext = createContext<BoardContextValue>({
    boards: [],
    assignees: [],
    boardsColumns: [],
    priorities: [],
    statuses: [],
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
    defaultAssignee: undefined,

    // Default values for new context fields
    focusedTaskId: null,
    setFocusedTaskId: () => {},

    // Default values for task creation/update
    createTask: async () => null,
    updateTask: async () => null,
    deleteTask: async () => null,
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
                                  statuses,
                                  boardTitle,
                                  authUserId,
                                  openPostId,
                                  dateFrom,
                                  dateTo,
                                  dateField = "created_at",
                                  defaultAssignee,
                              }: BoardProviderProps) {

    const [columns, setColumns] = useState<Record<string, ColumnState>>({})
    const [tasks, setTasks] = useState<Record<string, Task>>({})

    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isPremium, setIsPremium] = useState("standard")
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null) // State for focused task

    // Memoize the assignees prop to stabilize its reference for the context consumers
    const memoizedAssignees = useMemo(() => assignees, [assignees]);

    useEffect(() => {

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
            const assigneeName = memoizedAssignees.find(a => a.id === assigneeIdNum)?.name || 'Unassigned'
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
    }, [columnsArray, postsArray, memoizedAssignees])

    useEffect(() => {
        fetch("/premium/status", {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((res) => res.json())
            .then((data) => {
                if (typeof data?.data?.isPremium === "string") {
                    setIsPremium(data.data.isPremium)
                }
            })
    }, [])

    const createTask = useCallback(async (taskData: Omit<Task, "id" | "watchers" | "comments" | "history" | "linked_issues" | "created_at" | "updated_at" | "assignee" | "pinned" | "had_branch" | "deadline_color"> & { fid_board: string | number }): Promise<Task | null> => {
        try {
            const response = await fetch("/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
                },
                body: JSON.stringify(taskData),
                credentials: "same-origin",
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error("Error creating task:", errorData)
                // Here you could set an error message to display in the UI
                alert(`Error creating task: ${errorData.message || response.statusText}`)
                return null
            }

            const { post: newPostData, message } = await response.json()
            // alert(message) // Or use a toast notification

            // Reconstruct task for local state, similar to initial hydration
            const { post_author: inputAuthorId } = taskData; // taskData is the input to createTask
            const assigneeIdNum = parseInt(newPostData.assignee_id, 10)
            const assigneeName = memoizedAssignees.find(a => a.id === assigneeIdNum)?.name || 'Unassigned'
            const taskPriority = newPostData.priority === 'med' ? 'medium' : newPostData.priority

            const newTask: Task = {
                // Base data from server response
                id: newPostData.id.toString(),
                title: newPostData.title,
                desc: newPostData.desc,
                column: newPostData.column,
                assignee_id: newPostData.assignee_id,
                deadline: newPostData.deadline,
                fid_board: newPostData.fid_board,
                created_at: newPostData.created_at,
                updated_at: newPostData.updated_at,
                pinned: newPostData.pinned,
                had_branch: newPostData.had_branch,
                deadline_color: newPostData.deadline_color,
                // Explicitly set fields
                post_author: inputAuthorId, // Use the author ID that was submitted
                assignee: { name: assigneeName }, // Resolved assignee name
                priority: taskPriority, // Normalized priority
                // Ensure related data arrays are initialized
                watchers: newPostData.watchers || [],
                comments: newPostData.comments || [],
                history: newPostData.history || {}, // Or newPostData.history if server sends full history object
                linked_issues: newPostData.linked_issues || [],
            }

            setTasks(prevTasks => ({
                ...prevTasks,
                [newTask.id]: newTask,
            }))

            setColumns(prevColumns => {
                const targetColumnId = newTask.column.toString()
                if (prevColumns[targetColumnId]) {
                    const updatedColumn = {
                        ...prevColumns[targetColumnId],
                        taskIds: [...prevColumns[targetColumnId].taskIds, newTask.id],
                    }
                    return {
                        ...prevColumns,
                        [targetColumnId]: updatedColumn,
                    }
                }
                return prevColumns // Should not happen if column exists
            })
            
            setSelectedTask(newTask);      // Select the newly created task
            setIsEditDialogOpen(true);   // Open the dialog for this task

            return newTask
        } catch (error) {
            console.error("Network error creating task:", error)
            alert("Network error creating task. Please try again.")
            return null
        }
    }, [memoizedAssignees])

    const updateTask = useCallback(async (taskId: string, taskData: Partial<Omit<Task, "id" | "watchers" | "comments" | "history" | "linked_issues" | "created_at" | "updated_at" | "assignee" | "pinned" | "had_branch" | "deadline_color"> & { fid_board: string | number }>): Promise<Task | null> => {
        try {
            const response = await fetch(`/posts/${taskId}`, {
                method: "PUT", // Or PATCH if your backend supports it
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
                },
                body: JSON.stringify(taskData),
                credentials: "same-origin",
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error("Error updating task:", errorData)
                alert(`Error updating task: ${errorData.message || response.statusText}`)
                return null
            }

            const { post: updatedPostData, message } = await response.json()
            // alert(message) // Or use a toast notification

            const assigneeIdNum = parseInt(updatedPostData.assignee_id, 10)
            const assigneeName = memoizedAssignees.find(a => a.id === assigneeIdNum)?.name || 'Unassigned'
            const taskPriority = updatedPostData.priority === 'med' ? 'medium' : updatedPostData.priority

            const updatedTask: Task = {
                ...tasks[taskId], // Preserve existing fields not returned by API if any
                ...updatedPostData,
                id: updatedPostData.id.toString(),
                assignee: { name: assigneeName },
                priority: taskPriority,
                 // Assuming backend might send these or they are updated separately
                watchers: updatedPostData.watchers || tasks[taskId]?.watchers || [],
                comments: updatedPostData.comments || tasks[taskId]?.comments || [],
                history: updatedPostData.history || tasks[taskId]?.history || {},
                linked_issues: updatedPostData.linked_issues || tasks[taskId]?.linked_issues || [],
            }

            setTasks(prevTasks => ({
                ...prevTasks,
                [updatedTask.id]: updatedTask,
            }))
            
            // Handle column change if taskData included a new column
            const oldColumnId = tasks[taskId]?.column?.toString();
            const newColumnId = updatedTask.column?.toString();

            if (oldColumnId && newColumnId && oldColumnId !== newColumnId) {
                setColumns(prevColumns => {
                    const newCols = { ...prevColumns };
                    // Remove from old column
                    if (newCols[oldColumnId]) {
                        newCols[oldColumnId] = {
                            ...newCols[oldColumnId],
                            taskIds: newCols[oldColumnId].taskIds.filter(id => id !== updatedTask.id)
                        };
                    }
                    // Add to new column
                    if (newCols[newColumnId]) {
                         // Avoid duplicates, ensure it's added if not present
                        const taskIdsSet = new Set(newCols[newColumnId].taskIds);
                        taskIdsSet.add(updatedTask.id);
                        newCols[newColumnId] = {
                            ...newCols[newColumnId],
                            taskIds: Array.from(taskIdsSet)
                        };
                    } else { // If new column somehow doesn't exist (should not happen)
                        newCols[newColumnId] = { id: newColumnId, title: newColumnId /* or fetch title */, taskIds: [updatedTask.id] };
                    }
                    return newCols;
                });
            }


            // If the updated task is the one currently selected in a dialog, update that too
            if (selectedTask && selectedTask.id === updatedTask.id) {
                setSelectedTask(updatedTask)
            }
            
            // Optionally, close any dialogs
            // closeDialog(); // If an edit dialog is open and you want to close on save

            return updatedTask
        } catch (error) {
            console.error("Network error updating task:", error)
            alert("Network error updating task. Please try again.")
            return null
        }
    }, [tasks, memoizedAssignees, selectedTask])

    const deleteTask = useCallback(async (taskId: string): Promise<{deleted_post_id: string; board_id: string} | null> => {
        try {
            const response = await fetch(`/posts/${taskId}`, {
                method: "DELETE",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
                },
                credentials: "same-origin",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Catch if body is not JSON
                console.error("Error deleting task:", errorData);
                alert(`Error deleting task: ${errorData.message || response.statusText}`);
                return null;
            }

            const { deleted_post_id, board_id, message } = await response.json();
            // alert(message); // Or use a toast notification

            setTasks(prevTasks => {
                const newTasks = { ...prevTasks };
                delete newTasks[deleted_post_id];
                return newTasks;
            });

            setColumns(prevColumns => {
                const newColumns = { ...prevColumns };
                for (const columnId in newColumns) {
                    newColumns[columnId] = {
                        ...newColumns[columnId],
                        taskIds: newColumns[columnId].taskIds.filter(id => id !== deleted_post_id),
                    };
                }
                return newColumns;
            });

            // If the deleted task was selected, clear it
            if (selectedTask && selectedTask.id === deleted_post_id) {
                setSelectedTask(null);
                setIsEditDialogOpen(false); // Ensure this is called
            }

            return { deleted_post_id, board_id };
        } catch (error) {
            console.error("Network error deleting task:", error);
            alert("Network error deleting task. Please try again.");
            return null;
        }
    }, [selectedTask]);

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
     * Close the PostFormDialog
     */
    const closeDialog = useCallback(() => {
        setIsEditDialogOpen(false)
        setSelectedTask(null)
    }, [])

    /**
     * Open the PostFormDialog for a specific Task
     */
    const openDialog = useCallback((taskId: string | null, type: "edit" | "new" = "edit") => {
        console.log(`[BoardContext] openDialog called with taskId: ${taskId}, type: ${type}`);
        if (type === "new") {
            const defaultPriorityObj = priorities.find(p => p.is_default);
            const defaultPriorityName = defaultPriorityObj ? defaultPriorityObj.name.toLowerCase() : "medium";
            
            // Removed defaultStatusObj logic as it was causing issues and fid_status is not on Task template
            const firstColumnKey = Object.keys(columns).length > 0 ? Object.keys(columns)[0] : null;
            const firstColumn = firstColumnKey ? columns[firstColumnKey] : null;

            const newPostTemplate: Partial<Task> = {
                id: "new_post", 
                title: "Create New Post",
                desc: "",
                assignee: defaultAssignee || (assignees.length > 0 ? assignees[0] : undefined),
                priority: defaultPriorityName as Task['priority'],
                column: firstColumn ? firstColumn.id : '',
                fid_board: boardId ? boardId: '',
                comments: [],
                history: {},
                watchers: [],
                linked_issues: [],
            };
            // @ts-ignore 
            setSelectedTask(newPostTemplate as Task); 
            setIsEditDialogOpen(true); 
            return;
        }

        if (!taskId) { 
            console.log("[BoardContext] openDialog: Task ID is missing for edit mode.");
            closeDialog();
            return;
        }

        const taskIdsInState = Object.keys(tasks);
        console.log(`[BoardContext] openDialog: Attempting to find task ID '${taskId}'. Current task IDs in state: [${taskIdsInState.join(', ')}]`);

        const taskToOpen = tasks[taskId]; 

        console.log(`[BoardContext] openDialog: Task found for ID '${taskId}':`, taskToOpen ? `ID ${taskToOpen.id} (Title: ${taskToOpen.title})` : 'Not Found');

        if (taskToOpen) {
            setSelectedTask(taskToOpen);
            setIsEditDialogOpen(true);
        } else { 
            console.log(`[BoardContext] openDialog: Task with ID ${taskId} not found in 'tasks' object. Current task IDs in state: [${taskIdsInState.join(', ')}]`);
            closeDialog();
        }
    }, [tasks, assignees, columns, closeDialog, priorities, statuses, boardId, defaultAssignee]);

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
                assignees: memoizedAssignees,
                boardsColumns,
                priorities,
                statuses,
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
                createTask,
                updateTask,
                deleteTask,
                defaultAssignee,
            }}
        >
            {children}
        </BoardContext.Provider>
    )
}
