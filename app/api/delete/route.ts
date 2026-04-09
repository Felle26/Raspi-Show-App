import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public/dienstplan-uploads');
const DRAWINGS_DIR = join(process.cwd(), 'public/dienstplan-drawings');

function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function deleteDirectoryContents(dirPath: string): Promise<void> {
  try {
    if (!existsSync(dirPath)) return;

    const files = await readdir(dirPath);
    for (const file of files) {
      const filePath = join(dirPath, file);
      await unlink(filePath);
    }
    await rmdir(dirPath);
  } catch (err) {
    console.error(`Fehler beim Löschen des Verzeichnisses ${dirPath}:`, err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json(
        { error: 'Dateiname erforderlich' },
        { status: 400 }
      );
    }

    // Sicherheitscheck
    const filePath = join(UPLOAD_DIR, fileName);
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { error: 'Ungültiger Pfad' },
        { status: 400 }
      );
    }

    // Lösche die PDF
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Lösche zugehörige Zeichnungen
    const drawingsDirForPdf = join(DRAWINGS_DIR, sanitizePath(fileName));
    await deleteDirectoryContents(drawingsDirForPdf);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der PDF:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der PDF' },
      { status: 500 }
    );
  }
}
