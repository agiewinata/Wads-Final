"use client";

import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import ProfileCard from "./ProfileCard";
import DashboardCalendar from "./DashboardCalendar";
import DashboardTimer from "./DashboardTimer";

type Props = {
  user: {
    name: string | null;
    email: string;
    createdAt: Date;
  };
};

export default function DashboardGrid({ user }: Props) {
    const layout = [
        { i: "profile", x: 0, y: 0, w: 4, h: 2 },
        { i: "calendar", x: 4, y: 0, w: 8, h: 4 },

        { i: "timer", x: 0, y: 5, w: 3.5, h: 3.85 },
        { i: "analytics", x: 4, y: 5, w: 4, h: 2 },
    ];

    return (
        <GridLayout
        className="layout"
        layout={layout}
        // cols={12}
        // rowHeight={60}
        autoSize ={true}
        width={1200}
        // draggableHandle=".card-header"
        >
        <div key="profile">
            <ProfileCard
                name={user.name}
                email={user.email}
                createdAt={user.createdAt}
            />
        </div>

        <div key="calendar">
            <DashboardCalendar />
        </div>

        <div key="timer">
            <DashboardTimer />
        </div>

        <div key="analytics">
            {/* <AnalyticsPlaceholder /> */}
            <p>WIP Analytics</p>
        </div>
        </GridLayout>
    );
}