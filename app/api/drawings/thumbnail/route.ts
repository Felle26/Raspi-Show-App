import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DRAWINGS_DIR = join(process.cwd(), 'public/dienstplan-drawings');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pdfName = searchParams.get('pdfName');

    if (!pdfName) {
      return NextResponse.json(
        { error: 'PDF-Name erforderlich' },
        { status: 400 }
      );
    }

    const pdfDrawingsDir = join(DRAWINGS_DIR, sanitizePath(pdfName));

    // Wenn das Verzeichnis nicht existiert, gebe einen Placeholder zurück
    if (!existsSync(pdfDrawingsDir)) {
      return new NextResponse(null, { status: 404 });
    }

    // Lese alle Zeichnungen
    const files = await readdir(pdfDrawingsDir);
    const pngFiles = files.filter(f => f.endsWith('.png')).sort().reverse();

    if (pngFiles.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    // Verwende das neueste Bild als Thumbnail
    const thumbnailPath = join(pdfDrawingsDir, pngFiles[0]);
    const imageBuffer = await readFile(thumbnailPath);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Thumbnails:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Thumbnails' },
      { status: 500 }
    );
  }
}

function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
