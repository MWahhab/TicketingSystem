"use client";

import * as React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Search, Plus, Bug, Bookmark, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const boards = [
    { id: "board1", name: "First Board" },
    { id: "board2", name: "Second Board" },
    { id: "board3", name: "Third Board" },
];

const initialColumns = {
    backlog: { id: "backlog", title: "Backlog", taskIds: ["task1"] },
    estimated: { id: "estimated", title: "Estimated", taskIds: [] },
    inProgress: { id: "inProgress", title: "In Progress", taskIds: ["task2"] },
    review: { id: "review", title: "Review", taskIds: ["task3"] },
    deployed: { id: "deployed", title: "Deployed", taskIds: [] },
};

const initialTasks = {
    task1: {
        id: "task1",
        title: "Implement user authentication",
        type: "story",
        assignee: "John D.",
        assigneeInitials: "JD",
        priority: "high",
    },
    task2: {
        id: "task2",
        title: "Fix login page bug",
        type: "bug",
        assignee: "Jane S.",
        assigneeInitials: "JS",
        priority: "med",
    },
    task3: {
        id: "task3",
        title: "Design new landing page",
        type: "story",
        assignee: "Alice J.",
        assigneeInitials: "AJ",
        priority: "low",
    },
};

function TaskCard({ task }) {
    const priorityColors = {
        high: "bg-red-500",
        med: "bg-yellow-500",
        low: "bg-green-500",
    };

    return (
        <Card className="mb-2 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="p-3">
                <div className="flex justify-between items-center">
                    <Badge variant={task.type === "bug" ? "destructive" : "secondary"} className="text-xs">
                        {task.type === "bug" ? <Bug className="w-3 h-3 mr-1" /> : <Bookmark className="w-3 h-3 mr-1" />}
                        {task.type}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                </div>
                <CardTitle className="text-sm font-medium mt-2">{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>{task.assignee}</span>
                    </div>
                    <Avatar className="w-6 h-6">
                        <AvatarFallback>{task.assigneeInitials}</AvatarFallback>
                    </Avatar>
                </div>
            </CardContent>
        </Card>
    );
}

function Column({ column, tasks }) {
    return (
        <Card className="h-full">
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                <Droppable droppableId={column.id}>
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

export function BoardLayout() {
    const [columns, setColumns] = React.useState(initialColumns);
    const [tasks, setTasks] = React.useState(initialTasks);
    const [isCooldown, setIsCooldown] = React.useState(false);
    const cooldownRef = React.useRef(false);
    const dragCooldown = 500;

    const onDragEnd = (result) => {
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

                const newColumn = {
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
            const newStart = {
                ...start,
                taskIds: startTaskIds,
            };

            const finishTaskIds = Array.from(finish.taskIds);
            finishTaskIds.splice(destination.index, 0, draggableId);
            const newFinish = {
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
    };

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
                    <Button className="mt-4 w-full">Add new board</Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b p-4">
                        <h1 className="text-2xl font-bold">Current Board</h1>
                        <div className="flex items-center space-x-2">
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4"/>
                                Add
                            </Button>
                            <div className="relative">
                                <Search
                                    className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground"/>
                                <Input type="search" placeholder="Search..." className="pl-8"/>
                            </div>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex flex-1 space-x-4 overflow-auto p-4">
                            {Object.values(columns).map((column) => {
                                const columnTasks = column.taskIds.map((taskId) => tasks[taskId]);
                                return (
                                    <div key={column.id} className="flex-1 min-w-[250px]">
                                        <Column column={column} tasks={columnTasks}/>
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
