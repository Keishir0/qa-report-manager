import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireQaAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const unauthorized = await requireQaAdmin(request);
  if (unauthorized) return unauthorized;

  const logsDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logsDir, "app.log");

  if (!fs.existsSync(logFile)) {
    return NextResponse.json({
      success: true,
      logs: "Nenhum log gravado ainda.",
    });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "download") {
    try {
      const fileBuffer = fs.readFileSync(logFile);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": "attachment; filename=app.log",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Erro ao baixar arquivo de log." },
        { status: 500 }
      );
    }
  }

  try {
    const fileContent = fs.readFileSync(logFile, "utf-8");
    const lines = fileContent.split("\n");
    const limit = Number(searchParams.get("limit") || 200);

    // slice from the end to get last N lines.
    // If splitting results in a trailing empty string, we slice -limit-1 and filter
    const lastLines = lines.slice(-limit - 1).join("\n").trim();

    return NextResponse.json({
      success: true,
      logs: lastLines,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erro ao ler arquivo de log." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireQaAdmin(request);
  if (unauthorized) return unauthorized;

  const logsDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logsDir, "app.log");

  try {
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, "");
    }
    return NextResponse.json({
      success: true,
      message: "Arquivo de log limpo com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erro ao limpar arquivo de log." },
      { status: 500 }
    );
  }
}
