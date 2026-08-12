/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { products } from "../app/lib/products";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  TOSS_PAYMENTS_SECRET_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type CheckoutItem = {
  id: string;
  size: string;
  color: string;
  quantity: number;
};

type PaymentIntent = {
  version: 1;
  orderId: string;
  amount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  couponCode: string | null;
  itemsDigest: string;
  issuedAt: number;
  expiresAt: number;
};

const API_PREFIX = "/api/payments/";
const INTENT_LIFETIME_MS = 10 * 60 * 1000;
const encoder = new TextEncoder();
const allowedCrossOrigins = new Set([
  "https://springseed-park.github.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;
  const allowedOrigin = origin && (origin === requestOrigin || allowedCrossOrigins.has(origin)) ? origin : null;
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  if (allowedOrigin) headers.set("Access-Control-Allow-Origin", allowedOrigin);
  return { headers, originAllowed: !origin || Boolean(allowedOrigin) };
}

function jsonResponse(request: Request, body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const { headers } = corsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (extraHeaders) new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(request: Request, status: number, code: string, message: string) {
  return jsonResponse(request, { code, message }, status);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function intentKey(secret: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`maison-elan:toss-intent:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function signIntent(intent: PaymentIntent, secret: string) {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(intent)));
  const key = await intentKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyIntent(token: string, secret: string): Promise<PaymentIntent | null> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  try {
    const key = await intentKey(secret, ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(parts[1]),
      encoder.encode(parts[0]),
    );
    if (!valid) return null;

    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0]))) as Partial<PaymentIntent>;
    if (
      parsed.version !== 1 ||
      typeof parsed.orderId !== "string" ||
      typeof parsed.amount !== "number" ||
      !Number.isSafeInteger(parsed.amount) ||
      typeof parsed.subtotal !== "number" ||
      !Number.isSafeInteger(parsed.subtotal) ||
      typeof parsed.discount !== "number" ||
      !Number.isSafeInteger(parsed.discount) ||
      typeof parsed.shippingFee !== "number" ||
      !Number.isSafeInteger(parsed.shippingFee) ||
      (parsed.couponCode !== null && typeof parsed.couponCode !== "string") ||
      typeof parsed.itemsDigest !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(parsed.itemsDigest) ||
      typeof parsed.issuedAt !== "number" ||
      !Number.isSafeInteger(parsed.issuedAt) ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isSafeInteger(parsed.expiresAt)
    ) return null;

    const now = Date.now();
    if (parsed.expiresAt <= now || parsed.issuedAt > now + 60_000 || parsed.expiresAt - parsed.issuedAt > INTENT_LIFETIME_MS) return null;
    return parsed as PaymentIntent;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(request: Request) {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw new Error("content-type");
  return request.json() as Promise<unknown>;
}

function validateOrderId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(value);
}

function parseCheckoutItems(value: unknown): CheckoutItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null;
  const parsed: CheckoutItem[] = [];
  let totalQuantity = 0;

  for (const item of value) {
    if (!isRecord(item)) return null;
    const { id, size, color, quantity } = item;
    if (
      typeof id !== "string" ||
      typeof size !== "string" ||
      typeof color !== "string" ||
      !Number.isSafeInteger(quantity) ||
      (quantity as number) < 1 ||
      (quantity as number) > 20
    ) return null;

    const product = products.find((candidate) => candidate.id === id);
    if (!product || !product.sizes.includes(size) || !product.colors.some((candidate) => candidate.name === color)) return null;
    totalQuantity += quantity as number;
    if (totalQuantity > 100) return null;
    parsed.push({ id, size, color, quantity: quantity as number });
  }
  return parsed;
}

function calculateOrder(items: CheckoutItem[], couponCode: string | null) {
  const subtotal = items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.id)!;
    return sum + product.price * item.quantity;
  }, 0);
  const discount = couponCode === "WELCOME10" ? Math.floor(subtotal * 0.1) : 0;
  const shippingFee = 0;
  const amount = subtotal - discount + shippingFee;
  const firstProduct = products.find((candidate) => candidate.id === items[0].id)!;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const orderName = (itemCount > 1 ? `${firstProduct.name} 외 ${itemCount - 1}건` : firstProduct.name).slice(0, 100);
  return { subtotal, discount, shippingFee, amount, orderName };
}

async function checkoutItemsDigest(items: CheckoutItem[]) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(items)));
  return base64UrlEncode(new Uint8Array(digest));
}

async function preparePayment(request: Request, secret: string) {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return errorResponse(request, 400, "INVALID_REQUEST", "결제 요청 형식을 확인해 주세요.");
  }
  if (!isRecord(body) || !validateOrderId(body.orderId)) {
    return errorResponse(request, 400, "INVALID_ORDER_ID", "주문번호 형식을 확인해 주세요.");
  }

  const items = parseCheckoutItems(body.items);
  if (!items) return errorResponse(request, 400, "INVALID_ORDER_ITEMS", "주문 상품의 옵션과 수량을 확인해 주세요.");

  const couponCode = body.couponCode === undefined || body.couponCode === "" ? null : body.couponCode;
  if (couponCode !== null && couponCode !== "WELCOME10") {
    return errorResponse(request, 400, "INVALID_COUPON", "사용할 수 없는 쿠폰입니다.");
  }

  const calculated = calculateOrder(items, couponCode);
  if (!Number.isSafeInteger(calculated.amount) || calculated.amount < 100) {
    return errorResponse(request, 400, "INVALID_AMOUNT", "결제 금액은 100원 이상이어야 합니다.");
  }

  const issuedAt = Date.now();
  const itemsDigest = await checkoutItemsDigest(items);
  const intent: PaymentIntent = {
    version: 1,
    orderId: body.orderId,
    amount: calculated.amount,
    subtotal: calculated.subtotal,
    discount: calculated.discount,
    shippingFee: calculated.shippingFee,
    couponCode,
    itemsDigest,
    issuedAt,
    expiresAt: issuedAt + INTENT_LIFETIME_MS,
  };
  const intentToken = await signIntent(intent, secret);
  return jsonResponse(request, {
    orderId: body.orderId,
    orderName: calculated.orderName,
    amount: calculated.amount,
    subtotal: calculated.subtotal,
    discount: calculated.discount,
    shippingFee: calculated.shippingFee,
    intentToken,
    itemsDigest,
  });
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeConfirmedPayment(payment: Record<string, unknown>, intent: PaymentIntent) {
  const card = isRecord(payment.card) ? payment.card : null;
  const easyPay = isRecord(payment.easyPay) ? payment.easyPay : null;
  const receipt = isRecord(payment.receipt) ? payment.receipt : null;
  const cardNumber = card ? nullableString(card.number) : null;
  const cardDigits = cardNumber?.replace(/\D/g, "") ?? "";

  return {
    paymentKey: nullableString(payment.paymentKey),
    orderId: nullableString(payment.orderId),
    status: nullableString(payment.status),
    approvedAt: nullableString(payment.approvedAt),
    method: nullableString(payment.method),
    totalAmount: nullableNumber(payment.totalAmount),
    subtotal: intent.subtotal,
    discount: intent.discount,
    shippingFee: intent.shippingFee,
    couponCode: intent.couponCode,
    itemsDigest: intent.itemsDigest,
    card: card ? {
      issuerCode: nullableString(card.issuerCode),
      acquirerCode: nullableString(card.acquirerCode),
      number: cardNumber,
      cardLast4: cardDigits.length >= 4 ? cardDigits.slice(-4) : null,
      cardType: nullableString(card.cardType),
      ownerType: nullableString(card.ownerType),
      installmentPlanMonths: nullableNumber(card.installmentPlanMonths),
      isInterestFree: typeof card.isInterestFree === "boolean" ? card.isInterestFree : null,
      approveNo: nullableString(card.approveNo),
    } : null,
    easyPay: easyPay ? {
      provider: nullableString(easyPay.provider),
      amount: nullableNumber(easyPay.amount),
      discountAmount: nullableNumber(easyPay.discountAmount),
    } : null,
    receiptUrl: receipt ? nullableString(receipt.url) : null,
  };
}

async function confirmPayment(request: Request, secret: string) {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return errorResponse(request, 400, "INVALID_REQUEST", "결제 승인 요청 형식을 확인해 주세요.");
  }

  if (
    !isRecord(body) ||
    typeof body.paymentKey !== "string" ||
    body.paymentKey.length < 10 ||
    body.paymentKey.length > 300 ||
    !validateOrderId(body.orderId) ||
    !Number.isSafeInteger(body.amount) ||
    (body.amount as number) <= 0 ||
    typeof body.intentToken !== "string" ||
    body.intentToken.length > 2_000
  ) return errorResponse(request, 400, "INVALID_CONFIRM_REQUEST", "결제 승인 정보를 확인해 주세요.");

  const intent = await verifyIntent(body.intentToken, secret);
  if (!intent) return errorResponse(request, 400, "INVALID_PAYMENT_INTENT", "결제 요청이 만료되었거나 유효하지 않습니다. 다시 결제해 주세요.");
  if (intent.orderId !== body.orderId || intent.amount !== body.amount) {
    return errorResponse(request, 400, "PAYMENT_AMOUNT_MISMATCH", "주문번호 또는 결제 금액이 일치하지 않습니다.");
  }

  let tossResponse: Response;
  try {
    tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${secret}:`)}`,
        "Content-Type": "application/json",
        "Idempotency-Key": body.orderId,
      },
      body: JSON.stringify({ paymentKey: body.paymentKey, orderId: body.orderId, amount: body.amount }),
    });
  } catch {
    return errorResponse(request, 502, "PAYMENT_GATEWAY_UNAVAILABLE", "결제 승인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  let responseBody: unknown;
  try {
    responseBody = await tossResponse.json();
  } catch {
    return errorResponse(request, 502, "INVALID_GATEWAY_RESPONSE", "결제 승인 결과를 확인하지 못했습니다.");
  }

  if (!tossResponse.ok) {
    const tossError = isRecord(responseBody) ? responseBody : {};
    const code = nullableString(tossError.code) ?? "PAYMENT_CONFIRM_FAILED";
    const message = nullableString(tossError.message) ?? "결제를 승인하지 못했습니다.";
    return errorResponse(request, tossResponse.status >= 400 && tossResponse.status < 600 ? tossResponse.status : 502, code, message);
  }
  if (!isRecord(responseBody)) return errorResponse(request, 502, "INVALID_GATEWAY_RESPONSE", "결제 승인 결과를 확인하지 못했습니다.");
  if (
    responseBody.paymentKey !== body.paymentKey ||
    responseBody.orderId !== intent.orderId ||
    responseBody.totalAmount !== intent.amount ||
    responseBody.status !== "DONE"
  ) {
    return errorResponse(request, 502, "INVALID_PAYMENT_RESULT", "승인된 결제 정보가 주문 정보와 일치하지 않습니다.");
  }

  return jsonResponse(request, sanitizeConfirmedPayment(responseBody, intent));
}

async function handlePaymentApi(request: Request, env: Env, pathname: string) {
  const { headers, originAllowed } = corsHeaders(request);
  if (!originAllowed) return errorResponse(request, 403, "ORIGIN_NOT_ALLOWED", "허용되지 않은 요청 출처입니다.");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return errorResponse(request, 405, "METHOD_NOT_ALLOWED", "POST 요청만 사용할 수 있습니다.");

  const secret = env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  if (!secret) return errorResponse(request, 503, "TOSS_CONFIG_REQUIRED", "테스트 결제 설정이 완료되지 않았습니다.");
  if (pathname === `${API_PREFIX}prepare`) return preparePayment(request, secret);
  if (pathname === `${API_PREFIX}confirm`) return confirmPayment(request, secret);
  return errorResponse(request, 404, "NOT_FOUND", "결제 API 경로를 찾을 수 없습니다.");
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith(API_PREFIX)) {
      return handlePaymentApi(request, env, url.pathname);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
