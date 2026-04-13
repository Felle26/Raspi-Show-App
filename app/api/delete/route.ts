import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir, rmdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

async function writeLastChangedTimestamp() {
  try {
    let config: Record<string, string> = {};
    try {
      const content = await readFile(CONFIG_FILE, 'utf-8');
      config = JSON.parse(content);
    } catch {
      // Config existiert noch nicht
    }
    config.lastChangedAt = new Date().toISOString();
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Fehler beim Schreiben des Timestamps:', err);
  }
}

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

    await writeLastChangedTimestamp();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der PDF:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der PDF' },
      { status: 500 }
    );
  }
}
