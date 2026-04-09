import { describe, it, expect } from "vitest";
import {
  extractPlanKwName,
  extractNamingFromText,
  sanitizeBaseName,
  stripPdfExtension,
} from "./pdf-naming";

describe("extractPlanKwName", () => {
  it("extracts KW from a real PDF header like the screenshot", () => {
    const text = "Plan KW 16 13.04.2026 - 19.04.2026";
    expect(extractPlanKwName(text)).toBe("Plan KW 16");
  });

  it("does not absorb the date as a year suffix", () => {
    const text = "Plan KW 16 13.04.2026 - 19.04.2026";
    expect(extractPlanKwName(text)).not.toContain("13");
  });

  it("handles 'Plan KW 14'", () => {
    expect(extractPlanKwName("Plan KW 14")).toBe("Plan KW 14");
  });

  it("handles 'Dienstplan KW 16'", () => {
    expect(extractPlanKwName("Dienstplan KW 16")).toBe("Plan KW 16");
  });

  it("handles 'Dienstplan K.W. 16'", () => {
    expect(extractPlanKwName("Dienstplan K.W. 16")).toBe("Plan KW 16");
  });

  it("handles 'Plan K W: 14/2026'", () => {
    expect(extractPlanKwName("Plan K W: 14/2026")).toBe("Plan KW 14 2026");
  });

  it("handles standalone 'KW 16'", () => {
    expect(extractPlanKwName("KW 16")).toBe("Plan KW 16");
  });

  it("handles 'KW 16/2026' with year", () => {
    expect(extractPlanKwName("KW 16/2026")).toBe("Plan KW 16 2026");
  });

  it("handles 'KW 3-26' with short year", () => {
    expect(extractPlanKwName("KW 3-26")).toBe("Plan KW 3 26");
  });

  it("handles non-breaking spaces", () => {
    expect(extractPlanKwName("Plan\u00A0KW\u00A016")).toBe("Plan KW 16");
  });

  it("handles OCR-fragmented text like 'P l a n K W 14'", () => {
    expect(extractPlanKwName("P l a n   K W  14")).toBe("Plan KW 14");
  });

  it("returns null when no KW pattern exists", () => {
    expect(extractPlanKwName("Bäckerei Brot Brötchen Ofen")).toBeNull();
  });

  it("rejects week numbers above 53", () => {
    expect(extractPlanKwName("Plan KW 99")).toBeNull();
  });

  it("rejects week number 0", () => {
    expect(extractPlanKwName("Plan KW 0")).toBeNull();
  });

  it("handles en-dash separator", () => {
    expect(extractPlanKwName("Plan KW 16 – 13.04.2026")).toBe("Plan KW 16");
  });

  it("handles multiline PDF text where KW is on second line", () => {
    const text =
      "nstelle 020 Bäckerei Brot/Brötchen/Ofen\nPlan KW 16 13.04.2026 - 19.04.2026";
    expect(extractPlanKwName(text)).toBe("Plan KW 16");
  });
});

describe("extractNamingFromText", () => {
  it("returns both detected KW name and fallback from real header", () => {
    const text =
      "nstelle 020 Bäckerei Brot/Brötchen/Ofen\nPlan KW 16 13.04.2026 - 19.04.2026";
    const result = extractNamingFromText(text);
    expect(result.detectedPlanKwName).toBe("Plan KW 16");
    expect(result.detectedFallbackName).toBe(
      "nstelle 020 Bäckerei Brot_Brötchen_Ofen"
    );
  });

  it("falls back to first line when no KW found", () => {
    const result = extractNamingFromText("Bäckerei Hauptstraße\nSeite 1");
    expect(result.detectedPlanKwName).toBeNull();
    expect(result.detectedFallbackName).toBe("Bäckerei Hauptstraße");
  });

  it("returns nulls for empty text", () => {
    const result = extractNamingFromText("");
    expect(result.detectedPlanKwName).toBeNull();
    expect(result.detectedFallbackName).toBeNull();
  });
});

describe("sanitizeBaseName", () => {
  it("replaces illegal filename characters", () => {
    expect(sanitizeBaseName("Plan/KW:16 test")).toBe("Plan_KW_16 test");
  });

  it("trims trailing dots and spaces", () => {
    expect(sanitizeBaseName("Plan KW 16... ")).toBe("Plan KW 16");
  });

  it("returns 'Dokument' for empty input", () => {
    expect(sanitizeBaseName("")).toBe("Dokument");
  });
});

describe("stripPdfExtension", () => {
  it("strips .pdf", () => {
    expect(stripPdfExtension("Plan KW 16.pdf")).toBe("Plan KW 16");
  });

  it("strips .PDF (case-insensitive)", () => {
    expect(stripPdfExtension("Plan KW 16.PDF")).toBe("Plan KW 16");
  });

  it("leaves names without .pdf unchanged", () => {
    expect(stripPdfExtension("Plan KW 16")).toBe("Plan KW 16");
  });
});
