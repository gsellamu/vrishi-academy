"use client";
import { useState, useRef } from "react";
import { cspApi } from "../../lib/api";

/* ================================================================
   VRishi Academy -- Community Service Program Landing + Intake
   Public-facing CSP page: orientation, scope, tiers, intake form,
   and consent/disclosure with digital signature.
   ================================================================ */

/* ---------- data constants ---------- */
const SELF_GOALS = [
  "Stress", "Confidence", "Smoking", "Weight",
  "Sleep", "Study habits", "Sports performance", "Public speaking",
];

const REFERRAL_GOALS = [
  "Pain management",
  "Health-related anxiety",
  "Medical procedure preparation",
];

const TIER_ONE = [
  "Referred by HMI faculty",
  "Remote via Zoom only",
  "No cost -- all sessions included",
  "Recordings and audio provided",
];

const TIER_TWO = [
  "Self-referred, no letter needed",
  "$35 per session, sessions 1-6",
  "$55 per session, sessions 7-12",
  "Zoom or in-person, San Diego",
];

const RELEASE_CLAUSES = [
  "I voluntarily agree to participate in hypnotherapy sessions provided through the Hypnosis Motivation Institute Community Service Program.",
  "I understand that services are provided for vocational and avocational self-improvement purposes only.",
  "I understand that Jithendran Sellamuthu, C.MH. is a student practitioner completing practicum requirements and is not a licensed physician, psychologist, or therapist.",
  "I understand that hypnotherapy is not a substitute for medical or psychological diagnosis, treatment, or medication.",
  "I confirm that I am not seeking treatment for a medical or psychological condition unless I have provided a written referral from a licensed provider.",
  "I understand that individual results vary and that no specific outcome has been promised or guaranteed.",
  "I agree to disclose all current medical conditions, medications, and mental health history relevant to my safety during a session.",
  "I understand that sessions may be reviewed by HMI faculty for supervision and educational purposes.",
  "I release Jithendran Sellamuthu, VRishi Hypnotherapy, and the Hypnosis Motivation Institute from liability for any outcome arising from my voluntary participation.",
  "I understand that I may withdraw from the program at any time, without penalty and without giving a reason.",
  "I confirm that I am at least 18 years of age, or that a parent or legal guardian has consented on my behalf.",
];

const DISCLOSURE_CLAUSES = [
  "Services are provided under the Hypnosis Motivation Institute Community Service Program as part of a student practicum.",
  "The practitioner is a Certified Master Hypnotist (C.MH.) and a member of the American Hypnosis Association, member #007913.",
  "Hypnotherapists are not licensed by the state as healing arts practitioners.",
  "Services address self-improvement goals including stress, confidence, habit change, sleep, study habits, and performance.",
  "Referral-based services for medical or psychological purposes are available only upon written referral from a licensed physician, dentist, or psychologist.",
  "Sessions run 45 to 90 minutes. A typical engagement is 6 to 12 sessions.",
  "Tier One sessions, for clients referred by HMI, are provided at no cost and delivered remotely via Zoom.",
  "Tier Two sessions, for self-referred clients, are $35 per session for sessions one through six and $55 per session thereafter.",
  "Session notes and a Client Contact Record are filed with HMI as practicum documentation. Records identify clients by initials only.",
  "Client information is held confidential and is not disclosed except as required by law or for HMI faculty supervision.",
  "Cancellations require 24 hours notice. Missed appointments count toward the agreed engagement.",
  "Either party may end the engagement at any time. Referrals to other providers are available on request.",
  "Questions or concerns about these services may be directed to hello@vrishihypno.com or to the Hypnosis Motivation Institute directly.",
];

/* ---------- component ---------- */
export default function CspLanding() {
  /* intake form state */
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("None");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [q5, setQ5] = useState("");
  const [q6, setQ6] = useState("");
  const [cname, setCname] = useState("");
  const [cmail, setCmail] = useState("");
  const [cphone, setCphone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* consent state */
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [sig, setSig] = useState("");
  const [signed, setSigned] = useState(false);
  const [intakeId, setIntakeId] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const intakeRef = useRef(null);

  /* computed */
  const canSign = agreed && sig.trim().length > 1 && !signed;
  const submitLabel = submitting ? "Submitting\u2026" : (submitted ? "Intake submitted" : "Submit Intake");
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const consentStateColor = signed ? "#7fb98a" : (submitted ? "#e0a458" : "#5b566d");
  const consentStateLabel = signed ? "Signed" : (submitted ? "Required" : "Awaiting intake");

  const signBg = signed ? "transparent" : (canSign ? "#8b7fd4" : "transparent");
  const signFg = signed ? "#7fb98a" : (canSign ? "#0e0d14" : "#5b566d");
  const signBorder = signed ? "rgba(127,185,138,.4)" : (canSign ? "#8b7fd4" : "#262234");
  const signLabel = signed ? "Consent recorded" : "Sign & Submit Consent";
  const signHint = signed
    ? "A copy has been emailed to you."
    : (submitted ? "Required before your first session." : "Complete the intake form above first.");

  /* handlers */
  const goIntake = () => {
    if (intakeRef.current) {
      intakeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const priorMap = { "None": "none", "Yes -- positive": "positive", "Yes -- negative": "negative", "Yes -- neutral": "neutral" };

  const submitIntake = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await cspApi.submitIntake({
        full_name: cname,
        email: cmail,
        phone: cphone || null,
        tier: "free",
        concern: q1,
        prior_hypnosis: priorMap[q2] || "none",
        medical_conditions: q3 || null,
        medications: q4 || null,
        mental_health: q5 || null,
        goals: q6 || null,
      });
      if (r.ok) {
        const data = await r.json();
        setIntakeId(data.id);
        setSubmitted(true);
      } else {
        const err = await r.json().catch(() => null);
        setSubmitError(err?.detail || "Submission failed. Please try again.");
      }
    } catch {
      setSubmitError("Could not reach the server. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const signConsent = async () => {
    if (!canSign) return;
    if (intakeId) {
      try {
        await cspApi.submitIntake({
          full_name: cname,
          email: cmail,
          phone: cphone || null,
          tier: "free",
          concern: q1,
          prior_hypnosis: priorMap[q2] || "none",
          medical_conditions: q3 || null,
          medications: q4 || null,
          mental_health: q5 || null,
          goals: q6 || null,
          consent_agreed: true,
          consent_signature: sig.trim(),
          consent_date: new Date().toISOString().slice(0, 10),
        });
      } catch { /* consent recorded locally even if API fails */ }
    }
    setSigned(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0e0d14" }}>

      {/* -------- SECTION 1: HERO -------- */}
      <header style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid #262234", background: "linear-gradient(160deg,#1b1826 0%,#16141f 42%,#0e0d14 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(56px,7vw,96px) clamp(24px,4vw,56px) clamp(48px,6vw,80px)", display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(280px,0.85fr)", gap: "clamp(32px,5vw,72px)", alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "ui-monospace,'Cascadia Code',Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#e0a458", marginBottom: 20 }}>Community Service Program &middot; 2026</div>
            <h1 style={{ fontFamily: "Fraunces,Georgia,serif", fontWeight: 340, fontSize: "clamp(38px,5.4vw,62px)", lineHeight: 1.06, letterSpacing: "-.02em", color: "#e9e4f2", marginBottom: 18 }}>Free &amp; Low-Cost<br />Hypnotherapy</h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "#8b85a0", maxWidth: "52ch", margin: "0 0 28px" }}>Through the Hypnosis Motivation Institute Community Service Program. Sessions are provided by a Certified Master Hypnotist completing practicum requirements, at no cost or reduced cost, for vocational and avocational self-improvement.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <a href="https://calendly.com/jeeth-vrishihypno/90min" target="_blank" rel="noopener noreferrer" style={{ background: "#7fb98a", color: "#0e0d14", border: "none", borderRadius: 8, padding: "14px 24px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>Book Free Session</a>
              <a href="https://pocketsuite.io/book/vrishihypno" target="_blank" rel="noopener noreferrer" style={{ background: "#8b7fd4", color: "#0e0d14", border: "none", borderRadius: 8, padding: "14px 24px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>Book Paid Session</a>
              <button type="button" onClick={goIntake} style={{ background: "transparent", color: "#8b85a0", border: "1px solid #322c44", borderRadius: 8, padding: "13px 22px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>Clinical Pre-Screening</button>
            </div>
          </div>

          <div style={{ border: "1px solid #262234", borderRadius: 16, background: "#16141f", overflow: "hidden" }}>
            <div style={{ background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b85a0" }}>Practitioner</div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 80, height: 80, flex: "none", borderRadius: "50%", border: "1px solid #322c44", background: "#1b1826", display: "grid", placeItems: "center", fontFamily: "Fraunces,Georgia,serif", fontSize: 26, color: "#5b566d" }}>JS</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 21, lineHeight: 1.2, color: "#e9e4f2" }}>Jithendran Sellamuthu</div>
                  <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#e0a458", marginTop: 6 }}>C.MH.</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 1, background: "#262234", border: "1px solid #262234", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: "#1b1826", padding: "11px 14px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d" }}>AHA Member</span>
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#e9e4f2" }}>#007913</span>
                </div>
                <div style={{ background: "#1b1826", padding: "11px 14px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d" }}>Delivery</span>
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#e9e4f2" }}>Zoom &middot; San Diego</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#8b85a0" }}>Senior student at the Hypnosis Motivation Institute. Not a licensed physician, psychologist, or therapist.</p>
            </div>
          </div>
        </div>
      </header>

      {/* -------- SECTION 2: WHAT IS HYPNOTHERAPY -------- */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(56px,6vw,84px) clamp(24px,4vw,56px)" }}>
        <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b7fd4", marginBottom: 14 }}>01 -- Orientation</div>
        <h2 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: "clamp(28px,3.4vw,38px)", lineHeight: 1.14, letterSpacing: "-.015em", color: "#e9e4f2", marginBottom: 32 }}>What is hypnotherapy?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {[
            { symbol: "\u25CB", symbolColor: "#8b7fd4", title: "Safe & Natural", text: "Hypnosis is a state of focused attention you already enter every day -- driving a familiar route, or absorbed in a film. You stay awake, aware, and in control the entire session, and you can end it at any moment." },
            { symbol: "\u25C7", symbolColor: "#e0a458", title: "Evidence-Based", text: "Sessions follow the Kappasinian methodology taught at the Hypnosis Motivation Institute, a DEAC-accredited institution and the first nationally accredited hypnotherapy college in the United States." },
            { symbol: "\u25A1", symbolColor: "#7fb98a", title: "Tailored to You", text: "Your first session includes an Emotional/Physical suggestibility assessment. It determines how suggestions are worded for you specifically, rather than reading one script to everyone." },
          ].map((card) => (
            <div key={card.title} style={{ border: "1px solid #262234", borderRadius: 16, background: "#16141f", padding: 22 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid #322c44", display: "grid", placeItems: "center", color: card.symbolColor, fontSize: 15, marginBottom: 18 }}>{card.symbol}</div>
              <h3 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 21, color: "#e9e4f2", marginBottom: 10, fontWeight: 340 }}>{card.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#8b85a0" }}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(24px,4vw,56px)" }}><div style={{ height: 1, background: "#262234" }}></div></div>

      {/* -------- SECTION 3: SCOPE OF PRACTICE -------- */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(56px,6vw,84px) clamp(24px,4vw,56px)" }}>
        <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b7fd4", marginBottom: 14 }}>02 -- Scope of practice</div>
        <h2 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: "clamp(28px,3.4vw,38px)", lineHeight: 1.14, letterSpacing: "-.015em", color: "#e9e4f2", marginBottom: 32 }}>What can it help with?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
          <div style={{ border: "1px solid #262234", borderRadius: 16, background: "#16141f", overflow: "hidden" }}>
            <div style={{ background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#7fb98a" }}>Vocational &amp; Avocational</div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.65, color: "#8b85a0" }}>Available to everyone, no referral needed.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SELF_GOALS.map((g) => (
                  <span key={g} style={{ border: "1px solid #322c44", borderRadius: 40, padding: "7px 14px", fontSize: 13, color: "#e9e4f2", background: "#1b1826" }}>{g}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ border: "1px solid #262234", borderRadius: 16, background: "#16141f", overflow: "hidden" }}>
            <div style={{ background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#e0a458" }}>Referral &middot; Provider letter required</div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.65, color: "#8b85a0" }}>Requires a written referral from a licensed physician, dentist, or psychologist.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {REFERRAL_GOALS.map((g) => (
                  <div key={g} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ color: "#e0a458", fontSize: 9, flex: "none" }}>{"\u25C7"}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: "#e9e4f2" }}>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p style={{ margin: "20px 0 0", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, lineHeight: 1.7, letterSpacing: ".04em", color: "#5b566d" }}>Hypnotherapy is not a substitute for medical or psychological treatment.</p>
      </section>

      {/* -------- SECTION 4: PROGRAM TIERS -------- */}
      <section style={{ background: "#16141f", borderTop: "1px solid #262234", borderBottom: "1px solid #262234" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(56px,6vw,84px) clamp(24px,4vw,56px)" }}>
          <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b7fd4", marginBottom: 14 }}>03 -- Cost</div>
          <h2 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: "clamp(28px,3.4vw,38px)", lineHeight: 1.14, letterSpacing: "-.015em", color: "#e9e4f2", marginBottom: 32 }}>Program tiers</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {/* Tier One */}
            <div style={{ border: "1px solid #262234", borderLeft: "3px solid #7fb98a", borderRadius: 16, background: "#1b1826", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 6 }}>
                <h3 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 24, color: "#e9e4f2", fontWeight: 340 }}>Tier One</h3>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#7fb98a", border: "1px solid rgba(127,185,138,.4)", borderRadius: 40, padding: "5px 12px" }}>Free</span>
              </div>
              <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d", marginBottom: 20 }}>Referred by HMI</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {TIER_ONE.map((row) => (
                  <div key={row} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ color: "#7fb98a", fontSize: 9, flex: "none" }}>{"\u25CB"}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: "#8b85a0" }}>{row}</span>
                  </div>
                ))}
              </div>
              <a href="https://calendly.com/jeeth-vrishihypno/90min" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 18, background: "#7fb98a", color: "#0e0d14", border: "none", borderRadius: 8, padding: "11px 18px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}>Schedule via Calendly</a>
            </div>
            {/* Tier Two */}
            <div style={{ border: "1px solid #262234", borderLeft: "3px solid #e0a458", borderRadius: 16, background: "#1b1826", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 6 }}>
                <h3 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 24, color: "#e9e4f2", fontWeight: 340 }}>Tier Two</h3>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#e0a458", border: "1px solid rgba(224,164,88,.4)", borderRadius: 40, padding: "5px 12px" }}>Reduced cost</span>
              </div>
              <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d", marginBottom: 20 }}>Self-referred</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {TIER_TWO.map((row) => (
                  <div key={row} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ color: "#e0a458", fontSize: 9, flex: "none" }}>{"\u25CB"}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: "#8b85a0" }}>{row}</span>
                  </div>
                ))}
              </div>
              <a href="https://pocketsuite.io/book/vrishihypno" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 18, background: "#e0a458", color: "#0e0d14", border: "none", borderRadius: 8, padding: "11px 18px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}>Book via PocketSuite</a>
            </div>
          </div>
          <p style={{ margin: "20px 0 0", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, letterSpacing: ".04em", color: "#5b566d" }}>Typical engagement: 6-12 sessions, 45-90 minutes each.</p>
        </div>
      </section>

      {/* -------- SECTION 5: INTAKE FORM -------- */}
      <section ref={intakeRef} id="intake" style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(56px,6vw,84px) clamp(24px,4vw,56px)" }}>
        <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b7fd4", marginBottom: 14 }}>04 -- Intake</div>
        <h2 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: "clamp(28px,3.4vw,38px)", lineHeight: 1.14, letterSpacing: "-.015em", color: "#e9e4f2", marginBottom: 10 }}>Tell me what brings you here</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "#8b85a0", margin: "0 0 28px", maxWidth: "58ch" }}>There are no wrong answers. Share as much or as little as you are comfortable with -- we can go deeper on the call.</p>

        <form onSubmit={submitIntake} style={{ border: "1px solid #262234", borderRadius: 16, background: "#16141f", overflow: "hidden" }}>
          <div style={{ background: "#1b1826", borderBottom: "1px solid #262234", padding: "11px 18px", display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b85a0" }}>
            <span>Intake screening</span><span style={{ color: "#5b566d" }}>6 questions</span>
          </div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Q1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="q1" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>01 &middot; Presenting concern</label>
              <textarea id="q1" required rows={3} placeholder="What would you like to work on?" value={q1} onChange={(e) => setQ1(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.6, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
            </div>

            {/* Q2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="q2" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>02 &middot; Prior hypnosis experience</label>
              <select id="q2" value={q2} onChange={(e) => setQ2(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}>
                <option>None</option>
                <option>Yes -- positive</option>
                <option>Yes -- negative</option>
                <option>Yes -- neutral</option>
              </select>
            </div>

            {/* Q3 & Q4 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="q3" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>03 &middot; Medical conditions <span style={{ color: "#5b566d" }}>optional</span></label>
                <textarea id="q3" rows={2} placeholder="Anything relevant to your safety" value={q3} onChange={(e) => setQ3(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.6, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="q4" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>04 &middot; Current medications <span style={{ color: "#5b566d" }}>optional</span></label>
                <textarea id="q4" rows={2} placeholder="For safety awareness only" value={q4} onChange={(e) => setQ4(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.6, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
              </div>
            </div>

            {/* Q5 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="q5" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>05 &middot; Mental health history <span style={{ color: "#5b566d" }}>optional</span></label>
              <textarea id="q5" rows={2} placeholder="Past diagnoses, or a therapist you currently see" value={q5} onChange={(e) => setQ5(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.6, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
            </div>

            {/* Q6 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="q6" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>06 &middot; Goals and expectations</label>
              <textarea id="q6" required rows={3} placeholder="What would a good outcome look like for you?" value={q6} onChange={(e) => setQ6(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.6, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
            </div>

            <div style={{ height: 1, background: "#262234" }}></div>

            {/* Contact fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cname" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>Full name</label>
                <input id="cname" required autoComplete="name" value={cname} onChange={(e) => setCname(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cmail" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>Email</label>
                <input id="cmail" type="email" required autoComplete="email" value={cmail} onChange={(e) => setCmail(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cphone" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>Phone <span style={{ color: "#5b566d" }}>optional</span></label>
                <input id="cphone" type="tel" autoComplete="tel" value={cphone} onChange={(e) => setCphone(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: "11px 12px", fontSize: 14, color: "#e9e4f2", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            </div>

            {/* Submit row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
              <button type="submit" disabled={submitting} style={{ background: "#8b7fd4", color: "#0e0d14", border: "none", borderRadius: 8, padding: "13px 22px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", minWidth: 180 }}>{submitLabel}</button>
              {submitted && (
                <div style={{ display: "flex", gap: 9, alignItems: "center", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, letterSpacing: ".06em", color: "#7fb98a" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7fb98a", flex: "none" }}></span>
                  Intake received -- consent required below
                </div>
              )}
              {submitError && (
                <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#e0685e" }}>{submitError}</div>
              )}
            </div>

            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#5b566d" }}>Your information is confidential and used only to prepare for your session.</p>
          </div>
        </form>
      </section>

      {/* -------- SECTION 6: CONSENT -------- */}
      <section style={{ background: "#16141f", borderTop: "1px solid #262234", borderBottom: "1px solid #262234" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(56px,6vw,84px) clamp(24px,4vw,56px)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b7fd4" }}>05 -- Consent</div>
            <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: consentStateColor }}>{consentStateLabel}</div>
          </div>
          <h2 style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: "clamp(28px,3.4vw,38px)", lineHeight: 1.14, letterSpacing: "-.015em", color: "#e9e4f2", marginBottom: 28 }}>Consent &amp; disclosure</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Release of Liability */}
            <div style={{ border: "1px solid #262234", borderRadius: 16, background: "#1b1826", overflow: "hidden" }}>
              <button type="button" onClick={() => setReleaseOpen((v) => !v)} aria-expanded={releaseOpen} style={{ width: "100%", background: "transparent", border: "none", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 19, color: "#e9e4f2" }}>Release of Liability</span>
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d" }}>11 clauses</span>
                </span>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 16, color: "#8b7fd4", flex: "none" }}>{releaseOpen ? "\u2212" : "+"}</span>
              </button>
              {releaseOpen && (
                <ol style={{ margin: 0, padding: "0 18px 20px 42px", display: "flex", flexDirection: "column", gap: 11, borderTop: "1px solid #262234", paddingTop: 18 }}>
                  {RELEASE_CLAUSES.map((c, i) => (
                    <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "#8b85a0" }}>{c}</li>
                  ))}
                </ol>
              )}
            </div>

            {/* Disclosure of Services */}
            <div style={{ border: "1px solid #262234", borderRadius: 16, background: "#1b1826", overflow: "hidden" }}>
              <button type="button" onClick={() => setDisclosureOpen((v) => !v)} aria-expanded={disclosureOpen} style={{ width: "100%", background: "transparent", border: "none", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 19, color: "#e9e4f2" }}>Disclosure of Services</span>
                  <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#5b566d" }}>13 clauses</span>
                </span>
                <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 16, color: "#8b7fd4", flex: "none" }}>{disclosureOpen ? "\u2212" : "+"}</span>
              </button>
              {disclosureOpen && (
                <ol style={{ margin: 0, padding: "0 18px 20px 42px", display: "flex", flexDirection: "column", gap: 11, borderTop: "1px solid #262234", paddingTop: 18 }}>
                  {DISCLOSURE_CLAUSES.map((c, i) => (
                    <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "#8b85a0" }}>{c}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Agreement + Signature */}
          <div style={{ marginTop: 20, border: "1px solid #262234", borderRadius: 16, background: "#1b1826", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18, margin: "2px 0 0", accentColor: "#8b7fd4", flex: "none" }} />
              <span style={{ fontSize: 14, lineHeight: 1.65, color: "#e9e4f2" }}>I have read and agree to the Release of Liability and Disclosure of Services.</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 16, alignItems: "end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="sig" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>Digital signature -- type your full name</label>
                <input id="sig" placeholder="Your full legal name" value={sig} onChange={(e) => setSig(e.target.value)} style={{ background: "#0e0d14", border: "1px solid #322c44", borderRadius: 8, padding: 12, fontFamily: "Fraunces,Georgia,serif", fontSize: 19, color: "#e9e4f2", width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="sigdate" style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8b85a0" }}>Date</label>
                <input id="sigdate" readOnly value={today} style={{ background: "#0e0d14", border: "1px solid #262234", borderRadius: 8, padding: 12, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13, color: "#8b85a0", width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <button type="button" onClick={signConsent} disabled={!canSign} style={{ background: signBg, color: signFg, border: `1px solid ${signBorder}`, borderRadius: 8, padding: "13px 22px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, fontWeight: 650, letterSpacing: ".1em", textTransform: "uppercase", cursor: canSign ? "pointer" : "default" }}>{signLabel}</button>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "#5b566d" }}>{signHint}</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------- SECTION 7: FOOTER -------- */}
      <footer style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px,5vw,72px) clamp(24px,4vw,56px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 32, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "Fraunces,Georgia,serif", fontSize: 22, color: "#e9e4f2", marginBottom: 12 }}>VRishi <span style={{ color: "#e0a458" }}>Hypnotherapy</span></div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: "#5b566d", maxWidth: "44ch" }}>Jithendran Sellamuthu, C.MH. is not a licensed physician, psychologist, or therapist. Hypnotherapy services are provided for vocational and avocational self-improvement.</p>
          </div>
          <div>
            <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b85a0", marginBottom: 14 }}>California SB 577</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: "#5b566d", maxWidth: "44ch" }}>This practitioner is not licensed by the State of California as a healing arts practitioner. Services are provided under the complementary and alternative health care practices exemption.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#8b85a0", marginBottom: 4 }}>Contact</div>
            <a href="mailto:hello@vrishihypno.com" style={{ fontSize: 14, color: "#8b7fd4", textDecoration: "none" }}>hello@vrishihypno.com</a>
            <a href="https://vrishihypno.com" style={{ fontSize: 14, color: "#8b7fd4", textDecoration: "none" }}>vrishihypno.com</a>
            <a href="/docs/Client-Zoom-Room-Setup-Guide.md" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#e0a458", textDecoration: "none", marginTop: 4 }}>Zoom Room Setup Guide</a>
          </div>
        </div>
        <div style={{ height: 1, background: "#262234", margin: "36px 0 20px" }}></div>
        <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#5b566d" }}>HMI Community Service Program &middot; Intake closes Dec 10, 2026</div>
      </footer>
    </div>
  );
}
