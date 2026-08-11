import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { editorials, getEditorial } from "../../lib/editorials";

export function generateStaticParams() {
  return editorials.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = getEditorial(slug);
  return { title: story.title, description: story.subtitle };
}

export default async function EditorialStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getEditorial(slug);
  const related = editorials.filter((item) => item.slug !== story.slug).slice(0, 3);

  return (
    <main id="content" className="inner-page article-page">
      <section className="article-hero">
        <img src={story.image} alt={story.title} style={{ objectPosition: story.imagePosition }} />
        <div className="article-hero-shade" />
        <img className="article-hero-symbol" src="/maison-elan-symbol.svg" alt="" aria-hidden="true" />
        <div className="article-hero-copy"><Link href="/editorial"><ArrowLeft size={16} /> JOURNAL</Link><p>{story.type} / {story.time}</p><h1>{story.title}</h1><span>{story.subtitle}</span></div>
      </section>

      <article className="article-body">
        <header className="article-lead"><div><p>ÉLAN JOURNAL</p><span>{story.date}</span><span>WORDS BY MAISON ÉLAN</span></div><p>{story.subtitle}</p></header>
        <div className="article-copy">
          {story.sections.map((section, index) => <section key={section.heading} className="article-section"><p className="article-section-number">0{index + 1}</p><h2>{section.heading}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{index === 0 && <blockquote>{story.quote}</blockquote>}</section>)}
        </div>
      </article>

      <section className="article-shop-note"><p className="eyebrow">THE EDIT / AW 2026</p><h2>이 이야기 속<br /><em>실루엣을 만나보세요.</em></h2><Link className="text-link light" href="/shop">컬렉션 쇼핑하기 <ArrowUpRight size={16} /></Link></section>

      <section className="article-related"><div className="subpage-heading"><p className="eyebrow dark">CONTINUE READING</p><h2>Next stories</h2></div><div>{related.map((item) => <Link href={`/editorial/${item.slug}`} key={item.slug}><img src={item.image} alt="" /><p>{item.type} / {item.time}</p><h3>{item.title}</h3></Link>)}</div></section>
    </main>
  );
}
