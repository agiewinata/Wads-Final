"use client";

import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import ProfileCard from "./ProfileCard";
import DashboardCalendar from "./DashboardCalendar";
import DashboardTimer from "./DashboardTimer";
import RecommendationWidget from "./RecommendationWidget";

type Props = {
  user: {
    name: string | null;
    email: string;
    createdAt: Date;
  };
};

const layouts = {
  /* ≥ 1200px — two column */
  lg: [
    { i: "profile",   x: 0, y: 0, w: 4, h: 5 },
    { i: "calendar",  x: 4, y: 0, w: 8, h: 5 },
    { i: "timer",     x: 0, y: 5, w: 4, h: 5 },
    { i: "analytics", x: 4, y: 5, w: 8, h: 5 },
  ],
  /* 996–1199px — two column, slightly different split */
  md: [
    { i: "profile",   x: 0, y: 0, w: 5,  h: 5 },
    { i: "calendar",  x: 5, y: 0, w: 7,  h: 5 },
    { i: "timer",     x: 0, y: 5, w: 5,  h: 5 },
    { i: "analytics", x: 5, y: 5, w: 7,  h: 5 },
  ],
  /* 768–995px — 2 columns (3/3 split) */
  sm: [
    { i: "profile",   x: 0, y: 0, w: 3, h: 5 },
    { i: "calendar",  x: 3, y: 0, w: 3, h: 5 },
    { i: "timer",     x: 0, y: 5, w: 3, h: 5 },
    { i: "analytics", x: 3, y: 5, w: 3, h: 5 },
  ],
  /* < 768px — single column, mobile */
  xs: [
    { i: "profile",   x: 0, y: 0,  w: 4, h: 4 },
    { i: "calendar",  x: 0, y: 4,  w: 4, h: 8 },
    { i: "timer",     x: 0, y: 12, w: 4, h: 5 },
    { i: "analytics", x: 0, y: 17, w: 4, h: 6 },
  ],
  xxs: [
    { i: "profile",   x: 0, y: 0,  w: 2, h: 4 },
    { i: "calendar",  x: 0, y: 4,  w: 2, h: 8 },
    { i: "timer",     x: 0, y: 12, w: 2, h: 5 },
    { i: "analytics", x: 0, y: 17, w: 2, h: 6 },
  ],
};

export default function DashboardGrid({ user }: Props) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  return (
    <div ref={containerRef}>
    <Responsive
      className="layout"
      layouts={layouts}
      width={width}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={80}
      margin={[16, 16]}
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
        <RecommendationWidget />
      </div>
    </Responsive>
    </div>
  );
}
