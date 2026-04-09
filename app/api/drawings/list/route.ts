import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DRAWINGS_DIR = join(process.cwd(), 'public/dienstplan-drawings');

interface Drawing {
  id: string;
  fileName: string;
  pdfName: string;
  page: number;
  createdAt: string;
  url: string;
}

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

    if (!existsSync(pdfDrawingsDir)) {
      return NextResponse.json({ drawings: [] });
    }

    const files = await readdir(pdfDrawingsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

    const drawings: Drawing[] = [];
    for (const jsonFile of jsonFiles) {
      try {
        const jsonPath = join(pdfDrawingsDir, jsonFile);
        const jsonContent = await readFile(jsonPath, 'utf-8');
        const meta = JSON.parse(jsonContent);

        drawings.push({
          id: jsonFile.replace('.json', ''),
          fileName: meta.fileName,
          pdfName: meta.pdfName,
          page: meta.page,
          createdAt: meta.createdAt,
          url: `/dienstplan-drawings/${sanitizePath(pdfName)}/${meta.fileName}`,
        });
      } catch (err) {
        console.error(`Fehler beim Parsen von ${jsonFile}:`, err);
      }
    }

    return NextResponse.json({ drawings });
  } catch (error) {
    console.error('Fehler beim Laden der Zeichnungen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zeichnungen' },
      { status: 500 }
    );
  }
}

function sanitizePath(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
