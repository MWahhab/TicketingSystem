import { Board, Columns, Tasks } from "../types";

export const boards: Board[] = [
    { id: "board1", name: "First Board" },
    { id: "board2", name: "Second Board" },
    { id: "board3", name: "Third Board" },
];

export const initialColumns: Columns = {
    backlog: { id: "backlog", title: "Backlog", taskIds: ["task1"] },
    estimated: { id: "estimated", title: "Estimated", taskIds: [] },
    inProgress: { id: "inProgress", title: "In Progress", taskIds: ["task2"] },
    review: { id: "review", title: "Review", taskIds: ["task3"] },
    deployed: { id: "deployed", title: "Deployed", taskIds: [] },
};

export const initialTasks: Tasks = {
    task1: {
        id: "task1",
        title: "Implement user authentication",
        type: "story",
        assignee: "John D.",
        assigneeInitials: "JD",
        priority: "high",
    },
    task2: {
        id: "task2",
        title: "Fix login page bug",
        type: "bug",
        assignee: "Jane S.",
        assigneeInitials: "JS",
        priority: "med",
    },
    task3: {
        id: "task3",
        title: "Design new landing page",
        type: "story",
        assignee: "Alice J.",
        assigneeInitials: "AJ",
        priority: "low",
    },
};
