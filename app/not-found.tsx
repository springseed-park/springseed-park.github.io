"use client";

import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    const match = window.location.pathname.match(/^\/product\/([^/]+)$/);
    if (match?.[1]) window.location.replace(`/product?product=${encodeURIComponent(match[1])}`);
  }, []);
  return <main id="content" className="inner-page utility-page"><section className="account-loading"><span /><p>상품 페이지를 연결하는 중입니다.</p></section></main>;
}
