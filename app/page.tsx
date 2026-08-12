"use client";

import Link from "./components/StaticLink";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { HeroScene } from "./components/HeroScene";
import { ProductCard } from "./components/ProductCard";
import { ScrollParallaxImage } from "./components/ScrollParallaxImage";
import { useRuntimeCatalog } from "./components/useRuntimeCatalog";

const categories = ["ALL", "OUTER", "DRESSES", "TOPS", "KNITWEAR", "BOTTOMS", "ACCESSORIES"];

const heroSlides = [
  {
    eyebrow: "MAISON ÉLAN / AW 2026",
    title: "The New",
    accent: "Poise",
    description: "도시의 리듬을 위한 선명하고 우아한 실루엣.",
    image: "/hero-01.png",
    imageClass: "hero-image-group",
    primary: "컬렉션 보기",
    secondary: "시즌 스토리",
    href: "/shop",
  },
  {
    eyebrow: "BEST SELLERS / LOOK 01",
    title: "Quiet",
    accent: "Confidence",
    description: "절제된 테일러링으로 완성하는 새로운 태도.",
    image: "/hero-02.png",
    imageClass: "hero-image-tailoring",
    primary: "베스트 상품 보기",
    secondary: "재킷 컬렉션",
    href: "/product/sculpted-wool-jacket",
  },
  {
    eyebrow: "MAISON ÉLAN / SIGNATURE",
    title: "Softly",
    accent: "Structured",
    description: "실크의 빛과 움직임을 담은 익스클루시브 에디트.",
    image: "/hero-03.png",
    imageClass: "hero-image-silk",
    primary: "에디트 보기",
    secondary: "브랜드 스토리",
    href: "/product/sheer-silk-blouse",
  },
];

export default function Home() {
  const products = useRuntimeCatalog();
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeHero, setActiveHero] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroFocusPaused, setHeroFocusPaused] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<number | null>(null);

  useEffect(() => {
    if (heroPaused || heroFocusPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveHero((current) => (current + 1) % heroSlides.length), 5600);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroFocusPaused, activeHero]);

  const moveHero = (direction: number) => {
    setActiveHero((current) => (current + direction + heroSlides.length) % heroSlides.length);
  };

  const moveHeroTo = (index: number) => setActiveHero(index);

  const moveHeroPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const hero = heroRef.current;
    if (!hero) return;
    const bounds = hero.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    hero.style.setProperty("--hero-pointer-x", `${x * 100}%`);
    hero.style.setProperty("--hero-pointer-y", `${y * 100}%`);
    hero.style.setProperty("--hero-shift-x", `${(x - .5) * -18}px`);
    hero.style.setProperty("--hero-shift-y", `${(y - .5) * -12}px`);
    hero.style.setProperty("--hero-copy-x", `${(x - .5) * 9}px`);
    hero.style.setProperty("--hero-copy-y", `${(y - .5) * 6}px`);
  };

  const resetHeroPointer = () => {
    const hero = heroRef.current;
    if (!hero) return;
    hero.style.setProperty("--hero-pointer-x", "62%");
    hero.style.setProperty("--hero-pointer-y", "38%");
    hero.style.setProperty("--hero-shift-x", "0px");
    hero.style.setProperty("--hero-shift-y", "0px");
    hero.style.setProperty("--hero-copy-x", "0px");
    hero.style.setProperty("--hero-copy-y", "0px");
  };

  const endHeroSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (swipeStart.current === null) return;
    const distance = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) > 55) moveHero(distance < 0 ? 1 : -1);
  };

  const subscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  const bestProducts = [...products]
    .sort((a, b) => (b.rating * b.reviewCount) - (a.rating * a.reviewCount))
    .filter((product) => activeCategory === "ALL" || product.category.toUpperCase() === activeCategory)
    .slice(0, 4);

  return (
    <main>
      <section id="top" ref={heroRef} className={`hero${heroPaused ? " is-paused" : ""}`} aria-labelledby="hero-title" onFocusCapture={() => setHeroFocusPaused(true)} onBlurCapture={() => setHeroFocusPaused(false)} onPointerMove={moveHeroPointer} onPointerLeave={resetHeroPointer} onPointerDown={(event) => { swipeStart.current = event.clientX; }} onPointerUp={endHeroSwipe} onPointerCancel={() => { swipeStart.current = null; }}>
        <div className="hero-slides" aria-hidden="true">
          {heroSlides.map((slide, index) => <div key={slide.image} className={`hero-slide ${index === activeHero ? "is-active" : ""}`}><img className={slide.imageClass} src={slide.image} alt="" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} /></div>)}
        </div>
        <HeroScene activeIndex={activeHero} />
        <div className="hero-pointer-light" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <img className="hero-brand-symbol" src="/maison-elan-symbol.svg" alt="" aria-hidden="true" />
        <div className="hero-copy" key={activeHero} aria-live={heroPaused ? "polite" : "off"}>
          <p className="eyebrow hero-eyebrow">{heroSlides[activeHero].eyebrow}</p>
          <h1 id="hero-title"><span>{heroSlides[activeHero].title}</span><br /><em>{heroSlides[activeHero].accent}</em></h1>
          <p className="hero-description">{heroSlides[activeHero].description}</p>
          <div className="hero-actions">
            <Link className="text-link light" href={heroSlides[activeHero].href}>{heroSlides[activeHero].primary} <ArrowUpRight size={16} /></Link>
            <Link className="text-link light muted" href={activeHero === 1 ? "/shop" : "/editorial"}>{heroSlides[activeHero].secondary}</Link>
          </div>
        </div>
        <div className="hero-controls" aria-label="메인 캠페인 슬라이드">
          <button type="button" onClick={() => moveHero(-1)} aria-label="이전 캠페인"><ArrowLeft size={18} strokeWidth={1.25} /></button>
          <p><strong>0{activeHero + 1}</strong><span>/ 0{heroSlides.length}</span></p>
          <div className="hero-progress" key={`progress-${activeHero}`}><i /></div>
          <button type="button" onClick={() => moveHero(1)} aria-label="다음 캠페인"><ArrowRight size={18} strokeWidth={1.25} /></button>
          <button className="hero-pause" type="button" onClick={(event) => { setHeroPaused((current) => !current); event.currentTarget.blur(); }} aria-label={heroPaused ? "캠페인 자동 전환 재생" : "캠페인 자동 전환 일시정지"} aria-pressed={heroPaused}>{heroPaused ? <Play size={16} /> : <Pause size={16} />}</button>
        </div>
        <nav className="hero-campaign-index" aria-label="캠페인 바로가기">{heroSlides.map((slide, index) => <button className={activeHero === index ? "active" : ""} type="button" onClick={() => moveHeroTo(index)} aria-current={activeHero === index ? "true" : undefined} key={slide.image}><span>0{index + 1}</span><em>{slide.accent}</em></button>)}</nav>
        <p className="hero-index">ÉLAN / CAMPAIGN 26 — SEOUL</p>
        <a className="scroll-cue" href="#content" aria-label="다음 섹션으로 이동"><span>SCROLL TO DISCOVER</span><i /></a>
      </section>

      <div id="content">
        <section id="best" className="products-section section-pad">
          <div className="section-heading section-heading-branded">
            <div><p className="eyebrow dark">MOST LOVED / TOP RATED</p><h2>Best Sellers</h2></div>
            <img className="section-brand-symbol" src="/maison-elan-symbol.svg" alt="" aria-hidden="true" />
            <p className="section-intro">높은 평점과 풍부한 리뷰로 선택받은<br />메종 엘란의 가장 사랑받는 실루엣.</p>
          </div>
          <div className="category-row" aria-label="상품 카테고리">
            <div className="category-tabs">
              {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} type="button" onClick={() => setActiveCategory(category)}>{category}</button>)}
            </div>
            <Link className="view-all" href="/shop">VIEW ALL <ArrowUpRight size={15} /></Link>
          </div>
          <div className="product-grid">{bestProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div>
        </section>

        <section className="seasonal-section" aria-labelledby="season-title">
          <ScrollParallaxImage className="season-image image-reveal" src="/editorial-02.png" alt="아이보리 니트 드레스를 입은 메종 엘란의 브랜드 모델" strength={48} scale={1.14}><span className="vertical-note">THE AW 2026 EDIT</span></ScrollParallaxImage>
          <div className="season-copy">
            <p className="eyebrow dark">SEASONAL EDIT / NO. 01</p>
            <h2 id="season-title">The Art of<br /><em>Soft Structure</em></h2>
            <p>부드러움 속에 선명한 구조를 담았습니다. 유연한 드레이프와 정교한 테일러링이 만나 일상의 움직임을 더욱 우아하게 만듭니다.</p>
            <Link className="text-link dark" href="/shop">에디트 쇼핑하기 <ArrowUpRight size={16} /></Link>
            <div className="season-count"><strong>12</strong><span>CURATED<br />PIECES</span></div>
          </div>
        </section>

        <section id="atelier" className="designer-section section-pad" aria-labelledby="atelier-title">
          <div className="designer-heading"><p className="eyebrow">MAISON ÉLAN / THE ATELIER</p><p className="designer-location">SEOUL — EST. 2026</p></div>
          <div className="designer-content">
            <div className="designer-copy">
              <p className="oversized-number">26</p><h2 id="atelier-title">Maison<br /><em>Élan</em></h2>
              <p className="designer-quote">“매일 입는 옷일수록 더 정확하고 아름다워야 합니다.”</p>
              <p className="designer-body">메종 엘란은 여성의 몸과 움직임에서 출발합니다. 절제된 선, 부드러운 구조, 오래 남는 촉감으로 한 사람의 일상에 자연스럽게 스며드는 옷을 만듭니다.</p>
              <Link className="text-link light" href="/editorial/line-becomes-silhouette">아틀리에 스토리 <ArrowUpRight size={16} /></Link>
            </div>
            <ScrollParallaxImage className="designer-image" src="/editorial-01.png" alt="아이보리 실크 룩을 입은 메종 엘란의 브랜드 모델" strength={40} scale={1.13}><span>LOOK 06 / AW26</span></ScrollParallaxImage>
          </div>
        </section>

        <section id="journal" className="journal-section section-pad" aria-labelledby="journal-title">
          <div className="section-heading journal-heading"><div><p className="eyebrow dark">ÉLAN JOURNAL</p><h2 id="journal-title">Stories of Form</h2></div><Link className="view-all" href="/editorial">ALL STORIES <ArrowUpRight size={15} /></Link></div>
          <div className="journal-grid">
            <Link className="journal-card large" href="/editorial"><ScrollParallaxImage className="journal-image" src="/product-02.png" alt="블랙 실크 드레스를 입은 브랜드 모델" strength={30} scale={1.1} /><p className="eyebrow dark">MATERIAL / 6 MIN</p><h3>실크가 빛을 기억하는 방식</h3></Link>
            <Link className="journal-card" href="/editorial"><ScrollParallaxImage className="journal-image" src="/product-03.png" alt="블랙 테일러링을 입은 브랜드 모델" strength={30} scale={1.1} /><p className="eyebrow dark">ATELIER / 4 MIN</p><h3>하나의 선에서 시작된 실루엣</h3></Link>
          </div>
        </section>

        <section id="newsletter" className="newsletter-section">
          <div><p className="eyebrow">PRIVATE LETTER / ÉLAN</p><h2>{subscribed ? "Welcome to Élan." : <>A quiet note,<br /><em>just for you.</em></>}</h2></div>
          {subscribed ? <p className="newsletter-success">구독해 주셔서 감사합니다.<br />새로운 에디트를 가장 먼저 전해드릴게요.</p> : (
            <form onSubmit={subscribe}><label htmlFor="newsletter-email">새 컬렉션과 에디토리얼 소식을 받아보세요.</label><div className="email-field"><input id="newsletter-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="EMAIL ADDRESS" required /><button type="submit" aria-label="뉴스레터 구독"><ArrowUpRight size={20} /></button></div><p>구독 신청 시 개인정보 수집 및 이용에 동의하게 됩니다.</p></form>
          )}
        </section>
      </div>
    </main>
  );
}
