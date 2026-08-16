"use client";
/* ================================================================
   Resources Library — curated study material and peer communities
   Static directory page.
   ================================================================ */

const GROUPS = [
  {
    label: "Books & core texts", color: "var(--amber)",
    rows: [
      { type: "book", title: "Foundational hypnotherapy texts", desc: "Kappasinian theory, suggestibility, and first-session structure.", cta: "open" },
      { type: "book", title: "NLP & conversational hypnosis", desc: "Language patterns, pacing/leading, and embedded suggestion.", cta: "open" },
      { type: "slot", title: "Add a resource", desc: "Title, author/source, and a one-line why.", cta: "add" },
    ],
  },
  {
    label: "Articles & research", color: "var(--teal)",
    rows: [
      { type: "paper", title: "Clinical evidence & journals", desc: "Peer-reviewed studies on hypnosis for pain, anxiety, habits.", cta: "open" },
      { type: "guide", title: "Technique write-ups", desc: "Deep-dives on inductions, deepeners, and challenges.", cta: "open" },
      { type: "slot", title: "Add a resource", desc: "Title, author/source, and a one-line why.", cta: "add" },
    ],
  },
  {
    label: "Communities & chat groups", color: "var(--iris)",
    rows: [
      { type: "forum", title: "Practitioner forums & Discords", desc: "Ask questions, share cases, get feedback between sessions.", cta: "join" },
      { type: "group", title: "Study & accountability pod", desc: "A small group holding the Dec-10 PSR timeline together.", cta: "join" },
      { type: "slot", title: "Add a resource", desc: "Title, author/source, and a one-line why.", cta: "add" },
    ],
  },
  {
    label: "Tools & downloads", color: "var(--ok)",
    rows: [
      { type: "tool", title: "Script & intake templates", desc: "Reusable forms, consent, and session scaffolds.", cta: "download" },
      { type: "audio", title: "Sample session audio", desc: "Reference recordings for pacing and tonality.", cta: "open" },
      { type: "slot", title: "Add a resource", desc: "Title, author/source, and a one-line why.", cta: "add" },
    ],
  },
];

export default function Resources() {
  return (
    <article>
      <span className="eyebrow">Study &amp; community</span>
      <h1>Resources <em>library</em></h1>
      <p className="note" style={{ marginBottom: 8 }}>
        Books, articles &amp; research, communities and chat groups, and tools &mdash;
        the material you learn from and the people you learn with.
      </p>

      {/* what / why / how / value */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", margin: "18px 0 4px",
      }}>
        {[
          { k: "What", c: "var(--teal)", t: "Curated study material and peer communities." },
          { k: "Why", c: "var(--iris)", t: "Deepen theory beyond the drills; never practice alone." },
          { k: "How", c: "var(--amber)", t: "Read, save to your queue, join a group, ask questions." },
          { k: "Value", c: "var(--ok)", t: "Faster mastery, fewer blind spots, real accountability." },
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

      <div style={{
        fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)",
        border: "1px dashed var(--line-2)", borderRadius: 8,
        padding: "9px 13px", margin: "14px 0 4px",
      }}>
        Starter directory &mdash; replace placeholder rows with your own vetted resources.
        Rows marked <span style={{ color: "var(--amber)" }}>add</span> are empty slots.
      </div>

      {GROUPS.map((g) => (
        <div key={g.label} style={{ marginTop: 24 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".14em",
            textTransform: "uppercase", color: g.color, marginBottom: 10,
          }}>{g.label}</div>
          <div style={{
            border: "1px solid var(--line)", borderRadius: 14,
            background: "var(--panel)", padding: "4px 18px",
          }}>
            {g.rows.map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: 13, alignItems: "flex-start",
                padding: "13px 0", borderBottom: "1px solid var(--line)",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".08em",
                  textTransform: "uppercase", color: "var(--iris)",
                  border: "1px solid var(--line-2)", borderRadius: 5,
                  padding: "3px 8px", whiteSpace: "nowrap", flex: "none", marginTop: 2,
                }}>{r.type}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14.5, color: "var(--ink)" }}>{r.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--mist)", lineHeight: 1.5 }}>{r.desc}</div>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 12,
                  color: r.cta === "add" ? "var(--amber)" : "var(--iris)",
                  flex: "none", marginTop: 3, whiteSpace: "nowrap",
                }}>{r.cta === "add" ? "add" : `${r.cta} \u2197`}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}
