import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireQaAdmin } from "@/lib/adminAuth";
import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  sndeskUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    sndeskUserId: user.sndeskUserId ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireQaAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const users = await prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        sndeskUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users.map(publicUser),
    });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      { success: false, message: "Nao foi possivel carregar os usuarios." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireQaAdmin(request);
  if (unauthorized) return unauthorized;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8192) {
    return NextResponse.json(
      { success: false, message: "Requisicao muito grande." },
      { status: 413 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "").toUpperCase();
    const sndeskUserId = typeof body.sndeskUserId === "string" ? body.sndeskUserId.trim() || null : null;

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { success: false, message: "O nome deve ter entre 2 e 120 caracteres." },
        { status: 400 }
      );
    }

    if (
      email.length > 254 ||
      !EMAIL_PATTERN.test(email)
    ) {
      return NextResponse.json(
        { success: false, message: "Informe um e-mail valido." },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 256) {
      return NextResponse.json(
        {
          success: false,
          message: "A senha deve ter entre 8 e 256 caracteres.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { success: false, message: "Perfil de acesso invalido." },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: role as UserRole,
        active: true,
        sndeskUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        sndeskUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: publicUser(user) },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "Ja existe um usuario com este e-mail." },
        { status: 409 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "JSON invalido." },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/users:", error);
    return NextResponse.json(
      { success: false, message: "Nao foi possivel criar o usuario." },
      { status: 500 }
    );
  }
}
