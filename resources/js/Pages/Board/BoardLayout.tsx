"use client";

import React, { useState, useRef, useCallback } from "react";
import {
    DragDropContext,
    DropResult,
} from "react-beautiful-dnd";
import { Search, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Column } from "./components/Column";
import { Board, Columns, Tasks, ColumnType } from "./types";
import { boards, initialColumns, initialTasks } from "./data/initialData";
import {BoardFormDialog} from "@/Pages/Board/components/BoardFormDialog";

export function BoardLayout() {
    const [columns, setColumns] = useState<Columns>(initialColumns);
    const [tasks, setTasks] = useState<Tasks>(initialTasks);
    const [isCooldown, setIsCooldown] = useState<boolean>(false);
    const cooldownRef = useRef<boolean>(false);
    const dragCooldown = 500;

    const onDragEnd = useCallback(
        (result: DropResult) => {
            if (cooldownRef.current) {
                return;
            }

            const { destination, source, draggableId } = result;

            if (!destination) return;

            if (
                destination.droppableId === source.droppableId &&
                destination.index === source.index
            ) {
                return;
            }

            cooldownRef.current = true;
            setIsCooldown(true);

            setColumns((prevColumns) => {
                const start = prevColumns[source.droppableId];
                const finish = prevColumns[destination.droppableId];

                if (start === finish) {
                    const newTaskIds = Array.from(start.taskIds);
                    newTaskIds.splice(source.index, 1);
                    newTaskIds.splice(destination.index, 0, draggableId);

                    const newColumn: ColumnType = {
                        ...start,
                        taskIds: newTaskIds,
                    };

                    return {
                        ...prevColumns,
                        [newColumn.id]: newColumn,
                    };
                }

                const startTaskIds = Array.from(start.taskIds);
                startTaskIds.splice(source.index, 1);
                const newStart: ColumnType = {
                    ...start,
                    taskIds: startTaskIds,
                };

                const finishTaskIds = Array.from(finish.taskIds);
                finishTaskIds.splice(destination.index, 0, draggableId);
                const newFinish: ColumnType = {
                    ...finish,
                    taskIds: finishTaskIds,
                };

                return {
                    ...prevColumns,
                    [newStart.id]: newStart,
                    [newFinish.id]: newFinish,
                };
            });

            setTimeout(() => {
                cooldownRef.current = false;
                setIsCooldown(false);
            }, dragCooldown);
        },
        [dragCooldown]
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <div className="w-64 border-r p-4 flex flex-col">
                <h2 className="mb-4 text-lg font-semibold">Boards</h2>
                <ScrollArea className="flex-grow h-[calc(100vh-8rem)]">
                    {boards.map((board) => (
                        <Button
                            key={board.id}
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            {board.name}
                        </Button>
                    ))}
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
