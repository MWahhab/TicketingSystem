import type { EventHandler, EventPayloads, EventName } from "@/types/events";

const handlers = new Map<string, EventHandler>();

const StateMachine = {
    define<K extends EventName>(event: K, handler: EventHandler<EventPayloads[K]>) {
        if (handlers.has(event) && import.meta.env.DEV) {
            console.warn(`[StateMachine] Handler for "${event}" already defined.`);
        }
        handlers.set(event, handler);
        return () => handlers.delete(event);
    },

    dispatch(event: string, payload: any) {
        const handler = handlers.get(event);
        if (handler) {
            handler(payload);
        } else if (import.meta.env.DEV) {
            console.warn(`[StateMachine] No handler defined for: ${event}`, payload);
        }
    },

    reset() {
        handlers.clear();
    }
};

export default StateMachine;
