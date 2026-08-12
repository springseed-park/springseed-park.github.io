"use client";

import { ChevronDown, Columns2, Grid2X2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { type Product } from "../lib/products";
import { useRuntimeCatalog } from "../components/useRuntimeCatalog";

const categories = ["All", "Outer", "Dresses", "Tops", "Knitwear", "Bottoms", "Accessories"];
const sizes = ["XS", "S", "M", "L", "FREE"];
const PRICE_STEP = 1000;

const colorGroups = [
  { value: "black", label: "블랙 계열", hex: "#171514", tones: ["black", "ink", "noir", "midnight", "charcoal"] },
  { value: "ivory", label: "아이보리 계열", hex: "#eee7dc", tones: ["ivory", "cream", "pearl", "oat", "white"] },
  { value: "beige", label: "베이지 계열", hex: "#b9a58e", tones: ["beige", "sand", "camel", "taupe", "mushroom"] },
  { value: "brown", label: "브라운 계열", hex: "#68442f", tones: ["brown", "cocoa", "espresso"] },
  { value: "silver", label: "실버 계열", hex: "#aaa9a5", tones: ["silver", "stone", "grey", "gray"] },
  { value: "wine", label: "와인 계열", hex: "#641f30", tones: ["wine", "oxblood", "burgundy", "bordeaux"] },
  { value: "red", label: "레드 계열", hex: "#a33735", tones: ["red", "scarlet", "crimson"] },
  { value: "orange", label: "오렌지 계열", hex: "#b86632", tones: ["orange", "terracotta", "coral"] },
  { value: "yellow", label: "옐로 계열", hex: "#c5a647", tones: ["yellow", "mustard", "gold"] },
  { value: "green", label: "그린 계열", hex: "#53624d", tones: ["green", "olive", "khaki", "sage"] },
  { value: "blue", label: "블루 계열", hex: "#465970", tones: ["blue", "navy", "denim", "cobalt"] },
  { value: "purple", label: "퍼플 계열", hex: "#725269", tones: ["purple", "violet", "lavender", "lilac", "pink", "rose"] },
] as const;

function hexToHsl(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return { hue: 0, saturation: 0, lightness: .5 };
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return { hue, saturation, lightness };
}

function getColorGroup(name: string, hex: string) {
  const normalizedName = name.toLocaleLowerCase("en-US");
  const namedGroup = colorGroups.find((group) => group.tones.some((tone) => normalizedName.includes(tone)));
  if (namedGroup) return namedGroup.value;

  const { hue, saturation, lightness } = hexToHsl(hex);
  if (lightness < .25) return "black";
  if (saturation < .12) return lightness > .78 ? "ivory" : "silver";
  if (hue < 15 || hue >= 345) return lightness < .48 ? "wine" : "red";
  if (hue < 40) return lightness < .42 ? "brown" : "orange";
  if (hue < 65) return lightness < .48 ? "brown" : "yellow";
  if (hue < 170) return "green";
  if (hue < 255) return "blue";
  if (hue < 345) return "purple";
  return "silver";
}

function productHasSelectedColor(product: Product, selectedGroups: string[]) {
  if (!selectedGroups.length) return true;
  return product.colors.some((color) => selectedGroups.includes(getColorGroup(color.name, color.hex)));
}

export default function ShopPage() {
  const products = useRuntimeCatalog();
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMinPrice, setSelectedMinPrice] = useState<number | null>(null);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | null>(null);
  const [priceDraft, setPriceDraft] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });
  const [gridMode, setGridMode] = useState<"compact" | "large">("compact");

  const colorOptions = useMemo(() => colorGroups.filter((group) => products.some((product) => product.colors.some((color) => getColorGroup(color.name, color.hex) === group.value))), [products]);

  const [catalogMinPrice, catalogMaxPrice] = useMemo(() => {
    const prices = products.map((product) => product.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [products]);
  const minPrice = selectedMinPrice ?? catalogMinPrice;
  const maxPrice = selectedMaxPrice ?? catalogMaxPrice;
  const priceRangeActive = selectedMinPrice !== null || selectedMaxPrice !== null;
  const priceSpan = Math.max(catalogMaxPrice - catalogMinPrice, 1);
  const rangeStart = ((minPrice - catalogMinPrice) / priceSpan) * 100;
  const rangeEnd = ((maxPrice - catalogMinPrice) / priceSpan) * 100;

  const toggleSize = (size: string) => setSelectedSizes((current) => current.includes(size) ? current.filter((item) => item !== size) : [...current, size]);
  const toggleColor = (value: string) => setSelectedColors((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const resetPrice = () => { setSelectedMinPrice(null); setSelectedMaxPrice(null); setPriceDraft({ min: null, max: null }); };
  const commitPrice = (type: "min" | "max") => {
    const rawValue = priceDraft[type]?.replace(/\D/g, "") ?? "";
    const parsedValue = rawValue ? Number(rawValue) : type === "min" ? catalogMinPrice : catalogMaxPrice;
    if (type === "min") setSelectedMinPrice(Math.max(catalogMinPrice, Math.min(parsedValue, maxPrice)));
    else setSelectedMaxPrice(Math.min(catalogMaxPrice, Math.max(parsedValue, minPrice)));
    setPriceDraft((current) => ({ ...current, [type]: null }));
  };
  const resetFilters = () => { setSelectedSizes([]); setSelectedColors([]); resetPrice(); setCategory("All"); setSort("recommended"); };
  const activeFilterCount = selectedSizes.length + selectedColors.length + Number(priceRangeActive) + Number(category !== "All") + Number(sort === "sale");

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (category !== "All" && product.category !== category) return false;
      if (selectedSizes.length && !selectedSizes.some((size) => product.sizes.includes(size))) return false;
      if (!productHasSelectedColor(product, selectedColors)) return false;
      if (product.price < minPrice || product.price > maxPrice) return false;
      if (sort === "sale" && !product.originalPrice) return false;
      return true;
    });
    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
    if (sort === "new") filtered.sort((a, b) => Number(b.label === "NEW") - Number(a.label === "NEW"));
    if (sort === "sale") filtered.sort((a, b) => ((b.originalPrice ?? b.price) - b.price) - ((a.originalPrice ?? a.price) - a.price));
    return filtered;
  }, [category, maxPrice, minPrice, products, selectedColors, selectedSizes, sort]);

  return (
    <main id="content" className="inner-page shop-page">
      <section className="inner-hero shop-hero">
        <p className="eyebrow dark">THE COLLECTION / AW 2026</p>
        <div><h1>Shop</h1><p>소재와 실루엣을 기준으로 고른<br />이번 시즌의 에센셜 피스.</p></div>
        <span>{String(products.length).padStart(2, "0")} PIECES</span>
      </section>
      <div className={`shop-filter-shell${filtersOpen ? " is-open" : ""}`}>
        <div className="shop-toolbar">
          <button className="filter-toggle" type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="shop-filter-panel"><SlidersHorizontal size={18} strokeWidth={1.4} /> FILTER {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}</button>
          <div className="shop-categories" role="tablist" aria-label="상품 카테고리">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</div>
          <label className="sort-control"><span className="sr-only">정렬 및 상품 보기</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">추천순</option><option value="new">신상품순</option><option value="sale">할인상품</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option></select><ChevronDown size={15} strokeWidth={1.5} /></label>
        </div>
        <aside id="shop-filter-panel" className={`filter-panel ${filtersOpen ? "is-open" : ""}`} aria-hidden={!filtersOpen}>
        <div><p>SIZE</p><div className="filter-options">{sizes.map((size) => <button key={size} className={selectedSizes.includes(size) ? "active" : ""} type="button" aria-pressed={selectedSizes.includes(size)} onClick={() => toggleSize(size)}>{size}</button>)}</div></div>
        <div className="filter-color-group"><p>COLOR</p><div className="filter-color-list" aria-label="색상 계열">{colorOptions.map((item) => <button key={item.value} className={selectedColors.includes(item.value) ? "active" : ""} type="button" aria-label={item.label} title={item.label} aria-pressed={selectedColors.includes(item.value)} onClick={() => toggleColor(item.value)}><span style={{ background: item.hex }} /></button>)}</div></div>
        <div className="price-range-filter">
          <div className="price-filter-heading"><p>PRICE</p><button type="button" onClick={resetPrice} disabled={!priceRangeActive} aria-label="가격 필터 초기화" title="가격 필터 초기화"><RotateCcw size={15} strokeWidth={1.5} /></button></div>
          <div className="price-range-slider">
            <span className="price-range-track" />
            <span className="price-range-fill" style={{ left: `${rangeStart}%`, right: `${100 - rangeEnd}%` }} />
            <input type="range" min={catalogMinPrice} max={catalogMaxPrice} step={PRICE_STEP} value={minPrice} aria-label="최소 가격" onChange={(event) => { setSelectedMinPrice(Math.min(Number(event.target.value), maxPrice)); setPriceDraft((current) => ({ ...current, min: null })); }} />
            <input type="range" min={catalogMinPrice} max={catalogMaxPrice} step={PRICE_STEP} value={maxPrice} aria-label="최대 가격" onChange={(event) => { setSelectedMaxPrice(Math.max(Number(event.target.value), minPrice)); setPriceDraft((current) => ({ ...current, max: null })); }} />
          </div>
          <div className="price-direct-inputs">
            <label><span>최소</span><div><input type="text" inputMode="numeric" value={priceDraft.min ?? minPrice.toLocaleString("ko-KR")} onFocus={() => setPriceDraft((current) => ({ ...current, min: String(minPrice) }))} onChange={(event) => setPriceDraft((current) => ({ ...current, min: event.target.value.replace(/[^0-9]/g, "") }))} onBlur={() => commitPrice("min")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="최소 가격 직접 입력" /><em>원</em></div></label>
            <i>—</i>
            <label><span>최대</span><div><input type="text" inputMode="numeric" value={priceDraft.max ?? maxPrice.toLocaleString("ko-KR")} onFocus={() => setPriceDraft((current) => ({ ...current, max: String(maxPrice) }))} onChange={(event) => setPriceDraft((current) => ({ ...current, max: event.target.value.replace(/[^0-9]/g, "") }))} onBlur={() => commitPrice("max")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="최대 가격 직접 입력" /><em>원</em></div></label>
          </div>
        </div>
        <button className="filter-reset" type="button" onClick={resetFilters} disabled={activeFilterCount === 0}>필터 초기화</button>
        </aside>
      </div>
      <section className="shop-results" aria-live="polite">
        <div className="result-meta"><p>{visibleProducts.length} RESULTS</p><button className="grid-view-button" type="button" onClick={() => setGridMode((mode) => mode === "compact" ? "large" : "compact")} aria-label={gridMode === "compact" ? "상품을 크게 보기" : "상품을 바둑판으로 보기"} title={gridMode === "compact" ? "2열로 크게 보기" : "4열로 보기"}>{gridMode === "compact" ? <Grid2X2 size={20} strokeWidth={1.2} /> : <Columns2 size={21} strokeWidth={1.2} />}</button></div>
        {visibleProducts.length ? <div className={`product-grid shop-grid ${gridMode === "large" ? "is-large" : ""}`}>{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}</div> : <div className="shop-empty"><p>선택한 조건에 맞는 상품이 없습니다.</p><button type="button" onClick={resetFilters}>필터 초기화</button></div>}
      </section>
    </main>
  );
}
