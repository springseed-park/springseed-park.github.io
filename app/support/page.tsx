import { Mail, MapPin, Navigation, PackageCheck, Ruler, RotateCcw, Truck } from "lucide-react";
import KakaoOfficeMap from "../components/KakaoOfficeMap";

const showroom = {
  address: "서울특별시 성동구 연무장17길 8, ÉLAN HOUSE 4F",
  postalCode: "04790",
  latitude: 37.544606,
  longitude: 127.055936,
};

const kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent("MAISON ÉLAN ATELIER")},${showroom.latitude},${showroom.longitude}`;
const kakaoDirectionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent("MAISON ÉLAN ATELIER")},${showroom.latitude},${showroom.longitude}`;

const sizeRows = [
  ["XS", "44", "80–83", "62–65", "87–90"],
  ["S", "55", "84–87", "66–69", "91–94"],
  ["M", "66", "88–92", "70–74", "95–99"],
  ["L", "77", "93–97", "75–79", "100–104"],
];

export default function SupportPage() {
  return (
    <main id="content" className="inner-page support-page">
      <section className="utility-heading"><p className="eyebrow dark">CLIENT SERVICE</p><h1>Support</h1><span>MAISON ÉLAN</span></section>
      <div className="support-content">
        <section id="contact" className="support-section">
          <div className="support-section-title"><Mail size={24} strokeWidth={1.25} /><p className="eyebrow dark">01 / CONTACT</p><h2>무엇을 도와드릴까요?</h2></div>
          <div className="support-copy"><p>상품, 주문 및 교환·반품에 관한 문의를 남겨주세요. 영업일 기준 24시간 이내 순차적으로 답변드립니다.</p><dl><div><dt>고객센터</dt><dd>02-2026-0826</dd></div><div><dt>이메일</dt><dd><a href="mailto:client@maisonelan.kr">client@maisonelan.kr</a></dd></div><div><dt>운영시간</dt><dd>평일 10:00–17:00 · 점심 12:00–13:00</dd></div></dl></div>
        </section>
        <section id="visit" className="support-section support-location">
          <div className="support-section-title"><MapPin size={24} strokeWidth={1.25} /><p className="eyebrow dark">02 / VISIT</p><h2>성수의 조용한 아틀리에</h2></div>
          <div className="showroom-card">
            <KakaoOfficeMap latitude={showroom.latitude} longitude={showroom.longitude} mapUrl={kakaoMapUrl} />
            <div className="showroom-details">
              <p className="eyebrow dark">MAISON ÉLAN / SEOUL</p>
              <h3>Atelier Seongsu</h3>
              <address><span>{showroom.postalCode}</span>{showroom.address}</address>
              <dl><div><dt>운영시간</dt><dd>평일 10:00–18:00</dd></div><div><dt>방문 안내</dt><dd>예약 방문제로 운영됩니다.</dd></div></dl>
              <div className="showroom-actions"><a href={kakaoMapUrl} target="_blank" rel="noreferrer"><MapPin />카카오맵에서 보기</a><a href={kakaoDirectionsUrl} target="_blank" rel="noreferrer"><Navigation />길찾기</a></div>
            </div>
          </div>
        </section>
        <section id="delivery" className="support-section">
          <div className="support-section-title"><Truck size={24} strokeWidth={1.25} /><p className="eyebrow dark">03 / DELIVERY & RETURNS</p><h2>배송과 반품 안내</h2></div>
          <div className="support-guide-grid"><article><PackageCheck size={22} strokeWidth={1.25} /><h3>배송</h3><p>전 상품 무료 배송이며 오후 2시 이전 결제 완료 주문은 재고 확인 후 당일 출고됩니다. 평균 배송 기간은 영업일 기준 1–3일입니다.</p></article><article><RotateCcw size={22} strokeWidth={1.25} /><h3>교환·반품</h3><p>수령 후 7일 이내 신청할 수 있습니다. 택과 구성품이 훼손되지 않은 상품에 한해 무료 반품을 지원합니다.</p></article></div>
        </section>
        <section id="size-guide" className="support-section">
          <div className="support-section-title"><Ruler size={24} strokeWidth={1.25} /><p className="eyebrow dark">04 / SIZE GUIDE</p><h2>사이즈 가이드</h2></div>
          <div className="support-copy"><p>아래 치수는 신체 기준이며 단위는 cm입니다. 두 사이즈 사이에 해당한다면 여유로운 핏은 큰 사이즈를 권장합니다.</p><div className="support-size-table"><table><thead><tr><th>SIZE</th><th>KR</th><th>가슴</th><th>허리</th><th>힙</th></tr></thead><tbody>{sizeRows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell}>{cell}</th> : <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></div>
        </section>
      </div>
    </main>
  );
}
