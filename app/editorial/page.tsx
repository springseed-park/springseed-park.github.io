import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ScrollParallaxImage } from "../components/ScrollParallaxImage";
import { editorials } from "../lib/editorials";

const issues = [
  { number: "01", season: "AUTUMN 2026", title: "Between Light & Form", slug: "between-light-and-form" },
  { number: "00", season: "PRE-FALL 2026", title: "A Study in Stillness", slug: "the-new-quiet-tailoring" },
  { number: "ARCHIVE", season: "WARDROBE NOTES", title: "Pieces to Keep", slug: "choosing-clothes-that-last" },
];

export default function EditorialPage() {
  const cover = editorials[0];
  return (
    <main id="content" className="inner-page editorial-page">
      <section className="editorial-feature">
        <ScrollParallaxImage className="editorial-feature-media" src={cover.image} alt="아이보리 실크 룩을 입은 메종 엘란 브랜드 모델" strength={52} scale={1.13} loading="eager" fetchPriority="high" />
        <div className="editorial-feature-copy"><p className="eyebrow">ISSUE 01 / AUTUMN 2026</p><h1>Between<br /><em>Light & Form</em></h1><p>빛이 옷의 표면을 스치고, 움직임이 새로운 형태를 만듭니다.<br />AW 2026 시즌을 여는 첫 번째 이야기.</p><Link className="text-link light" href={`/editorial/${cover.slug}`}>커버 스토리 읽기 <ArrowUpRight size={17} /></Link></div>
      </section>

      <nav className="editorial-categories" aria-label="에디토리얼 카테고리"><a href="#latest">LATEST</a><a href="#material">MATERIAL</a><a href="#style">STYLE</a><a href="#atelier">ATELIER</a><a href="#archive">ARCHIVE</a></nav>

      <section id="latest" className="stories-section">
        <div className="subpage-heading"><p className="eyebrow dark">LATEST STORIES / 08</p><h2>Élan Journal</h2></div>
        <div className="stories-grid">{editorials.slice(1).map((story, index) => <article key={story.slug} id={index === 0 ? "material" : index === 1 ? "atelier" : index === 5 ? "style" : undefined} className={`story-card ${index === 0 || index === 3 ? "is-large" : ""}`}><Link href={`/editorial/${story.slug}`}><ScrollParallaxImage className="story-image" src={story.image} alt={story.title} imageStyle={{ objectPosition: story.imagePosition }} strength={index === 0 || index === 3 ? 28 : 22} scale={index === 0 || index === 3 ? 1.09 : 1.08} /><p className="eyebrow dark">{story.type} / {story.time}</p><h3>{story.title}</h3><p className="story-description">{story.subtitle}</p><span>READ STORY <ArrowUpRight size={14} /></span></Link></article>)}</div>
      </section>

      <section className="editorial-manifesto">
        <ScrollParallaxImage className="editorial-manifesto-image" src="/product-03.png" alt="검은 테일러링을 입은 메종 엘란 브랜드 모델" strength={42} scale={1.13} />
        <div className="editorial-manifesto-copy"><img src="/maison-elan-symbol.svg" alt="" aria-hidden="true" /><p className="eyebrow">MAISON NOTE / 01</p><blockquote>“옷은 몸을 감싸는 가장 가까운 건축이며, 매일의 태도를 만드는 조용한 언어입니다.”</blockquote><p>메종 엘란은 빠르게 지나가는 유행보다 오래 곁에 남는 형태를 기록합니다. 소재를 만지는 손, 선을 결정하는 시간, 한 벌을 자신의 방식으로 입는 사람의 이야기를 전합니다.</p><Link className="text-link light" href="/editorial/line-becomes-silhouette">아틀리에 노트 읽기 <ArrowUpRight size={16} /></Link></div>
      </section>

      <section id="archive" className="editorial-archive">
        <div className="subpage-heading"><p className="eyebrow dark">SELECTED ISSUES</p><h2>Issue Archive</h2></div>
        <div className="issue-list">{issues.map((issue) => <Link href={`/editorial/${issue.slug}`} key={issue.number}><span>{issue.number}</span><p>{issue.season}</p><h3>{issue.title}</h3><ArrowRight size={24} strokeWidth={1.2} /></Link>)}</div>
      </section>
    </main>
  );
}
