"use client";

import { PriorityDots } from "./PriorityDots";

interface Task {
    id: string;
    title: string;
    dueDate: string | null;
    priority?: number | null;
    category?: string | null;
    completed: boolean;
}

const CARD_IRREGULAR = "4px 6px 4px 6px / 6px 4px 6px 4px";

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const isOverdue =
        task.dueDate &&
        !task.completed &&
        new Date(task.dueDate) < new Date();

    const statusColor = task.completed
        ? "#16a34a"
        : isOverdue
        ? "#dc2626"
        : "#71717a";

    const statusLabel = task.completed
        ? "Done"
        : isOverdue
        ? "Overdue"
        : "Pending";

    return (
        <div
        style={{
            display: "flex",
            alignItems: "stretch",
            border: "2px solid #e4e4e7",
            borderRadius: CARD_IRREGULAR,
            overflow: "hidden",
            background: "white",
        }}
        >
        <div
            style={{
            width: 4,
            background: statusColor,
            flexShrink: 0,
            }}
        />

        <div style={{ flex: 1, padding: "10px 14px" }}>
            <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
            }}
            >
            <div>
                <div
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111",
                    marginBottom: 5,
                }}
                >
                {task.title}
                </div>

                <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "3px 10px",
                }}
                >
                <span
                    style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: statusColor,
                    textTransform: "uppercase",
                    }}
                >
                    {statusLabel}
                </span>

                {task.category && (
                    <span
                    style={{
                        fontSize: 11,
                        color: "#a1a1aa",
                    }}
                    >
                    {task.category}
                    </span>
                )}

                {task.dueDate && (
                    <span
                    style={{
                        fontSize: 11,
                        color: "#a1a1aa",
                    }}
                    >
                    {new Date(task.dueDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                    </span>
                )}
                </div>
            </div>

            {task.priority != null && (
                <PriorityDots priority={task.priority} />
            )}
            </div>
        </div>
        </div>
    );
}