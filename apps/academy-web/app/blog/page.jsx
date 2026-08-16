"use client";
/* ================================================================
   VRishi's Special Blogs — first-party essays & case reflections
   Static listing page. Wire to CMS/markdown store at handoff.
   ================================================================ */

const FEATURED = {
  meta: "12 min \u00B7 Method \u00B7 Aug 2026",
  title: "Why the arm won\u2019t lift for an emotional suggestible \u2014 and what to say instead",
  excerpt:
    "A physical convincer that lands for one client stalls another. Here is how I read the E/P split in the first ninety seconds, and the exact wording I switch to when the arm stays put.",
};

const POSTS = [
  { tag: "Case note", tagColor: "var(--teal)", date: "Aug 4", title: "The client who nodded at the wrong finger", excerpt: "Ideomotor answers don\u2019t always mean what the script assumes. A short reflection on reading the body over the checklist.", read: "6 min read" },
  { tag: "Method", tagColor: "var(--iris)", date: "Jul 28", title: "Maternal vs paternal tone \u2014 the same words, two outcomes", excerpt: "Tonality is not decoration. How pitch and pace change whether a suggestion is accepted or resisted.", read: "8 min read" },
  { tag: "Practice", tagColor: "var(--amber)", date: "Jul 19", title: "How I log a real rep in under two minutes", excerpt: "The lightweight ledger habit that keeps the Dec-10 gap honest without turning notes into a chore.", read: "5 min read" },
  { tag: "Story", tagColor: "var(--ok)", date: "Jul 11", title: "The first session I completely lost \u2014 and rebuilt", excerpt: "A candid walk through a session that fell apart at the deepener, and the repair that made it the most useful rep of the month.", read: "10 min read" },
  { tag: "Creative Wisdom", tagColor: "var(--amber)", date: "Jul 3", title: "Metaphors that do the heavy lifting \u2014 a small library", excerpt: "The staircase, the balloon, the tide. Where each image earns its place, and how to invent your own so the language never goes stale.", read: "7 min read" },
];

export default function Blog() {
  return (
    <article>
      <span className="eyebrow">First-party &middot; from the practice</span>
      <h1>VRishi&rsquo;s <em>Special Blogs</em></h1>
      <p className="note" style={{ marginBottom: 8 }}>
        Original field notes, case reflections, and method deep-dives &mdash;
        the voice that sets this practice apart from every other school.
        This is where craft meets story.
      </p>

      {/* what / why / how / value */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", margin: "18px 0 4px",
      }}>
        {[
          { k: "What", c: "var(--teal)", t: "First-party essays & case reflections." },
          { k: "Why", c: "var(--iris)", t: "A distinct voice builds trust & audience." },
          { k: "How", c: "var(--amber)", t: "Write from real reps; publish on a cadence." },
          { k: "Value", c: "var(--ok)", t: "Differentiation, SEO, and referrals." },
        ].map((b) => (
          <div key={b.k} style={{ background: "var(--panel)", padding: "14px 16px" }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em",
              textTransform: "uppercase", color: b.c, marginBottom: 5,
            }}>{b.k}</div>
            <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45 }}>{b.t}</div>
          </div>
        ))}
      </div>

      {/* featured */}
      <div style={{
        marginTop: 22, border: "1px solid var(--line)", borderTop: "2px solid var(--amber)",
        borderRadius: 16,
        background: "linear-gradient(180deg, var(--raise), var(--panel))",
        padding: "24px 26px",
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10, color: "var(--void)",
            background: "var(--amber)", borderRadius: 5, padding: "2px 8px",
          }}>FEATURED</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)" }}>
            {FEATURED.meta}
          </span>
        </div>
        <h2 style={{ font: "340 28px/1.15 var(--display)", margin: "0 0 8px", maxWidth: "26ch" }}>
          {FEATURED.title}
        </h2>
        <p style={{ color: "#cfc9dd", fontSize: 14.5, lineHeight: 1.6, maxWidth: "64ch", margin: "0 0 14px" }}>
          {FEATURED.excerpt}
        </p>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--iris)" }}>
          Read the essay &rarr;
        </span>
      </div>

      {/* post list */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14, marginTop: 18,
      }}>
        {POSTS.map((p, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", gap: 9,
            border: "1px solid var(--line)", borderRadius: 14,
            background: "var(--panel)", padding: 18,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".08em",
                textTransform: "uppercase", color: p.tagColor,
                border: "1px solid var(--line-2)", borderRadius: 5, padding: "3px 8px",
              }}>{p.tag}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>
                {p.date}
              </span>
            </div>
            <div style={{ font: "340 19px/1.25 var(--display)", color: "var(--ink)" }}>
              {p.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--mist)", lineHeight: 1.5 }}>
              {p.excerpt}
            </div>
            <div style={{ marginTop: "auto", fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--iris)" }}>
              {p.read}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)",
        border: "1px dashed var(--line-2)", borderRadius: 8,
        padding: "9px 13px", marginTop: 20,
      }}>
        Starter posts &mdash; replace with VRishi&rsquo;s own articles.
        Wire to a CMS/markdown store at handoff.
      </div>
    </article>
  );
}
