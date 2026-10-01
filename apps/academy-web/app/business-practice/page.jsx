"use client";
import { useCallback, useEffect, useState } from "react";

/* ── 12-step Director's Award checklist (new grad launch) ── */
const STEPS = [
  { id: "s1", title: "Build Your Foundation", items: [
    "Complete Practical Skills Review (PSR) with mentor",
    "Obtain AHA membership + Certified Master Hypnotist certificate",
    "Secure professional liability insurance ($1M/$3M, HMI as additional insured)",
    "Set up scheduling system (Calendly, PocketSuite, or SimplePractice)",
    "Set up payment processing (Stripe, Square, or PocketSuite)",
    "Get professional Zoom account (annual subscription)",
    "Set up professional Zoom room (camera, lighting, microphone, backdrop)",
  ]},
  { id: "s2", title: "Gain Clinical Experience", items: [
    "Complete minimum 50 client contact hours",
    "Retain at least 2 clients for 8+ sessions each",
    "Receive at least 2 written positive client reviews",
    "Document all sessions in CCH Log promptly (use client initials only)",
  ]},
  { id: "s3", title: "Continue Your Education", items: [
    "Attend at least 1 AHA conference or continuing education course",
    "Complete specialty certifications (Smoking/Vaping, Driving Anxiety, Therapeutic Imagery)",
    "Complete George's Soapbox Series 1 (24 episodes)",
    "Complete at least 6 Practice Builders episodes",
  ]},
  { id: "s4", title: "Practice What You Preach", items: [
    "6 months consistent Mental Bank activity (online or hardcopy ledger)",
    "Demonstrable lifestyle improvements (diet, sleep, exercise, substances)",
  ]},
  { id: "s5", title: "Turn Everyday Errands into Marketing", items: [
    "Professional attire suitable for health and wellness field",
    "Professional wearable name badge (Certified Master Hypnotist)",
    "Memorize elevator speech (one sentence describing your service)",
    "Confidently answer: 'Can you hypnotize me?'",
  ]},
  { id: "s6", title: "Build Mailing List and Launch", items: [
    "Create sphere-of-influence list (minimum 50 contacts)",
    "Send hardcopy introductory letter + coupon to 50 contacts",
    "Build an email list for ongoing communication",
    "Announce practice on social media + email",
  ]},
  { id: "s7", title: "Build Referral Network", items: [
    "Ask for referrals when clients see results",
    "Request Yelp or Google reviews (include in email signature)",
    "Prepare a simple referral script",
    "Send handwritten or digital thank-you notes promptly",
    "Keep master list of all clients (active and inactive)",
    "Track referral sources and nurture those relationships",
  ]},
  { id: "s8", title: "Create Professional Image", items: [
    "Professional headshot in professional attire (hi-res)",
    "Short warm video introduction of yourself and your practice",
    "Business cards or digital cards with QR code",
  ]},
  { id: "s9", title: "Create Online Presence", items: [
    "AHA Directory listing (professional biography + photo)",
    "Professional Facebook business page",
    "Google My Business listing (optional but recommended)",
  ]},
  { id: "s10", title: "Build Your Website", items: [
    "Website clearly states who you help and what results you deliver",
    "Process explained in plain language",
    "Easy scheduling for initial consultations",
    "Testimonials, FAQs, and safety-oriented language",
    "Introductory video embedded",
    "Mobile-responsive design",
  ]},
  { id: "s11", title: "Teach Free Self-Improvement Classes", items: [
    "Set up Meetup group or use local library/community center",
    "Deliver at least 2 free classes on stress reduction, sleep, or confidence",
    "Collect sign-ups and add to your mailing list",
  ]},
  { id: "s12", title: "Join Professional Networking Group", items: [
    "Join a BNI, Chamber of Commerce, or similar networking group",
    "Attend consistently for at least 3 months",
    "Deliver at least 1 presentation about hypnotherapy to the group",
  ]},
];

/* ── Pro expansion playbook ── */
const EXPANSION = [
  { title: "Scale Beyond 1-on-1", tips: [
    "Group sessions: stress reduction, weight management, smoking cessation (4-8 clients, higher revenue per hour).",
    "Seminars and workshops: partner with yoga studios, wellness centers, corporate HR departments.",
    "Retreat programs: half-day or full-day immersive experiences with progressive relaxation + guided imagery.",
  ]},
  { title: "Specialty Certifications as Revenue Streams", tips: [
    "Driving anxiety, sports performance, pain management, fertility support each command higher session rates.",
    "Stack certifications: each one opens a new referral channel from specialists in that field.",
    "Create signature programs: '6-Week Confidence Blueprint' or '90-Day Smoke-Free Protocol' packages.",
  ]},
  { title: "Referral Partnerships", tips: [
    "Medical: dentists (dental anxiety), OB/GYN (fertility, birth), pain clinics, oncology (adjunct comfort).",
    "Wellness: acupuncturists, chiropractors, massage therapists, nutritionists — mutual referral agreements.",
    "Corporate: HR directors, EAP programs, executive coaches — stress management and peak performance.",
    "Legal: attorneys handling personal injury, family law — trauma and anxiety referrals.",
  ]},
  { title: "Digital Products and Passive Income", tips: [
    "Recorded self-hypnosis sessions (sleep, confidence, relaxation) — sell on your website or platforms.",
    "Online courses: teach self-hypnosis fundamentals to consumers or NLP techniques to coaches.",
    "Guided imagery audio libraries for specific conditions (available via subscription).",
    "E-books or workbooks: '21-Day Mental Bank Journal', 'Self-Hypnosis Quick-Start Guide'.",
  ]},
  { title: "Brand Building and Authority", tips: [
    "Podcast or YouTube channel: weekly tips on mental wellness, client success stories (with consent).",
    "Guest appearances on health and wellness podcasts — position yourself as the hypnotherapy expert.",
    "Write articles for local publications, wellness blogs, or LinkedIn.",
    "Speaking at conferences, schools, community organizations.",
  ]},
  { title: "Insurance and Managed Care", tips: [
    "Research states where hypnotherapy can be billed through insurance (varies by jurisdiction).",
    "Consider becoming a preferred provider with EAP networks.",
    "Superbill templates for clients to submit to their insurance for out-of-network reimbursement.",
    "Sliding scale options to expand your client base while maintaining revenue targets.",
  ]},
];

/* ── Compliance and ethics ── */
const COMPLIANCE = [
  { title: "California Legal Framework", items: [
    "CA Business & Professions Code Section 2908: Hypnotherapy is legal for vocational and avocational self-improvement.",
    "SB 577 Disclosure: Required written disclosure that you are not a licensed physician, and that hypnotherapy is a complementary approach.",
    "Scope of practice: Vocational and avocational issues ONLY during internship. No medical, psychological, or DSM-listed conditions.",
    "After graduation with CHt credential: expanded scope per your training and insurance coverage.",
  ]},
  { title: "Advertising Guidelines", items: [
    "Never use HMI logo or name in your advertising materials.",
    "No testimonials without signed written permission on file.",
    "No broad claims or guarantees of results.",
    "No advertising for services outside vocational/avocational scope.",
    "Direct any advertising questions in writing to HMI Director.",
  ]},
  { title: "Boundary and Ethics Rules", items: [
    "No secondary relationships: do not accept relatives as clients. Friends okay in 501 for vocational/avocational only.",
    "No socializing, dating, or befriending clients outside the therapeutic relationship.",
    "Protect client confidentiality at all times — do not discuss cases where they could be overheard.",
    "Gifts: small gifts may be accepted graciously; discuss the meaning in therapy. Never give gifts to clients.",
    "Communications outside session: keep to scheduling only. All therapeutic work happens in the session hour.",
  ]},
  { title: "Parental Consent", items: [
    "All clients under 18: parent must sign consent BEFORE any session or suggestibility testing.",
    "Therapist must meet the parent at least once and witness signing.",
    "Under 12: meet parent briefly every other session minimum.",
    "Divorced parents: verify full legal custody before proceeding.",
  ]},
  { title: "Duty to Inform and Report", items: [
    "Mandatory reporter: report known or suspected child abuse to child protective agency immediately by phone, written report within 36 hours.",
    "Duty to protect: if client poses harm to self or others, follow legal protocol.",
    "Critical clinical decisions: get second opinion from HMI Director BEFORE acting (child abuse reporting, duty to inform, out of scope, suicidal potential).",
  ]},
  { title: "Therapeutic Exclusions", items: [
    "Do NOT see clients on anti-depressants, anti-psychotics, or anti-anxiety medications.",
    "Do NOT see clients with significant psychiatric history or suicidal ideation.",
    "Refer to appropriate licensed professionals and document the referral.",
  ]},
];

const STOR_KEY = "bpm:checks";
function loadChecks() { try { return JSON.parse(localStorage.getItem(STOR_KEY) || "{}"); } catch { return {}; } }

export default function BusinessPractice() {
  const [checks, setChecks] = useState({});
  const [tab, setTab] = useState("launch");
  useEffect(() => { setChecks(loadChecks()); }, []);
  const toggle = useCallback((key) => {
    setChecks((c) => {
      const next = { ...c, [key]: !c[key] };
      localStorage.setItem(STOR_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const totalItems = STEPS.reduce((s, st) => s + st.items.length, 0);
  const doneItems = STEPS.reduce((s, st) => s + st.items.filter((_, i) => checks[`${st.id}:${i}`]).length, 0);
  const pct = totalItems ? Math.round((100 * doneItems) / totalItems) : 0;

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Business Practice Management</span>
          <h1 style={{ margin: "8px 0 0" }}>Build Your <em>Practice</em></h1>
        </div>
        <div className="seg">
          <button type="button" className={tab === "launch" ? "on" : ""} onClick={() => setTab("launch")}>New Grad</button>
          <button type="button" className={tab === "expand" ? "on" : ""} onClick={() => setTab("expand")}>Pro Expand</button>
          <button type="button" className={tab === "ethics" ? "on" : ""} onClick={() => setTab("ethics")}>Compliance</button>
        </div>
      </div>

      {/* ═══════ NEW GRAD LAUNCH ═══════ */}
      {tab === "launch" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 960 }}>
          <div className="info-bar">
            <div><div className="info-label" style={{ color: "var(--teal)" }}>What</div><div className="info-text">The 12-step Director's Award path — from PSR to self-sustaining practice.</div></div>
            <div><div className="info-label" style={{ color: "var(--iris)" }}>Why</div><div className="info-text">200+ grads have built full practices following this exact sequence. You will too.</div></div>
            <div><div className="info-label" style={{ color: "var(--amber)" }}>Goal</div><div className="info-text">25-40 clients/week, self-sustaining via referrals, within 12-18 months.</div></div>
            <div><div className="info-label" style={{ color: "var(--ok)" }}>Cost</div><div className="info-text">Estimated $2,230 total investment across all 12 steps (as low as $1,100).</div></div>
          </div>

          {/* Progress bar */}
          <div className="panel" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--amber)" }}>
                Director's Award Progress
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: pct >= 100 ? "var(--ok)" : "var(--amber)" }}>
                {doneItems}/{totalItems} — {pct}%
              </span>
            </div>
            <div className="progress"><span style={{ width: `${pct}%`, background: pct >= 100 ? "var(--ok)" : undefined }} /></div>
          </div>

          {/* 12 Steps */}
          {STEPS.map((step, si) => {
            const stepDone = step.items.filter((_, i) => checks[`${step.id}:${i}`]).length;
            const complete = stepDone === step.items.length;
            return (
              <div key={step.id} className="panel" style={{ padding: "18px 22px", borderLeft: complete ? "3px solid var(--ok)" : "3px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ font: "560 15px var(--body)", color: complete ? "var(--ok)" : "var(--amber)" }}>
                    Step {si + 1}: {step.title}
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: complete ? "var(--ok)" : "var(--mist)" }}>
                    {stepDone}/{step.items.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {step.items.map((item, i) => {
                    const key = `${step.id}:${i}`;
                    const on = !!checks[key];
                    return (
                      <button key={i} className={`checkchip${on ? " on" : ""}`} style={{ textAlign: "left", justifyContent: "flex-start" }}
                        onClick={() => toggle(key)}>
                        {on ? "\u2713 " : ""}{item}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ PRO EXPANSION ═══════ */}
      {tab === "expand" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 960 }}>
          <div className="info-bar">
            <div><div className="info-label" style={{ color: "var(--teal)" }}>Who</div><div className="info-text">Established hypnotherapists ready to scale beyond 1-on-1 sessions.</div></div>
            <div><div className="info-label" style={{ color: "var(--iris)" }}>Why</div><div className="info-text">Diversify revenue, build authority, and create a practice that grows without you in every session.</div></div>
            <div><div className="info-label" style={{ color: "var(--amber)" }}>How</div><div className="info-text">Six proven expansion vectors — from groups and specialties to digital products and partnerships.</div></div>
            <div><div className="info-label" style={{ color: "var(--ok)" }}>Result</div><div className="info-text">Multiple revenue streams, referral partnerships, and passive income from digital assets.</div></div>
          </div>

          {EXPANSION.map((section, i) => (
            <div key={i} className="panel" style={{ padding: "18px 22px" }}>
              <div style={{ font: "560 15px var(--body)", color: "var(--iris)", marginBottom: 12 }}>{section.title}</div>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {section.tips.map((tip, j) => (
                  <li key={j} style={{ fontSize: 14, lineHeight: 1.65, color: "#cfc9dd" }}>{tip}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ COMPLIANCE & ETHICS ═══════ */}
      {tab === "ethics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 960 }}>
          <div className="info-bar">
            <div><div className="info-label" style={{ color: "var(--red)" }}>Scope</div><div className="info-text">CA B&P 2908 — vocational and avocational self-improvement only during internship.</div></div>
            <div><div className="info-label" style={{ color: "var(--amber)" }}>Disclosure</div><div className="info-text">SB 577 — written disclosure required before first session with every client.</div></div>
            <div><div className="info-label" style={{ color: "var(--iris)" }}>Ethics</div><div className="info-text">APA ethical guidelines + HMI policies — no secondary relationships, protect confidentiality.</div></div>
            <div><div className="info-label" style={{ color: "var(--ok)" }}>Safety</div><div className="info-text">Mandatory reporting, duty to protect, therapeutic exclusions — know these before your first client.</div></div>
          </div>

          {COMPLIANCE.map((section, i) => (
            <div key={i} className="panel" style={{ padding: "18px 22px", borderLeft: "3px solid var(--red)" }}>
              <div style={{ font: "560 15px var(--body)", color: "var(--amber)", marginBottom: 12 }}>{section.title}</div>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 14, lineHeight: 1.65, color: "#cfc9dd" }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
