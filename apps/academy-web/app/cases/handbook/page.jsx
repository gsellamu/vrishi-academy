"use client";

export default function SleepHandbook() {
  return (
    <article style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <style>{`
        @media print {
          article { padding: 16px !important; }
          .no-print { display: none !important; }
          h1 { font-size: 22px !important; }
          h2 { font-size: 14px !important; }
          h3 { font-size: 12px !important; }
          p, li { font-size: 11px !important; }
          .ceremony-step { padding: 10px 12px !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 20 }}>
        <button type="button" className="primary" onClick={() => window.print()} style={{ padding: "10px 20px", fontSize: 13 }}>Print Handbook</button>
        <span style={{ marginLeft: 12, fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)" }}>Give this to the client after Session 2</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ font: "340 32px/1.1 var(--display)", margin: "0 0 6px" }}>Sleep Protocol Handbook</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)", letterSpacing: ".1em", textTransform: "uppercase" }}>VRishi Hypnotherapy &middot; Your Personal Sleep Restoration Guide</p>
        <p style={{ fontSize: 13, color: "#8b85a0", maxWidth: 500, margin: "10px auto 0" }}>This handbook contains everything you need to practice between sessions. Follow the ceremony every night. The consistency is what locks in the programming.</p>
      </div>

      {/* === SECTION 1: THE SCIENCE === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--amber)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>1. Why This Works (The Science)</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Your brain runs on electrical oscillations that change frequency as you move through sleep stages:</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, margin: "12px 0 16px" }}>
        {[["Beta", "13-30 Hz", "Awake, alert", "var(--amber)"], ["Alpha", "8-13 Hz", "Drowsy, eyes closed", "var(--mist)"], ["Theta", "4-8 Hz", "Light sleep", "#8b85a0"], ["Delta", "0.5-4 Hz", "Deep sleep", "var(--ok)"]].map(([name, hz, desc, color]) => (
          <div key={name} className="panel" style={{ padding: "10px 12px", textAlign: "center", borderTop: `3px solid ${color}` }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color }}>{name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mist)" }}>{hz}</div>
            <div style={{ fontSize: 11, color: "#8b85a0", marginTop: 4 }}>{desc}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>During <strong>delta sleep</strong>, three critical maintenance processes run that CANNOT run while you are awake:</p>
      <ul style={{ fontSize: 13, lineHeight: 1.7, color: "#cfc9dd", paddingLeft: 20 }}>
        <li><strong>Glymphatic Flush:</strong> Cerebrospinal fluid washes through brain tissue, clearing metabolic waste. Like a cooling flush through a heat sink.</li>
        <li><strong>Memory Consolidation:</strong> Your hippocampus replays the day to long-term storage in compressed bursts. Your brain's backup process.</li>
        <li><strong>Synaptic Calibration:</strong> Noise connections weaken, signal connections strengthen. Tomorrow's clarity depends on tonight's calibration.</li>
      </ul>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}><strong>Your goal:</strong> Get your brain into delta within 30 minutes and hold it there for 3 hours. The sleep ceremony is the trigger sequence.</p>

      {/* === SECTION 2: THE NIGHTLY CEREMONY === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--iris)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>2. The Nightly Sleep Ceremony</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", marginBottom: 16 }}>Same time. Every night. No exceptions. The consistency calibrates your body clock.</p>

      {[
        ["10:30 PM", "Shutdown Signal", "Close the laptop. Put the phone in another room (not on the nightstand). This is non-negotiable. Blue light suppresses melatonin by 50%.", "var(--red)"],
        ["10:30\u201310:35", "Time-Box", "Physical notepad on your nightstand (not phone). Write every open thought \u2014 every task, worry, plan. When done, close the notepad. The pad holds them. You do not have to.", "var(--amber)"],
        ["10:35\u201310:40", "Tension-Release", "Three muscle groups, 5 seconds each:\n\u2022 Fists: squeeze hard. 5-4-3-2-1. Release.\n\u2022 Shoulders: to ears. 5-4-3-2-1. Drop.\n\u2022 Face: scrunch everything. 5-4-3-2-1. Release.\nFeel the contrast. That flood of relaxation is the signal.", "var(--teal)"],
        ["10:40\u201310:45", "4-7-8 Breathing", "Tongue on the ridge at the top of your upper teeth. Keep it there.\n\u2022 Exhale completely (heavy sigh).\n\u2022 Breathe IN through nose for 4 counts.\n\u2022 HOLD for 7 counts.\n\u2022 Exhale through mouth for 8 counts.\nRepeat 3 times. This shifts your nervous system from alert to rest.", "var(--iris)"],
        ["10:45\u201310:50", "Settling Practice", "Close your eyes. Body-weight scan:\n\u2022 Head heavy on the pillow.\n\u2022 Shoulders heavy. Arms heavy. Legs heavy.\n\u2022 Feel the bed holding you.\nNow picture the Settling Pond. Gold dust particles swirling in clear water. Watch them drift down. Gravity does the work. Stillness does the work.", "#5bb89a"],
        ["10:50", "Pillow Trigger \u2192 Sleep", "Head sinks into the pillow. The Depth Dial turns to DELTA LOCK automatically. The librarians begin below the floor. The pond clears.\nYou do not try to sleep. The programming runs itself.", "var(--ok)"],
      ].map(([time, title, desc, color], i) => (
        <div key={i} className="ceremony-step panel" style={{ padding: "14px 18px", marginBottom: 10, borderLeft: `3px solid ${color}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color }}>{time}</div>
            <div style={{ font: "560 14px var(--body)", color: "#e9e4f2" }}>{title}</div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#cfc9dd", margin: "6px 0 0", whiteSpace: "pre-line" }}>{desc}</p>
        </div>
      ))}

      {/* === SECTION 3: NIGHT-WAKING PROTOCOL === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--teal)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>3. If You Wake in the Night</h2>
      <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--teal)" }}>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", margin: 0 }}><strong>Do NOT:</strong> Check your phone. Look at the clock. Turn on a light. Try to force yourself back to sleep.</p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", margin: "10px 0 0" }}><strong>Do:</strong></p>
        <ol style={{ fontSize: 13, lineHeight: 1.7, color: "#cfc9dd", paddingLeft: 20, margin: "6px 0 0" }}>
          <li>Place your hand on your chest.</li>
          <li>Take one 4-7-8 breath (tongue on ridge, in-4, hold-7, out-8).</li>
          <li>On the exhale, the Depth Dial resets to DELTA LOCK.</li>
          <li>Back to delta within 60 seconds.</li>
        </ol>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#8b85a0", margin: "10px 0 0" }}>If that does not work within 2 minutes, try the Miniature Golf technique: imagine playing miniature golf hole by hole. See the first hole, line up the putt, swing. Move to hole 2, then 3. Most people are asleep by hole 5 or 6. It is mundane enough to not excite you but structured enough to occupy your mind without stimulating it. If that does not work either, use the Interrupted Sleep Protocol: pretend you are asleep (mimic sleep breathing), take yourself to the staircase, count down from 20, walk through the door at the bottom. Your subconscious takes it from there.</p>
      </div>

      {/* === SECTION 4: IN-BED IMAGERY SELF-HYPNOSIS === */}
      <h2 style={{ font: "560 18px var(--body)", color: "#b57fd4", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>4. In-Bed Imagery Self-Hypnosis for Deep Sleep</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Use this when the settling practice alone is not enough, or when you want to deepen your practice. This is a full self-hypnosis induction done in bed.</p>
      <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid #b57fd4" }}>
        <ol style={{ fontSize: 13, lineHeight: 1.8, color: "#cfc9dd", paddingLeft: 20, margin: 0 }}>
          <li><strong>Eyes on the ceiling.</strong> Pick a spot directly above you. Hold your gaze there.</li>
          <li><strong>Three breaths.</strong> In through nose, out through mouth, relax the jaw. On the third exhale, let your eyes close.</li>
          <li><strong>Physical keyword: &ldquo;Heavy.&rdquo;</strong> Start at the top of your head. Say &ldquo;heavy&rdquo; silently as you move attention through each body region. Scalp: heavy. Forehead: heavy. Jaw: heavy. Neck: heavy. Shoulders: heavy. Arms: heavy. Continue all the way to your toes.</li>
          <li><strong>Emotional keyword: &ldquo;Restored.&rdquo;</strong> Feel it in your chest. Not think it \u2014 FEEL it. Systems restored to baseline. Everything recalibrated.</li>
          <li><strong>Intellectual keyword: &ldquo;Calibrated.&rdquo;</strong> Envision your brain's oscillation graph dropping from beta through alpha, theta, into delta. See the delta waves \u2014 slow, wide, powerful.</li>
          <li><strong>Self-suggestion:</strong> &ldquo;Tonight I sleep in delta for three hours. Tomorrow I wake calibrated, refreshed, and clear.&rdquo;</li>
          <li><strong>The Island Cabin.</strong> Picture the cabin. The bed. The weighted blanket. The sound of waves. You are there. You are safe. You are held.</li>
          <li><strong>Let go.</strong> No countout. Just drift. The cabin takes you into delta.</li>
        </ol>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#8b85a0", marginTop: 10 }}><strong>Turbo mode</strong> (after Session 4 self-hypnosis training (do NOT attempt before being taught)): Skip steps 3-5. Just say: &ldquo;Heavy. Restored. Calibrated. Delta Lock.&rdquo; Four words. Close your eyes. Sleep. This becomes a 60-second induction.</p>

      {/* === SECTION 5: DREAM JOURNAL === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--amber)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>5. Dream Journal</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Keep a physical notepad and pen on your nightstand. When you wake \u2014 whether morning or mid-night \u2014 and remember a dream, write 2-3 words immediately before they fade.</p>
      <ul style={{ fontSize: 13, lineHeight: 1.7, color: "#cfc9dd", paddingLeft: 20 }}>
        <li>If you remember a vivid dream: that is the <strong>venting process working</strong>. Your brain is clearing the backlog.</li>
        <li>If you do not remember any dreams: that is the <strong>delta processing working</strong>. Your brain is consolidating below awareness.</li>
        <li>Both are signs of progress. Write &ldquo;none remembered&rdquo; if no dreams \u2014 that is also data.</li>
        <li>Bring the journal to every session. Dream content helps track the therapy&rsquo;s progress.</li>
      </ul>

      {/* === SECTION 6: DAILY TRACKING === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--ok)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>6. Daily Sleep Tracking</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Every 3-4 days, check your sleep tracker and note these numbers (do not check daily — obsessing over stats makes sleep harder):</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "12px 0" }}>
        {["Deep sleep %", "Light sleep %", "Sleep onset time", "Depth score", "Regularity score", "Resting HR", "Total hours"].map((metric) => (
          <div key={metric} className="panel" style={{ padding: "8px 12px", fontSize: 12, color: "#cfc9dd", textAlign: "center" }}>{metric}</div>
        ))}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#8b85a0" }}>Track trends over the week, not individual nights. One bad night is noise. A weekly trend is signal. Bring the data to every session.</p>

      {/* === SECTION 7: WHAT TO EXPECT === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--iris)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>7. What to Expect</h2>
      <ul style={{ fontSize: 13, lineHeight: 1.7, color: "#cfc9dd", paddingLeft: 20 }}>
        <li><strong>Week 1:</strong> The ceremony may feel awkward. That is normal. You are building a new habit. The programming is installing beneath the surface even if you do not feel dramatic change yet.</li>
        <li><strong>Week 2:</strong> Sleep onset should start improving. You may notice vivid dreams (venting). Heart rate may drop further. The ceremony starts to feel natural.</li>
        <li><strong>Week 3-4:</strong> Deep sleep percentage should be climbing on the tracker. The ceremony becomes automatic \u2014 you do it without thinking. The Depth Dial finds DELTA LOCK faster each night.</li>
        <li><strong>Week 5-6:</strong> The numbers plateau at their target levels. The ceremony is as automatic as brushing your teeth. You own this.</li>
        <li><strong>Bad nights happen.</strong> Travel, stress, illness, late meals \u2014 they disrupt sleep. This does not mean the programming failed. Run the ceremony the next night. The system is resilient. One bad night does not undo weeks of calibration.</li>
      </ul>

      {/* === SECTION 8: EMERGENCY CONTACT === */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--red)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>8. When to Contact Your Therapist or Physician</h2>
      <ul style={{ fontSize: 13, lineHeight: 1.7, color: "#cfc9dd", paddingLeft: 20 }}>
        <li>Sleep quality deteriorates significantly for more than 3 consecutive nights despite following the ceremony</li>
        <li>You experience persistent anxiety, panic, or racing heartbeat at bedtime</li>
        <li>You develop new physical symptoms (snoring, gasping, restless legs, chest pain)</li>
        <li>You experience suicidal thoughts or persistent hopelessness</li>
      </ul>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#8b85a0" }}>For sleep issues: contact your therapist via the scheduled portal (not text/WhatsApp). For medical emergencies: contact your physician or call 911.</p>

      {/* === FOOTER === */}
      <div style={{ marginTop: 30, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: 10, color: "var(--dim)", textAlign: "center" }}>
        <p>VRishi Hypnotherapy &middot; Jithendran Sellamuthu, C.MH. &middot; AHA #007913</p>
        <p>This handbook contains therapeutic instructions. Handle as Protected Health Information per HIPAA.</p>
        <p>CA B&P 2908 &middot; SB 577 Disclosure: Hypnotherapy is complementary, not a substitute for medical treatment.</p>
      </div>
    </article>
  );
}
