/**
 * Browser-based image preprocessing for OCR.
 *
 * Every function returns a data URL (JPEG) so results can be
 * passed directly to the Tesseract backend.
 *
 * The pipeline is designed for photographed notebook pages:
 *   - upscaling small images
 *   - grayscale conversion
 *   - CLAHE-style contrast enhancement
 *   - median noise reduction
 *   - shadow / bleed-through suppression
 *   - deskew via projection-profile angle detection
 *
 * No binarization — Tesseract works better with
 * 8-bit grayscale than with hard-thresholded binary images.
 *
 * The original image is never mutated — every step produces a new canvas.
 */

export interface PreprocessResult {
  dataUrl: string;
  steps: string[];
  width: number;
  height: number;
}

/** Load an Image from a data URL. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/** Canvas → JPEG data URL. */
function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92): string {
  return canvas.toDataURL('image/jpeg', quality);
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return [c, ctx];
}

/**
 * Step 1 — Upscale.
 * If the longest edge is below 1500 px we scale up so the OCR engine
 * has enough pixel density to separate strokes.
 */
function upscale(img: HTMLImageElement): { canvas: HTMLCanvasElement; step: string } {
  const MIN_EDGE = 1500;
  const longest = Math.max(img.width, img.height);
  if (longest >= MIN_EDGE) {
    const [c, ctx] = makeCanvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    return { canvas: c, step: 'none (already high-res)' };
  }
  const scale = MIN_EDGE / longest;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const [c, ctx] = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas: c, step: `upscale ${scale.toFixed(2)}x → ${w}×${h}` };
}

/** Step 2 — Grayscale. */
function toGrayscale(src: HTMLCanvasElement): HTMLCanvasElement {
  const [dst, dctx] = makeCanvas(src.width, src.height);
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  const imageData = sctx.getImageData(0, 0, src.width, src.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  dctx.putImageData(imageData, 0, 0);
  return dst;
}

/**
 * Step 3 — CLAHE-lite contrast enhancement.
 * We build a luminance histogram, clip the top/bottom 0.5 %, then linearly
 * stretch the remaining range.  This is a fast approximation of CLAHE that
 * avoids per-tile processing while still recovering faint strokes.
 */
function enhanceContrast(src: HTMLCanvasElement): HTMLCanvasElement {
  const [dst, dctx] = makeCanvas(src.width, src.height);
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  const imageData = sctx.getImageData(0, 0, src.width, src.height);
  const d = imageData.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
  const total = src.width * src.height;
  let lo = 0, hi = 255, cum = 0;
  const clip = Math.floor(total * 0.005);
  for (let v = 0; v < 256 && cum < clip; v++) { cum += hist[v]; lo = v; }
  cum = 0;
  for (let v = 255; v >= 0 && cum < clip; v--) { cum += hist[v]; hi = v; }
  if (hi <= lo) { dctx.putImageData(imageData, 0, 0); return dst; }
  const range = hi - lo;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, Math.round(((d[i] - lo) / range) * 255)));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  dctx.putImageData(imageData, 0, 0);
  return dst;
}

/**
 * Step 4 — Noise reduction (median filter, 3×3).
 * Median filtering preserves edges better than Gaussian blur, which is
 * important for thin handwriting strokes.
 */
function medianDenoise(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  if (w < 9 || h < 9) return src;
  const [dst, dctx] = makeCanvas(w, h);
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  const srcData = sctx.getImageData(0, 0, w, h).data;
  const dstData = dctx.createImageData(w, h);
  const buf = dstData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        buf[idx] = buf[idx + 1] = buf[idx + 2] = srcData[idx];
        buf[idx + 3] = 255;
        continue;
      }
      const vals: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          vals.push(srcData[((y + dy) * w + (x + dx)) * 4]);
        }
      }
      vals.sort((a, b) => a - b);
      const med = vals[4];
      buf[idx] = buf[idx + 1] = buf[idx + 2] = med;
      buf[idx + 3] = 255;
    }
  }
  dctx.putImageData(dstData, 0, 0);
  return dst;
}

/**
 * Step 5 — Shadow / bleed-through suppression.
 * Estimate the background using a large-box morphological opening (approximated
 * by a heavy blur), then divide the image by the background.  This normalises
 * uneven lighting and suppresses bleed-through from the reverse page.
 */
function removeShadows(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const [dst, dctx] = makeCanvas(w, h);
  const sctx = src.getContext('2d', { willReadFrequently: true })!;

  // Downscale → blur → upscale to approximate a large-kernel opening
  const smallW = Math.max(1, Math.round(w / 20));
  const smallH = Math.max(1, Math.round(h / 20));
  const [small, sctx2] = makeCanvas(smallW, smallH);
  sctx2.drawImage(src, 0, 0, smallW, smallH);
  // Blur the small image
  sctx2.filter = 'blur(' + Math.max(1, Math.round(smallW / 4)) + 'px)';
  sctx2.drawImage(small, 0, 0);
  // Upscale back
  const [, bctx] = makeCanvas(w, h);
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, w, h);

  const srcData = sctx.getImageData(0, 0, w, h).data;
  const bgData = bctx.getImageData(0, 0, w, h).data;
  const out = dctx.createImageData(w, h);
  const o = out.data;

  for (let i = 0; i < srcData.length; i += 4) {
    const bg = Math.max(1, bgData[i]);
    const norm = Math.min(255, Math.round((srcData[i] / bg) * 255));
    o[i] = o[i + 1] = o[i + 2] = norm;
    o[i + 3] = 255;
  }
  dctx.putImageData(out, 0, 0);
  return dst;
}

/**
 * Step 6 — Deskew.
 * Estimates the rotation angle by looking at horizontal projection profiles.
 * For a range of candidate angles (±12° in 0.5° steps), we rotate the image
 * and compute the variance of row-sums.  The angle that maximises variance
 * is the one where text lines are most horizontal.  Then we rotate by the
 * negative of that angle.
 *
 * This is lighter than a full Hough transform and works well for notebook
 * pages with clear text lines.
 */
function deskew(src: HTMLCanvasElement): { canvas: HTMLCanvasElement; angle: number } {
  // Work on a downscaled grayscale version for speed
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  const sw = Math.round(src.width * scale);
  const sh = Math.round(src.height * scale);
  const [, sctx] = makeCanvas(sw, sh);
  sctx.drawImage(src, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh).data;

  // Row-sum profile (count dark pixels per row)
  function rowSumVariance(angle: number): number {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const cx = sw / 2, cy = sh / 2;
    const rowSums = new Float64Array(sh);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        // Inverse rotation to sample source
        const dx = x - cx, dy = y - cy;
        const sx = Math.round(cx + dx * cos + dy * sin);
        const sy = Math.round(cy - dx * sin + dy * cos);
        if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
          const v = data[(sy * sw + sx) * 4];
          if (v < 128) rowSums[y]++;
        }
      }
    }
    const mean = rowSums.reduce((a, b) => a + b, 0) / sh;
    let variance = 0;
    for (let i = 0; i < sh; i++) variance += (rowSums[i] - mean) ** 2;
    return variance / sh;
  }

  let bestAngle = 0, bestVar = -1;
  for (let a = -12; a <= 12; a += 0.5) {
    const v = rowSumVariance(a);
    if (v > bestVar) { bestVar = v; bestAngle = a; }
  }

  // Only correct if the angle is meaningful (> 0.5°)
  if (Math.abs(bestAngle) < 0.5) return { canvas: src, angle: 0 };

  const [dst, dctx] = makeCanvas(src.width, src.height);
  dctx.translate(src.width / 2, src.height / 2);
  dctx.rotate((-bestAngle * Math.PI) / 180);
  dctx.drawImage(src, -src.width / 2, -src.height / 2);
  return { canvas: dst, angle: bestAngle };
}

/**
 * Run the preprocessing pipeline on a data URL.
 * Returns the processed image as a JPEG data URL plus a list of steps
 * that were applied (for display to the user).
 *
 * No binarization — Tesseract works better with 8-bit grayscale.
 */
export async function preprocessImage(dataUrl: string): Promise<PreprocessResult> {
  const img = await loadImage(dataUrl);
  const steps: string[] = [];

  // 1. Upscale
  const { canvas: c1, step: s1 } = upscale(img);
  if (s1 !== 'none (already high-res)') steps.push(s1);

  // 2. Grayscale
  const c2 = toGrayscale(c1);
  steps.push('grayscale');

  // 3. Shadow / bleed-through removal
  const c3 = removeShadows(c2);
  steps.push('shadow & bleed-through suppression');

  // 4. Contrast enhancement
  const c4 = enhanceContrast(c3);
  steps.push('contrast enhancement (CLAHE-lite)');

  // 5. Median denoise
  const c5 = medianDenoise(c4);
  steps.push('median denoise (3×3)');

  // 6. Deskew
  const { canvas: c6, angle } = deskew(c5);
  if (angle !== 0) steps.push(`deskew ${angle.toFixed(1)}°`);

  return {
    dataUrl: canvasToJpeg(c6, 0.92),
    steps,
    width: c6.width,
    height: c6.height,
  };
}

/**
 * Compress an image to stay under a size threshold (for API payloads).
 */
export function compressImage(dataUrl: string, maxSizeMB = 4): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }

      const commaIdx = dataUrl.indexOf(',');
      const base64Length = commaIdx >= 0 ? dataUrl.length - commaIdx - 1 : dataUrl.length;
      const sizeInMB = (base64Length * 0.75) / (1024 * 1024);

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
