import StateMachine from '@/utils/state-machine';

let currentBoardId: string | null = null;
let currentBoardChannel: any = null;

/**
 * Subscribes to a public Echo board channel.
 * Cleans up previous subscription if already listening.
 */
export function subscribeToBoard(boardId: string | null) {
    if (!boardId || boardId === currentBoardId) return;

    if (currentBoardChannel && currentBoardId) {
        window.Echo.leave(`board.${currentBoardId}`);
        currentBoardChannel = null;
    }

    currentBoardId = boardId;
    currentBoardChannel = window.Echo.channel(`board.${boardId}`);

    currentBoardChannel.listen('.CardMoved', (data: any) => {
        StateMachine.dispatch('CardMoved', data);
    });
}

/**
 * Clean up board subscription on hot reload or unmount.
 */
export function cleanupBoardSubscription() {
    if (currentBoardId) {
        window.Echo.leave(`board.${currentBoardId}`);
        currentBoardChannel?.pusher?.disconnect?.();
    }
    currentBoardId = null;
    currentBoardChannel = null;
}
