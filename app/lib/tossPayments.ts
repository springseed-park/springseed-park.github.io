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

export async function tossCustomerKey(firebaseUid: string) {
  const source = new TextEncoder().encode(firebaseUid);
  const digest = await crypto.subtle.digest("SHA-256", source);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `me_${base64}`;
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
  };
  return messages[code] || message || "결제창을 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
