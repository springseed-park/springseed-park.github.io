export const TOSS_WIDGET_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
export const TOSS_PENDING_ORDER_KEY = "maison-toss-pending-order";

export type TossPrepareItem = {
  id: string;
  size: string;
  color: string;
  quantity: number;
};

export type PendingTossOrderItem = TossPrepareItem & {
  name: string;
  price: number;
  image: string;
};

export type PendingTossAddress = {
  recipient: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
};

export type PendingTossCoupon = {
  id: string;
  name: string;
  code: string;
};

export type PendingTossOrder = {
  userUid: string;
  orderId: string;
  orderName: string;
  intentToken: string;
  itemsDigest: string;
  amount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  coupon: PendingTossCoupon | null;
  shippingAddress: PendingTossAddress;
  items: PendingTossOrderItem[];
  customerName: string;
  email: string;
  phone: string;
  memo: string;
  isBuyNow: boolean;
  createdAt: string;
};

export type TossPrepareRequest = {
  orderId: string;
  items: TossPrepareItem[];
  couponCode?: string;
};

export type TossPrepareResponse = {
  orderId: string;
  orderName: string;
  amount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  intentToken: string;
  itemsDigest: string;
};

type PaymentApiErrorPayload = {
  code?: string;
  message?: string;
};

function normalizeApiOrigin(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

export function paymentApiUrl(path: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_TOSS_API_ORIGIN?.trim();
  const origin = configuredOrigin
    ? normalizeApiOrigin(configuredOrigin)
    : typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function paymentApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(paymentApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T & PaymentApiErrorPayload;
  if (!response.ok) {
    const error = new Error(payload.message || "결제 서버 요청을 처리하지 못했습니다.");
    Object.assign(error, { code: payload.code || `HTTP_${response.status}`, status: response.status });
    throw error;
  }
  return payload;
}

export async function tossCustomerKey(firebaseUid: string) {
  const source = new TextEncoder().encode(firebaseUid);
  const digest = await crypto.subtle.digest("SHA-256", source);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `me_${base64}`;
}

export async function tossItemsDigest(items: TossPrepareItem[]) {
  const canonical = items.map(({ id, size, color, quantity }) => ({ id, size, color, quantity }));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical)));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function tossPaymentErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  const messages: Record<string, string> = {
    USER_CANCEL: "결제를 취소했습니다. 주문 정보는 그대로 보관됩니다.",
    PAY_PROCESS_CANCELED: "결제를 취소했습니다. 주문 정보는 그대로 보관됩니다.",
    PAY_PROCESS_ABORTED: "결제를 진행할 수 없습니다. 결제 수단을 확인해 주세요.",
    REJECT_CARD_COMPANY: "카드 승인이 거절되었습니다. 다른 결제 수단을 이용해 주세요.",
    BELOW_ZERO_AMOUNT: "결제 금액을 확인해 주세요.",
    TOSS_CONFIG_REQUIRED: "테스트 결제 서버 설정이 필요합니다. 관리자에게 문의해 주세요.",
    PAYMENT_NOT_CONFIGURED: "테스트 결제 서버 설정이 필요합니다. 관리자에게 문의해 주세요.",
  };
  return messages[code] || message || "결제창을 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
