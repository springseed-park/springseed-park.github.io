"use client";

import Link from "../components/StaticLink";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "../components/StoreProvider";
import { useAuth } from "../components/AuthProvider";
import { formatPrice, getProduct } from "../lib/products";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, updateCartColor } = useStore();
  const auth = useAuth();
  const subtotal = cart.reduce((total, line) => total + getProduct(line.id).price * line.quantity, 0);
  useEffect(() => {
    if (!auth.loading && !auth.user) window.location.replace("/account?returnTo=/cart");
  }, [auth.loading, auth.user]);
  if (auth.loading || !auth.user) return <main id="content" className="inner-page utility-page cart-page"><section className="account-loading"><span /><p>로그인 화면으로 이동 중입니다.</p></section></main>;
  return (
    <main id="content" className="inner-page utility-page cart-page">
      <section className="utility-heading"><p className="eyebrow dark">YOUR SELECTION</p><h1>Shopping Bag</h1><span>{cart.reduce((total, line) => total + line.quantity, 0)} ITEMS</span></section>
      {!cart.length ? <section className="empty-state"><ShoppingBag size={38} strokeWidth={1.1} /><h2>쇼핑백이 비어 있습니다.</h2><p>새로운 컬렉션에서 오래 함께할<br />당신만의 피스를 찾아보세요.</p><Link className="primary-button" href="/shop">쇼핑 시작하기</Link></section> : (
        <section className="cart-layout">
          <div className="cart-lines">{cart.map((line) => { const product = getProduct(line.id); const selectedColor = product.colors.find((item) => item.name === line.color) ?? product.colors[0]; return <article className="cart-line" key={`${line.id}-${line.size}-${line.color}`}><Link className="cart-image" href={`/product/${product.id}`}><img src={selectedColor.image} alt={`${product.name} ${selectedColor.name}`} /></Link><div className="cart-info"><h2><Link href={`/product/${product.id}`}>{product.name}</Link></h2><p>SIZE {line.size}</p><div className="cart-color-option"><div><span>COLOR</span><strong>{selectedColor.name}</strong></div><div className="cart-color-swatches" aria-label="색상 변경">{product.colors.map((item) => <button key={item.name} type="button" className={item.name === selectedColor.name ? "active" : ""} style={{ background: item.hex }} title={item.name} aria-label={`${item.name} 색상으로 변경`} aria-pressed={item.name === selectedColor.name} onClick={() => updateCartColor(line.id, line.size, line.color, item.name)} />)}</div></div><div className="cart-quantity"><button type="button" onClick={() => updateQuantity(line.id, line.size, line.color, line.quantity - 1)} aria-label="수량 감소"><Minus size={14} /></button><span>{line.quantity}</span><button type="button" onClick={() => updateQuantity(line.id, line.size, line.color, line.quantity + 1)} aria-label="수량 증가"><Plus size={14} /></button></div></div><div className="cart-line-end"><button type="button" onClick={() => removeFromCart(line.id, line.size, line.color)} aria-label="상품 삭제"><Trash2 size={18} strokeWidth={1.3} /></button><strong>{formatPrice(product.price * line.quantity)}</strong></div></article>; })}</div>
          <aside className="order-summary"><p className="eyebrow dark">ORDER SUMMARY</p><div><span>상품 금액</span><strong>{formatPrice(subtotal)}</strong></div><div><span>배송비</span><strong>무료</strong></div><div className="summary-total"><span>총 결제 금액</span><strong>{formatPrice(subtotal)}</strong></div>{auth.loading ? <span className="primary-button cart-auth-loading">회원 정보를 확인하는 중...</span> : <Link className="primary-button" href={auth.user ? "/checkout" : "/account?returnTo=/checkout"}><ShoppingBag size={19} strokeWidth={1.4} />{auth.user ? "주문하기" : "로그인 후 주문하기"}</Link>}<p>{auth.user ? "회원 정보와 기본 배송지를 결제 화면에 자동으로 입력합니다." : "주문하려면 로그인이 필요하며 쇼핑백은 그대로 보관됩니다."}</p></aside>
        </section>
      )}
    </main>
  );
}
