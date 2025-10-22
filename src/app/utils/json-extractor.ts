/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/utils/json-extractor.ts
export function extractJSON(text: string): any {
  // Try multiple extraction strategies

  // Strategy 1: Direct parse if already valid JSON
  try {
    return JSON.parse(text);
  } catch {}

  // Strategy 2: Look for JSON between ```json markers
  const jsonCodeBlock = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonCodeBlock) {
    try {
      return JSON.parse(jsonCodeBlock[1]);
    } catch {}
  }

  // Strategy 3: Find JSON object boundaries
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonStr = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr);
    } catch {}
  }

  // Strategy 4: Find JSON array boundaries
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      const jsonStr = text.substring(firstBracket, lastBracket + 1);
      return JSON.parse(jsonStr);
    } catch {}
  }

  // Strategy 5: Try to fix common issues
  let cleaned = text;
  // Remove markdown
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/gi, "");
  // Remove common prefixes
  cleaned = cleaned.replace(/^[\s\S]*?({|\[)/, "$1");
  // Remove common suffixes
  cleaned = cleaned.replace(/(}|\])[\s\S]*?$/, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {}

  // If all strategies fail, return null
  console.error("Failed to extract JSON from:", text.substring(0, 200));
  return null;
}
