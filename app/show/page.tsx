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
        <div className="flex items-center justify-between gap-4 bg-amber-400 dark:bg-amber-500 px-4 py-2 text-amber-900 dark:text-amber-950 z-30">
          <span className="text-sm font-semibold">
            📂 Dateiliste hat sich geändert – Seite aktualisieren um die Änderungen zu sehen.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              🔄 Jetzt aktualisieren
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="px-3 py-1 bg-amber-600/40 hover:bg-amber-600/60 text-amber-900 dark:text-amber-950 rounded-lg text-sm font-semibold transition-colors"
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
              <p className="text-2xl mb-4">📄</p>
              <p className="text-xl">Wähle eine PDF aus der Leiste unten</p>
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
