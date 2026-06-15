import fs from "fs";
import path from "path";

const MAX_LOG_MESSAGE_LENGTH = 1000;

export function sanitizeSensitiveText(value: string) {
  return value
    .replace(
      /\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi,
      "$1 [REDACTED]"
    )
    .replace(
      /(\b(?:api[_-]?key|authorization|password|secret|token)\b\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1[REDACTED]"
    )
    .replace(
      /((?:postgres(?:ql)?|mysql):\/\/[^:\s/]+:)[^@\s/]+@/gi,
      "$1[REDACTED]@"
    )
    .slice(0, MAX_LOG_MESSAGE_LENGTH);
}

export function writeLog(
  level: "INFO" | "WARNING" | "ERROR",
  context: string,
  message: string,
  stack?: string
) {
  const sanitizedMessage = sanitizeSensitiveText(message);
  const sanitizedStack = stack ? sanitizeSensitiveText(stack) : undefined;

  const consoleMsg = `[${level}] [${context}] ${sanitizedMessage}`;
  if (level === "ERROR") {
    console.error(consoleMsg, sanitizedStack || "");
  } else if (level === "WARNING") {
    console.warn(consoleMsg);
  } else {
    console.log(consoleMsg);
  }

  try {
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, "app.log");
    const timestamp = new Date().toISOString();
    const stackLine = sanitizedStack ? `\nStack Trace: ${sanitizedStack}` : "";
    const logLine = `[${timestamp}] [${level}] [${context}] ${sanitizedMessage}${stackLine}\n`;

    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error("Critical: Failed to append to log file:", err);
      }
    });
  } catch (err) {
    console.error("Critical: Failed to write to log file:", err);
  }
}

export function logServerError(context: string, error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const rawMessage =
    error instanceof Error ? error.message : "Erro sem mensagem disponivel.";
  const stack = error instanceof Error ? error.stack : undefined;

  writeLog("ERROR", context, `${name}: ${rawMessage}`, stack);
}
