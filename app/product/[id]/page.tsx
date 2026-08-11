import type { Metadata } from "next";
import { RuntimeProductDetail } from "./RuntimeProductDetail";
import { getProduct, products } from "../../lib/products";

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  return { title: product.name, description: product.description };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RuntimeProductDetail id={id} initialProduct={getProduct(id)} />;
}
