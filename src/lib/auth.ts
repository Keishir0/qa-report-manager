import { createHash, randomBytes } from "crypto";
import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "qa_session";
export const WRITE_ROLES: UserRole[] = ["ADMIN", "QA"];
export const ADMIN_ROLES: UserRole[] = ["ADMIN"];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sndeskUserId?: string | null;
  sndeskStatusId?: string | null;
}

function sessionDays() {
  const configured = Number(process.env.AUTH_SESSION_DAYS || 7);
  return Number.isFinite(configured)
    ? Math.min(Math.max(Math.trunc(configured), 1), 30)
    : 7;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function createSession(userId: string, request: NextRequest) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + sessionDays() * 24 * 60 * 60 * 1000
  );
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  await prisma.authSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return { token, expiresAt };
}

export async function deleteSession(token: string | null | undefined) {
  if (!token) return;

  await prisma.authSession
    .delete({ where: { tokenHash: hashSessionToken(token) } })
    .catch(() => {});
}

export async function getUserFromSessionToken(
  token: string | null | undefined
): Promise<AuthUser | null> {
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          sndeskUserId: true,
          sndeskStatusId: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date() || !session.user.active) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > 60 * 60 * 1000) {
    await prisma.authSession
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => {});
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    sndeskUserId: session.user.sndeskUserId,
    sndeskStatusId: session.user.sndeskStatusId,
  };
}

export async function getCurrentUser() {
  return getUserFromSessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
}

export async function getApiUser(request: NextRequest) {
  return getUserFromSessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );
}

export async function requirePageUser(allowedRoles?: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/");

  return user;
}

export async function requireApiAccess(
  request: NextRequest,
  allowedRoles?: UserRole[]
) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Voce nao tem permissao para esta acao." },
      { status: 403 }
    );
  }

  return null;
}
