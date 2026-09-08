import { Note } from '../types';

const STORAGE_KEY = 'smartnotes_notes';

export function getNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function saveNote(note: Note): void {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  saveNotes(notes);
}

export function deleteNote(id: string): void {
  const notes = getNotes().filter(n => n.id !== id);
  saveNotes(notes);
}

export function getNote(id: string): Note | undefined {
  return getNotes().find(n => n.id === id);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
