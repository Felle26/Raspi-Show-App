export function sanitizeBaseName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/g, "");

  return cleaned || "Dokument";
}

export function stripPdfExtension(filename: string): string {
  return filename.replace(/\.pdf$/i, "");
}

function isValidWeek(n: number): boolean {
  return n >= 1 && n <= 53;
}

function isPlausibleYear(s: string): boolean {
  const n = parseInt(s, 10);
  if (s.length === 4) return n >= 2000 && n <= 2099;
  if (s.length === 2) return n >= 0 && n <= 99;
  return false;
}

/**
 * Tries to extract a "Plan KW <number>" style name from raw PDF text.
 *
 * The year is only captured when it follows KW with an explicit separator
 * like "/" or "-" (e.g. "KW 16/2026") so that adjacent date fragments
 * like "13.04.2026" are never mistaken for a year suffix.
 */
export function extractPlanKwName(text: string): string | null {
  const normalizedText = text
    .replace(/\u00A0/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // 1) "Plan KW 16" / "Dienstplan K.W. 14" with optional year after "/" or "-".
  //    The year must not be followed by "." to avoid grabbing the day of a date
  //    like "13.04.2026".
  const namedMatch = normalizedText.match(
    /\b(?:plan|dienstplan)\b[\s:;,.\-_/]*k[\s.\-_]*w[\s:;,.\-_]*(\d{1,2})(?:\s*[/\-]\s*(\d{2,4})(?!\.))?(?:\s|$|[^0-9])/i
  );
  if (namedMatch) {
    const kw = parseInt(namedMatch[1], 10);
    if (isValidWeek(kw)) {
      const year =
        namedMatch[2] && isPlausibleYear(namedMatch[2])
          ? ` ${namedMatch[2]}`
          : "";
      return sanitizeBaseName(`Plan KW ${kw}${year}`);
    }
  }

  // 2) Standalone "KW 16" (no "Plan" prefix) with optional year after "/" or "-"
  const kwOnlyMatch = normalizedText.match(
    /\bk[\s.\-_]*w[\s:;,.\-_]*(\d{1,2})(?:\s*[/\-]\s*(\d{2,4})(?!\.))?(?:\s|$|[^0-9])/i
  );
  if (kwOnlyMatch) {
    const kw = parseInt(kwOnlyMatch[1], 10);
    if (isValidWeek(kw)) {
      const year =
        kwOnlyMatch[2] && isPlausibleYear(kwOnlyMatch[2])
          ? ` ${kwOnlyMatch[2]}`
          : "";
      return sanitizeBaseName(`Plan KW ${kw}${year}`);
    }
  }

  // 3) Compact / OCR-fragmented text: strip everything non-alphanumeric
  const compact = normalizedText.toLowerCase().replace(/[^a-z0-9]/g, "");

  const compactNamedMatch = compact.match(
    /(?:dienstplan|plan)kw(\d{1,2})/
  );
  if (compactNamedMatch) {
    const kw = parseInt(compactNamedMatch[1], 10);
    if (isValidWeek(kw)) {
      return sanitizeBaseName(`Plan KW ${kw}`);
    }
  }

  const compactKwOnlyMatch = compact.match(/kw(\d{1,2})/);
  if (compactKwOnlyMatch) {
    const kw = parseInt(compactKwOnlyMatch[1], 10);
    if (isValidWeek(kw)) {
      return sanitizeBaseName(`Plan KW ${kw}`);
    }
  }

  return null;
}

export interface ExtractedPdfNaming {
  detectedPlanKwName: string | null;
  detectedFallbackName: string | null;
}

export function extractNamingFromText(text: string): ExtractedPdfNaming {
  const planKwName = extractPlanKwName(text);

  const firstLine = text
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .find((line: string) => line.length > 0);

  return {
    detectedPlanKwName: planKwName,
    detectedFallbackName: firstLine ? sanitizeBaseName(firstLine) : null,
  };
}
