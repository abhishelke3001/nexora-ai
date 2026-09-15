import { NextResponse } from "next/server";

type Session = {
  name: string;
  openUtc: number;
  closeUtc: number;
  active: boolean;
};

function inWindow(hour: number, open: number, close: number) {
  if (open < close) {
    return hour >= open && hour < close;
  }

  return hour >= open || hour < close;
}

export async function GET() {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  const decimalHour = hour + minute / 60;

  const sessions: Session[] = [
    {
      name: "Sydney",
      openUtc: 22,
      closeUtc: 7,
      active: inWindow(decimalHour, 22, 7),
    },
    {
      name: "Tokyo",
      openUtc: 0,
      closeUtc: 9,
      active: inWindow(decimalHour, 0, 9),
    },
    {
      name: "London",
      openUtc: 8,
      closeUtc: 17,
      active: inWindow(decimalHour, 8, 17),
    },
    {
      name: "New York",
      openUtc: 13,
      closeUtc: 22,
      active: inWindow(decimalHour, 13, 22),
    },
  ];

  const active = sessions
    .filter((session) => session.active)
    .map((session) => session.name);

  return NextResponse.json({
    success: true,
    mode: "LIVE_TRADING_SESSIONS",
    timezone: "UTC",
    utcTime: now.toISOString(),
    sessions,
    activeSessions: active,
    overlap:
      active.length > 1
        ? active.join(" + ")
        : active[0] || "Market transition",
  });
}
