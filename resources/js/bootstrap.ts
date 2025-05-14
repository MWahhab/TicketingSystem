import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import StateMachine from '@/utils/state-machine';
import { subscribeToBoard, cleanupBoardSubscription } from '@/utils/subscribe-board';

// Axios global setup
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

// Echo setup
window.Pusher = Pusher;
window.Pusher.logToConsole = false;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: parseInt(import.meta.env.VITE_REVERB_PORT || '6001', 10),
    wssPort: parseInt(import.meta.env.VITE_REVERB_PORT || '6001', 10),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
});

declare global {
    interface Window {
        Laravel?: {
            user?: {
                id: number;
                [key: string]: any;
            };
        };
    }
}

// 👤 Private notification channel
const userId = window.Laravel?.user?.id;
if (userId) {
    const channel = window.Echo.private(`notifications.${userId}`);

    const handler = (eventName: string, data: any) => {
        if (eventName.startsWith('pusher:')) return;
        const cleanEvent = eventName.replace(/^\./, '');
        StateMachine.dispatch(cleanEvent, data);
    };

    channel.pusher.bind_global(handler);

    if (import.meta.hot) {
        import.meta.hot.dispose(() => {
            channel.pusher.unbind_global(handler);
            channel.pusher.disconnect();
            StateMachine.reset();
        });
    }
}

// 🧠 Dynamic board channel subscription
const initialBoardId = new URLSearchParams(window.location.search).get('board_id');
subscribeToBoard(initialBoardId);

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        cleanupBoardSubscription();
    });
}
