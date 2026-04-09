'use client';

import React from 'react';

export type DrawingColor = '#000000' | '#FF0000' | '#00AA00' | '#0000FF' | '#FFAA00';
export type DrawingTool = 'brush' | 'eraser' | 'text';

interface DrawingToolbarProps {
  currentColor: DrawingColor;
  currentTool: DrawingTool;
  textInput: string;
  fontSize: number;
  onColorChange: (color: DrawingColor) => void;
  onToolChange: (tool: DrawingTool) => void;
  onTextChange: (text: string) => void;
  onFontSizeChange: (size: number) => void;
  onSave: () => Promise<void>;
  onClear: () => void;
  isSaving: boolean;
}

const COLORS: DrawingColor[] = ['#000000', '#FF0000', '#00AA00', '#0000FF', '#FFAA00'];
const COLOR_NAMES: Record<DrawingColor, string> = {
  '#000000': 'Schwarz',
  '#FF0000': 'Rot',
  '#00AA00': 'Grün',
  '#0000FF': 'Blau',
  '#FFAA00': 'Orange',
};

export function DrawingToolbar({
  currentColor,
  currentTool,
  textInput,
  fontSize,
  onColorChange,
  onToolChange,
  onTextChange,
  onFontSizeChange,
  onSave,
  onClear,
  isSaving,
}: DrawingToolbarProps) {
  return (
    <div className="flex gap-4 items-center justify-center p-4 bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-gray-700 flex-wrap">
      {/* Farb-Buttons */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Farben:</span>
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            title={COLOR_NAMES[color]}
            className={`w-8 h-8 rounded-lg border-2 transition-transform ${
              currentTool === 'brush' && currentColor === color
                ? 'border-gray-800 dark:border-white scale-110'
                : 'border-gray-400 dark:border-gray-600 hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Tool-Buttons */}
      <div className="flex gap-2 items-center border-l border-gray-300 dark:border-gray-700 pl-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tools:</span>
        <button
          onClick={() => onToolChange('brush')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentTool === 'brush'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          🖌️ Pinsel
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentTool === 'eraser'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          🧹 Radierer
        </button>
        <button
          onClick={() => onToolChange('text')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentTool === 'text'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          ✏️ Text
        </button>
      </div>

      {/* Text Input & Font Size */}
      {currentTool === 'text' && (
        <div className="flex gap-2 items-center border-l border-gray-300 dark:border-gray-700 pl-4">
          <input
            type="text"
            placeholder="Text eingeben..."
            value={textInput}
            onChange={(e) => onTextChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm w-32"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Größe:
            </label>
            <input
              type="range"
              min="12"
              max="72"
              value={fontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
              className="w-28 h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-8">
              {fontSize}
            </span>
          </div>
        </div>
      )}

      {/* Action-Buttons */}
      <div className="flex gap-2 items-center border-l border-gray-300 dark:border-gray-700 pl-4">
        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          🗑️ Löschen
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
            isSaving
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isSaving ? '💾 Speichert...' : '💾 Speichern'}
        </button>
      </div>
    </div>
  );
}
