'use client';

import React, { useState, useCallback } from 'react';
import { PDFViewer } from '../components/PDFViewer';
import { PDFThumbnailStrip } from '../components/PDFThumbnailStrip';

export default function ShowPage() {
  const [selectedPdf, setSelectedPdf] = useState<{ name: string; url: string } | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  const handlePDFSelect = (pdfName: string, pdfUrl: string) => {
    setSelectedPdf({ name: pdfName, url: pdfUrl });
  };

  const handleDrawingSaved = () => {
    // Optional: Refresh thumbnail strip
    console.log('Zeichnung gespeichert');
  };

  const handleNewFilesDetected = useCallback(() => {
    setShowUpdateBanner(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950">
      {/* Neue-Dateien-Banner */}
      {showUpdateBanner && (
        <div className="flex items-center justify-between gap-4 bg-amber-400 dark:bg-amber-500 px-5 py-3 text-amber-900 dark:text-amber-950 z-30">
          <span className="text-base font-semibold">
            📂 Dateiliste hat sich geändert – Seite aktualisieren um die Änderungen zu sehen.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.location.reload()}
              className="min-h-12 rounded-lg bg-amber-700 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-amber-800"
            >
              🔄 Jetzt aktualisieren
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="min-h-12 rounded-lg bg-amber-600/40 px-4 py-2 text-base font-semibold text-amber-900 transition-colors hover:bg-amber-600/60 dark:text-amber-950"
              aria-label="Hinweis schließen"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Viewer Area */}
      <div className="flex-1 min-h-0">
        {selectedPdf ? (
          <PDFViewer
            pdfUrl={selectedPdf.url}
            pdfName={selectedPdf.name}
            onDrawingSaved={handleDrawingSaved}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 dark:text-gray-400">
            <div className="text-center">
              <p className="mb-4 text-4xl">📄</p>
              <p className="text-2xl font-medium">Wähle eine PDF aus der Leiste unten</p>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      <PDFThumbnailStrip
        onPDFSelect={handlePDFSelect}
        selectedPdfName={selectedPdf?.name}
        onNewFilesDetected={handleNewFilesDetected}
      />
    </div>
  );
}
