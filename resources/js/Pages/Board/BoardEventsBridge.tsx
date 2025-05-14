"use client";

import { useEffect } from "react";
import { useBoardContext } from "@/Pages/Board/BoardContext";
import { subscribeToBoard } from "@/utils/subscribe-board";

export default function BoardEventsBridge() {
    const { boardId } = useBoardContext();

    useEffect(() => {
        if (boardId) {
            subscribeToBoard(boardId);
        }
    }, [boardId]);

    return null;
}
