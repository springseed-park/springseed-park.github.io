"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { products } from "../lib/products";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => query.trim() ? products.filter((product) => `${product.name} ${product.category} ${product.description} ${product.material} ${product.label ?? ""}`.toLowerCase().includes(query.toLowerCase())) : [], [query]);
  return (
    <main id="content" className="inner-page search-page">
      <section className="search-header"><p className="eyebrow dark">SEARCH MAISON ÉLAN</p><div className="large-search"><Search size={30} strokeWidth={1.15} /><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="무엇을 찾고 계신가요?" aria-label="상품 검색" />{query && <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={24} /></button>}</div><div className="popular-terms"><span>POPULAR</span>{["SILK", "WOOL", "DRESS", "NEW"].map((term) => <button key={term} type="button" onClick={() => setQuery(term)}>{term}</button>)}</div></section>
      <section className="search-results"><div className="result-meta"><p>{query ? `“${query}” 검색 결과 ${results.length}개` : "검색어를 입력해 주세요"}</p></div>{results.length ? <div className="product-grid shop-grid">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : query ? <div className="empty-state"><Search size={34} strokeWidth={1.1} /><h2>검색 결과가 없습니다.</h2><p>다른 검색어 또는 더 짧은 키워드로 검색해 보세요.</p></div> : <div className="search-suggestion"><p>DISCOVER</p><h2>New shapes<br /><em>for the season.</em></h2></div>}</section>
    </main>
  );
}
