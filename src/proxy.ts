import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Fast, optimistic gate: no session cookie → login page (or 401 for APIs).
// The authoritative check (valid session, not banned, project permissions) runs in every route handler.
const PUBLIC = [
  /^\/$/, // landing page
  /^\/app\//,
  /^\/templates(\/|$)/, // template gallery: anyone can look, starting one asks to sign in
  /^\/demo\//, // landing page live panel demo (static)
  /^\/api\/rt\//,
  /^\/api\/bot\//,
  /^\/api\/manager\/webhook$/,
  /^\/api\/tg\/signin$/,
  /^\/api\/tglogin(\/|$)/, // browser login through Telegram (the page is not signed in yet)
  /^\/api\/assets\//, // logos are public (route checks access for the rest)
  /^\/tg$/, // Telegram Mini App entry (signs in with Telegram initData)
  /^\/api\/pay\//,
  /^\/api\/auth\//,
  /^\/login(\/|$)/,
  /^\/_next\//,
  /^\/favicon/,
];

/** A shared link `/?ref=CODE` is remembered for a month, so it still counts after the visitor browses and signs up later. */
function remember(req: NextRequest, res: NextResponse): NextResponse {
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[a-z0-9]{6,12}$/.test(ref)) {
    res.cookies.set("ms_ref", ref, { path: "/", maxAge: 30 * 24 * 3600, sameSite: "lax" });
  }
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return remember(req, NextResponse.next());
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
