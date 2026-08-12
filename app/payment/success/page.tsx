"use client";

import { Check, CreditCard, LogIn, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PaymentInfo } from "../../components/AuthProvider";
import { useAuth } from "../../components/AuthProvider";
import StaticLink from "../../components/StaticLink";
import { useStore } from "../../components/StoreProvider";
import { type PendingTossOrder, TOSS_PENDING_ORDER_KEY } from "../../lib/tossPayments";

const COMPLETION_KEY_PREFIX = "maison-toss-test-completed:";

type ViewState =
  | { status: "loading" }
  | { status: "success"; orderId: string; order: PendingTossOrder | null }
  | { status: "error"; message: string; loginRequired?: boolean };

function readPendingOrder(): PendingTossOrder | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOSS_PENDING_ORDER_KEY) || "null") as Partial<PendingTossOrder> | null;
    if (!parsed?.userUid || !parsed.orderId || !Number.isSafeInteger(parsed.amount) || !parsed.items?.length || !parsed.shippingAddress) return null;
    return parsed as PendingTossOrder;
  } catch {
    return null;
  }
}

function readCompletedOrder(orderId: string): PendingTossOrder | null {
  try {
    const marker = JSON.parse(localStorage.getItem(`${COMPLETION_KEY_PREFIX}${orderId}`) || "null") as { order?: PendingTossOrder } | null;
    return marker?.order?.orderId === orderId ? marker.order : null;
  } catch {
    return null;
  }
}

function syncAdminCache(pending: PendingTossOrder, payment: PaymentInfo) {
  try {
    const savedOrders = JSON.parse(localStorage.getItem("maison-admin-orders") || "[]") as Array<Record<string, unknown> & { id?: string }>;
    if (!savedOrders.some((order) => order.id === pending.orderId)) {
      savedOrders.unshift({
        id: pending.orderId,
        customer: pending.shippingAddress.recipient,
        email: pending.email,
        phone: pending.shippingAddress.phone || pending.phone,
        address: `${pending.shippingAddress.addressLine1} ${pending.shippingAddress.addressLine2}`.trim(),
        items: pending.items,
        amount: pending.amount,
        payment,
        date: new Date().toLocaleString("ko-KR"),
        status: "결제완료",
        courier: "",
        trackingNumber: "",
        memo: pending.memo,
      });
      localStorage.setItem("maison-admin-orders", JSON.stringify(savedOrders));
      window.dispatchEvent(new CustomEvent("maison-storage-updated", { detail: { key: "maison-admin-orders" } }));
    }
  } catch {
    // Firestore order history remains available even if the local admin preview cache fails.
  }
}

export default function PaymentSuccessPage() {
  const auth = useAuth();
  const { clearCart } = useStore();
  const startedRef = useRef(false);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    if (auth.loading || startedRef.current) return;
    startedRef.current = true;

    const finalize = async () => {
      const query = new URLSearchParams(window.location.search);
      const paymentKey = query.get("paymentKey")?.trim() ?? "";
      const orderId = query.get("orderId")?.trim() ?? "";
      const amount = Number(query.get("amount"));

      if (!auth.user) {
        setView({ status: "error", message: "주문한 계정으로 다시 로그인한 뒤 주문 완료 처리를 이어가 주세요.", loginRequired: true });
        return;
      }
      if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount < 100) {
        setView({ status: "error", message: "결제 결과 정보가 올바르지 않습니다." });
        return;
      }
      if (localStorage.getItem(`${COMPLETION_KEY_PREFIX}${orderId}`)) {
        const completedOrder = readCompletedOrder(orderId) ?? readPendingOrder();
        if (completedOrder) {
          const restoredPayment: PaymentInfo = {
            subtotal: completedOrder.subtotal,
            discount: completedOrder.discount,
            shippingFee: completedOrder.shippingFee,
            paidAmount: completedOrder.amount,
            method: "토스페이먼츠",
            paymentKey,
            orderId,
            status: "결제완료",
            provider: "토스페이먼츠",
            paidAt: new Date().toISOString(),
          };
          syncAdminCache(completedOrder, restoredPayment);
        }
        setView({ status: "success", orderId, order: completedOrder });
        return;
      }

      const pending = readPendingOrder();
      if (!pending || pending.userUid !== auth.user.uid || pending.orderId !== orderId || pending.amount !== amount) {
        setView({ status: "error", message: "처음 요청한 주문 정보와 결제 결과가 일치하지 않습니다." });
        return;
      }

      try {
        const now = new Date().toISOString();
        const payment: PaymentInfo = {
          subtotal: pending.subtotal,
          discount: pending.discount,
          shippingFee: pending.shippingFee,
          paidAmount: pending.amount,
          method: "토스페이먼츠",
          paymentKey,
          orderId,
          status: "결제완료",
          provider: "토스페이먼츠",
          paidAt: now,
          ...(pending.coupon ? { couponName: pending.coupon.name, couponCode: pending.coupon.code } : {}),
        };
        const savedOrderId = await auth.createOrder({
          orderNumber: pending.orderId,
          total: pending.amount,
          status: "상품 준비",
          courier: "배송 준비 중",
          trackingNumber: "발급 예정",
          shippingAddress: pending.shippingAddress,
          items: pending.items,
          payment,
        });
        if (!savedOrderId) throw new Error("주문 내역을 저장하지 못했습니다.");
        if (pending.coupon) await auth.useCoupon(pending.coupon.id).catch(() => undefined);
        syncAdminCache(pending, payment);
        localStorage.setItem(`${COMPLETION_KEY_PREFIX}${orderId}`, JSON.stringify({ orderId, savedOrderId, amount, completedAt: now, order: pending }));
        localStorage.removeItem(TOSS_PENDING_ORDER_KEY);
        if (pending.isBuyNow) localStorage.removeItem("elan-buy-now");
        else clearCart();
        setView({ status: "success", orderId, order: pending });
      } catch {
        setView({ status: "error", message: "결제 결과를 주문 내역에 저장하지 못했습니다. 다시 시도해 주세요." });
      }
    };

    void finalize();
  }, [auth, auth.loading, auth.user, clearCart]);

  if (view.status === "loading") return <main id="content" className="inner-page utility-page"><section className="account-loading" role="status"><span /><p>결제 결과를 확인하는 중입니다.</p></section></main>;

  if (view.status === "success") return (
    <main id="content" className="inner-page utility-page"><section className="checkout-complete order-complete" aria-labelledby="payment-complete-title"><span className="order-complete-icon"><Check size={34} /></span><p className="eyebrow dark">ORDER COMPLETE</p><h1 id="payment-complete-title">Thank you.</h1><p className="order-complete-lead">주문이 정상적으로 완료되었습니다.<br />상품이 준비되는 대로 배송을 시작하겠습니다.</p><dl className="order-complete-summary"><div><dt>주문번호</dt><dd>{view.orderId}</dd></div>{view.order && <><div><dt>결제금액</dt><dd>{new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(view.order.amount)}</dd></div><div><dt>결제수단</dt><dd>토스페이먼츠</dd></div><div><dt>받는 분</dt><dd>{view.order.shippingAddress.recipient}</dd></div><div><dt>배송지</dt><dd>[{view.order.shippingAddress.postalCode}] {view.order.shippingAddress.addressLine1} {view.order.shippingAddress.addressLine2}</dd></div></>}</dl><div className="order-complete-steps"><span><CreditCard /><strong>결제 완료</strong></span><i /><span><PackageCheck /><strong>상품 준비</strong></span><i /><span><Truck /><strong>배송 예정</strong></span></div><div className="order-complete-actions"><StaticLink className="primary-button" href="/account">주문·배송 내역 확인</StaticLink><StaticLink className="secondary-button" href="/shop">쇼핑 계속하기</StaticLink></div></section></main>
  );

  return (
    <main id="content" className="inner-page utility-page"><section className="checkout-auth-gate" aria-labelledby="payment-error-title"><span>{view.loginRequired ? <LogIn /> : <ShieldCheck />}</span><p className="eyebrow dark">PAYMENT CHECK</p><h1 id="payment-error-title">결제 결과를<br />확인하지 못했어요.</h1><p className="form-message error" role="alert">{view.message}</p><div>{view.loginRequired && <StaticLink className="primary-button" href={`/account?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>로그인하기</StaticLink>}<StaticLink className="secondary-button" href="/checkout">결제로 돌아가기</StaticLink></div></section></main>
  );
}
