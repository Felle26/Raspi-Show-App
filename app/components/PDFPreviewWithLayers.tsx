'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as PDFJS from 'pdfjs-dist';

PDFJS.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface Drawing {
  id: string;
  fileName: string;
  pdfName: string;
  page: number;
  createdAt: string;
  url: string;
}

interface PDFPreviewWithLayersProps {
  pdfUrl: string;
  pdfName: string;
  drawings?: Drawing[];
}

export function PDFPreviewWithLayers({
  pdfUrl,
  pdfName,
  drawings = [],
}: PDFPreviewWithLayersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRenderingRef = useRef(false);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [sortedDrawings, setSortedDrawings] = useState<Drawing[]>([]);

  // Lade PDF beim Laden der Komponente
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setError(null);
        const pdfDoc = await PDFJS.getDocument(pdfUrl).promise;
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
      } catch (err) {
        setError(`Fehler beim Laden der PDF: ${err}`);
        console.error(err);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  // Sortiere Zeichnungen nach Uhrzeit (neueste zuerst)
  useEffect(() => {
    const sorted = [...drawings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setSortedDrawings(sorted);
  }, [drawings]);

  // Render PDF-Seite mit Zeichnungen
  useEffect(() => {
    // Abbrechen von vorherigen Render-Operationen
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const renderPageWithDrawings = async () => {
      if (!pdf || !canvasRef.current || !containerRef.current) return;

      // Wenn schon eine Renderoperation läuft, warten
      while (isRenderingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      isRenderingRef.current = true;
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // Check if aborted before starting
        if (signal.aborted) return;

        const page = await pdf.getPage(currentPage);

        // Berechne Scale basierend auf verfügbarem Platz
        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth - 32;
        const containerHeight = container.clientHeight - 32;

        const viewport = page.getViewport({ scale: 1 });

        // Berechne Scale so, dass die Seite in den Container passt
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const calculatedScale = Math.min(scaleX, scaleY, 2);

        setScale(calculatedScale);

        if (signal.aborted) return;

        const scaledViewport = page.getViewport({ scale: calculatedScale });

        const canvas = canvasRef.current;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const context = canvas.getContext('2d');
        if (!context) return;

        if (signal.aborted) return;

        // Render PDF - warte auf completion
        const renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });

        await renderTask.promise;

        if (signal.aborted) return;

        // Overlay Zeichnungen für diese Seite
        const pageDrawings = sortedDrawings.filter((d) => d.page === currentPage);

        for (const drawing of pageDrawings) {
          if (signal.aborted) break;

          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
              }, 10000);

              img.onload = () => {
                clearTimeout(timeout);
                // Zeichnung mit leichter Transparenz (90%) überlagern
                context.globalAlpha = 0.9;
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                context.globalAlpha = 1.0;
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Image failed to load'));
              };
              img.src = drawing.url;
            });
          } catch (err) {
            console.error(`Fehler beim Laden der Zeichnung ${drawing.id}:`, err);
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(`Fehler beim Rendern: ${err}`);
          console.error(err);
        }
      } finally {
        isRenderingRef.current = false;
      }
    };

    renderPageWithDrawings();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pdf, currentPage, sortedDrawings]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-gray-700 p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          📋 {pdfName}
        </h3>
        {sortedDrawings.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sortedDrawings.length} Zeichnung(en) überlagert
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border border-red-400 dark:border-red-700">
          {error}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-800 flex items-center justify-center p-4"
      >
        {pdf ? (
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-400 dark:border-gray-600 shadow-lg bg-white"
          />
        ) : (
          <div className="text-gray-500 dark:text-gray-400">PDF wird geladen...</div>
        )}
      </div>

      {/* Seitennavi */}
      {totalPages > 0 && (
        <div className="flex gap-4 items-center justify-between p-4 bg-white dark:bg-slate-900 border-t border-gray-300 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
            >
              ← Vorherige
            </button>
            <button
              onClick={() => handlePageChange('next')}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Nächste →
            </button>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Seite {currentPage} / {totalPages}
          </span>
          <div />
        </div>
      )}

      {/* Drawings Timeline */}
      {sortedDrawings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border-t border-gray-300 dark:border-gray-700 p-4 max-h-40 overflow-y-auto">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
            ✏️ Alle Zeichnungen (zeitlich sortiert)
          </h4>
          <div className="space-y-2">
            {sortedDrawings.map((drawing, idx) => (
              <div
                key={drawing.id}
                className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    #{idx + 1} • Seite {drawing.page}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(drawing.createdAt).toLocaleString('de-DE')}
                  </p>
                </div>
                <a
                  href={drawing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                >
                  👁️ Ansicht
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
