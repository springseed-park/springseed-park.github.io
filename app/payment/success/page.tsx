"use client";

import { Check, LogIn, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PaymentInfo } from "../../components/AuthProvider";
import { useAuth } from "../../components/AuthProvider";
import StaticLink from "../../components/StaticLink";
import { useStore } from "../../components/StoreProvider";
import { type PendingTossOrder, TOSS_PENDING_ORDER_KEY } from "../../lib/tossPayments";

const COMPLETION_KEY_PREFIX = "maison-toss-test-completed:";

type ViewState =
  | { status: "loading" }
  | { status: "success"; orderId: string }
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
        setView({ status: "error", message: "주문한 계정으로 다시 로그인한 뒤 테스트 주문을 완료해 주세요.", loginRequired: true });
        return;
      }
      if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount < 100) {
        setView({ status: "error", message: "토스페이먼츠 테스트 결과 정보가 올바르지 않습니다." });
        return;
      }
      if (localStorage.getItem(`${COMPLETION_KEY_PREFIX}${orderId}`)) {
        setView({ status: "success", orderId });
        return;
      }

      const pending = readPendingOrder();
      if (!pending || pending.userUid !== auth.user.uid || pending.orderId !== orderId || pending.amount !== amount) {
        setView({ status: "error", message: "처음 요청한 테스트 주문 정보와 결제 결과가 일치하지 않습니다." });
        return;
      }

      try {
        const now = new Date().toISOString();
        const payment: PaymentInfo = {
          subtotal: pending.subtotal,
          discount: pending.discount,
          shippingFee: pending.shippingFee,
          paidAmount: pending.amount,
          method: "토스페이먼츠 테스트 결제",
          paymentKey,
          orderId,
          status: "TEST_COMPLETED",
          provider: "Toss Payments Test",
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
        localStorage.setItem(`${COMPLETION_KEY_PREFIX}${orderId}`, JSON.stringify({ orderId, savedOrderId, amount, completedAt: now }));
        localStorage.removeItem(TOSS_PENDING_ORDER_KEY);
        if (pending.isBuyNow) localStorage.removeItem("elan-buy-now");
        else clearCart();
        setView({ status: "success", orderId });
      } catch {
        setView({ status: "error", message: "테스트 결제 결과를 주문 내역에 저장하지 못했습니다. 다시 시도해 주세요." });
      }
    };

    void finalize();
  }, [auth, auth.loading, auth.user, clearCart]);

  if (view.status === "loading") return <main id="content" className="inner-page utility-page"><section className="account-loading" role="status"><span /><p>토스페이먼츠 테스트 결과를 확인하는 중입니다.</p></section></main>;

  if (view.status === "success") return (
    <main id="content" className="inner-page utility-page"><section className="checkout-complete" aria-labelledby="payment-complete-title"><span><Check size={34} /></span><p className="eyebrow dark">TEST PAYMENT COMPLETE</p><h1 id="payment-complete-title">Test complete.</h1><p>실제 청구 없이 토스페이먼츠 테스트 결제와 주문 접수가 완료됐습니다.<br />주문번호는 <strong>{view.orderId}</strong>입니다.</p><StaticLink className="primary-button" href="/account">테스트 주문 내역 확인</StaticLink></section></main>
  );

  return (
    <main id="content" className="inner-page utility-page"><section className="checkout-auth-gate" aria-labelledby="payment-error-title"><span>{view.loginRequired ? <LogIn /> : <ShieldCheck />}</span><p className="eyebrow dark">TEST PAYMENT CHECK</p><h1 id="payment-error-title">테스트 결과를<br />확인하지 못했어요.</h1><p className="form-message error" role="alert">{view.message}</p><div>{view.loginRequired && <StaticLink className="primary-button" href={`/account?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>로그인하기</StaticLink>}<StaticLink className="secondary-button" href="/checkout">결제로 돌아가기</StaticLink></div></section></main>
  );
}
