"use client";

import { useEffect, useState } from "react";

type UploadedFile = {
  name: string;
  size: number;
  modifiedAt: string;
  url: string;
};

export default function PDFUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [serverFiles, setServerFiles] = useState<UploadedFile[]>([]);

  const loadServerFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch("/api/upload-pdf", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Dateiliste konnte nicht geladen werden",
        });
        return;
      }

      setServerFiles(data.files || []);
    } catch {
      setMessage({
        type: "error",
        text: "Dateiliste konnte nicht geladen werden",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadServerFiles();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setMessage({ type: "", text: "" });
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage({ type: "error", text: "Bitte wähle mindestens eine PDF-Datei" });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();

    // Alle Dateien hinzufügen
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Nur PDF-Dateien erlauben
      if (file.type !== "application/pdf") {
        setMessage({
          type: "error",
          text: `${file.name} ist keine PDF-Datei. Nur PDFs werden akzeptiert.`,
        });
        setIsLoading(false);
        return;
      }

      formData.append("files", file);
    }

    try {
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Upload fehlgeschlagen" });
      } else {
        setMessage({
          type: "success",
          text: `${selectedFiles.length} Datei(en) erfolgreich hochgeladen!`,
        });
        setSelectedFiles(null);
        // File Input zurücksetzen
        const input = document.getElementById("pdfInput") as HTMLInputElement;
        if (input) input.value = "";
        await loadServerFiles();
      }
    } catch {
      setMessage({
        type: "error",
        text: "Fehler beim Upload. Bitte versuche es erneut.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        📄 PDF-Dateien verwalten
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Dateien auf dem Server</h4>
            <button
              type="button"
              onClick={loadServerFiles}
              disabled={isLoadingFiles}
              className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-60"
            >
              Aktualisieren
            </button>
          </div>

          {isLoadingFiles ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Lade Dateiliste...</p>
          ) : serverFiles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine PDF-Dateien auf dem Server.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {serverFiles.map((file) => (
                <li key={file.name} className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-700 dark:text-blue-300 hover:underline break-all"
                  >
                    {file.name}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <form onSubmit={handleUpload} className="lg:col-span-2 space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer">
            <input
              id="pdfInput"
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="pdfInput" className="cursor-pointer">
              <div className="space-y-2">
                <div className="text-3xl">📁</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Klick zum Auswählen oder ziehe PDF-Dateien hierher
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Du kannst mehrere PDFs gleichzeitig auswählen
                </p>
              </div>
            </label>
          </div>

          {/* Ausgewählte Dateien anzeigen */}
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Ausgewählte Dateien ({selectedFiles.length}):
              </p>
              <ul className="space-y-1">
                {Array.from(selectedFiles).map((file, idx) => (
                  <li key={idx} className="text-sm text-blue-800 dark:text-blue-300">
                    ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meldungen */}
          {message.text && (
            <div
              className={`rounded p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
              }`}
            >
              {message.type === "success" ? "✓ " : "✕ "}
              {message.text}
            </div>
          )}

          {/* Upload Button */}
          <button
            type="submit"
            disabled={isLoading || !selectedFiles || selectedFiles.length === 0}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? "Wird hochgeladen..." : "Hochladen"}
          </button>
        </form>
      </div>
    </div>
  );
}
