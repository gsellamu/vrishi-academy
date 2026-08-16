"use client";
import { useState } from "react";
import Link from "next/link";

const BACKGROUNDS = [
  "Analytical professional",
  "Creative / artist",
  "Caregiver",
  "Athlete",
  "Student",
  "Executive",
];

const ISSUES = [
  "Presentation anxiety",
  "Sleep / insomnia",
  "Smoking cessation",
  "Sports performance",
  "Confidence / self-image",
  "Pain comfort adjunct",
];

const AGE_BANDS = ["Child", "Teen", "Adult", "Elder"];
const RESISTANCE_LEVELS = ["compliant", "realistic", "difficult"];

function archetype(physical) {
  const emotional = 100 - physical;
  if (physical >= 62) return "The Analyst \u00b7 literal lexicon";
  if (emotional >= 62) return "The Dreamer \u00b7 inferred lexicon";
  return "Blended \u00b7 mixed lexicon";
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function inductionText(physical) {
  if (physical >= 50)
    return 'Arm-raising, literal \u2014 "the hand IS getting lighter".';
  return 'Arm-raising, permissive \u2014 "you may allow the hand to grow lighter".';
}

function deepenerText(age, physical) {
  if (age === "Child") return "Gentle slide + pillows";
  if (age === "Teen") return "Standard staircase";
  if (age === "Elder") return "Garden path";
  // Adult
  if (physical >= 50)
    return "Hand-to-forehead + arm-rigidity";
  return "Heavy/light inference then staircase";
}

function lexiconText(physical) {
  if (physical >= 50)
    return "it IS \u00b7 feel it now \u00b7 rigid \u00b7 concrete, present-tense";
  return "allow \u00b7 you may notice \u00b7 a sense of control \u00b7 imagine";
}

export default function PersonaBuilder() {
  const [name, setName] = useState("Marcus Vale");
  const [goal, setGoal] = useState("Vocational");
  const [age, setAge] = useState("Adult");
  const [background, setBackground] = useState("Analytical professional");
  const [issue, setIssue] = useState("Presentation anxiety");
  const [ep, setEp] = useState(68);
  const [resistance, setResistance] = useState("realistic");

  const physical = ep;
  const emotional = 100 - ep;
  const arch = archetype(physical);

  return (
    <article>
      {/* ---------- HEADER ---------- */}
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow">Pro tools &middot; custom client</span>
        <h1 style={{ margin: "8px 0 0" }}>
          Persona <em>Builder</em>
        </h1>
      </div>

      {/* ---------- WHAT / WHY / HOW / VALUE ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          {
            h: "What",
            t: "Compose a client \u2014 age, background, presenting issue, suggestibility, resistance.",
          },
          {
            h: "Why",
            t: "Rehearse this week\u2019s real client, not just the two built-in personas.",
          },
          {
            h: "How",
            t: "Set the traits; the preview updates archetype, lexicon and deepeners. Then send to Room or Studio.",
          },
          {
            h: "Value",
            t: "Reps that match the caseload you actually see \u2014 the difference a veteran feels.",
          },
        ].map(({ h, t }) => (
          <div
            key={h}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--iris)",
                marginBottom: 6,
              }}
            >
              {h}
            </div>
            <div style={{ fontSize: 13, color: "var(--mist)", lineHeight: 1.55 }}>
              {t}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- TWO-COLUMN LAYOUT ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* ========== LEFT: FORM ========== */}
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            padding: "26px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Row 1: Name + Goal */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--mist)",
              }}
            >
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-sm, 6px)",
                  padding: "10px 12px",
                  color: "var(--ink)",
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--mist)",
              }}
            >
              Goal
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-sm, 6px)",
                  padding: "10px 12px",
                  color: "var(--ink)",
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="Vocational">Vocational</option>
                <option value="Avocational">Avocational</option>
                <option value="Referral (gated)">Referral (gated)</option>
              </select>
            </label>
          </div>

          {/* Row 2: Age band segmented */}
          <div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--mist)",
                marginBottom: 8,
              }}
            >
              Age band
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {AGE_BANDS.map((band) => {
                const selected = band === age;
                return (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setAge(band)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: selected ? "var(--panel-2)" : "transparent",
                      border: selected
                        ? "1.5px solid var(--iris)"
                        : "1px solid var(--line-2)",
                      color: selected ? "var(--amber)" : "var(--mist)",
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      fontWeight: selected ? 600 : 400,
                      cursor: "pointer",
                      borderRadius:
                        band === AGE_BANDS[0]
                          ? "var(--r-sm, 6px) 0 0 var(--r-sm, 6px)"
                          : band === AGE_BANDS[AGE_BANDS.length - 1]
                          ? "0 var(--r-sm, 6px) var(--r-sm, 6px) 0"
                          : "0",
                      marginLeft: band === AGE_BANDS[0] ? 0 : -1,
                      position: "relative",
                      zIndex: selected ? 1 : 0,
                      transition: "all .15s ease",
                    }}
                  >
                    {band}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Background + Presenting issue */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--mist)",
              }}
            >
              Background
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-sm, 6px)",
                  padding: "10px 12px",
                  color: "var(--ink)",
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {BACKGROUNDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--mist)",
              }}
            >
              Presenting issue
              <select
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-sm, 6px)",
                  padding: "10px 12px",
                  color: "var(--ink)",
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {ISSUES.map((iss) => (
                  <option key={iss} value={iss}>
                    {iss}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Row 4: E/P slider */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                }}
              >
                {emotional}% Emotional
              </span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--amber)",
                }}
              >
                {physical}% Physical
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={ep}
              onChange={(e) => setEp(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--amber)" }}
            />
            <div
              style={{
                fontSize: 11,
                color: "var(--dim)",
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              suggestibility blend &middot; sets induction wording &amp; deepeners
            </div>
          </div>

          {/* Row 5: Resistance segmented */}
          <div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--mist)",
                marginBottom: 8,
              }}
            >
              Resistance
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {RESISTANCE_LEVELS.map((level) => {
                const selected = level === resistance;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setResistance(level)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: selected ? "var(--panel-2)" : "transparent",
                      border: selected
                        ? "1.5px solid var(--iris)"
                        : "1px solid var(--line-2)",
                      color: selected ? "var(--amber)" : "var(--mist)",
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      fontWeight: selected ? 600 : 400,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      borderRadius:
                        level === RESISTANCE_LEVELS[0]
                          ? "var(--r-sm, 6px) 0 0 var(--r-sm, 6px)"
                          : level === RESISTANCE_LEVELS[RESISTANCE_LEVELS.length - 1]
                          ? "0 var(--r-sm, 6px) var(--r-sm, 6px) 0"
                          : "0",
                      marginLeft: level === RESISTANCE_LEVELS[0] ? 0 : -1,
                      position: "relative",
                      zIndex: selected ? 1 : 0,
                      transition: "all .15s ease",
                    }}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========== RIGHT: PREVIEW SIDEBAR ========== */}
        <div
          style={{
            position: "sticky",
            top: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Preview card */}
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--panel) 0%, var(--panel-2) 100%)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: "24px 22px",
            }}
          >
            {/* Avatar + name */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--iris), var(--teal))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--void)",
                  letterSpacing: ".04em",
                  flexShrink: 0,
                }}
              >
                {initials(name || "?")}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {name || "Unnamed"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: ".08em",
                    color: "var(--iris)",
                    marginTop: 3,
                  }}
                >
                  {arch}
                </div>
              </div>
            </div>

            {/* Summary text */}
            <div
              style={{
                fontSize: 13,
                color: "var(--mist)",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {background} presenting with {issue.toLowerCase()}.{" "}
              {physical >= 50
                ? `${physical}% physical suggestibility \u2014 responds to literal, direct suggestions.`
                : `${emotional}% emotional suggestibility \u2014 responds to inferred, permissive suggestions.`}
            </div>

            {/* E/P progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  height: 8,
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "var(--void)",
                }}
              >
                <div
                  style={{
                    width: `${emotional}%`,
                    background: "var(--teal)",
                    transition: "width .2s ease",
                  }}
                />
                <div
                  style={{
                    width: `${physical}%`,
                    background: "var(--amber)",
                    transition: "width .2s ease",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: "var(--teal)" }}>E {emotional}%</span>
                <span style={{ color: "var(--amber)" }}>P {physical}%</span>
              </div>
            </div>

            {/* Tag chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  letterSpacing: ".06em",
                  background:
                    physical >= 62
                      ? "color-mix(in srgb, var(--amber) 18%, transparent)"
                      : emotional >= 62
                      ? "color-mix(in srgb, var(--teal) 18%, transparent)"
                      : "color-mix(in srgb, var(--iris) 18%, transparent)",
                  color:
                    physical >= 62
                      ? "var(--amber)"
                      : emotional >= 62
                      ? "var(--teal)"
                      : "var(--iris)",
                  border: `1px solid ${
                    physical >= 62
                      ? "var(--amber)"
                      : emotional >= 62
                      ? "var(--teal)"
                      : "var(--iris)"
                  }`,
                }}
              >
                {physical >= 62 ? "Physical" : emotional >= 62 ? "Emotional" : "Blended"}{" "}
                {physical >= 62 ? physical : emotional >= 62 ? emotional : 50}%
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  letterSpacing: ".06em",
                  background: "color-mix(in srgb, var(--mist) 12%, transparent)",
                  color: "var(--mist)",
                  border: "1px solid var(--line-2)",
                  textTransform: "capitalize",
                }}
              >
                {resistance}
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  letterSpacing: ".06em",
                  background: "color-mix(in srgb, var(--mist) 12%, transparent)",
                  color: "var(--mist)",
                  border: "1px solid var(--line-2)",
                }}
              >
                {age}
              </span>
            </div>
          </div>

          {/* Recommended approach card */}
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: "20px 22px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--iris)",
                marginBottom: 14,
              }}
            >
              Recommended approach
            </div>

            {[
              { label: "Induction", value: inductionText(physical) },
              { label: "Deepeners", value: deepenerText(age, physical) },
              { label: "Lexicon", value: lexiconText(physical) },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "var(--dim)",
                    marginBottom: 3,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--mist)",
                    lineHeight: 1.55,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/room"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 0",
                borderRadius: "var(--r-md)",
                background: "var(--amber)",
                color: "var(--void)",
                fontFamily: "var(--body)",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                border: "none",
                cursor: "pointer",
                transition: "opacity .15s ease",
              }}
            >
              Rehearse in Room
            </Link>
            <Link
              href="/studio"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 0",
                borderRadius: "var(--r-md)",
                background: "transparent",
                color: "var(--iris)",
                fontFamily: "var(--body)",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                border: "1.5px solid var(--iris)",
                cursor: "pointer",
                transition: "opacity .15s ease",
              }}
            >
              Role-play
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
