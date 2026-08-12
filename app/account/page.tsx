"use client";

import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Home,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  TicketPercent,
  Truck,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { firebaseErrorMessage, MemberAddress, MemberCoupon, MemberOrder, useAuth } from "../components/AuthProvider";
import GoogleSignInButton from "../components/GoogleSignInButton";
import PostcodeFields from "../components/PostcodeFields";
import { formatPrice } from "../lib/products";

type AccountTab = "overview" | "orders" | "address" | "profile" | "security";

const tabs: Array<{ id: AccountTab; label: string; icon: typeof UserRound }> = [
  { id: "overview", label: "마이페이지", icon: UserRound },
  { id: "orders", label: "주문·배송", icon: PackageCheck },
  { id: "address", label: "배송지 관리", icon: MapPin },
  { id: "profile", label: "회원 정보", icon: UserRound },
  { id: "security", label: "비밀번호", icon: KeyRound },
];

export default function AccountPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [expandedShipment, setExpandedShipment] = useState<string | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.user) return;
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) window.location.assign(returnTo);
  }, [auth.user]);

  const run = async (action: () => Promise<void>, success = "") => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); if (success) setNotice(success); }
    catch (nextError) { setError(firebaseErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() => auth.signIn(String(data.get("email")), String(data.get("password")), data.get("remember") === "on"));
  };

  const submitRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmPassword"))) { setError("비밀번호 확인이 일치하지 않습니다."); return; }
    const name = String(data.get("name"));
    const phone = String(data.get("phone"));
    const address = { recipient: name, phone, postalCode: String(data.get("postalCode")), addressLine1: String(data.get("addressLine1")), addressLine2: String(data.get("addressLine2")) };
    run(() => auth.signUp(name, phone, String(data.get("email")), password, address), "가입이 완료되었습니다.");
  };

  if (auth.loading) return <main id="content" className="inner-page utility-page"><section className="account-loading"><span /><p>회원 정보를 불러오는 중입니다.</p></section></main>;

  if (!auth.user) return (
    <main id="content" className="inner-page utility-page account-page">
      <div className="utility-heading account-heading"><p className="eyebrow dark">MEMBERSHIP</p><h1>Account</h1><span>SECURE MEMBER AREA</span></div>
      <section className="login-layout account-auth-layout">
        <div className="auth-panel">
          <div className="auth-mode-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }} type="button">로그인</button><button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }} type="button">회원가입</button></div>
          <GoogleSignInButton />
          <div className="auth-divider"><span>또는 이메일로 계속</span></div>
          {mode === "login" ? <form onSubmit={submitLogin}>
            <label>이메일<input name="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" /></label>
            <label>비밀번호<input name="password" required type="password" minLength={6} placeholder="6자 이상 입력" /></label>
            <div className="login-options"><label><input name="remember" type="checkbox" defaultChecked />로그인 상태 유지</label><button type="button" onClick={() => email ? run(() => auth.resetPassword(email), "비밀번호 재설정 메일을 보냈습니다.") : setError("이메일을 먼저 입력해 주세요.")}>비밀번호 찾기</button></div>
            {(error || auth.authError) && <p className="form-message error" role="alert">{error || auth.authError}</p>}{notice && <p className="form-message success">{notice}</p>}
            <button className="primary-button" disabled={busy} type="submit">{busy ? "확인 중..." : "로그인"}</button>
          </form> : <form onSubmit={submitRegister}>
            <div className="form-grid"><label>이름<input name="name" required placeholder="이름" /></label><label>연락처<input name="phone" required type="tel" placeholder="010-0000-0000" /></label><label className="full">이메일<input name="email" required type="email" placeholder="email@example.com" /></label><label>비밀번호<input name="password" required type="password" minLength={6} placeholder="6자 이상" /></label><label>비밀번호 확인<input name="confirmPassword" required type="password" minLength={6} placeholder="한 번 더 입력" /></label><div className="form-section-label">기본 배송지</div><PostcodeFields /></div>
            <label className="join-terms"><input required type="checkbox" />이용약관 및 개인정보 처리방침에 동의합니다.</label>
            <p className="auth-password-help">영문·숫자를 조합해 6자 이상 입력해 주세요.</p>
            {(error || auth.authError) && <p className="form-message error" role="alert">{error || auth.authError}</p>}{notice && <p className="form-message success">{notice}</p>}
            <button className="primary-button" disabled={busy} type="submit">{busy ? "가입 중..." : "회원가입"}</button>
          </form>}
        </div>
      </section>
    </main>
  );

  const deliveryStatuses = auth.orders.flatMap((order) => order.items.map((_, index) => getItemShipment(order, index).status));
  const prepared = deliveryStatuses.filter((status) => status === "상품 준비").length;
  const shipping = deliveryStatuses.filter((status) => status === "배송 중" || status === "출고 완료").length;
  const delivered = deliveryStatuses.filter((status) => status === "배송 완료").length;

  return (
    <main id="content" className="inner-page utility-page account-page">
      <div className="utility-heading account-heading"><p className="eyebrow dark">MEMBERSHIP</p><h1>My Élan</h1><span>{auth.user.email}</span></div>
      <section className="mypage-shell">
        <aside className="mypage-nav"><div className="mypage-member"><span>{(auth.profile?.displayName ?? "E").slice(0, 1)}</span><div><strong>{auth.profile?.displayName ?? "엘란 고객"}님</strong><p>{auth.user.email}</p></div></div><nav>{tabs.map(({ id, label, icon: Icon }) => <button type="button" className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} key={id}><Icon />{label}</button>)}</nav><button className="logout-button" type="button" onClick={auth.logout}><LogOut />로그아웃</button></aside>
        <div className="mypage-content">
          {activeTab === "overview" && <Overview name={auth.profile?.displayName ?? "엘란 고객"} prepared={prepared} shipping={shipping} delivered={delivered} orderCount={auth.orders.length} coupons={auth.profile?.coupons ?? []} go={setActiveTab} />}
          {activeTab === "orders" && <section className="mypage-panel"><PanelTitle eyebrow="ORDERS" title="주문·배송 내역" description="같은 주문도 상품별 출고 일정과 택배사가 다를 수 있어 각각 확인할 수 있습니다." />{auth.orders.length === 0 ? <EmptyOrders /> : <div className="order-history">{auth.orders.map((order) => {
            const statuses = order.items.map((_, index) => getItemShipment(order, index).status);
            const aggregateStatus = new Set(statuses).size > 1 ? "분리 배송" : statuses[0] ?? order.status;
            return <article key={order.id} className="order-card"><div className="order-card-head"><div><span>{order.createdAt ? order.createdAt.toLocaleDateString("ko-KR") : "처리 중"}</span><strong>{order.orderNumber}</strong></div><div className="order-head-summary"><span>상품 {order.items.length}개 · {formatPrice(order.total)}</span><b>{aggregateStatus}</b></div></div><div className="order-shipment-list">{order.items.map((item, index) => {
              const shipment = getItemShipment(order, index);
              const shipmentKey = `${order.id}-${index}`;
              const isExpanded = expandedShipment === shipmentKey;
              return <section className="order-shipment" key={shipmentKey}><div className="order-card-body"><img src={item.image} alt={item.name} /><div><span className="shipment-number">배송 {index + 1} / 상품 {index + 1}</span><h3>{item.name}</h3><p>{item.color} · {item.size} · 수량 {item.quantity}</p><strong>{formatPrice(item.price * item.quantity)}</strong></div><div className="shipment-action"><span className={`shipment-status status-${shipment.status.replaceAll(" ", "-")}`}>{shipment.status}</span><button type="button" aria-expanded={isExpanded} onClick={() => setExpandedShipment(isExpanded ? null : shipmentKey)}>배송 상세 <ChevronDown className={isExpanded ? "rotate" : ""} /></button></div></div>{isExpanded && <ShippingTimeline shipment={shipment} />}</section>;
            })}</div><div className="order-payment-toggle"><div><span>실제 결제금액</span><strong>{formatPrice(order.payment?.paidAmount ?? order.total)}</strong></div><button type="button" aria-expanded={expandedPayment === order.id} onClick={() => setExpandedPayment(expandedPayment === order.id ? null : order.id)}><CreditCard />결제 정보 <ChevronDown className={expandedPayment === order.id ? "rotate" : ""} /></button></div>{expandedPayment === order.id && <PaymentDetails order={order} />}</article>;
          })}</div>}</section>}
          {activeTab === "address" && <AddressPanel addresses={auth.profile?.addresses ?? []} busy={busy} notice={notice} error={error} submit={(address) => run(() => auth.saveAddress(address), "배송지를 저장했습니다.")} remove={(addressId) => run(() => auth.deleteAddress(addressId), "배송지를 삭제했습니다.")} makeDefault={(addressId) => run(() => auth.setDefaultAddress(addressId), "기본 배송지를 변경했습니다.")} />}
          {activeTab === "profile" && <ProfilePanel initialName={auth.profile?.displayName ?? ""} initialPhone={auth.profile?.phone ?? ""} email={auth.user.email ?? ""} busy={busy} notice={notice} error={error} submit={(displayName, phone) => run(() => auth.saveProfile({ displayName, phone }), "회원 정보를 변경했습니다.")} />}
          {activeTab === "security" && <SecurityPanel isPasswordUser={auth.user.providerData.some((provider) => provider.providerId === "password")} busy={busy} notice={notice} error={error} submit={(current, next) => run(() => auth.changePassword(current, next), "비밀번호를 변경했습니다.")} />}
        </div>
      </section>
    </main>
  );
}

function PanelTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <header className="mypage-panel-title"><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2><span>{description}</span></header>; }

function Overview({ name, prepared, shipping, delivered, orderCount, coupons, go }: { name: string; prepared: number; shipping: number; delivered: number; orderCount: number; coupons: MemberCoupon[]; go: (tab: AccountTab) => void }) { const availableCoupon = coupons.find((coupon) => !coupon.used && (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() > Date.now())); return <section className="mypage-overview"><div className="dashboard-welcome"><p>WELCOME BACK</p><h2>안녕하세요, {name}님.</h2><span>당신을 위한 새로운 에디트가 준비되어 있습니다.</span></div>{availableCoupon && <div className="welcome-coupon-banner"><div><TicketPercent /><span><em>WELCOME GIFT</em><strong>{availableCoupon.name}</strong><small>{availableCoupon.expiresAt ? `${new Date(availableCoupon.expiresAt).toLocaleDateString("ko-KR")}까지` : "유효기간 제한 없음"} · 결제금액의 {availableCoupon.value}% 할인</small></span></div><b>{availableCoupon.value}%</b><a href="/shop">쿠폰 사용하기</a></div>}<div className="account-status-grid"><button type="button" onClick={() => go("orders")}><PackageCheck /><strong>{prepared}</strong><span>상품 준비</span></button><button type="button" onClick={() => go("orders")}><Truck /><strong>{shipping}</strong><span>배송 중</span></button><button type="button" onClick={() => go("orders")}><CheckCircle2 /><strong>{delivered}</strong><span>배송 완료</span></button></div><div className="overview-cards"><button type="button" onClick={() => go("orders")}><span>ORDER HISTORY</span><strong>{orderCount}개의 주문</strong><p>주문 내역과 배송 위치를 확인하세요.</p></button><button type="button" onClick={() => go("address")}><span>DELIVERY ADDRESS</span><strong>기본 배송지 관리</strong><p>받는 분과 주소를 변경할 수 있어요.</p></button><button type="button" onClick={() => go("profile")}><span>MEMBER PROFILE</span><strong>회원 정보 변경</strong><p>이름과 연락처를 최신으로 유지하세요.</p></button></div></section>; }

function EmptyOrders() { return <div className="mypage-empty"><PackageCheck /><h3>아직 주문 내역이 없습니다.</h3><p>로그인 상태로 결제하면 이곳에서 주문과 배송 상태를 확인할 수 있습니다.</p><a className="primary-button" href="/shop">쇼핑 계속하기</a></div>; }

type DeliveryInfo = { status: string; courier: string; trackingNumber: string; estimatedDelivery?: string };

function getItemShipment(order: MemberOrder, itemIndex: number): DeliveryInfo {
  const shipment = order.itemShipments?.find((item) => item.itemIndex === itemIndex);
  return {
    status: shipment?.status ?? order.status,
    courier: shipment?.courier ?? order.courier,
    trackingNumber: shipment?.trackingNumber ?? order.trackingNumber,
    estimatedDelivery: shipment?.estimatedDelivery,
  };
}

function ShippingTimeline({ shipment }: { shipment: DeliveryInfo }) {
  const steps = ["주문 접수", "상품 준비", "출고 완료", "배송 중", "배송 완료"];
  const active = Math.max(0, steps.indexOf(shipment.status));
  const hasTracking = Boolean(shipment.trackingNumber && shipment.trackingNumber !== "-");
  return <div className="shipping-detail"><div className="tracking-meta"><span>택배사 <strong>{shipment.courier || "배정 전"}</strong></span><span>송장번호 <strong>{hasTracking ? shipment.trackingNumber : "출고 후 등록됩니다"}</strong></span>{shipment.estimatedDelivery && <span>도착 예정 <strong>{shipment.estimatedDelivery}</strong></span>}</div><ol>{steps.map((step, index) => <li className={index <= active ? "done" : ""} aria-current={index === active ? "step" : undefined} key={step}><span>{index < active ? <CheckCircle2 /> : index === active ? <Truck /> : <Clock3 />}</span><b>{step}</b></li>)}</ol><p className="shipping-help">상품별 출고 시점에 따라 택배사와 송장번호가 각각 등록됩니다. 배송사에 인계된 뒤 상세 이동 정보가 표시됩니다.</p></div>;
}

function PaymentDetails({ order }: { order: MemberOrder }) {
  const payment = order.payment;
  const subtotal = payment?.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const paidAmount = payment?.paidAmount ?? order.total;
  const discount = payment?.discount ?? Math.max(0, subtotal - paidAmount);
  const paidAt = payment?.paidAt ? new Date(payment.paidAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "결제일시 정보 없음";
  const cardNumber = payment?.cardLast4 ? `••••  ••••  ••••  ${payment.cardLast4}` : "카드번호 정보 없음";

  return <section className="payment-detail"><header><div><ReceiptText /><span><strong>결제 상세</strong><small>{paidAt}</small></span></div>{!payment && <em>이전 주문</em>}</header><div className="payment-detail-grid"><div className="payment-amounts"><h4>결제 금액</h4><dl><div><dt>상품 금액</dt><dd>{formatPrice(subtotal)}</dd></div><div><dt>쿠폰·할인</dt><dd className={discount ? "is-discount" : ""}>{discount ? `− ${formatPrice(discount)}` : formatPrice(0)}</dd></div><div><dt>배송비</dt><dd>{payment?.shippingFee ? formatPrice(payment.shippingFee) : "무료"}</dd></div><div className="payment-paid"><dt>실제 결제금액</dt><dd>{formatPrice(paidAmount)}</dd></div></dl></div><div className="payment-method-card"><h4>결제 수단</h4><div className="payment-card-visual"><CreditCard /><span>{payment?.cardCompany || payment?.method || "결제수단 정보 없음"}</span><strong>{cardNumber}</strong><small>{payment?.method || "이 주문에는 상세 결제수단이 저장되어 있지 않습니다."}</small></div>{payment?.couponName ? <p className="payment-coupon"><TicketPercent /><span><strong>{payment.couponName}</strong><small>{payment.couponCode} · {formatPrice(discount)} 할인</small></span></p> : <p className="payment-coupon is-empty"><TicketPercent /><span><strong>{discount ? "할인 적용" : "적용된 쿠폰 없음"}</strong><small>{discount ? `총 ${formatPrice(discount)} 할인` : "쿠폰 할인 0원"}</small></span></p>}</div></div>{!payment && <p className="payment-legacy-note">결제 상세 저장 기능 적용 이전 주문으로 카드사와 쿠폰 명칭은 표시되지 않습니다. 확인 가능한 주문금액과 실제 결제금액만 안내합니다.</p>}</section>;
}

function AddressPanel({ addresses, busy, notice, error, submit, remove, makeDefault }: { addresses: MemberAddress[]; busy: boolean; notice: string; error: string; submit: (data: MemberAddress) => void; remove: (addressId: string) => void; makeDefault: (addressId: string) => void }) {
  const [editorOpen, setEditorOpen] = useState(addresses.length === 0);
  const [editing, setEditing] = useState<MemberAddress | null>(null);
  const [addressLabel, setAddressLabel] = useState("집");
  const [editorVersion, setEditorVersion] = useState(0);

  const openEditor = (address?: MemberAddress) => {
    setEditing(address ?? null);
    setAddressLabel(address?.label || (addresses.length === 0 ? "집" : "기타"));
    setEditorVersion((version) => version + 1);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditing(null);
  };

  return <section className="mypage-panel"><div className="address-panel-heading"><PanelTitle eyebrow="DELIVERY" title="배송지 관리" description="집, 회사 등 자주 사용하는 배송지를 저장하고 기본 배송지를 선택하세요." /><button className="address-add-button" type="button" onClick={() => openEditor()}><Plus />새 배송지 추가</button></div>
    {addresses.length > 0 ? <div className="address-book-grid">{addresses.map((address) => {
      const AddressIcon = address.label?.includes("회사") ? Building2 : Home;
      return <article className={`address-card${address.isDefault ? " is-default" : ""}`} key={address.id}><header><span><AddressIcon />{address.label || "배송지"}</span>{address.isDefault && <b>기본 배송지</b>}</header><div className="address-card-recipient"><strong>{address.recipient}</strong><span>{address.phone}</span></div><p><em>[{address.postalCode}]</em>{address.addressLine1}<br />{address.addressLine2}</p><footer>{!address.isDefault && <button type="button" disabled={busy} onClick={() => address.id && makeDefault(address.id)}>기본 배송지로 설정</button>}<span /><button type="button" aria-label={`${address.label} 배송지 수정`} onClick={() => openEditor(address)}><Pencil />수정</button><button className="address-delete" type="button" aria-label={`${address.label} 배송지 삭제`} disabled={busy} onClick={() => { if (address.id && window.confirm("이 배송지를 삭제할까요?")) remove(address.id); }}><Trash2 />삭제</button></footer></article>;
    })}</div> : <div className="address-empty"><MapPin /><h3>등록된 배송지가 없습니다.</h3><p>첫 번째 배송지는 자동으로 기본 배송지로 지정됩니다.</p></div>}
    <FormFeedback error={error} notice={notice} />
    {editorOpen && <form key={editorVersion} className="mypage-form address-editor" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); submit({ id: editing?.id, label: addressLabel, isDefault: data.get("isDefault") === "on", recipient: String(data.get("recipient")), phone: String(data.get("phone")), postalCode: String(data.get("postalCode")), addressLine1: String(data.get("addressLine1")), addressLine2: String(data.get("addressLine2")) }); closeEditor(); }}><div className="address-editor-title"><div><PackageOpen /><span><strong>{editing ? "배송지 수정" : "새 배송지 추가"}</strong><small>배송지명과 받는 분 정보를 입력해 주세요.</small></span></div>{addresses.length > 0 && <button type="button" onClick={closeEditor}>닫기</button>}</div><div className="address-label-field"><label>배송지명<input value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} required maxLength={12} placeholder="예: 집, 회사, 부모님 댁" /></label><div aria-label="배송지명 빠른 선택">{["집", "회사", "기타"].map((label) => <button className={addressLabel === label ? "active" : ""} type="button" onClick={() => setAddressLabel(label)} key={label}>{label}</button>)}</div></div><div className="form-grid"><label>받는 분<input name="recipient" required defaultValue={editing?.recipient} /></label><label>연락처<input name="phone" required type="tel" defaultValue={editing?.phone} placeholder="010-0000-0000" /></label><PostcodeFields initial={editing ?? undefined} /></div><label className="address-default-check"><input name="isDefault" type="checkbox" defaultChecked={editing?.isDefault || addresses.length === 0} /><span>이 배송지를 기본 배송지로 설정</span></label><div className="address-editor-actions"><button className="secondary-button" type="button" onClick={closeEditor}>취소</button><button className="primary-button" disabled={busy} type="submit">{busy ? "저장 중..." : editing ? "변경사항 저장" : "배송지 추가"}</button></div></form>}
  </section>;
}

function ProfilePanel({ initialName, initialPhone, email, busy, notice, error, submit }: { initialName: string; initialPhone: string; email: string; busy: boolean; notice: string; error: string; submit: (name: string, phone: string) => void }) { return <section className="mypage-panel"><PanelTitle eyebrow="PROFILE" title="회원 정보" description="주문과 안내에 사용되는 기본 정보를 변경합니다." /><form className="mypage-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); submit(String(data.get("displayName")), String(data.get("phone"))); }}><div className="form-grid"><label>이름<input name="displayName" required defaultValue={initialName} /></label><label>연락처<input name="phone" required type="tel" defaultValue={initialPhone} /></label><label className="full">이메일<input value={email} disabled readOnly /></label></div><p className="form-help"><Mail />이메일 변경은 고객 지원을 통해 본인 확인 후 가능합니다.</p><FormFeedback error={error} notice={notice} /><button className="primary-button" disabled={busy} type="submit">{busy ? "변경 중..." : "회원 정보 변경"}</button></form></section>; }

function SecurityPanel({ isPasswordUser, busy, notice, error, submit }: { isPasswordUser: boolean; busy: boolean; notice: string; error: string; submit: (current: string, next: string) => void }) { if (!isPasswordUser) return <section className="mypage-panel"><PanelTitle eyebrow="SECURITY" title="비밀번호" description="계정 보안 정보를 관리합니다." /><div className="social-security"><ShieldCheck /><h3>Google 계정으로 로그인 중입니다.</h3><p>비밀번호는 Google 계정의 보안 설정에서 변경해 주세요.</p></div></section>; return <section className="mypage-panel"><PanelTitle eyebrow="SECURITY" title="비밀번호 변경" description="안전한 계정을 위해 주기적으로 비밀번호를 변경해 주세요." /><form className="mypage-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const next = String(data.get("next")); if (next !== String(data.get("confirm"))) return; submit(String(data.get("current")), next); event.currentTarget.reset(); }}><label>현재 비밀번호<input name="current" required type="password" minLength={6} /></label><label>새 비밀번호<input name="next" required type="password" minLength={6} /></label><label>새 비밀번호 확인<input name="confirm" required type="password" minLength={6} /></label><FormFeedback error={error} notice={notice} /><button className="primary-button" disabled={busy} type="submit">{busy ? "변경 중..." : "비밀번호 변경"}</button></form></section>; }

function FormFeedback({ error, notice }: { error: string; notice: string }) { return <>{error && <p className="form-message error" role="alert">{error}</p>}{notice && <p className="form-message success">{notice}</p>}</>; }
