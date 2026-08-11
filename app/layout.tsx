import type { Metadata } from "next";
import { SiteFooter, SiteHeader, StoreToast } from "./components/SiteChrome";
import { StoreProvider } from "./components/StoreProvider";
import { AuthProvider } from "./components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://springseed-park.github.io"),
    referrer: "no-referrer-when-downgrade",
    title: { default: "MAISON ÉLAN — Curated Womenswear", template: "%s — MAISON ÉLAN" },
    description: "빛과 움직임으로 완성한 컨템포러리 여성복 셀렉트숍, 메종 엘란.",
    icons: { icon: "/maison-elan-symbol.svg" },
    openGraph: {
      title: "MAISON ÉLAN — Move in Your Own Light",
      description: "섬세한 소재와 정제된 실루엣을 큐레이션한 컨템포러리 여성복 셀렉트숍.",
      type: "website",
      images: [{ url: "/og.png", width: 1730, height: 909, alt: "MAISON ÉLAN — Move in Your Own Light" }],
    },
    twitter: { card: "summary_large_image", title: "MAISON ÉLAN", description: "Move in Your Own Light", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://accounts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.gstatic.com" />
        <script id="google-identity-services" src="https://accounts.google.com/gsi/client" async fetchPriority="high" />
      </head>
      <body>
        <StoreProvider>
          <AuthProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
            <StoreToast />
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
