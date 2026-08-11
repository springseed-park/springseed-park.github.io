"use client";

import Link from "next/link";
import { Heart, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { formatPrice, Product } from "../lib/products";
import { useStore } from "./StoreProvider";

export function ColorSwatches({ colors, compact = false, selected, onSelect }: { colors: Product["colors"]; compact?: boolean; selected?: string; onSelect?: (color: Product["colors"][number]) => void }) {
  return (
    <div className={`color-swatches ${compact ? "is-compact" : ""}`} aria-label={`색상 ${colors.length}개`}>
      {colors.map((color) => onSelect ? (
        <button key={color.name} type="button" className={`color-swatch ${selected === color.name ? "is-selected" : ""}`} title={color.name} aria-label={`${color.name} 색상으로 보기`} aria-pressed={selected === color.name} style={{ backgroundColor: color.hex }} onClick={() => onSelect(color)} />
      ) : (
        <span key={color.name} className="color-swatch" title={color.name} style={{ backgroundColor: color.hex }} />
      ))}
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const selected = wishlist.includes(product.id);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);

  return (
    <article className="product-card">
      <div className="product-media">
        <Link href={`/product/${product.id}`} aria-label={`${product.name} 상세 보기`}>
          <img key={selectedColor.image} src={selectedColor.image} alt={`${product.name}, ${selectedColor.name} 색상 착용 이미지`} loading={priority ? "eager" : "lazy"} />
        </Link>
        {product.label && <span className={`product-label ${product.label === "SALE" ? "is-sale" : ""}`}>{product.label}</span>}
        <button className="quick-add" type="button" onClick={() => addToCart(product.id, product.sizes[0], selectedColor.name)}>
          <span><ShoppingBag size={15} strokeWidth={1.5} /> 빠른 담기</span><Plus size={15} strokeWidth={1.5} />
        </button>
      </div>
      <div className="product-meta">
        <div>
          <p className="product-category">{product.category}</p>
          <h3><Link href={`/product/${product.id}`}>{product.name}</Link></h3>
          <p className="product-review-count"><span aria-hidden="true">★</span> {product.rating.toFixed(1)} <em>({product.reviewCount})</em></p>
        </div>
        <div className={`product-price ${product.originalPrice ? "is-sale" : ""}`}>{product.originalPrice && <del>{formatPrice(product.originalPrice)}</del>}<p>{formatPrice(product.price)}</p></div>
      </div>
      <div className="product-card-options">
        <ColorSwatches colors={product.colors} compact selected={selectedColor.name} onSelect={setSelectedColor} />
        <button className={`product-card-heart ${selected ? "selected" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-label={selected ? "위시리스트에서 삭제" : "위시리스트에 추가"} title={selected ? "위시리스트에서 삭제" : "위시리스트에 추가"}><Heart size={19} strokeWidth={1.4} fill={selected ? "currentColor" : "none"} /></button>
      </div>
    </article>
  );
}
