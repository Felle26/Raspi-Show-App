import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DRAWINGS_DIR = join(process.cwd(), 'public/dienstplan-drawings');

export async function DELETE(request: NextRequest) {
  try {
    const { drawingId, pdfName } = await request.json();

    if (!drawingId || !pdfName) {
      return NextResponse.json(
        { error: 'drawingId oder pdfName fehlt' },
        { status: 400 }
      );
    }

    const pdfDrawingsDir = join(DRAWINGS_DIR, sanitizePath(pdfName));
    const pngPath = join(pdfDrawingsDir, `${drawingId}.png`);
    const jsonPath = join(pdfDrawingsDir, `${drawingId}.json`);

    // Sicherheitscheck: Verhindere Directory Traversal
    if (!pngPath.startsWith(DRAWINGS_DIR) || !jsonPath.startsWith(DRAWINGS_DIR)) {
      return NextResponse.json(
        { error: 'Ungültiger Pfad' },
        { status: 400 }
      );
    }

    // Lösche beide Dateien
    if (existsSync(pngPath)) {
      await unlink(pngPath);
    }
    if (existsSync(jsonPath)) {
      await unlink(jsonPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen der Zeichnung:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Zeichnung' },
      { status: 500 }
    );
  }
}

function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
