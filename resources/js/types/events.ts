export type EventHandler<Payload = any> = (payload: Payload) => void;

export interface RawNotificationPayload {
    id: number | string;
    type: string;
    content: string;
    fid_post: number | string;
    fid_board: number | string;
    fid_user: number | string;
    created_by: number | string;
    created_at: string;
    updated_at: string;
    seen_at?: string | null;
    [key: string]: any;
}

export interface EventPayloads {
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
    CommentNotificationReceived: { notification: RawNotificationPayload };
    LinkedIssueNotificationReceived: { notification: RawNotificationPayload };
    BranchNotificationReceived: { notification: RawNotificationPayload };
}

export type EventName = keyof EventPayloads;
