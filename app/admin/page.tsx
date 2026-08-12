"use client";

import {
  AlertCircle,
  BarChart3,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  Images,
  Mail,
  MessageSquare,
  PackageOpen,
  Pencil,
  Plus,
  Save,
  Search,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import { formatPrice, Product, products } from "../lib/products";
import { type MemberCoupon, type PaymentInfo } from "../components/AuthProvider";

type AdminTab = "dashboard" | "products" | "hero" | "orders" | "inquiries" | "members" | "newsletter";
type ProductStatus = "판매중" | "품절" | "판매중지";
type InquiryStatus = "등록" | "처리중" | "처리완료";
type OrderStatus = "결제완료" | "출고준비" | "출고완료" | "배송중" | "배송완료" | "취소" | "환불완료";
type AdminProduct = Product & { sku: string; stock: number; status: ProductStatus; updatedAt: string };
type OrderItem = { id: string; name: string; image: string; color: string; size: string; quantity: number; price: number; status?: OrderStatus; courier?: string; trackingNumber?: string; estimatedDelivery?: string };
type Order = { id: string; customer: string; email: string; phone: string; address: string; items: OrderItem[]; amount: number; date: string; status: OrderStatus; courier: string; trackingNumber: string; memo: string; payment?: PaymentInfo };
type Inquiry = { id: number; product: string; category: string; title: string; body: string; customer: string; date: string; status: InquiryStatus; answer: string; sourceKey?: string; sourceQuestionId?: string };
type Member = { id: string; name: string; email: string; phone: string; joinedAt: string; lastLogin: string; orderCount: number; totalSpent: number; status: "정상" | "휴면" | "차단"; address: string; memo: string; coupons?: MemberCoupon[] };
type AdminCouponIssue = { issueId: string; email: string; coupon: MemberCoupon; status: "대기" | "지급완료" };
type NewsletterSubscriber = { email: string; subscribedAt: string; status: "구독중" | "수신거부" };
type HeroSlide = { id: string; active: boolean; order: number; createdAt: string; updatedAt: string; eyebrow: string; title: string; accent: string; description: string; image: string; imageClass: string; primary: string; secondary: string; href: string };

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultCouponExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return dateInputValue(date);
}

const initialHeroSlides: HeroSlide[] = [
  { id: "hero-01", active: true, order: 1, createdAt: "2026.08.01", updatedAt: "2026.08.12", eyebrow: "MAISON ÉLAN / AW 2026", title: "The New", accent: "Poise", description: "도시의 리듬을 위한 선명하고 우아한 실루엣.", image: "/hero-01.png", imageClass: "hero-image-group", primary: "컬렉션 보기", secondary: "시즌 스토리", href: "/shop" },
  { id: "hero-02", active: true, order: 2, createdAt: "2026.08.01", updatedAt: "2026.08.12", eyebrow: "BEST SELLERS / LOOK 01", title: "Quiet", accent: "Confidence", description: "절제된 테일러링으로 완성하는 새로운 태도.", image: "/hero-02.png", imageClass: "hero-image-tailoring", primary: "베스트 상품 보기", secondary: "재킷 컬렉션", href: "/product/sculpted-wool-jacket" },
  { id: "hero-03", active: true, order: 3, createdAt: "2026.08.01", updatedAt: "2026.08.12", eyebrow: "MAISON ÉLAN / SIGNATURE", title: "Softly", accent: "Structured", description: "실크의 빛과 움직임을 담은 익스클루시브 에디트.", image: "/hero-03.png", imageClass: "hero-image-silk", primary: "에디트 보기", secondary: "브랜드 스토리", href: "/product/sheer-silk-blouse" },
];
const initialNewsletterSubscribers: NewsletterSubscriber[] = [
  { email: "atelier@example.com", subscribedAt: "2026-08-10T09:18:00.000Z", status: "구독중" },
  { email: "client@example.com", subscribedAt: "2026-08-06T14:32:00.000Z", status: "구독중" },
];

const defaultProducts: AdminProduct[] = products.map((product, index) => ({ ...product, sku: `ME-${product.category.slice(0, 2).toUpperCase()}-${String(index + 1).padStart(3, "0")}`, stock: [100, 18, 9, 24, 6, 4, 15, 8, 3][index], status: "판매중", updatedAt: "2026.08.12" }));
const item = (index: number, color = products[index].colors[0].name, size = products[index].sizes[0], quantity = 1): OrderItem => ({ id: products[index].id, name: products[index].name, image: products[index].colors.find((value) => value.name === color)?.image ?? products[index].image, color, size, quantity, price: products[index].price });
const initialOrders: Order[] = [
  { id: "ME-260811-1042", customer: "김지은", email: "jieun.kim@example.com", phone: "010-4821-7033", address: "서울 성동구 연무장길 21, 502호", items: [item(1, "Ink Black", "S"), item(4, "Stone", "S")], amount: 676000, date: "2026.08.11 14:22", status: "결제완료", courier: "CJ대한통운", trackingNumber: "", memo: "문 앞에 놓아주세요." },
  { id: "ME-260811-1038", customer: "박서윤", email: "seoyun.park@example.com", phone: "010-7762-1189", address: "서울 용산구 한남대로 42, 101동 802호", items: [item(2, "Oxblood", "S")], amount: 319000, date: "2026.08.11 12:48", status: "출고준비", courier: "한진택배", trackingNumber: "", memo: "배송 전 연락 부탁드립니다." },
  { id: "ME-260810-1021", customer: "이민정", email: "minjung.lee@example.com", phone: "010-2308-4512", address: "경기 성남시 분당구 판교역로 166", items: [item(4, "Black", "M"), item(3, "Pearl", "M")], amount: 524000, date: "2026.08.10 17:31", status: "배송중", courier: "우체국택배", trackingNumber: "6890123456789", memo: "" },
  { id: "ME-260810-1016", customer: "최하린", email: "harin.choi@example.com", phone: "010-5104-9921", address: "부산 해운대구 달맞이길 117", items: [item(7, "Wine", "XS")], amount: 189000, date: "2026.08.10 11:05", status: "배송완료", courier: "CJ대한통운", trackingNumber: "582019384756", memo: "경비실에 맡겨주세요." },
];
const initialInquiries: Inquiry[] = [
  { id: 301, product: "Sculpted Wool Jacket", category: "배송", title: "이번 주 금요일 전에 받아볼 수 있을까요?", body: "금요일 저녁 행사에 입어야 해서 목요일까지 출고 가능한지 궁금합니다.", customer: "윤**", date: "2026.08.10", status: "등록", answer: "" },
  { id: 298, product: "Cashmere Wrap Knit", category: "사이즈", title: "니트 위에 착용할 때 사이즈가 궁금해요", body: "평소 55 사이즈인데 여유 있게 입으려면 M이 좋을까요?", customer: "정**", date: "2026.08.08", status: "처리중", answer: "" },
  { id: 287, product: "Sculpted Wool Jacket", category: "상품", title: "Warm Sand 실제 색감 문의", body: "노란기가 강한 색인지 실제 색감이 궁금합니다.", customer: "최**", date: "2026.08.02", status: "처리완료", answer: "밝은 베이지에 은은한 골드 톤이 더해진 차분한 웜 샌드 색상입니다." },
];
const initialMembers: Member[] = [
  { id: "ME-M-1028", name: "김지은", email: "jieun.kim@example.com", phone: "010-4821-7033", joinedAt: "2026.05.18", lastLogin: "2026.08.11 14:10", orderCount: 6, totalSpent: 2184000, status: "정상", address: "서울 성동구 연무장길 21, 502호", memo: "VIP 응대" },
  { id: "ME-M-0994", name: "박서윤", email: "seoyun.park@example.com", phone: "010-7762-1189", joinedAt: "2026.04.22", lastLogin: "2026.08.11 12:31", orderCount: 3, totalSpent: 896000, status: "정상", address: "서울 용산구 한남대로 42, 101동 802호", memo: "" },
  { id: "ME-M-0812", name: "이민정", email: "minjung.lee@example.com", phone: "010-2308-4512", joinedAt: "2026.01.09", lastLogin: "2026.08.10 17:15", orderCount: 11, totalSpent: 4298000, status: "정상", address: "경기 성남시 분당구 판교역로 166", memo: "교환 1회" },
  { id: "ME-M-0771", name: "최하린", email: "harin.choi@example.com", phone: "010-5104-9921", joinedAt: "2025.12.14", lastLogin: "2026.07.02 09:20", orderCount: 2, totalSpent: 487000, status: "휴면", address: "부산 해운대구 달맞이길 117", memo: "" },
  { id: "ME-M-0615", name: "오세진", email: "sejin.oh@example.com", phone: "010-9930-2104", joinedAt: "2025.10.03", lastLogin: "2026.02.11 18:40", orderCount: 1, totalSpent: 248000, status: "차단", address: "서울 마포구 월드컵북로 31", memo: "반복 결제 취소" },
];

const adminNav = [
  { id: "dashboard" as const, label: "대시보드", icon: BarChart3 },
  { id: "products" as const, label: "상품 관리", icon: Box },
  { id: "hero" as const, label: "메인 비주얼", icon: Images },
  { id: "orders" as const, label: "주문·배송", icon: ClipboardList },
  { id: "inquiries" as const, label: "문의 관리", icon: MessageSquare },
  { id: "members" as const, label: "회원 관리", icon: Users },
  { id: "newsletter" as const, label: "뉴스레터", icon: Mail },
];

function mergeDefaultProducts(saved: AdminProduct[]) {
  const savedIds = new Set(saved.map((product) => product.id));
  const missing = defaultProducts.filter((product) => !savedIds.has(product.id));
  return missing.length ? [...missing, ...saved] : saved;
}

function mergeDefaultMembers(saved: Member[]) {
  const savedEmails = new Set(saved.map((member) => member.email.toLocaleLowerCase()));
  const missing = initialMembers.filter((member) => !savedEmails.has(member.email.toLocaleLowerCase()));
  return missing.length ? [...saved, ...missing] : saved;
}

function mergeHeroSlides(saved: HeroSlide[]) {
  return saved.map((slide, index) => ({ ...slide, id: slide.id || `hero-${Date.now()}-${index}`, active: slide.active !== false, order: Number(slide.order) || index + 1, createdAt: slide.createdAt || "2026.08.12", updatedAt: slide.updatedAt || "2026.08.12" })).sort((a, b) => a.order - b.order);
}

function usePersistentState<T>(key: string, initial: T, mergeSaved?: (saved: T) => T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try { const saved = localStorage.getItem(key); if (saved) { const parsed = JSON.parse(saved) as T; setValue(mergeSaved ? mergeSaved(parsed) : parsed); } } catch { /* use defaults */ }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [key, mergeSaved]);
  useEffect(() => { if (ready) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent("maison-storage-updated", { detail: { key } })); } }, [key, ready, value]);
  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as T;
        setValue(mergeSaved ? mergeSaved(parsed) : parsed);
      } catch { /* keep the current admin data when another tab writes malformed data */ }
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [key, mergeSaved]);
  return [value, setValue];
}

export default function AdminPage() {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [catalog, setCatalog] = usePersistentState("maison-admin-products", defaultProducts, mergeDefaultProducts);
  const [orders, setOrders] = usePersistentState("maison-admin-orders", initialOrders);
  const [inquiries, setInquiries] = usePersistentState("maison-admin-inquiries", initialInquiries);
  const [members, setMembers] = usePersistentState("maison-admin-members", initialMembers, mergeDefaultMembers);
  const [heroSlides, setHeroSlides] = usePersistentState("maison-admin-hero-slides", initialHeroSlides, mergeHeroSlides);
  const [newsletterSubscribers, setNewsletterSubscribers] = usePersistentState("maison-newsletter-subscribers", initialNewsletterSubscribers);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | "new" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [openInquiry, setOpenInquiry] = useState<number | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAdminUnlocked(sessionStorage.getItem("maison-admin-unlocked") === "true"));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const pendingInquiries = inquiries.filter((item) => item.status !== "처리완료").length;
  const filteredProducts = useMemo(() => catalog.filter((product) => (category === "전체" || product.category === category) && `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(query.toLowerCase())), [catalog, category, query]);
  const revenue = orders.filter((order) => order.status !== "취소" && order.status !== "환불완료").reduce((sum, order) => sum + order.amount, 0);

  const changeOrderStatus = (id: string, status: OrderStatus) => setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
  const saveHeroSlides = (slides: HeroSlide[]) => { setHeroSlides(slides); window.dispatchEvent(new Event("maison-hero-updated")); };
  const saveProduct = (product: AdminProduct) => { setCatalog((current) => current.some((item) => item.id === product.id) ? current.map((item) => item.id === product.id ? product : item) : [product, ...current]); setEditingProduct(null); };
  const saveOrder = (order: Order) => { setOrders((current) => current.map((item) => item.id === order.id ? order : item)); setSelectedOrder(order); };
  const inspectInquiry = (id: number) => { setOpenInquiry((current) => current === id ? null : id); setInquiries((current) => current.map((item) => item.id === id && item.status === "등록" ? { ...item, status: "처리중" } : item)); };
  const saveAnswer = (id: number, answer: string) => {
    const inquiry = inquiries.find((item) => item.id === id);
    if (inquiry?.sourceKey && inquiry.sourceQuestionId) {
      try {
        const customerQuestions = JSON.parse(localStorage.getItem(inquiry.sourceKey) || "[]") as Array<{ id: string; status: string; answer?: string }>;
        localStorage.setItem(inquiry.sourceKey, JSON.stringify(customerQuestions.map((item) => item.id === inquiry.sourceQuestionId ? { ...item, status: "답변완료", answer } : item)));
      } catch { /* keep admin answer even if customer cache is unavailable */ }
    }
    setInquiries((current) => current.map((item) => item.id === id ? { ...item, answer, status: "처리완료" } : item));
  };
  const saveMember = (member: Member) => { const next = members.map((item) => item.id === member.id ? member : item); setMembers(next); localStorage.setItem("maison-admin-members", JSON.stringify(next)); window.dispatchEvent(new CustomEvent("maison-storage-updated", { detail: { key: "maison-admin-members" } })); setSelectedMember(null); };

  const unlockAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adminPassword !== "1234") { setAdminError("관리자 비밀번호가 올바르지 않습니다."); return; }
    sessionStorage.setItem("maison-admin-unlocked", "true");
    setAdminError("");
    setAdminPassword("");
    setAdminUnlocked(true);
  };

  if (!adminUnlocked) return <main id="content" className="inner-page admin-page admin-lock-page"><section className="admin-lock-card"><img src="/maison-elan-symbol.svg" alt="" /><p className="eyebrow dark">MAISON ÉLAN / MANAGEMENT</p><h1>Administrator</h1><span>쇼핑몰 운영을 위한 관리자 전용 화면입니다.</span><form onSubmit={unlockAdmin}><label>관리자 비밀번호<input type="password" inputMode="numeric" autoComplete="current-password" value={adminPassword} onChange={(event) => { setAdminPassword(event.target.value); setAdminError(""); }} placeholder="비밀번호 입력" /></label>{adminError && <p role="alert">{adminError}</p>}<button type="submit">관리자 화면 들어가기</button></form><button className="admin-lock-return" type="button" onClick={() => window.location.assign("/")}>쇼핑몰로 돌아가기</button></section></main>;

  return <main id="content" className="inner-page admin-page"><div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-identity"><img src="/maison-elan-symbol.svg" alt="" /><div><strong>MAISON ÉLAN</strong><span>STORE ADMIN</span></div></div><nav aria-label="관리자 메뉴">{adminNav.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><Icon size={18} strokeWidth={1.4} /><span>{item.label}</span>{item.id === "inquiries" && pendingInquiries > 0 && <em>{pendingInquiries}</em>}</button>; })}</nav></aside>
    <section className="admin-workspace"><header className="admin-topbar"><div><p className="eyebrow dark">MAISON ÉLAN / MANAGEMENT</p><h1>{adminNav.find((item) => item.id === tab)?.label}</h1></div><div className="admin-profile"><span>2026.08.11</span><strong>ME</strong><p>관리자<br /><em>Administrator</em></p></div></header>
      {tab === "dashboard" && <Dashboard revenue={revenue} products={catalog} orders={orders} pending={pendingInquiries} go={setTab} changeOrderStatus={changeOrderStatus} openOrder={setSelectedOrder} />}
      {tab === "products" && <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading admin-list-heading"><div><p className="eyebrow dark">CATALOG / {catalog.length} ITEMS</p><h2>상품 목록</h2></div><div className="admin-heading-actions"><label className="admin-search"><Search size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명·SKU 검색" /><span className="sr-only">상품 검색</span></label><button className="admin-primary-action" type="button" onClick={() => setEditingProduct("new")}><Plus />상품 등록</button></div></div><div className="admin-filter-row"><button className={category === "전체" ? "active" : ""} onClick={() => setCategory("전체")} type="button">전체</button>{["Outer", "Dresses", "Tops", "Knitwear", "Bottoms", "Accessories"].map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} type="button" key={item}>{item}</button>)}</div><div className="admin-product-list admin-product-list-rich">{filteredProducts.map((product) => <article key={product.id}><img src={product.image} alt="" /><div><span>{product.sku} · {product.category.toUpperCase()}</span><h3>{product.name}</h3><p>{product.colors.length} COLORS · {product.sizes.join(" / ")}</p></div><strong>{formatPrice(product.price)}</strong><div className="admin-inventory"><span className={`admin-stock ${product.stock <= 5 ? "is-low" : ""}`}>{product.stock <= 5 ? `재고 ${product.stock}` : `${product.stock}개`}</span><em className={`status-${product.status}`}>{product.status}</em></div><button type="button" onClick={() => setEditingProduct(product)} aria-label={`${product.name} 수정`}><Pencil size={17} /></button></article>)}</div></section></div>}
      {tab === "hero" && <HeroManagement slides={heroSlides} onSave={saveHeroSlides} />}
      {tab === "orders" && <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">ORDER &amp; FULFILLMENT</p><h2>전체 주문</h2></div><span>{orders.length} ORDERS</span></div><OrderTable orders={orders} onChange={changeOrderStatus} onOpen={setSelectedOrder} /></section></div>}
      {tab === "inquiries" && <InquiryManagement inquiries={inquiries} pending={pendingInquiries} openId={openInquiry} inspect={inspectInquiry} saveAnswer={saveAnswer} />}
      {tab === "members" && <MemberManagement members={members} onChange={setMembers} onOpen={setSelectedMember} />}
      {tab === "newsletter" && <NewsletterManagement subscribers={newsletterSubscribers} onChange={setNewsletterSubscribers} />}
    </section>
  </div>
  {editingProduct && <Modal title={editingProduct === "new" ? "새 상품 등록" : "상품 콘텐츠 수정"} eyebrow="PRODUCT EDITOR" close={() => setEditingProduct(null)}><ProductEditor product={editingProduct === "new" ? undefined : editingProduct} onSave={saveProduct} /></Modal>}
  {selectedOrder && <Modal title="주문·배송 상세" eyebrow={selectedOrder.id} close={() => setSelectedOrder(null)}><OrderEditor order={selectedOrder} onSave={saveOrder} /></Modal>}
  {selectedMember && <Modal title="회원 상세 관리" eyebrow={selectedMember.id} close={() => setSelectedMember(null)}><MemberEditor member={selectedMember} orders={orders.filter((order) => order.email === selectedMember.email)} onSave={saveMember} /></Modal>}
  </main>;
}

function Dashboard({ revenue, products: catalog, orders, pending, go, changeOrderStatus, openOrder }: { revenue: number; products: AdminProduct[]; orders: Order[]; pending: number; go: Dispatch<SetStateAction<AdminTab>>; changeOrderStatus: (id: string, status: OrderStatus) => void; openOrder: (order: Order) => void }) {
  const ready = orders.filter((order) => order.status === "결제완료" || order.status === "출고준비").length;
  return <div className="admin-view"><div className="admin-stats"><article><span>누적 주문 매출</span><strong>{formatPrice(revenue)}</strong><p><TrendingUp /> 정상 결제 기준</p></article><article><span>신규·출고 준비</span><strong>{ready}</strong><p>오늘 처리할 주문</p></article><article><span>판매 상품</span><strong>{catalog.filter((product) => product.status === "판매중").length}</strong><p>재고 임박 {catalog.filter((product) => product.stock <= 5).length}개</p></article><article><span>처리할 문의</span><strong>{pending}</strong><p>등록·처리중 문의</p></article></div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">RECENT ORDERS</p><h2>최근 주문</h2></div><button type="button" onClick={() => go("orders")}>전체 보기 <ChevronRight /></button></div><OrderTable orders={orders.slice(0, 3)} onChange={changeOrderStatus} onOpen={openOrder} compact /></section><section className="admin-panel admin-sales-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">SALES OVERVIEW</p><h2>이번 주 매출</h2></div><span>{formatPrice(revenue)}</span></div><div className="admin-chart">{[42, 58, 48, 76, 64, 92, 81].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{["월", "화", "수", "목", "금", "토", "일"][index]}</span></div>)}</div></section></div><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">ACTION REQUIRED</p><h2>처리가 필요한 항목</h2></div></div><div className="admin-actions-list"><button type="button" onClick={() => go("orders")}><PackageOpen /><span><strong>출고 준비 주문 {ready}건</strong><em>상품 검수 후 송장 정보를 등록해 주세요.</em></span><ChevronRight /></button><button type="button" onClick={() => go("inquiries")}><MessageSquare /><span><strong>처리할 문의 {pending}건</strong><em>문의 확인 후 답변을 등록해 주세요.</em></span><ChevronRight /></button><button type="button" onClick={() => go("members")}><Users /><span><strong>전체 회원 관리</strong><em>회원 상태와 구매 이력을 확인하세요.</em></span><ChevronRight /></button></div></section></div>;
}

function OrderTable({ orders, onChange, onOpen, compact = false }: { orders: Order[]; onChange: (id: string, status: OrderStatus) => void; onOpen?: (order: Order) => void; compact?: boolean }) { return <div className={`admin-order-table ${compact ? "is-compact" : ""}`}><div className="admin-table-row admin-table-head"><span>주문번호</span><span>고객</span><span>주문 상품</span><span>결제금액</span><span>주문일</span><span>처리 상태</span><span /></div>{orders.map((order) => <div className="admin-table-row" key={order.id}><strong>{displayOrderNumber(order)}</strong><span>{order.customer}</span><div className="admin-order-products">{order.items.map((product, index) => <span key={`${product.id}-${index}`} title={`${product.name} / ${product.color} / ${product.size}`}><img src={product.image} alt={product.name} /><em>{product.quantity}</em></span>)}</div><span>{formatPrice(order.amount)}</span><span>{displayOrderDate(order.date)}</span><select value={order.status} onChange={(event) => onChange(order.id, event.target.value as OrderStatus)} aria-label={`${displayOrderNumber(order)} 주문 상태`}>{["결제완료", "출고준비", "출고완료", "배송중", "배송완료", "취소", "환불완료"].map((status) => <option key={status}>{status}</option>)}</select>{onOpen ? <button className="admin-row-button" type="button" onClick={() => onOpen(order)}>상세 <Eye /></button> : <span />}</div>)}</div>; }

function InquiryManagement({ inquiries, pending, openId, inspect, saveAnswer }: { inquiries: Inquiry[]; pending: number; openId: number | null; inspect: (id: number) => void; saveAnswer: (id: number, answer: string) => void }) { return <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">CUSTOMER Q&amp;A</p><h2>상품 문의</h2></div><span>처리 필요 {pending}건</span></div><div className="admin-inquiry-status-guide"><span><i className="is-new" />등록 <b>{inquiries.filter((item) => item.status === "등록").length}</b></span><ChevronRight /><span><i className="is-progress" />처리중 <b>{inquiries.filter((item) => item.status === "처리중").length}</b></span><ChevronRight /><span><i className="is-done" />처리완료 <b>{inquiries.filter((item) => item.status === "처리완료").length}</b></span></div><div className="admin-inquiry-list admin-inquiry-workflow">{inquiries.map((inquiry) => <article className={openId === inquiry.id ? "is-open" : ""} key={inquiry.id}><button className="admin-inquiry-summary" type="button" onClick={() => inspect(inquiry.id)}><span className={`inquiry-${inquiry.status}`}>{inquiry.status}</span><div><p>{inquiry.product} · {inquiry.category} · {inquiry.date}</p><h3>{inquiry.title}</h3><em>{inquiry.customer}</em></div><ChevronDown /></button>{openId === inquiry.id && <div className="admin-inquiry-detail"><div className="inquiry-question"><strong>CUSTOMER QUESTION</strong><p>{inquiry.body}</p></div>{inquiry.status === "처리완료" ? <div className="inquiry-saved-answer"><strong><Check /> MAISON ÉLAN 답변</strong><p>{inquiry.answer}</p></div> : <form onSubmit={(event) => { event.preventDefault(); const answer = String(new FormData(event.currentTarget).get("answer")); saveAnswer(inquiry.id, answer); }}><label>답변 내용<textarea name="answer" required defaultValue={inquiry.answer} rows={5} placeholder="고객에게 전달할 답변을 입력해 주세요." /></label><div><span><AlertCircle />답변 등록 시 상태가 ‘처리완료’로 변경됩니다.</span><button className="admin-primary-action" type="submit"><Check />답변 등록 및 처리완료</button></div></form>}</div>}</article>)}</div></section></div>; }

function MemberManagement({ members, onChange, onOpen }: { members: Member[]; onChange: Dispatch<SetStateAction<Member[]>>; onOpen: (member: Member) => void }) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Member["status"]>("정상");
  const [couponName, setCouponName] = useState("감사 10% 할인");
  const [couponValue, setCouponValue] = useState(10);
  const [couponExpiresOn, setCouponExpiresOn] = useState(defaultCouponExpiry);
  const [notice, setNotice] = useState("");
  const filtered = members.filter((member) => `${member.name} ${member.email} ${member.phone}`.toLowerCase().includes(search.toLowerCase()));
  const visibleIds = filtered.map((member) => member.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const persistMembers = (next: Member[]) => {
    onChange(next);
    localStorage.setItem("maison-admin-members", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("maison-storage-updated", { detail: { key: "maison-admin-members" } }));
  };
  const applyStatus = () => {
    if (!selectedIds.length) return;
    persistMembers(members.map((member) => selectedIds.includes(member.id) ? { ...member, status: bulkStatus } : member));
    setNotice(`${selectedIds.length}명의 회원 상태를 ${bulkStatus}(으)로 변경했습니다.`);
  };
  const issueCoupon = () => {
    if (!selectedIds.length || !couponExpiresOn) return;
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(`${couponExpiresOn}T23:59:59.999`).toISOString();
    const normalizedValue = Math.min(100, Math.max(1, couponValue));
    const selectedMembers = members.filter((member) => selectedIds.includes(member.id));
    const issues: AdminCouponIssue[] = selectedMembers.map((member, index) => {
      const uniqueSuffix = `${Date.now().toString(36)}${index.toString(36)}`.toUpperCase();
      return { issueId: `issue-${uniqueSuffix}`, email: member.email, status: "대기", coupon: { id: `admin-${uniqueSuffix}`, code: `ELAN${normalizedValue}-${uniqueSuffix}`, name: couponName.trim() || `감사 ${normalizedValue}% 할인`, discountType: "percent", value: normalizedValue, minimumPurchase: 0, issuedAt, expiresAt, used: false } };
    });
    const issueByEmail = new Map(issues.map((issue) => [issue.email, issue]));
    persistMembers(members.map((member) => {
      const issue = issueByEmail.get(member.email);
      return issue ? { ...member, coupons: [...(member.coupons ?? []), issue.coupon] } : member;
    }));
    let savedIssues: AdminCouponIssue[] = [];
    try { savedIssues = JSON.parse(localStorage.getItem("maison-admin-coupon-issues") || "[]") as AdminCouponIssue[]; } catch { /* start a new issue ledger */ }
    localStorage.setItem("maison-admin-coupon-issues", JSON.stringify([...issues, ...savedIssues]));
    window.dispatchEvent(new CustomEvent("maison-coupon-issued", { detail: { issues } }));
    setNotice(`${selectedIds.length}명에게 ${normalizedValue}% 쿠폰을 발급했습니다. 사용 마감일은 ${couponExpiresOn}입니다.`);
  };
  return <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading admin-list-heading"><div><p className="eyebrow dark">CUSTOMERS / {members.length}</p><h2>회원 목록</h2></div><label className="admin-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름·이메일·연락처 검색" /></label></div>
    <div className="admin-member-bulk-bar"><strong>{selectedIds.length}명 선택</strong><label>상태<select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as Member["status"])}><option>정상</option><option>휴면</option><option>차단</option></select></label><button type="button" disabled={!selectedIds.length} onClick={applyStatus}>상태 일괄 변경</button><span /><label>쿠폰명<input value={couponName} onChange={(event) => setCouponName(event.target.value)} /></label><label>할인율<input type="number" min="1" max="100" value={couponValue} onChange={(event) => setCouponValue(Number(event.target.value))} /></label><label>쿠폰 사용 마감일<input type="date" min={dateInputValue(new Date())} value={couponExpiresOn} onChange={(event) => setCouponExpiresOn(event.target.value)} required /></label><button className="is-primary" type="button" disabled={!selectedIds.length || !couponExpiresOn} onClick={issueCoupon}>선택 회원 쿠폰 발급</button></div>
    {notice && <p className="admin-bulk-notice" role="status">{notice}</p>}
    <div className="admin-member-table"><div className="admin-member-row admin-member-head"><label className="admin-member-check"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])} aria-label="검색된 회원 전체 선택" /></label><span>회원</span><span>연락처</span><span>가입일</span><span>주문</span><span>누적 구매</span><span>상태</span><span /></div>{filtered.map((member) => <div className={`admin-member-row${selectedIds.includes(member.id) ? " is-selected" : ""}`} key={member.id}><label className="admin-member-check"><input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => setSelectedIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} aria-label={`${member.name} 선택`} /></label><div><i>{member.name.slice(0, 1)}</i><span><strong>{member.name}</strong><em>{member.email}</em></span></div><span>{member.phone}</span><span>{member.joinedAt}</span><span>{member.orderCount}건</span><strong>{formatPrice(member.totalSpent)}</strong><span className={`member-${member.status}`}>{member.status}</span><button type="button" onClick={() => onOpen(member)}>상세 관리</button></div>)}</div></section></div>;
}

function HeroManagement({ slides, onSave }: { slides: HeroSlide[]; onSave: (slides: HeroSlide[]) => void }) {
  const [draft, setDraft] = useState(slides.map((slide) => ({ ...slide })));
  const update = (id: string, patch: Partial<HeroSlide>) => setDraft((current) => current.map((slide) => slide.id === id ? { ...slide, ...patch } : slide));
  const addSlide = () => {
    const now = new Date();
    const stamp = now.toISOString();
    const nextOrder = draft.reduce((highest, slide) => Math.max(highest, slide.order), 0) + 1;
    setDraft((current) => [...current, {
      id: `hero-${crypto.randomUUID()}`,
      active: false,
      order: nextOrder,
      createdAt: stamp,
      updatedAt: stamp,
      eyebrow: "MAISON ÉLAN / NEW CAMPAIGN",
      title: "New",
      accent: "Story",
      description: "새로운 메인 비주얼의 설명을 입력해 주세요.",
      image: "/hero-01.png",
      imageClass: "hero-image-group",
      primary: "컬렉션 보기",
      secondary: "브랜드 스토리",
      href: "/shop",
    }]);
  };
  const save = () => {
    if (!draft.some((slide) => slide.active)) {
      window.alert("메인에 사용할 비주얼을 한 개 이상 선택해 주세요.");
      return;
    }
    const savedAt = new Date().toISOString();
    const normalized = [...draft]
      .sort((left, right) => left.order - right.order)
      .map((slide, index) => ({ ...slide, order: index + 1, updatedAt: savedAt }));
    setDraft(normalized);
    onSave(normalized);
  };
  const activeCount = draft.filter((slide) => slide.active).length;
  return <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading admin-list-heading"><div><p className="eyebrow dark">HOME / FIRST VISUAL</p><h2>메인 비주얼 게시 목록</h2><p className="admin-heading-description">비주얼을 계속 추가해 이력을 보관하고, 사용할 항목과 노출 순서를 선택할 수 있습니다.</p></div><div className="admin-heading-actions"><span>{draft.length}개 · 사용 {activeCount}개</span><button className="admin-primary-action" type="button" onClick={addSlide}><Plus />비주얼 추가</button></div></div><div className="admin-hero-editor">{draft.map((slide, index) => <article className={slide.active ? "is-active" : "is-inactive"} key={slide.id}><div className="admin-hero-preview"><img src={slide.image} alt={`히어로 ${index + 1} 미리보기`} /><span>{slide.active ? "게시 중" : "미사용·이력 보관"}</span></div><div><div className="admin-hero-record-head"><p>VISUAL {String(index + 1).padStart(2, "0")} · {slide.id.slice(-8).toUpperCase()}</p><label className="admin-hero-toggle"><input type="checkbox" checked={slide.active} onChange={(event) => update(slide.id, { active: event.target.checked })} /><span>메인에 사용</span></label></div><div className="admin-form-grid admin-hero-order-row"><label>노출 순서<input type="number" min="1" value={slide.order} onChange={(event) => update(slide.id, { order: Math.max(1, Number(event.target.value)) })} /></label><label>이미지 스타일<select value={slide.imageClass} onChange={(event) => update(slide.id, { imageClass: event.target.value })}><option value="hero-image-group">그룹 룩</option><option value="hero-image-tailoring">테일러링</option><option value="hero-image-silk">실크</option></select></label><label>상단 문구<input value={slide.eyebrow} onChange={(event) => update(slide.id, { eyebrow: event.target.value })} /></label><label>제목<input value={slide.title} onChange={(event) => update(slide.id, { title: event.target.value })} /></label><label>강조 제목<input value={slide.accent} onChange={(event) => update(slide.id, { accent: event.target.value })} /></label><label>버튼 문구<input value={slide.primary} onChange={(event) => update(slide.id, { primary: event.target.value })} /></label><label>보조 버튼 문구<input value={slide.secondary} onChange={(event) => update(slide.id, { secondary: event.target.value })} /></label><label>연결 주소<input value={slide.href} onChange={(event) => update(slide.id, { href: event.target.value })} /></label><label className="full">설명<input value={slide.description} onChange={(event) => update(slide.id, { description: event.target.value })} /></label><label className="full">이미지 경로<input value={slide.image} onChange={(event) => update(slide.id, { image: event.target.value })} /></label></div><small className="admin-hero-history">등록 {formatHeroDate(slide.createdAt)} · 최근 저장 {formatHeroDate(slide.updatedAt)}</small></div></article>)}</div><div className="admin-panel-footer"><p>사용하지 않는 비주얼도 삭제하지 않고 이력으로 보관됩니다.</p><button className="admin-primary-action" type="button" onClick={save}><Save />메인 비주얼 저장</button></div></section></div>;
}

function formatHeroDate(value: string) {
  const parsed = new Date(value.replaceAll(".", "-"));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("ko-KR");
}

function displayOrderNumber(order: Order) {
  if (/^ME-\d{6}-\d{4}$/.test(order.id)) return order.id;
  const digits = order.id.split("").reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 10_000, 0);
  const parsed = new Date(order.date.replace(/\.\s?/g, "-").replace(/-(?=\d{2}:)/, " "));
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const date = `${String(base.getFullYear()).slice(-2)}${String(base.getMonth() + 1).padStart(2, "0")}${String(base.getDate()).padStart(2, "0")}`;
  return `ME-${date}-${String(digits).padStart(4, "0")}`;
}

function displayOrderDate(value: string) {
  const parsed = new Date(value.replace(/\.\s?/g, "-").replace(/-(?=\d{2}:)/, " "));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(parsed).replace(/\. /g, ".").replace(/\.$/, "");
}

function NewsletterManagement({ subscribers, onChange }: { subscribers: NewsletterSubscriber[]; onChange: Dispatch<SetStateAction<NewsletterSubscriber[]>> }) {
  return <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">PRIVATE LETTER / SUBSCRIBERS</p><h2>뉴스레터 구독자</h2></div><span>{subscribers.filter((subscriber) => subscriber.status === "구독중").length} ACTIVE</span></div><div className="admin-subscriber-list"><div className="admin-subscriber-row is-head"><span>이메일</span><span>구독일</span><span>상태</span></div>{subscribers.map((subscriber) => <div className="admin-subscriber-row" key={subscriber.email}><strong>{subscriber.email}</strong><span>{new Date(subscriber.subscribedAt).toLocaleDateString("ko-KR")}</span><button type="button" className={subscriber.status === "구독중" ? "is-active" : ""} onClick={() => onChange((current) => current.map((item) => item.email === subscriber.email ? { ...item, status: item.status === "구독중" ? "수신거부" : "구독중" } : item))}>{subscriber.status}</button></div>)}</div></section></div>;
}

function Modal({ title, eyebrow, close, children }: { title: string; eyebrow: string; close: () => void; children: React.ReactNode }) { return <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2></div><button type="button" onClick={close} aria-label="닫기"><X /></button></header><div className="admin-modal-content">{children}</div></section></div>; }

function normalizeImageSource(value: string) {
  const source = value.trim();
  const githubFile = source.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (githubFile) return `https://raw.githubusercontent.com/${githubFile[1]}/${githubFile[2]}/${githubFile[3]}/${githubFile[4]}`;
  return source;
}

function ProductEditor({ product, onSave }: { product?: AdminProduct; onSave: (product: AdminProduct) => void }) {
  const [image, setImage] = useState(product?.image ?? "");
  const [secondaryImage, setSecondaryImage] = useState(product?.secondaryImage ?? "");
  const [imageError, setImageError] = useState("");
  const colorsText = product?.colors.map((color) => `${color.name}|${color.hex}|${color.image}|${color.details?.join(",") ?? ""}`).join("\n") ?? "Black|#171514|";
  const attachImage = (event: ChangeEvent<HTMLInputElement>, setTarget: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setImageError("JPG, PNG, WEBP 등 이미지 파일만 첨부할 수 있습니다."); return; }
    if (file.size > 1_500_000) { setImageError("첨부 이미지는 1.5MB 이하로 줄여서 등록해 주세요."); return; }
    const reader = new FileReader();
    reader.onload = () => { setTarget(String(reader.result)); setImageError(""); };
    reader.onerror = () => setImageError("이미지를 읽지 못했습니다. 다시 선택해 주세요.");
    reader.readAsDataURL(file);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name"));
    const slug = product?.id ?? `${name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "")}-${crypto.getRandomValues(new Uint16Array(1))[0]}`;
    const primaryImage = normalizeImageSource(image);
    const secondImage = normalizeImageSource(secondaryImage) || primaryImage;
    const parsedColors = String(data.get("colors")).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [colorName, hex, colorImage, details] = line.split("|");
      return { name: colorName?.trim() || "Color", hex: hex?.trim() || "#222222", image: normalizeImageSource(colorImage || primaryImage), details: details?.split(",").map((value) => normalizeImageSource(value)).filter(Boolean) };
    });
    onSave({ id: slug, sku: String(data.get("sku")) || `ME-NEW-${String(crypto.getRandomValues(new Uint16Array(1))[0]).slice(-3)}`, name, category: String(data.get("category")) as Product["category"], price: Number(data.get("price")), originalPrice: Number(data.get("originalPrice")) || undefined, stock: Number(data.get("stock")), status: String(data.get("status")) as ProductStatus, label: String(data.get("label")) || undefined, image: primaryImage, secondaryImage: secondImage, colors: parsedColors.length ? parsedColors : [{ name: "Color", hex: "#222222", image: primaryImage }], sizes: String(data.get("sizes")).split(",").map((value) => value.trim()).filter(Boolean), description: String(data.get("description")), material: String(data.get("material")), fit: String(data.get("fit")), detailHighlights: String(data.get("detailHighlights")).split("\n").map((value) => value.trim()).filter(Boolean), careInstructions: String(data.get("careInstructions")), origin: String(data.get("origin")) || "대한민국", rating: product?.rating ?? 0, reviewCount: product?.reviewCount ?? 0, questionCount: product?.questionCount ?? 0, updatedAt: new Date().toLocaleDateString("ko-KR") });
  };
  return <form className="admin-editor-form" onSubmit={submit}><section><h3>기본 정보</h3><div className="admin-form-grid"><label>상품명<input name="name" required defaultValue={product?.name} /></label><label>SKU<input name="sku" defaultValue={product?.sku} placeholder="비워두면 자동 생성" /></label><label>카테고리<select name="category" defaultValue={product?.category ?? "Outer"}>{["Outer", "Dresses", "Tops", "Knitwear", "Bottoms", "Accessories"].map((value) => <option key={value}>{value}</option>)}</select></label><label>배지<select name="label" defaultValue={product?.label ?? ""}><option value="">없음</option><option>NEW</option><option>BEST</option><option>SALE</option><option>LIMITED</option></select></label><label>판매가<input name="price" required type="number" defaultValue={product?.price} /></label><label>정상가<input name="originalPrice" type="number" defaultValue={product?.originalPrice} /></label><label>재고 수량<input name="stock" required type="number" min="0" defaultValue={product?.stock ?? 0} /></label><label>판매 상태<select name="status" defaultValue={product?.status ?? "판매중"}><option>판매중</option><option>품절</option><option>판매중지</option></select></label></div></section><section><h3>이미지·옵션</h3><div className="admin-form-grid"><label className="full">대표 이미지 주소<input name="image" required value={image} onChange={(event) => setImage(event.target.value)} placeholder="이미지 URL 또는 GitHub 파일 링크" /></label><label className="full admin-image-upload">대표 이미지 첨부<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => attachImage(event, setImage)} /><small>JPG · PNG · WEBP · GIF / 1.5MB 이하</small></label><label className="full">두 번째 이미지 주소<input name="secondaryImage" value={secondaryImage} onChange={(event) => setSecondaryImage(event.target.value)} placeholder="선택 입력" /></label><label className="full admin-image-upload">두 번째 이미지 첨부<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => attachImage(event, setSecondaryImage)} /><small>첨부한 이미지는 이 브라우저의 상품 관리 데이터에 저장됩니다.</small></label><label className="full">사이즈 — 쉼표로 구분<input name="sizes" required defaultValue={product?.sizes.join(", ") ?? "XS, S, M, L"} /></label><label className="full">색상 — 이름 | HEX | 대표 이미지 | 상세 이미지들(쉼표)<textarea name="colors" required rows={4} defaultValue={colorsText} /></label></div>{imageError && <p className="admin-image-error" role="alert">{imageError}</p>}{image && <div className="admin-product-preview"><img src={normalizeImageSource(image)} alt="대표 이미지 미리보기" /><span>대표 이미지 미리보기</span></div>}</section><section><h3>상세 콘텐츠</h3><div className="admin-form-grid"><label className="full">상품 설명<textarea name="description" required rows={5} defaultValue={product?.description} /></label><label className="full">소재<input name="material" required defaultValue={product?.material} /></label><label className="full">핏·모델 정보<input name="fit" required defaultValue={product?.fit} /></label><label className="full">핵심 디테일 — 한 줄에 하나<textarea name="detailHighlights" rows={4} defaultValue={product?.detailHighlights?.join("\n")} placeholder="디자인 포인트를 한 줄씩 입력해 주세요" /></label><label className="full">관리 방법<textarea name="careInstructions" rows={3} defaultValue={product?.careInstructions} /></label><label>제조국<input name="origin" defaultValue={product?.origin ?? "대한민국"} /></label></div></section><footer><button className="admin-primary-action" type="submit"><Save />{product ? "수정 내용 저장" : "상품 등록"}</button></footer></form>;
}

function OrderEditor({ order, onSave }: { order: Order; onSave: (order: Order) => void }) {
  const [draft, setDraft] = useState({ ...order, items: order.items.map((product) => ({ ...product, status: product.status ?? order.status, courier: product.courier ?? order.courier, trackingNumber: product.trackingNumber ?? order.trackingNumber })) });
  const statuses: OrderStatus[] = ["결제완료", "출고준비", "출고완료", "배송중", "배송완료", "취소", "환불완료"];
  const updateItem = (index: number, data: Partial<OrderItem>) => setDraft((current) => ({ ...current, items: current.items.map((product, itemIndex) => itemIndex === index ? { ...product, ...data } : product) }));
  const applyDefaultToAll = () => setDraft((current) => ({ ...current, items: current.items.map((product) => ({ ...product, status: current.status, courier: current.courier, trackingNumber: current.trackingNumber })) }));

  return <form className="admin-editor-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><section><div className="admin-order-customer"><span><UserRound /></span><div><h3>{draft.customer}</h3><p>{draft.email} · {draft.phone}</p><p>{draft.address}</p></div></div></section><section><h3>주문 상품 {draft.items.length}개</h3><div className="admin-order-item-list">{draft.items.map((product, index) => <article key={`${product.id}-${index}`}><img src={product.image} alt="" /><div><strong>{product.name}</strong><p>{product.color} · {product.size} · 수량 {product.quantity}</p></div><b>{formatPrice(product.price * product.quantity)}</b></article>)}</div><div className="admin-order-total"><span>총 결제 금액</span><strong>{formatPrice(draft.amount)}</strong></div></section><section><div className="admin-section-heading"><div><h3>상품별 출고·배송 처리</h3><p>분리 출고되는 상품은 상태와 송장번호를 각각 입력하세요.</p></div><button type="button" onClick={applyDefaultToAll}>대표 정보 전체 적용</button></div><div className="admin-form-grid admin-order-defaults"><label>주문 대표 상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OrderStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>기본 택배사<input value={draft.courier} onChange={(event) => setDraft({ ...draft, courier: event.target.value })} placeholder="예: CJ대한통운" /></label><label className="full">대표 송장번호<input value={draft.trackingNumber} onChange={(event) => setDraft({ ...draft, trackingNumber: event.target.value })} placeholder="상품별 송장이 같을 때 입력" /></label></div><div className="admin-item-fulfillment-list">{draft.items.map((product, index) => <article key={`${product.id}-delivery-${index}`}><header><img src={product.image} alt="" /><div><span>배송 {index + 1}</span><strong>{product.name}</strong><p>{product.color} · {product.size} · 수량 {product.quantity}</p></div></header><div className="admin-form-grid"><label>배송 상태<select value={product.status} onChange={(event) => updateItem(index, { status: event.target.value as OrderStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>택배사<input value={product.courier ?? ""} onChange={(event) => updateItem(index, { courier: event.target.value })} placeholder="택배사" /></label><label>송장번호<input value={product.trackingNumber ?? ""} onChange={(event) => updateItem(index, { trackingNumber: event.target.value })} placeholder="출고 후 입력" /></label><label>도착 예정일<input type="date" value={product.estimatedDelivery ?? ""} onChange={(event) => updateItem(index, { estimatedDelivery: event.target.value })} /></label></div></article>)}</div><label className="admin-delivery-memo">배송 메모<textarea rows={3} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} /></label></section><footer><button className="admin-primary-action" type="submit"><Truck />상품별 배송 정보 저장</button></footer></form>;
}

function MemberEditor({ member, orders, onSave }: { member: Member; orders: Order[]; onSave: (member: Member) => void }) { const [draft, setDraft] = useState(member); return <form className="admin-editor-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><section><div className="admin-member-profile"><i>{draft.name.slice(0, 1)}</i><div><h3>{draft.name}</h3><p>{draft.email}</p><span>가입 {draft.joinedAt} · 최근 로그인 {draft.lastLogin}</span></div></div><div className="admin-member-summary"><div><span>누적 주문</span><strong>{draft.orderCount}건</strong></div><div><span>누적 구매</span><strong>{formatPrice(draft.totalSpent)}</strong></div></div></section><section><h3>회원 정보 및 상태</h3><div className="admin-form-grid"><label>연락처<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label>회원 상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Member["status"] })}><option>정상</option><option>휴면</option><option>차단</option></select></label><label className="full">기본 배송지<input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label><label className="full">관리자 메모<textarea rows={4} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} placeholder="고객에게 노출되지 않는 메모" /></label></div></section><section><h3>최근 구매 상품</h3>{orders.length ? <div className="admin-member-orders">{orders.flatMap((order) => order.items).map((product, index) => <img key={`${product.id}-${index}`} src={product.image} alt={product.name} title={product.name} />)}</div> : <p className="admin-no-data">연결된 주문 내역이 없습니다.</p>}</section><footer><button className="admin-primary-action" type="submit"><Save />회원 정보 저장</button></footer></form>; }
