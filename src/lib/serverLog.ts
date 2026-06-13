const MAX_LOG_MESSAGE_LENGTH = 500;

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

export function logServerError(context: string, error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const rawMessage =
    error instanceof Error ? error.message : "Erro sem mensagem disponivel.";

  console.error(context, {
    name,
    message: sanitizeSensitiveText(rawMessage),
  });
}
