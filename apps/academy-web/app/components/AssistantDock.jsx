'use client';
// VRishi Academy — Global AI Assistant + Voice dock.
// Design source of truth: Assistant.dc.html (design project root).
// Mount ONCE in app/layout.jsx so it renders on every route:
//     import AssistantDock from './components/AssistantDock';
//     ... <body> {children} <AssistantDock /> </body>
// The `context` prop is set per-route (see usePathname map below) so the
// assistant knows which screen the user is on.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// ── service bases (env, with local defaults) ───────────────────────────────
const ORCH = process.env.NEXT_PUBLIC_ORCH_URL || 'http://localhost:8600';
const TTS  = process.env.NEXT_PUBLIC_TTS_URL  || 'http://localhost:8136';

// route → human label shown in the dock header + sent as chat context
const ROUTE_CONTEXT = {
  '/command-deck': 'Command Deck', '/': 'Command Deck',
  '/studio': 'Session Studio', '/room': 'The Room', '/teleprompter': 'Teleprompter',
  '/lab': 'Practice Lab', '/sessions': 'The Sessions', '/skill-tree': 'Skill Tree',
  '/faculty': 'Faculty Console', '/techniques': 'Technique Library',
  '/session-prep': 'Session Prep', '/clinical-intake': 'Clinical Intake',
  '/safety': 'Safety & Ethics', '/logbook': 'Logbook', '/persona-builder': 'Persona Builder',
  '/client-preview': 'Client Preview', '/public-media': 'Public Media',
  '/resources': 'Resources', '/blog': "VRishi's Blog", '/support': 'Support', '/review': 'Persona Review',
  '/dojo': 'Dojo', '/zoom-room': 'Zoom Room', '/zoom-room/copilot': 'AI Co-Pilot', '/immersive': 'Immersive',
};

// first-session arc — the guidebook read-aloud sections (mirror of the DC)
const SECTIONS = [
  { id: 's1', label: 'Pre-talk & Theory of Mind', blurb: 'We open with the pre-talk. Explain the Theory of Mind so the client understands how suggestion reaches the subconscious, and set expectations.' },
  { id: 's2', label: 'Suggestibility test — Emotional / Physical', blurb: 'Run the suggestibility test to place the client on the emotional to physical scale. Emotional subjects respond to inferred language; physical subjects respond to literal instruction.' },
  { id: 's3', label: 'Induction & arm-raising', blurb: 'Begin the induction and use the arm-raising convincer. Match phrasing to the lane: inferred imagery for emotional, direct commands for physical.' },
  { id: 's4', label: 'Deepeners', blurb: 'Deepen the state with your chosen deepener — staircase, countdown, or fractionation. Emotional clients deepen through imagined scenes; physical through counted steps.' },
  { id: 's5', label: 'Therapeutic suggestions', blurb: 'Deliver therapeutic suggestions aligned to the goal. Keep them positive, present-tense, repeated, and phrased in the client’s own lane.' },
  { id: 's6', label: 'Emergence', blurb: 'Emerge the client gently with a count up, reorienting them to the room and confirming they feel alert and well.' },
];

const systemPrompt = (ctx) =>
  "You are the VRishi Academy clinical assistant, an expert in Kappasinian clinical hypnotherapy (HMI method). " +
  "Help with: (1) the Clinical Hypnotherapy Session Guidebook; (2) coaching through the session-prep readiness gates " +
  "(consent & scope, contraindication screen, client & plan, environment & AV); (3) clinical Q&A across the first-session arc " +
  "(pre-talk & Theory of Mind, the Emotional/Physical suggestibility test, induction & arm-raising, deepeners, therapeutic suggestions, emergence). " +
  "Emotional subjects take inferred language; physical subjects take literal language. Be concise, clinically precise, safety-first: " +
  "flag contraindications (cardiac, psychosis, epilepsy, pregnancy, substance) and recommend referral when appropriate. " +
  "This is a training tool, not a substitute for supervision. The user is on the " + (ctx || 'portal') + " screen. Keep replies under ~120 words unless asked for a script.";

export default function AssistantDock() {
  const pathname = usePathname() || '/';
  const context = ROUTE_CONTEXT[pathname] || 'Portal';

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chat');           // chat | read
  const [engine, setEngine] = useState('eleven');   // eleven | browser
  const [input, setInput] = useState('');
  const [autoRead, setAutoRead] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I'm your clinical guide — ask about the guidebook, your session-prep gates, or any step of the first-session arc. You can type or tap the mic.", id: 'a0' },
  ]);

  const msgsRef = useRef(null);
  const recRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, [messages, thinking]);
  useEffect(() => () => stopSpeak(), []);

  // ── voice out ─────────────────────────────────────────────────────────────
  function stopSpeak() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
    if (audioRef.current) { try { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); } catch {} audioRef.current = null; }
  }
  async function speak(text, id) {
    if (speakingId === id) { stopSpeak(); setSpeakingId(null); return; }
    stopSpeak(); setSpeakingId(id);
    // Production voice: ElevenLabs (:8136). SSML pacing is applied server-side
    // via audio_mixer.add_ssml_pacing; here we send plain text for the assistant.
    if (engine === 'eleven') {
      try {
        const r = await fetch(`${TTS}/text_to_speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, model_id: 'eleven_turbo_v2', voice_settings: { stability: 0.4, style: 0.35, speed: 0.96, similarity_boost: 0.75 } }),
        });
        if (!r.ok) throw new Error('tts ' + r.status);
        const url = URL.createObjectURL(await r.blob());
        const a = new Audio(url); audioRef.current = a;
        a.onended = () => { setSpeakingId((cur) => (cur === id ? null : cur)); URL.revokeObjectURL(url); };
        await a.play();
        return;
      } catch { /* fall through to browser voice */ }
    }
    // Browser Web Speech — offline/preview degrade
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      window.speechSynthesis.speak(u);
    } else { setSpeakingId(null); }
  }

  // ── voice in (ASR) ──────────────────────────────────────────────────────────
  function toggleMic() {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { alert('Voice input needs a Chromium browser, or wire the server ASR endpoint.'); return; }
    if (listening) { try { recRef.current.stop(); } catch {} return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => setInput(Array.from(e.results).map((r) => r[0].transcript).join(''));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  }

  // ── chat (Claude orchestrator) ───────────────────────────────────────────────
  async function send() {
    const q = input.trim();
    if (!q || thinking) return;
    const history = messages.concat([{ role: 'user', text: q, id: 'u' + Date.now() }]);
    setMessages(history); setInput(''); setThinking(true);
    if (recRef.current) try { recRef.current.stop(); } catch {}
    try {
      // Orchestrator proxies to Claude (keeps the API key server-side).
      // POST { context, system, messages:[{role,content}] } → { text }
      const r = await fetch(`${ORCH}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          system: systemPrompt(context),
          messages: history.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        }),
      });
      if (!r.ok) throw new Error('chat ' + r.status);
      const { text } = await r.json();
      const reply = (text || '').trim() || "I couldn't reach the model — try again.";
      const id = 'a' + Date.now();
      setMessages((m) => m.concat([{ role: 'assistant', text: reply, id }]));
      setThinking(false);
      if (autoRead) speak(reply, id);
    } catch {
      setMessages((m) => m.concat([{ role: 'assistant', text: 'The assistant service is unavailable. Confirm the orchestrator /assistant/chat endpoint is running.', id: 'e' + Date.now() }]));
      setThinking(false);
    }
  }

  function openGuidebook() {
    if (pathname === '/session-prep') { window.dispatchEvent(new CustomEvent('vr-open-guidebook')); return; }
    window.location.href = '/session-prep';
  }

  // ── styles (self-contained; mirrors the DC tokens) ──────────────────────────
  const T = { void: '#0e0d14', panel: '#16141f', panel2: '#1b1826', raise: '#211d2e', line: '#262234', line2: '#322c44', ink: '#e9e4f2', mist: '#8b85a0', dim: '#5b566d', iris: '#8b7fd4', amber: '#e0a458', red: '#e0685e', teal: '#2dd4bf' };
  const tab_ = (on) => ({ padding: '7px 13px', borderRadius: 8, border: 0, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, letterSpacing: '.04em', color: on ? T.ink : T.mist, background: on ? T.raise : 'transparent' });
  const eleven = engine === 'eleven';

  return (
    <div style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 2147483000, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {open ? (
        <div style={{ width: 'min(400px, calc(100vw - 32px))', height: 'min(600px, calc(100dvh - 44px))', display: 'flex', flexDirection: 'column', background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 70px -20px rgba(0,0,0,.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: `1px solid ${T.line}`, background: `linear-gradient(180deg, ${T.panel2}, ${T.panel})` }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 40% 35%, ${T.iris}, #4b3f8f)`, boxShadow: '0 0 0 3px rgba(139,127,212,.14)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 340, fontSize: 17, color: T.ink }}>VRishi <span style={{ color: T.amber }}>Assistant</span></div>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: T.mist, marginTop: 3 }}>{context} · clinical guide</div>
            </div>
            <button onClick={() => { stopSpeak(); setOpen(false); }} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.line2}`, background: 'transparent', color: T.mist, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 2, padding: '8px 10px', borderBottom: `1px solid ${T.line}` }}>
            <button onClick={() => setTab('chat')} style={tab_(tab === 'chat')}>Chat</button>
            <button onClick={() => setTab('read')} style={tab_(tab === 'read')}>Read aloud</button>
            <div style={{ flex: 1 }} />
            <select value={engine} onChange={(e) => { stopSpeak(); setSpeakingId(null); setEngine(e.target.value); }} style={{ background: T.void, color: T.mist, border: `1px solid ${T.line2}`, borderRadius: 8, padding: '6px 8px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5, cursor: 'pointer' }}>
              <option value="eleven">ElevenLabs</option>
              <option value="browser">Browser voice</option>
            </select>
          </div>

          {tab === 'chat' ? (
            <>
              <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.map((m) => {
                  const isA = m.role === 'assistant';
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isA ? 'flex-start' : 'flex-end' }}>
                      <div style={{ maxWidth: '86%', padding: '10px 13px', borderRadius: isA ? '4px 13px 13px 13px' : '13px 4px 13px 13px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: isA ? '#e4dff0' : T.void, background: isA ? T.panel2 : T.amber, border: isA ? `1px solid ${T.line2}` : 0 }}>{m.text}</div>
                      {isA && <button onClick={() => speak(m.text, m.id)} style={{ marginTop: 5, whiteSpace: 'nowrap', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 9.5, color: T.iris, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>{speakingId === m.id ? '◼ stop' : '▶ read aloud'}</button>}
                    </div>
                  );
                })}
                {thinking && <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: T.mist }}>thinking…</div>}
              </div>
              <div style={{ borderTop: `1px solid ${T.line}`, padding: '11px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button onClick={toggleMic} title="Voice input" style={{ width: 38, height: 38, borderRadius: 10, cursor: 'pointer', border: `1px solid ${listening ? T.red : T.line2}`, background: listening ? 'rgba(224,104,94,.15)' : T.void, color: listening ? T.red : T.mist, fontSize: 15 }}>🎙</button>
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={listening ? 'Listening…' : 'Ask about a step, a gate, a script…'} style={{ flex: 1, resize: 'none', maxHeight: 96, background: T.void, color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 10, padding: '10px 12px', font: '400 13.5px/1.4 Inter, sans-serif' }} />
                  <button onClick={send} style={{ width: 38, height: 38, borderRadius: 10, border: 0, cursor: 'pointer', background: input.trim() ? T.iris : T.line2, color: input.trim() ? '#fff' : T.dim, fontSize: 16 }}>↑</button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: T.mist, cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoRead} onChange={() => setAutoRead((v) => !v)} style={{ accentColor: T.iris, width: 13, height: 13 }} />
                  Read replies aloud automatically
                </label>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, lineHeight: 1.5, color: eleven ? T.amber : T.teal, border: `1px solid ${eleven ? 'rgba(224,164,88,.35)' : 'rgba(45,212,191,.3)'}`, background: eleven ? 'rgba(224,164,88,.07)' : 'rgba(45,212,191,.06)', borderRadius: 10, padding: '11px 13px' }}>
                {eleven ? 'ElevenLabs voice (:8136). Falls back to the browser voice if the service is unreachable.' : 'Using the browser voice (Web Speech) — preview/offline degrade.'}
              </div>
              <div>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, letterSpacing: '.11em', textTransform: 'uppercase', color: T.teal, marginBottom: 9 }}>Guidebook · first-session arc</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {SECTIONS.map((s, i) => {
                    const on = speakingId === s.id;
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', border: `1px solid ${T.line}`, borderRadius: 11, background: T.panel2 }}>
                        <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: T.dim, width: 16 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#cfc9dd', lineHeight: 1.35 }}>{s.label}</div>
                        <button onClick={() => speak(s.blurb, s.id)} style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? T.iris : T.line2}`, background: on ? 'rgba(139,127,212,.16)' : T.void, color: on ? T.iris : T.mist, fontSize: 11 }}>{on ? '◼' : '▶'}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button onClick={openGuidebook} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', border: `1px dashed ${T.line2}`, borderRadius: 11, background: 'transparent', cursor: 'pointer', color: T.ink, textAlign: 'left' }}>
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, color: T.amber, border: `1px solid ${T.line2}`, borderRadius: 6, padding: '4px 6px' }}>PDF</span>
                <span style={{ fontSize: 12.5, color: '#cfc9dd' }}>Open the full guidebook in the viewer ↗</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 18px 12px 13px', borderRadius: 999, border: `1px solid ${T.line2}`, background: `linear-gradient(180deg, ${T.panel2}, ${T.panel})`, color: T.ink, cursor: 'pointer', boxShadow: '0 14px 40px -12px rgba(0,0,0,.7)' }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 40% 35%, ${T.iris}, #4b3f8f)` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
          </span>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 340, fontSize: 15 }}>Ask VRishi</span>
        </button>
      )}
    </div>
  );
}
