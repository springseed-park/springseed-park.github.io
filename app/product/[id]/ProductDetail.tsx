"use client";

import Link from "../../components/StaticLink";
import { ChevronLeft, ChevronRight, CreditCard, Heart, ImagePlus, RotateCcw, ShoppingBag, Truck, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ProductCard } from "../../components/ProductCard";
import { useStore } from "../../components/StoreProvider";
import { formatPrice, Product, products } from "../../lib/products";

const sizeRows = [
  { size: "XS", kr: "44", bust: "80–83", waist: "62–65", hip: "87–90" },
  { size: "S", kr: "55", bust: "84–87", waist: "66–69", hip: "91–94" },
  { size: "M", kr: "66", bust: "88–92", waist: "70–74", hip: "95–99" },
  { size: "L", kr: "77", bust: "93–97", waist: "75–79", hip: "100–104" },
];

type ReviewItem = { id: string; rating: number; title: string; body: string; author: string; date: string; option: string; images?: string[] };
type ReviewPhoto = { name: string; url: string };
type QuestionItem = { id: string; status: "답변완료" | "답변대기"; category: string; title: string; body: string; author: string; date: string; createdAt: number; answer?: string; private?: boolean };

const sampleReviews: ReviewItem[] = [
  { id: "review-01", rating: 5, title: "어깨선이 정말 아름다워요", body: "과하게 각지지 않으면서도 자세가 자연스럽게 정돈됩니다. 얇은 니트 위에 입었을 때 가장 예뻤어요.", author: "김**", date: "2026.08.09", option: "Ink Black / S" },
  { id: "review-02", rating: 5, title: "원단과 마감이 기대 이상입니다", body: "울 표면이 부드럽고 라펠과 소매 버튼 마감이 섬세합니다. 오래 입을 수 있는 재킷을 찾고 있었는데 만족합니다.", author: "박**", date: "2026.08.04", option: "Warm Sand / M" },
  { id: "review-03", rating: 4, title: "정사이즈로 추천해요", body: "평소 55 사이즈를 입고 S가 편안하게 맞았습니다. 허리선은 잡아주고 팔 움직임은 여유로워요.", author: "이**", date: "2026.07.29", option: "Ink Black / S" },
];

const sampleQuestions: QuestionItem[] = [
  { id: "question-01", status: "답변완료", category: "사이즈", title: "니트 위에 착용하려면 사이즈 업이 필요할까요?", body: "평소 55 사이즈이며 도톰한 니트와 함께 입고 싶습니다.", author: "정**", date: "2026.08.08", createdAt: new Date("2026-08-08").getTime(), answer: "도톰한 니트와 여유 있게 착용하실 경우 M 사이즈를 권장합니다. 얇은 이너에는 S가 적합합니다." },
  { id: "question-02", status: "답변완료", category: "상품", title: "Warm Sand 색상은 노란기가 강한가요?", body: "실내 조명에서 보이는 실제 색감이 궁금합니다.", author: "최**", date: "2026.08.02", createdAt: new Date("2026-08-02").getTime(), answer: "밝은 베이지에 은은한 골드 톤이 더해진 색상으로, 강한 노란색보다는 차분한 웜 샌드에 가깝습니다." },
  { id: "question-03", status: "답변대기", category: "배송", title: "주문하면 언제 출고되나요?", body: "이번 주 금요일 전에 받아볼 수 있을까요?", author: "윤**", date: "2026.08.10", createdAt: new Date("2026-08-10").getTime(), private: true },
];

type MeasurementPreset = { columns: string[]; base: number[]; step: number[] };

const measurementPresets: Record<string, MeasurementPreset> = {
  "sculpted-wool-jacket": { columns: ["총장", "어깨", "가슴", "허리", "소매"], base: [64.5, 40, 47, 41, 59.5], step: [1, 1, 2.5, 2.5, .7] },
  "soft-draped-dress": { columns: ["총장", "어깨", "가슴", "허리", "힙"], base: [122, 35, 41.5, 34, 45], step: [1.5, 1, 2.5, 2.5, 2.5] },
  "sheer-silk-blouse": { columns: ["총장", "어깨", "가슴", "밑단", "소매"], base: [65, 40, 51, 53, 59], step: [1, 1, 2.5, 2.5, .7] },
  "essential-column-skirt": { columns: ["총장", "허리", "힙", "밑단", "슬릿"], base: [82, 32, 44, 43, 29], step: [1, 2.5, 2.5, 2, 0] },
  "cashmere-wrap-knit": { columns: ["총장", "어깨", "가슴", "밑단", "소매"], base: [57, 38, 46, 43, 59], step: [1, 1, 2.5, 2.5, 1] },
  "tailored-wide-trousers": { columns: ["총장", "허리", "힙", "밑위", "밑단"], base: [105, 32, 47, 31, 30], step: [1, 2.5, 2.5, .7, .7] },
  "asymmetric-satin-top": { columns: ["총장", "가슴", "허리", "밑단", "끈 길이"], base: [50, 40, 35, 40, 31], step: [1, 2.5, 2.5, 2.5, .5] },
  "double-faced-coat": { columns: ["총장", "어깨", "가슴", "밑단", "소매"], base: [114, 49, 57, 63, 56], step: [1.5, 1, 2.5, 2.5, 1] },
};

const categoryMeasurementFallback: Record<Product["category"], MeasurementPreset> = {
  Outer: { columns: ["총장", "어깨", "가슴", "밑단", "소매"], base: [66, 41, 49, 51, 60], step: [1, 1, 2.5, 2.5, 1] },
  Dresses: { columns: ["총장", "어깨", "가슴", "허리", "힙"], base: [121, 36, 42, 35, 46], step: [1, 1, 2.5, 2.5, 2.5] },
  Tops: { columns: ["총장", "어깨", "가슴", "밑단", "소매"], base: [61, 39, 48, 50, 58], step: [1, 1, 2.5, 2.5, 1] },
  Knitwear: { columns: ["총장", "어깨", "가슴", "밑단", "소매"], base: [58, 39, 47, 45, 59], step: [1, 1, 2.5, 2.5, 1] },
  Bottoms: { columns: ["총장", "허리", "힙", "밑위", "밑단"], base: [84, 32, 45, 30, 28], step: [1, 2.5, 2.5, .7, .7] },
};

const productHighlights: Record<Product["category"], Array<{ number: string; title: string; body: string }>> = {
  Outer: [
    { number: "01", title: "Sculpted Line", body: "가볍게 설계한 숄더와 절개선이 상체의 균형을 정돈하고, 움직일 때도 선명한 실루엣을 유지합니다." },
    { number: "02", title: "Soft Structure", body: "부분 심지와 얇은 패드를 사용해 단단함보다 유연한 구조감을 살렸습니다. 니트 위에도 편안하게 레이어링됩니다." },
    { number: "03", title: "Tailored Finish", body: "라펠 끝과 포켓, 소매의 간격을 섬세하게 조정하고 안쪽 시접까지 정갈하게 마감했습니다." },
  ],
  Dresses: [
    { number: "01", title: "Fluid Drape", body: "바이어스 방향으로 재단해 걸을 때마다 자연스럽게 흐르는 입체적인 드레이프를 완성했습니다." },
    { number: "02", title: "Balanced Neckline", body: "쇄골선을 정돈해 보이는 네크라인과 안정적인 암홀 설계로 단독 착용에도 부담이 없습니다." },
    { number: "03", title: "Clean Interior", body: "겉으로 봉제선이 드러나지 않도록 안쪽 마감과 지퍼 주변을 부드럽게 정리했습니다." },
  ],
  Tops: [
    { number: "01", title: "Refined Neckline", body: "얼굴선을 정돈해 보이도록 네크라인의 높이와 곡선을 세밀하게 조정했습니다." },
    { number: "02", title: "Natural Volume", body: "몸을 조이지 않으면서 재킷 안에서도 부피감 없이 떨어지는 여유로운 실루엣입니다." },
    { number: "03", title: "Delicate Finish", body: "얇은 소재에 맞춘 프렌치 심과 좁은 봉제선으로 피부에 닿는 부분까지 매끄럽게 마감했습니다." },
  ],
  Knitwear: [
    { number: "01", title: "Soft Touch", body: "피부에 직접 닿아도 편안하도록 가는 원사를 사용하고 표면의 잔털을 정돈했습니다." },
    { number: "02", title: "Flexible Shape", body: "랩 구조와 끈 위치를 조절해 슬림하거나 여유로운 실루엣으로 다양하게 연출할 수 있습니다." },
    { number: "03", title: "Stable Rib", body: "넥과 소매 끝의 립 조직을 탄탄하게 편직해 반복 착용 후에도 형태를 안정적으로 유지합니다." },
  ],
  Bottoms: [
    { number: "01", title: "Clean Waist", body: "허리 안쪽을 얇고 단단하게 정리해 상의를 넣어 입어도 군더더기 없는 선을 만듭니다." },
    { number: "02", title: "Long Silhouette", body: "세로 절개와 중심선을 활용해 다리가 길어 보이면서도 움직임은 편안하도록 설계했습니다." },
    { number: "03", title: "Functional Finish", body: "포켓과 지퍼, 트임 위치를 실제 착용 동선에 맞춰 배치하고 힘이 받는 부분을 보강했습니다." },
  ],
};

function ProductInformation({ product }: { product: Product }) {
  const preset = measurementPresets[product.id] ?? categoryMeasurementFallback[product.category];
  const measurements = product.sizes.map((item, sizeIndex) => ({ size: item, values: preset.base.map((value, valueIndex) => value + preset.step[valueIndex] * sizeIndex) }));
  const productCode = `ME-${product.category.slice(0, 2).toUpperCase()}-${product.id.split("-").map((word) => word[0]).join("").toUpperCase()}`;
  const isOuter = product.category === "Outer";

  return <div className="product-information" id="product-information" role="tabpanel">
    <section className="product-information-intro"><div><p className="eyebrow dark">THE PIECE</p><h3>{product.name}</h3><p>{product.description} 몸의 움직임을 고려한 패턴과 절제된 디테일로, 한 시즌을 넘어 오래 입을 수 있도록 완성했습니다.</p></div><dl><div><dt>COLOR</dt><dd>{product.colors.map((item) => item.name).join(" · ")}</dd></div><div><dt>COMPOSITION</dt><dd>{product.material}</dd></div><div><dt>FIT</dt><dd>{product.fit}</dd></div><div><dt>STYLE NO.</dt><dd>{productCode}</dd></div></dl></section>
    <section className="product-highlight-section"><p className="eyebrow dark">DESIGN DETAILS</p><div>{productHighlights[product.category].map((item) => <article key={item.number}><span>{item.number}</span><h4>{item.title}</h4><p>{item.body}</p></article>)}</div></section>
    <section className="product-detail-story"><header><p className="eyebrow dark">ALL COLORS</p><h3>모든 컬러와<br />디테일을 한눈에.</h3></header><div className="product-color-collection">{product.colors.map((colorItem, colorIndex) => { const images = [colorItem.image, ...(colorItem.details ?? [])].slice(0, 3); return <section className={`product-color-story ${images.length === 1 ? "is-single" : ""}`} key={colorItem.name}><div className="product-color-title"><span style={{ background: colorItem.hex }} /><div><em>COLOR {String(colorIndex + 1).padStart(2, "0")}</em><h4>{colorItem.name}</h4></div></div><div className="product-color-images">{images.map((image, index) => <figure key={`${colorItem.name}-${image}-${index}`}><img src={image} alt={`${product.name} ${colorItem.name} ${index === 0 ? "전체 착용" : `상세 ${index}`} 이미지`} /><figcaption>{index === 0 ? "FULL SILHOUETTE" : index === 1 ? "CONSTRUCTION DETAIL" : "FABRIC & FINISH"}<span>0{index + 1}</span></figcaption></figure>)}</div></section>; })}</div></section>
    <section className="product-specification"><div className="product-size-heading"><div><p className="eyebrow dark">GARMENT MEASUREMENTS</p><h3>상품 실측 치수</h3></div><p>단위는 cm이며 상품을 바닥에 평평하게 놓고 측정했습니다.<br />측정 위치와 소재 특성에 따라 1–2cm의 오차가 있을 수 있습니다.</p></div><div className="product-measure-table"><table><thead><tr><th>SIZE</th>{preset.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{measurements.map((row) => <tr key={row.size}><th>{row.size}</th>{row.values.map((value, index) => <td key={`${row.size}-${preset.columns[index]}`}>{Number.isInteger(value) ? value : value.toFixed(1)}</td>)}</tr>)}</tbody></table></div><div className="measurement-notes"><p><span>01</span><strong>총장</strong>옆 목점 또는 허리선부터 밑단까지 수직으로 측정합니다.</p><p><span>02</span><strong>{product.category === "Bottoms" ? "허리" : "가슴"}</strong>{product.category === "Bottoms" ? "허리단을 자연스럽게 편 상태의 단면을 측정합니다." : "양쪽 겨드랑이 아래를 수평으로 측정한 단면 기준입니다."}</p><p><span>03</span><strong>핏 참고</strong>신체 치수가 아닌 완성된 상품의 단면 실측으로, 여유분을 고려해 선택해 주세요.</p></div></section>
    <section className="product-care-grid"><article><p className="eyebrow dark">MATERIAL</p><h4>소재와 촉감</h4><p>{product.material}. 밀도와 복원력을 균형 있게 조정해 형태가 흐트러지지 않으면서도 피부에 닿는 감촉은 부드럽습니다.</p></article><article><p className="eyebrow dark">CARE</p><h4>관리 방법</h4><p>{isOuter ? "형태 보존을 위해 전문 드라이클리닝을 권장합니다. 착용 후 두꺼운 옷걸이에 걸어 통풍해 주세요." : "전문 드라이클리닝을 권장하며, 마찰과 수분에 장시간 노출되지 않도록 주의해 주세요."}</p></article><article><p className="eyebrow dark">PRODUCT INFO</p><h4>제품 정보</h4><dl><div><dt>안감</dt><dd>{isOuter ? "있음" : "상품별 부분 안감"}</dd></div><div><dt>비침</dt><dd>없음</dd></div><div><dt>신축성</dt><dd>{product.category === "Knitwear" ? "좋음" : "약간"}</dd></div><div><dt>두께</dt><dd>{isOuter ? "도톰함" : "보통"}</dd></div><div><dt>제조국</dt><dd>대한민국</dd></div></dl></article></section>
  </div>;
}

export function ProductDetail({ product }: { product: Product }) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState(product.colors[0].name);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState<"details" | "reviews" | "questions">("details");
  const [writeMode, setWriteMode] = useState<"review" | "question" | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<ReviewItem[]>([]);
  const [submittedQuestions, setSubmittedQuestions] = useState<QuestionItem[]>([]);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [reviewPhotos, setReviewPhotos] = useState<ReviewPhoto[]>([]);
  const [reviewImageModal, setReviewImageModal] = useState<{ images: string[]; index: number; title: string } | null>(null);
  const { addToCart, toggleWishlist, wishlist, showToast } = useStore();
  const selected = wishlist.includes(product.id);
  const selectedColor = product.colors.find((item) => item.name === color) ?? product.colors[0];
  const galleryImages = [selectedColor.image, ...(selectedColor.details ?? [])];
  const reviewTotal = product.reviewCount + submittedReviews.length;
  const questionTotal = product.questionCount + submittedQuestions.length;
  const displayedReviews = [...submittedReviews, ...sampleReviews.map((review, index) => index === 0 ? { ...review, images: selectedColor.details?.slice(0, 2) ?? [selectedColor.image] } : review)];
  const activeReviewImage = reviewImageModal?.images[reviewImageModal.index];

  const moveReviewImage = (direction: -1 | 1) => {
    setReviewImageModal((current) => current ? { ...current, index: (current.index + direction + current.images.length) % current.images.length } : current);
  };

  useEffect(() => {
    if (!sizeGuideOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSizeGuideOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [sizeGuideOpen]);

  useEffect(() => {
    if (!reviewImageModal) return;
    const previousOverflow = document.body.style.overflow;
    const handleModalKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReviewImageModal(null);
      if (event.key === "ArrowLeft") moveReviewImage(-1);
      if (event.key === "ArrowRight") moveReviewImage(1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleModalKeys);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleModalKeys); };
  }, [reviewImageModal]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(`maison-product-questions-${product.id}`);
        if (saved) setSubmittedQuestions(JSON.parse(saved));
      } catch { /* show in-session questions */ }
      setQuestionsReady(true);
    });
    return () => { active = false; };
  }, [product.id]);
  useEffect(() => { if (questionsReady) localStorage.setItem(`maison-product-questions-${product.id}`, JSON.stringify(submittedQuestions)); }, [product.id, questionsReady, submittedQuestions]);

  const add = () => {
    if (!size) { showToast("사이즈를 먼저 선택해 주세요."); return; }
    addToCart(product.id, size, color);
  };

  const buyNow = () => {
    if (!size) { showToast("사이즈를 먼저 선택해 주세요."); return; }
    localStorage.setItem("elan-buy-now", JSON.stringify({ id: product.id, size, color, quantity: 1 }));
    window.location.assign("/checkout?mode=buy-now");
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmittedReviews((current) => [{ id: `review-${Date.now()}`, rating: Number(data.get("rating")), title: String(data.get("title")), body: String(data.get("body")), author: "나의 리뷰", date: new Date().toLocaleDateString("ko-KR"), option: `${data.get("color")} / ${data.get("size")}`, images: reviewPhotos.map((photo) => photo.url) }, ...current]);
    event.currentTarget.reset();
    setReviewPhotos([]);
    setWriteMode(null);
    showToast("리뷰가 등록되었습니다.");
  };

  const addReviewPhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - reviewPhotos.length;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, remaining).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setReviewPhotos((current) => [...current, ...images]);
    if (files.length > remaining) showToast("리뷰 사진은 최대 4장까지 등록할 수 있습니다.");
  };

  const removeReviewPhoto = (url: string) => {
    URL.revokeObjectURL(url);
    setReviewPhotos((current) => current.filter((photo) => photo.url !== url));
  };

  const closeReviewForm = () => {
    reviewPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setReviewPhotos([]);
    setWriteMode(null);
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const createdAt = Date.now();
    const question = { id: `question-${createdAt}`, status: "답변대기" as const, category: String(data.get("category")), title: String(data.get("title")), body: String(data.get("body")), author: "나의 문의", date: new Date().toLocaleDateString("ko-KR"), createdAt, private: data.get("private") === "on" };
    setSubmittedQuestions((current) => [question, ...current]);
    try {
      const adminInquiries = JSON.parse(localStorage.getItem("maison-admin-inquiries") || "[]");
      adminInquiries.unshift({ id: createdAt, product: product.name, category: question.category, title: question.title, body: question.body, customer: question.author, date: question.date, status: "등록", answer: "", sourceKey: `maison-product-questions-${product.id}`, sourceQuestionId: question.id });
      localStorage.setItem("maison-admin-inquiries", JSON.stringify(adminInquiries));
    } catch { /* customer inquiry remains visible on this product */ }
    event.currentTarget.reset();
    setWriteMode(null);
    showToast("상품 문의가 등록되었습니다.");
  };

  return (
    <main id="content" className="inner-page product-page">
      <div className="breadcrumb"><Link href="/shop">SHOP</Link><span>/</span><Link href="/shop">{product.category.toUpperCase()}</Link><span>/</span><strong>{product.name.toUpperCase()}</strong></div>
      <section className="product-detail">
        <div className={`detail-gallery ${galleryImages.length === 1 ? "is-single" : ""}`}>
          {galleryImages.map((image, index) => <div className={`detail-image ${index > 0 ? "is-detail-shot" : ""}`} key={`${color}-${image}`}>
            <img src={image} alt={index === 0 ? `${product.name} ${color} 색상 모델 착용 이미지` : `${product.name} ${color} 색상 디테일 ${index}`} />
            {index === 0 && product.label && <span className={`detail-product-label ${product.label === "SALE" ? "is-sale" : ""}`}>{product.label}</span>}
            <span className="detail-shot-label">{index === 0 ? "MODEL VIEW" : `DETAIL 0${index}`}</span>
          </div>)}
        </div>
        <aside className="detail-panel">
          <h1>{product.name}</h1><div className={`detail-price ${product.originalPrice ? "is-sale" : ""}`}>{product.originalPrice && <del>{formatPrice(product.originalPrice)}</del>}<strong>{formatPrice(product.price)}</strong></div>
          <div className="detail-divider" />
          <div className="option-heading"><span>COLOR</span><strong>{color}</strong></div>
          <div className="large-swatches">{product.colors.map((item) => <button key={item.name} className={color === item.name ? "active" : ""} type="button" aria-label={`${item.name} 색상 이미지 보기`} aria-pressed={color === item.name} title={item.name} style={{ background: item.hex }} onClick={() => setColor(item.name)} />)}</div>
          <div className="option-heading"><span>SIZE</span><button type="button" onClick={() => setSizeGuideOpen(true)}>사이즈 가이드</button></div>
          <div className="size-options">{product.sizes.map((item) => <button key={item} className={size === item ? "active" : ""} type="button" onClick={() => setSize(item)}>{item}</button>)}</div>
          <div className="detail-actions"><button className="secondary-button detail-cart-button" type="button" onClick={add}><ShoppingBag size={18} strokeWidth={1.4} />쇼핑백에 담기</button><button className="primary-button detail-buy-button" type="button" onClick={buyNow}><CreditCard size={18} strokeWidth={1.4} />바로 구매하기</button><button className={`icon-button ${selected ? "active" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-label={selected ? "즐겨찾기에서 삭제" : "즐겨찾기 추가"} aria-pressed={selected} title={selected ? "즐겨찾기에서 삭제" : "즐겨찾기 추가"}><Heart size={20} strokeWidth={1.4} fill={selected ? "currentColor" : "none"} /></button></div>
          <div className="delivery-notes"><p><Truck size={17} strokeWidth={1.35} />무료 배송 · 오후 2시 이전 주문 시 당일 출고</p><p><RotateCcw size={17} strokeWidth={1.35} />수령 후 7일 이내 무료 반품</p></div>
        </aside>
      </section>
      <section className="product-feedback" aria-label="상품 상세 정보와 고객 의견">
        <div className="feedback-tabs" role="tablist" aria-label="상품 설명, 리뷰 및 상품 문의">
          <button type="button" role="tab" aria-selected={feedbackTab === "details"} className={feedbackTab === "details" ? "active" : ""} onClick={() => { setFeedbackTab("details"); closeReviewForm(); }}>상품설명</button>
          <button type="button" role="tab" aria-selected={feedbackTab === "reviews"} className={feedbackTab === "reviews" ? "active" : ""} onClick={() => { setFeedbackTab("reviews"); closeReviewForm(); }}>REVIEW <span>{reviewTotal}</span></button>
          <button type="button" role="tab" aria-selected={feedbackTab === "questions"} className={feedbackTab === "questions" ? "active" : ""} onClick={() => { setFeedbackTab("questions"); closeReviewForm(); }}>Q&amp;A <span>{questionTotal}</span></button>
          {feedbackTab !== "details" && <button className="feedback-write-button" type="button" onClick={() => setWriteMode(feedbackTab === "reviews" ? "review" : "question")}>{feedbackTab === "reviews" ? "리뷰 작성" : "상품 문의"}</button>}
        </div>

        {feedbackTab === "details" ? <ProductInformation product={product} /> : feedbackTab === "reviews" ? <div className="review-panel" role="tabpanel">
          <div className="review-summary"><div><strong>{product.rating.toFixed(1)}</strong><span aria-label={`평점 ${product.rating.toFixed(1)}점`}>★★★★★</span><p>{reviewTotal}개의 구매 후기</p></div><div><p><span>FIT</span><strong>정사이즈예요</strong><em>82%</em></p><p><span>QUALITY</span><strong>매우 만족해요</strong><em>91%</em></p><p><span>COLOR</span><strong>화면과 같아요</strong><em>88%</em></p></div></div>
          {writeMode === "review" && <form className="feedback-form" onSubmit={submitReview}><div className="feedback-form-heading"><h3>리뷰 작성</h3><button type="button" onClick={closeReviewForm} aria-label="작성 취소"><X size={20} /></button></div><div className="feedback-form-grid"><label>평점<select name="rating" defaultValue="5"><option value="5">★★★★★ 5점</option><option value="4">★★★★☆ 4점</option><option value="3">★★★☆☆ 3점</option><option value="2">★★☆☆☆ 2점</option><option value="1">★☆☆☆☆ 1점</option></select></label><label>사이즈<select name="size" defaultValue={size || product.sizes[0]}>{product.sizes.map((item) => <option key={item}>{item}</option>)}</select></label><label>컬러<select name="color" defaultValue={color}>{product.colors.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="full">제목<input name="title" required placeholder="리뷰 제목을 입력해 주세요" /></label><label className="full">내용<textarea name="body" required rows={5} placeholder="상품의 핏, 소재와 착용 경험을 알려주세요." /></label><div className="review-photo-field full"><div><span>사진 첨부</span><em>JPG, PNG · 최대 4장</em></div><div className="review-photo-previews">{reviewPhotos.map((photo) => <div key={photo.url}><img src={photo.url} alt={photo.name} /><button type="button" onClick={() => removeReviewPhoto(photo.url)} aria-label={`${photo.name} 삭제`}><X size={15} /></button></div>)}{reviewPhotos.length < 4 && <label className="review-photo-upload"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addReviewPhotos(event.target.files); event.target.value = ""; }} /><ImagePlus size={24} strokeWidth={1.25} /><span>사진 추가</span></label>}</div></div></div><button className="primary-button" type="submit">리뷰 등록</button></form>}
          <div className="review-list">{displayedReviews.map((review) => <article key={review.id}><div className="review-score" aria-label={`${review.rating}점`}>{"★★★★★".slice(0, review.rating)}<span>{"★★★★★".slice(review.rating)}</span></div><div className="review-copy"><h3>{review.title}</h3><p>{review.body}</p>{review.images && review.images.length > 0 && <div className="review-photo-grid">{review.images.map((image, index) => { const alt = `${review.title} 리뷰 사진 ${index + 1}`; return <button type="button" onClick={() => setReviewImageModal({ images: review.images ?? [], index, title: review.title })} key={`${review.id}-${image}`} aria-label={`${review.title} 사진 ${index + 1} 크게 보기`}><img src={image} alt={alt} /></button>; })}</div>}<span>{review.option}</span></div><div className="review-author"><strong>{review.author}</strong><span>{review.date}</span></div></article>)}</div>
        </div> : <div className="question-panel" role="tabpanel">
          {writeMode === "question" && <form className="feedback-form" onSubmit={submitQuestion}><div className="feedback-form-heading"><h3>상품 문의</h3><button type="button" onClick={() => setWriteMode(null)} aria-label="작성 취소"><X size={20} /></button></div><div className="feedback-form-grid"><label>문의 유형<select name="category" defaultValue="상품"><option>상품</option><option>사이즈</option><option>배송</option><option>교환·반품</option></select></label><label className="full">제목<input name="title" required placeholder="문의 제목을 입력해 주세요" /></label><label className="full">내용<textarea name="body" required rows={5} placeholder="궁금한 내용을 자세히 입력해 주세요." /></label><label className="question-private"><input type="checkbox" name="private" /><span>비밀글로 문의하기</span></label></div><button className="primary-button" type="submit">문의 등록</button></form>}
          <div className="question-list">{[...submittedQuestions, ...sampleQuestions].sort((a, b) => b.createdAt - a.createdAt).map((question) => <article key={question.id}><div className={`question-status ${question.status === "답변완료" ? "is-complete" : ""}`}>{question.status}</div><div className="question-copy"><p>{question.category}{question.private && <span>비밀글</span>}</p><h3>{question.title}</h3><p>{question.body}</p>{question.answer && <div className="question-answer"><strong>MAISON ÉLAN</strong><p>{question.answer}</p></div>}</div><div className="question-author"><strong>{question.author}</strong><span>{question.date}</span></div></article>)}</div>
        </div>}
      </section>
      <section className="recommend-section"><div className="subpage-heading"><p className="eyebrow dark">COMPLETE THE LOOK</p><h2>Style with</h2></div><div className="product-grid">{products.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}</div></section>

      {reviewImageModal && activeReviewImage && <div className="review-image-layer">
        <button className="review-image-scrim" type="button" aria-label="리뷰 사진 닫기" onClick={() => setReviewImageModal(null)} />
        <figure className="review-image-modal" role="dialog" aria-modal="true" aria-label="리뷰 사진 크게 보기">
          <button className="review-image-close" type="button" onClick={() => setReviewImageModal(null)} aria-label="리뷰 사진 닫기"><X size={23} strokeWidth={1.25} /></button>
          <div className="review-image-stage">
            <img key={activeReviewImage} src={activeReviewImage} alt={`${reviewImageModal.title} 리뷰 사진 ${reviewImageModal.index + 1}`} />
            {reviewImageModal.images.length > 1 && <><button className="review-image-nav is-prev" type="button" onClick={() => moveReviewImage(-1)} aria-label="이전 리뷰 사진"><ChevronLeft /></button><button className="review-image-nav is-next" type="button" onClick={() => moveReviewImage(1)} aria-label="다음 리뷰 사진"><ChevronRight /></button></>}
          </div>
          <figcaption><span>VERIFIED REVIEW</span><strong>{reviewImageModal.title}</strong><b aria-live="polite">{String(reviewImageModal.index + 1).padStart(2, "0")} / {String(reviewImageModal.images.length).padStart(2, "0")}</b><em>좌우 버튼이나 방향키로 사진을 넘길 수 있습니다.</em></figcaption>
        </figure>
      </div>}

      {sizeGuideOpen && <div className="size-guide-layer">
        <button className="size-guide-scrim" type="button" aria-label="사이즈 가이드 닫기" onClick={() => setSizeGuideOpen(false)} />
        <section className="size-guide-modal" role="dialog" aria-modal="true" aria-labelledby="size-guide-title">
          <button className="size-guide-close" type="button" onClick={() => setSizeGuideOpen(false)} aria-label="닫기"><X size={24} strokeWidth={1.25} /></button>
          <p className="eyebrow dark">MAISON ÉLAN / FIT GUIDE</p><h2 id="size-guide-title">Size Guide</h2>
          <p className="size-guide-intro">아래 치수는 신체 기준이며 단위는 cm입니다. 두 사이즈 사이에 해당한다면 여유로운 핏은 큰 사이즈, 슬림한 핏은 작은 사이즈를 권장합니다.</p>
          <div className="size-table-wrap"><table><thead><tr><th>SIZE</th><th>KR</th><th>가슴</th><th>허리</th><th>힙</th></tr></thead><tbody>{sizeRows.map((row) => <tr key={row.size} className={size === row.size ? "is-selected" : ""}><th>{row.size}</th><td>{row.kr}</td><td>{row.bust}</td><td>{row.waist}</td><td>{row.hip}</td></tr>)}</tbody></table></div>
          <div className="measure-guide"><div><span>01</span><p><strong>가슴</strong>가슴의 가장 넓은 부분을 수평으로 측정합니다.</p></div><div><span>02</span><p><strong>허리</strong>허리의 가장 잘록한 부분을 편안하게 측정합니다.</p></div><div><span>03</span><p><strong>힙</strong>양발을 모으고 힙의 가장 넓은 부분을 측정합니다.</p></div></div>
          <p className="size-guide-note">모델은 176cm이며 S 사이즈를 착용했습니다. 상품별 실측은 소재 및 핏 항목을 확인해 주세요.</p>
        </section>
      </div>}
    </main>
  );
}
