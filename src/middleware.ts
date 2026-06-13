import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "qa_session";
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isExternalWebhook =
    pathname === "/api/webhooks/chamados" && request.method === "POST";

  if (PUBLIC_PATHS.has(pathname) || isExternalWebhook) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
