"use client";

import Link from "./StaticLink";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "./StoreProvider";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(!isHome);
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartCount, wishlist } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(!isHome || window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <a className="skip-link" href="#content">본문으로 바로가기</a>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""} ${!isHome ? "inner-header" : ""}`}>
        <button className="header-icon mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기"><Menu size={22} strokeWidth={1.4} /></button>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          <Link href="/#best">BEST</Link><Link href="/shop">SHOP</Link><Link href="/editorial">EDITORIAL</Link>
        </nav>
        <Link className="brand-mark" href="/" aria-label="Maison Élan 홈">
          <img className="brand-logo" src="/maison-elan-logo.png" alt="" />
        </Link>
        <nav className="header-utilities icon-utilities" aria-label="유틸리티 메뉴">
          <Link href="/search" aria-label="검색"><Search size={19} strokeWidth={1.35} /></Link>
          <Link href="/account" aria-label="계정"><UserRound size={19} strokeWidth={1.35} /></Link>
          <Link href="/wishlist" aria-label={`위시리스트 상품 ${wishlist.length}개`}><Heart size={19} strokeWidth={1.35} /><span className="icon-badge">{wishlist.length}</span></Link>
          <Link href="/cart" aria-label={`장바구니 상품 ${cartCount}개`}><ShoppingBag size={20} strokeWidth={1.35} /><span className="icon-badge">{cartCount}</span></Link>
        </nav>
      </header>
      <aside className={`menu-drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <button className="drawer-close" type="button" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기"><X size={25} strokeWidth={1.3} /></button>
        <img className="drawer-brand-symbol" src="/maison-elan-symbol.svg" alt="" aria-hidden="true" />
        <p className="eyebrow">MENU / 2026</p>
        <nav aria-label="모바일 메뉴">
          <Link href="/#best">Best Sellers <sup>08</sup></Link><Link href="/shop">Shop All</Link><Link href="/editorial">Editorial <sup>08</sup></Link>
        </nav>
        <div className="drawer-meta"><Link href="/account">Account</Link><Link href="/wishlist">Wishlist ({wishlist.length})</Link><p>Seoul · KRW</p></div>
      </aside>
      <button className={`page-scrim ${menuOpen ? "is-visible" : ""}`} type="button" onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기" tabIndex={menuOpen ? 0 : -1} />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <img className="footer-symbol" src="/maison-elan-symbol.svg" alt="" aria-hidden="true" />
      <div className="footer-top">
        <Link className="footer-brand" href="/" aria-label="Maison Élan 홈"><img src="/maison-elan-logo.png" alt="" /></Link>
        <div className="footer-links">
          <div><p>CLIENT SERVICE</p><Link href="/support#contact">Contact</Link><Link href="/support#delivery">Delivery & Returns</Link><Link href="/support#size-guide">Size Guide</Link></div>
          <div><p>ABOUT</p><Link href="/editorial/between-light-and-form">Our Story</Link><Link href="/editorial">Journal</Link><Link href="/editorial#archive">Issue Archive</Link></div>
          <div><p>FOLLOW</p><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.pinterest.com/" target="_blank" rel="noreferrer">Pinterest</a><a href="mailto:client@maisonelan.kr">Email</a></div>
          <div><p>MANAGEMENT</p><Link href="/admin">Administrator</Link></div>
        </div>
      </div>
      <div className="footer-bottom"><span>© 2026 MAISON ÉLAN</span><span>SEOUL, SOUTH KOREA</span><span><Link href="/policy#privacy">PRIVACY</Link> · <Link href="/policy#terms">TERMS</Link></span></div>
    </footer>
  );
}

export function StoreToast() {
  const { toast } = useStore();
  return <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>;
}
