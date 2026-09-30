import { InvoiceType } from "../types";
import { buildInvoicePrompt } from "./prompt";

const MAX_BASE64_LENGTH = 15_000_000;
const ALLOWED_TYPES = new Set(Object.values(InvoiceType));
const CLIENT_ID_PATTERN = /^[0-9a-f-]{36}$/i;

type ParseRequest = {
  base64Image?: unknown;
  type?: unknown;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isSameOriginBrowserRequest(request: Request): boolean {
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  const expectedOrigin = new URL(request.url).origin;

  return (!origin || origin === expectedOrigin)
    && (!fetchSite || fetchSite === "same-origin");
}

async function parseInvoice(request: Request, env: Env): Promise<Response> {
  if (!isSameOriginBrowserRequest(request)) {
    return json({ error: "不允許的請求來源。" }, 403);
  }

  const clientId = request.headers.get("X-Client-Id") || "";
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return json({ error: "瀏覽器識別資訊無效，請重新整理頁面。" }, 400);
  }

  const { success } = await env.OCR_RATE_LIMITER.limit({ key: clientId });
  if (!success) {
    return json({ error: "辨識次數過多，請稍候一分鐘再試。" }, 429);
  }

  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > MAX_BASE64_LENGTH + 1_000) {
    return json({ error: "圖片太大，請縮小後再試。" }, 413);
  }

  let body: ParseRequest;
  try {
    body = await request.json() as ParseRequest;
  } catch {
    return json({ error: "請求格式錯誤。" }, 400);
  }

  if (typeof body.base64Image !== "string"
    || body.base64Image.length === 0
    || body.base64Image.length > MAX_BASE64_LENGTH) {
    return json({ error: "圖片內容無效或超過大小限制。" }, 400);
  }

  if (typeof body.type !== "string" || !ALLOWED_TYPES.has(body.type as InvoiceType)) {
    return json({ error: "發票類型無效。" }, 400);
  }

  const model = env.GEMINI_MODEL || "gemini-3-flash-preview";
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: detectImageMimeType(body.base64Image), data: body.base64Image } },
            { text: buildInvoicePrompt(body.type as InvoiceType) },
          ],
        }],
        generationConfig: {
          temperature: 0,
          topK: 1,
          topP: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const geminiPayload = await geminiResponse.json() as GeminiResponse;
  if (!geminiResponse.ok) {
    console.error(JSON.stringify({
      event: "gemini_error",
      status: geminiResponse.status,
      message: geminiPayload.error?.message || "unknown",
    }));
    return json({ error: "Gemini 服務未回應，請稍後再試。" }, 502);
  }

  const text = geminiPayload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  if (!text) {
    return json({ error: "Gemini 沒有傳回辨識結果。" }, 502);
  }

  try {
    return json({ data: JSON.parse(text) });
  } catch {
    return json({ error: "Gemini 傳回的資料格式不正確。" }, 502);
  }
}

function detectImageMimeType(base64Image: string): string {
  if (base64Image.startsWith("iVBOR")) return "image/png";
  if (base64Image.startsWith("UklGR")) return "image/webp";
  if (base64Image.startsWith("R0lGOD")) return "image/gif";
  return "image/jpeg";
}

function withStaticSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("Referrer-Policy", "same-origin");
  secured.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  secured.headers.set("X-Frame-Options", "DENY");
  return secured;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/parse-invoice") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        return await parseInvoice(request, env);
      } catch (error) {
        console.error(JSON.stringify({
          event: "unhandled_error",
          message: error instanceof Error ? error.message : "unknown",
        }));
        return json({ error: "服務暫時無法使用。" }, 500);
      }
    }

    return withStaticSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
