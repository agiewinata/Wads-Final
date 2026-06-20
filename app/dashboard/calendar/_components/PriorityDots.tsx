"use client";

const PRIORITY_COLORS: Record<number, string> = {
    1: "#fde047",
    2: "#eab308",
    3: "#ca8a04",
    4: "#ea580c",
    5: "#dc2626",
};

interface PriorityDotsProps {
    priority: number;
}

export function PriorityDots({ priority }: PriorityDotsProps) {
    return (
        <div
        style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
        }}
        >
        <span
            style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#71717a",
            }}
        >
            Low
        </span>

        <div
            style={{
            display: "flex",
            gap: 4,
            }}
        >
            {[1, 2, 3, 4, 5].map((level) => (
            <div
                key={level}
                style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "1px solid #111",
                background:
                    level <= priority
                    ? PRIORITY_COLORS[priority]
                    : "transparent",
                }}
            />
            ))}
        </div>

        <span
            style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#71717a",
            }}
        >
            High
        </span>
        </div>
    );
}