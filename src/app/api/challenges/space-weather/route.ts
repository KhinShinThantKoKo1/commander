import { NextResponse } from "next/server";
import { buildSpaceWeatherChallenge } from "@/lib/server/donki";

export const runtime = "nodejs";
export const revalidate = 900;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * DAY_MS);
  const url = new URL("https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR");
  url.searchParams.set("startDate", startDate.toISOString().slice(0, 10));
  url.searchParams.set("endDate", endDate.toISOString().slice(0, 10));

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) {
      return NextResponse.json({ error: `NASA DONKI returned HTTP ${response.status}. Try again later.` }, { status: 502 });
    }

    const payload: unknown = await response.json();
    const challenge = buildSpaceWeatherChallenge(payload, new Date());
    if (!challenge) {
      return NextResponse.json({ error: "NASA DONKI returned no classified solar flares in the last 30 days. Try again later." }, { status: 503 });
    }
    return NextResponse.json({ challenge });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "NASA DONKI did not respond in time. Try again later."
      : "Could not read live data from NASA DONKI. Check the connection and try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
