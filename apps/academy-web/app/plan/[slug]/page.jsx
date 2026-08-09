import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlanPage, getPlanPages } from "../../../lib/plan.mjs";

export function generateStaticParams() {
  return getPlanPages().map((p) => ({ slug: p.slug }));
}
export function generateMetadata({ params }) {
  const p = getPlanPage(params.slug);
  return { title: p ? `${p.title} · VRishi Academy Plan` : "Plan" };
}
export default function PlanPage({ params }) {
  const pages = getPlanPages();
  const i = pages.findIndex((p) => p.slug === params.slug);
  if (i === -1) notFound();
  const page = getPlanPage(params.slug);
  const prev = pages[i - 1], next = pages[i + 1];
  return (
    <article>
      <span className="eyebrow">Master plan · section {page.order}</span>
      <h1>{page.title}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
      <nav className="pager" aria-label="Plan pages">
        <span>{prev && <Link href={`/plan/${prev.slug}`}>← {prev.title}</Link>}</span>
        <span>{next && <Link href={`/plan/${next.slug}`}>{next.title} →</Link>}</span>
      </nav>
    </article>
  );
}
