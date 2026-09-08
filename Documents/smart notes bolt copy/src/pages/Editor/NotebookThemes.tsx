import { motion } from 'framer-motion';
import { NotebookTheme } from '../../types';
import { Sun, Moon, BookOpen, BookA, Grid3x3, Dot } from 'lucide-react';

const themes: { id: NotebookTheme; label: string; icon: React.ElementType; preview: string }[] = [
  { id: 'white', label: 'Clean White', icon: Sun, preview: 'bg-white border-slate-200' },
  { id: 'dark', label: 'Dark Mode', icon: Moon, preview: 'bg-slate-800 border-slate-600' },
  { id: 'ruled', label: 'Ruled', icon: BookOpen, preview: 'bg-amber-50 border-amber-300' },
  { id: 'spiral', label: 'Spiral', icon: BookA, preview: 'bg-blue-50 border-blue-300' },
  { id: 'grid', label: 'Grid', icon: Grid3x3, preview: 'bg-green-50 border-green-300' },
  { id: 'dotted', label: 'Dotted', icon: Dot, preview: 'bg-slate-50 border-slate-300' },
];

interface NotebookThemeSelectorProps {
  current: NotebookTheme;
  onChange: (theme: NotebookTheme) => void;
  lineSpacing?: string;
}

export default function NotebookThemeSelector({ current, onChange }: NotebookThemeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {themes.map(t => {
        const Icon = t.icon;
        const active = current === t.id;
        return (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(t.id)}
            title={t.label}
            className={`relative w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
              active
                ? 'border-indigo-500 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-400'
            } ${t.preview}`}
          >
            <Icon className={`w-3.5 h-3.5 ${t.id === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} />
          </motion.button>
        );
      })}
    </div>
  );
}

export function getNotebookStyles(theme: NotebookTheme): string {
  const base = 'min-h-[600px] p-8 sm:p-10 outline-none transition-all duration-300 rounded-b-2xl';
  switch (theme) {
    case 'white':
      return `${base} notebook-white text-slate-900`;
    case 'dark':
      return `${base} notebook-dark text-slate-200`;
    case 'ruled':
      return `${base} notebook-ruled text-slate-900`;
    case 'spiral':
      return `${base} notebook-spiral text-slate-900`;
    case 'grid':
      return `${base} notebook-grid text-slate-900`;
    case 'dotted':
      return `${base} notebook-dotted text-slate-900`;
    default:
      return `${base} notebook-white text-slate-900`;
  }
}

// Generate dynamic inline styles for notebook patterns based on line spacing
export function getDynamicNotebookStyles(theme: NotebookTheme, lineSpacing: string): React.CSSProperties {
  const baseLH = 32; // Base line height in pixels
  const spacing = parseFloat(lineSpacing);
  const lineHeight = Math.round(baseLH * spacing);

  if (!['ruled', 'spiral', 'grid', 'dotted'].includes(theme)) {
    return {};
  }

  const styles: React.CSSProperties = {};

  switch (theme) {
    case 'ruled':
      // Horizontal lines at dynamic spacing
      styles.backgroundImage = `repeating-linear-gradient(
        transparent,
        transparent ${lineHeight - 1}px,
        #D4B896 ${lineHeight - 1}px,
        #D4B896 ${lineHeight}px
      )`;
      styles.backgroundPosition = '0 0';
      break;

    case 'spiral':
      // Spiral holes + horizontal lines with dynamic spacing
      styles.backgroundImage = `
        radial-gradient(circle at 24px ${lineHeight / 2}px, transparent 8px, transparent 9px, #8B5CF6 9px, #8B5CF6 10px, transparent 10px),
        repeating-linear-gradient(
          transparent,
          transparent ${lineHeight - 1}px,
          #93C5FD ${lineHeight - 1}px,
          #93C5FD ${lineHeight}px
        )
      `;
      styles.backgroundPosition = '0 0';
      styles.backgroundSize = `100% ${lineHeight}px, 100% ${lineHeight}px`;
      styles.paddingLeft = '56px';
      break;

    case 'grid':
      // Both horizontal and vertical lines
      styles.backgroundImage = `
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent ${lineHeight - 1}px,
          #86EFAC ${lineHeight - 1}px,
          #86EFAC ${lineHeight}px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent ${lineHeight - 1}px,
          #86EFAC ${lineHeight - 1}px,
          #86EFAC ${lineHeight}px
        )
      `;
      styles.backgroundPosition = '0 0';
      break;

    case 'dotted':
      // Dot grid with dynamic spacing
      styles.backgroundSize = `${lineHeight}px ${lineHeight}px`;
      styles.backgroundPosition = `${lineHeight / 2}px ${lineHeight / 2}px`;
      break;
  }

  return styles;
}
