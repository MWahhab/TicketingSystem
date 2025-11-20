//global.d.ts

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Augment the Window interface
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo; // Try with Echo<any> if Echo is reported as generic
    }

    // If VITE_REVERB_APP_KEY etc. are not recognized on import.meta.env
    interface ImportMetaEnv {
        readonly VITE_REVERB_APP_KEY: string;
        readonly VITE_REVERB_HOST: string;
        readonly VITE_REVERB_PORT: string;
        readonly VITE_REVERB_SCHEME: string;
        // Add other env variables here if needed
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

// Export something to make it a module, if necessary, though for .d.ts it's usually not.
export {};
