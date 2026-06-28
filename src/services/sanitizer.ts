/**
 * Output Sanitizer
 *
 * Strips unwanted LLM artifacts from responses:
 * - prefaces ("Sure!", "Here's the translation:")
 * - wrapping quotes
 * - markdown formatting
 * - extra whitespace
 */

const PREFACE_PATTERNS = [
  /^(sure[!.,]*\s*)/i,
  /^(of course[!.,]*\s*)/i,
  /^(here('s| is)[^:]*:\s*)/i,
  /^(the (english|translation|converted)[^:]*:\s*)/i,
  /^(in english[,:]*\s*)/i,
  /^(translation[,:]*\s*)/i,
  /^(output[,:]*\s*)/i,
  /^(result[,:]*\s*)/i,
  /^(certainly[!.,]*\s*)/i,
  /^(absolutely[!.,]*\s*)/i,
];

export function sanitize(output: string): string {
  let text = output.trim();

  // Strip prefaces
  for (const pattern of PREFACE_PATTERNS) {
    text = text.replace(pattern, "");
  }

  // Strip wrapping quotes (single, double, or backticks)
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith("`") && text.endsWith("`"))
  ) {
    text = text.slice(1, -1);
  }

  // Strip markdown bold/italic
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, "$1");

  // Strip inline code backticks
  text = text.replace(/`([^`]+)`/g, "$1");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
