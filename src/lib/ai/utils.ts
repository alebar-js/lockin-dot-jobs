/**
 * Strip markdown code blocks from AI response
 */
export function stripMarkdownCodeBlocks(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` blocks
  return text
    .replace(/^```(?:json)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .trim();
}

/**
 * Extract a balanced JSON object from text
 */
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) {
      return text.substring(start, i + 1);
    }
  }

  // If we never balanced, try to close remaining braces
  if (depth > 0) {
    return text.substring(start) + "}".repeat(depth);
  }

  return null;
}

/**
 * Transform null to undefined for optional fields
 */
export function transformNullToUndefined(obj: unknown): unknown {
  if (obj === null) {
    return undefined;
  }
  if (Array.isArray(obj)) {
    return obj.map(transformNullToUndefined);
  }
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = transformNullToUndefined(value);
    }
    return result;
  }
  return obj;
}

