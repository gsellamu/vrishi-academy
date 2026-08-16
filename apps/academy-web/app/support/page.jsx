"use client";
/* ================================================================
   Support & Providers — supervision, referral, crisis, business, platform
   Static directory page.
   ================================================================ */

const GROUPS = [
  {
    label: "Supervision & mentorship", color: "var(--amber)",
    rows: [
      { type: "mentor", title: "Clinical supervisor", desc: "Case review, sign-off on real reps, and difficult-session debriefs.", cta: "contact" },
      { type: "peer", title: "Mentor / accountability", desc: "A senior practitioner to shadow and consult.", cta: "contact" },
      { type: "slot", title: "Add a provider", desc: "Name, service, contact, and when to use them.", cta: "add" },
    ],
  },
  {
    label: "Certifying & professional bodies", color: "var(--iris)",
    rows: [
      { type: "body", title: "Certification board", desc: "HMI / AHA / ACHE \u2014 credentialing, ethics, and CE requirements.", cta: "open" },
      { type: "assoc", title: "Professional association", desc: "Membership, liability insurance, and directory listing.", cta: "open" },
      { type: "slot", title: "Add a provider", desc: "Name, service, contact, and when to use them.", cta: "add" },
    ],
  },
  {
    label: "Referral & crisis (clinical)", color: "var(--red)",
    rows: [
      { type: "crisis", title: "988 Suicide & Crisis Lifeline (US)", desc: "Call or text 988, 24/7. Route any client in crisis here immediately.", cta: "call 988" },
      { type: "referral", title: "Licensed clinician network", desc: "Physicians, psychologists, psychiatrists for out-of-scope referral.", cta: "add" },
      { type: "referral", title: "Local emergency services", desc: "Your region\u2019s emergency number and nearest crisis center.", cta: "add" },
    ],
  },
  {
    label: "Business & practice services", color: "var(--teal)",
    rows: [
      { type: "legal", title: "Legal & insurance", desc: "Practice liability, consent forms, and business registration.", cta: "add" },
      { type: "ops", title: "Booking / payments / CRM", desc: "Scheduling, invoicing, and client-record tooling.", cta: "add" },
      { type: "brand", title: "Marketing & web", desc: "Site, branding, and content help for the practice.", cta: "add" },
    ],
  },
  {
    label: "Technical & platform support", color: "var(--ok)",
    rows: [
      { type: "help", title: "Academy platform support", desc: "Bug reports, feature requests, and account help.", cta: "contact" },
      { type: "api", title: "Integration services", desc: "ElevenLabs (TTS), HeyGen/Simli (avatar), LiveKit, LMS/SSO.", cta: "open" },
      { type: "slot", title: "Add a provider", desc: "Name, service, contact, and when to use them.", cta: "add" },
    ],
  },
];

export default function Support() {
  return (
    <article>
      <span className="eyebrow">Get help &middot; refer out</span>
      <h1>Support &amp; <em>providers</em></h1>
      <p className="note" style={{ marginBottom: 8 }}>
        Supervision, certifying bodies, business services, platform help &mdash;
        and the referral &amp; crisis lines you route to when a client needs more
        than hypnotherapy.
      </p>

      {/* what / why / how / value */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 1, background: "var(--line)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden", margin: "18px 0 4px",
      }}>
        {[
          { k: "What", c: "var(--teal)", t: "People & services outside the app you rely on." },
          { k: "Why", c: "var(--iris)", t: "You can\u2019t do it alone \u2014 supervise, certify, refer." },
          { k: "How", c: "var(--amber)", t: "Keep contacts ready; know your scope and exits." },
          { k: "Value", c: "var(--ok)", t: "Safer clients, credible practice, no dead ends." },
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

      {/* safety callout */}
      <div style={{
        marginTop: 20,
        border: "1px solid rgba(224,104,94,.4)",
        borderLeft: "3px solid var(--red)",
        borderRadius: 12,
        background: "rgba(224,104,94,.06)",
        padding: "15px 18px",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".12em",
          textTransform: "uppercase", color: "var(--red)", marginBottom: 6,
        }}>Scope &amp; safety first</div>
        <div style={{ fontSize: 13.5, color: "#e6dcda", lineHeight: 1.55 }}>
          Hypnotherapy is not a substitute for licensed medical or mental-health care.
          If a client is in crisis or presents beyond your scope, stop and refer.
          In the US, the <strong style={{ color: "var(--ink)" }}>988 Suicide &amp; Crisis Lifeline</strong> (call/text 988)
          is available 24/7; for emergencies, direct to local emergency services.
          Add your regional lines below.
        </div>
      </div>

      <div style={{
        fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)",
        border: "1px dashed var(--line-2)", borderRadius: 8,
        padding: "9px 13px", margin: "14px 0 4px",
      }}>
        Starter directory &mdash; replace placeholder rows with your own vetted providers.
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
                  textTransform: "uppercase", color: r.type === "crisis" ? "var(--red)" : "var(--iris)",
                  border: `1px solid ${r.type === "crisis" ? "rgba(224,104,94,.4)" : "var(--line-2)"}`,
                  borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap",
                  flex: "none", marginTop: 2,
                }}>{r.type}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14.5, color: "var(--ink)" }}>{r.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--mist)", lineHeight: 1.5 }}>{r.desc}</div>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 12,
                  color: r.cta === "add" ? "var(--amber)" : r.cta.startsWith("call") ? "var(--red)" : "var(--iris)",
                  flex: "none", marginTop: 3, whiteSpace: "nowrap",
                }}>{r.cta === "add" ? "add" : r.cta.startsWith("call") ? r.cta : `${r.cta} \u2197`}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}
