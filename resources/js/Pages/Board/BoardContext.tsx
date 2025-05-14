"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { router } from "@inertiajs/react"
import type { DropResult } from "react-beautiful-dnd"
import { isAxiosError } from 'axios';
import StateMachine from "@/utils/state-machine";


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
        StateMachine.define("CardMoved", ({ post_id, new_column_id, title, desc, deadline, pinned, priority, assignee_id, assignee_name }) => {
            const taskId = String(post_id);
            const eventTargetColumnId = String(new_column_id); // Column ID from the event

            // First, update the task's own data, including its intended column
            setTasks(prevTasks => {
                const task = prevTasks[taskId];
                if (!task) return prevTasks; // Task not found, do nothing
                return {
                    ...prevTasks,
                    [taskId]: {
                        ...task,
                        column: eventTargetColumnId, // Update task's own column property
                        title: title,
                        desc: desc, // Update description
                        deadline: deadline,
                        pinned: pinned,
                        priority: priority as Task["priority"],
                        assignee_id: String(assignee_id),
                        assignee: { name: assignee_name }
                    }
                };
            });

            // Then, update the columns structure if the task actually moved
            // or needs to be placed correctly if it was somehow not in any column list.
            setColumns(prevColumns => {
                let currentColumnIdOfTaskInStructure: string | null = null;
                for (const colId in prevColumns) {
                    if (prevColumns[colId].taskIds.includes(taskId)) {
                        currentColumnIdOfTaskInStructure = colId;
                        break;
                    }
                }

                // If the task's reported column from the event is different from where it is in the columns structure,
                // or if it wasn't found in any column structure but should be in the eventTargetColumnId.
                if (currentColumnIdOfTaskInStructure !== eventTargetColumnId) {
                    const newColumnsState = { ...prevColumns };

                    // Remove from old column if it was in one
                    if (currentColumnIdOfTaskInStructure && newColumnsState[currentColumnIdOfTaskInStructure]) {
                        newColumnsState[currentColumnIdOfTaskInStructure] = {
                            ...newColumnsState[currentColumnIdOfTaskInStructure],
                            taskIds: newColumnsState[currentColumnIdOfTaskInStructure].taskIds.filter(id => id !== taskId)
                        };
                    }

                    // Add to new column
                    if (eventTargetColumnId) { // Ensure target column is valid
                        if (!newColumnsState[eventTargetColumnId]) {
                            // If target column doesn't exist in current state, create it.
                            // This might happen if columns are dynamic or not fully synced.
                            // For title, ideally, you'd get the actual column title if available.
                            newColumnsState[eventTargetColumnId] = {
                                id: eventTargetColumnId,
                                title: eventTargetColumnId, // Placeholder title
                                taskIds: [taskId]
                            };
                        } else {
                            // Add to existing target column if not already present
                            if (!newColumnsState[eventTargetColumnId].taskIds.includes(taskId)) {
                                newColumnsState[eventTargetColumnId] = {
                                    ...newColumnsState[eventTargetColumnId],
                                    taskIds: [...newColumnsState[eventTargetColumnId].taskIds, taskId]
                                };
                            }
                        }
                    }
                    return newColumnsState; // Return the modified columns
                }

                // If the task didn't change its column structurally, return the previous columns state.
                // The re-render for task *attribute* changes is driven by the `setTasks` update.
                return prevColumns;
            });
        });

        return () => StateMachine.reset();
    }, [memoizedAssignees]); // Dependencies for the effect hook

    useEffect(() => {
        window.axios.get("/premium/status")
            .then((response) => {
                const data = response.data; // Axios wraps response in .data
                if (typeof data?.data?.isPremium === "string") {
                    setIsPremium(data.data.isPremium);
                }
            })
            .catch(error => {
                console.error("Error fetching premium status:", error);
                // Optionally set a default or handle the error in the UI
                // setIsPremium("standard"); // Example: default to standard on error
            });
    }, [])

    const createTask = useCallback(async (taskData: Omit<Task, "id" | "watchers" | "comments" | "history" | "linked_issues" | "created_at" | "updated_at" | "assignee" | "pinned" | "had_branch" | "deadline_color"> & { fid_board: string | number }): Promise<Task | null> => {
        try {
            const response = await window.axios.post("/posts", taskData);

            const { post: newPostData, message } = response.data;

            const assigneeIdNum = parseInt(newPostData.assignee_id, 10)
            const assigneeName = memoizedAssignees.find(a => a.id === assigneeIdNum)?.name || 'Unassigned'
            const taskPriority = newPostData.priority === 'med' ? 'medium' : newPostData.priority

            const newTask: Task = {
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
                post_author: newPostData.post_author,
                assignee: { name: assigneeName },
                priority: taskPriority,
                watchers: newPostData.watchers || [],
                comments: newPostData.comments || [],
                history: newPostData.history || {},
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
            console.error("Error creating task:", error)
            let errorMessage = "Error creating task. Please try again.";
            if (isAxiosError(error) && error.response && error.response.data && typeof error.response.data.message === 'string') {
                errorMessage = `Error creating task: ${error.response.data.message}`;
            } else if (error instanceof Error) {
                errorMessage = `Error creating task: ${error.message}`;
            }
            alert(errorMessage);
            return null
        }
    }, [memoizedAssignees])

    const updateTask = useCallback(async (taskId: string, taskData: Partial<Omit<Task, "id" | "watchers" | "comments" | "history" | "linked_issues" | "created_at" | "updated_at" | "assignee" | "pinned" | "had_branch" | "deadline_color"> & { fid_board: string | number }>): Promise<Task | null> => {
        try {
            const response = await window.axios.put(`/posts/${taskId}`, taskData);

            const { post: updatedPostData } = response.data;
            // console.log(message); // Optional: for toast notification or debugging

            // Get the task's state *before* this update operation from the existing state.
            const taskAsItWasInState = tasks[taskId];
            if (!taskAsItWasInState) {
                console.error("Task to update not found in current state:", taskId);
                // Potentially alert the user or handle this more gracefully
                alert("Error: The task you tried to update was not found. Please refresh.");
                return null;
            }

            const assigneeIdNum = parseInt(updatedPostData.assignee_id, 10);
            const assigneeName = memoizedAssignees.find(a => a.id === assigneeIdNum)?.name || 'Unassigned';
            const taskPriority = updatedPostData.priority === 'med' ? 'medium' : updatedPostData.priority;

            // Construct the fully updated task object
            const taskWithServerUpdates: Task = {
                ...taskAsItWasInState, // Start with the task's current client-side state (has all fields)
                ...updatedPostData,    // Override with fields from the server response
                id: updatedPostData.id.toString(), // Ensure ID is a string from server data
                assignee: { name: assigneeName },  // Add resolved assignee name
                priority: taskPriority,           // Add normalized priority
                watchers: updatedPostData.watchers || taskAsItWasInState.watchers || [],
                comments: updatedPostData.comments || taskAsItWasInState.comments || [],
                history: updatedPostData.history || taskAsItWasInState.history || {},
                linked_issues: updatedPostData.linked_issues || taskAsItWasInState.linked_issues || [],
            };

            setTasks(prevTasks => ({
                ...prevTasks,
                [taskWithServerUpdates.id]: taskWithServerUpdates,
            }));
            
            const originalBoardId = taskAsItWasInState.fid_board?.toString();
            const newBoardId = taskWithServerUpdates.fid_board?.toString();
            const originalColumnId = taskAsItWasInState.column?.toString();
            const newColumnId = taskWithServerUpdates.column?.toString();

            // Update columns state if board or column has changed
            if (originalBoardId && newBoardId && originalColumnId && newColumnId && 
                (originalBoardId !== newBoardId || originalColumnId !== newColumnId)) {
                setColumns(prevColumns => {
                    const newCols = { ...prevColumns };

                    // If the board ID has changed
                    if (originalBoardId !== newBoardId) {
                        // Remove the task from its original column in the original board's state
                        if (newCols[originalColumnId] && newCols[originalColumnId].taskIds.includes(taskWithServerUpdates.id)) {
                            newCols[originalColumnId] = {
                                ...newCols[originalColumnId],
                                taskIds: newCols[originalColumnId].taskIds.filter(id => id !== taskWithServerUpdates.id)
                            };
                        }
                        // The task will appear on the new board when that board data is loaded.
                        // No need to add it to a column here if the board context itself will change (e.g., user navigates to new board).
                    }
                    // Else, if the board is the same BUT the column ID has changed
                    else if (originalColumnId !== newColumnId) {
                        // Remove from old column
                        if (newCols[originalColumnId]) {
                            newCols[originalColumnId] = {
                                ...newCols[originalColumnId],
                                taskIds: newCols[originalColumnId].taskIds.filter(id => id !== taskWithServerUpdates.id)
                            };
                        }
                        // Add to new column
                        if (newCols[newColumnId]) {
                            const taskIdsSet = new Set(newCols[newColumnId].taskIds);
                            taskIdsSet.add(taskWithServerUpdates.id);
                            newCols[newColumnId] = {
                                ...newCols[newColumnId],
                                taskIds: Array.from(taskIdsSet)
                            };
                        } else {
                            // This case implies the newColumnId isn't part of the current board's known columns.
                            // This should ideally not happen if data is consistent.
                            console.warn(`New column ${newColumnId} not found for current board. Creating it locally.`);
                            newCols[newColumnId] = { id: newColumnId, title: newColumnId /* Consider fetching actual title if necessary */, taskIds: [taskWithServerUpdates.id] };
                        }
                    }
                    return newCols;
                });
            }

            if (selectedTask && selectedTask.id === taskWithServerUpdates.id) {
                setSelectedTask(taskWithServerUpdates);
            }
            
            return taskWithServerUpdates;
        } catch (error) {
            console.error("Error updating task:", error);
            let errorMessage = "Network error updating task. Please try again.";
            if (isAxiosError(error) && error.response && error.response.data && typeof error.response.data.message === 'string') {
                errorMessage = `Error updating task: ${error.response.data.message}`;
            } else if (error instanceof Error) {
                errorMessage = `Error updating task: ${error.message}`;
            }
            alert(errorMessage);
            return null;
        }
    }, [tasks, memoizedAssignees, selectedTask]);

    const deleteTask = useCallback(async (taskId: string): Promise<{deleted_post_id: string; board_id: string} | null> => {
        try {
            const response = await window.axios.delete(`/posts/${taskId}`);
            const { deleted_post_id, board_id, message } = response.data; // Axios puts data in response.data
            // console.log(message); // Optional: for toast notification or debugging

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
            console.error("Error deleting task:", error); // Changed from "Network error deleting task:"
            let errorMessage = "Error deleting task. Please try again.";
            if (isAxiosError(error) && error.response && error.response.data && typeof error.response.data.message === 'string') {
                errorMessage = `Error deleting task: ${error.response.data.message}`;
            } else if (isAxiosError(error) && error.response) {
                errorMessage = `Error deleting task: ${error.response.statusText}`;
            } else if (error instanceof Error) {
                errorMessage = `Error deleting task: ${error.message}`;
            }
            alert(errorMessage);
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

        // Optimistically update local state
        setTasks((prevTasks) => ({
            ...prevTasks,
            [draggableId]: {
                ...prevTasks[draggableId],
                column: destination.droppableId,
            },
        }))

        setColumns((prevColumns) => {
            const currentTasks = tasks; // Use tasks from the closure of onDragEnd

            const sourceColumn = prevColumns[source.droppableId];
            const finishColumn = prevColumns[destination.droppableId];

            // Ensure columns exist
            if (!sourceColumn || !finishColumn) {
                console.error("Source or destination column not found in onDragEnd");
                // Optionally, revert optimistic update here or handle error appropriately
                return prevColumns;
            }

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

            // Correctly map task objects for sorting, ensuring tasks exist
            const destTaskObjects = prevColumns[destination.droppableId].taskIds
                 .map(tid => currentTasks[tid]) // Use tasks from closure
                 .filter(task => !!task); // Filter out undefined tasks if any

            const sortedDestTaskObjects = [...destTaskObjects].sort((a, b) => {
                if (a.pinned === 1 && b.pinned !== 1) return -1;
                if (a.pinned !== 1 && b.pinned === 1) return 1;
                return 0; // Keep original order for same pinned status or if neither is pinned
            });

            const sortedDestTaskIds = sortedDestTaskObjects.map(t => t.id);

            const targetItemId = sortedDestTaskIds[destination.index];

            let insertionIndex;
            if (targetItemId) {
                insertionIndex = destStateTaskIds.findIndex(id => id === targetItemId);
                if (insertionIndex === -1) {
                    // console.warn("Target item for insertion not found in destination state, adding to end.");
                    insertionIndex = destStateTaskIds.length; // Fallback: Add to the end
                }
            } else {
                insertionIndex = destStateTaskIds.length; // No target item, add to the end
            }

            // Use a fresh array for splicing if it's a different column
            const finalDestTaskIds = (source.droppableId === destination.droppableId) ? sourceStateTaskIds : [...destStateTaskIds];
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
                        taskIds: sourceStateTaskIds, // Only tasks remaining after removal
                    },
                    [destination.droppableId]: {
                        ...finishColumn,
                        taskIds: finalDestTaskIds, // Tasks including the newly added one
                    },
                };
            }
        })

        // API call to update the backend
        window.axios.post(`/move/${draggableId}`, {
            column: destination.droppableId,
        })
        .then((response) => {
            // Optional: handle successful response, e.g., show a toast
            // console.log("Move successful:", response.data);
        })
        .catch((error) => {
            console.error("Error during task move:", error);
            // Revert optimistic update on error
            // This part can be complex and depends on how you want to handle rollback
            // For simplicity, we're logging the error. A more robust solution
            // would involve resetting tasks and columns to their state before this onDragEnd call.
            // Consider fetching fresh data or implementing a more detailed rollback.
            alert("Failed to move task. Please refresh the page.");
        });
    }, [tasks]) // Added tasks to dependency array as it's used in setColumns updater

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
            closeDialog();
            return;
        }

        const taskToOpen = tasks[taskId];

        if (taskToOpen) {
            setSelectedTask(taskToOpen);
            setIsEditDialogOpen(true);
        } else { 
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
        // Optimistic UI update
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

        // API call
        window.axios.post(`/pin/${taskId}`, {
            pinned: isPinned ? 1 : 0,
        })
        .then((response) => {
            // Optional: Handle successful response
            // console.log("Pin successful:", response.data);
        })
        .catch((error) => {
            console.error("Error during pin operation:", error);
            // Revert optimistic update on error
            setTasks((prevTasks) => {
                const task = prevTasks[taskId]
                if (!task) return prevTasks // Should ideally not happen if task existed before

                // Revert to the opposite pinned state
                return {
                    ...prevTasks,
                    [taskId]: {
                        ...task,
                        pinned: isPinned ? 0 : 1, // Revert the change
                    },
                }
            })
            alert("Failed to update pin status. Please try again.");
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
