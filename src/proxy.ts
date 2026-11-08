import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Fast, optimistic gate: no session cookie → login page (or 401 for APIs).
// The authoritative check (valid session, not banned, project permissions) runs in every route handler.
const PUBLIC = [
  /^\/$/, // landing page
  /^\/app\//,
  /^\/demo\//, // landing page live panel demo (static)
  /^\/api\/rt\//,
  /^\/api\/bot\//,
  /^\/api\/pay\//,
  /^\/api\/auth\//,
  /^\/login(\/|$)/,
  /^\/_next\//,
  /^\/favicon/,
];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  if (getSessionCookie(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Kirish talab qilinadi" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: "/:path*" };
