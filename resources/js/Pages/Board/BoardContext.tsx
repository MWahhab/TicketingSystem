
"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from "react";
import { router } from "@inertiajs/react";
import { DropResult } from "react-beautiful-dnd";

/**
 * Types you already had in your code:
 */
interface Board {
    id: string;
    title: string;
    columns: string[];
}

interface Assignee {
    id: string;
    name: string;
}

interface Task {
    id: string;
    title: string;
    desc: string;
    priority: string;
    column: string;
    assignee_id: string;
    deadline: string | null;
    fid_board: string;
    post_author: string;
    // ...plus any other fields
}

interface ColumnState {
    id: string;
    title: string;
    taskIds: string[];
}

/**
 * Props we need to initialize the context with your board data,
 * which we get from `usePage().props` in `BoardLayout`.
 */
interface BoardProviderProps {
    children: React.ReactNode;
    boardId?: string;
    columnsArray: string[];
    postsArray: Task[];
    boards: Board[];
    assignees: Assignee[];
    boardsColumns: Board[]; // same structure you used for <PostFormDialog>
    priorities: string[];
    boardTitle?: string;
    authUserId: string;
}

/**
 * Values our context will provide to children:
 */
interface BoardContextValue {
    // Basic board info:
    boardId?: string;
    boards: Board[];
    assignees: Assignee[];
    boardsColumns: Board[];
    priorities: string[];
    boardTitle?: string;
    authUserId: string;

    // Columns + tasks as state
    columns: Record<string, ColumnState>;
    tasks: Record<string, Task>;

    // Post dialog state:
    selectedTask: Task | null;
    isEditDialogOpen: boolean;

    // Actions:
    handleBoardClick: (boardId: string) => void;
    onDragEnd: (result: DropResult) => void;
    openDialog: (taskId: string) => void;
    closeDialog: () => void;
}

const BoardContext = createContext<BoardContextValue>({
    boards: [],
    assignees: [],
    boardsColumns: [],
    priorities: [],
    authUserId: "",
    columns: {},
    tasks: {},
    selectedTask: null,
    isEditDialogOpen: false,
    handleBoardClick: () => {},
    onDragEnd: () => {},
    openDialog: () => {},
    closeDialog: () => {}
});

/**
 * Hook so any child can do `const { openDialog } = useBoardContext()`
 */
export function useBoardContext() {
    return useContext(BoardContext);
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
                                  authUserId
                              }: BoardProviderProps) {
    // We'll store your columns + tasks here, as you did in BoardLayout.
    const [columns, setColumns] = useState<Record<string, ColumnState>>({});
    const [tasks, setTasks] = useState<Record<string, Task>>({});

    // State for opening the PostFormDialog on a specific task
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Initialize columns/tasks from columnsArray + postsArray
    useEffect(() => {
        const initialColumns: Record<string, ColumnState> = {};
        columnsArray.forEach((colTitle) => {
            const colId = colTitle.toString();
            initialColumns[colId] = {
                id: colId,
                title: colTitle,
                taskIds: []
            };
        });

        const initialTasks: Record<string, Task> = {};
        postsArray.forEach((task) => {
            const taskId = task.id.toString();
            initialTasks[taskId] = { ...task, id: taskId };

            const colId = task.column.toString();
            if (initialColumns[colId]) {
                initialColumns[colId].taskIds.push(taskId);
            }
        });

        setColumns(initialColumns);
        setTasks(initialTasks);
    }, [columnsArray, postsArray]);

    // If you want the user to switch boards in the left sidebar
    const handleBoardClick = useCallback((targetBoardId: string) => {
        router.get(`/boards?board_id=${targetBoardId}`);
    }, []);

    // The drag-drop update logic
    const onDragEnd = useCallback((result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Move the task internally
        setTasks((prevTasks) => ({
            ...prevTasks,
            [draggableId]: {
                ...prevTasks[draggableId],
                column: destination.droppableId
            }
        }));

        setColumns((prevColumns) => {
            const startColumn = prevColumns[source.droppableId];
            const finishColumn = prevColumns[destination.droppableId];

            if (startColumn === finishColumn) {
                const newTaskIds = Array.from(startColumn.taskIds);
                newTaskIds.splice(source.index, 1);
                newTaskIds.splice(destination.index, 0, draggableId);

                const newColumn = {
                    ...startColumn,
                    taskIds: newTaskIds
                };
                return {
                    ...prevColumns,
                    [newColumn.id]: newColumn
                };
            }

            // Moving between two different columns
            const startTaskIds = Array.from(startColumn.taskIds);
            startTaskIds.splice(source.index, 1);

            const finishTaskIds = Array.from(finishColumn.taskIds);
            finishTaskIds.splice(destination.index, 0, draggableId);

            return {
                ...prevColumns,
                [startColumn.id]: {
                    ...startColumn,
                    taskIds: startTaskIds
                },
                [finishColumn.id]: {
                    ...finishColumn,
                    taskIds: finishTaskIds
                }
            };
        });

        // Persist it to the DB
        fetch(`/move/${draggableId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({
                _token: document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute("content"),
                _method: "POST",
                column: destination.droppableId
            }),
            credentials: "same-origin"
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }
            })
            .catch((error) => {
                console.error("Error during fetch:", error);
            });
    }, []);

    /**
     * Open the PostFormDialog for a specific Task
     */
    const openDialog = useCallback(
        (taskId: string) => {
            const foundTask = tasks[taskId];
            if (!foundTask) return;
            setSelectedTask(foundTask);
            setIsEditDialogOpen(true);
        },
        [tasks]
    );

    /**
     * Close the PostFormDialog
     */
    const closeDialog = useCallback(() => {
        setIsEditDialogOpen(false);
        setSelectedTask(null);
    }, []);

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
                columns,
                tasks,
                selectedTask,
                isEditDialogOpen,
                handleBoardClick,
                onDragEnd,
                openDialog,
                closeDialog
            }}
        >
            {children}
        </BoardContext.Provider>
    );
}