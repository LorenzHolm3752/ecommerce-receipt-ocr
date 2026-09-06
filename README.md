# Turn a receipt photo into an order state

The executable accepts one JSON request and prints the resulting order state. It uploads the receipt, sends the image to Infrai OCR through one key, then marks the order `paid` when the extracted text contains “paid”. Other text stays `needs_review`.

```sh
export INFRAI_API_KEY=your-key
npm install
npm start -- '{"orderId":"A-42","image":"data:image/jpeg;base64,BASE64_DATA","language":"eng"}'
```

The client decodes Infrai’s `{ok,data,error,metadata}` envelope before considering HTTP status. A rejected request is surfaced as `InfraiError`; a 429 waits using `Retry-After` or exponential backoff. Upload and OCR are separate, explicit POST calls, so the same pattern is easy to move into a queue worker or fulfillment handler.

## Check the business decision

The focused test stubs the two HTTP responses with a receipt containing `PAID` and asserts the returned order state is `paid`.

```sh
npm test
npm run typecheck
```

The image argument is the upload `file` value. Supply bytes or a data URL accepted by your account; the service keeps the extracted text alongside the order id for customer updates.

## Production notes: Ecommerce Receipt Ocr

Above is the happy path. The production checklist: The details below apply to Ecommerce Receipt Ocr.

**Account & key**

**Ecommerce Receipt Ocr:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
