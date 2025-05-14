"use client";

import React, { memo } from "react";
import {
    Droppable,
    Draggable,
    DroppableProvided,
    DroppableStateSnapshot,
    DraggableProvided,
    DraggableStateSnapshot
} from "react-beautiful-dnd";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { TaskCard } from "./TaskCard";
import { useBoardContext, type Assignee, type Task } from "../BoardContext";
import type { ColumnType } from '../types'

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
}

export const Column = memo(function Column({ column, tasks }: ColumnProps) {
    const { focusedTaskId } = useBoardContext();
    
    return (
        <Card className="h-full bg-zinc-800/50 border-zinc-700/50 flex flex-col rounded-lg shadow-sm">
            <CardHeader className="p-3 border-b border-white/5">
                <CardTitle className="text-sm font-medium text-zinc-200 flex justify-between items-center">
                    <span>{column.title}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-700/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-1 flex-1 min-h-0">
                <style>
                    {`
            /* Hide scrollbar for Chrome, Safari, and Opera */
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            /* Hide scrollbar for IE, Edge, and Firefox */
            .hide-scrollbar {
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
            }
          `}
                </style>
                <Droppable droppableId={column.id.toString()}>
                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`h-full overflow-y-auto hide-scrollbar p-1 rounded-md transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'}`}
                            style={{ position: "relative" }}
                        >
                            {tasks.map((task: Task, index) => {
                                const isDimmed = focusedTaskId !== null && focusedTaskId !== task.id;
                                return (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`mb-2 ${snapshot.isDragging ? "opacity-80 shadow-lg" : "opacity-100 shadow-md"} transition-opacity duration-300 ${isDimmed ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    userSelect: "none",
                                                }}
                                            >
                                                <TaskCard task={task} />
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </CardContent>
        </Card>
    );
});

Column.displayName = 'Column';
