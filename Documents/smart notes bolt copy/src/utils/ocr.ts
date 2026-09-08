import Tesseract from 'tesseract.js';
import { OCRResult } from '../types';

const corrections: Record<string, string> = {
  'teh': 'the', 'adn': 'and', 'taht': 'that', 'tihs': 'this',
  'si': 'is', 'ot': 'to', 'fo': 'for', 'nad': 'and', 'ahve': 'have',
  'hte': 'the', 'itn': 'it', 'wa': 'was', 'hsa': 'has', 'eh': 'he',
  'hs': 'his', 'ehr': 'her', 'owrk': 'work', 'wrok': 'work',
  'wirte': 'write', 'wnat': 'want', 'tyhe': 'they',
  'recieve': 'receive', 'occured': 'occurred', 'seperate': 'separate',
  'definately': 'definitely', 'occassion': 'occasion', 'accomodate': 'accommodate',
  'neccessary': 'necessary', 'priviledge': 'privilege', 'recoginze': 'recognize',
  'handwritting': 'handwriting', 'recogniton': 'recognition', 'docuement': 'document',
  'lhe': 'the', 'lhat': 'that', 'lhis': 'this',
};

function spellCorrect(text: string): string {
  return text.replace(/\b\w+\b/g, word => {
    const lower = word.toLowerCase();
    if (corrections[lower]) {
      if (word[0] === word[0]?.toUpperCase()) {
        return corrections[lower][0].toUpperCase() + corrections[lower].slice(1);
      }
      return corrections[lower];
    }
    return word;
  });
}

function cleanOcrText(text: string): string {
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/(.)\1{4,}/g, '$1$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^ +| +$/gm, '')
    .replace(/ ([.!?,;:])/g, '$1')
    .replace(/\.\./g, '.')
    .trim();
  cleaned = spellCorrect(cleaned);
  return cleaned;
}

function detectParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

function compressImage(dataUrl: string, maxSizeMB: number = 3): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }

      const commaIdx = dataUrl.indexOf(',');
      const base64Length = commaIdx >= 0 ? dataUrl.length - commaIdx - 1 : dataUrl.length;
      const sizeInMB = Math.ceil(base64Length * 0.75) / (1024 * 1024);

      if (sizeInMB <= maxSizeMB) { resolve(dataUrl); return; }

      const scale = Math.sqrt(maxSizeMB / sizeInMB);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const TIMEOUT_MS = 120000;

export async function extractTextFromImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
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

  dataUrl = await compressImage(dataUrl, 3);

  let timedOut = false;
  const timeoutId = setTimeout(() => { timedOut = true; }, TIMEOUT_MS);

  try {
    const result = await Tesseract.recognize(dataUrl, 'eng', {
      logger: (m: { status: string; progress?: number }) => {
        if (timedOut) return;
        if (typeof m.progress === 'number' && onProgress) {
          // Report progress for all stages: loading tesseract, loading language, recognizing
          if (m.status === 'loading tesseract core') {
            onProgress(Math.round(m.progress * 10)); // 0-10%
          } else if (m.status === 'initializing tesseract') {
            onProgress(10 + Math.round(m.progress * 10)); // 10-20%
          } else if (m.status === 'loading language traineddata') {
            onProgress(20 + Math.round(m.progress * 30)); // 20-50%
          } else if (m.status === 'initializing api') {
            onProgress(50 + Math.round(m.progress * 10)); // 50-60%
          } else if (m.status === 'recognizing text') {
            onProgress(60 + Math.round(m.progress * 40)); // 60-100%
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

    return { text: cleanedText, confidence, paragraphs };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) throw error;
    throw new Error('OCR processing failed. Please try with a different image.');
  }
}
