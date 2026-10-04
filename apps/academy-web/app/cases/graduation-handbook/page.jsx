"use client";

export default function GraduationHandbook() {
  return (
    <article style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <style>{`
        @media print {
          article { padding: 16px !important; }
          .no-print { display: none !important; }
          h1 { font-size: 22px !important; }
          h2 { font-size: 14px !important; page-break-before: auto; }
          p, li { font-size: 11px !important; }
          .ceremony-step { padding: 10px 12px !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 20 }}>
        <button type="button" className="primary" onClick={() => window.print()} style={{ padding: "10px 20px", fontSize: 13 }}>Print Handbook</button>
        <span style={{ marginLeft: 12, fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)" }}>Personalized Graduation Handbook — give to client at Session 6/8</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ font: "340 32px/1.1 var(--display)", margin: "0 0 6px" }}>Your Sleep Mastery Handbook</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mist)", letterSpacing: ".1em", textTransform: "uppercase" }}>VRishi Hypnotherapy &middot; Personalized for Deepak S.</p>
        <p style={{ fontSize: 13, color: "#8b85a0", maxWidth: 500, margin: "10px auto 0" }}>This handbook contains everything you need to maintain deep, restorative sleep for life. You built this system over 6 sessions. This guide ensures you never lose it.</p>
      </div>

      {/* ═══ SECTION 1: YOUR TRANSFORMATION ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--ok)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>1. Your Transformation (Data Summary)</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Your sleep tracker data tells the story of your transformation:</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.04)" }}>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--mist)", fontSize: 10, textTransform: "uppercase" }}>Metric</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--red)", fontSize: 10 }}>Session 1</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--ok)", fontSize: 10 }}>Graduation</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--iris)", fontSize: 10 }}>Change</th>
            </tr>
          </thead>
          <tbody style={{ color: "#cfc9dd" }}>
            {[
              ["Deep + REM Sleep", "21%", "[your graduation %]", "[improvement]"],
              ["Light Sleep", "79%", "[your graduation %]", "[reduction]"],
              ["Sleep Onset", "~35 min", "[your graduation time]", "[faster]"],
              ["Depth Score", "Bad", "[your score]", "[improved]"],
              ["Regularity", "Poor", "[your score]", "[improved]"],
              ["Resting HR", "72 bpm (post-S1: 63)", "[your HR]", "[lower]"],
              ["Subjective Quality", "4/10", "[your score]", "[improved]"],
            ].map(([m, b, g, c], i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <td style={{ padding: "5px 10px", fontWeight: 600 }}>{m}</td>
                <td style={{ padding: "5px 10px", color: "var(--red)" }}>{b}</td>
                <td style={{ padding: "5px 10px", color: "var(--ok)" }}>{g}</td>
                <td style={{ padding: "5px 10px", color: "var(--iris)" }}>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#8b85a0", fontStyle: "italic" }}>[Therapist: fill in the graduation column with actual data before printing.]</p>

      {/* ═══ SECTION 2: THE SLEEP TEMPLE ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--iris)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>2. Your Sleep Temple</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Over six sessions, you built a temple in your mind designed for perfect sleep. Each room holds a technique you mastered. The nightly ceremony is your walk through the rooms.</p>
      {[
        ["Room 1: The Breathing Chamber", "4-7-8 breathing. Tongue on ridge. In for 4, hold for 7, out for 8. Three cycles. The chamber amplifies each exhale.", "var(--teal)"],
        ["Room 2: The Release Room", "Progressive Muscle Tension-Release. Fists (5 sec, release). Shoulders (5 sec, release). Face (5 sec, release). The stone slab absorbs all tension.", "var(--amber)"],
        ["Room 3: The Settling Pool", "Gold dust particles in clear water. The day's impressions settling. Gravity does the work. Stillness does the work. The surface becomes glass.", "#5bb89a"],
        ["Room 4: The Delta Vault", "The Depth Dial turns to DELTA LOCK (0.5 Hz). The Anchor Chain holds you in the deep zone through every 90-minute cycle. The Processing Vault locks your thoughts until 7 AM.", "var(--iris)"],
        ["Room 5: The Regeneration Chamber", "Cellular repair. Growth hormone. Glymphatic flush. Synaptic calibration. Every cell rebuilt, every night.", "#b57fd4"],
        ["The Sanctum", "Your private room at the center. The bed. The weighted blanket. The sound of waves. Three feet of stone on every side. Nothing can reach you here.", "var(--ok)"],
      ].map(([title, desc, color], i) => (
        <div key={i} className="panel ceremony-step" style={{ padding: "14px 18px", marginBottom: 8, borderLeft: `3px solid ${color}` }}>
          <div style={{ font: "560 14px var(--body)", color, marginBottom: 4 }}>{title}</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#cfc9dd", margin: 0 }}>{desc}</p>
        </div>
      ))}

      {/* ═══ SECTION 3: THE NIGHTLY CEREMONY ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--amber)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>3. The Nightly Ceremony</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", marginBottom: 16 }}>Same time. Every night. The consistency is what keeps the temple strong.</p>
      {[
        ["10:30 PM", "Shutdown", "Close laptop. Phone in another room. This is non-negotiable."],
        ["10:30-10:35", "Notepad", "Write every open thought as bullet points. Draw the line. Write 'Handled at 7 AM.' Close face-down. Then: vault the files (10 sec \u2014 door shut, lock turned, key shelved)."],
        ["10:35-10:40", "Tension-Release", "Fists: squeeze 5 sec, release. Shoulders: squeeze 5 sec, release. Face: squeeze 5 sec, release."],
        ["10:40-10:45", "4-7-8 Breathing", "Tongue on ridge. In for 4. Hold for 7. Out for 8. Three cycles."],
        ["10:45-10:50", "Settling", "Body-weight scan: head heavy, shoulders heavy, arms heavy, legs heavy. Picture the Settling Pool. Watch the particles drift down."],
        ["10:50", "Sleep", "Head on pillow. Depth Dial turns to DELTA LOCK. The temple doors open. Sleep."],
      ].map(([time, title, desc], i) => (
        <div key={i} className="panel ceremony-step" style={{ padding: "12px 16px", marginBottom: 8, borderLeft: "3px solid var(--amber)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)", fontWeight: 700 }}>{time}</span>
            <span style={{ font: "560 13px var(--body)", color: "#e9e4f2" }}>{title}</span>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.5, color: "#cfc9dd", margin: "4px 0 0" }}>{desc}</p>
        </div>
      ))}

      {/* ═══ SECTION 4: TURBO MODE ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "#b57fd4", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>4. Turbo Mode (60-Second Induction)</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>For nights when you are too tired for the full ceremony. You earned this through six sessions of practice.</p>
      <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid #b57fd4" }}>
        <ol style={{ fontSize: 14, lineHeight: 1.8, color: "#cfc9dd", paddingLeft: 20, margin: 0 }}>
          <li>In bed. Eyes on ceiling. Three breaths. Eyes close on three.</li>
          <li>Four words: <strong>Heavy. Restored. Calibrated. Delta Lock.</strong></li>
          <li>Sleep.</li>
        </ol>
        <p style={{ fontSize: 12, color: "#8b85a0", marginTop: 10 }}>That is it. 60 seconds. Your subconscious knows what these words mean. It has heard them hundreds of times. The temple doors open on command.</p>
      </div>

      {/* ═══ SECTION 5: SELF-HYPNOSIS ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--iris)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>5. Self-Hypnosis for Sleep</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>The full self-hypnosis sequence for nights when you want maximum depth.</p>
      <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--iris)" }}>
        <ol style={{ fontSize: 13, lineHeight: 1.8, color: "#cfc9dd", paddingLeft: 20, margin: 0 }}>
          <li><strong>Eyes on ceiling.</strong> Pick a spot. Hold your gaze.</li>
          <li><strong>Three breaths.</strong> In nose, out mouth. Eyes close on third exhale.</li>
          <li><strong>"Heavy."</strong> Move attention head to toes, saying "heavy" at each region.</li>
          <li><strong>"Restored."</strong> Feel it in your chest. Systems restored to baseline.</li>
          <li><strong>"Calibrated."</strong> See your brain's oscillation graph dropping into delta.</li>
          <li><strong>Self-suggestion:</strong> "Tonight I sleep in delta for three hours. Tomorrow I wake calibrated."</li>
          <li><strong>Island Cabin.</strong> The bed. The blanket. The waves. You are there.</li>
          <li><strong>Let go.</strong> No countout. Just drift. The temple takes you.</li>
        </ol>
      </div>

      {/* ═══ SECTION 6: NIGHT-WAKING ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--teal)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>6. If You Wake in the Night</h2>
      <div className="panel" style={{ padding: "16px 20px", borderLeft: "3px solid var(--teal)" }}>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", margin: "0 0 8px" }}><strong>Do NOT:</strong> Check your phone. Look at the clock. Turn on a light.</p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", margin: "0 0 8px" }}><strong>Level 1:</strong> Hand on chest. One 4-7-8 breath. Depth Dial resets to DELTA LOCK. Back to delta in 30 seconds.</p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", margin: "0 0 8px" }}><strong>Level 2:</strong> Miniature golf. Picture hole 1. Line up the putt. Swing. Hole 2. Hole 3. Most people asleep by hole 5.</p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd", margin: 0 }}><strong>Level 3:</strong> Pretend you are asleep. Mimic sleep breathing. Someone will make you clean the dog park in the rain if they catch you awake. Stay still. Breathe slowly. Take yourself to the staircase.</p>
      </div>

      {/* ═══ SECTION 7: RELAPSE PREVENTION ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--red)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>7. If Sleep Gets Disrupted</h2>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cfc9dd" }}>Bad nights happen. Travel. Stress. Illness. The temple does not crumble from one disrupted night.</p>
      <div className="panel" style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: 14, color: "#cfc9dd", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 10px" }}><strong>Option 1:</strong> Run the full ceremony strictly for 7 consecutive nights. Same time. Full sequence. The temple recalibrates.</p>
          <p style={{ margin: "0 0 10px" }}><strong>Option 2:</strong> Practice self-hypnosis daily for 7 days. Five minutes in a chair. Keywords: Heavy. Restored. Calibrated. The depth returns.</p>
          <p style={{ margin: 0 }}><strong>Option 3:</strong> Call your therapist. One booster session. One session is all it takes to recalibrate.</p>
        </div>
      </div>

      {/* ═══ SECTION 8: THE SCIENCE ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "#7fb8d4", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>8. The Science (Quick Reference)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0" }}>
        {[
          ["Delta (0.5-4 Hz)", "Deep sleep. Glymphatic flush. Memory consolidation. Growth hormone."],
          ["Theta (4-8 Hz)", "Light sleep. Processing. The zone you want to pass through quickly."],
          ["90-Minute Cycles", "Natural transitions between deep and light. The Anchor Chain holds you in delta through each transition."],
          ["Adenosine", "Builds all day. Creates sleep pressure. Clears during deep sleep. This is why you feel refreshed after delta."],
        ].map(([title, desc], i) => (
          <div key={i} className="panel" style={{ padding: "10px 14px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#7fb8d4", marginBottom: 4 }}>{title}</div>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: "#8b85a0", margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 9: TRACKING ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--ok)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>9. Ongoing Tracking</h2>
      <ul style={{ fontSize: 13, lineHeight: 1.7, color: "#cfc9dd", paddingLeft: 20 }}>
        <li>Check your sleep tracker <strong>every 3-4 days</strong> (not daily). How you feel matters more than the numbers.</li>
        <li>Track trends over weeks, not individual nights. One bad night is noise. A weekly trend is signal.</li>
        <li>If the numbers slip for more than a week, use the Relapse Prevention protocol.</li>
        <li>The tracker is a tool, not a judge. Good sleep feels like good sleep. Trust your body.</li>
      </ul>

      {/* ═══ SECTION 10: CONTACT ═══ */}
      <h2 style={{ font: "560 18px var(--body)", color: "var(--mist)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginTop: 30 }}>10. Contact &amp; Support</h2>
      <div className="panel" style={{ padding: "14px 18px" }}>
        <p style={{ fontSize: 13, color: "#cfc9dd", margin: "0 0 6px" }}><strong>Therapist:</strong> Jithendran Sellamuthu, C.MH., AHA #007913</p>
        <p style={{ fontSize: 13, color: "#cfc9dd", margin: "0 0 6px" }}><strong>Contact:</strong> Via PocketSuite (secure messaging) or jeeth@vrishihypno.com</p>
        <p style={{ fontSize: 13, color: "#cfc9dd", margin: "0 0 6px" }}><strong>Schedule:</strong> calendly.com/jeeth-vrishihypno/90min</p>
        <p style={{ fontSize: 13, color: "#cfc9dd", margin: "0 0 6px" }}><strong>Booster sessions:</strong> Available anytime. One session to recalibrate.</p>
        <p style={{ fontSize: 12, color: "#8b85a0", margin: "10px 0 0" }}>For medical concerns (persistent insomnia, new physical symptoms, breathing issues during sleep): contact your primary care physician.</p>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ marginTop: 30, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: 10, color: "var(--dim)", textAlign: "center" }}>
        <p>VRishi Hypnotherapy &middot; Jithendran Sellamuthu, C.MH. &middot; AHA #007913</p>
        <p>Personalized for Deepak S. &middot; Treatment completed [DATE]</p>
        <p>This handbook is for personal use only. It contains therapeutic instructions customized to your suggestibility profile and treatment history.</p>
        <p>CA B&P 2908 &middot; Hypnotherapy is complementary, not a substitute for medical treatment.</p>
      </div>
    </article>
  );
}
