"use client";
import { useState } from "react";
import { cspApi } from "../../../lib/api";

/* ================================================================
   VRishi Academy -- CSP Intake Flow
   7-step wizard: Concern, History, Health, Meds, Mental Health,
   Goals, Consent + confirmation screen.
   ================================================================ */

/* ---------- data arrays (outside component) ---------- */

const STEP_LABELS = [
  "Concern",
  "History",
  "Health",
  "Meds",
  "Mental Health",
  "Goals",
  "Consent",
];

const PRIOR_OPTIONS = [
  {
    key: "first",
    label: "No, this is my first time",
    sub: "Most clients start here. Nothing about it is strange or uncomfortable.",
  },
  {
    key: "pos",
    label: "Yes, and it was positive",
    sub: "Good \u2014 we can build on what already worked for you.",
  },
  {
    key: "neu",
    label: "Yes, and it was neutral",
    sub: "We\u2019ll look at what was missing and adjust the approach.",
  },
  {
    key: "neg",
    label: "Yes, and it was negative",
    sub: "That\u2019s okay \u2014 every practitioner is different.",
  },
];

const CONDITION_CHIPS = [
  "Chronic pain",
  "Migraines",
  "High blood pressure",
  "Diabetes",
  "Autoimmune",
  "Other",
];

const TIER_OPTIONS = [
  {
    key: "free",
    label: "I was referred by HMI",
    sub: "Free \u00B7 Zoom only",
    edge: "#7fb98a",
    subColor: "#7fb98a",
  },
  {
    key: "paid",
    label: "I found this myself",
    sub: "Reduced cost \u00B7 $35 then $55",
    edge: "#e0a458",
    subColor: "#e0a458",
  },
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

const EXPECT_ITEMS = [
  "Your first session runs 60 to 90 minutes.",
  "It starts with a conversation \u2014 no surprise trance.",
  "You stay in control the entire time and can stop whenever you want.",
];

/* ---------- style helpers ---------- */

const mono =
  "ui-monospace, 'Cascadia Code', Menlo, monospace";
const serif = "Fraunces, Georgia, serif";

const toggleTrack = (on) => ({
  track: on ? "#e0a458" : "#322c44",
  thumb: on ? "#0e0d14" : "#8b85a0",
  justify: on ? "flex-end" : "flex-start",
});

const inputStyle = {
  background: "#0e0d14",
  border: "1px solid #322c44",
  borderRadius: 8,
  padding: 12,
  fontSize: 15,
  color: "#e9e4f2",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  lineHeight: 1.7,
  minHeight: 120,
};

const eyebrowStyle = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#8b7fd4",
  marginBottom: 16,
};

const headingStyle = {
  fontFamily: serif,
  fontSize: "clamp(30px, 4.4vw, 44px)",
  lineHeight: 1.12,
  letterSpacing: "-.02em",
  color: "#e9e4f2",
  fontWeight: 340,
  margin: 0,
};

const subStyle = {
  fontSize: 16,
  lineHeight: 1.7,
  color: "#8b85a0",
  margin: 0,
  maxWidth: "56ch",
};

const toggleBtnStyle = {
  width: "100%",
  background: "#16141f",
  border: "1px solid #262234",
  borderRadius: 12,
  padding: "15px 18px",
  cursor: "pointer",
  display: "flex",
  gap: 16,
  alignItems: "center",
  justifyContent: "space-between",
  textAlign: "left",
};

const labelSmall = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "#8b85a0",
};

/* ---------- component ---------- */

export default function CSPIntake() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  /* Step 1 */
  const [concern, setConcern] = useState("");

  /* Step 2 */
  const [prior, setPrior] = useState(null);
  const [priorMore, setPriorMore] = useState("");

  /* Step 3 */
  const [noConditions, setNoConditions] = useState(false);
  const [chips, setChips] = useState([]);
  const [conditionNotes, setConditionNotes] = useState("");

  /* Step 4 */
  const [noMeds, setNoMeds] = useState(false);
  const [medsNotes, setMedsNotes] = useState("");

  /* Step 5 */
  const [noMH, setNoMH] = useState(false);
  const [seeingProvider, setSeeingProvider] = useState(false);
  const [mhNotes, setMhNotes] = useState("");
  const [providerName, setProviderName] = useState("");

  /* Step 6 */
  const [goals, setGoals] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState(null);

  /* Step 7 */
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [sig, setSig] = useState("");

  /* ---------- computed ---------- */

  const progressPct =
    done ? "100%" : Math.round((step / 7) * 100) + "%";
  const stepCounter = done ? "Complete" : `Step ${step} of 7`;

  const steps = STEP_LABELS.map((label, i) => {
    const n = i + 1;
    const state = done
      ? "done"
      : n < step
        ? "done"
        : n === step
          ? "now"
          : "todo";
    return {
      n: String(n),
      label,
      color:
        state === "now"
          ? "#e9e4f2"
          : state === "done"
            ? "#8b85a0"
            : "#5b566d",
      dot:
        state === "done"
          ? "#7fb98a"
          : state === "now"
            ? "#8b7fd4"
            : "#262234",
    };
  });

  const showPriorMore =
    prior === "pos" || prior === "neu" || prior === "neg";

  const condSw = toggleTrack(noConditions);
  const medsSw = toggleTrack(noMeds);
  const mhSw = toggleTrack(noMH);
  const provSw = toggleTrack(seeingProvider);

  const nameOut = fullName.trim()
    ? fullName.trim().split(" ")[0]
    : sig.trim().split(" ")[0] || "friend";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* ---------- nav ---------- */

  const goNext = async () => {
    if (step < 7) {
      setStep(step + 1);
      setSubmitError(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!(agreed && sig.trim().length > 1)) {
      setSubmitError(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(false);
    const priorMap = { first: "none", pos: "positive", neu: "neutral", neg: "negative" };
    try {
      const r = await cspApi.submitIntake({
        full_name: fullName,
        email,
        phone: phone || null,
        tier: tier === "paid" ? "paid" : "free",
        concern,
        prior_hypnosis: priorMap[prior] || "none",
        prior_detail: priorMore || null,
        medical_conditions: noConditions ? null : ([...chips, conditionNotes].filter(Boolean).join("; ") || null),
        medications: noMeds ? null : (medsNotes || null),
        mental_health: noMH ? null : (mhNotes || null),
        seeing_provider: seeingProvider,
        provider_name: seeingProvider ? (providerName || null) : null,
        goals: goals || null,
        consent_agreed: agreed,
        consent_signature: sig.trim(),
        consent_date: new Date().toISOString().slice(0, 10),
      });
      if (r.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const err = await r.json().catch(() => null);
        setSubmitError(err?.detail || true);
      }
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setSubmitError(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const nextLabel = submitting
    ? "Submitting\u2026"
    : step === 7
      ? "Submit"
      : "Next \u2192";

  /* ---------- chip toggle ---------- */

  const toggleChip = (label) => {
    setChips((prev) =>
      prev.includes(label)
        ? prev.filter((x) => x !== label)
        : [...prev, label]
    );
  };

  /* ---------- toggle-switch render helper ---------- */

  const ToggleSwitch = ({ sw }) => (
    <span
      style={{
        width: 44,
        height: 24,
        borderRadius: 40,
        background: sw.track,
        flex: "none",
        padding: 3,
        boxSizing: "border-box",
        display: "flex",
        justifyContent: sw.justify,
        transition: "background .18s ease",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: sw.thumb,
        }}
      />
    </span>
  );

  /* ---------- radio button render helper ---------- */

  const RadioOption = ({ o, selected, onPick }) => {
    const bg = selected ? "#211d2e" : "#16141f";
    const border = selected ? "#8b7fd4" : "#262234";
    const ring = selected ? "#8b7fd4" : "#322c44";
    const fill = selected ? "#8b7fd4" : "transparent";

    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onPick}
        style={{
          textAlign: "left",
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: "16px 18px",
          cursor: "pointer",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          transition: "border-color .16s ease, background .16s ease",
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: `1px solid ${ring}`,
            flex: "none",
            marginTop: 3,
            display: "grid",
            placeItems: "center",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: fill,
            }}
          />
        </span>
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 15.5, color: "#e9e4f2" }}>
            {o.label}
          </span>
          <span
            style={{ fontSize: 13.5, lineHeight: 1.6, color: "#8b85a0" }}
          >
            {o.sub}
          </span>
        </span>
      </button>
    );
  };

  return (
    <article>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes cspFade {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: none; }
            }
            @keyframes cspRing {
              from { transform: scale(.86); opacity: 0; }
              to   { transform: none; opacity: 1; }
            }
          `,
        }}
      />

      {/* ---- STICKY HEADER: step indicator ---- */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "rgba(14,13,20,.94)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #262234",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "20px clamp(20px,4vw,40px) 0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: serif,
                fontSize: 18,
                color: "#e9e4f2",
              }}
            >
              VRishi{" "}
              <span style={{ color: "#e0a458" }}>Hypnotherapy</span>
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "#5b566d",
              }}
            >
              {stepCounter}
            </div>
          </div>

          {/* progress bar */}
          <div
            style={{
              height: 4,
              borderRadius: 40,
              background: "#0e0d14",
              border: "1px solid #262234",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: progressPct,
                background: "#8b7fd4",
                borderRadius: 40,
                transition:
                  "width .4s cubic-bezier(.16,1,.3,1)",
              }}
            />
          </div>

          {/* step dots */}
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "12px 0 14px",
              overflowX: "auto",
            }}
          >
            {steps.map((st) => (
              <div
                key={st.n}
                style={{
                  display: "flex",
                  gap: 7,
                  alignItems: "center",
                  flex: "none",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: st.dot,
                    flex: "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: st.color,
                  }}
                >
                  {st.n} {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---- MAIN CONTENT ---- */}
      <div
        style={{
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
          padding:
            "clamp(36px,6vw,72px) clamp(20px,4vw,40px) 40px",
          boxSizing: "border-box",
        }}
      >
        {/* STEP 1: Concern */}
        {!done && step === 1 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>Step 01 &middot; Concern</div>
            <h1 style={{ ...headingStyle, marginBottom: 14 }}>
              What brings you to hypnotherapy?
            </h1>
            <p style={{ ...subStyle, marginBottom: 28 }}>
              There are no wrong answers &mdash; share as much or as
              little as you&apos;re comfortable with.
            </p>
            <textarea
              rows={5}
              placeholder="I'd like to work on..."
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              style={textareaStyle}
            />
          </div>
        )}

        {/* STEP 2: History */}
        {!done && step === 2 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>
              Step 02 &middot; History
            </div>
            <h1 style={{ ...headingStyle, marginBottom: 28 }}>
              Have you experienced hypnosis before?
            </h1>
            <div
              role="radiogroup"
              aria-label="Prior hypnosis experience"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {PRIOR_OPTIONS.map((o) => (
                <RadioOption
                  key={o.key}
                  o={o}
                  selected={prior === o.key}
                  onPick={() => setPrior(o.key)}
                />
              ))}
            </div>
            {showPriorMore && (
              <div
                style={{
                  marginTop: 22,
                  animation: "cspFade .4s ease both",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="priormore" style={labelSmall}>
                  Tell us more about your experience
                </label>
                <textarea
                  id="priormore"
                  rows={3}
                  placeholder="What was it for, and how did it go?"
                  value={priorMore}
                  onChange={(e) => setPriorMore(e.target.value)}
                  style={{
                    ...inputStyle,
                    lineHeight: 1.7,
                    minHeight: undefined,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Health */}
        {!done && step === 3 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>Step 03 &middot; Health</div>
            <h1 style={{ ...headingStyle, marginBottom: 14 }}>
              Do you have any current medical conditions?
            </h1>
            <p style={{ ...subStyle, marginBottom: 26 }}>
              This helps us tailor your session safely. All
              information is confidential.
            </p>

            <button
              type="button"
              role="switch"
              aria-checked={noConditions}
              onClick={() => setNoConditions(!noConditions)}
              style={toggleBtnStyle}
            >
              <span style={{ fontSize: 15, color: "#e9e4f2" }}>
                No current conditions
              </span>
              <ToggleSwitch sw={condSw} />
            </button>

            {!noConditions && (
              <div
                style={{
                  marginTop: 22,
                  animation: "cspFade .4s ease both",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <span style={labelSmall}>
                    Common conditions &mdash; tap to add
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {CONDITION_CHIPS.map((label) => {
                      const on = chips.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleChip(label)}
                          style={{
                            border: `1px solid ${on ? "#8b7fd4" : "#322c44"}`,
                            background: on ? "#8b7fd4" : "#16141f",
                            color: on ? "#0e0d14" : "#e9e4f2",
                            borderRadius: 40,
                            padding: "8px 15px",
                            fontSize: 13.5,
                            cursor: "pointer",
                            transition: "all .16s ease",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <label htmlFor="cond" style={labelSmall}>
                    Anything else we should know
                  </label>
                  <textarea
                    id="cond"
                    rows={3}
                    placeholder="Conditions, injuries, recent procedures"
                    value={conditionNotes}
                    onChange={(e) =>
                      setConditionNotes(e.target.value)
                    }
                    style={{
                      ...inputStyle,
                      lineHeight: 1.7,
                      minHeight: undefined,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Meds */}
        {!done && step === 4 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>Step 04 &middot; Meds</div>
            <h1 style={{ ...headingStyle, marginBottom: 14 }}>
              Are you currently taking any medications?
            </h1>
            <p style={{ ...subStyle, marginBottom: 26 }}>
              We don&apos;t change medications &mdash; this is for
              safety awareness only.
            </p>

            <button
              type="button"
              role="switch"
              aria-checked={noMeds}
              onClick={() => setNoMeds(!noMeds)}
              style={toggleBtnStyle}
            >
              <span style={{ fontSize: 15, color: "#e9e4f2" }}>
                No current medications
              </span>
              <ToggleSwitch sw={medsSw} />
            </button>

            {!noMeds && (
              <div
                style={{
                  marginTop: 22,
                  animation: "cspFade .4s ease both",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="meds" style={labelSmall}>
                  Current medications
                </label>
                <textarea
                  id="meds"
                  rows={3}
                  placeholder="Name and what it's for \u2014 dosages are not needed"
                  value={medsNotes}
                  onChange={(e) => setMedsNotes(e.target.value)}
                  style={{
                    ...inputStyle,
                    lineHeight: 1.7,
                    minHeight: undefined,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Mental Health */}
        {!done && step === 5 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>
              Step 05 &middot; Mental health
            </div>
            <h1 style={{ ...headingStyle, marginBottom: 14 }}>
              Mental health background
            </h1>
            <p
              style={{
                ...subStyle,
                marginBottom: 26,
                maxWidth: "60ch",
              }}
            >
              Have you ever been diagnosed with a mental health
              condition, or are you currently seeing a therapist or
              psychiatrist? Anything you share stays between us.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <button
                type="button"
                role="switch"
                aria-checked={noMH}
                onClick={() => setNoMH(!noMH)}
                style={toggleBtnStyle}
              >
                <span style={{ fontSize: 15, color: "#e9e4f2" }}>
                  No mental health history
                </span>
                <ToggleSwitch sw={mhSw} />
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={seeingProvider}
                onClick={() =>
                  setSeeingProvider(!seeingProvider)
                }
                style={toggleBtnStyle}
              >
                <span style={{ fontSize: 15, color: "#e9e4f2" }}>
                  I&apos;m currently seeing a therapist or
                  psychiatrist
                </span>
                <ToggleSwitch sw={provSw} />
              </button>
            </div>

            {!noMH && (
              <div
                style={{
                  marginTop: 22,
                  animation: "cspFade .4s ease both",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="mh" style={labelSmall}>
                  Mental health history{" "}
                  <span style={{ color: "#5b566d" }}>
                    optional
                  </span>
                </label>
                <textarea
                  id="mh"
                  rows={3}
                  placeholder="Past or current diagnoses, and how they affect you day to day"
                  value={mhNotes}
                  onChange={(e) => setMhNotes(e.target.value)}
                  style={{
                    ...inputStyle,
                    lineHeight: 1.7,
                    minHeight: undefined,
                  }}
                />
              </div>
            )}

            {seeingProvider && (
              <div
                style={{
                  marginTop: 18,
                  animation: "cspFade .4s ease both",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="prov" style={labelSmall}>
                  Provider name
                </label>
                <input
                  id="prov"
                  placeholder="Dr. ..."
                  value={providerName}
                  onChange={(e) =>
                    setProviderName(e.target.value)
                  }
                  style={inputStyle}
                />
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "#5b566d",
                  }}
                >
                  A referral letter may be needed if your goal is
                  medical or psychological.
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Goals */}
        {!done && step === 6 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>Step 06 &middot; Goals</div>
            <h1 style={{ ...headingStyle, marginBottom: 24 }}>
              What would you like to achieve?
            </h1>
            <textarea
              rows={4}
              placeholder="If this worked, what would be different in three months?"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              style={{
                ...inputStyle,
                lineHeight: 1.7,
                minHeight: undefined,
              }}
            />

            <div
              style={{
                height: 1,
                background: "#262234",
                margin: "32px 0",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="wname" style={labelSmall}>
                  Full name
                </label>
                <input
                  id="wname"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="wmail" style={labelSmall}>
                  Email
                </label>
                <input
                  id="wmail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label htmlFor="wphone" style={labelSmall}>
                  Phone{" "}
                  <span style={{ color: "#5b566d" }}>
                    optional
                  </span>
                </label>
                <input
                  id="wphone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 28,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span style={labelSmall}>Program tier</span>
              <div
                role="radiogroup"
                aria-label="Program tier"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 10,
                }}
              >
                {TIER_OPTIONS.map((t) => {
                  const selected = tier === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTier(t.key)}
                      style={{
                        textAlign: "left",
                        background: selected
                          ? "#211d2e"
                          : "#16141f",
                        border: `1px solid ${selected ? "#8b7fd4" : "#262234"}`,
                        borderLeft: `3px solid ${t.edge}`,
                        borderRadius: 12,
                        padding: "16px 18px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "all .16s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          color: "#e9e4f2",
                        }}
                      >
                        {t.label}
                      </span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 11,
                          letterSpacing: ".06em",
                          color: t.subColor,
                        }}
                      >
                        {t.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Consent */}
        {!done && step === 7 && (
          <div
            style={{
              animation:
                "cspFade .5s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <div style={eyebrowStyle}>
              Step 07 &middot; Consent
            </div>
            <h1 style={{ ...headingStyle, marginBottom: 14 }}>
              Review and consent
            </h1>
            <p style={{ ...subStyle, marginBottom: 26 }}>
              Both documents below are the same ones you&apos;d
              sign in person. Read them, then sign with your name.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Release of Liability */}
              <div
                style={{
                  border: "1px solid #262234",
                  borderRadius: 16,
                  background: "#16141f",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setReleaseOpen(!releaseOpen)}
                  aria-expanded={releaseOpen}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: serif,
                        fontSize: 19,
                        color: "#e9e4f2",
                        fontWeight: 340,
                      }}
                    >
                      Release of Liability
                    </span>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 10,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color: "#5b566d",
                      }}
                    >
                      11 clauses
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 16,
                      color: "#8b7fd4",
                      flex: "none",
                    }}
                  >
                    {releaseOpen ? "\u2212" : "+"}
                  </span>
                </button>
                {releaseOpen && (
                  <ol
                    style={{
                      margin: 0,
                      padding: "18px 18px 20px 42px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 11,
                      borderTop: "1px solid #262234",
                    }}
                  >
                    {RELEASE_CLAUSES.map((c, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          color: "#8b85a0",
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Disclosure of Services */}
              <div
                style={{
                  border: "1px solid #262234",
                  borderRadius: 16,
                  background: "#16141f",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDisclosureOpen(!disclosureOpen)
                  }
                  aria-expanded={disclosureOpen}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: serif,
                        fontSize: 19,
                        color: "#e9e4f2",
                        fontWeight: 340,
                      }}
                    >
                      Disclosure of Services
                    </span>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 10,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color: "#5b566d",
                      }}
                    >
                      13 clauses
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 16,
                      color: "#8b7fd4",
                      flex: "none",
                    }}
                  >
                    {disclosureOpen ? "\u2212" : "+"}
                  </span>
                </button>
                {disclosureOpen && (
                  <ol
                    style={{
                      margin: 0,
                      padding: "18px 18px 20px 42px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 11,
                      borderTop: "1px solid #262234",
                    }}
                  >
                    {DISCLOSURE_CLAUSES.map((c, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          color: "#8b85a0",
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Agreement + signature */}
            <div
              style={{
                marginTop: 20,
                border: "1px solid #262234",
                borderRadius: 16,
                background: "#16141f",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setSubmitError(false);
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    margin: "2px 0 0",
                    accentColor: "#8b7fd4",
                    flex: "none",
                  }}
                />
                <span
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.65,
                    color: "#e9e4f2",
                  }}
                >
                  I have read and agree to both documents.
                </span>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <label htmlFor="wsig" style={labelSmall}>
                    Digital signature
                  </label>
                  <input
                    id="wsig"
                    placeholder="Type your full name"
                    value={sig}
                    onChange={(e) => {
                      setSig(e.target.value);
                      setSubmitError(false);
                    }}
                    style={{
                      ...inputStyle,
                      fontFamily: serif,
                      fontSize: 19,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <label htmlFor="wdate" style={labelSmall}>
                    Date
                  </label>
                  <input
                    id="wdate"
                    readOnly
                    value={today}
                    style={{
                      ...inputStyle,
                      border: "1px solid #262234",
                      fontFamily: mono,
                      fontSize: 13,
                      color: "#8b85a0",
                    }}
                  />
                </div>
              </div>

              {submitError && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    border: "1px solid rgba(224,104,94,.4)",
                    borderRadius: 8,
                    background: "rgba(224,104,94,.08)",
                    padding: "11px 14px",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#e0685e",
                      flex: "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13.5,
                      color: "#e0685e",
                    }}
                  >
                    Check the agreement box and type your name to
                    sign.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONFIRMATION */}
        {done && (
          <div
            style={{
              animation:
                "cspFade .6s cubic-bezier(.16,1,.3,1) both",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 28px",
                borderRadius: "50%",
                border: "1px solid rgba(127,185,138,.4)",
                background: "rgba(127,185,138,.08)",
                display: "grid",
                placeItems: "center",
                color: "#7fb98a",
                fontSize: 26,
                animation:
                  "cspRing .6s cubic-bezier(.16,1,.3,1) both",
              }}
            >
              &#x2713;
            </div>
            <h1 style={{ ...headingStyle, marginBottom: 14 }}>
              Thank you, {nameOut}
            </h1>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "#8b85a0",
                margin: "0 auto 36px",
                maxWidth: "48ch",
              }}
            >
              Your intake has been received. We&apos;ll reach out
              within 48 hours to schedule your first session.
            </p>

            <div
              style={{
                border: "1px solid #262234",
                borderRadius: 16,
                background: "#16141f",
                overflow: "hidden",
                textAlign: "left",
                maxWidth: 520,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  background: "#1b1826",
                  borderBottom: "1px solid #262234",
                  padding: "11px 18px",
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#8b85a0",
                }}
              >
                What to expect
              </div>
              <div
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 13,
                }}
              >
                {EXPECT_ITEMS.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      style={{
                        color: "#8b7fd4",
                        fontSize: 9,
                        flex: "none",
                      }}
                    >
                      &#x25C7;
                    </span>
                    <span
                      style={{
                        fontSize: 14.5,
                        lineHeight: 1.65,
                        color: "#8b85a0",
                      }}
                    >
                      {e}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p
              style={{
                margin: "28px 0 0",
                fontSize: 14,
                color: "#5b566d",
              }}
            >
              Questions?{" "}
              <a
                href="mailto:hello@vrishihypno.com"
                style={{
                  color: "#8b7fd4",
                  textDecoration: "none",
                }}
              >
                hello@vrishihypno.com
              </a>
            </p>
          </div>
        )}
      </div>

      {/* ---- FOOTER NAV ---- */}
      {!done && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "rgba(14,13,20,.94)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid #262234",
          }}
        >
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              padding: "16px clamp(20px,4vw,40px)",
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={goBack}
              style={{
                visibility:
                  step === 1 ? "hidden" : "visible",
                background: "transparent",
                color: "#8b85a0",
                border: "1px solid #262234",
                borderRadius: 8,
                padding: "13px 20px",
                fontFamily: mono,
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              &#x2190; Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              style={{
                background: "#8b7fd4",
                color: "#0e0d14",
                border: "none",
                borderRadius: 8,
                padding: "13px 26px",
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 650,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
                minWidth: 150,
                transition:
                  "transform .16s ease, box-shadow .16s ease",
              }}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
