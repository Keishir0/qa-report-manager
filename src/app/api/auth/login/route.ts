import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import {
  spendPasswordHashTime,
  verifyPassword,
} from "@/lib/password";
import { logServerError } from "@/lib/serverLog";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function throttleKey(email: string, request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return createHash("sha256").update(`${email}|${ip}`).digest("hex");
}

async function registerFailure(key: string) {
  const now = new Date();
  const existing = await prisma.loginThrottle.findUnique({ where: { key } });
  const withinWindow =
    existing &&
    now.getTime() - existing.windowStartedAt.getTime() <= WINDOW_MS;
  const attempts = withinWindow ? existing.attempts + 1 : 1;

  await prisma.loginThrottle.upsert({
    where: { key },
    create: {
      key,
      attempts,
      windowStartedAt: now,
      blockedUntil:
        attempts >= MAX_ATTEMPTS
          ? new Date(now.getTime() + BLOCK_MS)
          : null,
    },
    update: {
      attempts,
      windowStartedAt: withinWindow ? existing.windowStartedAt : now,
      blockedUntil:
        attempts >= MAX_ATTEMPTS
          ? new Date(now.getTime() + BLOCK_MS)
          : null,
    },
  });
}

async function handleLogin(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > 4096) {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const email = normalizeEmail((body as Record<string, unknown>)?.email);
  const password = String((body as Record<string, unknown>)?.password || "");

  if (
    !email ||
    email.length > 254 ||
    !email.includes("@") ||
    password.length < 8 ||
    password.length > 256
  ) {
    return NextResponse.json(
      { error: "E-mail ou senha invalidos." },
      { status: 401 }
    );
  }

  const key = throttleKey(email, request);
  const throttle = await prisma.loginThrottle.findUnique({ where: { key } });

  if (throttle?.blockedUntil && throttle.blockedUntil > new Date()) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user
    ? await verifyPassword(password, user.passwordHash)
    : (await spendPasswordHashTime(password), false);

  if (!user || !user.active || !passwordMatches) {
    await registerFailure(key);
    return NextResponse.json(
      { error: "E-mail ou senha invalidos." },
      { status: 401 }
    );
  }

  await prisma.loginThrottle.delete({ where: { key } }).catch(() => {});
  const session = await createSession(user.id, request);
  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    session.token,
    sessionCookieOptions(session.expiresAt)
  );

  return response;
}

export async function POST(request: NextRequest) {
  try {
    return await handleLogin(request);
  } catch (error) {
    logServerError("Error in POST /api/auth/login", error);
    return NextResponse.json(
      {
        error:
          "O serviço de autenticação está indisponível. Verifique o banco de dados e tente novamente.",
        code: "AUTH_SERVICE_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
