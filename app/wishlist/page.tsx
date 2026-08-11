"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { useStore } from "../components/StoreProvider";
import { products } from "../lib/products";

export default function WishlistPage() {
  const { wishlist } = useStore();
  const saved = products.filter((product) => wishlist.includes(product.id));
  return (
    <main id="content" className="inner-page utility-page">
      <section className="utility-heading"><p className="eyebrow dark">YOUR EDIT</p><h1>Wishlist</h1><span>{saved.length} ITEMS</span></section>
      {saved.length ? <section className="utility-products"><div className="product-grid shop-grid">{saved.map((product) => <ProductCard key={product.id} product={product} />)}</div></section> : <section className="empty-state"><Heart size={36} strokeWidth={1.1} /><h2>저장한 상품이 없습니다.</h2><p>마음에 드는 상품의 하트 아이콘을 눌러<br />나만의 에디트를 만들어 보세요.</p><Link className="primary-button" href="/shop">상품 둘러보기</Link></section>}
    </main>
  );
}
