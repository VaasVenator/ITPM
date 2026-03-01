import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/create-event", "/my-events", "/admin", "/sponsorship"];

export function middleware(req: NextRequest) {
  if (!protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create-event/:path*", "/my-events/:path*", "/admin/:path*", "/sponsorship/:path*"]
};
