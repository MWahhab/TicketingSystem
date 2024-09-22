export interface Board {
    id:         string;
    title:      string;
    columns:    Columns;
    fid_user:   number;
    created_at: string;
    updated_at: string;
    posts:      Task[];
}

export interface User {
    id:    number;
    name:  string;
    email: string;
}

export interface Task {
    id:          string;
    title:       string;
    desc:        string;
    priority:    "high" | "med" | "low";
    column:      string;
    assignee_id: number;
    deadline:    string; // ISO date string
    fid_board:   number;
    fid_user:    number;
    created_at:  string; // Same here
    updated_at:  string; // Same here
}

export interface ColumnType {
    id:      string;
    title:   string;
    taskIds: string[];
}

export type Columns = string[];

export interface Tasks {
    [key: string]: Task;
}
