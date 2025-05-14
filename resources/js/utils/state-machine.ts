type EventHandler<Payload = any> = (payload: Payload) => void;

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
}

type EventName = keyof EventPayloads;

const handlers = new Map<string, EventHandler>();

const StateMachine = {
    define<K extends EventName>(event: K, handler: EventHandler<EventPayloads[K]>) {
        if (handlers.has(event)) {
            console.warn(`[StateMachine] Overwriting existing handler for: ${event}`);
        }
        handlers.set(event, handler);
    },

    dispatch(event: string, payload: any) {
        if (!handlers.has(event) && import.meta.env.DEV) {
            console.warn(`[StateMachine] No handler defined for: ${event}`, payload);
            return;
        }

        const handler = handlers.get(event);
        handler?.(payload);
    },

    reset() {
        handlers.clear();
    }
};

export default StateMachine;
