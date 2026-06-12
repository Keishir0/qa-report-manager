import { NextRequest, NextResponse } from "next/server";

export function requireQaAdmin(request: NextRequest) {
  const expected = process.env.QA_ADMIN_TOKEN;

  if (!expected) {
    return NextResponse.json(
      {
        success: false,
        message: "QA_ADMIN_TOKEN nao configurado no servidor.",
      },
      { status: 503 }
    );
  }

  const token = request.headers.get("x-qa-admin-token") || "";

  if (token !== expected) {
    return NextResponse.json(
      {
        success: false,
        message: "Token administrativo invalido.",
      },
      { status: 401 }
    );
  }

  return null;
}
