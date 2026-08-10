import "./globals.css";
import Link from "next/link";
import { getPlanPages } from "../lib/plan.mjs";
import gap from "../data/gap.json";

export const metadata = {
  title: "VRishi Academy — Plan",
  description: "Practice portal master plan and real-progress gap",
};

export default function RootLayout({ children }) {
  const pages = getPlanPages();
  const pct = Math.round(
    (100 * (gap.contacts.done / gap.contacts.need + gap.conferences.done / gap.conferences.need +
      gap.electives.done / gap.electives.need + gap.workshops.done / gap.workshops.need)) / 4
  );
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="side">
            <Link href="/" className="brand">VRishi<span> Academy</span></Link>
            <p className="tag">Kappasinian practice studio · plan v1</p>
            <nav aria-label="Plan sections">
              {pages.map((p) => (
                <Link key={p.slug} href={`/plan/${p.slug}`} className="navlink">
                  <span className="ord">{p.order}</span>{p.title}
                </Link>
              ))}
            </nav>
            <Link href="/lab" className="navlink" style={{ marginTop: 10, color: "var(--amber)" }}>
              <span className="ord">&gt;_</span>Practice Lab
            </Link>
            <Link href="/studio" className="navlink" style={{ color: "var(--iris)" }}>
              <span className="ord">◉</span>Session Studio
            </Link>
            <Link href="/immersive" className="navlink" style={{ color: "var(--amber)" }}>
              <span className="ord">◈</span>Immersive Session
            </Link>
            <Link href="/dojo" className="gapchip" aria-label={`Real progress ${pct} percent`}>
              <span className="gaplabel">Real gap to CHt</span>
              <span className="gapbar"><span style={{ width: `${pct}%` }} /></span>
              <span className="gappct">{pct}% · Dec 10 hard stop</span>
            </Link>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
