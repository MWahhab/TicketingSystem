type EventHandler<Payload = any> = (payload: Payload) => void;

export interface RawNotificationPayload {
    id: number | string; // Assuming id from DB is int, but can be string
    type: string; // e.g., "post", "comment"
    content: string;
    fid_post: number | string;
    fid_board: number | string;
    fid_user: number | string; // The recipient
    created_by: number | string; // The originator
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
    seen_at?: string | null; // ISO date string or null
    // Placeholder for other fields that might come from specific notification types
    [key: string]: any; 
}

interface EventPayloads {
    TestBroadcast: { message: string; serverTimestamp: number };
    CardMoved: { 
        post_id: number; 
        new_column_id: number; 
        title: string; 
        desc: string; 
        deadline: string | null; 
        pinned: number; 
        priority: "high" | "medium" | "low"; 
        assignee_id: string | number; 
        assignee_name: string; 
    };
    UserNotificationReceived: { notification: RawNotificationPayload };
}

type EventName = keyof EventPayloads;

const handlers = new Map<string, EventHandler>();

const StateMachine = {
    define<K extends EventName>(event: K, handler: EventHandler<EventPayloads[K]>) {
        if (handlers.has(event) && import.meta.env.DEV) {
        }
        handlers.set(event, handler);
        return () => {
            handlers.delete(event);
        };
    },

    dispatch(event: string, payload: any) {
        const handler = handlers.get(event);
        if (handler) {
            handler(payload);
        } else if (import.meta.env.DEV) {
        }
    },

    reset() {
        handlers.clear();
    }
};

export default StateMachine;
