const MAX_LINE_LENGTH = 800;
const MAX_PREPROCESSED_CHARS = 9000;

const noisyLinePatterns = [
  /^authorization\s*:/i,
  /^cookie\s*:/i,
  /^set-cookie\s*:/i,
  /^bearer\s+/i,
  /^-----BEGIN\s+.+KEY-----/i,
  /^\s*at\s+.+\(.+:\d+:\d+\)\s*$/i,
  /^webpack-internal:/i,
  /^node_modules[\\/]/i,
];

function stripHtml(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function compactRepeatedWhitespace(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trimLongLine(line: string) {
  if (line.length <= MAX_LINE_LENGTH) return line;
  return `${line.slice(0, MAX_LINE_LENGTH)} ... [linha reduzida]`;
}

export function preprocessAiInput(text: string) {
  const originalLength = text.length;
  const withoutHtml = stripHtml(text);
  const lines = compactRepeatedWhitespace(withoutHtml)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      return !noisyLinePatterns.some((pattern) => pattern.test(line));
    })
    .map(trimLongLine);

  let processed = compactRepeatedWhitespace(lines.join("\n"));
  if (processed.length > MAX_PREPROCESSED_CHARS) {
    processed = `${processed.slice(0, MAX_PREPROCESSED_CHARS)}\n\n[Texto reduzido automaticamente para manter a geracao estavel.]`;
  }

  return {
    text: processed || text.trim(),
    originalLength,
    processedLength: processed.length,
    wasReduced: processed.length < originalLength,
  };
}
