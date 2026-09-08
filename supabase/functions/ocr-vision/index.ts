/**
 * OCR Edge Function — Google Cloud Vision API
 *
 * Receives a base64-encoded image, sends it to the Google Cloud Vision
 * DOCUMENT_TEXT_DETECTION endpoint, and returns structured OCR results
 * including per-word confidence and reading order.
 *
 * Required secret (set via Supabase dashboard or CLI):
 *   GCLOUD_VISION_KEY  — Google Cloud Vision API key
 *
 * The function falls back to a clear error message if the key is missing
 * so the frontend can gracefully fall back to Tesseract.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VisionResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
      pages: Array<{
        blocks: Array<{
          paragraphs: Array<{
            words: Array<{
              symbols: Array<{ text: string; confidence?: number }>;
              property?: { detectedLanguages?: Array<{ languageCode: string }> };
              confidence?: number;
            }>;
            boundingBox?: { vertices: Array<{ x: number; y: number }> };
          }>;
          blockType: string;
        }>;
      }>;
    };
    error?: { message: string };
  }>;
}

interface OCRWord {
  text: string;
  confidence: number;
}

interface OCRResponse {
  text: string;
  confidence: number;
  words: OCRWord[];
  paragraphs: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image } = body as {
      image: string;
    };

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Strip data URL prefix if present
    const base64 = image.startsWith("data:")
      ? image.split(",")[1]
      : image;

    const apiKey = Deno.env.get("GCLOUD_VISION_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GCLOUD_VISION_KEY secret not configured. Using fallback OCR.",
          fallback: true,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the Vision API request.
    // We request DOCUMENT_TEXT_DETECTION which handles both handwritten
    // and printed text, and returns full text with bounding boxes + confidence.
    const visionRequest = {
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
          ],
          imageContext: {
            // Enable handwriting model explicitly
            languageHints: ["en"],
          },
        },
      ],
    };

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const visionResp = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionRequest),
    });

    if (!visionResp.ok) {
      const errText = await visionResp.text();
      return new Response(
        JSON.stringify({
          error: `Vision API error (${visionResp.status}): ${errText}`,
          fallback: true,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const visionData: VisionResponse = await visionResp.json();
    const annotation = visionData.responses?.[0];

    if (annotation?.error) {
      return new Response(
        JSON.stringify({
          error: `Vision API error: ${annotation.error.message}`,
          fallback: true,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fullText = annotation?.fullTextAnnotation?.text || "";
    const pages = annotation?.fullTextAnnotation?.pages || [];

    // Extract per-word confidence from the symbol-level data
    const words: OCRWord[] = [];
    let totalConf = 0;
    let confCount = 0;

    for (const page of pages) {
      for (const block of page.blocks) {
        for (const para of block.paragraphs) {
          for (const w of para.words) {
            const wordText = w.symbols.map((s) => s.text).join("");
            const wordConf = w.confidence ?? 0;
            if (wordConf > 0) {
              totalConf += wordConf;
              confCount++;
            }
            words.push({ text: wordText, confidence: Math.round(wordConf * 100) });
          }
        }
      }
    }

    const avgConfidence = confCount > 0
      ? Math.round((totalConf / confCount) * 100)
      : 0;

    // Split into paragraphs — Vision API separates blocks with newlines
    // and paragraphs within blocks with double newlines
    const paragraphs = fullText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const ocrResult: OCRResponse = {
      text: fullText,
      confidence: avgConfidence,
      words,
      paragraphs,
    };

    return new Response(
      JSON.stringify(ocrResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown OCR error",
        fallback: true,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
