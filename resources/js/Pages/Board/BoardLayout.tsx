"use client";

import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { DragDropContext } from "react-beautiful-dnd";
import { Edit, MoreVertical, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Column } from "./components/Column";
import { BoardFormDialog } from "@/Pages/Board/components/BoardFormDialog";
import { PostFormDialog } from "@/Pages/Board/components/PostFormDialog";
import DeleteButton from "@/Pages/Board/components/DeleteButton";
import InlineNotificationCenter from "@/Pages/Board/components/NotificationBell";

// Context imports
import { BoardProvider, useBoardContext } from "./BoardContext";

/**
 * Helper function to read ?openTask=XYZ directly from window.location.search.
 */
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
    /**
     * Local state so we only attempt to auto-open the dialog once
     * (prevents multiple triggers on re-renders).
     */
    const [didAutoOpen, setDidAutoOpen] = useState(false);

    // Pull everything from the context:
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

    // Grab any route props, if needed
    const pageProps = usePage().props as any; // Not strictly necessary if we read from the URL

    /**
     * If the URL has ?openTask=XYZ, automatically open that post
     * once we have tasks loaded and haven't done it yet.
     *
     * We read from the browser’s query params directly,
     * so that if Inertia doesn't provide it via pageProps, it's still accessible.
     */
    useEffect(() => {
        const openTaskId = getOpenTaskParam();
        if (!didAutoOpen && openTaskId && tasks[openTaskId]) {
            openDialog(openTaskId);
            setDidAutoOpen(true);
        }
    }, [didAutoOpen, openDialog, tasks]);

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-900 text-white">
            {/* Sidebar with boards */}
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

            {/* Main content area */}
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-700 p-4">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl font-bold text-white">{boardTitle}</h1>
                            {boardId && <DeleteButton resourceId={boardId} type="Board" />}
                        </div>

                        <InlineNotificationCenter />

                        <div className="flex items-center space-x-2">
                            <PostFormDialog
                                boards={boardsColumns}
                                assignees={assignees}
                                priorities={priorities}
                                authUserId={authUserId}
                            />
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-zinc-400" />
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
                            {Object.values(columns).map((column: any) => {
                                const columnTasks = column.taskIds.map((taskId: string) => tasks[taskId]);
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

                    {/* Show PostFormDialog if a task is selected */}
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
