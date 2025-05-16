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
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { TaskCard } from "./TaskCard";
import { useBoardContext, type Task } from "../BoardContext";
import type { ColumnType } from '../types'

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
}

const TASK_CARD_HEIGHT = 120;

const TaskListItem = memo(function TaskListItem({ index, style, data }: ListChildComponentProps<{ tasks: Task[]; focusedTaskId: string | null }>) {
    const { tasks, focusedTaskId } = data;
    const task = tasks[index];

    if (!task) {
        return null;
    }

    const isDimmed = focusedTaskId !== null && focusedTaskId !== task.id;

    return (
        <Draggable key={task.id} draggableId={task.id} index={index}>
            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                        ...provided.draggableProps.style,
                        ...style,
                    }}
                    className={`
                        ${snapshot.isDragging ? "opacity-80 shadow-lg" : "opacity-100 shadow-md"}
                        transition-opacity duration-300
                        ${isDimmed ? 'opacity-40 pointer-events-none' : 'opacity-100'}
                        pr-2
                    `}
                >
                    <TaskCard task={task} />
                </div>
            )}
        </Draggable>
    );
});
TaskListItem.displayName = 'TaskListItem';

export const Column = memo(function Column({ column, tasks }: ColumnProps) {
    const { focusedTaskId } = useBoardContext();

    return (
        <Card className="h-full bg-zinc-800/50 border-zinc-700/50 flex flex-col rounded-lg shadow-sm">
            <style>
                {`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                `}
            </style>
            <CardHeader className="p-3 border-b border-white/5">
                <CardTitle className="text-sm font-medium text-zinc-200 flex justify-between items-center">
                    <span>{column.title}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-700/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                </CardTitle>
            </CardHeader>
            <Droppable
                droppableId={column.id.toString()}
                mode="virtual"
                renderClone={(provided, snapshot, rubric) => {
                    const task = tasks[rubric.source.index];
                    if (!task) return <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} >Task not found</div>;
                    const isDimmed = focusedTaskId !== null && focusedTaskId !== task.id;
                    return (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`
                                opacity-90 shadow-xl
                                ${isDimmed ? 'opacity-40 pointer-events-none' : ''}
                                w-[240px]
                            `}
                        >
                            <TaskCard task={task} />
                        </div>
                    );
                }}
            >
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => {
                    return (
                        <CardContent className="p-1 flex-1 min-h-0 overflow-hidden flex flex-col">
                            <div className="w-full h-full">
                                <AutoSizer>
                                    {({ height, width }) => (
                                        <FixedSizeList
                                            height={height}
                                            width={width}
                                            itemCount={tasks.length}
                                            itemSize={TASK_CARD_HEIGHT}
                                            outerRef={provided.innerRef}
                                            itemData={{ tasks, focusedTaskId }}
                                            className="hide-scrollbar"
                                        >
                                            {TaskListItem}
                                        </FixedSizeList>
                                    )}
                                </AutoSizer>
                            </div>
                        </CardContent>
                    );
                }}
            </Droppable>
        </Card>
    );
});

Column.displayName = 'Column';
