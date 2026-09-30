import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const clientId = "9d2ed8af-07ba-4c18-916d-b0caf22a2766";

function createEnv(overrides: Partial<Env> = {}): Env {
  const assets = Object.assign(vi.fn(), {
    fetch: vi.fn().mockResolvedValue(new Response("asset")),
    connect: vi.fn(),
  }) as Fetcher;

  return {
    GEMINI_API_KEY: "test-key",
    GEMINI_MODEL: "gemini-3-flash-preview",
    OCR_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: true }),
    } as RateLimit,
    ASSETS: assets,
    ...overrides,
  };
}

function callWorker(request: Request, env: Env): Promise<Response> {
  return worker.fetch(request as Parameters<typeof worker.fetch>[0], env);
}

function createRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/parse-invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://example.com",
      "Sec-Fetch-Site": "same-origin",
      "X-Client-Id": clientId,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invoice API worker", () => {
  it("rejects cross-origin requests", async () => {
    const response = await callWorker(createRequest(
      { base64Image: "/9j/abc", type: "TRIPLET" },
      { Origin: "https://attacker.example" },
    ), createEnv());

    expect(response.status).toBe(403);
  });

  it("enforces the per-client rate limit", async () => {
    const env = createEnv({
      OCR_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: false }),
      } as RateLimit,
    });

    const response = await callWorker(
      createRequest({ base64Image: "/9j/abc", type: "TRIPLET" }),
      env,
    );

    expect(response.status).toBe(429);
  });

  it("returns parsed Gemini JSON", async () => {
    const geminiFetch = vi.fn().mockResolvedValue(Response.json({
      candidates: [{
        content: {
          parts: [{ text: JSON.stringify({ invoiceNumber: "AB12345678" }) }],
        },
      }],
    }));
    vi.stubGlobal("fetch", geminiFetch);

    const response = await callWorker(
      createRequest({ base64Image: "iVBORabc", type: "TRIPLET" }),
      createEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { invoiceNumber: "AB12345678" },
    });

    const [, init] = geminiFetch.mock.calls[0];
    expect(JSON.parse(init.body).contents[0].parts[0].inlineData.mimeType)
      .toBe("image/png");
  });
});
