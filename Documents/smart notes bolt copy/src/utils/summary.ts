import { SummaryResult } from '../types';

export function generateSummary(text: string): SummaryResult {
  if (!text.trim()) {
    return { short: '', medium: '', keyPoints: [] };
  }

  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 10);

  if (sentences.length === 0) {
    return { short: text.slice(0, 100), medium: text.slice(0, 300), keyPoints: [] };
  }

  const short = sentences.slice(0, 2).join(' ');
  const medium = sentences.slice(0, Math.min(5, sentences.length)).join(' ');

  const words = text.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what', 'which', 'who', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their']);

  words.forEach(w => {
    const clean = w.replace(/[^a-z]/g, '');
    if (clean.length > 3 && !stopWords.has(clean)) {
      freq[clean] = (freq[clean] || 0) + 1;
    }
  });

  const scored = sentences.map((s, i) => {
    const sWords = s.toLowerCase().split(/\s+/);
    let score = 0;
    sWords.forEach(w => {
      const clean = w.replace(/[^a-z]/g, '');
      score += freq[clean] || 0;
    });
    score /= Math.max(sWords.length, 1);
    if (i === 0) score *= 1.5;
    return { sentence: s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const keyPoints = scored
    .slice(0, Math.min(5, sentences.length))
    .map(s => s.sentence.trim());

  return { short, medium, keyPoints };
}
