import { products } from "../lib/products";
import { RuntimeProductDetail } from "./[id]/RuntimeProductDetail";

/** Static product entry used for products added after the GitHub Pages build. */
export default function ManagedProductPage() {
  return <RuntimeProductDetail initialProduct={products[0]} />;
}
