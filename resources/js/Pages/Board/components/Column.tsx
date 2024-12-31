"use client";

import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Task } from "../types";
import { TaskCard } from "./TaskCard";
import { ColumnType } from "../types";

interface ColumnProps {
    column: ColumnType;
    tasks: Task[]; // we still pass the tasks array from BoardLayout
}

export function Column({ column, tasks }: ColumnProps) {
    return (
        <Card className="h-full bg-zinc-800 border-zinc-700 flex flex-col">
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium text-white flex justify-between">
                    <span>{column.title}</span>
                    <span className="text-xs text-gray-400">({tasks.length})</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-0">
                {/* Inject inline CSS to hide scrollbar */}
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
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="h-full overflow-y-auto hide-scrollbar"
                            style={{ position: "relative" }}
                        >
                            {tasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={snapshot.isDragging ? "opacity-50" : ""}
                                        >
                                            {/* We no longer pass onClick; TaskCard will pull from context */}
                                            <TaskCard task={task} />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </CardContent>
        </Card>
    );
}
