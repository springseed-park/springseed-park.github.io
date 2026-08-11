"use client";

import Link from "next/link";
import { Check, ChevronLeft, CreditCard, LockKeyhole, LogIn, PackageCheck, TicketPercent } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useStore } from "../components/StoreProvider";
import { firebaseErrorMessage, MemberCoupon, useAuth } from "../components/AuthProvider";
import PostcodeFields from "../components/PostcodeFields";
import { formatPrice, getProduct } from "../lib/products";

type CheckoutLine = { id: string; size: string; color: string; quantity: number };

function calculateCouponDiscount(coupon: MemberCoupon, subtotal: number) {
  if (subtotal < coupon.minimumPurchase) return 0;
  const discount = coupon.discountType === "percent" ? Math.floor(subtotal * coupon.value / 100) : coupon.value;
  return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
}

function makeOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = crypto.getRandomValues(new Uint16Array(1))[0].toString().padStart(4, "0").slice(-4);
  return `ME${date}-${suffix}`;
}

export default function CheckoutPage() {
  const { cart, clearCart } = useStore();
  const auth = useAuth();
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [buyNowLine, setBuyNowLine] = useState<CheckoutLine | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "buy-now") {
      try {
        const saved = JSON.parse(localStorage.getItem("elan-buy-now") || "null") as CheckoutLine | null;
        if (saved?.id && saved.size && saved.color) setBuyNowLine({ ...saved, quantity: 1 });
      } catch { /* fall back to the regular shopping bag */ }
    }
    setCheckoutReady(true);
  }, []);
  const orderLines = buyNowLine ? [buyNowLine] : cart;
  const isBuyNow = Boolean(buyNowLine);
  const subtotal = orderLines.reduce((sum, line) => sum + getProduct(line.id).price * line.quantity, 0);
  const availableCoupons = (auth.profile?.coupons ?? []).filter((coupon) => !coupon.used && (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() > Date.now()));
  const selectedCoupon = availableCoupons.find((coupon) => coupon.code === couponCode);
  const discount = selectedCoupon ? calculateCouponDiscount(selectedCoupon, subtotal) : 0;
  const shippingFee = 0;
  const total = Math.max(0, subtotal - discount + shippingFee);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.user) {
      setCheckoutError("주문하려면 먼저 로그인해 주세요.");
      return;
    }
    setSubmitting(true);
    setCheckoutError("");
    const data = new FormData(event.currentTarget);
    const generated = makeOrderNumber();
    const orderedItems = orderLines.map((line) => { const product = getProduct(line.id); const color = product.colors.find((item) => item.name === line.color) ?? product.colors[0]; return { id: product.id, name: product.name, color: line.color, size: line.size, quantity: line.quantity, price: product.price, image: color.image }; });
    const shippingAddress = { recipient: String(data.get("recipient")), phone: String(data.get("recipientPhone")), postalCode: String(data.get("postalCode")), addressLine1: String(data.get("addressLine1")), addressLine2: String(data.get("addressLine2")) };
    const method = String(data.get("payment"));
    const payment = {
      subtotal,
      discount,
      shippingFee,
      paidAmount: total,
      method: method === "card" ? "신용·체크카드" : method === "easy" ? String(data.get("simpleProvider") || "간편결제") : "무통장입금",
      paidAt: new Date().toISOString(),
      ...(method === "card" ? { cardCompany: String(data.get("cardCompany") || ""), cardLast4: String(data.get("cardLast4") || "") } : {}),
      ...(discount > 0 && selectedCoupon ? { couponName: selectedCoupon.name, couponCode: selectedCoupon.code } : {}),
    };
    try {
      const savedOrder = await auth.createOrder({
        orderNumber: generated,
        total,
        status: "상품 준비",
        courier: "배송 준비 중",
        trackingNumber: "발급 예정",
        shippingAddress,
        items: orderedItems,
        payment,
      });
      if (!savedOrder) throw new Error("order-auth-required");
      if (selectedCoupon) {
        try { await auth.useCoupon(selectedCoupon.id); } catch { /* the completed order remains valid */ }
      }
      try {
        const adminOrders = JSON.parse(localStorage.getItem("maison-admin-orders") || "[]");
        adminOrders.unshift({ id: generated, customer: shippingAddress.recipient, email: String(data.get("email")), phone: shippingAddress.phone, address: `${shippingAddress.addressLine1} ${shippingAddress.addressLine2}`.trim(), items: orderedItems, amount: total, payment, date: new Date().toLocaleString("ko-KR"), status: "결제완료", courier: "", trackingNumber: "", memo: String(data.get("deliveryMemo") ?? "") });
        localStorage.setItem("maison-admin-orders", JSON.stringify(adminOrders));
        const adminMembers = JSON.parse(localStorage.getItem("maison-admin-members") || "[]");
        localStorage.setItem("maison-admin-members", JSON.stringify(adminMembers.map((member: { email: string; orderCount: number; totalSpent: number }) => member.email === String(data.get("email")) ? { ...member, orderCount: member.orderCount + 1, totalSpent: member.totalSpent + total } : member)));
      } catch { /* Firebase order remains the source of truth for the customer */ }
      setOrderNumber(generated);
      setComplete(true);
      if (isBuyNow) localStorage.removeItem("elan-buy-now");
      else clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setCheckoutError(firebaseErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };
  if (auth.loading || !checkoutReady) return <main id="content" className="inner-page utility-page"><section className="account-loading"><span /><p>회원 정보를 확인하는 중입니다.</p></section></main>;
  if (!auth.user) { const returnTo = isBuyNow ? "/checkout?mode=buy-now" : "/checkout"; return <main id="content" className="inner-page utility-page checkout-auth-page"><section className="checkout-auth-gate"><span><LogIn /></span><p className="eyebrow dark">MEMBER CHECKOUT</p><h1>로그인 후<br />주문할 수 있어요.</h1><p>{isBuyNow ? "선택한 상품은 그대로 보관됩니다." : "쇼핑백의 상품은 그대로 보관됩니다."}<br />로그인하면 회원 정보와 기본 배송지를 자동으로 채워드려요.</p><div><Link className="primary-button" href={`/account?returnTo=${encodeURIComponent(returnTo)}`}>로그인·회원가입</Link><Link className="secondary-button" href={isBuyNow && buyNowLine ? `/product/${buyNowLine.id}` : "/cart"}>{isBuyNow ? "상품으로 돌아가기" : "쇼핑백으로 돌아가기"}</Link></div><small><PackageCheck />주문 내역과 배송 상태는 마이페이지에서 확인할 수 있습니다.</small></section></main>; }
  if (complete) return <main id="content" className="inner-page utility-page"><section className="checkout-complete"><span><Check size={34} /></span><p className="eyebrow dark">ORDER COMPLETE</p><h1>Thank you.</h1><p>주문이 정상적으로 접수되었습니다.<br />주문번호는 <strong>{orderNumber}</strong>입니다.</p><Link className="primary-button" href="/account">주문·배송 내역 확인</Link></section></main>;
  return (
    <main id="content" className="inner-page checkout-page">
      <div className="checkout-title"><Link href={isBuyNow && buyNowLine ? `/product/${buyNowLine.id}` : "/cart"}><ChevronLeft size={18} />{isBuyNow ? "상품으로 돌아가기" : "쇼핑백으로 돌아가기"}</Link><h1>Checkout</h1><span><LockKeyhole size={15} /> SECURE</span></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form">
          <fieldset><legend><span>01</span>주문자 정보</legend><div className="form-grid"><label>이름<input name="name" required defaultValue={auth.profile?.displayName} placeholder="홍길동" /></label><label>연락처<input name="phone" required type="tel" defaultValue={auth.profile?.phone} placeholder="010-0000-0000" /></label><label className="full">이메일<input name="email" required type="email" defaultValue={auth.user.email ?? ""} placeholder="email@example.com" /></label></div></fieldset>
          <fieldset><legend><span>02</span>배송지 정보</legend><div className="form-grid"><label>받는 분<input name="recipient" required defaultValue={auth.profile?.address.recipient || auth.profile?.displayName} placeholder="받는 분 이름" /></label><label>받는 분 연락처<input name="recipientPhone" required type="tel" defaultValue={auth.profile?.address.phone || auth.profile?.phone} placeholder="010-0000-0000" /></label><PostcodeFields initial={auth.profile?.address} detailRequired /><label className="full">배송 요청사항<select name="deliveryMemo" defaultValue=""><option value="" disabled>요청사항을 선택해 주세요</option><option>문 앞에 놓아주세요</option><option>배송 전 연락해 주세요</option><option>경비실에 맡겨주세요</option></select></label></div></fieldset>
          <fieldset><legend><span>03</span>결제 수단</legend><div className="payment-options"><label><input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={(event) => setPaymentMethod(event.target.value)} /><span><CreditCard size={20} />신용·체크카드</span></label><label><input type="radio" name="payment" value="easy" checked={paymentMethod === "easy"} onChange={(event) => setPaymentMethod(event.target.value)} /><span>간편결제</span></label><label><input type="radio" name="payment" value="bank" checked={paymentMethod === "bank"} onChange={(event) => setPaymentMethod(event.target.value)} /><span>무통장입금</span></label></div>{paymentMethod === "card" && <div className="payment-method-detail"><label>카드사<select name="cardCompany" required defaultValue=""><option value="" disabled>카드사를 선택해 주세요</option>{["신한카드", "삼성카드", "현대카드", "KB국민카드", "롯데카드", "우리카드", "하나카드", "NH농협카드"].map((card) => <option key={card}>{card}</option>)}</select></label><label>카드번호 뒤 4자리<input name="cardLast4" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" autoComplete="off" /></label></div>}{paymentMethod === "easy" && <div className="payment-method-detail single"><label>간편결제 서비스<select name="simpleProvider" required defaultValue="카카오페이"><option>카카오페이</option><option>네이버페이</option><option>토스페이</option><option>PAYCO</option></select></label></div>}{paymentMethod === "bank" && <div className="payment-method-notice">주문 완료 후 24시간 이내 입금해 주세요. 입금 확인 후 상품 준비가 시작됩니다.</div>}</fieldset>
        </div>
        <aside className="order-summary checkout-summary"><p className="eyebrow dark">{isBuyNow ? "BUY NOW" : "YOUR ORDER"}</p>{orderLines.map((line) => { const product = getProduct(line.id); const selectedColor = product.colors.find((item) => item.name === line.color) ?? product.colors[0]; return <div className="checkout-item" key={`${line.id}-${line.size}-${line.color}`}><img src={selectedColor.image} alt="" /><p><strong>{product.name}</strong><span>{selectedColor.name} · {line.size} · QTY {line.quantity}</span></p><b>{formatPrice(product.price * line.quantity)}</b></div>; })}<section className="checkout-coupon"><label><span><TicketPercent />보유 쿠폰</span><select value={couponCode} onChange={(event) => setCouponCode(event.target.value)} disabled={availableCoupons.length === 0}><option value="">{availableCoupons.length ? "쿠폰을 선택해 주세요" : "사용 가능한 쿠폰 없음"}</option>{availableCoupons.map((coupon) => <option value={coupon.code} disabled={subtotal < coupon.minimumPurchase} key={coupon.id}>{coupon.name}{coupon.minimumPurchase ? ` · ${formatPrice(coupon.minimumPurchase)} 이상` : ""}</option>)}</select></label>{discount > 0 && <p>{selectedCoupon?.name} 적용 · <strong>{formatPrice(discount)} 할인</strong></p>}</section><section className="checkout-price-breakdown"><p><span>상품 금액</span><strong>{formatPrice(subtotal)}</strong></p><p><span>쿠폰·할인</span><strong className={discount ? "is-discount" : ""}>{discount ? `− ${formatPrice(discount)}` : formatPrice(0)}</strong></p><p><span>배송비</span><strong>무료</strong></p></section><div className="summary-total"><span>실제 결제 금액</span><strong>{formatPrice(total)}</strong></div>{checkoutError && <p className="form-message error" role="alert">{checkoutError}</p>}<button className="primary-button" disabled={submitting} type="submit"><LockKeyhole size={18} />{submitting ? "주문 저장 중..." : `${formatPrice(total)} 결제하기`}</button><label className="terms-check"><input required type="checkbox" /><span>주문 내용을 확인했으며 구매 조건에 동의합니다.</span></label></aside>
      </form>
    </main>
  );
}
