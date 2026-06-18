import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
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

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = await getApiUser(request);

  if (!currentUser) {
    return errorResponse("Nao autenticado.", 401);
  }

  const targetUserId = params.id;
  const isAdmin = currentUser.role === "ADMIN";
  const isSelf = currentUser.id === targetUserId;

  if (!isAdmin && !isSelf) {
    return errorResponse("Voce nao tem permissao para editar este usuario.", 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8192) {
    return errorResponse("Requisicao muito grande.", 413);
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password =
      typeof body.password === "string" ? body.password : undefined;
    const requestedRole =
      typeof body.role === "string" ? body.role.toUpperCase() : undefined;
    const requestedActive =
      typeof body.active === "boolean" ? body.active : undefined;
    const sndeskUserId =
      typeof body.sndeskUserId === "string" ? body.sndeskUserId.trim() || null : undefined;

    if (name.length < 2 || name.length > 120) {
      return errorResponse("O nome deve ter entre 2 e 120 caracteres.", 400);
    }

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return errorResponse("Informe um e-mail valido.", 400);
    }

    if (password !== undefined && password.length > 0) {
      if (password.length < 8 || password.length > 256) {
        return errorResponse("A senha deve ter entre 8 e 256 caracteres.", 400);
      }
    }

    if (requestedRole !== undefined) {
      if (!isAdmin) {
        return errorResponse(
          "Apenas administradores podem alterar o nivel da conta.",
          403
        );
      }

      if (!Object.values(UserRole).includes(requestedRole as UserRole)) {
        return errorResponse("Perfil de acesso invalido.", 400);
      }

      if (isSelf && requestedRole !== "ADMIN") {
        return errorResponse(
          "Voce nao pode remover seu proprio perfil de administrador.",
          400
        );
      }
    }

    if (requestedActive !== undefined && !isAdmin) {
      return errorResponse(
        "Apenas administradores podem ativar ou desativar contas.",
        403
      );
    }

    if (isSelf && requestedActive === false) {
      return errorResponse("Voce nao pode desativar a propria conta.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!existingUser) {
      return errorResponse("Usuario nao encontrado.", 404);
    }

    const data: Prisma.UserUpdateInput = {
      name,
      email,
    };

    if (sndeskUserId !== undefined) {
      data.sndeskUserId = sndeskUserId;
    }

    if (password) {
      data.passwordHash = await hashPassword(password);
    }

    if (isAdmin && requestedRole !== undefined) {
      data.role = requestedRole as UserRole;
    }

    if (isAdmin && requestedActive !== undefined) {
      data.active = requestedActive;
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data,
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

    return NextResponse.json({ success: true, data: publicUser(user) });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse("Ja existe um usuario com este e-mail.", 409);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("JSON invalido.", 400);
    }

    console.error("Error in PUT /api/users/[id]:", error);
    return errorResponse("Nao foi possivel atualizar o usuario.", 500);
  }
}
