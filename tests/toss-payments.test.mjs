import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `toss-${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const runtime = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  TOSS_PAYMENTS_SECRET_KEY: "test-secret-for-local-contract-tests",
};
const context = { waitUntil() {}, passThroughOnException() {} };

function post(path, body, origin = "https://springseed-park.github.io") {
  return new Request(`https://maison-elan.example${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

test("payment preparation uses the server catalog and welcome discount", async () => {
  const worker = await loadWorker();
  const orderId = "ME-contract-test-001";
  const response = await worker.fetch(post("/api/payments/prepare", {
    orderId,
    items: [{ id: "sculpted-wool-jacket", size: "S", color: "Ink Black", quantity: 1 }],
    couponCode: "WELCOME10",
  }), runtime, context);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://springseed-park.github.io");
  const payload = await response.json();
  assert.deepEqual({
    orderId: payload.orderId,
    subtotal: payload.subtotal,
    discount: payload.discount,
    shippingFee: payload.shippingFee,
    amount: payload.amount,
  }, {
    orderId,
    subtotal: 428000,
    discount: 42800,
    shippingFee: 0,
    amount: 385200,
  });
  assert.match(payload.intentToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.match(payload.itemsDigest, /^[A-Za-z0-9_-]{43}$/);
});

test("payment preparation rejects product option tampering", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(post("/api/payments/prepare", {
    orderId: "ME-contract-test-002",
    items: [{ id: "sculpted-wool-jacket", size: "INVALID", color: "Ink Black", quantity: 1 }],
  }), runtime, context);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_ORDER_ITEMS");
});

test("payment API rejects untrusted origins and missing runtime secrets", async () => {
  const worker = await loadWorker();
  const requestBody = {
    orderId: "ME-contract-test-003",
    items: [{ id: "sculpted-wool-jacket", size: "S", color: "Ink Black", quantity: 1 }],
  };
  const blocked = await worker.fetch(post("/api/payments/prepare", requestBody, "https://attacker.example"), runtime, context);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).code, "ORIGIN_NOT_ALLOWED");

  const unconfigured = await worker.fetch(post("/api/payments/prepare", requestBody), { ASSETS: runtime.ASSETS }, context);
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).code, "TOSS_CONFIG_REQUIRED");
});

test("confirmation rejects mismatched callback amounts before contacting Toss", async () => {
  const worker = await loadWorker();
  const orderId = "ME-contract-test-004";
  const prepared = await worker.fetch(post("/api/payments/prepare", {
    orderId,
    items: [{ id: "sculpted-wool-jacket", size: "S", color: "Ink Black", quantity: 1 }],
  }), runtime, context);
  const intent = await prepared.json();

  const response = await worker.fetch(post("/api/payments/confirm", {
    paymentKey: "pretend-payment-key-for-contract-test",
    orderId,
    amount: intent.amount + 1,
    intentToken: intent.intentToken,
  }), runtime, context);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "PAYMENT_AMOUNT_MISMATCH");
});
