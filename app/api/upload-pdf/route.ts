import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";
import { PDFParse } from "pdf-parse";


const UPLOAD_DIR = join(process.cwd(), "public/dienstplan-uploads");

function sanitizeBaseName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/g, "");

  return cleaned || "Dokument";
}

function stripPdfExtension(filename: string): string {
  return filename.replace(/\.pdf$/i, "");
}

async function getUniquePdfFilename(baseName: string): Promise<string> {
  let candidate = `${baseName}.pdf`;
  let index = 1;

  while (existsSync(join(UPLOAD_DIR, candidate))) {
    candidate = `${baseName} (${index}).pdf`;
    index += 1;
  }

  return candidate;
}

function extractPlanKwName(text: string): string | null {
  const normalizedText = text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  // Bevorzugt Muster mit "Plan" oder "Dienstplan".
  const namedMatch = normalizedText.match(
    /\b(?:Plan|Dienstplan)\s*KW\s*[:.-]?\s*(\d{1,2})(?:\s*[\/-]\s*(\d{2,4}))?\b/i
  );
  if (namedMatch) {
    const kw = namedMatch[1];
    const year = namedMatch[2] ? ` ${namedMatch[2]}` : '';
    return sanitizeBaseName(`Plan KW ${kw}${year}`);
  }

  // Fallback: Nur "KW <Nummer>" im Dokument gefunden.
  const kwOnlyMatch = normalizedText.match(
    /\bKW\s*[:.-]?\s*(\d{1,2})(?:\s*[\/-]\s*(\d{2,4}))?\b/i
  );
  if (kwOnlyMatch) {
    const kw = kwOnlyMatch[1];
    const year = kwOnlyMatch[2] ? ` ${kwOnlyMatch[2]}` : '';
    return sanitizeBaseName(`Plan KW ${kw}${year}`);
  }

  return null;
}

async function extractPreferredPdfName(bytes: ArrayBuffer): Promise<string | null> {
  const parser = new PDFParse({ data: Buffer.from(bytes) });

  try {
    const parsedText = await parser.getText();
    const planKwName = extractPlanKwName(parsedText.text);
    if (planKwName) {
      return planKwName;
    }

    const firstLine = parsedText.text
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .find((line: string) => line.length > 0);

    if (!firstLine) {
      return null;
    }

    return sanitizeBaseName(firstLine);
  } catch {
    return null;
  } finally {
    await parser.destroy();
  }
}

export async function GET() {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ files: [] });
    }

    const filenames = await readdir(UPLOAD_DIR);
    const filesWithMeta = await Promise.all(
      filenames.map(async (filename) => {
        const filePath = join(UPLOAD_DIR, filename);
        const fileStats = await stat(filePath);

        return {
          name: filename,
          size: fileStats.size,
          uploadedAt: fileStats.birthtime.toISOString(),
          modifiedAt: fileStats.mtime.toISOString(),
          url: `/dienstplan-uploads/${encodeURIComponent(filename)}`,
        };
      })
    );

    filesWithMeta.sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );

    return NextResponse.json({ files: filesWithMeta });
  } catch (error) {
    console.error("Fehler beim Laden der Dateien:", error);
    return NextResponse.json(
      { error: "Dateiliste konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Keine Dateien hochgeladen" },
        { status: 400 }
      );
    }

    // Verzeichnis erstellen, falls nicht vorhanden
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      // Nur PDFs erlauben
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: `${file.name} ist keine PDF-Datei` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const firstLineName = await extractPreferredPdfName(bytes);
      const fallbackName = sanitizeBaseName(stripPdfExtension(file.name));
      const baseName = firstLineName ?? fallbackName;
      const filename = await getUniquePdfFilename(baseName);
      const filepath = join(UPLOAD_DIR, filename);

      await writeFile(filepath, Buffer.from(bytes));

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        savedAs: filename,
        usedFirstLine: firstLineName ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} Datei(en) erfolgreich gespeichert`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload-Fehler:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Dateien" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const filename = request.nextUrl.searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Dateiname fehlt" },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[\\/]/g, "");
    const filePath = join(UPLOAD_DIR, safeName);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Datei wurde nicht gefunden" },
        { status: 404 }
      );
    }

    unlinkSync(filePath);

    return NextResponse.json({
      success: true,
      message: `${safeName} wurde gelöscht`,
    });
  } catch (error) {
    console.error("Lösch-Fehler:", error);
    return NextResponse.json(
      { error: "Datei konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
