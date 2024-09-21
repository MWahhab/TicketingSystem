export interface Board {
    id: string;
    name: string;
}

export interface Task {
    id: string;
    title: string;
    type: "story" | "bug";
    assignee: string;
    assigneeInitials: string;
    priority: "high" | "med" | "low";
}

export interface ColumnType {
    id: string;
    title: string;
    taskIds: string[];
}

export interface Columns {
    [key: string]: ColumnType;
}

export interface Tasks {
    [key: string]: Task;
}
