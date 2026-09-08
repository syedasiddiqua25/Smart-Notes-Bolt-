export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  theme: NotebookTheme;
  wordCount: number;
}

export type NotebookTheme = 'white' | 'dark' | 'ruled' | 'spiral' | 'grid' | 'dotted';

export interface OCRResult {
  text: string;
  confidence: number;
  paragraphs: string[];
}

export interface SummaryResult {
  short: string;
  medium: string;
  keyPoints: string[];
}

export interface EditorState {
  content: string;
  theme: NotebookTheme;
  wordCount: number;
  charCount: number;
  readingTime: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ExportFormat = 'pdf' | 'docx' | 'txt';

export type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
