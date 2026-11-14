import { NextRequest, NextResponse } from "next/server";
import { getBriefingImageQuery, PUBLIC_DOMAIN_CREW_PHOTO } from "@/lib/simulation/missionBriefing";
import type { Planet } from "@/lib/simulation/types";

type NasaImageItem = {
  data?: Array<{
    center?: string;
    media_type?: string;
    nasa_id?: string;
    photographer?: string;
    secondary_creator?: string;
    title?: string;
    description?: string;
  }>;
  links?: Array<{
    href?: string;
    rel?: string;
    render?: string;
  }>;
};

type NasaSearchResponse = {
  collection?: {
    items?: NasaImageItem[];
  };
};

const NON_PHOTOGRAPHIC_RESULT = /\b(diagram|illustration|schematic|artist|rendering|computer-generated)\b/i;
const IMAGE_CACHE_HEADERS = { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" };

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lessonId = searchParams.get("lesson") ?? "";
  const planetValue = searchParams.get("planet");
  if (planetValue !== "MOON" && planetValue !== "MARS") {
    return NextResponse.json({ error: "Choose a valid mission destination." }, { status: 400 });
  }
  const planet: Planet = planetValue;
  if (lessonId === "crew") {
    return NextResponse.json({ image: PUBLIC_DOMAIN_CREW_PHOTO }, { headers: IMAGE_CACHE_HEADERS });
  }
  const query = getBriefingImageQuery(lessonId, planet);
  if (!query) {
    return NextResponse.json({ error: "That briefing photo topic is not available." }, { status: 400 });
  }

  const searchUrl = new URL("https://images-api.nasa.gov/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("media_type", "image");
  searchUrl.searchParams.set("page_size", "20");

  let response: Response;
  try {
    response = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }
    });
  } catch {
    return NextResponse.json({
      error: "NASA's image library could not be reached. Retry the photo or open NASA Images directly.",
      searchUrl: `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`
    }, { status: 502 });
  }
  if (!response.ok) {
    return NextResponse.json({
      error: `NASA's image library returned an error (${response.status}). Retry the photo or open NASA Images directly.`,
      searchUrl: `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`
    }, { status: 502 });
  }

  let payload: NasaSearchResponse;
  try {
    payload = await response.json() as NasaSearchResponse;
  } catch {
    return NextResponse.json({
      error: "NASA's image library returned unreadable data. Retry the photo or open NASA Images directly.",
      searchUrl: `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`
    }, { status: 502 });
  }
  const candidates = (payload.collection?.items ?? []).filter((item) =>
    item.data?.[0]?.media_type === "image" && Boolean(item.data[0].nasa_id)
  );
  const item = candidates.find((candidate) =>
    !NON_PHOTOGRAPHIC_RESULT.test(`${candidate.data?.[0]?.title ?? ""} ${candidate.data?.[0]?.description ?? ""}`)
  );
  const metadata = item?.data?.[0];
  const photoUrl = item?.links?.find((link) => link.render === "image" && link.href?.includes("~medium"))?.href
    ?? item?.links?.find((link) => link.rel === "preview" && link.href)?.href;
  if (!metadata?.nasa_id || !photoUrl || !photoUrl.startsWith("https://images-assets.nasa.gov/")) {
    return NextResponse.json({
      error: "No NASA photograph was found for this topic. You can still continue the lesson or search NASA Images.",
      searchUrl: `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`
    }, { status: 404 });
  }
  const candidateTitle = (metadata.title ?? "NASA image").replace(/\s+/g, " ").trim();
  const rawTitle = candidateTitle.toLowerCase() === metadata.nasa_id.toLowerCase() ? "NASA photograph" : candidateTitle;
  const title = rawTitle.length > 110 ? `${rawTitle.slice(0, 107).trimEnd()}...` : rawTitle;

  return NextResponse.json({
    image: {
      url: photoUrl,
      title,
      credit: metadata.photographer ?? metadata.secondary_creator ?? `NASA / ${metadata.center ?? "NASA Image Library"}`,
      sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(metadata.nasa_id)}`
    }
  }, {
    headers: IMAGE_CACHE_HEADERS
  });
}
