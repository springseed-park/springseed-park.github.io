"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { useRuntimeCatalog } from "../components/useRuntimeCatalog";
import type { Product } from "../lib/products";

const categoryKeywords: Record<Product["category"], string> = {
  Outer: "아우터 겉옷 외투 outerwear",
  Dresses: "드레스 원피스 dress onepiece",
  Tops: "상의 탑 top",
  Knitwear: "니트웨어 니트 스웨터 knit sweater",
  Bottoms: "하의 bottom",
  Accessories: "액세서리 악세사리 소품 accessories",
};

const productKeywords: Record<string, string> = {
  "signature-rib-socks": "양말 삭스 스타킹 socks",
  "sculpted-wool-jacket": "재킷 자켓 블레이저 jacket blazer",
  "soft-draped-dress": "원피스 드레스 롱원피스 dress",
  "sheer-silk-blouse": "블라우스 셔츠 실크셔츠 blouse shirt",
  "essential-column-skirt": "스커트 치마 롱스커트 skirt",
  "cashmere-wrap-knit": "니트 스웨터 랩니트 knit sweater",
  "tailored-wide-trousers": "바지 팬츠 슬랙스 와이드팬츠 trousers pants slacks",
  "asymmetric-satin-top": "탑 상의 민소매 새틴탑 top",
  "double-faced-coat": "코트 외투 롱코트 coat",
};

const nameKeywordMap: Record<string, string> = {
  socks: "양말 삭스 스타킹", dress: "원피스 드레스", jacket: "재킷 자켓 블레이저",
  blouse: "블라우스 셔츠", shirt: "셔츠 남방", skirt: "스커트 치마",
  knit: "니트 스웨터", sweater: "니트 스웨터", trousers: "바지 팬츠 슬랙스",
  pants: "바지 팬츠 슬랙스", coat: "코트 외투", top: "탑 상의",
};

const colorKeywords: Record<string, string> = {
  black: "검정 블랙", ink: "검정 블랙 잉크", noir: "검정 블랙",
  white: "흰색 화이트", ivory: "아이보리 크림", pearl: "아이보리 진주",
  cream: "크림 아이보리", oat: "오트 아이보리", beige: "베이지",
  sand: "샌드 베이지", camel: "카멜 베이지", taupe: "토프 베이지",
  mushroom: "머쉬룸 베이지", stone: "스톤 회색", silver: "실버 은색 회색",
  charcoal: "차콜 회색", midnight: "미드나이트 네이비", brown: "브라운 갈색",
  cocoa: "코코아 브라운 갈색", espresso: "에스프레소 브라운 갈색",
  wine: "와인 버건디 빨강", oxblood: "옥스블러드 버건디 와인 빨강",
};

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function searchableText(product: Product) {
  const normalizedName = product.name.toLocaleLowerCase("en-US");
  const translatedName = Object.entries(nameKeywordMap)
    .filter(([word]) => normalizedName.includes(word))
    .map(([, keywords]) => keywords);
  const colors = product.colors.flatMap((color) => {
    const translated = Object.entries(colorKeywords)
      .filter(([tone]) => color.name.toLocaleLowerCase("en-US").includes(tone))
      .map(([, keywords]) => keywords);
    return [color.name, ...translated];
  });
  return [
    product.name, product.id, product.category, categoryKeywords[product.category],
    productKeywords[product.id] ?? "", ...translatedName, product.description, product.material,
    product.fit, product.label ?? "", ...product.sizes, ...colors,
  ].join(" ");
}

export default function SearchPage() {
  const products = useRuntimeCatalog();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const terms = query.trim().split(/\s+/).map(normalizeSearch).filter(Boolean);
    if (!terms.length) return [];
    return products.filter((product) => {
      const index = normalizeSearch(searchableText(product));
      return terms.every((term) => index.includes(term));
    });
  }, [products, query]);
  return (
    <main id="content" className="inner-page search-page">
      <section className="search-header"><p className="eyebrow dark">SEARCH MAISON ÉLAN</p><div className="large-search"><Search size={30} strokeWidth={1.15} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색어를 입력하세요" aria-label="상품 검색" />{query && <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={24} /></button>}</div><div className="popular-terms"><span>POPULAR</span>{["원피스", "재킷", "양말", "실크"].map((term) => <button key={term} type="button" onClick={() => setQuery(term)}>{term}</button>)}</div></section>
      <section className="search-results"><div className="result-meta"><p>{query ? `“${query}” 검색 결과 ${results.length}개` : "검색어를 입력해 주세요"}</p></div>{results.length ? <div className="product-grid shop-grid">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : query ? <div className="empty-state"><Search size={34} strokeWidth={1.1} /><h2>검색 결과가 없습니다.</h2><p>다른 검색어 또는 더 짧은 키워드로 검색해 보세요.</p></div> : <div className="search-suggestion"><p>DISCOVER</p><h2>New shapes<br /><em>for the season.</em></h2></div>}</section>
    </main>
  );
}
