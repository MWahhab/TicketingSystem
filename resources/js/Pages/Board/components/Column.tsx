"use client";

import React, { memo } from "react";
import {
    Droppable,
    Draggable,
    DroppableProvided,
    DroppableStateSnapshot,
    DraggableProvided,
    DraggableStateSnapshot,
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
            {(providedDraggable: DraggableProvided, snapshotDraggable: DraggableStateSnapshot) => (
                <div
                    ref={providedDraggable.innerRef}
                    {...providedDraggable.draggableProps}
                    {...providedDraggable.dragHandleProps}
                    style={{
                        ...providedDraggable.draggableProps.style,
                        ...style,
                    }}
                    className={`
                        ${snapshotDraggable.isDragging ? "opacity-80 shadow-lg" : "opacity-100 shadow-md"}
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
                .column-droppable-area {
                    height: 100%;
                    overflow: hidden; /* Prevent this outer div from showing scrollbars */
                }
                .actual-list-scroller::-webkit-scrollbar { /* Apply to the element itself */
                    display: none !important;
                }
                .actual-list-scroller { /* Apply to the element itself */
                    -ms-overflow-style: none !important;  /* IE and Edge */
                    scrollbar-width: none !important;  /* Firefox */
                }
                `}
            </style>
            <CardHeader className="p-3 border-b border-white/5">
                <CardTitle className="text-sm font-medium text-zinc-200 flex justify-between items-center">
                    <span>{column.title}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-700/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-1 flex-1 min-h-0 overflow-hidden flex flex-col">
                <Droppable
                    droppableId={column.id.toString()}
                    mode="virtual"
                    renderClone={(providedDraggableClone: DraggableProvided, snapshotDraggableClone: DraggableStateSnapshot, rubric) => {
                        const task = tasks[rubric.source.index];
                        if (!task) return <div ref={providedDraggableClone.innerRef} {...providedDraggableClone.draggableProps} {...providedDraggableClone.dragHandleProps}>Task not found</div>;
                        const isDimmed = focusedTaskId !== null && focusedTaskId !== task.id;
                        return (
                            <div
                                ref={providedDraggableClone.innerRef}
                                {...providedDraggableClone.draggableProps}
                                {...providedDraggableClone.dragHandleProps}
                                className={`opacity-90 shadow-xl ${isDimmed ? 'opacity-40 pointer-events-none' : ''} w-[240px]`}
                            >
                                <TaskCard task={task} />
                            </div>
                        );
                    }}
                >
                    {(providedDroppable: DroppableProvided, snapshotDroppable: DroppableStateSnapshot) => (
                        <div
                            ref={providedDroppable.innerRef}
                            {...providedDroppable.droppableProps}
                            className="column-droppable-area"
                        >
                            <AutoSizer>
                                {({ height, width }) => (
                                    <FixedSizeList
                                        height={height}
                                        width={width}
                                        itemCount={tasks.length}
                                        itemSize={TASK_CARD_HEIGHT}
                                        itemData={{ tasks, focusedTaskId }}
                                        className="actual-list-scroller"
                                    >
                                        {TaskListItem}
                                    </FixedSizeList>
                                )}
                            </AutoSizer>
                            {providedDroppable.placeholder}
                        </div>
                    )}
                </Droppable>
            </CardContent>
        </Card>
    );
});

Column.displayName = 'Column';
