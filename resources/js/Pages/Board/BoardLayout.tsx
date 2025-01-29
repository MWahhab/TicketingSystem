"use client";

import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { DragDropContext } from "react-beautiful-dnd";
import { Search, ChevronDown } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { Column } from "./components/Column";
import { BoardFormDialog } from "@/Pages/Board/components/BoardFormDialog";
import { PostFormDialog } from "@/Pages/Board/components/PostFormDialog";
import DeleteButton from "@/Pages/Board/components/DeleteButton";
import InlineNotificationCenter from "@/Pages/Board/components/NotificationBell";

// Context imports
import { BoardProvider, useBoardContext } from "./BoardContext";

function getOpenTaskParam(): string | null {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("openTask");
}

export function BoardLayout() {
    const {
        columns: columnsArray,
        posts: postsArray,
        boards,
        assignees,
        boardsColumns,
        priorities,
        boardTitle,
        boardId,
        authUserId
    } = usePage().props as any;

    return (
        <BoardProvider
            boardId={boardId}
            columnsArray={columnsArray}
            postsArray={postsArray}
            boards={boards}
            assignees={assignees}
            boardsColumns={boardsColumns}
            priorities={priorities}
            boardTitle={boardTitle}
            authUserId={authUserId}
        >
            <InnerBoardLayout />
        </BoardProvider>
    );
}

function InnerBoardLayout() {
    const [didAutoOpen, setDidAutoOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAssignee, setSelectedAssignee] = useState("");
    const [selectedAuthor, setSelectedAuthor] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("");

    const {
        boards,
        boardTitle,
        boardId,
        authUserId,
        columns,
        tasks,
        handleBoardClick,
        onDragEnd,
        selectedTask,
        isEditDialogOpen,
        openDialog,
        closeDialog,
        boardsColumns,
        assignees,
        priorities
    } = useBoardContext();

    useEffect(() => {
        const openTaskId = getOpenTaskParam();
        if (!didAutoOpen && openTaskId && tasks[openTaskId]) {
            openDialog(openTaskId);
            setDidAutoOpen(true);
        }
    }, [didAutoOpen, openDialog, tasks]);

    // Get unique authors from tasks
    const uniqueAuthors = Array.from(new Set(Object.values(tasks).map((task: any) => task.post_author)));

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-900 text-white">
            <div className="w-64 border-r border-zinc-700 p-4 flex flex-col min-h-0">
                <h2 className="mb-4 text-lg font-semibold text-white">Projects</h2>
                <ScrollArea className="flex-1 overflow-y-auto">
                    {boards.map((board: any) => (
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
                            {boardId && <DeleteButton resourceId={boardId} type="Board" />}
                        </div>

                        <InlineNotificationCenter />

                        <div className="flex items-center gap-3">
                            <PostFormDialog
                                boards={boardsColumns}
                                assignees={assignees}
                                priorities={priorities}
                                authUserId={authUserId}
                            />

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
                                    <Input
                                        type="search"
                                        placeholder="Search tasks..."
                                        className="pl-8 w-[200px] bg-zinc-800 text-white border-zinc-700 focus:border-white focus:ring-1 focus:ring-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                                        >
                                            {selectedAssignee ?
                                                assignees.find((a: any) => a.id === selectedAssignee)?.name :
                                                "All Assignees"
                                            }
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                                        <DropdownMenuItem
                                            onClick={() => setSelectedAssignee("")}
                                            className="hover:bg-zinc-700"
                                        >
                                            All Assignees
                                        </DropdownMenuItem>
                                        {assignees.map((assignee: any) => (
                                            <DropdownMenuItem
                                                key={assignee.id}
                                                onClick={() => setSelectedAssignee(assignee.id)}
                                                className="hover:bg-zinc-700"
                                            >
                                                {assignee.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                                        >
                                            {selectedAuthor || "All Authors"}
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                                        <DropdownMenuItem
                                            onClick={() => setSelectedAuthor("")}
                                            className="hover:bg-zinc-700"
                                        >
                                            All Authors
                                        </DropdownMenuItem>
                                        {uniqueAuthors.map((author: string) => (
                                            <DropdownMenuItem
                                                key={author}
                                                onClick={() => setSelectedAuthor(author)}
                                                className="hover:bg-zinc-700"
                                            >
                                                {author}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="flex gap-1">
                                    {["low", "medium", "high"].map((priority) => (
                                        <Button
                                            key={priority}
                                            variant={selectedPriority === priority ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedPriority(selectedPriority === priority ? "" : priority)}
                                            className={`
                                                ${selectedPriority === priority ?
                                                'bg-zinc-700 text-white' :
                                                'bg-zinc-800 text-zinc-400 hover:text-white'
                                            }
                                                border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600
                                            `}
                                        >
                                            {priority}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex flex-1 overflow-x-auto p-4 space-x-4">
                            {Object.values(columns).map((column: any) => {
                                const columnTasks = column.taskIds
                                    .map((taskId: string) => tasks[taskId])
                                    .filter((task) => {
                                        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            task.desc.toLowerCase().includes(searchQuery.toLowerCase());
                                        const matchesAssignee = !selectedAssignee || task.assignee_id === selectedAssignee;
                                        const matchesAuthor = !selectedAuthor || task.post_author === selectedAuthor;
                                        const matchesPriority = !selectedPriority || task.priority.toLowerCase() === selectedPriority;
                                        return matchesSearch && matchesAssignee && matchesAuthor && matchesPriority;
                                    });
                                return (
                                    <div
                                        key={column.id}
                                        className="flex-1 min-w-[250px] max-w-screen"
                                    >
                                        <Column column={column} tasks={columnTasks} />
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>

                    {isEditDialogOpen && selectedTask && (
                        <PostFormDialog
                            boards={boardsColumns}
                            assignees={assignees}
                            priorities={priorities}
                            task={selectedTask}
                            onClose={closeDialog}
                            authUserId={authUserId}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default BoardLayout;

