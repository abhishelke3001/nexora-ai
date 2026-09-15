import { NextResponse } from "next/server";

type EventItem = {
  date: string;
  time: string;
  country: string;
  importance: "HIGH" | "MEDIUM";
  event: string;
  source: string;
  sourceUrl: string;
};

export async function GET() {
  const year = new Date().getUTCFullYear();

  const events: EventItem[] = [];

  // Official BLS 2026 release dates currently used by NEXORA.
  // Keep this source explicitly labeled as an official schedule.
  if (year === 2026) {
    events.push(
      {
        date: "2026-09-18",
        time: "10:00 ET",
        country: "US",
        importance: "MEDIUM",
        event: "State Employment and Unemployment",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/laus.htm",
      },
      {
        date: "2026-09-29",
        time: "10:00 ET",
        country: "US",
        importance: "HIGH",
        event: "Job Openings and Labor Turnover Survey (JOLTS)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/jolts.htm",
      },
      {
        date: "2026-10-02",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Employment Situation",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/empsit.htm",
      },
      {
        date: "2026-10-14",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Consumer Price Index (CPI)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/cpi.htm",
      },
      {
        date: "2026-10-15",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Producer Price Index (PPI)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/ppi.htm",
      },
      {
        date: "2026-11-03",
        time: "10:00 ET",
        country: "US",
        importance: "HIGH",
        event: "Job Openings and Labor Turnover Survey (JOLTS)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/jolts.htm",
      },
      {
        date: "2026-11-06",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Employment Situation",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/empsit.htm",
      },
      {
        date: "2026-11-10",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Consumer Price Index (CPI)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/cpi.htm",
      },
      {
        date: "2026-11-13",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Producer Price Index (PPI)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/ppi.htm",
      },
      {
        date: "2026-12-01",
        time: "10:00 ET",
        country: "US",
        importance: "HIGH",
        event: "Job Openings and Labor Turnover Survey (JOLTS)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/jolts.htm",
      },
      {
        date: "2026-12-04",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Employment Situation",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/empsit.htm",
      },
      {
        date: "2026-12-10",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Consumer Price Index (CPI)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/cpi.htm",
      },
      {
        date: "2026-12-15",
        time: "08:30 ET",
        country: "US",
        importance: "HIGH",
        event: "Producer Price Index (PPI)",
        source: "U.S. Bureau of Labor Statistics",
        sourceUrl: "https://www.bls.gov/schedule/news_release/ppi.htm",
      },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return NextResponse.json({
    success: true,
    mode: "OFFICIAL_EVENTS",
    today,
    source: "U.S. Bureau of Labor Statistics",
    events: events.sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
    ),
  });
}
