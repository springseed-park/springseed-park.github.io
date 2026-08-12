"use client";

import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { ChevronLeft, CreditCard, LockKeyhole, LogIn, PackageCheck, ShieldCheck, TicketPercent } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "../components/StaticLink";
import { MemberCoupon, useAuth } from "../components/AuthProvider";
import PostcodeFields from "../components/PostcodeFields";
import { useStore } from "../components/StoreProvider";
import { formatPrice, getProduct } from "../lib/products";
import {
  TOSS_PENDING_ORDER_KEY,
  TOSS_WIDGET_CLIENT_KEY,
  tossCustomerKey,
  tossPaymentErrorMessage,
} from "../lib/tossPayments";
import type { PendingTossOrder } from "../lib/tossPayments";

type CheckoutLine = { id: string; size: string; color: string; quantity: number };

function calculateCouponDiscount(coupon: MemberCoupon, subtotal: number) {
  if (subtotal < coupon.minimumPurchase) return 0;
  const discount = coupon.discountType === "percent" ? Math.floor(subtotal * coupon.value / 100) : coupon.value;
  return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
}

function makeOrderId() {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const sequence = String(crypto.getRandomValues(new Uint16Array(1))[0] % 10_000).padStart(4, "0");
  return `ME-${date}-${sequence}`;
}

function fallbackOrderName(lines: CheckoutLine[]) {
  if (!lines.length) return "MAISON ÉLAN 주문";
  const firstName = getProduct(lines[0].id).name;
  return lines.length === 1 ? firstName : `${firstName} 외 ${lines.length - 1}건`;
}

export default function CheckoutPage() {
  const { cart } = useStore();
  const auth = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [buyNowLine, setBuyNowLine] = useState<CheckoutLine | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetError, setWidgetError] = useState("");
  const [widgetAttempt, setWidgetAttempt] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState("__default__");
  const [checkoutStartedAt] = useState(Date.now);
  const widgetSetupRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let savedLine: CheckoutLine | null = null;
    if (new URLSearchParams(window.location.search).get("mode") === "buy-now") {
      try {
        const saved = JSON.parse(localStorage.getItem("elan-buy-now") || "null") as CheckoutLine | null;
        if (saved?.id && saved.size && saved.color) savedLine = { ...saved, quantity: 1 };
      } catch { /* fall back to the regular shopping bag */ }
    }
    const finalizeCheckoutSetup = window.setTimeout(() => {
      setBuyNowLine(savedLine);
      setCheckoutReady(true);
    }, 0);
    return () => window.clearTimeout(finalizeCheckoutSetup);
  }, []);

  const orderLines = buyNowLine ? [buyNowLine] : cart;
  const isBuyNow = Boolean(buyNowLine);
  const subtotal = orderLines.reduce((sum, line) => sum + getProduct(line.id).price * line.quantity, 0);
  const availableCoupons = (auth.profile?.coupons ?? []).filter((coupon) => !coupon.used && (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() > checkoutStartedAt));
  const savedAddresses = auth.profile?.addresses ?? [];
  const defaultAddress = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];
  const selectedAddress = selectedAddressId === "__new__"
    ? undefined
    : selectedAddressId === "__default__"
      ? defaultAddress
      : savedAddresses.find((address) => address.id === selectedAddressId) ?? defaultAddress;
  const addressFormKey = selectedAddress?.id ?? "new-address";
  const eligibleCoupons = availableCoupons.filter((coupon) => calculateCouponDiscount(coupon, subtotal) > 0);
  const bestCoupon = eligibleCoupons.length ? eligibleCoupons.reduce((best, coupon) => calculateCouponDiscount(coupon, subtotal) > calculateCouponDiscount(best, subtotal) ? coupon : best) : undefined;
  const effectiveCouponCode = couponCode ?? bestCoupon?.code ?? "";
  const selectedCoupon = availableCoupons.find((coupon) => coupon.code === effectiveCouponCode);
  const discount = selectedCoupon ? calculateCouponDiscount(selectedCoupon, subtotal) : 0;
  const shippingFee = 0;
  const total = Math.max(0, subtotal - discount + shippingFee);

  useEffect(() => {
    if (!checkoutReady || !auth.user || !orderLines.length || total < 100 || widgets || widgetSetupRef.current) return;
    setWidgetLoading(true);
    setWidgetError("");
    widgetSetupRef.current = (async () => {
      const tossPayments = await loadTossPayments(TOSS_WIDGET_CLIENT_KEY);
      const customerKey = await tossCustomerKey(auth.user!.uid);
      const nextWidgets = tossPayments.widgets({ customerKey });
      await nextWidgets.setAmount({ currency: "KRW", value: total });
      await nextWidgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" });
      await nextWidgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" });
      setWidgets(nextWidgets);
      setWidgetReady(true);
    })().catch((error) => {
      widgetSetupRef.current = null;
      setWidgetError(tossPaymentErrorMessage(error));
    }).finally(() => setWidgetLoading(false));
  }, [auth.user, checkoutReady, orderLines.length, total, widgetAttempt, widgets]);

  useEffect(() => {
    if (!widgets || total < 100) return;
    let current = true;
    widgets.setAmount({ currency: "KRW", value: total }).catch((error) => {
      if (current) setWidgetError(tossPaymentErrorMessage(error));
    });
    return () => { current = false; };
  }, [total, widgets]);

  const retryWidget = () => {
    widgetSetupRef.current = null;
    setWidgetError("");
    setWidgetAttempt((attempt) => attempt + 1);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.user) {
      setCheckoutError("주문하려면 먼저 로그인해 주세요.");
      return;
    }
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    if (!orderLines.length) {
      setCheckoutError("결제할 상품이 없습니다. 상품을 쇼핑백에 담아 주세요.");
      return;
    }
    if (total < 100) {
      setCheckoutError("결제 금액은 100원 이상이어야 합니다.");
      return;
    }
    if (!widgets || !widgetReady) {
      setCheckoutError("결제 수단을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setSubmitting(true);
    setCheckoutError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const orderId = makeOrderId();
    const customerName = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const orderedItems = orderLines.map((line) => {
      const product = getProduct(line.id);
      const color = product.colors.find((item) => item.name === line.color) ?? product.colors[0];
      return {
        id: product.id,
        name: product.name,
        color: color.name,
        size: line.size,
        quantity: line.quantity,
        price: product.price,
        image: color.image,
      };
    });
    const shippingAddress = {
      recipient: String(data.get("recipient") || "").trim(),
      phone: String(data.get("recipientPhone") || "").trim(),
      postalCode: String(data.get("postalCode") || "").trim(),
      addressLine1: String(data.get("addressLine1") || "").trim(),
      addressLine2: String(data.get("addressLine2") || "").trim(),
    };

    try {
      const orderName = fallbackOrderName(orderLines);
      const pendingOrder: PendingTossOrder = {
        userUid: auth.user.uid,
        orderId,
        orderName,
        amount: total,
        subtotal,
        discount,
        shippingFee,
        coupon: selectedCoupon ? { id: selectedCoupon.id, name: selectedCoupon.name, code: selectedCoupon.code } : null,
        shippingAddress,
        items: orderedItems,
        customerName,
        email,
        phone,
        memo: String(data.get("deliveryMemo") || ""),
        isBuyNow,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(TOSS_PENDING_ORDER_KEY, JSON.stringify(pendingOrder));
      await widgets.setAmount({ currency: "KRW", value: total });
      const mobilePhone = phone.replace(/\D/g, "");
      await widgets.requestPayment({
        orderId,
        orderName,
        customerName,
        customerEmail: email,
        ...(mobilePhone.length >= 8 && mobilePhone.length <= 15 ? { customerMobilePhone: mobilePhone } : {}),
        successUrl: new URL("/payment/success", window.location.origin).toString(),
        failUrl: new URL("/payment/fail", window.location.origin).toString(),
        windowTarget: "self",
      });
    } catch (error) {
      setCheckoutError(tossPaymentErrorMessage(error));
      setSubmitting(false);
    }
  };

  if (auth.loading || !checkoutReady) return <main id="content" className="inner-page utility-page"><section className="account-loading"><span /><p>회원 정보를 확인하는 중입니다.</p></section></main>;
  if (!auth.user) {
    const returnTo = isBuyNow ? "/checkout?mode=buy-now" : "/checkout";
    return <main id="content" className="inner-page utility-page checkout-auth-page"><section className="checkout-auth-gate"><span><LogIn /></span><p className="eyebrow dark">MEMBER CHECKOUT</p><h1>로그인 후<br />주문할 수 있어요.</h1><p>{isBuyNow ? "선택한 상품은 그대로 보관됩니다." : "쇼핑백의 상품은 그대로 보관됩니다."}<br />로그인하면 회원 정보와 기본 배송지를 자동으로 채워드려요.</p><div><Link className="primary-button" href={`/account?returnTo=${encodeURIComponent(returnTo)}`}>로그인·회원가입</Link><Link className="secondary-button" href={isBuyNow && buyNowLine ? `/product/${buyNowLine.id}` : "/cart"}>{isBuyNow ? "상품으로 돌아가기" : "쇼핑백으로 돌아가기"}</Link></div><small><PackageCheck />주문 내역과 배송 상태는 마이페이지에서 확인할 수 있습니다.</small></section></main>;
  }

  return (
    <main id="content" className="inner-page checkout-page">
      <div className="checkout-title"><Link href={isBuyNow && buyNowLine ? `/product/${buyNowLine.id}` : "/cart"}><ChevronLeft size={18} />{isBuyNow ? "상품으로 돌아가기" : "쇼핑백으로 돌아가기"}</Link><h1>Checkout</h1><span><LockKeyhole size={15} /> SECURE</span></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form">
          <fieldset><legend><span>01</span>주문자 정보</legend><div className="form-grid"><label>이름<input name="name" required defaultValue={auth.profile?.displayName} placeholder="홍길동" /></label><label>연락처<input name="phone" required type="tel" defaultValue={auth.profile?.phone} placeholder="010-0000-0000" /></label><label className="full">이메일<input name="email" required type="email" defaultValue={auth.user.email ?? ""} placeholder="email@example.com" /></label></div></fieldset>
          <fieldset><legend><span>02</span>배송지 정보</legend>
            <label className="checkout-address-selector"><span>배송지 선택</span><select value={savedAddresses.length ? selectedAddressId : "__new__"} onChange={(event) => setSelectedAddressId(event.target.value)}>{defaultAddress && <option value="__default__">{defaultAddress.label || "기본 배송지"} (기본) · {defaultAddress.addressLine1}</option>}{savedAddresses.filter((address) => address.id !== defaultAddress?.id).map((address) => <option value={address.id} key={address.id}>{address.label || "등록 배송지"} · {address.addressLine1}</option>)}<option value="__new__">＋ 새 배송지 입력</option></select></label>
            <div className="form-grid" key={addressFormKey}><label>받는 분<input name="recipient" required defaultValue={selectedAddress?.recipient ?? ""} placeholder="받는 분 이름" /></label><label>받는 분 연락처<input name="recipientPhone" required type="tel" defaultValue={selectedAddress?.phone ?? ""} placeholder="010-0000-0000" /></label><PostcodeFields key={addressFormKey} initial={selectedAddress} detailRequired /><label className="full">배송 요청사항<select name="deliveryMemo" defaultValue=""><option value="" disabled>요청사항을 선택해 주세요</option><option>문 앞에 놓아주세요</option><option>배송 전 연락해 주세요</option><option>경비실에 맡겨주세요</option></select></label></div>
          </fieldset>
          <fieldset>
            <legend><span>03</span>결제 수단</legend>
            <div className="payment-method-notice"><ShieldCheck size={18} /> 결제 정보는 토스페이먼츠 보안 결제창에서 안전하게 처리됩니다.</div>
            {widgetLoading && <div className="payment-method-notice">안전한 결제 수단을 불러오는 중입니다.</div>}
            {widgetError && <div className="payment-method-notice" role="alert">{widgetError} <button type="button" onClick={retryWidget}>다시 불러오기</button></div>}
            <div id="payment-method" aria-label="결제 수단 선택" />
            <div id="agreement" aria-label="결제 약관 동의" />
          </fieldset>
        </div>
        <aside className="order-summary checkout-summary">
          <p className="eyebrow dark">{isBuyNow ? "BUY NOW" : "YOUR ORDER"}</p>
          {orderLines.length === 0 && <p className="form-message error">결제할 상품이 없습니다.</p>}
          {orderLines.map((line) => { const product = getProduct(line.id); const selectedColor = product.colors.find((item) => item.name === line.color) ?? product.colors[0]; return <div className="checkout-item" key={`${line.id}-${line.size}-${line.color}`}><img src={selectedColor.image} alt="" /><p><strong>{product.name}</strong><span>{selectedColor.name} · {line.size} · QTY {line.quantity}</span></p><b>{formatPrice(product.price * line.quantity)}</b></div>; })}
          <section className="checkout-coupon"><label><span><TicketPercent />보유 쿠폰</span><select value={effectiveCouponCode} onChange={(event) => setCouponCode(event.target.value)} disabled={availableCoupons.length === 0}><option value="">{availableCoupons.length ? "쿠폰을 적용하지 않음" : "사용 가능한 쿠폰 없음"}</option>{availableCoupons.map((coupon) => <option value={coupon.code} disabled={subtotal < coupon.minimumPurchase} key={coupon.id}>{coupon.name}{coupon.minimumPurchase ? ` · ${formatPrice(coupon.minimumPurchase)} 이상` : ""}</option>)}</select></label>{discount > 0 && <p>{selectedCoupon?.name} 적용 · <strong>{formatPrice(discount)} 할인</strong></p>}</section>
          <section className="checkout-price-breakdown"><p><span>상품 금액</span><strong>{formatPrice(subtotal)}</strong></p><p><span>쿠폰·할인</span><strong className={discount ? "is-discount" : ""}>{discount ? `− ${formatPrice(discount)}` : formatPrice(0)}</strong></p><p><span>배송비</span><strong>무료</strong></p></section>
          <div className="summary-total"><span>실제 결제 금액</span><strong>{formatPrice(total)}</strong></div>
          {checkoutError && <p className="form-message error" role="alert">{checkoutError}</p>}
          <button className="primary-button" disabled={submitting || !widgetReady || orderLines.length === 0 || total < 100} type="submit"><CreditCard size={18} />{submitting ? "결제창 여는 중..." : widgetReady ? `${formatPrice(total)} 결제하기` : "결제 수단 불러오는 중"}</button>
          <p className="terms-check"><LockKeyhole size={16} /><span>결제 정보는 토스페이먼츠의 보안 결제창에서 안전하게 처리됩니다.</span></p>
        </aside>
      </form>
    </main>
  );
}
