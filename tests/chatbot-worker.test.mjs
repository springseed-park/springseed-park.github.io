import assert from "node:assert/strict";
import test from "node:test";
import worker from "../chatbot-worker/src/index.ts";

const allowedOrigin = "http://localhost:3001";
const session = "session_1234567890abcdef";
const allow = { limit: async () => ({ success: true }) };
const deny = { limit: async () => ({ success: false }) };

function env(overrides = {}) {
  return {
    GROQ_API_KEY: "local-test-key",
    CHAT_RATE_LIMITER: allow,
    CHAT_IP_RATE_LIMITER: allow,
    CHAT_BUDGET_LIMITER: allow,
    ...overrides,
  };
}

function chatRequest(messages, origin = allowedOrigin, extraHeaders = {}) {
  return new Request("https://relay.example/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": origin, "X-Chat-Session": session, ...extraHeaders },
    body: JSON.stringify({ messages }),
  });
}

test("chat relay exposes a no-store health check", async () => {
  const response = await worker.fetch(new Request("https://relay.example/health"), env());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, model: "openai/gpt-oss-20b" });
});

test("chat relay denies unknown origins without reflecting them", async () => {
  const response = await worker.fetch(chatRequest([{ role: "user", content: "안녕" }], "https://malicious.example"), env());
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("chat relay fails closed when any protection binding is missing or exhausted", async () => {
  const missing = await worker.fetch(chatRequest([{ role: "user", content: "안녕" }]), env({ CHAT_BUDGET_LIMITER: undefined }));
  assert.equal(missing.status, 503);
  const limited = await worker.fetch(chatRequest([{ role: "user", content: "안녕" }]), env({ CHAT_IP_RATE_LIMITER: deny }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
});

test("chat relay accepts a long prior assistant reply and sends safe Groq parameters", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamBody;
  globalThis.fetch = async (_url, options) => {
    upstreamBody = JSON.parse(String(options.body));
    return Response.json({ choices: [{ message: { content: "추천 답변입니다. https://springseed-park.github.io/product/signature-rib-socks" } }] });
  };
  try {
    const response = await worker.fetch(chatRequest([
      { role: "user", content: "추천해줘" },
      { role: "assistant", content: "가".repeat(1_200) },
      { role: "user", content: "그중 가장 저렴한 건?" },
    ]), env());
    assert.equal(response.status, 200);
    assert.equal(upstreamBody.model, "openai/gpt-oss-20b");
    assert.equal(upstreamBody.reasoning_effort, "low");
    assert.equal(upstreamBody.max_completion_tokens, 360);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("chat relay maps Groq quota errors without exposing upstream details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: { message: "private upstream detail" } }, { status: 429, headers: { "Retry-After": "12" } });
  try {
    const response = await worker.fetch(chatRequest([{ role: "user", content: "추천해줘" }]), env());
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "12");
    assert.doesNotMatch(JSON.stringify(await response.json()), /private upstream detail/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
