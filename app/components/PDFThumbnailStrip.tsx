'use client';

import React, { useEffect, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PDFFile {
  name: string;
  uploadDate: string;
}

interface PDFThumbnailStripProps {
  onPDFSelect: (pdfName: string, pdfUrl: string) => void;
  selectedPdfName?: string;
  onNewFilesDetected?: () => void;
}

export function PDFThumbnailStrip({ onPDFSelect, selectedPdfName, onNewFilesDetected }: PDFThumbnailStripProps) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const knownFileNamesRef = React.useRef<Set<string> | null>(null);
  const lastUploadAtRef = React.useRef<string | null>(null);

  // Laden der Dateien
  useEffect(() => {
    let ignore = false;

    const createPdfThumbnail = async (pdfUrl: string): Promise<string | null> => {
      try {
        const loadingTask = getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Fit in the compact strip tile size.
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 40;
        const targetHeight = 56;
        const scale = Math.min(targetWidth / baseViewport.width, targetHeight / baseViewport.height);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const context = canvas.getContext('2d');
        if (!context) {
          return null;
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    };

    const loadFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/files');
        if (!response.ok) throw new Error('Fehler beim Laden der Dateien');

        const data = await response.json();
        const pdfFiles = (Array.isArray(data.files)
          ? data.files.filter((f: PDFFile) => f.name.toLowerCase().endsWith('.pdf'))
          : []) as PDFFile[];

        setFiles(pdfFiles);

        // Merke initiale Dateinamen; beim erneuten Laden auf neue prüfen
        const names = new Set<string>(pdfFiles.map((f: PDFFile) => f.name));
        if (knownFileNamesRef.current === null) {
          knownFileNamesRef.current = names;
        } else {
          const hasNew = [...names].some((n) => !knownFileNamesRef.current!.has(n));
          if (hasNew) {
            knownFileNamesRef.current = names;
            if (!ignore && onNewFilesDetected) onNewFilesDetected();
          }
        }

        // Lade Thumbnails
        if (pdfFiles.length > 0) {
          const thumbs: Record<string, string> = {};
          for (const file of pdfFiles) {
            try {
              const pdfUrl = `/dienstplan-uploads/${encodeURIComponent(file.name)}`;
              const thumbnail = await createPdfThumbnail(pdfUrl);
              if (thumbnail) {
                thumbs[file.name] = thumbnail;
              }
            } catch (err) {
              console.error(`Fehler beim Laden des Thumbnails für ${file.name}:`, err);
            }
          }
          if (!ignore) {
            setThumbnails(thumbs);
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(`Fehler: ${err}`);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadFiles();

    // Initialen Timestamp merken
    fetch('/api/upload-timestamp')
      .then((r) => r.json())
      .then((data) => { lastUploadAtRef.current = data.lastChangedAt ?? null; })
      .catch(() => {});

    // Alle 5 Sekunden prüfen ob sich die Dateiliste geändert hat
    const intervalId = setInterval(() => {
      fetch('/api/upload-timestamp')
        .then((r) => r.json())
        .then((data) => {
          const ts: string | null = data.lastChangedAt ?? null;
          if (ts && ts !== lastUploadAtRef.current) {
            lastUploadAtRef.current = ts;
            if (onNewFilesDetected) onNewFilesDetected();
          }
        })
        .catch(() => {});
    }, 5_000);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-14 bg-gray-100 dark:bg-slate-800">
        <span className="text-sm text-gray-600 dark:text-gray-300">Lädt...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-14 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-14 bg-gray-100 dark:bg-slate-800">
        <span className="text-sm text-gray-600 dark:text-gray-300">Keine PDFs gefunden</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-gray-300 dark:border-gray-700 px-2 py-2">
      <div className="flex gap-2 overflow-x-auto px-1 py-0.5">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() =>
              onPDFSelect(file.name, `/dienstplan-uploads/${encodeURIComponent(file.name)}`)
            }
            title={file.name}
            className={`shrink-0 cursor-pointer transition-colors flex items-center gap-2 rounded-md border px-2 py-1 h-16 min-w-max ${
              selectedPdfName === file.name
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {/* Thumbnail oder Placeholder */}
            {thumbnails[file.name] ? (
              <div className="relative w-10 h-14 rounded-sm overflow-hidden border border-gray-300 dark:border-gray-600 bg-white">
                <img
                  src={thumbnails[file.name]}
                  alt={file.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-14 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-sm">📄</span>
              </div>
            )}

            <span className="text-left text-xs leading-snug text-gray-800 dark:text-gray-200 whitespace-nowrap">
              {file.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
