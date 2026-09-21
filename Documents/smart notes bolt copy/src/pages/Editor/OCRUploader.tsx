import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, X, Loader as Loader2, CheckCircle2, AlertCircle, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import { extractTextFromImage } from '../../utils/ocr';
import { OCRResult } from '../../types';

interface OCRUploaderProps {
  onTextExtracted: (text: string) => void;
}

export default function OCRUploader({ onTextExtracted }: OCRUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lastImageData, setLastImageData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  const processImage = useCallback(
    async (source: string) => {
      abortRef.current = false;
      setProcessing(true);
      setResult(null);
      setError(null);
      setProgress(0);
      setShowDetails(false);

      try {
        const ocrResult = await extractTextFromImage(source, (p) => {
          if (!abortRef.current) {
            setProgress(p);
          }
        });

        if (abortRef.current) return;

        setProgress(100);
        setResult(ocrResult);

        if (ocrResult.text) {
          onTextExtracted(ocrResult.text);
        } else {
          setError('No text detected. Try a clearer image with better lighting.');
        }
      } catch (err) {
        if (!abortRef.current) {
          setError(err instanceof Error ? err.message : 'OCR processing failed');
          setResult({ text: '', confidence: 0, paragraphs: [], engine: 'tesseract', lowConfidenceWords: [], preprocessingApplied: [] });
        }
      } finally {
        setProcessing(false);
      }
    },
    [onTextExtracted]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, WEBP).');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('Image must be under 20MB.');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setLastImageData(dataUrl);
        processImage(dataUrl);
      };
      reader.onerror = () => setError('Failed to read image file.');
      reader.readAsDataURL(file);
    },
    [processImage]
  );

  const handleReExtract = useCallback(() => {
    if (lastImageData) {
      processImage(lastImageData);
    }
  }, [lastImageData, processImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    },
    [handleFile]
  );

  const clear = () => {
    abortRef.current = true;
    setPreview(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setLastImageData(null);
    setShowDetails(false);
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-emerald-500';
    if (conf >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 80) return 'High';
    if (conf >= 60) return 'Medium';
    return 'Low';
  };

  const hasLowConfidence = result && result.lowConfidenceWords.length > 0;
  const engineLabel = 'Tesseract OCR';

  return (
    <div onPaste={handlePaste} className="w-full">
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
        } ${preview ? 'p-4' : 'p-8'}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative">
                <img
                  src={preview}
                  alt="Uploaded"
                  className="max-h-48 mx-auto rounded-xl object-contain shadow-sm"
                />
                <button
                  onClick={clear}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/60 text-white hover:bg-slate-900/80 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {processing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3 py-2">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-sm text-slate-600 font-medium">
                      Extracting text... {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-2 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              {result && !processing && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm text-slate-600 font-medium">
                      Text extracted successfully
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className={`font-semibold ${getConfidenceColor(result.confidence)}`}>
                      {result.confidence}% confidence ({getConfidenceLabel(result.confidence)})
                    </span>
                    <span>
                      {result.paragraphs.length} paragraph{result.paragraphs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {engineLabel}
                    </span>
                  </div>

                  {hasLowConfidence && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 max-w-md">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-amber-700">
                        Some words may need review ({result.lowConfidenceWords.length} low-confidence word{result.lowConfidenceWords.length !== 1 ? 's' : ''}).
                      </span>
                    </div>
                  )}

                  {result.preprocessingApplied.length > 0 && (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      {showDetails ? 'Hide' : 'Show'} preprocessing details
                    </button>
                  )}

                  <AnimatePresence>
                    {showDetails && result.preprocessingApplied.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full overflow-hidden"
                      >
                        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 mb-1">Preprocessing applied:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.preprocessingApplied.map((step, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                {step}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleReExtract}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Re-Extract Text
                  </button>
                </motion.div>
              )}

              {error && !processing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                  <button
                    onClick={handleReExtract}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Upload Image for OCR
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Drag & drop, paste from clipboard, or click to upload
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <Image className="w-4 h-4" />
                Choose Image
              </button>
              <p className="text-xs text-slate-400 mt-3">
                Supports PNG, JPG, WEBP up to 20MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
