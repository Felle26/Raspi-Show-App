import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "public/dienstplan-uploads");

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

      // Dateiname sanitizen
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Datei als Buffer lesen
      const bytes = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        savedAs: filename,
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
