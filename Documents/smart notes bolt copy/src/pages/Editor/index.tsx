import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Sparkles,
  Download,
  Search,
  Replace,
  BookOpen,
  Type,
  Clock,
  Hash,
  X,
} from 'lucide-react';

import EditorToolbar from './EditorToolbar';
import NotebookThemeSelector, { getNotebookStyles, getDynamicNotebookStyles } from './NotebookThemes';
import OCRUploader from './OCRUploader';
import SummaryPanel from './SummaryPanel';
import { useToast } from '../../context/ToastContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { saveNote, getNote, generateId } from '../../utils/storage';
import { exportNote } from '../../utils/export';
import { NotebookTheme, ExportFormat } from '../../types';

// HTML font size mapping
const fontSizeMap: Record<string, string> = {
  '1': '10px',
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
  '6': '32px',
  '7': '48px',
};

export default function Editor() {
  const [params] = useSearchParams();
  const editId = params.get('id');
  const { addToast } = useToast();

  const [title, setTitle] = useState('Untitled Note');
  const [theme, setTheme] = useState<NotebookTheme>('white');
  const [fontSize, setFontSize] = useState('4');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [lineSpacing, setLineSpacing] = useState('1.0');
  const [showOCR, setShowOCR] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [noteId, setNoteId] = useState(editId || generateId());

  // Active formatting state for new typing
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [highlightActive, setHighlightActive] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Load existing note
  useEffect(() => {
    if (editId) {
      const note = getNote(editId);
      if (note) {
        setTitle(note.title);
        setTheme(note.theme);
        setNoteId(note.id);
        const frame = requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = note.content;
            updateStats();
          }
        });
        return () => cancelAnimationFrame(frame);
      }
    }
  }, [editId]);

  // Track font at cursor position to update the toolbar select
  useEffect(() => {
    const handler = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const node = selection.anchorNode;
      if (!node) return;

      // Walk up the DOM to find the nearest font-face
      let element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
      while (element && element !== editorRef.current) {
        // Check for <font face="..."> tag (what execCommand('fontName') creates)
        const faceAttr = element.getAttribute('face');
        if (faceAttr) {
          const normalized = faceAttr.replace(/['"]/g, '').split(',')[0].trim();
          if (normalized !== fontFamily) {
            setFontFamily(normalized);
          }
          return;
        }
        // Check inline style font-family
        const styleFont = (element as HTMLElement).style?.fontFamily;
        if (styleFont) {
          const normalized = styleFont.replace(/['"]/g, '').split(',')[0].trim();
          if (normalized !== fontFamily) {
            setFontFamily(normalized);
          }
          return;
        }
        element = element.parentElement;
      }
    };

    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [fontFamily]);
  useEffect(() => {
    if (!showExport) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExport]);

  // Apply highlight on keypress for new text when highlight mode is active
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Turn off highlight on Enter (Google Docs behavior)
      if (e.key === 'Enter' && highlightActive) {
        setHighlightActive(false);
        return;
      }

      // Apply highlight to new characters when active
      if (highlightActive && activeHighlight) {
        document.execCommand('hiliteColor', false, activeHighlight);
      }
    };

    editor.addEventListener('keydown', handleKeyDown);
    return () => editor.removeEventListener('keydown', handleKeyDown);
  }, [activeHighlight, highlightActive]);

  const updateStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    setCharCount(text.length);
    setReadingTime(Math.max(1, Math.ceil(words.length / 200)));
  }, []);

  const handleCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateStats();
  }, [updateStats]);

  const handleFontFamilyChange = useCallback((font: string) => {
    setFontFamily(font);
    editorRef.current?.focus();
    document.execCommand('fontName', false, font);
    updateStats();
  }, [updateStats]);

  const handleFontSizeChange = useCallback((size: string) => {
    setFontSize(size);
    editorRef.current?.focus();
    // Apply to selection or set as default
    document.execCommand('fontSize', false, size);
  }, []);

  const handleLineSpacingChange = useCallback((spacing: string) => {
    setLineSpacing(spacing);
  }, []);

  const handleTextColorChange = useCallback((color: string) => {
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
  }, []);

  const handleResetTextColor = useCallback(() => {
    editorRef.current?.focus();
    document.execCommand('foreColor', false, '#000000');
  }, []);

  // Apply highlight to selected text, or enable for future typing
  const handleHighlightChange = useCallback((color: string) => {
    setActiveHighlight(color);
    editorRef.current?.focus();

    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;

    if (hasSelection) {
      // Apply highlight to the selected text only
      document.execCommand('hiliteColor', false, color);
      // Turn off continuous mode after applying to selection
      setHighlightActive(false);
    } else {
      // No selection - turn on highlighter for future typing
      setHighlightActive(true);
    }
    updateStats();
  }, [updateStats]);

  // Remove highlight from selected text by unwrapping the highlight spans
  const handleRemoveHighlight = useCallback(() => {
    setActiveHighlight(null);
    setHighlightActive(false);

    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // Get all highlight spans in the editor
      const spans = editor.querySelectorAll('span');
      const range = selection.getRangeAt(0);

      spans.forEach(span => {
        const bg = span.style.backgroundColor;
        if (bg && bg !== 'transparent' && range.intersectsNode(span)) {
          // Unwrap: move children out, remove the span
          const parent = span.parentNode;
          if (parent) {
            while (span.firstChild) {
              parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
          }
        }
      });
    }

    updateStats();
    addToast('Highlight removed', 'info');
  }, [addToast, updateStats]);

  // Toggle highlight mode off
  const handleDisableHighlight = useCallback(() => {
    setHighlightActive(false);
    addToast('Highlight mode turned off', 'info');
  }, [addToast]);

  // Clear all formatting
  const handleRemoveFormat = useCallback(() => {
    setActiveHighlight(null);
    setHighlightActive(false);
    editorRef.current?.focus();
    document.execCommand('removeFormat', false);
    updateStats();
    addToast('Formatting cleared', 'info');
  }, [addToast, updateStats]);

  const handleTextExtracted = useCallback((text: string) => {
    if (editorRef.current) {
      const paragraphs = text.split(/\n\n+/);
      paragraphs.forEach(para => {
        const p = document.createElement('p');
        const lines = para.split('\n');
        lines.forEach((line, i) => {
          p.appendChild(document.createTextNode(line));
          if (i < lines.length - 1) {
            p.appendChild(document.createElement('br'));
          }
        });
        editorRef.current!.appendChild(p);
      });
      updateStats();
      addToast('Text extracted and added to editor', 'success');
    }
  }, [addToast, updateStats]);

  const handleSave = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    setSaving(true);
    saveNote({
      id: noteId,
      title,
      content,
      createdAt: editId ? getNote(editId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme,
      wordCount: words,
    });
    setLastSaved(new Date());
    setSaving(false);
  }, [noteId, title, editId, theme]);

  useAutoSave(handleSave, 10000);

  const handleExport = async (format: ExportFormat, includeStyle: boolean) => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    try {
      await exportNote(title, content, text, format, theme, includeStyle, {
        fontFamily: 'Inter',
        fontSize: fontSizeMap[fontSize] || '16px',
        lineSpacing,
      });
      addToast(`Note exported as ${format.toUpperCase()}`, 'success');
      setShowExport(false);
    } catch {
      addToast('Export failed. Please try again.', 'error');
    }
  };

  const handleSearch = () => {
    if (!searchText) return;
    if (editorRef.current) {
      const marks = editorRef.current.querySelectorAll('mark.search-highlight');
      marks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent || ''), m);
          parent.normalize();
        }
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.find === 'function') {
      w.find(searchText, false, false, true);
    }
  };

  const handleReplace = () => {
    if (!editorRef.current || !searchText) return;
    const content = editorRef.current.innerText || '';
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    if (!matches || matches.length === 0) {
      addToast(`No matches found for "${searchText}"`, 'info');
      return;
    }
    const newContent = content.replace(regex, replaceText);
    editorRef.current.innerText = newContent;
    updateStats();
    addToast(`Replaced ${matches.length} occurrence${matches.length > 1 ? 's' : ''} of "${searchText}"`, 'info');
  };

  // Calculate dynamic line height for notebook themes
  const baseLineHeight = 32;
  const lineHeightPx = baseLineHeight * parseFloat(lineSpacing);

  const formatLastSaved = () => {
    if (!lastSaved) return 'Not saved yet';
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 5000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="pt-20 pb-8 min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-2xl font-bold text-slate-900 bg-transparent border-none outline-none w-full placeholder-slate-400"
              placeholder="Note title..."
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <NotebookThemeSelector current={theme} onChange={setTheme} lineSpacing={lineSpacing} />
            <div className="w-px h-6 bg-slate-200" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowOCR(!showOCR)}
              title="OCR Image Upload"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showOCR ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSearch(!showSearch)}
              title="Search & Replace"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showSearch ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSummary(!showSummary)}
              title="AI Summary"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showSummary ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              title="Save Note"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
            </motion.button>
            <div className="relative" ref={exportRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExport(!showExport)}
                title="Export Note"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" />
              </motion.button>
              <AnimatePresence>
                {showExport && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden"
                  >
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      With Style
                    </div>
                    {(['pdf', 'docx', 'txt'] as ExportFormat[]).map(format => (
                      <button
                        key={format}
                        onClick={() => handleExport(format, true)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-4 h-4 text-indigo-500" />
                        {format.toUpperCase()}
                      </button>
                    ))}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-t border-slate-100">
                      Plain Text
                    </div>
                    {(['pdf', 'docx', 'txt'] as ExportFormat[]).map(format => (
                      <button
                        key={`plain-${format}`}
                        onClick={() => handleExport(format, false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-4 h-4 text-slate-400" />
                        Plain {format.toUpperCase()}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search/Replace Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Find text..."
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700"
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Replace className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={e => setReplaceText(e.target.value)}
                    placeholder="Replace with..."
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSearch}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    Find
                  </button>
                  <button
                    onClick={handleReplace}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 transition-colors"
                  >
                    Replace All
                  </button>
                  <button
                    onClick={() => setShowSearch(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OCR Upload */}
        <AnimatePresence>
          {showOCR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 overflow-hidden"
            >
              <OCRUploader onTextExtracted={handleTextExtracted} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200/60">
          <EditorToolbar
            onCommand={handleCommand}
            fontFamily={fontFamily}
            fontSize={fontSize}
            lineSpacing={lineSpacing}
            onFontFamilyChange={handleFontFamilyChange}
            onFontSizeChange={handleFontSizeChange}
            onLineSpacingChange={handleLineSpacingChange}
            onTextColorChange={handleTextColorChange}
            onResetTextColor={handleResetTextColor}
            onHighlightChange={handleHighlightChange}
            onRemoveHighlight={handleRemoveHighlight}
            onDisableHighlight={handleDisableHighlight}
            onRemoveFormat={handleRemoveFormat}
            highlightActive={highlightActive}
          />

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={updateStats}
            onPaste={() => setTimeout(updateStats, 50)}
            className={getNotebookStyles(theme)}
            style={{
              lineHeight: `${lineHeightPx}px`,
              ...getDynamicNotebookStyles(theme, lineSpacing),
            }}
            data-placeholder="Start typing or upload an image to extract text..."
          />
        </div>

        {/* Status Bar */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {wordCount} words
            </span>
            <span className="flex items-center gap-1">
              <Type className="w-3 h-3" />
              {charCount} chars
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime} min read
            </span>
            <span className="flex items-center gap-1">
              Line: {lineSpacing}
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <Save className={`w-3 h-3 ${saving ? 'animate-pulse text-indigo-500' : ''}`} />
            {saving ? 'Saving...' : `Saved ${formatLastSaved()}`}
          </span>
        </div>
      </div>

      {/* Summary Panel */}
      <SummaryPanel
        content={editorRef.current?.innerText || ''}
        open={showSummary}
        onClose={() => setShowSummary(false)}
      />
    </div>
  );
}
