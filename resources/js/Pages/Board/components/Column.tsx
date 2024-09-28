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
    tasks: Task[];
    onTaskClick: (task: Task) => void; // Added this line
}

export function Column({ column, tasks, onTaskClick }: ColumnProps) {
    return (
        <Card className="h-full bg-zinc-800 border-zinc-700">
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium text-white">
                    {column.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                <Droppable droppableId={column.id.toString()}>
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="min-h-[300px]"
                        >
                            {tasks.map((task, index) => (
                                <Draggable
                                    key={task.id}
                                    draggableId={task.id}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={snapshot.isDragging ? "opacity-50" : ""}
                                        >
                                            <TaskCard
                                                key={task.id.toString()}
                                                task={task}
                                                onClick={() => onTaskClick(task)} // Modified this line
                                            />
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
