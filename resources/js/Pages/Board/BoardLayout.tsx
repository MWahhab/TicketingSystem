import React, {useCallback, useState} from 'react';
import {DragDropContext, DropResult,} from 'react-beautiful-dnd';
import {Plus, Search} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';

import {Column} from './components/Column';
import {Columns, Task, Tasks} from './types';
import {BoardFormDialog} from '@/Pages/Board/components/BoardFormDialog';
import {usePage} from '@inertiajs/react';

export function BoardLayout() {
    const { columns: columnsArray, posts: postsArray } = usePage().props;

    const [columns, setColumns] = useState<Columns>(() => {
        return columnsArray.reduce((acc: Columns, columnTitle: string) => {
            const columnId = columnTitle.toString();
            acc[columnId] = {
                id: columnId,
                title: columnTitle,
                taskIds: [],
            };
            return acc;
        }, {});
    });

    const [tasks, setTasks] = useState<Tasks>(() => {
        const initialTasks: Tasks = {};
        postsArray.forEach((task: Task) => {
            const taskId = task.id.toString();
            initialTasks[taskId] = { ...task, id: taskId };

            const columnId = task.column.toString();
            if (columns[columnId]) {
                columns[columnId].taskIds.push(taskId);
            }
        });
        return initialTasks;
    });

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

            fetch(`/posts/${draggableId}`, {
                method: 'POST', // Use POST method for method spoofing
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    _token: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                    _method: 'PUT', // Include method override
                    column: destination.droppableId,
                }),
                credentials: 'same-origin', // Include cookies
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Network response was not ok: ${response.status}`);
                    }
                    // Do nothing, optimistic UI update remains
                })
                .catch((error) => {
                    console.error('Error during fetch:', error);
                    // Optionally, revert the optimistic update if the request fails
                });
        },
        [setTasks, setColumns]
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <div className="w-64 border-r p-4 flex flex-col">
                <h2 className="mb-4 text-lg font-semibold">Boards</h2>
                <ScrollArea className="flex-grow h-[calc(100vh-8rem)]">
                    {/* Assuming you have a boards array */}
                    {/* {boards.map((board) => (
              <Button
                  key={board.id}
                  variant="ghost"
                  className="w-full justify-start"
              >
                  {board.name}
              </Button>
          ))} */}
                </ScrollArea>
                <div className="pb-16">
                    <BoardFormDialog />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b p-4">
                        <h1 className="text-2xl font-bold">Current Board</h1>
                        <div className="flex items-center space-x-2">
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Add
                            </Button>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search..."
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex flex-1 space-x-4 overflow-auto p-4">
                            {Object.values(columns).map((column) => {
                                const columnTasks = column.taskIds.map(
                                    (taskId) => tasks[taskId]
                                );
                                return (
                                    <div key={column.id} className="flex-1 min-w-[250px]">
                                        <Column column={column} tasks={columnTasks} />
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>
                </div>
            </div>
        </div>
    );
}
