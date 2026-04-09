import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DRAWINGS_DIR = join(process.cwd(), 'public/dienstplan-drawings');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfName = formData.get('pdfName') as string;
    const page = formData.get('page') as string;

    if (!file || !pdfName) {
      return NextResponse.json(
        { error: 'Datei oder PDF-Name fehlt' },
        { status: 400 }
      );
    }

    // Erstelle Verzeichnisse
    const pdfDrawingsDir = join(DRAWINGS_DIR, sanitizePath(pdfName));
    await mkdir(pdfDrawingsDir, { recursive: true });

    // Speichere Zeichnung
    const fileName = `${Date.now()}.png`;
    const filePath = join(pdfDrawingsDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Speichere Metadaten
    const metaFileName = `${Date.now()}.json`;
    const metaPath = join(pdfDrawingsDir, metaFileName);
    await writeFile(
      metaPath,
      JSON.stringify({
        fileName,
        pdfName,
        page: parseInt(page),
        createdAt: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      fileName,
      message: 'Zeichnung gespeichert',
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Zeichnung:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Zeichnung' },
      { status: 500 }
    );
  }
}

function sanitizePath(name: string): string {
  // Entferne unsichere Zeichen
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
