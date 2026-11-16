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
  return NextResponse.next();
}

export const config = { matcher: "/((?!\\.well-known/).*)" };
