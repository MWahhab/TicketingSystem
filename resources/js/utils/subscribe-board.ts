//utils/subscribe-board.ts

import StateMachine from '@/utils/state-machine';

let currentBoardId: string | null = null;
let currentBoardChannel: any = null;
let echoInitializationInterval: null = null;

/**
 * Subscribes to a public Echo board channel.
 * Cleans up previous subscription if already listening.
 */
export function subscribeToBoard(boardId: string | null) {
    if (!boardId || boardId === currentBoardId) return;

    if (echoInitializationInterval) {
        clearInterval(echoInitializationInterval);
    }

    const connectToChannel = () => {
        if (!window.Echo) {
            return;
        }

        if (echoInitializationInterval) {
            clearInterval(echoInitializationInterval);
            echoInitializationInterval = null;
        }

        if (currentBoardChannel && currentBoardId) {
            window.Echo?.leave(`board.${currentBoardId}`);
            currentBoardChannel = null;
        }

        currentBoardId = boardId;

        currentBoardChannel = window.Echo.channel(`board.${boardId}`);

        currentBoardChannel.listen('.CardMoved', (data: any) => {
            StateMachine.dispatch('CardMoved', data);
        });
    };

    connectToChannel();

    if (typeof window.Echo === 'undefined') {
        echoInitializationInterval = setInterval(connectToChannel, 50);
    }
}

/**
 * Clean up board subscription on hot reload or unmount.
 */
export function cleanupBoardSubscription() {
    if (currentBoardId && typeof window.Echo !== 'undefined') {
        window.Echo.leave(`board.${currentBoardId}`);
    }
    if (echoInitializationInterval) {
        clearInterval(echoInitializationInterval);
    }
    currentBoardId = null;
    currentBoardChannel = null;
    echoInitializationInterval = null;
}
