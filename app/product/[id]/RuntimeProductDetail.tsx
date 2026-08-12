"use client";

import { useEffect, useState } from "react";
import { Product } from "../../lib/products";
import { ProductDetail } from "./ProductDetail";

export function RuntimeProductDetail({ id, initialProduct }: { id?: string; initialProduct: Product }) {
  const [product, setProduct] = useState<Product | null>(id ? initialProduct : null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const requestedId = id ?? new URLSearchParams(window.location.search).get("product") ?? "";
        const managed = JSON.parse(localStorage.getItem("maison-admin-products") || "[]") as Product[];
        const runtimeProduct = managed.find((item) => item.id === requestedId) ?? products.find((item) => item.id === requestedId);
        setProduct(runtimeProduct ?? (id ? initialProduct : null));
      } catch { setProduct(id ? initialProduct : null); }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [id, initialProduct]);
  if (!product) return <main id="content" className="inner-page utility-page"><section className="account-loading"><span /><p>상품 정보를 불러오는 중입니다.</p></section></main>;
  return <ProductDetail key={product.id} product={product} />;
}
