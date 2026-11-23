import { NextResponse, type NextRequest } from "next/server";

// Association files must be served by each host without a redirect.
export function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === "quizletgravity.com") {
    const target = request.nextUrl.clone();
    target.hostname = "www.quizletgravity.com";
    target.protocol = "https:";
    target.port = "";
    return NextResponse.redirect(target, 308);
  }
  // Existing Android and Apple builds already accept the root app link and
  // preserve its query. Rewrite internally so no new native route is needed.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.get("open") === "leaderboard-email") {
    const target = request.nextUrl.clone();
    target.pathname = "/notifications/email";
    target.searchParams.delete("open");
    const response = NextResponse.rewrite(target);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  return NextResponse.next();
}

export const config = { matcher: "/((?!\\.well-known/).*)" };
