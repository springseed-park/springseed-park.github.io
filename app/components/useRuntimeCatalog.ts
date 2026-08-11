"use client";

import { useEffect, useState } from "react";
import { Product, products } from "../lib/products";

type ManagedProduct = Product & { status?: string };

export function useRuntimeCatalog() {
  const [catalog, setCatalog] = useState<Product[]>(products);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const managed = JSON.parse(localStorage.getItem("maison-admin-products") || "[]") as ManagedProduct[];
        if (managed.length) setCatalog(managed.filter((product) => !product.status || product.status === "판매중"));
      } catch { /* use the bundled catalog */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return catalog;
}
