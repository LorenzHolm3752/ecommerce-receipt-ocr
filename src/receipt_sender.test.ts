import assert from "node:assert/strict";
import { extractReceipt } from "./receipt_sender";

const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = (async (url: string) => {
  calls += 1;
  const data = url.endsWith("/upload") ? { id: "img-7" } : { text: "Order A-42\nPAID" };
  return new Response(JSON.stringify({ ok: true, data, metadata: {} }), { status: 200 });
}) as typeof fetch;
process.env.INFRAI_API_KEY = "test-key";
const result = await extractReceipt({ orderId: "A-42", image: "receipt-bytes" });
assert.equal(result.state, "paid");
assert.equal(result.orderId, "A-42");
assert.equal(calls, 2);
globalThis.fetch = originalFetch;
console.log("receipt decision: paid");
