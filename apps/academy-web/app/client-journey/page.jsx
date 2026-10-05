"use client";
import { useCallback, useEffect, useState } from "react";
import { cspApi, journeyApi } from "../../lib/api";
import { useAcademy } from "../../lib/academy-store";
import Link from "next/link";

const STOR = "cj:data";
const STATUS_COLORS = { active: "var(--ok)", scheduled: "var(--amber)", completed: "var(--iris)", paused: "var(--mist)", graduated: "#7fb8d4" };
const STATUS_OPTS = ["active", "scheduled", "completed", "paused", "graduated"];
const PROGRESS_OPTS = ["improving", "same", "worse", "significant improvement"];

const PRACTITIONER = {
  name: "Jithendran Sellamuthu, C.MH.",
  credentials: "Certified Master Hypnotist, AHA #007913",
  practice: "VRishi Hypnotherapy",
  phone: "",
  email: "jeeth@vrishihypno.com",
  address: "Virtual (Zoom)",
  license: "CA B&P 2908 — Vocational/Avocational Self-Improvement",
};

/* Generate healthcare-standard After Visit Summary with SMART goals, treatment plan, disclaimers */
function openAVS(client, session, practitioner) {
  const w = window.open("", "_blank", "width=800,height=1000,scrollbars=yes,resizable=yes");
  if (!w) return;
  const isFirst = session.num === 1;
  const hwItems = ["4-7-8 breathing", "Tension-release", "Settling practice", "Dream journal", "Screen cutoff", "Time-boxing", "Session recording", "Sleep tracking"];
  const hwDone = session.homeworkDone || [];
  const hwRows = hwItems.map(h => `<tr><td>${h}</td><td>Daily</td><td style="text-align:center">${hwDone.includes(h) ? '<b style="color:#2d6a4f">YES</b>' : '<span style="color:#999">--</span>'}</td></tr>`).join("\n");

  w.document.write(`<!DOCTYPE html><html><head><title>AVS - ${client.name} - Session ${session.num}</title>
<style>
*{box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:28px 36px 60px;color:#222;font-size:12px;line-height:1.5}
.hdr{border-bottom:2px solid #1a1a2e;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between}
.logo{font-size:18px;font-weight:700;color:#1a1a2e}
.cred{font-size:10px;color:#555;margin-top:2px}
.rt{font-size:9px;color:#666;text-align:right;line-height:1.4}
.vbar{background:#f0f4f8;border-radius:6px;padding:12px 16px;margin-bottom:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.vbar .vl{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888}
.vbar .vv{font-size:12px;font-weight:600;color:#1a1a2e}
h2{font-size:12px;font-weight:700;margin:16px 0 5px;color:#1a1a2e;border-bottom:1px solid #e0e0e0;padding-bottom:2px;text-transform:uppercase;letter-spacing:.05em}
.f{margin:2px 0;font-size:11px}.fl{font-weight:600;color:#555;display:inline-block;min-width:120px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:11px}
th{background:#f0f4f8;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:2px solid #ddd}
td{padding:4px 8px;border-bottom:1px solid #eee}
.met{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}
.met>div{background:#f8f9fa;padding:8px;border-radius:5px;text-align:center;border:1px solid #e8e8e8}
.met .mv{font-size:18px;font-weight:700;color:#1a1a2e}
.met .ml{font-size:8px;text-transform:uppercase;color:#888;margin-top:1px}
ul{margin:3px 0;padding-left:16px}li{margin:1px 0;font-size:11px}
.disc{margin-top:20px;padding:10px 12px;background:#fdf6e3;border:1px solid #e8d8a0;border-radius:4px;font-size:9px;color:#555;line-height:1.4}
.disc b{color:#444}
.sig{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px}
.sig>div{border-top:1px solid #999;padding-top:3px;font-size:9px;color:#888}
.ft{margin-top:12px;padding-top:8px;border-top:1px solid #e0e0e0;font-size:7px;color:#aaa;text-align:center}
@media print{body{padding:14px 18px;font-size:10px}.disc{break-inside:avoid}}
</style></head><body>

<div class="hdr">
<div><div class="logo">${practitioner.practice}</div>
<div class="cred">${practitioner.name}<br>${practitioner.credentials}</div></div>
<div class="rt">${practitioner.address}<br>${practitioner.email}<br>calendly.com/jeeth-vrishihypno/90min<br>${practitioner.license}</div>
</div>

<div class="vbar">
<div><div class="vl">Client</div><div class="vv">${client.name}</div></div>
<div><div class="vl">Date</div><div class="vv">${session.date}</div></div>
<div><div class="vl">Visit Type</div><div class="vv">${isFirst ? "Initial Consultation" : "Follow-Up"} (#${session.num})</div></div>
<div><div class="vl">Modality</div><div class="vv">Zoom (Virtual)</div></div>
<div><div class="vl">Suggestibility</div><div class="vv">${client.ep}</div></div>
<div><div class="vl">Duration</div><div class="vv">~60 min</div></div>
</div>

<h2>Issues Addressed</h2>
<div class="f">${client.presenting}</div>
${session.soap_assessment ? `<div class="f" style="margin-top:4px"><span class="fl">Assessment:</span> ${session.soap_assessment}</div>` : ""}

<h2>Session Metrics (Client-Reported Baseline)</h2>
<div class="met">
<div><div class="mv">${session.sleepScore || "\u2014"}/10</div><div class="ml">Sleep Quality (subjective)</div></div>
<div><div class="mv">21%</div><div class="ml">Deep+REM combined*</div></div>
<div><div class="mv">79%</div><div class="ml">Light Sleep</div></div>
<div><div class="mv">Bad</div><div class="ml">Tracker Depth Score</div></div>
</div>
<div class="f" style="color:#888;font-size:9px">*Client's tracker combines Deep (N3) and REM into one category. Actual N3 delta percentage is unknown from this data. Tracker data is for client's personal reference \u2014 therapy outcomes are measured through subjective experience and clinical observation.</div>

<h2>Techniques Used</h2>
<div class="f">${session.techniques || "N/A"}</div>

<h2>Post-Hypnotic Suggestions ${isFirst ? "(Pending \u2014 Installation in Session 2)" : "Installed (Session 2)"}</h2>
${isFirst ? '<div class="f" style="color:#888">Session 1 was cognitive assessment + first induction experience. The post-hypnotic suggestions below are scheduled for installation in Session 2 (The Installation Session), where each will be systematically anchored in deep trance with ideomotor confirmation.</div>' : ''}
<ul>
<li><b>1. Sorting Room:</b> Subconscious processing team (Face Gallery, Language Wing, Map Room) files daily data silently during delta sleep</li>
<li><b>2. Depth Dial:</b> Surface (8 Hz) \u2192 Shallow \u2192 Medium \u2192 Deep \u2192 DELTA LOCK (0.5 Hz) \u2014 permanently installed, turns to DELTA LOCK every night</li>
<li><b>3. Delta Floor:</b> Brain bypasses light sleep directly to delta within 30 minutes. 3-hour uninterrupted deep sleep lock.</li>
<li><b>4. Settling Pond:</b> Day's impressions settle like gold dust in still water \u2014 gravity does the work</li>
<li><b>5. Island Cabin:</b> Permanent healing sanctuary \u2014 cedar, ocean air, weighted blanket, cellular regeneration</li>
<li><b>6. Pillow Trigger:</b> Head on pillow + 4-7-8 breathing = Depth Dial auto-turns to DELTA LOCK. 4 breaths to sleep.</li>
<li><b>7. Night-Waking Reset:</b> Hand on chest + one 4-7-8 breath = Depth Dial resets to DELTA LOCK. Back to delta in 60 seconds.</li>
<li><b>8. 10:30 PM Time Anchor:</b> Nervous system begins shutdown sequence automatically at 10:30 every night</li>
<li><b>9. Venting Dream Activation:</b> Vivid dreams = system clearing backlog. Remembering dreams = proof hypnosis is working.</li>
<li><b>10. Tracker as Convincer:</b> Each morning, rising deep sleep % reinforces the programming. Positive feedback loop.</li>
</ul>

<h2>Treatment Plan</h2>
<div class="f"><span class="fl">Sessions:</span> 6-8 (6 core + 2 contingency, reassessed at session 4)</div>
<div class="f"><span class="fl">Frequency:</span> Every 1-2 weeks</div>
<div class="f"><span class="fl">Approach:</span> Clinical hypnotherapy, Physical suggestible lane (direct/literal), progress-driven with subjective + clinical measures</div>
<div class="f"><span class="fl">Session 1:</span> Assessment + Education + First Induction Experience</div>
<div class="f"><span class="fl">Session 2:</span> THE INSTALLATION \u2014 10 post-hypnotic suggestions anchored in deep trance with ideomotor checks</div>
<div class="f"><span class="fl">Session 3:</span> Maintenance + Reinforcement (Depth Anchor Chain, Processing Vault, Auto-Pilot)</div>
<div class="f"><span class="fl">Session 4:</span> Independence Pivot \u2014 self-hypnosis taught, client runs ceremony alone</div>
<div class="f"><span class="fl">Sessions 5-6:</span> Fine-tuning based on data / Graduation</div>
<div class="f"><span class="fl">Sessions 7-8:</span> Contingency (only if data requires)</div>

<table><tr><th>#</th><th>Focus</th><th>Key Target</th><th>Status</th></tr>
<tr><td>1</td><td>Assessment + Installation</td><td>Baseline</td><td>${session.num >= 1 ? "Done" : "Upcoming"}</td></tr>
<tr><td>2</td><td>The Installation</td><td>10 PHS anchored</td><td>${session.num >= 2 ? "Done" : "Upcoming"}</td></tr>
<tr><td>3</td><td>Maintenance + overactive mind</td><td>Night-waking ease</td><td>Upcoming</td></tr>
<tr><td>4</td><td>Self-hypnosis independence</td><td>Self-directed</td><td>Upcoming</td></tr>
<tr><td>5</td><td>Fine-tuning</td><td>Effortless onset</td><td>Upcoming</td></tr>
<tr><td>6</td><td>Graduation</td><td>All goals met</td><td>Upcoming</td></tr>
</table>

<h2>Progress Indicators</h2>
<table><tr><th>How We Measure</th><th>Where You Started</th><th>What Improvement Looks Like</th></tr>
<tr><td>How you feel waking up</td><td>4/10 (exhausted)</td><td>7-8/10 (refreshed, rested)</td></tr>
<tr><td>Falling asleep</td><td>Difficult (~35 min)</td><td>Natural, effortless</td></tr>
<tr><td>Night-waking</td><td>Frequent, hard to return</td><td>Rare, returns easily</td></tr>
<tr><td>Daytime energy</td><td>Low, persistent fatigue</td><td>Consistent throughout day</td></tr>
<tr><td>Ceremony compliance</td><td>Starting</td><td>Effortless habit</td></tr>
<tr><td>Self-hypnosis confidence</td><td>Not yet learned</td><td>8+/10 (fully independent)</td></tr>
</table>
<div class="f" style="color:#888;font-size:9px">Progress is measured through your subjective experience and clinical observation. If you use a personal sleep tracker, that data is for your own awareness \u2014 therapy outcomes are not determined by device readings.</div>

<h2>Client Responsibilities</h2>
<div class="f" style="margin-bottom:6px">Treatment outcomes depend on daily home practice between sessions.</div>
<table><tr><th>Nightly Sleep Ceremony (10:30 PM)</th><th>Freq</th><th>Done</th></tr>
${hwRows}
</table>
<ul>
<li>Attend all scheduled sessions (reschedule with 24-hour notice)</li>
<li>Bring sleep tracker data to each session (weekly trends)</li>
<li>Maintain consistent bedtime within 30-minute window (10:30 PM)</li>
<li>No alcohol as sleep aid (disrupts deep sleep architecture)</li>
<li>Report new symptoms, medication changes, or concerns promptly</li>
</ul>

${session.feedback ? `<h2>Client-Reported Outcomes</h2><div class="f">${session.feedback}</div>` : ""}

<h2>Next Steps</h2>
<div class="f"><span class="fl">Next Session:</span> ${session.plan || client.nextPlan || "To be scheduled"}</div>
<div class="f"><span class="fl">Schedule at:</span> <a href="https://calendly.com/jeeth-vrishihypno/90min">calendly.com/jeeth-vrishihypno/90min</a></div>
<div class="f" style="margin-top:6px;color:#666">If sleep deteriorates significantly, you experience persistent anxiety, panic, or suicidal thoughts, or develop new physical symptoms \u2014 contact your primary care physician immediately.</div>

<div class="disc">
<b>SB 577 Disclosure:</b> ${practitioner.name} is not a licensed physician, psychologist, or psychiatrist. Services are provided for vocational/avocational self-improvement under CA B&P Code \u00a72908. Not a substitute for medical/psychological treatment.<br><br>
<b>No Guarantee of Outcomes:</b> While clinical research supports hypnotherapy for sleep improvement (Cordi 2014, Chamine 2018, Lam 2015), individual results vary based on suggestibility, compliance, and health. ${practitioner.practice} does not guarantee specific outcomes, cure rates, or timelines. SMART goals are research-based targets, not promises.<br><br>
<b>Therapeutic Exclusions:</b> Clients on anti-depressant, anti-psychotic, or anti-anxiety medications, or with psychiatric history/suicidal ideation, must be referred to licensed mental health professionals.<br><br>
<b>Liability:</b> Professional liability coverage maintained. Details available upon request.<br><br>
<b>Confidentiality:</b> All information kept confidential per HIPAA Privacy Rule (45 CFR \u00a7\u00a7160, 164) and CA law, except where disclosure required by law.
</div>

<div class="sig">
<div>Client Signature / Date</div>
<div>Therapist: ${practitioner.name} / Date</div>
</div>

<div class="ft">
${practitioner.practice} | ${practitioner.name} | ${practitioner.credentials} | ${practitioner.email}<br>
PHI \u2014 Handle per HIPAA. Do not share or store on unsecured devices.<br>
Generated: ${new Date().toLocaleString()} | ID: AVS-${client.id}-S${session.num}-${session.date}
</div>
</body></html>`);
  w.document.close();
}

/* Seed data for Deepak (first real client) */
const SEED_CLIENTS = [
  {
    id: "DS-001",
    name: "Deepak S.",
    initials: "DS",
    age: 56,
    occupation: "Principal Engineer (EE/CS)",
    ep: "76% Physical",
    vak: "Kinesthetic",
    presenting: "Disturbed sleep — sleeping longer but not well",
    caseRef: "SLEEP-004",
    status: "active",
    startDate: "2026-10-01",
    sessions: [
      {
        num: 1,
        date: "2026-10-01",
        status: "completed",
        techniques: "Eagle arm-raise, trophy staircase, cellular regeneration progressive, island cabin, Sorting Room, Depth Dial, Settling Pond",
        notes: "First session. 36-question suggestibility test: highly Physical. Theory of Mind with reptile brain + RAM/hardwired. Neuroscience deep dive (oscillations, glymphatic, DMA, synaptic homeostasis). Kappas 3-stage dream pipeline. 4-7-8 breathing anchor taught. Sleep ceremony homework assigned. Venting dream suggestions planted.",
        sleepScore: 4,
        homeworkDone: ["4-7-8 breathing"],
        dreamJournal: "",
        feedback: "Post-session (Oct 2, 6:12 AM): 'After the session, I went to bed immediately. It took me awhile to fall asleep. But once fell asleep, I got up just once to use the bathroom. Sleep started at 11 pm and woke up at 7:33 am.' Reports losing 1 kg overnight (unsure if related). ECG showed resting heart rate dropped from usual 72 bpm to 63 bpm the morning after. Historical baseline was 57 bpm. Asks how many sessions the program requires — notes tendency to 'lose or get fatigue after 4-5 sessions.' Watch data to follow.",
        plan: "Session 2: Review watch/sleep data. Reinforce Depth Dial. Address the 'took awhile to fall asleep' — strengthen the pillow trigger and 4-7-8 anchor. The 8.5-hour sleep block (11 PM to 7:33 AM) with only 1 wake is a strong first-session result. Heart rate drop (72 to 63) suggests significant parasympathetic activation — document as objective progress marker. Manage session fatigue concern — set expectations for 6-8 session arc, not open-ended.",
        soap_subjective: "Client reports sleeping 7-8 hours (up from 5-6 before relocation) but waking exhausted. Mind stays active during sleep — 'like the engine is always idling, even when the car is parked.' Recently relocated internationally, socially thriving, not anxious — 'happier than I have been in years.' Vivid work-related dreams throughout the night: meetings, conversations, navigating new city. Asks: 'How do I completely turn off my brain?'",
        soap_objective: "36-question suggestibility test: Highly Physical (76%). Arm-raising induction successful — strong physiological response (all 4 nods). Eagle visualization produced visible hand levitation. Hand-to-forehead challenge held. Reactional deepener: rapid re-entry on all 4 cycles. Progressive relaxation: visible muscle release, breathing rate dropped. Client appeared deeply relaxed throughout.",
        soap_assessment: "Unrefreshing sleep despite adequate duration, consistent with insufficient deep (N3) sleep. Tracker shows 21% combined Deep+REM (does not separate N3 from REM). Recent international relocation presents significant novel-data processing load (new language, cultural norms, spatial navigation, social dynamics) — vivid content-rich dreaming suggests processing at shallow sleep stages rather than deep restorative stages. Not anxiety-related — client is positive and relaxed during waking hours. Prognosis: good — motivated, strong hypnotic responsiveness (arm-raising: all 4 nods, hand levitation, challenge held, rapid reactional re-entry). 76% Physical responds well to direct, literal language.",
        soap_plan: "1. Sleep ceremony homework (time-boxing, notepad, 4-7-8 breathing, screen cutoff). 2. Settling practice nightly. 3. Dream journal to track venting. 4. Follow-up in 1-2 weeks to assess: sleep quality improvement, dream journal content, homework compliance. 5. Session 2: reinforce Depth Dial, test PHS re-hypnosis speed, adjust suggestions per feedback.",
      },
    ],
    nextPlan: "Session 2 Plan (based on Oct 2 feedback):\n1. Review watch/sleep tracker data (he offered to send readings)\n2. Celebrate: 8.5-hour sleep block (11 PM \u2192 7:33 AM) with only 1 bathroom wake = strong result\n3. Address: 'took awhile to fall asleep' \u2014 strengthen pillow trigger + 4-7-8 anchor. Add progressive muscle tension-release as a Physical-lane sleep onset technique\n4. Heart rate: 72 \u2192 63 bpm post-session = significant parasympathetic activation. Track this as objective progress marker across sessions\n5. Session arc: set expectation for 6-8 sessions (he flagged fatigue at 4-5). Front-load the most impactful techniques, build self-hypnosis independence by session 4\n6. Check dream journal \u2014 any venting dreams? If yes, reinforce as convincer\n7. Reinforce Depth Dial + Settling Pond\n8. Test PHS re-hypnosis speed (finger-spread should be faster than session 1)\n9. Send hypnotherapy website link (action item still open)",
  },
];

function loadData() {
  try {
    const raw = localStorage.getItem(STOR);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return { clients: SEED_CLIENTS };
}
function saveData(d) {
  try { localStorage.setItem(STOR, JSON.stringify(d)); } catch { /* quota */ }
}

export default function ClientJourney() {
  const { isAuthenticated } = useAcademy();
  const [data, setData] = useState({ clients: [] });
  const [apiReady, setApiReady] = useState(false);
  const [sel, setSel] = useState(null); // selected client id
  const [addOpen, setAddOpen] = useState(false);
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  /* new client form */
  const [fName, setFName] = useState("");
  const [fAge, setFAge] = useState("");
  const [fOcc, setFOcc] = useState("");
  const [fEp, setFEp] = useState("");
  const [fPresenting, setFPresenting] = useState("");
  /* new session form */
  const [sDate, setSDate] = useState(new Date().toISOString().slice(0, 10));
  const [sTech, setSTech] = useState("");
  const [sNotes, setSNotes] = useState("");
  const [sSleep, setSSleep] = useState(5);

  useEffect(() => {
    /* Try API first, fall back to localStorage */
    if (isAuthenticated) {
      journeyApi.listClients().then(async (r) => {
        if (r.ok) {
          const clients = await r.json();
          if (clients.length > 0) {
            setData({ clients });
            setApiReady(true);
            return;
          }
        }
        setData(loadData());
      }).catch(() => setData(loadData()));
    } else {
      setData(loadData());
    }
  }, [isAuthenticated]);

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      saveData(next);
      return next;
    });
  }, []);

  const client = sel ? data.clients.find((c) => c.id === sel) : null;

  function addClient() {
    if (!fName.trim()) return;
    const id = fName.trim().split(" ").map((w) => w[0]).join("").toUpperCase() + "-" + String(data.clients.length + 1).padStart(3, "0");
    update((d) => {
      d.clients.push({
        id, name: fName.trim(), initials: fName.trim().split(" ").map((w) => w[0]).join("").toUpperCase(),
        age: Number(fAge) || 0, occupation: fOcc, ep: fEp, vak: "", presenting: fPresenting,
        caseRef: "", status: "active", startDate: new Date().toISOString().slice(0, 10),
        sessions: [], nextPlan: "",
      });
      return d;
    });
    setFName(""); setFAge(""); setFOcc(""); setFEp(""); setFPresenting("");
    setAddOpen(false);
  }

  function addSession() {
    if (!client) return;
    update((d) => {
      const c = d.clients.find((x) => x.id === sel);
      c.sessions.push({
        num: c.sessions.length + 1, date: sDate, status: "completed",
        techniques: sTech, notes: sNotes, sleepScore: Number(sSleep) || 5,
        homeworkDone: [], dreamJournal: "", feedback: "", plan: "",
        soap_subjective: "", soap_objective: "", soap_assessment: "", soap_plan: "",
      });
      return d;
    });
    setSDate(new Date().toISOString().slice(0, 10)); setSTech(""); setSNotes(""); setSSleep(5);
    setAddSessionOpen(false);
  }

  function updateSession(sessionIdx, field, value) {
    update((d) => {
      const c = d.clients.find((x) => x.id === sel);
      if (c && c.sessions[sessionIdx]) c.sessions[sessionIdx][field] = value;
      return d;
    });
  }

  function updateClient(field, value) {
    update((d) => {
      const c = d.clients.find((x) => x.id === sel);
      if (c) c[field] = value;
      return d;
    });
  }

  const sleepScores = client ? client.sessions.filter((s) => s.sleepScore).map((s) => s.sleepScore) : [];
  const avgSleep = sleepScores.length ? (sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length).toFixed(1) : "—";
  const trend = sleepScores.length >= 2 ? (sleepScores[sleepScores.length - 1] > sleepScores[0] ? "improving" : sleepScores[sleepScores.length - 1] < sleepScores[0] ? "declining" : "stable") : "—";

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Client Journey Tracker</span>
          <h1 style={{ margin: "8px 0 0" }}>Client <em>Journey</em></h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 18, alignItems: "start", minHeight: "70vh" }}>
        {/* ═══ LEFT: CLIENT LIST ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--mist)", marginBottom: 4 }}>Clients</div>
          {data.clients.map((c) => (
            <button key={c.id} className="panel" onClick={() => setSel(c.id)}
              style={{ padding: "12px 14px", cursor: "pointer", textAlign: "left", border: "none", borderLeft: sel === c.id ? "3px solid var(--iris)" : "3px solid transparent", background: sel === c.id ? "rgba(139,127,212,.08)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ font: "560 13px var(--body)", color: "#e9e4f2" }}>{c.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: STATUS_COLORS[c.status] || "var(--mist)" }}>{c.status}</span>
              </div>
              <div style={{ fontSize: 11, color: "#8b85a0", marginTop: 4 }}>{c.presenting?.slice(0, 40)}...</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginTop: 4 }}>{c.sessions.length} session{c.sessions.length !== 1 ? "s" : ""} {c.caseRef ? `· ${c.caseRef}` : ""}</div>
            </button>
          ))}
          <button type="button" className="chip" onClick={() => setAddOpen(!addOpen)} style={{ marginTop: 8 }}>+ Add Client</button>
          {addOpen && (
            <div className="panel" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <input placeholder="Full name" value={fName} onChange={(e) => setFName(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13 }} />
              <input placeholder="Age" value={fAge} onChange={(e) => setFAge(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13, width: 80 }} />
              <input placeholder="Occupation" value={fOcc} onChange={(e) => setFOcc(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13 }} />
              <input placeholder="E/P (e.g. 76% Physical)" value={fEp} onChange={(e) => setFEp(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13 }} />
              <input placeholder="Presenting issue" value={fPresenting} onChange={(e) => setFPresenting(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13 }} />
              <button type="button" className="primary" onClick={addClient} style={{ fontSize: 12, padding: "8px 14px" }}>Add</button>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: CLIENT DETAIL ═══ */}
        {!client && (
          <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--mist)" }}>
            Select a client from the list to view their journey.
          </div>
        )}

        {client && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header */}
            <div className="panel" style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--iris)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 14, color: "#0e0d14", fontWeight: 700 }}>{client.initials}</div>
                  <div>
                    <div style={{ font: "560 18px var(--body)", color: "#e9e4f2" }}>{client.name}</div>
                    <div style={{ fontSize: 12, color: "#8b85a0" }}>{client.age} · {client.occupation}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#cfc9dd", marginTop: 10 }}>{client.presenting}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)" }}>Status</span>
                  <select value={client.status} onChange={(e) => updateClient("status", e.target.value)}
                    style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", color: STATUS_COLORS[client.status], fontSize: 12, fontFamily: "var(--mono)" }}>
                    {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>EP: {client.ep} · Started: {client.startDate}</div>
                {client.caseRef && <Link href="/cases" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--iris)" }}>Case: {client.caseRef}</Link>}
              </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div className="panel" style={{ padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--amber)" }}>{client.sessions.length}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--mist)" }}>Sessions</div>
              </div>
              <div className="panel" style={{ padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: sleepScores.length && sleepScores[sleepScores.length - 1] >= 7 ? "var(--ok)" : "var(--amber)" }}>{sleepScores.length ? sleepScores[sleepScores.length - 1] : "—"}<span style={{ fontSize: 12 }}>/10</span></div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--mist)" }}>Last Sleep</div>
              </div>
              <div className="panel" style={{ padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--iris)" }}>{avgSleep}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--mist)" }}>Avg Sleep</div>
              </div>
              <div className="panel" style={{ padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: trend === "improving" ? "var(--ok)" : trend === "declining" ? "var(--red)" : "var(--mist)" }}>{trend}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--mist)" }}>Trend</div>
              </div>
            </div>

            {/* Next Session Plan */}
            <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--amber)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--amber)", marginBottom: 8 }}>Next Session Plan</div>
              <textarea value={client.nextPlan} onChange={(e) => updateClient("nextPlan", e.target.value)}
                rows={3} style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "10px 12px", color: "#e0dced", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit" }}
                placeholder="Plan for the next session — focus areas, techniques to try, questions to ask..." />
            </div>

            {/* Session Timeline */}
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--mist)", marginTop: 4 }}>Session Timeline</div>
            {client.sessions.map((s, si) => (
              <div key={si} className="panel" style={{ padding: "16px 20px", borderLeft: `3px solid ${STATUS_COLORS[s.status] || "var(--line)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ font: "560 14px var(--body)", color: "#e9e4f2" }}>Session {s.num} · {s.date}</div>
                  <select value={s.status} onChange={(e) => updateSession(si, "status", e.target.value)}
                    style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 8px", color: STATUS_COLORS[s.status], fontSize: 11, fontFamily: "var(--mono)" }}>
                    {["completed", "scheduled", "cancelled", "no-show"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Techniques */}
                {s.techniques && (
                  <div style={{ fontSize: 12, color: "#8b85a0", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--dim)" }}>Techniques: </span>{s.techniques}
                  </div>
                )}

                {/* Sleep score */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)", display: "flex", alignItems: "center", gap: 6 }}>
                    Sleep quality
                    <input type="range" min="1" max="10" value={s.sleepScore || 5} onChange={(e) => updateSession(si, "sleepScore", Number(e.target.value))} style={{ width: 100 }} />
                    <span style={{ color: s.sleepScore >= 7 ? "var(--ok)" : "var(--amber)", fontWeight: 600 }}>{s.sleepScore}/10</span>
                  </label>
                </div>

                {/* Notes */}
                <textarea value={s.notes} onChange={(e) => updateSession(si, "notes", e.target.value)}
                  rows={2} placeholder="Session notes..."
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit", marginBottom: 8 }} />

                {/* Client feedback */}
                <textarea value={s.feedback} onChange={(e) => updateSession(si, "feedback", e.target.value)}
                  rows={2} placeholder="Client feedback (what they reported)..."
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit", marginBottom: 8 }} />

                {/* Dream journal */}
                <textarea value={s.dreamJournal} onChange={(e) => updateSession(si, "dreamJournal", e.target.value)}
                  rows={2} placeholder="Dream journal entries reported by client..."
                  style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit", marginBottom: 8 }} />

                {/* SOAP Notes */}
                <details style={{ marginBottom: 8 }}>
                  <summary style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--iris)", cursor: "pointer", marginBottom: 6 }}>SOAP Notes (Clinical Documentation)</summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4, marginTop: 6 }}>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--teal)", marginBottom: 2 }}>S — Subjective (client's report)</div>
                      <textarea value={s.soap_subjective || ""} onChange={(e) => updateSession(si, "soap_subjective", e.target.value)} rows={2} placeholder="Client's own description of symptoms, concerns, and progress since last session..."
                        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--amber)", marginBottom: 2 }}>O — Objective (therapist's observations)</div>
                      <textarea value={s.soap_objective || ""} onChange={(e) => updateSession(si, "soap_objective", e.target.value)} rows={2} placeholder="Observed physiological responses, depth indicators, suggestibility signs, behavioral observations..."
                        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--iris)", marginBottom: 2 }}>A — Assessment (clinical interpretation)</div>
                      <textarea value={s.soap_assessment || ""} onChange={(e) => updateSession(si, "soap_assessment", e.target.value)} rows={2} placeholder="Diagnosis/impression, prognosis, response to treatment, E/P lane effectiveness..."
                        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--ok)", marginBottom: 2 }}>P — Plan (next steps)</div>
                      <textarea value={s.soap_plan || ""} onChange={(e) => updateSession(si, "soap_plan", e.target.value)} rows={2} placeholder="Homework assigned, techniques for next session, follow-up timeline, referrals if needed..."
                        style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#cfc9dd", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                  </div>
                </details>

                {/* AVS Button */}
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button type="button" className="chip" onClick={() => openAVS(client, s, PRACTITIONER)} style={{ fontSize: 10 }}>Print After Visit Summary</button>
                </div>

                {/* Homework checklist */}
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--dim)", marginBottom: 4 }}>Homework compliance</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                  {["4-7-8 breathing", "Settling practice", "Dream journal", "Screen cutoff", "Time-boxing", "Recording listened"].map((hw) => {
                    const on = (s.homeworkDone || []).includes(hw);
                    return (
                      <button key={hw} className={`checkchip${on ? " on" : ""}`} style={{ fontSize: 10 }}
                        onClick={() => updateSession(si, "homeworkDone", on ? (s.homeworkDone || []).filter((h) => h !== hw) : [...(s.homeworkDone || []), hw])}>
                        {on ? "\u2713 " : ""}{hw}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* HIPAA Compliance Panel */}
            <details style={{ marginTop: 4 }}>
              <summary style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--red)", cursor: "pointer" }}>HIPAA Compliance & Data Handling</summary>
              <div className="panel" style={{ padding: "16px 20px", marginTop: 8, borderLeft: "3px solid var(--red)" }}>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>PHI Storage:</b> Client data in this tool is stored in browser localStorage on this device only. For HIPAA-compliant long-term storage, export records to an encrypted, access-controlled system (e.g., SimplePractice, TherapyNotes, or encrypted drive).</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>Client Identification:</b> Use initials only in CCH logs and shared documents. Full names only in secured records.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>Session Recordings:</b> If recording sessions for the client, store on encrypted media. Delete after client receives their copy. Never store on unencrypted cloud services.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>After Visit Summary:</b> The AVS contains PHI. Print or save as PDF to a secured location. Do not email unencrypted PHI.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>Minimum Necessary:</b> Only access, use, or disclose the minimum amount of PHI needed for treatment, payment, or operations.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>Retention:</b> Maintain clinical records for a minimum of 7 years (California requirement). 10 years for minors from the date they reach age 18.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>Breach Protocol:</b> If PHI is accessed by unauthorized parties, notify the client within 60 days and document the breach.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>SB 577 Disclosure:</b> Ensure the client has signed the SB 577 disclosure form before the first session. Retain the signed copy in their file.</li>
                  <li style={{ fontSize: 12, color: "#cfc9dd" }}><b>Acknowledgment of Services:</b> Client must sign an Acknowledgment of Services and Fees document BEFORE incurring any charges.</li>
                </ul>
              </div>
            </details>

            {/* Add Session */}
            <button type="button" className="chip" onClick={() => setAddSessionOpen(!addSessionOpen)}>+ Add Session</button>
            {addSessionOpen && (
              <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--iris)", textTransform: "uppercase" }}>New Session</div>
                <input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13 }} />
                <input placeholder="Techniques used" value={sTech} onChange={(e) => setSTech(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 13 }} />
                <textarea placeholder="Session notes" value={sNotes} onChange={(e) => setSNotes(e.target.value)} rows={3} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "#e9e4f2", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
                <label style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)", display: "flex", alignItems: "center", gap: 6 }}>
                  Sleep score <input type="range" min="1" max="10" value={sSleep} onChange={(e) => setSSleep(e.target.value)} style={{ width: 100 }} /> <span style={{ color: "var(--amber)" }}>{sSleep}/10</span>
                </label>
                <button type="button" className="primary" onClick={addSession} style={{ fontSize: 12, padding: "8px 14px" }}>Add Session</button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
