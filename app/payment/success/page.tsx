"use client";

import { Check, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PaymentInfo } from "../../components/AuthProvider";
import { useAuth } from "../../components/AuthProvider";
import StaticLink from "../../components/StaticLink";
import { useStore } from "../../components/StoreProvider";
import {
  paymentApiFetch,
  tossItemsDigest,
  type PendingTossOrder,
  TOSS_PENDING_ORDER_KEY,
} from "../../lib/tossPayments";

const COMPLETION_KEY_PREFIX = "maison-toss-completed:";

type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  approvedAt?: string;
  method?: string;
  totalAmount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  couponCode: string | null;
  itemsDigest: string;
  receiptUrl?: string;
  receipt?: { url?: string } | null;
  easyPayProvider?: string;
  easyPay?: { provider: string | null; amount: number | null; discountAmount: number | null } | null;
  cardCompany?: string;
  cardNumber?: string;
  card?: {
    issuerCode: string | null;
    acquirerCode: string | null;
    number: string | null;
    cardLast4: string | null;
    cardType: string | null;
    ownerType: string | null;
    installmentPlanMonths: number | null;
    isInterestFree: boolean | null;
    approveNo: string | null;
  } | null;
};

type CompletionMarker = {
  userUid: string;
  orderId: string;
  savedOrderId: string;
  amount: number;
  completedAt: string;
};

type ViewState =
  | { status: "loading"; message: string }
  | { status: "success"; orderId: string }
  | { status: "error"; message: string; loginRequired?: boolean; approved?: boolean };

function safeText(value: string, fallback: string) {
  const sanitized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("").replace(/\s+/g, " ").trim().slice(0, 180);
  return sanitized || fallback;
}

function errorMessage(error: unknown) {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  return safeText(message, "결제 승인 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

function readPendingOrder(): PendingTossOrder | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOSS_PENDING_ORDER_KEY) || "null") as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const order = parsed as Partial<PendingTossOrder>;
    if (
      typeof order.userUid !== "string"
      || typeof order.orderId !== "string"
      || typeof order.intentToken !== "string"
      || typeof order.itemsDigest !== "string"
      || typeof order.amount !== "number"
      || !Number.isSafeInteger(order.amount)
      || order.amount <= 0
      || typeof order.subtotal !== "number"
      || typeof order.discount !== "number"
      || typeof order.shippingFee !== "number"
      || !order.shippingAddress
      || typeof order.shippingAddress.recipient !== "string"
      || !Array.isArray(order.items)
      || order.items.length === 0
      || typeof order.email !== "string"
      || typeof order.phone !== "string"
    ) return null;
    return order as PendingTossOrder;
  } catch {
    return null;
  }
}

function readCompletionMarker(orderId: string): CompletionMarker | null {
  try {
    const marker = JSON.parse(localStorage.getItem(`${COMPLETION_KEY_PREFIX}${orderId}`) || "null") as CompletionMarker | null;
    return marker?.orderId === orderId && marker.savedOrderId ? marker : null;
  } catch {
    return null;
  }
}

function cardLast4(number?: string | null) {
  const digits = number?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

function syncAdminCache(pending: PendingTossOrder, payment: PaymentInfo) {
  try {
    const savedOrders = JSON.parse(localStorage.getItem("maison-admin-orders") || "[]") as Array<Record<string, unknown> & { id?: string }>;
    const isNewAdminOrder = !savedOrders.some((order) => order.id === pending.orderId);
    if (isNewAdminOrder) {
      savedOrders.unshift({
        id: pending.orderId,
        customer: pending.shippingAddress.recipient,
        email: pending.email,
        phone: pending.shippingAddress.phone || pending.phone,
        address: `${pending.shippingAddress.addressLine1} ${pending.shippingAddress.addressLine2}`.trim(),
        items: pending.items,
        amount: pending.amount,
        payment,
        date: new Date(payment.approvedAt || payment.paidAt || Date.now()).toLocaleString("ko-KR"),
        status: "결제완료",
        courier: "",
        trackingNumber: "",
        memo: pending.memo,
      });
      localStorage.setItem("maison-admin-orders", JSON.stringify(savedOrders));
    }

    if (isNewAdminOrder) {
      const savedMembers = JSON.parse(localStorage.getItem("maison-admin-members") || "[]") as Array<Record<string, unknown> & { email?: string; orderCount?: number; totalSpent?: number }>;
      localStorage.setItem("maison-admin-members", JSON.stringify(savedMembers.map((member) => member.email === pending.email ? {
        ...member,
        orderCount: Number(member.orderCount || 0) + 1,
        totalSpent: Number(member.totalSpent || 0) + pending.amount,
      } : member)));
    }
    window.dispatchEvent(new CustomEvent("maison-storage-updated", { detail: { key: "maison-admin-orders" } }));
  } catch {
    // The authenticated Firestore order remains the customer-facing source of truth.
  }
}

export default function PaymentSuccessPage() {
  const auth = useAuth();
  const { clearCart } = useStore();
  const startedRef = useRef(false);
  const [view, setView] = useState<ViewState>({ status: "loading", message: "결제 승인 정보를 안전하게 확인하는 중입니다." });

  useEffect(() => {
    if (auth.loading || startedRef.current) return;
    startedRef.current = true;

    const finalize = async () => {
      const search = new URLSearchParams(window.location.search);
      const paymentKey = search.get("paymentKey")?.trim() ?? "";
      const orderId = search.get("orderId")?.trim() ?? "";
      const amountText = search.get("amount")?.trim() ?? "";
      const amount = Number(amountText);

      if (!auth.user) {
        setView({ status: "error", message: "주문한 계정으로 다시 로그인한 뒤 결제 완료 처리를 이어가 주세요.", loginRequired: true });
        return;
      }
      if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) {
        setView({ status: "error", message: "결제 결과 정보가 올바르지 않아 주문을 완료할 수 없습니다." });
        return;
      }

      const marker = readCompletionMarker(orderId);
      if (marker?.userUid === auth.user.uid && marker.amount === amount) {
        setView({ status: "success", orderId });
        return;
      }

      const pending = readPendingOrder();
      if (!pending) {
        setView({ status: "error", message: "이 브라우저에서 주문 확인 정보를 찾지 못했습니다. 결제가 승인됐다면 재결제하지 말고 고객센터에 문의해 주세요." });
        return;
      }
      if (pending.userUid !== auth.user.uid) {
        setView({ status: "error", message: "결제를 시작한 회원 계정과 현재 계정이 다릅니다. 올바른 계정으로 다시 로그인해 주세요.", loginRequired: true });
        return;
      }
      if (pending.orderId !== orderId || pending.amount !== amount) {
        setView({ status: "error", message: "주문번호 또는 결제금액이 처음 요청한 내용과 달라 결제를 중단했습니다." });
        return;
      }

      let approved = false;
      try {
        const pendingItemsDigest = await tossItemsDigest(pending.items);
        const confirmed = await paymentApiFetch<TossConfirmResponse>("/api/payments/confirm", {
          method: "POST",
          body: JSON.stringify({ paymentKey, orderId, amount, intentToken: pending.intentToken }),
        });
        approved = true;

        if (
          confirmed.paymentKey !== paymentKey
          || confirmed.orderId !== orderId
          || confirmed.totalAmount !== amount
          || confirmed.status !== "DONE"
          || confirmed.subtotal !== pending.subtotal
          || confirmed.discount !== pending.discount
          || confirmed.shippingFee !== pending.shippingFee
          || confirmed.couponCode !== (pending.coupon?.code ?? null)
          || confirmed.itemsDigest !== pending.itemsDigest
          || pendingItemsDigest !== confirmed.itemsDigest
        ) throw new Error("서버에서 확인한 결제 정보가 주문 내용과 일치하지 않습니다.");

        const rawCardNumber = confirmed.cardNumber || confirmed.card?.number;
        const last4 = confirmed.card?.cardLast4 || cardLast4(rawCardNumber);
        const receiptUrl = confirmed.receiptUrl || confirmed.receipt?.url;
        const easyPayProvider = confirmed.easyPayProvider || confirmed.easyPay?.provider;
        const cardCompany = confirmed.cardCompany || confirmed.card?.issuerCode;
        const payment: PaymentInfo = {
          subtotal: confirmed.subtotal,
          discount: confirmed.discount,
          shippingFee: confirmed.shippingFee,
          paidAmount: confirmed.totalAmount,
          method: easyPayProvider || confirmed.method || "토스페이먼츠",
          paymentKey: confirmed.paymentKey,
          orderId: confirmed.orderId,
          status: confirmed.status,
          provider: "Toss Payments Test",
          paidAt: confirmed.approvedAt || new Date().toISOString(),
          ...(confirmed.approvedAt ? { approvedAt: confirmed.approvedAt } : {}),
          ...(receiptUrl ? { receiptUrl } : {}),
          ...(easyPayProvider ? { easyPayProvider } : {}),
          ...(cardCompany ? { cardCompany } : {}),
          ...(rawCardNumber ? { cardNumber: rawCardNumber } : {}),
          ...(last4 ? { cardLast4: last4 } : {}),
          ...(confirmed.card?.cardType ? { cardType: confirmed.card.cardType } : {}),
          ...(confirmed.card?.ownerType ? { cardOwnerType: confirmed.card.ownerType } : {}),
          ...(typeof confirmed.card?.installmentPlanMonths === "number" ? { installmentPlanMonths: confirmed.card.installmentPlanMonths } : {}),
          ...(typeof confirmed.card?.isInterestFree === "boolean" ? { isInterestFree: confirmed.card.isInterestFree } : {}),
          ...(pending.coupon ? { couponName: pending.coupon.name, couponCode: pending.coupon.code } : {}),
        };

        const savedOrderId = await auth.createOrder({
          orderNumber: pending.orderId,
          total: confirmed.totalAmount,
          status: "상품 준비",
          courier: "배송 준비 중",
          trackingNumber: "발급 예정",
          shippingAddress: pending.shippingAddress,
          items: pending.items,
          payment,
        });
        if (!savedOrderId) throw new Error("회원 정보를 확인할 수 없어 주문 내역을 저장하지 못했습니다.");

        if (pending.coupon) {
          try { await auth.useCoupon(pending.coupon.id); } catch { /* A completed payment must not be rolled back by coupon cache failure. */ }
        }
        syncAdminCache(pending, payment);
        const completion: CompletionMarker = {
          userUid: pending.userUid,
          orderId: pending.orderId,
          savedOrderId,
          amount: confirmed.totalAmount,
          completedAt: new Date().toISOString(),
        };
        localStorage.setItem(`${COMPLETION_KEY_PREFIX}${pending.orderId}`, JSON.stringify(completion));
        localStorage.removeItem(TOSS_PENDING_ORDER_KEY);
        if (pending.isBuyNow) localStorage.removeItem("elan-buy-now");
        else clearCart();
        window.scrollTo({ top: 0, behavior: "smooth" });
        setView({ status: "success", orderId: pending.orderId });
      } catch (error) {
        setView({
          status: "error",
          message: approved
            ? "결제 승인은 완료됐지만 주문 내역을 저장하는 중 문제가 발생했습니다. 재결제하지 말고 주문번호로 문의해 주세요."
            : errorMessage(error),
          approved,
        });
      }
    };

    void finalize();
  }, [auth.loading, auth.user, auth, clearCart]);

  if (view.status === "loading") return (
    <main id="content" className="inner-page utility-page">
      <section className="account-loading" role="status" aria-live="polite">
        <span aria-hidden="true" />
        <p>{view.message}</p>
        <small>창을 닫거나 뒤로 가지 말고 잠시만 기다려 주세요.</small>
      </section>
    </main>
  );

  if (view.status === "success") return (
    <main id="content" className="inner-page utility-page">
      <section className="checkout-complete" aria-labelledby="payment-complete-title">
        <span aria-hidden="true"><Check size={34} /></span>
        <p className="eyebrow dark">PAYMENT COMPLETE</p>
        <h1 id="payment-complete-title">Thank you.</h1>
        <p>토스페이먼츠 테스트 결제와 주문 접수가 완료됐습니다.<br />주문번호는 <strong>{view.orderId}</strong>입니다.</p>
        <StaticLink className="primary-button" href="/account">주문·배송 내역 확인</StaticLink>
      </section>
    </main>
  );

  return (
    <main id="content" className="inner-page utility-page">
      <section className="checkout-auth-gate" aria-labelledby="payment-error-title">
        <span aria-hidden="true">{view.loginRequired ? <LogIn /> : <ShieldCheck />}</span>
        <p className="eyebrow dark">PAYMENT CHECK</p>
        <h1 id="payment-error-title">결제 확인을<br />완료하지 못했어요.</h1>
        <p className="form-message error" role="alert">{view.message}</p>
        <div>
          {view.loginRequired ? (
            <StaticLink className="primary-button" href={`/account?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>로그인하기</StaticLink>
          ) : view.approved ? (
            <StaticLink className="primary-button" href="/support">고객센터 문의</StaticLink>
          ) : (
            <button className="primary-button" type="button" onClick={() => window.location.reload()}><RefreshCw size={17} />다시 확인</button>
          )}
          <StaticLink className="secondary-button" href="/account">마이페이지</StaticLink>
        </div>
      </section>
    </main>
  );
}
