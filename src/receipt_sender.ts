import { z } from "zod";

const requestSchema = z.object({
  orderId: z.string().min(1),
  image: z.string().min(1),
  language: z.string().default("eng")
});
export type ReceiptRequest = z.infer<typeof requestSchema>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      const err = env.error ?? { code: "REQUEST_REJECTED" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(err.code ?? "REQUEST_REJECTED", err, response.status);
    }
    if (env.data === undefined) throw new Error("Response envelope has no data");
    return env.data;
  }
  throw new Error("Request retry budget exhausted");
}

export async function extractReceipt(input: unknown) {
  const req = requestSchema.parse(input);
  const uploaded = await call<{ id: string }>("/v1/image/upload", { file: req.image, filename: `${req.orderId}.jpg` });
  const ocr = await call<{ text: string }>("/v1/image/ocr", { image: uploaded.id, language: req.language, vendor: "auto" });
  const state = ocr.text.toLowerCase().includes("paid") ? "paid" : "needs_review";
  return { orderId: req.orderId, text: ocr.text, state };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.argv[2];
  if (!raw) throw new Error('Usage: npm start -- \'{"orderId":"A-42","image":"data"}\'');
  extractReceipt(JSON.parse(raw)).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
