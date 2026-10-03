"use client";
import { useCallback, useEffect, useState } from "react";

const STOR = "cj:journal";
const ENTRY_TYPES = ["observation", "reasoning", "idea", "research", "script_note", "session_note", "homework_note", "feedback", "supervision", "hmi_conference", "modification", "contraindication", "general"];
const VIS_OPTS = ["therapist_only", "hmi_visible", "hipaa_audit"];
const CHANNELS = ["portal", "email", "phone", "zoom", "in_person"];
const CONSENT_TYPES = ["sb577_disclosure", "acknowledgment_of_services", "recording_consent", "hipaa_notice", "insurance_verification", "pro_bono_agreement"];
const TYPE_COLORS = { observation: "var(--teal)", reasoning: "var(--iris)", idea: "var(--amber)", research: "#7fb8d4", modification: "var(--red)", feedback: "var(--ok)", session_note: "#b57fd4", supervision: "#d49aba", hmi_conference: "#e0a458", contraindication: "var(--red)" };

/* Seed data for Deepak's clinical reasoning from this session */
const SEED = {
  "DS-001": {
    entries: [
      { type: "observation", session: 1, title: "Suggestibility Assessment", content: "36-question suggestibility test administered. Result: Highly Physical (76%). Client responds best to direct, literal, specific language. Metaphorical or indirect instructions cause disengagement. Scripts must be straightforward.", tags: ["assessment", "physical_lane"], created: "2026-10-01T18:00:00" },
      { type: "observation", session: 1, title: "Eagle Visualization Response", content: "Eagle arm-raise visualization produced strong kinesthetic response. Visible hand levitation with minimal verbal prompting. The eagle metaphor (wings, updraft, magnetic pull to forehead) gave the Physical suggestible a concrete sensation to FEEL. Standard arm-raise would have been too abstract.", tags: ["eagle", "physical_lane", "arm_raise"], created: "2026-10-01T18:30:00" },
      { type: "observation", session: 1, title: "Post-Session Physiological Changes", content: "HR dropped from 72 to 63 bpm the morning after (ECG data). This is significant parasympathetic activation. Historical baseline was 57 bpm. Weight loss of 1 kg overnight (likely fluid retention release from cortisol/sympathetic reduction, not fat loss). 8.5-hour sleep block (11 PM to 7:33 AM) with only 1 bathroom wake.", tags: ["hr_drop", "parasympathetic", "objective_marker"], created: "2026-10-02T06:15:00" },
      { type: "observation", session: 1, title: "Sleep Architecture: Depth Still Bad", content: "Despite 8.5-hour sleep quantity, tracker shows: 21% REM, 79% light sleep, depth score Bad, regularity Poor. Client is not reaching delta (deep N3 sleep). The three maintenance processes (glymphatic flush, memory consolidation, synaptic homeostasis) are not running to completion. This is the primary treatment target.", tags: ["sleep_architecture", "delta", "depth_bad"], created: "2026-10-02T06:20:00" },
      { type: "modification", session: null, title: "EP Assessment Corrected", content: "Original assumption was 58% Emotional based on client presentation (relocated, enjoying new environment, making friends). The 36-question test revealed 76% Physical. ALL scripts and language adjusted from permissive/allowing to direct/literal. This is a major clinical pivot that affects every session.", tags: ["ep_correction", "physical_lane"], created: "2026-10-01T19:00:00" },
      { type: "idea", session: null, title: "Engineer Needs System Architecture Metaphors", content: "Client is a Principal Engineer (MS in EE/CS). He will not buy in without understanding the mechanism. Used: brain oscillations (Hz), glymphatic flush, hippocampal DMA transfers, synaptic homeostasis, thalamic interrupt handler, RAM vs hardwired, debug build vs release build. These are not decorative metaphors — they are the actual rapport-building mechanism for this client.", tags: ["engineer", "metaphors", "system_architecture"], created: "2026-10-01T17:30:00" },
      { type: "feedback", session: 1, title: "Client Feedback (Oct 2)", content: "WhatsApp feedback at 6:12 AM Oct 2: 'After the session, I went to bed immediately. It took me awhile to fall asleep. But once fell asleep, I got up just once to use the bathroom. Sleep started at 11 pm and woke up at 7:33 am.' Also: lost 1 kg overnight (unsure if related). ECG showed resting HR 63 (was 72). Asks: 'How many sessions? I tend to fatigue after 4-5.'", tags: ["client_feedback", "positive_response", "fatigue_concern"], created: "2026-10-02T06:12:00" },
    ],
    reasoning: [
      { session: 1, decision: "Used eagle visualization instead of standard arm-raise", rationale: "Client is 76% Physical, kinesthetic-dominant. The eagle provides a concrete kinesthetic image (wings, updraft, magnetic pull) that a Physical suggestible can FEEL rather than imagine abstractly. Standard arm-raise relies on inference ('lighter and lighter') which works for Emotional but is too passive for Physical.", alternatives: "Standard arm-raise (too passive for Physical), auto-dual (too complex for first session)", research: "Kappas: Physical suggestibles respond to direct/literal imagery. Session 1 confirmed: strong physiological response to eagle metaphor.", outcome: "Successful: visible hand levitation, rapid skin contact, strong PHS install." },
      { session: 1, decision: "Physical lane with direct language throughout", rationale: "36-question test: 76% Physical. Direct commands ('your hand IS rising') vs permissive ('you may notice'). Metaphorical or indirect instructions cause him to tune out. Every suggestion must be concrete, specific, and physical.", alternatives: "Emotional lane with permissive language (would have failed based on assessment)", research: "Kappas suggestibility model. Physical suggestibles need to FEEL hypnosis; Emotionals need to feel understood.", outcome: "Strong physiological responses: all 4 nods, visible arm levitation, HR drop to 63." },
      { session: 1, decision: "Reptile brain + RAM/hardwired Theory of Mind", rationale: "Standard 88/12 model is too abstract for an engineer. Reframed as three-layer architecture (reptile brain for survival, subconscious as hardwired firmware, conscious as RAM). RAM clears on reboot; firmware persists. Hypnosis writes to firmware. Engineer immediately understood and bought in.", alternatives: "Standard Kappas ToM diagram (would work but less resonant for engineer)", research: "Kappas Theory of Mind adapted for engineer cognitive frame.", outcome: "Client said 'Alright. I am listening' after the RAM/firmware explanation. Full cognitive buy-in achieved." },
      { session: 1, decision: "Trophy staircase with achievements on each step", rationale: "Standard staircase is a deepener. For this client, adding trophies representing future achievements (deep sleep, refreshed mornings, career clarity) serves dual purpose: deepening + goal anchoring. Physical suggestible benefits from seeing concrete objects (trophies) on each step.", alternatives: "Standard 20-step sensory staircase (functional but less personalized)", research: "Burns practicum: weave therapeutic suggestions into deepening (not separate).", outcome: "Guided visualization of staircase + island cabin completed. Client appeared deeply relaxed." },
      { session: 2, decision: "Session 2 restructured as Installation Session", rationale: "Session 1 was cognitive/assessment — the programming was explained but not deeply installed. Session 2 is restructured as a systematic installation: 10 post-hypnotic suggestions anchored individually in deep trance, each with ideomotor check before proceeding. This ensures every suggestion is accepted by the subconscious, not just heard.", alternatives: "Data-review session (original S2 plan — would mix review with installation, diluting both)", research: "Kappas: post-hypnotic suggestions must be installed during deep trance, not during conversation. Ideomotor signals confirm subconscious acceptance.", outcome: "Not yet delivered." },
      { session: null, decision: "6-8 session arc with independence pivot at Session 4", rationale: "Client flagged 'fatigue after 4-5 sessions.' Plan: front-load Sessions 1-3 with installation + reinforcement. Session 4 = self-hypnosis independence. Sessions 5-6 = data-driven fine-tuning. Sessions 7-8 = contingency. This respects his pace while ensuring sufficient treatment depth.", alternatives: "Open-ended treatment (would trigger his stated fatigue pattern)", research: "Client self-report: 'I tend to lose or get fatigue after 4-5 sessions.' Treatment design must account for client engagement patterns.", outcome: "Plan shared with client. He agreed to 6-session target." },
    ],
    research: [
      { key: "cordi_2014", authors: "Cordi, M.J., Schlarb, A.A., Rasch, B.", title: "Deepening Sleep by Hypnotic Suggestion", journal: "Sleep", year: 2014, url: "https://www.researchgate.net/publication/262814800_Deepening_Sleep_by_Hypnotic_Suggestion", relevance: "81% increase in slow-wave sleep in highly suggestible subjects. Direct evidence that targeted hypnotic suggestions to 'sleep deeper' measurably change sleep architecture. Deepak is highly Physical suggestible — in the responsive cohort." },
      { key: "cordi_2022", authors: "Cordi, M.J. et al.", title: "Hypnotic enhancement of slow-wave sleep increases sleep-associated hormone secretion and reduces sympathetic predominance", journal: "Nature Communications Biology", year: 2022, url: "https://www.nature.com/articles/s42003-022-03643-y", relevance: "SWS enhancement via hypnosis increased growth hormone secretion and reduced sympathetic tone. Explains Deepak's HR drop (72 to 63 = sympathetic reduction) and 1 kg weight loss (fluid release from cortisol reduction)." },
      { key: "nongard_sleep", authors: "Nongard, R.", title: "Sample Hypnosis Script for Deep Sleep", journal: "SubliminalScience.com", year: 2020, url: "https://subliminalscience.com/product/insomnia-hypnosis/", relevance: "4-7-8 breathing technique (tongue on ridge, in-4, hold-7, out-8). Shifts sympathetic to parasympathetic. Adopted as Deepak's primary sleep onset trigger." },
      { key: "kappas_dream", authors: "Kappas, J.G.", title: "Three Stages of Dreaming (Processing, Predictive, Venting)", journal: "HMI Professional Hypnotism Manual", year: 1968, url: "https://hypnosis.edu", relevance: "Kappas dream therapy model. Three-stage nightly pipeline: Processing (0-120 min), Predictive (mid-night), Venting (pre-waking). Used to explain Deepak's 'thinking while sleeping' as Stage 1 overload and to plant venting dream suggestions as convincer." },
      { key: "hw_insomnia", authors: "Waude, F.", title: "Insomnia Relaxation Hypnosis Script", journal: "Hypnotic World", year: 2000, url: "https://www.hypnoticworld.com/hypnosis-scripts/habits-disorders/insomnia", relevance: "Law of Reversed Effect: the harder you try to sleep, the more awake you become. Adapted for Deepak's pre-talk and interrupted sleep protocol." },
      { key: "hw_interrupted", authors: "Waude, F.", title: "Interrupted Sleep Relaxation Hypnosis Script", journal: "Hypnotic World", year: 2000, url: "https://www.hypnoticworld.com/hypnosis-scripts/habits-disorders/insomnia", relevance: "Pretend-sleep technique: mimic sleep breathing, imagine unpleasant task you'd avoid if asleep. Staircase to door. Adapted for Deepak's night-waking protocol." },
      { key: "chamine_2018", authors: "Chamine, I. et al.", title: "Hypnosis Intervention Effects on Sleep Outcomes: A Systematic Review", journal: "Journal of Clinical Sleep Medicine", year: 2018, url: "https://jcsm.aasm.org/doi/pdf/10.5664/jcsm.6952", relevance: "24 studies: 58.3% showed significant sleep improvement. 54.5% positive when sleep-specific suggestions used. Supports our targeted delta suggestions approach." },
    ],
    comms: [
      { channel: "zoom", direction: "outbound", summary: "Session 1: Initial consultation + first induction (60 min). Assessment, Theory of Mind, eagle arm-raise, guided visualization.", created: "2026-10-01T17:00:00" },
      { channel: "text", direction: "inbound", summary: "Client feedback: 8.5-hour sleep block (11 PM to 7:33 AM), 1 bathroom wake. HR 72 to 63 bpm. Lost 1 kg overnight. Asked about session count (fatigue at 4-5).", created: "2026-10-02T06:12:00" },
    ],
  }
};

function loadJournal() {
  try { const r = localStorage.getItem(STOR); if (r) return JSON.parse(r); } catch {}
  return SEED;
}
function saveJournal(d) {
  try { localStorage.setItem(STOR, JSON.stringify(d)); } catch {}
}

export default function CaseJournal() {
  const [data, setData] = useState({});
  const [clientId, setClientId] = useState("DS-001");
  const [tab, setTab] = useState("journal");
  const [addOpen, setAddOpen] = useState(false);
  /* add entry form */
  const [fType, setFType] = useState("observation");
  const [fSession, setFSession] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fContent, setFContent] = useState("");
  const [fTags, setFTags] = useState("");
  /* add reasoning form */
  const [rOpen, setROpen] = useState(false);
  const [rDecision, setRDecision] = useState("");
  const [rRationale, setRRationale] = useState("");
  const [rAlternatives, setRAlternatives] = useState("");
  const [rResearch, setRResearch] = useState("");
  const [rSession, setRSession] = useState("");
  /* add comm form */
  const [cOpen, setCOpen] = useState(false);
  const [cChannel, setCChannel] = useState("portal");
  const [cDirection, setCDirection] = useState("inbound");
  const [cSummary, setCSummary] = useState("");

  useEffect(() => { setData(loadJournal()); }, []);

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      saveJournal(next);
      return next;
    });
  }, []);

  const cd = data[clientId] || { entries: [], reasoning: [], research: [], comms: [] };

  function addEntry() {
    if (!fContent.trim()) return;
    update((d) => {
      (d[clientId] ||= { entries: [], reasoning: [], research: [], comms: [] }).entries.unshift({
        type: fType, session: fSession ? Number(fSession) : null,
        title: fTitle, content: fContent,
        tags: fTags ? fTags.split(",").map((t) => t.trim()) : [],
        created: new Date().toISOString(),
      });
      return d;
    });
    setFTitle(""); setFContent(""); setFTags(""); setAddOpen(false);
  }

  function addReasoning() {
    if (!rDecision.trim() || !rRationale.trim()) return;
    update((d) => {
      (d[clientId] ||= { entries: [], reasoning: [], research: [], comms: [] }).reasoning.push({
        session: rSession ? Number(rSession) : null,
        decision: rDecision, rationale: rRationale,
        alternatives: rAlternatives, research: rResearch, outcome: "",
      });
      return d;
    });
    setRDecision(""); setRRationale(""); setRAlternatives(""); setRResearch(""); setROpen(false);
  }

  function addComm() {
    if (!cSummary.trim()) return;
    update((d) => {
      (d[clientId] ||= { entries: [], reasoning: [], research: [], comms: [] }).comms.unshift({
        channel: cChannel, direction: cDirection, summary: cSummary,
        created: new Date().toISOString(),
      });
      return d;
    });
    setCSummary(""); setCOpen(false);
  }

  const inputStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 12, width: "100%" };
  const taStyle = { ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 };

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Clinical Case Journal</span>
          <h1 style={{ margin: "8px 0 0" }}>Case <em>Journal</em></h1>
        </div>
        <div className="seg">
          <button type="button" className={tab === "journal" ? "on" : ""} onClick={() => setTab("journal")}>Journal</button>
          <button type="button" className={tab === "reasoning" ? "on" : ""} onClick={() => setTab("reasoning")}>Reasoning</button>
          <button type="button" className={tab === "research" ? "on" : ""} onClick={() => setTab("research")}>Research</button>
          <button type="button" className={tab === "comms" ? "on" : ""} onClick={() => setTab("comms")}>Comms</button>
          <button type="button" className={tab === "export" ? "on" : ""} onClick={() => setTab("export")}>Export</button>
        </div>
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)", marginBottom: 16 }}>Client: {clientId} &middot; {cd.entries.length} entries &middot; {cd.reasoning.length} decisions &middot; {(cd.research || []).length} references &middot; {cd.comms.length} communications</div>

      {/* ═══ JOURNAL TAB ═══ */}
      {tab === "journal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
          <button type="button" className="chip" onClick={() => setAddOpen(!addOpen)}>+ Add Entry</button>
          {addOpen && (
            <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ ...inputStyle, width: 160 }}>
                  {ENTRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input placeholder="Session # (optional)" value={fSession} onChange={(e) => setFSession(e.target.value)} style={{ ...inputStyle, width: 120 }} />
              </div>
              <input placeholder="Title" value={fTitle} onChange={(e) => setFTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="Content (clinical observation, reasoning, idea...)" value={fContent} onChange={(e) => setFContent(e.target.value)} rows={4} style={taStyle} />
              <input placeholder="Tags (comma-separated)" value={fTags} onChange={(e) => setFTags(e.target.value)} style={inputStyle} />
              <button type="button" className="primary" onClick={addEntry} style={{ fontSize: 12, padding: "8px 14px", alignSelf: "flex-start" }}>Save Entry</button>
            </div>
          )}
          {cd.entries.map((e, i) => (
            <div key={i} className="panel" style={{ padding: "14px 18px", borderLeft: `3px solid ${TYPE_COLORS[e.type] || "var(--line)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: TYPE_COLORS[e.type] || "var(--mist)", background: "rgba(255,255,255,.05)", padding: "2px 6px", borderRadius: 3 }}>{e.type}</span>
                  {e.session && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)" }}>S{e.session}</span>}
                  {e.title && <span style={{ font: "560 13px var(--body)", color: "#e9e4f2" }}>{e.title}</span>}
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)" }}>{e.created?.slice(0, 10)}</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "#cfc9dd", margin: 0 }}>{e.content}</p>
              {e.tags?.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  {e.tags.map((t, j) => <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", background: "rgba(255,255,255,.04)", padding: "1px 5px", borderRadius: 3 }}>{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ REASONING TAB ═══ */}
      {tab === "reasoning" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
          <button type="button" className="chip" onClick={() => setROpen(!rOpen)}>+ Add Decision</button>
          {rOpen && (
            <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <input placeholder="Session # (optional)" value={rSession} onChange={(e) => setRSession(e.target.value)} style={{ ...inputStyle, width: 120 }} />
              <input placeholder="Decision (what you chose to do)" value={rDecision} onChange={(e) => setRDecision(e.target.value)} style={inputStyle} />
              <textarea placeholder="Rationale (WHY you made this decision)" value={rRationale} onChange={(e) => setRRationale(e.target.value)} rows={3} style={taStyle} />
              <textarea placeholder="Alternatives considered (what you could have done instead)" value={rAlternatives} onChange={(e) => setRAlternatives(e.target.value)} rows={2} style={taStyle} />
              <textarea placeholder="Research support (citations, evidence)" value={rResearch} onChange={(e) => setRResearch(e.target.value)} rows={2} style={taStyle} />
              <button type="button" className="primary" onClick={addReasoning} style={{ fontSize: 12, padding: "8px 14px", alignSelf: "flex-start" }}>Save Decision</button>
            </div>
          )}
          {cd.reasoning.map((r, i) => (
            <div key={i} className="panel" style={{ padding: "14px 18px", borderLeft: "3px solid var(--iris)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ font: "560 13px var(--body)", color: "#e9e4f2" }}>{r.decision}</span>
                {r.session && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)" }}>Session {r.session}</span>}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#cfc9dd", marginBottom: 6 }}><span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--teal)" }}>RATIONALE:</span> {r.rationale}</div>
              {r.alternatives && <div style={{ fontSize: 11, color: "#8b85a0", marginBottom: 4 }}><span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)" }}>ALTERNATIVES:</span> {r.alternatives}</div>}
              {r.research && <div style={{ fontSize: 11, color: "#8b85a0", marginBottom: 4 }}><span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#7fb8d4" }}>RESEARCH:</span> {r.research}</div>}
              {r.outcome && <div style={{ fontSize: 11, color: "var(--ok)", marginBottom: 4 }}><span style={{ fontFamily: "var(--mono)", fontSize: 9 }}>OUTCOME:</span> {r.outcome}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ═══ RESEARCH TAB ═══ */}
      {tab === "research" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
          {(cd.research || []).map((r, i) => (
            <div key={i} className="panel" style={{ padding: "14px 18px", borderLeft: "3px solid #7fb8d4" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#7fb8d4", marginBottom: 4 }}>{r.key} ({r.year})</div>
              <div style={{ font: "560 13px var(--body)", color: "#e9e4f2", marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#8b85a0", marginBottom: 4 }}>{r.authors} &middot; {r.journal}</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#cfc9dd" }}>{r.relevance}</div>
              {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--iris)", marginTop: 4, display: "inline-block" }}>{r.url.slice(0, 60)}...</a>}
            </div>
          ))}
        </div>
      )}

      {/* ═══ COMMS TAB ═══ */}
      {tab === "comms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
          <button type="button" className="chip" onClick={() => setCOpen(!cOpen)}>+ Log Communication</button>
          {cOpen && (
            <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={cChannel} onChange={(e) => setCChannel(e.target.value)} style={{ ...inputStyle, width: 120 }}>
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={cDirection} onChange={(e) => setCDirection(e.target.value)} style={{ ...inputStyle, width: 120 }}>
                  <option value="inbound">inbound</option>
                  <option value="outbound">outbound</option>
                </select>
              </div>
              <textarea placeholder="Summary of communication" value={cSummary} onChange={(e) => setCSummary(e.target.value)} rows={3} style={taStyle} />
              <button type="button" className="primary" onClick={addComm} style={{ fontSize: 12, padding: "8px 14px", alignSelf: "flex-start" }}>Log</button>
            </div>
          )}
          {cd.comms.map((c, i) => (
            <div key={i} className="panel" style={{ padding: "12px 16px", borderLeft: `3px solid ${c.direction === "inbound" ? "var(--teal)" : "var(--amber)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: c.direction === "inbound" ? "var(--teal)" : "var(--amber)" }}>{c.direction}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)" }}>{c.channel}</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)" }}>{c.created?.slice(0, 10)}</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: "#cfc9dd", margin: 0 }}>{c.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ EXPORT TAB ═══ */}
      {tab === "export" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
          <div className="panel" style={{ padding: "18px 22px" }}>
            <div style={{ font: "560 15px var(--body)", color: "var(--iris)", marginBottom: 8 }}>Export Options</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="primary" onClick={() => alert("Full Workbook PDF generation requires the progress-svc API. Authenticate first.")} style={{ fontSize: 12 }}>Generate Full Workbook (PDF)</button>
              <button type="button" className="chip" onClick={() => {
                const blob = new Blob([JSON.stringify(cd, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `${clientId}-journal-export.json`; a.click();
              }} style={{ fontSize: 12 }}>Export as JSON</button>
            </div>
          </div>
          <div className="panel" style={{ padding: "18px 22px" }}>
            <div style={{ font: "560 15px var(--body)", color: "var(--amber)", marginBottom: 8 }}>HMI Documentation</div>
            <p style={{ fontSize: 12, color: "#8b85a0" }}>CCH Log format: Use client initials only. Document session number, date, techniques, presenting issue. The Journal + Reasoning tabs contain all clinical documentation needed for case conference submissions.</p>
          </div>
          <div className="panel" style={{ padding: "18px 22px" }}>
            <div style={{ font: "560 15px var(--body)", color: "var(--red)", marginBottom: 8 }}>HIPAA Compliance</div>
            <p style={{ fontSize: 12, color: "#8b85a0" }}>Current storage: localStorage (this browser only). For HIPAA-compliant persistence, authenticate and the data syncs to PostgreSQL (academy DB) with encrypted-at-rest storage. Export records periodically to encrypted backup. Retain for minimum 7 years (California requirement).</p>
          </div>
          <div className="panel" style={{ padding: "18px 22px" }}>
            <div style={{ font: "560 15px var(--body)", color: "var(--ok)", marginBottom: 8 }}>Data Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--amber)" }}>{cd.entries.length}</div><div style={{ fontSize: 9, color: "var(--mist)", textTransform: "uppercase" }}>Journal Entries</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--iris)" }}>{cd.reasoning.length}</div><div style={{ fontSize: 9, color: "var(--mist)", textTransform: "uppercase" }}>Decisions</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "#7fb8d4" }}>{(cd.research || []).length}</div><div style={{ fontSize: 9, color: "var(--mist)", textTransform: "uppercase" }}>References</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--teal)" }}>{cd.comms.length}</div><div style={{ fontSize: 9, color: "var(--mist)", textTransform: "uppercase" }}>Communications</div></div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
