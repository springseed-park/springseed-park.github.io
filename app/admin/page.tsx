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
  MessageSquare,
  PackageOpen,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import { formatPrice, Product, products } from "../lib/products";
import { type PaymentInfo, useAuth } from "../components/AuthProvider";

type AdminTab = "dashboard" | "products" | "orders" | "inquiries" | "members";
type ProductStatus = "판매중" | "품절" | "판매중지";
type InquiryStatus = "등록" | "처리중" | "처리완료";
type OrderStatus = "결제완료" | "출고준비" | "출고완료" | "배송중" | "배송완료" | "취소" | "환불완료";
type AdminProduct = Product & { sku: string; stock: number; status: ProductStatus; updatedAt: string };
type OrderItem = { id: string; name: string; image: string; color: string; size: string; quantity: number; price: number; status?: OrderStatus; courier?: string; trackingNumber?: string; estimatedDelivery?: string };
type Order = { id: string; customer: string; email: string; phone: string; address: string; items: OrderItem[]; amount: number; date: string; status: OrderStatus; courier: string; trackingNumber: string; memo: string; payment?: PaymentInfo };
type Inquiry = { id: number; product: string; category: string; title: string; body: string; customer: string; date: string; status: InquiryStatus; answer: string; sourceKey?: string; sourceQuestionId?: string };
type Member = { id: string; name: string; email: string; phone: string; joinedAt: string; lastLogin: string; orderCount: number; totalSpent: number; status: "정상" | "휴면" | "차단"; address: string; memo: string };

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
  { id: "orders" as const, label: "주문·배송", icon: ClipboardList },
  { id: "inquiries" as const, label: "문의 관리", icon: MessageSquare },
  { id: "members" as const, label: "회원 관리", icon: Users },
];

function mergeDefaultProducts(saved: AdminProduct[]) {
  const savedIds = new Set(saved.map((product) => product.id));
  const missing = defaultProducts.filter((product) => !savedIds.has(product.id));
  return missing.length ? [...missing, ...saved] : saved;
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
  const auth = useAuth();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [catalog, setCatalog] = usePersistentState("maison-admin-products", defaultProducts, mergeDefaultProducts);
  const [orders, setOrders] = usePersistentState("maison-admin-orders", initialOrders);
  const [inquiries, setInquiries] = usePersistentState("maison-admin-inquiries", initialInquiries);
  const [members, setMembers] = usePersistentState("maison-admin-members", initialMembers);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | "new" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [openInquiry, setOpenInquiry] = useState<number | null>(null);
  useEffect(() => {
    if (!auth.user || auth.orders.length === 0) return;
    setOrders((current) => {
      const currentIds = new Set(current.map((order) => order.id));
      const missingOrders: Order[] = auth.orders.filter((order) => !currentIds.has(order.orderNumber)).map((order) => ({
        id: order.orderNumber,
        customer: order.shippingAddress?.recipient || auth.profile?.displayName || "회원 고객",
        email: auth.user?.email || auth.profile?.email || "",
        phone: order.shippingAddress?.phone || auth.profile?.phone || "",
        address: order.shippingAddress ? `[${order.shippingAddress.postalCode}] ${order.shippingAddress.addressLine1} ${order.shippingAddress.addressLine2}`.trim() : "회원 배송지",
        items: order.items.map((product, index) => ({ ...product, status: order.itemShipments?.[index]?.status as OrderStatus | undefined, courier: order.itemShipments?.[index]?.courier, trackingNumber: order.itemShipments?.[index]?.trackingNumber, estimatedDelivery: order.itemShipments?.[index]?.estimatedDelivery })),
        amount: order.total,
        date: order.createdAt?.toLocaleString("ko-KR") || "방금 전",
        status: "결제완료",
        courier: order.courier || "배송 준비 중",
        trackingNumber: order.trackingNumber || "",
        memo: "",
        payment: order.payment,
      }));
      return missingOrders.length ? [...missingOrders, ...current] : current;
    });
  }, [auth.orders, auth.profile, auth.user, setOrders]);
  const pendingInquiries = inquiries.filter((item) => item.status !== "처리완료").length;
  const filteredProducts = useMemo(() => catalog.filter((product) => (category === "전체" || product.category === category) && `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(query.toLowerCase())), [catalog, category, query]);
  const revenue = orders.filter((order) => order.status !== "취소" && order.status !== "환불완료").reduce((sum, order) => sum + order.amount, 0);

  const changeOrderStatus = (id: string, status: OrderStatus) => setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
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
  const saveMember = (member: Member) => { setMembers((current) => current.map((item) => item.id === member.id ? member : item)); setSelectedMember(member); };

  return <main id="content" className="inner-page admin-page"><div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-identity"><img src="/maison-elan-symbol.svg" alt="" /><div><strong>MAISON ÉLAN</strong><span>STORE ADMIN</span></div></div><nav aria-label="관리자 메뉴">{adminNav.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><Icon size={18} strokeWidth={1.4} /><span>{item.label}</span>{item.id === "inquiries" && pendingInquiries > 0 && <em>{pendingInquiries}</em>}</button>; })}</nav><div className="admin-sidebar-bottom"><Settings size={17} /><span>로컬 운영 데이터 자동 저장</span></div></aside>
    <section className="admin-workspace"><header className="admin-topbar"><div><p className="eyebrow dark">MAISON ÉLAN / MANAGEMENT</p><h1>{adminNav.find((item) => item.id === tab)?.label}</h1></div><div className="admin-profile"><span>2026.08.11</span><strong>ME</strong><p>관리자<br /><em>Administrator</em></p></div></header>
      {tab === "dashboard" && <Dashboard revenue={revenue} products={catalog} orders={orders} pending={pendingInquiries} go={setTab} changeOrderStatus={changeOrderStatus} />}
      {tab === "products" && <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading admin-list-heading"><div><p className="eyebrow dark">CATALOG / {catalog.length} ITEMS</p><h2>상품 목록</h2></div><div className="admin-heading-actions"><label className="admin-search"><Search size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명·SKU 검색" /><span className="sr-only">상품 검색</span></label><button className="admin-primary-action" type="button" onClick={() => setEditingProduct("new")}><Plus />상품 등록</button></div></div><div className="admin-filter-row"><button className={category === "전체" ? "active" : ""} onClick={() => setCategory("전체")} type="button">전체</button>{["Outer", "Dresses", "Tops", "Knitwear", "Bottoms", "Accessories"].map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} type="button" key={item}>{item}</button>)}</div><div className="admin-product-list admin-product-list-rich">{filteredProducts.map((product) => <article key={product.id}><img src={product.image} alt="" /><div><span>{product.sku} · {product.category.toUpperCase()}</span><h3>{product.name}</h3><p>{product.colors.length} COLORS · {product.sizes.join(" / ")}</p></div><strong>{formatPrice(product.price)}</strong><div className="admin-inventory"><span className={`admin-stock ${product.stock <= 5 ? "is-low" : ""}`}>{product.stock <= 5 ? `재고 ${product.stock}` : `${product.stock}개`}</span><em className={`status-${product.status}`}>{product.status}</em></div><button type="button" onClick={() => setEditingProduct(product)} aria-label={`${product.name} 수정`}><Pencil size={17} /></button></article>)}</div></section></div>}
      {tab === "orders" && <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">ORDER &amp; FULFILLMENT</p><h2>전체 주문</h2></div><span>{orders.length} ORDERS</span></div><OrderTable orders={orders} onChange={changeOrderStatus} onOpen={setSelectedOrder} /></section></div>}
      {tab === "inquiries" && <InquiryManagement inquiries={inquiries} pending={pendingInquiries} openId={openInquiry} inspect={inspectInquiry} saveAnswer={saveAnswer} />}
      {tab === "members" && <MemberManagement members={members} onOpen={setSelectedMember} />}
    </section>
  </div>
  {editingProduct && <Modal title={editingProduct === "new" ? "새 상품 등록" : "상품 콘텐츠 수정"} eyebrow="PRODUCT EDITOR" close={() => setEditingProduct(null)}><ProductEditor product={editingProduct === "new" ? undefined : editingProduct} onSave={saveProduct} /></Modal>}
  {selectedOrder && <Modal title="주문·배송 상세" eyebrow={selectedOrder.id} close={() => setSelectedOrder(null)}><OrderEditor order={selectedOrder} onSave={saveOrder} /></Modal>}
  {selectedMember && <Modal title="회원 상세 관리" eyebrow={selectedMember.id} close={() => setSelectedMember(null)}><MemberEditor member={selectedMember} orders={orders.filter((order) => order.email === selectedMember.email)} onSave={saveMember} /></Modal>}
  </main>;
}

function Dashboard({ revenue, products: catalog, orders, pending, go, changeOrderStatus }: { revenue: number; products: AdminProduct[]; orders: Order[]; pending: number; go: Dispatch<SetStateAction<AdminTab>>; changeOrderStatus: (id: string, status: OrderStatus) => void }) {
  const ready = orders.filter((order) => order.status === "결제완료" || order.status === "출고준비").length;
  return <div className="admin-view"><div className="admin-stats"><article><span>누적 주문 매출</span><strong>{formatPrice(revenue)}</strong><p><TrendingUp /> 정상 결제 기준</p></article><article><span>신규·출고 준비</span><strong>{ready}</strong><p>오늘 처리할 주문</p></article><article><span>판매 상품</span><strong>{catalog.filter((product) => product.status === "판매중").length}</strong><p>재고 임박 {catalog.filter((product) => product.stock <= 5).length}개</p></article><article><span>처리할 문의</span><strong>{pending}</strong><p>등록·처리중 문의</p></article></div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">RECENT ORDERS</p><h2>최근 주문</h2></div><button type="button" onClick={() => go("orders")}>전체 보기 <ChevronRight /></button></div><OrderTable orders={orders.slice(0, 3)} onChange={changeOrderStatus} compact /></section><section className="admin-panel admin-sales-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">SALES OVERVIEW</p><h2>이번 주 매출</h2></div><span>{formatPrice(revenue)}</span></div><div className="admin-chart">{[42, 58, 48, 76, 64, 92, 81].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{["월", "화", "수", "목", "금", "토", "일"][index]}</span></div>)}</div></section></div><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">ACTION REQUIRED</p><h2>처리가 필요한 항목</h2></div></div><div className="admin-actions-list"><button type="button" onClick={() => go("orders")}><PackageOpen /><span><strong>출고 준비 주문 {ready}건</strong><em>상품 검수 후 송장 정보를 등록해 주세요.</em></span><ChevronRight /></button><button type="button" onClick={() => go("inquiries")}><MessageSquare /><span><strong>처리할 문의 {pending}건</strong><em>문의 확인 후 답변을 등록해 주세요.</em></span><ChevronRight /></button><button type="button" onClick={() => go("members")}><Users /><span><strong>전체 회원 관리</strong><em>회원 상태와 구매 이력을 확인하세요.</em></span><ChevronRight /></button></div></section></div>;
}

function OrderTable({ orders, onChange, onOpen, compact = false }: { orders: Order[]; onChange: (id: string, status: OrderStatus) => void; onOpen?: (order: Order) => void; compact?: boolean }) { return <div className={`admin-order-table ${compact ? "is-compact" : ""}`}><div className="admin-table-row admin-table-head"><span>주문번호</span><span>고객</span><span>주문 상품</span><span>결제금액</span><span>주문일</span><span>처리 상태</span><span /></div>{orders.map((order) => <div className="admin-table-row" key={order.id}><strong>{order.id}</strong><span>{order.customer}</span><div className="admin-order-products">{order.items.map((product, index) => <span key={`${product.id}-${index}`} title={`${product.name} / ${product.color} / ${product.size}`}><img src={product.image} alt={product.name} /><em>{product.quantity}</em></span>)}</div><span>{formatPrice(order.amount)}</span><span>{order.date.slice(5)}</span><select value={order.status} onChange={(event) => onChange(order.id, event.target.value as OrderStatus)} aria-label={`${order.id} 주문 상태`}>{["결제완료", "출고준비", "출고완료", "배송중", "배송완료", "취소", "환불완료"].map((status) => <option key={status}>{status}</option>)}</select>{onOpen ? <button className="admin-row-button" type="button" onClick={() => onOpen(order)}>상세 <Eye /></button> : <span />}</div>)}</div>; }

function InquiryManagement({ inquiries, pending, openId, inspect, saveAnswer }: { inquiries: Inquiry[]; pending: number; openId: number | null; inspect: (id: number) => void; saveAnswer: (id: number, answer: string) => void }) { return <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow dark">CUSTOMER Q&amp;A</p><h2>상품 문의</h2></div><span>처리 필요 {pending}건</span></div><div className="admin-inquiry-status-guide"><span><i className="is-new" />등록 <b>{inquiries.filter((item) => item.status === "등록").length}</b></span><ChevronRight /><span><i className="is-progress" />처리중 <b>{inquiries.filter((item) => item.status === "처리중").length}</b></span><ChevronRight /><span><i className="is-done" />처리완료 <b>{inquiries.filter((item) => item.status === "처리완료").length}</b></span></div><div className="admin-inquiry-list admin-inquiry-workflow">{inquiries.map((inquiry) => <article className={openId === inquiry.id ? "is-open" : ""} key={inquiry.id}><button className="admin-inquiry-summary" type="button" onClick={() => inspect(inquiry.id)}><span className={`inquiry-${inquiry.status}`}>{inquiry.status}</span><div><p>{inquiry.product} · {inquiry.category} · {inquiry.date}</p><h3>{inquiry.title}</h3><em>{inquiry.customer}</em></div><ChevronDown /></button>{openId === inquiry.id && <div className="admin-inquiry-detail"><div className="inquiry-question"><strong>CUSTOMER QUESTION</strong><p>{inquiry.body}</p></div>{inquiry.status === "처리완료" ? <div className="inquiry-saved-answer"><strong><Check /> MAISON ÉLAN 답변</strong><p>{inquiry.answer}</p></div> : <form onSubmit={(event) => { event.preventDefault(); const answer = String(new FormData(event.currentTarget).get("answer")); saveAnswer(inquiry.id, answer); }}><label>답변 내용<textarea name="answer" required defaultValue={inquiry.answer} rows={5} placeholder="고객에게 전달할 답변을 입력해 주세요." /></label><div><span><AlertCircle />답변 등록 시 상태가 ‘처리완료’로 변경됩니다.</span><button className="admin-primary-action" type="submit"><Check />답변 등록 및 처리완료</button></div></form>}</div>}</article>)}</div></section></div>; }

function MemberManagement({ members, onOpen }: { members: Member[]; onOpen: (member: Member) => void }) { const [search, setSearch] = useState(""); const filtered = members.filter((member) => `${member.name} ${member.email} ${member.phone}`.toLowerCase().includes(search.toLowerCase())); return <div className="admin-view"><section className="admin-panel"><div className="admin-panel-heading admin-list-heading"><div><p className="eyebrow dark">CUSTOMERS / {members.length}</p><h2>회원 목록</h2></div><label className="admin-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름·이메일·연락처 검색" /></label></div><div className="admin-member-table"><div className="admin-member-row admin-member-head"><span>회원</span><span>연락처</span><span>가입일</span><span>주문</span><span>누적 구매</span><span>상태</span><span /></div>{filtered.map((member) => <div className="admin-member-row" key={member.id}><div><i>{member.name.slice(0, 1)}</i><span><strong>{member.name}</strong><em>{member.email}</em></span></div><span>{member.phone}</span><span>{member.joinedAt}</span><span>{member.orderCount}건</span><strong>{formatPrice(member.totalSpent)}</strong><span className={`member-${member.status}`}>{member.status}</span><button type="button" onClick={() => onOpen(member)}>상세 관리</button></div>)}</div></section></div>; }

function Modal({ title, eyebrow, close, children }: { title: string; eyebrow: string; close: () => void; children: React.ReactNode }) { return <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2></div><button type="button" onClick={close} aria-label="닫기"><X /></button></header><div className="admin-modal-content">{children}</div></section></div>; }

function ProductEditor({ product, onSave }: { product?: AdminProduct; onSave: (product: AdminProduct) => void }) { const colorsText = product?.colors.map((color) => `${color.name}|${color.hex}|${color.image}`).join("\n") ?? "Black|#171514|/products/sculpted-wool-jacket-ink-black.png"; const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name")); const slug = product?.id ?? `${name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "")}-${crypto.getRandomValues(new Uint16Array(1))[0]}`; const parsedColors = String(data.get("colors")).split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [colorName, hex, image] = line.split("|"); return { name: colorName?.trim() || "Color", hex: hex?.trim() || "#222222", image: image?.trim() || String(data.get("image")) }; }); onSave({ id: slug, sku: String(data.get("sku")) || `ME-NEW-${String(crypto.getRandomValues(new Uint16Array(1))[0]).slice(-3)}`, name, category: String(data.get("category")) as Product["category"], price: Number(data.get("price")), originalPrice: Number(data.get("originalPrice")) || undefined, stock: Number(data.get("stock")), status: String(data.get("status")) as ProductStatus, label: String(data.get("label")) || undefined, image: String(data.get("image")), secondaryImage: String(data.get("secondaryImage")) || String(data.get("image")), colors: parsedColors, sizes: String(data.get("sizes")).split(",").map((value) => value.trim()).filter(Boolean), description: String(data.get("description")), material: String(data.get("material")), fit: String(data.get("fit")), rating: product?.rating ?? 0, reviewCount: product?.reviewCount ?? 0, questionCount: product?.questionCount ?? 0, updatedAt: new Date().toLocaleDateString("ko-KR") }); }; return <form className="admin-editor-form" onSubmit={submit}><section><h3>기본 정보</h3><div className="admin-form-grid"><label>상품명<input name="name" required defaultValue={product?.name} /></label><label>SKU<input name="sku" defaultValue={product?.sku} placeholder="비워두면 자동 생성" /></label><label>카테고리<select name="category" defaultValue={product?.category ?? "Outer"}>{["Outer", "Dresses", "Tops", "Knitwear", "Bottoms", "Accessories"].map((value) => <option key={value}>{value}</option>)}</select></label><label>배지<select name="label" defaultValue={product?.label ?? ""}><option value="">없음</option><option>NEW</option><option>BEST</option><option>SALE</option><option>LIMITED</option></select></label><label>판매가<input name="price" required type="number" defaultValue={product?.price} /></label><label>정상가<input name="originalPrice" type="number" defaultValue={product?.originalPrice} /></label><label>재고 수량<input name="stock" required type="number" min="0" defaultValue={product?.stock ?? 0} /></label><label>판매 상태<select name="status" defaultValue={product?.status ?? "판매중"}><option>판매중</option><option>품절</option><option>판매중지</option></select></label></div></section><section><h3>이미지·옵션</h3><div className="admin-form-grid"><label className="full">대표 이미지 경로<input name="image" required defaultValue={product?.image} placeholder="/products/product-name.png" /></label><label className="full">두 번째 이미지 경로<input name="secondaryImage" defaultValue={product?.secondaryImage} /></label><label className="full">사이즈 — 쉼표로 구분<input name="sizes" required defaultValue={product?.sizes.join(", ") ?? "XS, S, M, L"} /></label><label className="full">색상 — 한 줄에 이름 | HEX | 이미지 경로<textarea name="colors" required rows={4} defaultValue={colorsText} /></label></div>{product?.image && <div className="admin-product-preview"><img src={product.image} alt="현재 대표 이미지" /><span>현재 대표 이미지</span></div>}</section><section><h3>상세 콘텐츠</h3><div className="admin-form-grid"><label className="full">상품 설명<textarea name="description" required rows={5} defaultValue={product?.description} /></label><label className="full">소재<input name="material" required defaultValue={product?.material} /></label><label className="full">핏·모델 정보<input name="fit" required defaultValue={product?.fit} /></label></div></section><footer><button className="admin-primary-action" type="submit"><Save />{product ? "수정 내용 저장" : "상품 등록"}</button></footer></form>; }

function OrderEditor({ order, onSave }: { order: Order; onSave: (order: Order) => void }) {
  const [draft, setDraft] = useState({ ...order, items: order.items.map((product) => ({ ...product, status: product.status ?? order.status, courier: product.courier ?? order.courier, trackingNumber: product.trackingNumber ?? order.trackingNumber })) });
  const statuses: OrderStatus[] = ["결제완료", "출고준비", "출고완료", "배송중", "배송완료", "취소", "환불완료"];
  const updateItem = (index: number, data: Partial<OrderItem>) => setDraft((current) => ({ ...current, items: current.items.map((product, itemIndex) => itemIndex === index ? { ...product, ...data } : product) }));
  const applyDefaultToAll = () => setDraft((current) => ({ ...current, items: current.items.map((product) => ({ ...product, status: current.status, courier: current.courier, trackingNumber: current.trackingNumber })) }));

  return <form className="admin-editor-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><section><div className="admin-order-customer"><span><UserRound /></span><div><h3>{draft.customer}</h3><p>{draft.email} · {draft.phone}</p><p>{draft.address}</p></div></div></section><section><h3>주문 상품 {draft.items.length}개</h3><div className="admin-order-item-list">{draft.items.map((product, index) => <article key={`${product.id}-${index}`}><img src={product.image} alt="" /><div><strong>{product.name}</strong><p>{product.color} · {product.size} · 수량 {product.quantity}</p></div><b>{formatPrice(product.price * product.quantity)}</b></article>)}</div><div className="admin-order-total"><span>총 결제 금액</span><strong>{formatPrice(draft.amount)}</strong></div></section><section><div className="admin-section-heading"><div><h3>상품별 출고·배송 처리</h3><p>분리 출고되는 상품은 상태와 송장번호를 각각 입력하세요.</p></div><button type="button" onClick={applyDefaultToAll}>대표 정보 전체 적용</button></div><div className="admin-form-grid admin-order-defaults"><label>주문 대표 상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OrderStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>기본 택배사<input value={draft.courier} onChange={(event) => setDraft({ ...draft, courier: event.target.value })} placeholder="예: CJ대한통운" /></label><label className="full">대표 송장번호<input value={draft.trackingNumber} onChange={(event) => setDraft({ ...draft, trackingNumber: event.target.value })} placeholder="상품별 송장이 같을 때 입력" /></label></div><div className="admin-item-fulfillment-list">{draft.items.map((product, index) => <article key={`${product.id}-delivery-${index}`}><header><img src={product.image} alt="" /><div><span>배송 {index + 1}</span><strong>{product.name}</strong><p>{product.color} · {product.size} · 수량 {product.quantity}</p></div></header><div className="admin-form-grid"><label>배송 상태<select value={product.status} onChange={(event) => updateItem(index, { status: event.target.value as OrderStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>택배사<input value={product.courier ?? ""} onChange={(event) => updateItem(index, { courier: event.target.value })} placeholder="택배사" /></label><label>송장번호<input value={product.trackingNumber ?? ""} onChange={(event) => updateItem(index, { trackingNumber: event.target.value })} placeholder="출고 후 입력" /></label><label>도착 예정일<input type="date" value={product.estimatedDelivery ?? ""} onChange={(event) => updateItem(index, { estimatedDelivery: event.target.value })} /></label></div></article>)}</div><label className="admin-delivery-memo">배송 메모<textarea rows={3} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} /></label></section><footer><button className="admin-primary-action" type="submit"><Truck />상품별 배송 정보 저장</button></footer></form>;
}

function MemberEditor({ member, orders, onSave }: { member: Member; orders: Order[]; onSave: (member: Member) => void }) { const [draft, setDraft] = useState(member); return <form className="admin-editor-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><section><div className="admin-member-profile"><i>{draft.name.slice(0, 1)}</i><div><h3>{draft.name}</h3><p>{draft.email}</p><span>가입 {draft.joinedAt} · 최근 로그인 {draft.lastLogin}</span></div></div><div className="admin-member-summary"><div><span>누적 주문</span><strong>{draft.orderCount}건</strong></div><div><span>누적 구매</span><strong>{formatPrice(draft.totalSpent)}</strong></div></div></section><section><h3>회원 정보 및 상태</h3><div className="admin-form-grid"><label>연락처<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label>회원 상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Member["status"] })}><option>정상</option><option>휴면</option><option>차단</option></select></label><label className="full">기본 배송지<input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label><label className="full">관리자 메모<textarea rows={4} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} placeholder="고객에게 노출되지 않는 메모" /></label></div></section><section><h3>최근 구매 상품</h3>{orders.length ? <div className="admin-member-orders">{orders.flatMap((order) => order.items).map((product, index) => <img key={`${product.id}-${index}`} src={product.image} alt={product.name} title={product.name} />)}</div> : <p className="admin-no-data">연결된 주문 내역이 없습니다.</p>}</section><footer><button className="admin-primary-action" type="submit"><Save />회원 정보 저장</button></footer></form>; }
