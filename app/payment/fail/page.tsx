"use client";

import { ArrowLeft, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import StaticLink from "../../components/StaticLink";
import { type PendingTossOrder, TOSS_PENDING_ORDER_KEY } from "../../lib/tossPayments";

type FailureInfo = {
  code: string;
  message: string;
  orderId: string;
  retryHref: string;
};

function safeCode(value: string | null) {
  return (value || "PAYMENT_FAILED").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) || "PAYMENT_FAILED";
}

function safeMessage(value: string | null) {
  const sanitized = Array.from(value || "", (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("").replace(/\s+/g, " ").trim().slice(0, 180);
  return sanitized || "결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요.";
}

function pendingOrder(): PendingTossOrder | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOSS_PENDING_ORDER_KEY) || "null") as Partial<PendingTossOrder> | null;
    return parsed?.orderId && typeof parsed.isBuyNow === "boolean" ? parsed as PendingTossOrder : null;
  } catch {
    return null;
  }
}

export default function PaymentFailPage() {
  const [failure, setFailure] = useState<FailureInfo | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      const pending = pendingOrder();
      const queryOrderId = query.get("orderId")?.trim() ?? "";
      setFailure({ code: safeCode(query.get("code")), message: safeMessage(query.get("message")), orderId: queryOrderId && queryOrderId === pending?.orderId ? queryOrderId : pending?.orderId ?? "", retryHref: pending?.isBuyNow ? "/checkout?mode=buy-now" : "/checkout" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!failure) return (
    <main id="content" className="inner-page utility-page">
      <section className="account-loading" role="status" aria-live="polite"><span aria-hidden="true" /><p>결제 결과를 확인하는 중입니다.</p></section>
    </main>
  );

  return (
    <main id="content" className="inner-page utility-page">
      <section className="checkout-auth-gate" aria-labelledby="payment-fail-title">
        <span aria-hidden="true"><X /></span>
        <p className="eyebrow dark">PAYMENT NOT COMPLETED</p>
        <h1 id="payment-fail-title">결제가<br />완료되지 않았어요.</h1>
        <p className="form-message error" role="alert">{failure.message}</p>
        <p>주문 정보와 사용하려던 쿠폰, 쇼핑백 상품은 그대로 보관되었습니다.<br />결제 수단을 확인한 뒤 다시 시도해 주세요.</p>
        <div>
          <StaticLink className="primary-button" href={failure.retryHref}><RefreshCw size={17} />결제 다시 시도</StaticLink>
          <StaticLink className="secondary-button" href="/cart"><ArrowLeft size={17} />쇼핑백으로</StaticLink>
        </div>
        <small>오류 코드 {failure.code}{failure.orderId ? ` · 주문번호 ${failure.orderId}` : ""}</small>
      </section>
    </main>
  );
}
