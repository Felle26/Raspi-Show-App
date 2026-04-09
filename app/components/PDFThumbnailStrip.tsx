'use client';

import React, { useEffect, useState } from 'react';
import * as PDFJS from 'pdfjs-dist';

PDFJS.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PDFFile {
  name: string;
  uploadDate: string;
}

interface PDFThumbnailStripProps {
  onPDFSelect: (pdfName: string, pdfUrl: string) => void;
  selectedPdfName?: string;
}

export function PDFThumbnailStrip({ onPDFSelect, selectedPdfName }: PDFThumbnailStripProps) {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Laden der Dateien
  useEffect(() => {
    let ignore = false;

    const createPdfThumbnail = async (pdfUrl: string): Promise<string | null> => {
      try {
        const loadingTask = PDFJS.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Fit in the strip tile size (w-20 / h-28).
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 96;
        const targetHeight = 136;
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
        const pdfFiles = Array.isArray(data.files)
          ? data.files.filter((f: PDFFile) => f.name.toLowerCase().endsWith('.pdf'))
          : [];

        setFiles(pdfFiles);

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

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 bg-gray-100 dark:bg-slate-800">
        <span className="text-sm text-gray-600 dark:text-gray-300">Lädt...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-20 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 bg-gray-100 dark:bg-slate-800">
        <span className="text-sm text-gray-600 dark:text-gray-300">Keine PDFs gefunden</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-gray-300 dark:border-gray-700 px-3 py-3">
      <div className="flex gap-2 overflow-x-auto px-1 py-1">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() =>
              onPDFSelect(file.name, `/dienstplan-uploads/${encodeURIComponent(file.name)}`)
            }
            title={file.name}
            className={`shrink-0 cursor-pointer transition-transform hover:scale-105 flex flex-col items-center gap-1 w-24 ${
              selectedPdfName === file.name ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Thumbnail oder Placeholder */}
            {thumbnails[file.name] ? (
              <div className="relative w-24 h-34 rounded-md overflow-hidden border-1.5 border-gray-300 dark:border-gray-600">
                <img
                  src={thumbnails[file.name]}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-34 rounded-md border-1.5 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-lg">📄</span>
              </div>
            )}

            <span className="w-full px-1 text-center text-[10px] leading-tight text-gray-800 dark:text-gray-200 truncate">
              {file.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
