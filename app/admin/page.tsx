import Link from "next/link";
import PDFUpload from "@/app/components/PDFUpload";

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dienstplan Ablage und Ansicht
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
          >
            ← Zurück
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6">
        {/* PDF Upload */}
        <section className="mb-8">
          <PDFUpload />
        </section>

        {/* Admin-Funktionen */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Admin-Funktionen
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400">
              Hier können Administrative Aufgaben durchgeführt werden...
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
