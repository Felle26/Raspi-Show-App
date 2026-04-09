'use client';

import React, { useState } from 'react';
import { PDFViewer } from '../components/PDFViewer';
import { PDFThumbnailStrip } from '../components/PDFThumbnailStrip';

export default function ShowPage() {
  const [selectedPdf, setSelectedPdf] = useState<{ name: string; url: string } | null>(null);

  const handlePDFSelect = (pdfName: string, pdfUrl: string) => {
    setSelectedPdf({ name: pdfName, url: pdfUrl });
  };

  const handleDrawingSaved = () => {
    // Optional: Refresh thumbnail strip
    console.log('Zeichnung gespeichert');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950">
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
      />
    </div>
  );
}
