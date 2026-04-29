'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PDFUpload from '@/app/components/PDFUpload';
import { PDFPreviewWithLayers } from '@/app/components/PDFPreviewWithLayers';

interface Drawing {
  id: string;
  fileName: string;
  pdfName: string;
  page: number;
  createdAt: string;
  url: string;
}

interface PDFFile {
  name: string;
  uploadDate: string;
}

export default function AdminPage() {
  const router = useRouter();
  const lastChangedAtRef = useRef<string | null>(null);
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [drawings, setDrawings] = useState<Record<string, Drawing[]>>({});
  const [loading, setLoading] = useState(true);
  const [deletingDrawing, setDeletingDrawing] = useState<string | null>(null);
  const [deletingPdf, setDeletingPdf] = useState<string | null>(null);
  const [selectedPdfForPreview, setSelectedPdfForPreview] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadPasswordStatus = async () => {
    try {
      const res = await fetch('/api/edit-password');
      if (res.ok) {
        const data = await res.json();
        setIsPasswordSet(data.passwordSet);
      }
    } catch {
      // ignore
    }
  };

  const handleSavePassword = async () => {
    setPasswordStatus('saving');
    try {
      const res = await fetch('/api/edit-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: editPassword }),
      });
      if (!res.ok) throw new Error();
      setIsPasswordSet(!!editPassword);
      setEditPassword('');
      setPasswordStatus('saved');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    } catch {
      setPasswordStatus('error');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    }
  };

  const handleRemovePassword = async () => {
    if (!window.confirm('Passwort wirklich entfernen? Dann ist der Ändern-Bereich ohne Passwort zugänglich.')) return;
    setPasswordStatus('saving');
    try {
      const res = await fetch('/api/edit-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '' }),
      });
      if (!res.ok) throw new Error();
      setIsPasswordSet(false);
      setPasswordStatus('saved');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    } catch {
      setPasswordStatus('error');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Fehler beim Laden der Dateien');

      const data = await response.json();
      const pdfFiles = Array.isArray(data.files)
        ? data.files.filter((f: PDFFile) => f.name.toLowerCase().endsWith('.pdf'))
        : [];

      setFiles(pdfFiles);

      // Lade Zeichnungen für jede PDF
      const allDrawings: Record<string, Drawing[]> = {};
      for (const file of pdfFiles) {
        try {
          const drawResponse = await fetch(
            `/api/drawings/list?pdfName=${encodeURIComponent(file.name)}`
          );
          if (drawResponse.ok) {
            const drawData = await drawResponse.json();
            allDrawings[file.name] = drawData.drawings || [];
          }
        } catch (err) {
          console.error(`Fehler beim Laden der Zeichnungen für ${file.name}:`, err);
        }
      }
      setDrawings(allDrawings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadPasswordStatus();
  }, []);

  useEffect(() => {
    let ignore = false;

    fetch('/api/upload-timestamp')
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) {
          lastChangedAtRef.current = data.lastChangedAt ?? null;
        }
      })
      .catch(() => {
        // ignore
      });

    const intervalId = window.setInterval(() => {
      fetch('/api/upload-timestamp')
        .then((response) => response.json())
        .then((data) => {
          const nextTimestamp = data.lastChangedAt ?? null;
          if (!nextTimestamp || nextTimestamp === lastChangedAtRef.current || ignore) {
            return;
          }

          lastChangedAtRef.current = nextTimestamp;
          loadData();
          loadPasswordStatus();
        })
        .catch(() => {
          // ignore
        });
    }, 5000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleDeleteDrawing = async (drawingId: string, pdfName: string) => {
    if (!window.confirm('Zeichnung wirklich löschen?')) return;

    setDeletingDrawing(drawingId);
    try {
      const response = await fetch('/api/drawings/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingId, pdfName }),
      });

      if (!response.ok) throw new Error('Fehler beim Löschen');

      setDrawings((prev) => ({
        ...prev,
        [pdfName]: prev[pdfName]?.filter((d) => d.id !== drawingId) || [],
      }));

      alert('Zeichnung gelöscht');
    } catch (err) {
      alert(`Fehler: ${err}`);
    } finally {
      setDeletingDrawing(null);
    }
  };

  const handleDeletePdf = async (fileName: string) => {
    if (!window.confirm('PDF und alle zugehörigen Zeichnungen wirklich löschen?')) return;

    setDeletingPdf(fileName);
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });

      if (!response.ok) throw new Error('Fehler beim Löschen');

      setFiles((prev) => prev.filter((f) => f.name !== fileName));
      setDrawings((prev) => {
        const newDrawings = { ...prev };
        delete newDrawings[fileName];
        return newDrawings;
      });

      setSelectedPdfForPreview((prev) => (prev === fileName ? null : prev));

      alert('PDF gelöscht');
      router.refresh();
    } catch (err) {
      alert(`Fehler: ${err}`);
    } finally {
      setDeletingPdf(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Bereich
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Verwalte Dienstplan-PDFs und Zeichnungen
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
          >
            ← Zurück
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 flex gap-6 overflow-hidden">
        {/* Left Panel: Upload & Files */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-6">
          {/* Upload Section */}
          <section className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              📄 PDF hochladen
            </h2>
            <PDFUpload onUploadComplete={() => loadData()} />
          </section>

          {/* Files Section */}
          <section className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              📋 Hochgeladene Dienstpläne
            </h2>

            {loading ? (
              <p className="text-gray-600 dark:text-gray-400">Lädt...</p>
            ) : files.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">Keine PDFs vorhanden</p>
            ) : (
              <div className="space-y-4">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {file.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Hochgeladen: {new Date(file.uploadDate).toLocaleString('de-DE')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setSelectedPdfForPreview(
                              selectedPdfForPreview === file.name ? null : file.name
                            )
                          }
                          className={`px-3 py-2 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap ${
                            selectedPdfForPreview === file.name
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-400 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {selectedPdfForPreview === file.name ? '👁️ Anzeige an' : '👁️ Anzeige'}
                        </button>
                        <button
                          onClick={() => handleDeletePdf(file.name)}
                          disabled={deletingPdf === file.name}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-900 text-white rounded-lg transition-colors font-semibold whitespace-nowrap"
                        >
                          {deletingPdf === file.name ? '🗑️ Löscht...' : '🗑️ Löschen'}
                        </button>
                      </div>
                    </div>

                    {/* Zeichnungen für diese PDF */}
                    {drawings[file.name] && drawings[file.name].length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700 bg-linear-to-r from-blue-50 to-transparent dark:from-slate-700 dark:to-transparent rounded p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          ✏️ Gespeicherte Zeichnungen: {drawings[file.name].length}
                        </h4>
                        <div className="space-y-2">
                          {drawings[file.name].map((drawing) => (
                            <div
                              key={drawing.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex-1 text-sm">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  📍 Seite {drawing.page}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {new Date(drawing.createdAt).toLocaleString('de-DE')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={drawing.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors font-medium"
                                >
                                  👁️ Ansicht
                                </a>
                                <button
                                  onClick={() => handleDeleteDrawing(drawing.id, file.name)}
                                  disabled={deletingDrawing === drawing.id}
                                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-900 text-white rounded text-sm transition-colors font-medium"
                                >
                                  {deletingDrawing === drawing.id ? '...' : '🗑️ Zeichnung'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Passwort-Sektion */}
          <section className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            🔒 Ändern-Bereich Passwort
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {isPasswordSet
              ? 'Ein Passwort ist gesetzt. Der Ändern-Bereich in der Show-Ansicht ist geschützt.'
              : 'Kein Passwort gesetzt – der Ändern-Bereich ist frei zugänglich.'}
          </p>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="password"
              placeholder="Neues Passwort..."
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePassword()}
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={handleSavePassword}
              disabled={passwordStatus === 'saving' || !editPassword}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors whitespace-nowrap text-sm"
            >
              {passwordStatus === 'saving' ? 'Speichert...' : passwordStatus === 'saved' ? '✓ Gespeichert' : passwordStatus === 'error' ? '✗ Fehler' : '💾 Passwort speichern'}
            </button>
            {isPasswordSet && (
              <button
                onClick={handleRemovePassword}
                disabled={passwordStatus === 'saving'}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors whitespace-nowrap text-sm"
              >
                🔓 Passwort entfernen
              </button>
            )}
          </div>
        </section>
        </div>

        {/* Right Panel: PDF Preview with Layers */}
        {selectedPdfForPreview && (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden flex flex-col border-2 border-blue-500 dark:border-blue-600">
            <PDFPreviewWithLayers
              pdfUrl={`/api/files/${encodeURIComponent(selectedPdfForPreview)}`}
              pdfName={selectedPdfForPreview}
              drawings={drawings[selectedPdfForPreview] || []}
            />
          </div>
        )}
      </main>
    </div>
  );
}
