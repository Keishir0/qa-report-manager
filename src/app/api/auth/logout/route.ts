import { NextRequest, NextResponse } from "next/server";
import {
  deleteSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  await deleteSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    sessionCookieOptions(new Date(0))
  );

  return response;
}
