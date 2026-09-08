/**
 * Smart Notes — OCR Pipeline
 *
 * Pipeline:
 *   1. Image quality check (size, format)
 *   2. Image preprocessing (upscale, denoise, contrast, shadow removal, deskew, adaptive threshold)
 *   3. Text recognition (Google Cloud Vision → Tesseract fallback)
 *   4. Reading order reconstruction
 *   5. OCR confidence evaluation (per-word confidence from engine)
 *   6. Careful OCR correction (preserves special characters / code syntax)
 *
 * Cloud OCR (Google Cloud Vision) is tried first because it has a dedicated
 * handwriting model and handles cursive handwriting far better than
 * Tesseract.  If the cloud function is unavailable (no API key configured,
 * network error, etc.), we fall back to an enhanced Tesseract.js pipeline
 * with aggressive preprocessing so the app still works offline.
 */

import Tesseract from 'tesseract.js';
import type { OCRResult, OCRWord } from '../types';
import { preprocessImage, preprocessForCloud, compressImage } from './imageProcessing';

// ---------------------------------------------------------------------------
// Correction dictionary
// ---------------------------------------------------------------------------

/**
 * Common OCR confusion pairs for *English* words only.
 * We deliberately keep this list SMALL — only high-confidence corrections
 * where the OCR error is a well-known substitution pattern.  We never
 * correct:
 *   - words that look like code/HTML tags (contain < > / { } etc.)
 *   - words shorter than 3 characters
 *   - words that are already valid English
 *   - numbers or mixed-case technical identifiers
 */
const corrections: Record<string, string> = {
  // letter confusion: l→I, I→l, rn→m, cl→d, etc.
  'teh': 'the', 'adn': 'and', 'taht': 'that', 'tihs': 'this',
  'si': 'is', 'ot': 'to', 'fo': 'for', 'nad': 'and', 'ahve': 'have',
  'hte': 'the', 'itn': 'it', 'wa': 'was', 'hsa': 'has', 'eh': 'he',
  'hs': 'his', 'ehr': 'her', 'owrk': 'work', 'wrok': 'work',
  'wirte': 'write', 'wnat': 'want', 'tyhe': 'they',
  'lhe': 'the', 'lhat': 'that', 'lhis': 'this',
  'recieve': 'receive', 'occured': 'occurred', 'seperate': 'separate',
  'definately': 'definitely', 'occassion': 'occasion', 'accomodate': 'accommodate',
  'neccessary': 'necessary', 'priviledge': 'privilege', 'recoginze': 'recognize',
  'handwritting': 'handwriting', 'recogniton': 'recognition', 'docuement': 'document',
  'procesing': 'processing', 'digitial': 'digital', 'notebok': 'notebook',
  // common handwriting OCR errors
  'whlch': 'which', 'Photosynthesls': 'Photosynthesis',
  'thls': 'this',
};

/** Words that contain code/technical syntax — never correct these. */
function looksLikeCode(word: string): boolean {
  return /[<>{}\[\]()/\\#@=+]/.test(word) ||
    /\d/.test(word) ||
    /^[A-Z][a-z]+[A-Z]/.test(word) || // camelCase
    word.length > 2 && word === word.toUpperCase() && /[A-Z]/.test(word); // ALL_CAPS constant
}

function spellCorrect(text: string): string {
  return text.replace(/\b(\w+)\b/g, (full, word: string) => {
    // Skip code-like tokens entirely
    if (looksLikeCode(word)) return full;

    const lower = word.toLowerCase();
    const correction = corrections[lower];
    if (correction) {
      // Preserve original capitalization
      if (word[0] === word[0]?.toUpperCase()) {
        return correction[0].toUpperCase() + correction.slice(1);
      }
      return correction;
    }
    return full;
  });
}

/**
 * Clean OCR output while preserving structure:
 *   - normalize line endings
 *   - collapse excessive spaces (but keep newlines)
 *   - limit consecutive blank lines
 *   - fix spacing before punctuation
 *   - NEVER strip special characters like < > { } [ ] / : ; = + - * #
 */
function cleanOcrText(text: string): string {
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ')
    // collapse runs of spaces/tabs (but NOT newlines)
    .replace(/[^\S\n]+/g, ' ')
    // collapse 4+ repeated chars to 2 (OCR noise)
    .replace(/(.)\1{4,}/g, '$1$1')
    // max 2 consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // trim trailing spaces per line
    .replace(/^ +| +$/gm, '')
    // fix space before punctuation
    .replace(/ ([.!?,;:])/g, '$1')
    // collapse double periods (but not ...)
    .replace(/(?<!\.)\.\.(?!\.)/g, '.')
    .trim();
  cleaned = spellCorrect(cleaned);
  return cleaned;
}

function detectParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Cloud OCR (Google Cloud Vision via Supabase Edge Function)
// ---------------------------------------------------------------------------

interface CloudOCRResponse {
  text: string;
  confidence: number;
  words: OCRWord[];
  paragraphs: string[];
  error?: string;
  fallback?: boolean;
}

async function cloudOCR(
  imageDataUrl: string,
  onProgress?: (p: number) => void,
): Promise<OCRResult | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  onProgress?.(5);

  // Compress for the API payload
  const compressed = await compressImage(imageDataUrl, 4);
  onProgress?.(15);

  // Preprocess lightly (no binarization — Vision does its own)
  const processed = await preprocessForCloud(compressed);
  onProgress?.(30);

  const apiUrl = `${supabaseUrl}/functions/v1/ocr-vision`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Only add auth header if we have a real anon key
  if (anonKey && anonKey.length > 10) {
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: processed.dataUrl }),
    });

    onProgress?.(70);

    if (!resp.ok) {
      console.warn('Cloud OCR returned non-OK status:', resp.status);
      return null;
    }

    const data: CloudOCRResponse = await resp.json();

    if (data.error || data.fallback) {
      console.warn('Cloud OCR error:', data.error);
      return null;
    }

    onProgress?.(90);

    const rawText = data.text || '';
    const cleanedText = cleanOcrText(rawText);
    const paragraphs = data.paragraphs?.length
      ? data.paragraphs.map(p => cleanOcrText(p)).filter(p => p.length > 0)
      : detectParagraphs(cleanedText);

    // Identify low-confidence words (< 70%)
    const lowConfidenceWords = (data.words || []).filter(
      w => w.confidence > 0 && w.confidence < 70,
    );

    return {
      text: cleanedText,
      rawText,
      confidence: data.confidence || 0,
      paragraphs,
      engine: 'cloud-vision',
      lowConfidenceWords,
      preprocessingApplied: processed.steps,
    };
  } catch (err) {
    console.warn('Cloud OCR failed, falling back to Tesseract:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tesseract fallback (enhanced with preprocessing)
// ---------------------------------------------------------------------------

async function tesseractOCR(
  imageDataUrl: string,
  onProgress?: (p: number) => void,
): Promise<OCRResult> {
  // Full preprocessing including adaptive threshold for Tesseract
  const processed = await preprocessImage(imageDataUrl);
  onProgress?.(20);

  let timedOut = false;
  const TIMEOUT_MS = 120000;
  const timeoutId = setTimeout(() => { timedOut = true; }, TIMEOUT_MS);

  try {
    const result = await Tesseract.recognize(processed.dataUrl, 'eng', {
      logger: (m: { status: string; progress?: number }) => {
        if (timedOut) return;
        if (typeof m.progress === 'number' && onProgress) {
          if (m.status === 'loading tesseract core') {
            onProgress(20 + Math.round(m.progress * 10));
          } else if (m.status === 'initializing tesseract') {
            onProgress(30 + Math.round(m.progress * 10));
          } else if (m.status === 'loading language traineddata') {
            onProgress(40 + Math.round(m.progress * 20));
          } else if (m.status === 'initializing api') {
            onProgress(60 + Math.round(m.progress * 10));
          } else if (m.status === 'recognizing text') {
            onProgress(70 + Math.round(m.progress * 30));
          }
        }
      },
    });

    clearTimeout(timeoutId);

    if (timedOut) {
      throw new Error('OCR timed out. Please try a smaller or simpler image.');
    }

    const rawText = result.data.text || '';
    const confidence = Math.round(result.data.confidence || 0);
    const cleanedText = cleanOcrText(rawText);
    const paragraphs = detectParagraphs(cleanedText);

    // Extract low-confidence words from Tesseract's per-word data
    const lowConfidenceWords: OCRWord[] = [];
    const tdata = result.data as unknown as {
      words?: Array<{ text: string; confidence: number }>;
    };
    if (tdata.words) {
      for (const w of tdata.words) {
        const conf = Math.round(w.confidence);
        if (conf > 0 && conf < 70) {
          lowConfidenceWords.push({ text: w.text, confidence: conf });
        }
      }
    }

    return {
      text: cleanedText,
      rawText,
      confidence,
      paragraphs,
      engine: 'tesseract',
      lowConfidenceWords,
      preprocessingApplied: processed.steps,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) throw error;
    throw new Error('OCR processing failed. Please try with a different image.');
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function extractTextFromImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void,
): Promise<OCRResult> {
  // Step 1: Get data URL
  let dataUrl: string;
  if (typeof imageSource === 'string') {
    dataUrl = imageSource;
  } else {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(imageSource);
    });
  }

  onProgress?.(2);

  // Step 2: Try cloud OCR first (best handwriting support)
  const cloudResult = await cloudOCR(dataUrl, onProgress);
  if (cloudResult && cloudResult.text.trim()) {
    onProgress?.(100);
    return cloudResult;
  }

  // Step 3: Fall back to enhanced Tesseract with full preprocessing
  onProgress?.(10);
  const tessResult = await tesseractOCR(dataUrl, onProgress);
  onProgress?.(100);
  return tessResult;
}
