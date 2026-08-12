"use client";

import { ChevronDown, Columns2, Grid2X2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { type Product } from "../lib/products";
import { useRuntimeCatalog } from "../components/useRuntimeCatalog";

const categories = ["All", "Outer", "Dresses", "Tops", "Knitwear", "Bottoms", "Accessories"];
const sizes = ["XS", "S", "M", "L", "FREE"];
type ColorGroup = "all" | "black" | "neutral" | "wine";
type PriceRange = "all" | "under-300" | "300-500" | "over-500";

function productHasColor(product: Product, group: ColorGroup) {
  if (group === "all") return true;
  const names = product.colors.map((color) => color.name.toLowerCase());
  if (group === "wine") return names.some((name) => name.includes("wine") || name.includes("oxblood"));
  if (group === "black") return names.some((name) => ["black", "ink", "midnight", "charcoal", "espresso"].some((tone) => name.includes(tone)));
  return product.colors.some((color) => {
    const name = color.name.toLowerCase();
    return !["black", "ink", "midnight", "charcoal", "espresso", "wine", "oxblood"].some((tone) => name.includes(tone));
  });
}

function productInPriceRange(product: Product, range: PriceRange) {
  if (range === "under-300") return product.price < 300000;
  if (range === "300-500") return product.price >= 300000 && product.price < 500000;
  if (range === "over-500") return product.price >= 500000;
  return true;
}

export default function ShopPage() {
  const products = useRuntimeCatalog();
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [color, setColor] = useState<ColorGroup>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [gridMode, setGridMode] = useState<"compact" | "large">("compact");

  const toggleSize = (size: string) => setSelectedSizes((current) => current.includes(size) ? current.filter((item) => item !== size) : [...current, size]);
  const resetFilters = () => { setSelectedSizes([]); setColor("all"); setPriceRange("all"); setCategory("All"); setSort("recommended"); };
  const activeFilterCount = selectedSizes.length + Number(color !== "all") + Number(priceRange !== "all") + Number(category !== "All") + Number(sort === "sale");

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (category !== "All" && product.category !== category) return false;
      if (selectedSizes.length && !selectedSizes.some((size) => product.sizes.includes(size))) return false;
      if (!productHasColor(product, color)) return false;
      if (!productInPriceRange(product, priceRange)) return false;
      if (sort === "sale" && !product.originalPrice) return false;
      return true;
    });
    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
    if (sort === "new") filtered.sort((a, b) => Number(b.label === "NEW") - Number(a.label === "NEW"));
    if (sort === "sale") filtered.sort((a, b) => ((b.originalPrice ?? b.price) - b.price) - ((a.originalPrice ?? a.price) - a.price));
    return filtered;
  }, [category, color, priceRange, selectedSizes, sort]);

  return (
    <main id="content" className="inner-page shop-page">
      <section className="inner-hero shop-hero">
        <p className="eyebrow dark">THE COLLECTION / AW 2026</p>
        <div><h1>Shop</h1><p>소재와 실루엣을 기준으로 고른<br />이번 시즌의 에센셜 피스.</p></div>
        <span>{String(products.length).padStart(2, "0")} PIECES</span>
      </section>
      <div className="shop-toolbar">
        <button className="filter-toggle" type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="shop-filter-panel"><SlidersHorizontal size={18} strokeWidth={1.4} /> FILTER {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}</button>
        <div className="shop-categories" role="tablist" aria-label="상품 카테고리">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</div>
        <label className="sort-control"><span className="sr-only">정렬 및 상품 보기</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">추천순</option><option value="new">신상품순</option><option value="sale">할인상품</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option></select><ChevronDown size={15} strokeWidth={1.5} /></label>
      </div>
      <aside id="shop-filter-panel" className={`filter-panel ${filtersOpen ? "is-open" : ""}`} aria-hidden={!filtersOpen}>
        <div><p>SIZE</p><div className="filter-options">{sizes.map((size) => <button key={size} className={selectedSizes.includes(size) ? "active" : ""} type="button" aria-pressed={selectedSizes.includes(size)} onClick={() => toggleSize(size)}>{size}</button>)}</div></div>
        <div><p>COLOR</p><div className="filter-color-list">{([{ value: "black", label: "BLACK", hex: "#171514" }, { value: "neutral", label: "NEUTRAL", hex: "#d9cdbb" }, { value: "wine", label: "WINE", hex: "#6b2533" }] as const).map((item) => <button key={item.value} className={color === item.value ? "active" : ""} type="button" aria-pressed={color === item.value} onClick={() => setColor(color === item.value ? "all" : item.value)}><span style={{ background: item.hex }} /><small>{item.label}</small></button>)}</div></div>
        <div><p>PRICE</p><div className="price-filter-options">{([{ value: "under-300", label: "30만원 미만" }, { value: "300-500", label: "30–50만원" }, { value: "over-500", label: "50만원 이상" }] as const).map((item) => <button key={item.value} className={priceRange === item.value ? "active" : ""} type="button" aria-pressed={priceRange === item.value} onClick={() => setPriceRange(priceRange === item.value ? "all" : item.value)}>{item.label}</button>)}</div></div>
        <button className="filter-reset" type="button" onClick={resetFilters} disabled={activeFilterCount === 0}>필터 초기화</button>
      </aside>
      <section className="shop-results" aria-live="polite">
        <div className="result-meta"><p>{visibleProducts.length} RESULTS</p><button className="grid-view-button" type="button" onClick={() => setGridMode((mode) => mode === "compact" ? "large" : "compact")} aria-label={gridMode === "compact" ? "상품을 크게 보기" : "상품을 바둑판으로 보기"} title={gridMode === "compact" ? "2열로 크게 보기" : "4열로 보기"}>{gridMode === "compact" ? <Grid2X2 size={20} strokeWidth={1.2} /> : <Columns2 size={21} strokeWidth={1.2} />}</button></div>
        {visibleProducts.length ? <div className={`product-grid shop-grid ${gridMode === "large" ? "is-large" : ""}`}>{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}</div> : <div className="shop-empty"><p>선택한 조건에 맞는 상품이 없습니다.</p><button type="button" onClick={resetFilters}>필터 초기화</button></div>}
      </section>
    </main>
  );
}
