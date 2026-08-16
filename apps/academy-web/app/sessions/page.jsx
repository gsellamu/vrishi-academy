"use client";
/* ================================================================
   The Sessions — First-consultation overview
   Static reference: L.O.V.E. rapport, 11 Kappasinian pillars,
   session structure, subsequent-session patterns.
   ================================================================ */

const STRUCTURE = [
  "First 10\u201315 min: discuss the presenting problem and review history.",
  "Formulate a plan, explain hypnosis, and teach Theory of Mind with their issue in the model.",
  "Suggestibility testing, physical responses, arm-raising, and deepening techniques.",
  "Progressive relaxation, therapeutic suggestions, PHS, and homework \u2014 then rebook.",
];

const LOVE = [
  { k: "L", v: "Listen \u2014 actively, to their story and exact words." },
  { k: "O", v: "Observe \u2014 body language and micro-responses." },
  { k: "V", v: "Verify \u2014 reflect back to confirm understanding." },
  { k: "E", v: "Empathize \u2014 non-judgmental, trust-building presence." },
];

const PILLARS = [
  { n: "1", name: "Theory of Mind", what: "A visual model showing how change is possible through hypnotherapy.", why: "Builds hope and belief in the process.", eg: "Draw the 88/12 model against their issue." },
  { n: "2", name: "Suggestibility Testing", what: "Psychological groundwork assessing how they respond to suggestion.", why: "Sets the best hypnotic strategy.", eg: "Nonverbal tests \u2014 finger-spread, arm-raising." },
  { n: "3", name: "L.O.V.E.", what: "Listen, Observe, Verify, Empathize \u2014 the rapport framework.", why: "Ensures you truly understand and earn trust.", eg: "Reflect their language before leading." },
  { n: "4", name: "Unfiltered Awareness", what: "Understand their words from THEIR perspective, not yours.", why: "Prevents misinterpretation; keeps it non-judgmental.", eg: "Avoid imposing your own assumptions." },
  { n: "5", name: "Open & Closed Questions", what: "Open to explore; closed to anchor the realization.", why: "Draws out detail, then locks in insight.", eg: "\u201CTell me when this started?\u201D \u2192 \u201CSo the family is involved?\u201D" },
  { n: "6", name: "Kappasinian Hypnosis", what: "Tailor the process \u2014 blending logic, intuition, listening.", why: "A personalized, effective approach.", eg: "Adjust by suggestibility and need." },
  { n: "7", name: "Message Units", what: "Build mental load to prepare the critical mind.", why: "A gently overloaded critical mind is receptive.", eg: "Interleave instructions and misdirection." },
  { n: "8", name: "Preparing the Critical Mind", what: "Align their critical thinking with the therapy.", why: "They grasp problem, cause, change, and method.", eg: "The four questions: what \u00B7 why \u00B7 what changes \u00B7 how." },
  { n: "9", name: "Pillars (Supports)", what: "Cognitive and emotional supports built through awareness.", why: "Opens the critical mind to accept suggestion.", eg: "Reinforce positive beliefs, clarify goals." },
  { n: "10", name: "Thinking Ahead", what: "Plan later stages during the first session.", why: "Sets up future interventions and expectations.", eg: "Pre-frame a \u201Cspecial place\u201D for later use." },
  { n: "11", name: "Suggestions", what: "Guide them to visualize, imagine, and feel the change.", why: "Enhances the effectiveness of suggestion.", eg: "\u201CImagine feeling calm and confident where anxiety used to be.\u201D" },
];

const SUBSEQUENT = [
  "Review the prior week \u2014 onion-peeling; each week reveals the specifics more clearly.",
  "Note keywords and body language; use reflective listening so they feel heard.",
  "Lead to discovery with open-ended questions; anchor with closed-ended yes.",
  "Diagnostic tools as needed (Corrective Therapy, Pendulum, Dream, Paris Window); protect ~20 min for hypnosis; set homework.",
];

export default function Sessions() {
  return (
    <article>
      {/* ── header ──────────────────────────────────────────── */}
      <span className="eyebrow">First consultation &middot; orientation</span>
      <h1>The <em>Sessions</em></h1>
      <p className="note" style={{ marginBottom: 22 }}>
        The first session sets the foundation of therapy &mdash; building rapport,
        understanding the issue, and preparing the critical mind. It follows
        Dr.&nbsp;Kappas&rsquo; &ldquo;Pillars&rdquo; to guide hypnotic strategy
        through a structured, client-centered arc.
      </p>

      {/* ── structure + L.O.V.E. ────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.1fr .9fr",
        gap: 16,
        marginBottom: 24,
      }}>
        {/* session structure */}
        <div style={{
          border: "1px solid var(--line)",
          borderLeft: "3px solid var(--amber)",
          borderRadius: 14,
          background: "var(--panel)",
          padding: "18px 20px",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".12em",
            textTransform: "uppercase", color: "var(--amber)", marginBottom: 10,
          }}>Session structure</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {STRUCTURE.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "#cfc9dd", lineHeight: 1.45 }}>
                <span style={{ color: "var(--amber)", flex: "none" }}>&rsaquo;</span>
                {s}
              </div>
            ))}
          </div>
          <a href="/techniques" style={{
            display: "inline-block", marginTop: 12,
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)",
          }}>See the full 50-min timeline &rarr;</a>
        </div>

        {/* L.O.V.E. */}
        <div style={{
          border: "1px solid var(--line)",
          borderLeft: "3px solid var(--teal)",
          borderRadius: 14,
          background: "var(--panel)",
          padding: "18px 20px",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".12em",
            textTransform: "uppercase", color: "var(--teal)", marginBottom: 10,
          }}>Rapport &middot; the L.O.V.E. method</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {LOVE.map((l) => (
              <div key={l.k} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--teal)", flex: "none", width: 18 }}>{l.k}</span>
                <span style={{ fontSize: 13, color: "#cfc9dd", lineHeight: 1.4 }}>{l.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 11 pillars ──────────────────────────────────────── */}
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".14em",
        textTransform: "uppercase", color: "var(--iris)", marginBottom: 12,
      }}>Key pillars of the first consultation</div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 12,
        marginBottom: 26,
      }}>
        {PILLARS.map((p) => (
          <div key={p.n} style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--panel)",
            padding: "15px 17px",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", flex: "none" }}>{p.n}</span>
              <span style={{ font: "340 18px/1.15 var(--display)", color: "var(--ink)" }}>{p.name}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#cfc9dd", lineHeight: 1.45, margin: "7px 0 6px" }}>{p.what}</div>
            <div style={{ fontSize: 12, color: "var(--mist)", lineHeight: 1.4 }}>
              <span style={{ color: "var(--teal)" }}>Why &middot; </span>{p.why}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4, marginTop: 5, fontStyle: "italic" }}>
              e.g. {p.eg}
            </div>
          </div>
        ))}
      </div>

      {/* ── subsequent sessions ─────────────────────────────── */}
      <div style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
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
          gap: 13,
        }}>
          {SUBSEQUENT.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#cfc9dd", lineHeight: 1.5 }}>
              <span style={{ color: "var(--teal)", flex: "none" }}>&rsaquo;</span>
              {s}
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginTop: 14,
        }}>
          Standing rule &middot; Physicals need to FEEL hypnosis &middot; Emotionals need to feel UNDERSTOOD.
        </div>
      </div>
    </article>
  );
}
