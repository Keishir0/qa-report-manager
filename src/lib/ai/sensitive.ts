const sensitivePatterns = [
  {
    label: "cabeçalho de autorização",
    pattern: /\bauthorization\s*:\s*(?:bearer|basic)\s+\S+/i,
  },
  {
    label: "token JWT",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    label: "chave privada",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    label: "chave ou token",
    pattern:
      /\b(?:api[_ -]?key|access[_ -]?token|secret[_ -]?key|client[_ -]?secret)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}/i,
  },
  {
    label: "senha",
    pattern: /\b(?:senha|password|passwd)\b\s*[:=]\s*["']?\S{8,}/i,
  },
] as const;

export function findSensitiveContent(text: string) {
  return sensitivePatterns.find(({ pattern }) => pattern.test(text))?.label;
}
