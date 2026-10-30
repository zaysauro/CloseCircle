import { getSql } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  try {
    await getSql()`select 1`;
    if (!process.env.BETTER_AUTH_SECRET) throw Error("Auth missing");
    return Response.json(
      { status: "ok", database: "connected", auth: "configured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
