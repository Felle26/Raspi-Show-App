'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as PDFJS from 'pdfjs-dist';
import { DrawingColor, DrawingTool, DrawingToolbar } from './DrawingToolbar';

PDFJS.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PDFViewerProps {
  pdfUrl: string;
  pdfName: string;
  onDrawingSaved?: () => void;
}

interface SavedDrawing {
  id: string;
  page: number;
  createdAt: string;
  url: string;
}

export function PDFViewer({ pdfUrl, pdfName, onDrawingSaved }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState<DrawingColor>('#000000');
  const [currentTool, setCurrentTool] = useState<DrawingTool>('brush');
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawing[]>([]);
  const [drawingsVersion, setDrawingsVersion] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1);

  const BRUSH_SIZE = 3;
  const ERASER_SIZE = 20;

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

  // Lade gespeicherte Layer für die ausgewählte PDF.
  useEffect(() => {
    let ignore = false;

    const loadSavedDrawings = async () => {
      try {
        const response = await fetch(
          `/api/drawings/list?pdfName=${encodeURIComponent(pdfName)}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          if (!ignore) {
            setSavedDrawings([]);
          }
          return;
        }

        const data = await response.json();
        const drawings: SavedDrawing[] = Array.isArray(data.drawings)
          ? data.drawings
          : [];

        // Alte zuerst, neue zuletzt, damit neue Layer oben liegen.
        const sorted = drawings.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        if (!ignore) {
          setSavedDrawings(sorted);
        }
      } catch {
        if (!ignore) {
          setSavedDrawings([]);
        }
      }
    };

    loadSavedDrawings();

    return () => {
      ignore = true;
    };
  }, [pdfName, drawingsVersion]);

  // Render PDF-Seite auf Canvas
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdf || !canvasRef.current || !containerRef.current) return;

      try {
        // Cancel previous render on the same canvas before starting a new one.
        if (activeRenderTaskRef.current) {
          try {
            activeRenderTaskRef.current.cancel();
          } catch {
            // Ignore cancellation errors from stale tasks.
          }
        }

        // Avoid overlapping render operations.
        while (isRenderingRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 16));
          if (isCancelled) return;
        }

        isRenderingRef.current = true;

        const page = await pdf.getPage(currentPage);
        if (isCancelled) return;
        
        // Berechne Scale basierend auf verfügbarem Platz
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 32; // Padding abziehen
        const containerHeight = container.clientHeight - 32;
        
        const viewport = page.getViewport({ scale: 1 });
        
        // Berechne Scale so, dass die Seite in den Container passt
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const baseScale = Math.min(scaleX, scaleY, 2); // Max 2x für gute Qualität
        const calculatedScale = baseScale * zoomFactor;
        
        if (!isCancelled) {
          setScale(calculatedScale);
        }
        
        const scaledViewport = page.getViewport({ scale: calculatedScale });

        const canvas = canvasRef.current;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const context = canvas.getContext('2d');
        if (!context) return;

        const renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });

        activeRenderTaskRef.current = renderTask;
        await renderTask.promise;
        if (isCancelled) return;

        // Passe Drawing-Canvas an
        if (drawingCanvasRef.current) {
          const overlayCanvas = drawingCanvasRef.current;
          overlayCanvas.width = scaledViewport.width;
          overlayCanvas.height = scaledViewport.height;
          overlayCanvas.style.cursor = 'crosshair';

          const drawingContext = overlayCanvas.getContext('2d');
          if (drawingContext) {
            drawingContext.clearRect(
              0,
              0,
              overlayCanvas.width,
              overlayCanvas.height
            );

            // Gespeicherte Layer der aktuellen Seite beim Öffnen direkt anzeigen.
            const pageDrawings = savedDrawings.filter(
              (drawing) => drawing.page === currentPage
            );

            for (const drawing of pageDrawings) {
              if (isCancelled) return;

              const image = new Image();
              await new Promise<void>((resolve) => {
                image.onload = () => {
                  drawingContext.drawImage(
                    image,
                    0,
                    0,
                    overlayCanvas.width,
                    overlayCanvas.height
                  );
                  resolve();
                };
                image.onerror = () => {
                  resolve();
                };
                image.src = drawing.url;
              });
            }
          }
        }
      } catch (err: any) {
        const message = String(err?.message || err || '');
        const isExpectedCancel =
          message.includes('Rendering cancelled') ||
          message.includes('cancelled') ||
          message.includes('Cannot use the same canvas during multiple render() operations');

        if (!isCancelled && !isExpectedCancel) {
          setError(`Fehler beim Rendern: ${err}`);
          console.error(err);
        }
      } finally {
        isRenderingRef.current = false;
        activeRenderTaskRef.current = null;
      }
    };

    renderPage();
    
    // Re-render wenn Fenster größe ändert
    const onResize = () => {
      renderPage();
    };
    window.addEventListener('resize', onResize);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', onResize);
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors from stale tasks.
        }
      }
    };
  }, [pdf, currentPage, savedDrawings, zoomFactor]);

  const handleZoomIn = () => {
    setZoomFactor((value) => Math.min(3, parseFloat((value + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomFactor((value) => Math.max(0.5, parseFloat((value - 0.1).toFixed(2))));
  };

  // Mouse Events für Drawing
  const getMousePos = (
    e: React.MouseEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (!pos || !drawingCanvasRef.current) return;

    const ctx = drawingCanvasRef.current.getContext('2d');
    if (!ctx) return;

    // Text-Mode: Sofort Text schreiben bei Klick
    if (currentTool === 'text') {
      if (textInput.trim()) {
        ctx.font = `${fontSize}px Arial`;
        
        // Berechne Textgröße für Hintergrund
        const metrics = ctx.measureText(textInput);
        const textWidth = metrics.width;
        const padding = 6;
        
        // Zeichne gelben Hintergrund mit Padding
        ctx.fillStyle = 'rgba(255, 255, 150, 0.9)'; // Leicht gelb mit Transparenz
        ctx.fillRect(
          pos.x - padding,
          pos.y - padding,
          textWidth + padding * 2,
          fontSize + padding * 2
        );
        
        // Zeichne Border um den Hintergrund
        ctx.strokeStyle = 'rgba(200, 200, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          pos.x - padding,
          pos.y - padding,
          textWidth + padding * 2,
          fontSize + padding * 2
        );
        
        // Zeichne Text
        ctx.fillStyle = currentColor;
        ctx.textBaseline = 'top';
        ctx.fillText(textInput, pos.x, pos.y);
      }
      return;
    }

    // Brush/Eraser Mode
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingCanvasRef.current) return;

    const pos = getMousePos(e);
    if (!pos) return;

    const ctx = drawingCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'brush') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = BRUSH_SIZE;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      // Radierer
      ctx.clearRect(pos.x - ERASER_SIZE / 2, pos.y - ERASER_SIZE / 2, ERASER_SIZE, ERASER_SIZE);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = drawingCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const handleClear = () => {
    if (drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      }
    }
  };

  const handleSave = async () => {
    if (!drawingCanvasRef.current) return;

    setIsSaving(true);
    try {
      // Zeichnung als PNG exportieren
      const drawingDataUrl = drawingCanvasRef.current.toDataURL('image/png');
      const blob = await fetch(drawingDataUrl).then((r) => r.blob());

      const formData = new FormData();
      formData.append('file', blob, `drawing-${Date.now()}.png`);
      formData.append('pdfName', pdfName);
      formData.append('page', currentPage.toString());

      const response = await fetch('/api/drawings/save', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Zeichnung');
      }

      alert('Zeichnung erfolgreich gespeichert!');
      setDrawingsVersion((value) => value + 1);
      if (onDrawingSaved) {
        onDrawingSaved();
      }
    } catch (err) {
      setError(`Fehler beim Speichern: ${err}`);
      alert(`Fehler: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950">
      <DrawingToolbar
        currentColor={currentColor}
        currentTool={currentTool}
        textInput={textInput}
        fontSize={fontSize}
        onColorChange={setCurrentColor}
        onToolChange={setCurrentTool}
        onTextChange={setTextInput}
        onFontSizeChange={setFontSize}
        onSave={handleSave}
        onClear={handleClear}
        isSaving={isSaving}
      />

      <div className="flex items-center justify-end gap-2 px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={handleZoomOut}
          aria-label="Zoom verkleinern"
          title="Zoom verkleinern"
          className="w-9 h-9 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors text-xl leading-none flex items-center justify-center"
        >
          -
        </button>
        <button
          onClick={handleZoomIn}
          aria-label="Zoom vergrößern"
          title="Zoom vergrößern"
          className="w-9 h-9 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors text-xl leading-none flex items-center justify-center"
        >
          +
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border border-red-400 dark:border-red-700">
          {error}
        </div>
      )}

      {/* PDF & Drawing Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-800 flex items-center justify-center p-4"
      >
        {pdf ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border-2 border-gray-400 dark:border-gray-600 shadow-lg bg-white"
            />
            <canvas
              ref={drawingCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="absolute top-0 left-0 border-2 border-transparent cursor-crosshair"
            />
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">PDF wird geladen...</div>
        )}
      </div>

      {/* Seitennavi */}
      {totalPages > 0 && (
        <div className="flex gap-4 items-center justify-center p-4 bg-white dark:bg-slate-900 border-t border-gray-300 dark:border-gray-700">
          <button
            onClick={() => handlePageChange('prev')}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Vorherige
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Seite {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange('next')}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Nächste →
          </button>
        </div>
      )}
    </div>
  );
}
