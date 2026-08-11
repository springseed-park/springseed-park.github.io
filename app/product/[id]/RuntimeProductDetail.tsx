"use client";

import { useEffect, useState } from "react";
import { Product } from "../../lib/products";
import { ProductDetail } from "./ProductDetail";

export function RuntimeProductDetail({ id, initialProduct }: { id: string; initialProduct: Product }) {
  const [product, setProduct] = useState(initialProduct);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const managed = JSON.parse(localStorage.getItem("maison-admin-products") || "[]") as Product[];
        const runtimeProduct = managed.find((item) => item.id === id);
        if (runtimeProduct) setProduct(runtimeProduct);
      } catch { /* use the bundled product */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [id]);
  return <ProductDetail key={product.id} product={product} />;
}
