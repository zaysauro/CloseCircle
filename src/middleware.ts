import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    !req.nextUrl.pathname.startsWith("/api/auth/")
  ) {
    const origin = req.headers.get("origin");
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(
        origin && new URL(origin).host === req.headers.get("host"),
      );
    } catch {}
    if (!sameOrigin)
      return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }
  const response = NextResponse.next();
  if (
    req.nextUrl.pathname.startsWith("/api/") ||
    req.nextUrl.pathname.startsWith("/app")
  )
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = { matcher: ["/api/:path*", "/app/:path*"] };
