import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import {Edit, MoreVertical, Search, Trash2} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Column } from './components/Column';
import { BoardFormDialog } from '@/Pages/Board/components/BoardFormDialog';
import { PostFormDialog } from '@/Pages/Board/components/PostFormDialog';
import BoardDeleteButton from "@/Pages/Board/components/BoardDeleteButton";

export function BoardLayout() {
    const {
        columns: columnsArray,
        posts: postsArray,
        boards,
        assignees,
        boardsColumns,
        priorities,
        boardTitle,
        boardId
    } = usePage().props;

    const [columns, setColumns] = useState({});
    const [tasks, setTasks] = useState({});

    const memoizedBoards = useMemo(() => boardsColumns, [boardsColumns]);
    const memoizedAssignees = useMemo(() => assignees, [assignees]);

    useEffect(() => {
        const initialColumns = columnsArray.reduce((acc, columnTitle) => {
            const columnId = columnTitle.toString();
            acc[columnId] = {
                id: columnId,
                title: columnTitle,
                taskIds: [],
            };
            return acc;
        }, {});

        const initialTasks = {};
        postsArray.forEach((task) => {
            const taskId = task.id.toString();
            initialTasks[taskId] = { ...task, id: taskId };

            const columnId = task.column.toString();
            if (initialColumns[columnId]) {
                initialColumns[columnId].taskIds.push(taskId);
            }
        });

        setColumns(initialColumns);
        setTasks(initialTasks);
    }, [columnsArray, postsArray]);

    const handleBoardClick = (boardId) => {
        router.get(`/boards?board_id=${boardId}`);
    };

    const onDragEnd = useCallback(
        (result: DropResult) => {
            const { destination, source, draggableId } = result;

            if (!destination) return;

            if (
                destination.droppableId === source.droppableId &&
                destination.index === source.index
            ) {
                return;
            }

            setTasks((prevTasks) => ({
                ...prevTasks,
                [draggableId]: {
                    ...prevTasks[draggableId],
                    column: destination.droppableId,
                },
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
                        taskIds: newTaskIds,
                    };

                    return {
                        ...prevColumns,
                        [newColumn.id]: newColumn,
                    };
                }

                const startTaskIds = Array.from(startColumn.taskIds);
                startTaskIds.splice(source.index, 1);

                const finishTaskIds = Array.from(finishColumn.taskIds);
                finishTaskIds.splice(destination.index, 0, draggableId);

                return {
                    ...prevColumns,
                    [startColumn.id]: {
                        ...startColumn,
                        taskIds: startTaskIds,
                    },
                    [finishColumn.id]: {
                        ...finishColumn,
                        taskIds: finishTaskIds,
                    },
                };
            });

            fetch(`/move/${draggableId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    _token: document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content'),
                    _method: 'POST',
                    column: destination.droppableId,
                }),
                credentials: 'same-origin',
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Network response was not ok: ${response.status}`);
                    }
                })
                .catch((error) => {
                    console.error('Error during fetch:', error);
                });
        },
        [setTasks, setColumns]
    );

    const [selectedTask, setSelectedTask] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setIsEditDialogOpen(true);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-900 text-white">
            <div className="w-64 border-r border-zinc-700 p-4 flex flex-col min-h-0">
                <h2 className="mb-4 text-lg font-semibold text-white">Projects</h2>
                <ScrollArea className="flex-1 overflow-y-auto">
                    {boards.map((board) => (
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
                <div className="pb-4">
                    <BoardFormDialog />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-700 p-4">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl font-bold text-white">{boardTitle}</h1>
                            {boardId && <BoardDeleteButton boardId={boardId} />}
                        </div>
                        <div className="flex items-center space-x-2">
                            <PostFormDialog
                                boards={memoizedBoards}
                                assignees={memoizedAssignees}
                                priorities={priorities}
                            />
                            <div className="relative">
                                <Search
                                    className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400"/>
                                <Input
                                    type="search"
                                    placeholder="Search..."
                                    className="pl-8 bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
                                />
                            </div>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex flex-1 overflow-x-auto p-4 space-x-4">
                            {Object.values(columns).map((column) => {
                                const columnTasks = column.taskIds.map(
                                    (taskId) => tasks[taskId]
                                );
                                return (
                                    <div key={column.id} className="flex flex-col w-64 h-full max-h-[83vh]">
                                        <Column
                                            column={column}
                                            tasks={columnTasks}
                                            onTaskClick={handleTaskClick}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>

                    {isEditDialogOpen && selectedTask && (
                        <PostFormDialog
                            boards={memoizedBoards}
                            assignees={memoizedAssignees}
                            priorities={priorities}
                            task={selectedTask}
                            onClose={() => {
                                setIsEditDialogOpen(false);
                                setSelectedTask(null);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default BoardLayout;
