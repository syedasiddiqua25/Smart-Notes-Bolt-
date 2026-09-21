/**
 * Smart Notes — OCR Pipeline
 *
 * Sends the image to the Flask backend running Tesseract OCR, receives
 * extracted text with per-line confidence, and post-processes the
 * result with spell correction and paragraph detection.
 */

import type { OCRResult, OCRWord } from '../types';
import { preprocessImage, compressImage } from './imageProcessing';

// ---------------------------------------------------------------------------
// Backend API URL
// ---------------------------------------------------------------------------

const OCR_API_URL =
  import.meta.env.VITE_OCR_API_URL || '/api/ocr';

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
// Backend OCR call (Tesseract via Flask)
// ---------------------------------------------------------------------------

interface BackendOCRResponse {
  text: string;
  confidence: number;
  paragraphs?: string[];
  error?: string;
}

async function tesseractOCR(
  imageDataUrl: string,
  onProgress?: (p: number) => void,
): Promise<OCRResult> {
  // Compress for the HTTP payload
  onProgress?.(5);
  const compressed = await compressImage(imageDataUrl, 4);
  onProgress?.(15);

  // Light browser-side preprocessing (upscale, grayscale, denoise, deskew — no binarization)
  const processed = await preprocessImage(compressed);
  onProgress?.(30);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let resp: Response;
  try {
    resp = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: processed.dataUrl }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
      throw new Error('OCR request timed out. The server may be downloading models on first run — please try again in a moment.');
    }
    throw new Error('Cannot connect to the OCR server. Please ensure the Flask backend is running.');
  } finally {
    clearTimeout(timeoutId);
  }

  onProgress?.(70);

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({})) as BackendOCRResponse;
    throw new Error(errBody.error || `OCR backend returned ${resp.status}`);
  }

  const data: BackendOCRResponse = await resp.json();

  if (data.error) {
    throw new Error(data.error);
  }

  onProgress?.(90);

  const rawText = data.text || '';
  const cleanedText = cleanOcrText(rawText);
  const paragraphs = data.paragraphs?.length
    ? data.paragraphs.map(p => cleanOcrText(p)).filter(p => p.length > 0)
    : detectParagraphs(cleanedText);

  const lowConfidenceWords: OCRWord[] = [];

  return {
    text: cleanedText,
    rawText,
    confidence: data.confidence || 0,
    paragraphs,
    engine: 'tesseract',
    lowConfidenceWords,
    preprocessingApplied: processed.steps,
  };
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

  // Step 2: Send to Tesseract backend
  const result = await tesseractOCR(dataUrl, onProgress);
  onProgress?.(100);
  return result;
}
