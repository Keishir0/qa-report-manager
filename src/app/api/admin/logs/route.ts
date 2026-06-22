import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireQaAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

interface ServerLogRow {
  level: string;
  context: string;
  message: string;
  stack: string | null;
  createdAt: Date;
}

function getLogFilePath() {
  return path.join(process.cwd(), "logs", "app.log");
}

function formatLogRows(rows: ServerLogRow[]) {
  return rows
    .map((row) => {
      const stackLine = row.stack ? `\nStack Trace: ${row.stack}` : "";
      return `[${row.createdAt.toISOString()}] [${row.level}] [${row.context}] ${row.message}${stackLine}`;
    })
    .join("\n")
    .trim();
}

function readFileLogs(limit?: number) {
  const logFile = getLogFilePath();

  if (!fs.existsSync(logFile)) {
    return "";
  }

  const fileContent = fs.readFileSync(logFile, "utf-8");
  if (!limit) return fileContent.trim();

  const lines = fileContent.split("\n");
  return lines.slice(-limit - 1).join("\n").trim();
}

async function readDatabaseLogs(limit?: number) {
  const rows = limit
    ? await prisma.$queryRaw<ServerLogRow[]>`
        SELECT "level", "context", "message", "stack", "createdAt"
        FROM "server_logs"
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<ServerLogRow[]>`
        SELECT "level", "context", "message", "stack", "createdAt"
        FROM "server_logs"
        ORDER BY "createdAt" ASC
      `;

  return formatLogRows(limit ? rows.reverse() : rows);
}

async function readLogs(limit?: number) {
  try {
    const databaseLogs = await readDatabaseLogs(limit);
    if (databaseLogs) return databaseLogs;
  } catch (error) {
    console.error("Failed to read logs from database:", error);
  }

  return readFileLogs(limit);
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireQaAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const limit = Number(searchParams.get("limit") || 200);
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 5000)
    : 200;

  if (action === "download") {
    try {
      const logs = await readLogs();
      return new NextResponse(logs || "Nenhum log gravado ainda.", {
        headers: {
          "Content-Disposition": "attachment; filename=app.log",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Erro ao baixar logs." },
        { status: 500 }
      );
    }
  }

  try {
    const logs = await readLogs(normalizedLimit);

    return NextResponse.json({
      success: true,
      logs: logs || "Nenhum log gravado ainda.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erro ao ler logs." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireQaAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    await prisma.$executeRaw`DELETE FROM "server_logs"`;
  } catch (error) {
    console.error("Failed to clear logs from database:", error);
  }

  try {
    const logFile = getLogFilePath();
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, "");
    }

    return NextResponse.json({
      success: true,
      message: "Logs limpos com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erro ao limpar logs." },
      { status: 500 }
    );
  }
}
