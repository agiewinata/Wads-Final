"use client";

import { useTimer } from "./TimerProvider";

export default function TimerPopup() {
  const { popupMessage } = useTimer();

  if (!popupMessage) return null;

  return (
    <div className="fixed top-6 right-6 z-50 rounded-xl border-2 border-black bg-white px-5 py-4 shadow-xl">
      <p className="font-bold">{popupMessage}</p>
    </div>
  );
}