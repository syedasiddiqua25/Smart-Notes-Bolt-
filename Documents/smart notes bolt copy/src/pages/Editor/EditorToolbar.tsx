import { useRef, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  RemoveFormatting,
  Type,
  Highlighter,
  Eraser,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorToolbarProps {
  onCommand: (command: string, value?: string) => void;
  fontFamily: string;
  fontSize: string;
  lineSpacing: string;
  onFontFamilyChange: (font: string) => void;
  onFontSizeChange: (size: string) => void;
  onLineSpacingChange: (spacing: string) => void;
  onTextColorChange: (color: string) => void;
  onResetTextColor: () => void;
  onHighlightChange: (color: string) => void;
  onRemoveHighlight: () => void;
  onDisableHighlight: () => void;
  onRemoveFormat: () => void;
  highlightActive: boolean;
}

const fontFamilies = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: '── Handwriting ──', value: '', disabled: true },
  { label: 'Caveat', value: 'Caveat' },
  { label: 'Indie Flower', value: 'Indie Flower' },
  { label: 'Kalam', value: 'Kalam' },
  { label: 'Patrick Hand', value: 'Patrick Hand' },
];

const fontSizes = [
  { label: '10', value: '1' },
  { label: '12', value: '2' },
  { label: '14', value: '3' },
  { label: '16', value: '4' },
  { label: '18', value: '5' },
  { label: '24', value: '6' },
  { label: '32', value: '7' },
];

const lineSpacings = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' },
];

interface ToolbarButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  active?: boolean;
}

const ToolbarButton = ({ onClick, children, title, active }: ToolbarButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    title={title}
    type="button"
    className={`p-2 rounded-lg transition-colors ${
      active
        ? 'bg-indigo-100 text-indigo-600'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {children}
  </motion.button>
);

const Divider = () => <div className="w-px h-6 bg-slate-200 mx-0.5" />;

export default function EditorToolbar({
  onCommand,
  fontFamily,
  fontSize,
  lineSpacing,
  onFontFamilyChange,
  onFontSizeChange,
  onLineSpacingChange,
  onTextColorChange,
  onResetTextColor,
  onHighlightChange,
  onRemoveHighlight,
  onDisableHighlight,
  onRemoveFormat,
  highlightActive,
}: EditorToolbarProps) {
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLInputElement>(null);
  const textColorDisplay = useRef<HTMLDivElement>(null);
  const highlightDisplay = useRef<HTMLDivElement>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);

  const handleFontFamily = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) return;
      onFontFamilyChange(val);
    },
    [onFontFamilyChange]
  );

  const handleFontSize = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFontSizeChange(e.target.value);
    },
    [onFontSizeChange]
  );

  const handleLineSpacing = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onLineSpacingChange(e.target.value);
    },
    [onLineSpacingChange]
  );

  const handleTextColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      onTextColorChange(color);
      if (textColorDisplay.current) textColorDisplay.current.style.backgroundColor = color;
      setShowTextColorMenu(false);
    },
    [onTextColorChange]
  );

  const handleHighlight = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value;
      onHighlightChange(color);
      if (highlightDisplay.current) highlightDisplay.current.style.backgroundColor = color;
      setShowHighlightMenu(false);
    },
    [onHighlightChange]
  );

  const presetHighlightColors = [
    '#FEF08A', // Yellow
    '#86EFAC', // Green
    '#93C5FD', // Blue
    '#FCA5A5', // Red
    '#D8B4FE', // Purple
    '#FDBA74', // Orange
    'transparent', // Remove
  ];

  const presetTextColors = [
    '#000000', // Black
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Orange
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-white border-b border-slate-200 rounded-t-2xl">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => onCommand('undo')} title="Undo (Ctrl+Z)">
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('redo')} title="Redo (Ctrl+Y)">
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Font Family */}
      <select
        value={fontFamily}
        onChange={handleFontFamily}
        title="Font Family"
        className="h-8 px-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 max-w-[130px]"
      >
        {fontFamilies.map(f => (
          <option key={f.label} value={f.value} disabled={f.disabled} style={{ fontFamily: f.value || undefined }}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <select
        value={fontSize}
        onChange={handleFontSize}
        title="Font Size"
        className="h-8 px-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
      >
        {fontSizes.map(s => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Line Spacing */}
      <select
        value={lineSpacing}
        onChange={handleLineSpacing}
        title="Line Spacing"
        className="h-8 px-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
      >
        {lineSpacings.map(s => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Divider />

      {/* Text Formatting */}
      <ToolbarButton onClick={() => onCommand('bold')} title="Bold (Ctrl+B)">
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('italic')} title="Italic (Ctrl+I)">
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('underline')} title="Underline (Ctrl+U)">
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('strikeThrough')} title="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton onClick={() => onCommand('justifyLeft')} title="Align Left">
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('justifyCenter')} title="Align Center">
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('justifyRight')} title="Align Right">
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('justifyFull')} title="Justify">
        <AlignJustify className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton onClick={() => onCommand('insertUnorderedList')} title="Bullet List">
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onCommand('insertOrderedList')} title="Numbered List">
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Text Color with menu */}
      <div className="relative flex items-center">
        <ToolbarButton
          onClick={() => setShowTextColorMenu(!showTextColorMenu)}
          title="Text Color"
        >
          <div className="flex flex-col items-center">
            <Type className="w-4 h-4" />
            <div ref={textColorDisplay} className="w-4 h-1 rounded-full bg-slate-900 mt-0.5" />
          </div>
        </ToolbarButton>
        <input
          ref={textColorRef}
          type="color"
          defaultValue="#000000"
          onChange={handleTextColor}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />

        {/* Text Color menu */}
        <AnimatePresence>
          {showTextColorMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg border border-slate-200 shadow-lg z-30"
            >
              <div className="flex gap-1 mb-2">
                {presetTextColors.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      onTextColorChange(color);
                      if (textColorDisplay.current) textColorDisplay.current.style.backgroundColor = color;
                      setShowTextColorMenu(false);
                    }}
                    className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => textColorRef.current?.click()}
                  className="flex-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Custom
                </button>
                <button
                  onClick={() => {
                    onResetTextColor();
                    if (textColorDisplay.current) textColorDisplay.current.style.backgroundColor = '#000000';
                    setShowTextColorMenu(false);
                  }}
                  className="flex-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Highlight Color with menu */}
      <div className="relative flex items-center">
        <ToolbarButton
          onClick={() => {
            if (highlightActive) {
              // If highlight is active, clicking again turns it off
              onDisableHighlight();
            } else {
              setShowHighlightMenu(!showHighlightMenu);
            }
          }}
          title={highlightActive ? 'Turn off highlighter' : 'Highlight Color'}
          active={highlightActive}
        >
          <div className="flex flex-col items-center">
            <Highlighter className="w-4 h-4" />
            <div ref={highlightDisplay} className={`w-4 h-1 rounded-full mt-0.5 transition-colors ${highlightActive ? 'bg-yellow-400' : 'bg-slate-300'}`} />
          </div>
        </ToolbarButton>
        <input
          ref={highlightRef}
          type="color"
          defaultValue="#FEF08A"
          onChange={handleHighlight}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />

        {/* Highlight menu */}
        <AnimatePresence>
          {showHighlightMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg border border-slate-200 shadow-lg z-30 min-w-[180px]"
            >
              <div className="text-xs text-slate-400 mb-1.5">Highlight Colors</div>
              <div className="flex gap-1 mb-2">
                {presetHighlightColors.slice(0, -1).map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      onHighlightChange(color);
                      if (highlightDisplay.current) highlightDisplay.current.style.backgroundColor = color;
                      setShowHighlightMenu(false);
                    }}
                    className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="border-t border-slate-100 pt-2 mt-2 flex flex-col gap-1">
                <button
                  onClick={() => highlightRef.current?.click()}
                  className="w-full px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded text-left"
                >
                  Custom Color...
                </button>
                <button
                  onClick={() => {
                    onRemoveHighlight();
                    setShowHighlightMenu(false);
                  }}
                  className="w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded text-left flex items-center gap-1.5"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Remove Highlight from Selection
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Divider />

      {/* Clear Formatting */}
      <ToolbarButton onClick={onRemoveFormat} title="Clear Formatting">
        <RemoveFormatting className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}
