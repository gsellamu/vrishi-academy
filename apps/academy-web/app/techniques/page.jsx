"use client";
import Link from "next/link";
/* ================================================================
   Technique Library — Kappasinian blueprint
   First-session timeline, technique groups, subsequent sessions.
   Static reference page.
   ================================================================ */

const TIMELINE = [
  { n: "1", step: "Client presents issues", mins: "10 min", w: 90 },
  { n: "2", step: "Pre-induction speech", mins: "3 min", w: 28 },
  { n: "3", step: "Theory of Mind", mins: "5 min", w: 46 },
  { n: "4", step: "Suggestibility testing (finger-spread, heavy/light, handwriting\u2026)", mins: "5 min", w: 46 },
  { n: "5", step: "Questionnaire", mins: "5 min", w: 46 },
  { n: "6", step: "Arm-raising induction (~30-min mark) with deepeners", mins: "10 min", w: 90 },
  { n: "7", step: "Progressive relaxation", mins: "5 min", w: 46 },
  { n: "8", step: "Suggestions", mins: "5 min", w: 46 },
  { n: "9", step: "Post-hypnotic suggestion to re-hypnosis", mins: "5 min", w: 46 },
  { n: "10", step: "Rebook client for the next session", mins: "\u2014", w: 10 },
];

const GROUPS = [
  {
    name: "Foundations & reference", color: "var(--iris)", note: "the spine of session one",
    items: [
      { n: "1", name: "First Session Timeline", body: "15 sequenced building blocks, intake \u2192 homework.", href: "/skill-tree" },
      { n: "2", name: "Pre-Induction Speech", body: "Dispel myths, set expectations, frame control.", href: "/room" },
      { n: "3", name: "Theory of Mind Script", body: "88/12 model drawn live and personalized to their issue.", href: "/room" },
      { n: "4", name: "Finger-Spreading Suggestibility Test", code: "101-1P", body: "Read suggestibility from the finger-spread response.", href: "/lab" },
      { n: "5", name: "PHS to Re-Hypnosis", body: "Cue + purpose + consent + speed triple + somatic tag. Re-seated after every deepener.", href: "/teleprompter" },
    ],
  },
  {
    name: "Primary inductions", color: "var(--amber)", note: "the conversion",
    items: [
      { n: "6", name: "Arm-Raising \u00B7 Emotional / Inferred", code: "101-2P", body: "Permissive, imagery-led \u2014 \u201Cyou may allow the hand to lighten\u201D.", href: "/room" },
      { n: "7", name: "Arm-Raising \u00B7 Physical / Literal", code: "101-3P", body: "Direct, declarative \u2014 \u201Cthe hand IS getting lighter\u201D.", href: "/room" },
      { n: "8", name: "Auto Dual Induction", body: "Runs both inferred and literal tracks together for blended suggestibility.", href: "/room" },
    ],
  },
  {
    name: "Deepening techniques", color: "var(--iris)", note: "also usable as secondary inductions",
    items: [
      { n: "9", name: "Progressive Relaxation", body: "Top-down wave; slowest pacing, long pauses. Usually where recording starts.", href: "/room" },
      { n: "10", name: "Staircase", body: "20\u21920 descent; ideomotor finger signals; self-image molding.", href: "/room" },
      { n: "11", name: "Reactionary", body: "Eyes open on cue, \u201Cdeep sleep\u201D to close \u2014 twice as deep, \u00D74.", href: "/lab" },
      { n: "12", name: "Heavy / Light", body: "Heavy book on one palm, helium balloons on the other \u2014 silent watch.", href: "/lab" },
      { n: "13", name: "Hand-Pressed-to-Forehead Challenge", body: "Marble bind \u2014 felt proof for physicals.", href: "/room" },
      { n: "14", name: "Arm Rigidity Challenge", body: "Steel-bar arm that will not bend \u2014 convincer.", href: "/room" },
    ],
  },
  {
    name: "Miscellaneous & secondary inductions", color: "var(--teal)", note: "session two onward",
    items: [
      { n: "15", name: "Eye Fascination", body: "Fixation-based secondary induction.", href: "/lab" },
      { n: "16", name: "Finger-Spreading Conversion", body: "The default induction after session one.", href: "/room" },
      { n: "17", name: "Guided Imagery", code: "101-4", body: "Imagery-led secondary induction.", href: "/room" },
      { n: "18", name: "Self-Hypnosis", body: "Teach the client to re-enter on their own cue.", href: "/lab" },
    ],
  },
];

const SUBSEQUENT = [
  "Open with the week review \u2014 expect onion-peeling; note keywords and body language with reflective listening.",
  "Open-ended \u2192 discovery \u2192 anchor the realization with a closed-ended yes; think ahead about the tools you\u2019ll use.",
  "Diagnostic tools as indicated: Corrective Therapy, Pendulum, Dream Therapy, Paris Window.",
  "Protect ~20 minutes for the hypnosis; induct with finger-spread (no arm-raising after session one); close with homework.",
];

export default function Techniques() {
  return (
    <article>
      <span className="eyebrow">Reference &middot; Kappasinian blueprint</span>
      <h1>Technique <em>Library</em></h1>
      <p className="note" style={{ marginBottom: 22 }}>
        Every building block of the first session and its deepeners &mdash;
        with the HMI unit code and when each applies.
        Tap any to drill it in the Lab or rehearse it in the Room.
      </p>

      {/* timeline */}
      <div style={{
        border: "1px solid var(--line)", borderRadius: 16,
        background: "var(--panel)", overflow: "hidden", marginBottom: 26,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          gap: 10, padding: "15px 18px", borderBottom: "1px solid var(--line)",
        }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".14em",
            textTransform: "uppercase", color: "var(--amber)",
          }}>First session timeline</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--teal)" }}>
            total 50&ndash;55 min
          </span>
        </div>
        {TIMELINE.map((r) => (
          <div key={r.n} style={{
            display: "grid", gridTemplateColumns: "26px 1fr auto",
            gap: 14, alignItems: "center", padding: "11px 18px",
            borderBottom: "1px solid var(--line)",
          }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--iris)" }}>{r.n}</span>
            <span style={{ fontSize: 14, color: "var(--ink)" }}>{r.step}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                display: "block", height: 6, borderRadius: 3,
                background: "var(--amber)", width: r.w,
              }} />
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--mist)",
                width: 52, textAlign: "right",
              }}>{r.mins}</span>
            </span>
          </div>
        ))}
      </div>

      {/* technique groups */}
      {GROUPS.map((g) => (
        <div key={g.name} style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".14em",
              textTransform: "uppercase", color: g.color,
            }}>{g.name}</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--dim)" }}>{g.note}</span>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {g.items.map((it) => (
              <Link key={it.n} href={it.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", gap: 13,
                  border: "1px solid var(--line)", borderLeft: `3px solid ${g.color}`,
                  borderRadius: 12, background: "var(--panel)", padding: "14px 16px",
                }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 13,
                    color: g.color, flex: "none", width: 20,
                  }}>{it.n}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ font: "340 17px/1.15 var(--display)", color: "var(--ink)" }}>{it.name}</span>
                      {it.code && (
                        <span style={{
                          fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--amber)",
                          border: "1px solid rgba(224,164,88,.4)", borderRadius: 999, padding: "1px 8px",
                        }}>{it.code}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45, marginTop: 5 }}>
                      {it.body}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* subsequent sessions */}
      <div style={{
        border: "1px solid var(--line)", borderRadius: 16,
        background: "linear-gradient(180deg, var(--raise), var(--panel))",
        padding: 22,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".14em",
          textTransform: "uppercase", color: "var(--teal)", marginBottom: 12,
        }}>Subsequent sessions</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}>
          {SUBSEQUENT.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              fontSize: 13, color: "#cfc9dd", lineHeight: 1.5,
            }}>
              <span style={{ color: "var(--teal)", flex: "none" }}>&rsaquo;</span>
              {s}
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginTop: 14,
        }}>
          Standing rule &middot; Physicals need to FEEL hypnosis (body convincers) &middot;
          Emotionals need to feel UNDERSTOOD (rapport, imagery, control).
        </div>
      </div>
    </article>
  );
}
