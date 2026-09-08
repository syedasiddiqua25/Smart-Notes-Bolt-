import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  Copy,
  Pencil,
  FileText,
  Clock,
  MoreVertical,
  X,
  BookOpen,
} from 'lucide-react';
import { getNotes, deleteNote, saveNote, generateId } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { Note, SortOption, NotebookTheme } from '../../types';

const themeLabels: Record<NotebookTheme, string> = {
  white: 'White',
  dark: 'Dark',
  ruled: 'Ruled',
  spiral: 'Spiral',
  grid: 'Grid',
  dotted: 'Dotted',
};

const themeDots: Record<NotebookTheme, string> = {
  white: 'bg-white border border-slate-300',
  dark: 'bg-slate-800',
  ruled: 'bg-amber-100',
  spiral: 'bg-blue-100',
  grid: 'bg-green-100',
  dotted: 'bg-slate-100',
};

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>(getNotes);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { addToast } = useToast();

  const filtered = useMemo(() => {
    let result = notes.filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase())
    );
    result.sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'date-desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    return result;
  }, [notes, search, sort]);

  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [notes]
  );

  const refresh = () => setNotes(getNotes());

  const handleDelete = (id: string) => {
    deleteNote(id);
    refresh();
    setMenuOpen(null);
    setMenuPos(null);
    addToast('Note deleted', 'info');
  };

  const handleDuplicate = (note: Note) => {
    const dup: Note = {
      ...note,
      id: generateId(),
      title: `${note.title} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNote(dup);
    refresh();
    setMenuOpen(null);
    setMenuPos(null);
    addToast('Note duplicated', 'success');
  };

  const handleRename = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && renameValue.trim()) {
      saveNote({ ...note, title: renameValue.trim(), updatedAt: new Date().toISOString() });
      refresh();
      addToast('Note renamed', 'success');
    }
    setRenaming(null);
  };

  const handleCreate = () => {
    const newNote: Note = {
      id: generateId(),
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: 'white',
      wordCount: 0,
    };
    saveNote(newNote);
    refresh();
    addToast('New note created', 'success');
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="pt-24 pb-12 min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Notes</h1>
            <p className="text-slate-500 mt-1">{notes.length} notes</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Note
          </motion.button>
        </div>

        {/* Recent Notes */}
        {recent.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Recent
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map(note => (
                <motion.div
                  key={note.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to={`/editor?id=${note.id}`}
                    className="block p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${themeDots[note.theme]}`} />
                      <h3 className="font-semibold text-slate-900 truncate">{note.title}</h3>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {note.wordCount} words
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>

        {/* Notes Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {notes.length === 0
                ? 'Create your first note to get started'
                : 'Try a different search term'}
            </p>
            {notes.length === 0 && (
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map(note => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="group relative p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${themeDots[note.theme]}`} />
                      {renaming === note.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(note.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(note.id);
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          className="text-sm font-semibold text-slate-900 bg-transparent outline-none border-b border-indigo-300 flex-1 min-w-0"
                        />
                      ) : (
                        <Link
                          to={`/editor?id=${note.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                        >
                          {note.title}
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (menuOpen === note.id) {
                            setMenuOpen(null);
                            setMenuPos(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                            setMenuOpen(note.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Link to={`/editor?id=${note.id}`}>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                      {note.content
                        ? note.content.replace(/<[^>]+>/g, '').slice(0, 120)
                        : 'Empty note'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{note.wordCount} words</span>
                      <span>{themeLabels[note.theme]}</span>
                      <span>{formatDate(note.updatedAt)}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Portal-rendered dropdown menu - rendered outside card overflow context */}
      <AnimatePresence>
        {menuOpen && menuPos && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => { setMenuOpen(null); setMenuPos(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="fixed z-50 w-48 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setRenaming(menuOpen);
                  const note = notes.find(n => n.id === menuOpen);
                  if (note) setRenameValue(note.title);
                  setMenuOpen(null);
                  setMenuPos(null);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const note = notes.find(n => n.id === menuOpen);
                  if (note) handleDuplicate(note);
                  setMenuOpen(null);
                  setMenuPos(null);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (menuOpen) handleDelete(menuOpen);
                  setMenuOpen(null);
                  setMenuPos(null);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
