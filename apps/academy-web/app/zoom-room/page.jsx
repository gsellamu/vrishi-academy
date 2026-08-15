"use client";
import { useEffect, useState } from "react";

/* ================================================================== DATA == */

const REQUIRED_STEPS = [
  {
    id: "course",
    label: 'Complete "Getting your Zoom Room Approved" course',
    detail: "401 Elective Course Library. Watch the full course and complete the quiz.",
    category: "required",
  },
  {
    id: "build",
    label: "Build your Zoom Room",
    detail: "Set up your physical space, camera, lighting, audio, and Zoom settings per the Cookbook tab.",
    category: "required",
  },
  {
    id: "approval",
    label: "Get Zoom Room approved",
    detail: "Contact Lenora Curtis or your Student Counselor to schedule approval.",
    category: "required",
  },
];

const ROOM_CHECKLIST = [
  { id: "camera_level", label: "Camera at eye level, centered on your face", tip: "Use a tripod, monitor-mount, or stack of books. Never shoot from below (chin distortion) or above (looking down).", category: "video" },
  { id: "camera_quality", label: "External USB webcam (1080p minimum) or DSLR via capture card", tip: "Built-in laptop cameras are low-resolution and have poor low-light performance. Logitech C920/C922 or similar recommended.", category: "video" },
  { id: "lighting_key", label: "Key light: ring light or softbox, positioned in front of you", tip: "18-inch ring light is ideal. Place it directly behind the camera so light falls evenly on your face. No overhead fluorescents alone.", category: "video" },
  { id: "lighting_fill", label: "Fill light or reflector to eliminate shadows on one side", tip: "A second smaller light or a white poster board opposite your key light prevents half-face shadows.", category: "video" },
  { id: "no_backlight", label: "No windows or bright light sources behind you", tip: "Backlight silhouettes your face. Close blinds or face the window (using it as key light) instead.", category: "video" },
  { id: "background_clean", label: "Clean, professional, non-distracting background", tip: "Solid neutral wall, bookshelf, or plants. No virtual backgrounds or green screens -- they glitch with hand gestures.", category: "video" },
  { id: "framing_head", label: "Head and shoulders framing with space above head", tip: "Rule of thirds: eyes at upper third line. Show from mid-chest up. Don't cut off the top of your head.", category: "video" },
  { id: "diplomas_visible", label: "HMI diploma/certificates visible in background (optional)", tip: "Builds client trust. Frame and hang them where the camera can see them, but don't overwhelm the shot.", category: "video" },
  { id: "mic_external", label: "External USB microphone (Blue Yeti, AT2020, or similar)", tip: "Built-in laptop mics pick up keyboard/fan noise. USB condenser mics with cardioid pattern isolate your voice.", category: "audio" },
  { id: "mic_position", label: "Mic positioned 6-12 inches from mouth, off-camera if possible", tip: "Too close = plosives/popping. Too far = room echo. Use a boom arm to position optimally.", category: "audio" },
  { id: "pop_filter", label: "Pop filter or foam windscreen on microphone", tip: "Eliminates plosive sounds (p, b, t) that distort audio during guided imagery and suggestions.", category: "audio" },
  { id: "echo_test", label: "Echo test passed (no reverb or feedback)", tip: "Record yourself in Zoom, play back. If you hear reverb, add soft furnishings (curtains, rug, blankets) to absorb sound.", category: "audio" },
  { id: "noise_suppression", label: "Zoom noise suppression set to Low or Auto", tip: "High suppression can clip your voice during soft hypnotic speech. Low preserves vocal nuance.", category: "audio" },
  { id: "quiet_space", label: "Quiet, private space (door closed, no interruptions)", tip: "HIPAA-adjacent requirement. Others hearing client disclosures is a confidentiality breach.", category: "audio" },
  { id: "headphones", label: "Headphones available (wired preferred for zero latency)", tip: "Use if client audio leaks from speakers. Prevents echo feedback loop. Wireless adds latency.", category: "audio" },
  { id: "waiting_room", label: "Waiting room enabled", tip: "Prevents unexpected joins. You control when the client enters.", category: "zoom" },
  { id: "encryption", label: "End-to-end encryption turned on", tip: "Zoom Settings > Security > End-to-End Encryption. Required for clinical confidentiality.", category: "zoom" },
  { id: "recording_consent", label: "Recording consent workflow configured", tip: "If you record sessions: get written consent BEFORE the session. Zoom shows a recording indicator to all participants.", category: "zoom" },
  { id: "screen_share_host", label: "Screen sharing restricted to host only", tip: "Prevents client from accidentally sharing their screen. You need host sharing for TOM presentation.", category: "zoom" },
  { id: "chat_restricted", label: "Chat and file transfer restricted during session", tip: "Eliminates distractions. Disable in-meeting chat or restrict to host only.", category: "zoom" },
  { id: "notifications_off", label: "OS and Zoom notifications silenced", tip: "Enable Do Not Disturb / Focus mode on your OS. Disable Zoom sound notifications for joins/leaves.", category: "zoom" },
  { id: "display_name", label: "Professional display name: First Last, C.MH. (or credential)", tip: "Not nicknames or email prefixes. This is the first thing clients see in the waiting room.", category: "zoom" },
  { id: "profile_photo", label: "Professional headshot as Zoom profile photo", tip: "Shows in waiting room and when camera is off. Use a current, professional photo.", category: "zoom" },
  { id: "stable_internet", label: "Stable internet -- wired Ethernet or strong 5GHz Wi-Fi", tip: "Minimum 10 Mbps upload speed. Test at speedtest.net. Wired connection eliminates Wi-Fi dropouts.", category: "tech" },
  { id: "speed_test", label: "Speed test passed: 10+ Mbps upload confirmed", tip: "Zoom HD video needs ~3 Mbps but leave headroom. Below 10 Mbps, video quality degrades under load.", category: "tech" },
  { id: "backup_plan", label: "Backup plan if connection drops (client phone number ready)", tip: "Have the client's phone number on paper. If Zoom dies, call immediately and continue the session by phone.", category: "tech" },
  { id: "power_plugged", label: "Laptop plugged in / desktop on UPS", tip: "Battery death mid-session is unprofessional and disruptive. Always plug in.", category: "tech" },
  { id: "zoom_updated", label: "Zoom client updated to latest version", tip: "Updates fix security vulnerabilities and add features. Check before each session day.", category: "tech" },
  { id: "session_timer", label: "Timer or clock visible to you (off-camera)", tip: "Track session duration without checking your phone. Digital clock behind the monitor works well.", category: "session" },
  { id: "notes_area", label: "Note-taking area accessible off-camera", tip: "Physical notepad beside your keyboard. Taking notes on-screen looks like you're typing during session.", category: "session" },
  { id: "tom_ready", label: "Theory of Mind (TOM) presentation loaded and ready to share", tip: "Pre-load the TOM slides before the session. Practice the screen-share flow so it's smooth.", category: "session" },
  { id: "emergency_info", label: "Client emergency contact info accessible", tip: "Keep a printed sheet with client name, emergency contact, and local emergency number for their area.", category: "session" },
  { id: "water_ready", label: "Water and tissues within reach", tip: "You'll be speaking continuously. Clients may become emotional -- tissues visible builds safety.", category: "session" },
  { id: "professional_attire", label: "Professional attire (business casual minimum)", tip: "Dress as you would for an in-person session. Clients can see you from mid-chest up.", category: "session" },
];

const OPTIONAL_VIDEOS = [
  {
    id: "tricia_carr",
    title: "Creating a Professional Zoom Room",
    presenter: "Tricia Carr, CCHt",
    note: "Professional podcaster, seasoned Zoom professional, and HMI instructor. Covers equipment recommendations, lighting, audio, and professional presentation.",
  },
  {
    id: "elaine_perliss",
    title: "Explode Your Practice with Phone and Skype Sessions",
    presenter: "Elaine Perliss, CCHt",
    note: "20+ year veteran of remote sessions. Excellent guidelines for conducting remote sessions via phone and video, with four client demo videos.",
  },
  {
    id: "case_presentations",
    title: "Clinical Case Presentations",
    presenter: "Various",
    note: "Watch for new releases in your 401 Elective Library.",
  },
];

const CATEGORY_LABELS = {
  video: "Camera and Lighting",
  audio: "Audio Setup",
  zoom: "Zoom Configuration",
  tech: "Technical Infrastructure",
  session: "Session Readiness",
};
const CATEGORY_ICONS = { video: "\uD83C\uDFA5", audio: "\uD83C\uDF99\uFE0F", zoom: "\uD83D\uDD17", tech: "\u2699\uFE0F", session: "\uD83E\uDDD8" };
const CATEGORY_ORDER = ["video", "audio", "zoom", "tech", "session"];

/* -- Cookbook recipes -- */
const RECIPES = [
  {
    id: "camera",
    title: "Camera Setup",
    icon: "\uD83C\uDFA5",
    steps: [
      "Choose an external USB webcam (Logitech C920/C922, Elgato Facecam) or DSLR with capture card. Built-in laptop cameras are insufficient for clinical sessions.",
      "Mount the camera at exact eye level. Use a tripod, monitor-top mount, or adjustable arm. Your eyes should be in the top third of the frame.",
      "Position yourself at arm's length from the camera. Frame from mid-chest up with 2-3 inches of space above your head.",
      "Center yourself horizontally. Your nose should align with the camera lens center.",
      "Enable HD video in Zoom Settings > Video > Camera. Check 'Touch up my appearance' at a low setting if desired.",
      "Test: Record a 30-second clip in Zoom. Check framing, color accuracy, and that gestures stay in frame.",
    ],
  },
  {
    id: "lighting",
    title: "Lighting Setup",
    icon: "\uD83D\uDCA1",
    steps: [
      "Primary (key) light: 18-inch ring light or softbox. Position directly behind/above your camera, facing you. This is the most important element.",
      "Set color temperature to 4000-5000K (neutral white). Avoid warm yellow (looks unprofessional on camera) or cool blue (looks clinical/cold).",
      "Fill light (optional but recommended): Smaller light or white reflector board on the opposite side of your key light. Eliminates one-sided shadows.",
      "Eliminate backlight: Close all blinds/curtains behind you. A bright window behind you silhouettes your face.",
      "Turn off overhead fluorescent lights -- they create harsh shadows under eyes and chin. Use only your key/fill lights.",
      "Test: On Zoom, check that both sides of your face are evenly lit, no dark shadows under your eyes, and your skin tone looks natural.",
    ],
  },
  {
    id: "audio",
    title: "Audio Setup",
    icon: "\uD83C\uDF99\uFE0F",
    steps: [
      "Get an external USB condenser microphone. Recommended: Blue Yeti (cardioid mode), Audio-Technica AT2020 USB, or Rode NT-USB Mini.",
      "Set the mic to cardioid pattern (heart-shaped pickup icon on Blue Yeti). This rejects sound from behind the mic.",
      "Position 6-12 inches from your mouth, slightly off to the side and below chin level to stay out of camera frame. Use a boom arm.",
      "Attach a pop filter or foam windscreen to prevent plosive sounds (p, b, t) during guided imagery.",
      "In Zoom Audio Settings: select your external mic as input. Set 'Suppress background noise' to Low (High clips soft hypnotic speech).",
      "Acoustic treatment: add soft surfaces to your room -- curtains, rug, blankets, foam panels. Hard walls cause echo/reverb.",
      "Test: Record yourself speaking softly (as in a deepener). Play back and listen for echo, hiss, pops, or room noise. Repeat until clean.",
    ],
  },
  {
    id: "zoom_config",
    title: "Zoom Configuration",
    icon: "\uD83D\uDD12",
    steps: [
      "Security: Enable Waiting Room (Settings > Security). Enable End-to-End Encryption for all meetings.",
      "Screen Sharing: Set to 'Host Only' by default. You'll need this for the Theory of Mind presentation but clients should not share.",
      "Chat: Disable in-meeting chat or set to 'Host Only'. Disable file transfer. These are distractions during hypnotherapy.",
      "Recording: If you plan to record, configure the consent popup. Always get written consent before the session.",
      "Notifications: In Zoom Settings, disable all sound notifications (join/leave, chat). Enable 'Do Not Disturb' on your OS.",
      "Profile: Set display name to 'FirstName LastName, C.MH.' (or your credential). Upload a professional headshot as profile photo.",
      "Virtual Background: Do NOT use virtual backgrounds or green screens. They glitch when you move your hands (which you do during sessions). Use a real, clean background.",
      "Test: Schedule a test meeting with a friend or colleague. Walk through the full flow: waiting room admission, screen share (TOM), audio quality check.",
    ],
  },
  {
    id: "environment",
    title: "Physical Environment",
    icon: "\uD83C\uDFE0",
    steps: [
      "Choose a private, quiet room with a door that closes and locks. Others hearing client disclosures is a confidentiality breach.",
      "Background: solid neutral wall, bookshelf, or plants. Remove anything distracting, personal, or potentially triggering.",
      "Optional: frame and hang your HMI diploma/certificates where the camera can see them. Builds client trust.",
      "Desk setup: external monitor (or laptop on a riser) with camera at eye level. Keyboard and mouse below camera frame.",
      "Off-camera staging area: notepad, pen, client intake form, emergency contact info, water, tissues.",
      "Ensure a clock or timer is visible to you but not to the camera. Track 50-minute session length.",
      "Post a 'Session in Progress -- Do Not Disturb' sign on the outside of your door.",
      "Test: sit in your chair, start Zoom, and check that everything visible on camera is professional and intentional.",
    ],
  },
  {
    id: "internet",
    title: "Internet and Tech",
    icon: "\uD83C\uDF10",
    steps: [
      "Run a speed test at speedtest.net. You need a minimum of 10 Mbps upload for stable HD video.",
      "Use wired Ethernet whenever possible. Run a cable from your router to your desk. Wi-Fi is a backup, not primary.",
      "If using Wi-Fi: connect to your 5GHz band, sit close to the router, and ensure no other heavy usage during sessions.",
      "Keep your laptop plugged into power at all times during sessions. Battery death mid-session is unrecoverable.",
      "Update Zoom to the latest version before each session day. Updates fix security vulnerabilities.",
      "Backup plan: have the client's phone number written on paper (not just in your phone). If Zoom dies, call within 30 seconds.",
      "Close all unnecessary apps and browser tabs before sessions. They consume bandwidth and CPU.",
      "Test: run Zoom for 20 minutes while streaming video. Watch for any freezing, stuttering, or quality drops.",
    ],
  },
];

/* -- Runbook procedures -- */
const RUNBOOK_SECTIONS = [
  {
    id: "day_before",
    title: "Day Before Session",
    icon: "\uD83D\uDCC5",
    items: [
      "Review client intake form and session notes from previous session (if returning client).",
      "Prepare session plan: induction type, deepeners, suggestibility approach, therapeutic interventions.",
      "Load Theory of Mind (TOM) presentation if this is a first session.",
      "Confirm appointment via text/email: 'Looking forward to our session tomorrow at [time]. Here is your Zoom link: [link]'",
      "Charge all devices. Test that your Zoom link works.",
    ],
  },
  {
    id: "pre_session",
    title: "Pre-Session Checklist (30 Min Before)",
    icon: "\u23F0",
    items: [
      "Close all apps except Zoom. Enable Do Not Disturb / Focus mode on your OS and phone.",
      "Start Zoom meeting 5-10 minutes early. Check camera framing, lighting, and audio levels.",
      "Verify internet speed (quick speedtest). If below 10 Mbps, troubleshoot or switch to wired.",
      "Arrange off-camera items: notepad, pen, water, tissues, client emergency info, timer.",
      "Silence your phone completely (not vibrate -- silent). Place it face-down nearby for backup calls.",
      "Put on professional attire (business casual minimum). Check your appearance on camera.",
      "Open client file/intake form. Review suggestibility type, presenting concern, session number.",
      "If first session: pre-load TOM slides, test screen share, confirm it shows correctly.",
      "Take 2-3 centering breaths. Ground yourself before the client enters.",
      "Admit client from waiting room. Smile. Begin.",
    ],
  },
  {
    id: "first_session_flow",
    title: "First Session Flow (Zoom-Specific)",
    icon: "\uD83C\uDF1F",
    items: [
      "Admit client from waiting room. Greet warmly: 'Welcome, [name]. Can you see and hear me clearly?'",
      "Tech check: 'Let me see your video -- great. Your audio is clear on my end. Are you in a private, comfortable space?'",
      "Build rapport: 3-5 minutes of casual conversation. Comment on something positive in their environment.",
      "Pre-talk: Explain hypnosis, address misconceptions, set expectations for the Zoom format.",
      "Screen share: Theory of Mind presentation. Walk through conscious/subconscious, suggestibility, fight-or-flight.",
      "Stop screen share. Return to face-to-face video. 'Any questions about what we just covered?'",
      "Suggestibility testing: Conduct arms rising/falling, book-and-balloon, or lemon test via video.",
      "Inform consent: Review and confirm informed consent. Document in notes.",
      "First induction: Use progressive relaxation or eye fixation (works well on camera). Maintain vocal pacing.",
      "Post-session: 'How do you feel? What did you notice?' Schedule next session. Send Zoom link for next appointment.",
    ],
  },
  {
    id: "during_session",
    title: "During Session Protocol",
    icon: "\uD83E\uDDD8",
    items: [
      "Maintain eye contact by looking at the CAMERA, not the screen. This is the #1 Zoom mistake.",
      "Speak at a measured pace. Zoom audio compression can muddle rapid speech.",
      "During induction/deepening: lower your voice gradually. The microphone will pick up soft speech if properly positioned.",
      "Watch the client's video feed for ideomotor responses, facial cues, breathing changes, and abreactions.",
      "If client appears to be in abreaction: use calm, steady voice. 'You are safe. I am right here with you.'",
      "Keep session to 50 minutes (leave 10-minute buffer in the hour for notes and reset).",
      "If connection drops: call client's phone within 30 seconds. 'Hi [name], our connection dropped. Are you okay? Let me re-send the Zoom link.'",
      "If connection drops during trance: call immediately. 'You're doing great. Take a deep breath. We'll continue when you're ready.'",
      "Never leave a client unattended in trance. If you must step away, bring them to full waking state first.",
    ],
  },
  {
    id: "post_session",
    title: "Post-Session Procedure",
    icon: "\u2705",
    items: [
      "End Zoom meeting (don't just leave -- end for all participants).",
      "Write session notes immediately while fresh: techniques used, client responses, ideomotor signals, homework assigned.",
      "Update client file: session number, progress notes, plan for next session.",
      "If session was recorded: save recording to encrypted storage immediately. Delete from default Zoom folder.",
      "Send follow-up message (if appropriate): 'Great session today, [name]. Remember to practice [self-hypnosis/anchor/technique] daily.'",
      "Reset your space: close client files, clear notes from desk, disable screen share, check that recording stopped.",
      "If another session follows: take a 5-minute break. Reset focus. Review next client's file.",
      "Log session in your practice hours tracker for HMI graduation requirements.",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting Quick Reference",
    icon: "\uD83D\uDD27",
    items: [
      "VIDEO FREEZES: Ask client 'Can you still hear me?' Turn off your video briefly, then re-enable. If persists, both restart Zoom.",
      "AUDIO ECHO: One of you has speakers too loud near the mic. Use headphones. Lower speaker volume. Check mic isn't picking up system audio.",
      "CLIENT CAN'T HEAR YOU: Check Zoom audio input is set to your external mic, not 'System Default'. Unmute. Check mic isn't muted on the hardware.",
      "SCREEN SHARE WON'T WORK: Zoom > Settings > Share Screen > enable 'Share Screen'. On Mac: System Preferences > Privacy > Screen Recording > allow Zoom.",
      "ZOOM CRASHES MID-SESSION: Call client's phone immediately. Re-open Zoom, start new meeting with same link, admit client from waiting room.",
      "INTERNET DROPS: Switch to phone hotspot if available. Call client on phone. If connection is unstable, offer to reschedule or continue by phone.",
      "CLIENT IN TRANCE WHEN TECH FAILS: Phone them immediately. In a calm voice: 'You're perfectly safe. Take a deep breath. When you're ready, open your eyes and pick up your phone.'",
      "RECORDING DIDN'T SAVE: Check Zoom's default recording folder. Check cloud storage if using cloud recording. Always verify recording started at beginning of session.",
    ],
  },
];

/* -- Equipment list -- */
const EQUIPMENT = [
  { item: "External USB Webcam", rec: "Logitech C920, C922, Elgato Facecam", price: "$70-$180", priority: "essential" },
  { item: "USB Condenser Microphone", rec: "Blue Yeti (cardioid), AT2020 USB+, Rode NT-USB Mini", price: "$70-$130", priority: "essential" },
  { item: "Ring Light (18-inch)", rec: "Neewer 18\" LED Ring Light with stand", price: "$40-$80", priority: "essential" },
  { item: "Boom Arm (mic mount)", rec: "Rode PSA1, InnoGear mic arm", price: "$15-$100", priority: "recommended" },
  { item: "Pop Filter", rec: "Any dual-layer nylon pop filter or foam windscreen", price: "$8-$15", priority: "recommended" },
  { item: "Headphones (wired)", rec: "Sony MDR-7506, Audio-Technica ATH-M50x", price: "$30-$150", priority: "recommended" },
  { item: "Ethernet Cable (Cat 6)", rec: "15-50 ft, flat cable for clean routing", price: "$10-$20", priority: "recommended" },
  { item: "Fill Light / Reflector", rec: "Small LED panel or white poster board", price: "$0-$30", priority: "optional" },
  { item: "Acoustic Panels / Blankets", rec: "Foam panels or heavy curtains for echo reduction", price: "$20-$60", priority: "optional" },
  { item: "Cable Management", rec: "Velcro ties, cable clips, under-desk tray", price: "$10-$20", priority: "optional" },
];

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "\u25C9" },
  { id: "playbook", label: "Playbook", icon: "\u25B6" },
  { id: "cookbook", label: "Cookbook", icon: "\u25A3" },
  { id: "runbook", label: "Runbook", icon: "\u25C8" },
];

/* ================================================================ STORAGE == */

const STORAGE_KEY = "zoomRoom:state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ============================================================= COMPONENTS == */

function ProgressRing({ done, total, size = 120 }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, done / total) : 0;
  const pct = Math.round(frac * 100);
  const color = pct === 100 ? "var(--green, #4ade80)" : pct >= 60 ? "var(--amber, #f59e0b)" : "var(--iris, #818cf8)";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}% complete`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line, #333)" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }} />
        <text x={size/2} y={size/2 + 6} textAnchor="middle" fill={color} fontSize="22" fontWeight="700">{pct}%</text>
      </svg>
    </div>
  );
}

function StepCard({ step, checked, onToggle, notes, onNotes }) {
  return (
    <div className={`zoom-step ${checked ? "zoom-step--done" : ""}`} onClick={onToggle} role="checkbox"
      aria-checked={checked} tabIndex={0} onKeyDown={(e) => e.key === " " && (e.preventDefault(), onToggle())}>
      <div className="zoom-step__check">{checked ? "\u2713" : "\u25CB"}</div>
      <div className="zoom-step__body">
        <div className="zoom-step__label">{step.label}</div>
        <div className="zoom-step__detail">{step.detail}</div>
        {step.id === "approval" && (
          <input
            type="text"
            className="zoom-step__notes"
            placeholder="Approved by... (date, name)"
            value={notes || ""}
            onChange={(e) => onNotes(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}

function CheckItem({ item, checked, onToggle, showTips }) {
  return (
    <div className={`zoom-check ${checked ? "zoom-check--done" : ""}`}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ marginTop: 3 }} />
        <div>
          <span>{item.label}</span>
          {showTips && item.tip && <div className="zoom-check__tip">{item.tip}</div>}
        </div>
      </label>
    </div>
  );
}

function RecipeCard({ recipe, expanded, onToggle }) {
  return (
    <div className="zr-recipe">
      <button className="zr-recipe__head" onClick={onToggle} aria-expanded={expanded}>
        <span className="zr-recipe__icon">{recipe.icon}</span>
        <span className="zr-recipe__title">{recipe.title}</span>
        <span className="zr-recipe__arrow">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <ol className="zr-recipe__steps">
          {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}

function RunbookSection({ section, expanded, onToggle }) {
  return (
    <div className="zr-runbook">
      <button className="zr-runbook__head" onClick={onToggle} aria-expanded={expanded}>
        <span className="zr-runbook__icon">{section.icon}</span>
        <span className="zr-runbook__title">{section.title}</span>
        <span className="zr-runbook__count">{section.items.length} items</span>
        <span className="zr-runbook__arrow">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <ol className="zr-runbook__items">
          {section.items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      )}
    </div>
  );
}

/* ================================================================== PAGE == */

export default function ZoomRoom() {
  const [state, setState] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [showTips, setShowTips] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState({});
  const [expandedRunbook, setExpandedRunbook] = useState({});

  useEffect(() => {
    const s = loadState();
    setState(s);
    if (s._tab) setTab(s._tab);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveState({ ...state, _tab: tab });
  }, [state, loaded, tab]);

  function toggleStep(id) { setState((s) => ({ ...s, [id]: !s[id] })); }
  function toggleCheck(id) { setState((s) => ({ ...s, [`check:${id}`]: !s[`check:${id}`] })); }
  function setNotes(val) { setState((s) => ({ ...s, approvalNotes: val })); }
  function toggleVideo(id) { setState((s) => ({ ...s, [`video:${id}`]: !s[`video:${id}`] })); }

  const requiredDone = REQUIRED_STEPS.filter((s) => state[s.id]).length;
  const checksDone = ROOM_CHECKLIST.filter((c) => state[`check:${c.id}`]).length;
  const totalItems = REQUIRED_STEPS.length + ROOM_CHECKLIST.length;
  const totalDone = requiredDone + checksDone;
  const allApproved = requiredDone === REQUIRED_STEPS.length;
  const roomReady = totalDone === totalItems;

  if (!loaded) return null;

  return (
    <article className="zoom-room">
      <span className="eyebrow">Zoom Room Builder</span>
      <h1>Student &amp; Practitioner Guide</h1>
      <p className="note">
        Playbook, Cookbook, and Runbook for building, approving, and operating
        your professional Zoom Room for HMI hypnotherapy sessions.
      </p>

      {/* Tab bar */}
      <div className="zr-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`zr-tab ${tab === t.id ? "zr-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="zr-tab__icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ============================================ DASHBOARD TAB ======= */}
      {tab === "dashboard" && (
        <>
          <div className="zoom-progress">
            <ProgressRing done={totalDone} total={totalItems} />
            <div className="zoom-progress__text">
              <div className="zoom-progress__count">{totalDone} / {totalItems} items complete</div>
              {roomReady && <div className="zoom-progress__badge">Room Approved and Ready</div>}
              {!roomReady && allApproved && <div className="zoom-progress__badge zoom-progress__badge--partial">HMI Steps Done -- Finish Room Checklist</div>}
            </div>
          </div>

          {/* Required steps */}
          <section className="zoom-section">
            <h2>HMI Approval Requirements</h2>
            <p className="note">These three steps are mandatory for Community Service Program eligibility and seeing clients via Zoom.</p>
            {REQUIRED_STEPS.map((step) => (
              <StepCard key={step.id} step={step} checked={!!state[step.id]}
                onToggle={() => toggleStep(step.id)} notes={state.approvalNotes} onNotes={setNotes} />
            ))}
          </section>

          {/* Room build checklist */}
          <section className="zoom-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ margin: 0 }}>Room Build Checklist</h2>
              <label className="prosody-toggle">
                <input type="checkbox" checked={showTips} onChange={() => setShowTips(!showTips)} />
                Show tips
              </label>
            </div>
            <p className="note">
              Comprehensive checklist based on HMI&apos;s &ldquo;Getting Your Zoom Room Approved&rdquo; course
              and Tricia Carr&apos;s professional setup guide.
            </p>
            {CATEGORY_ORDER.map((cat) => {
              const items = ROOM_CHECKLIST.filter((c) => c.category === cat);
              const catDone = items.filter((c) => state[`check:${c.id}`]).length;
              return (
                <div key={cat} className="zoom-category">
                  <h3>
                    {CATEGORY_LABELS[cat]}
                    <span className="zoom-category__count">{catDone}/{items.length}</span>
                  </h3>
                  {items.map((item) => (
                    <CheckItem key={item.id} item={item} checked={!!state[`check:${item.id}`]}
                      onToggle={() => toggleCheck(item.id)} showTips={showTips} />
                  ))}
                </div>
              );
            })}
          </section>

          {/* Optional videos */}
          <section className="zoom-section">
            <h2>Elective Courses</h2>
            <p className="note">Available in your 401 Elective Library. Not required for approval, but highly recommended.</p>
            {OPTIONAL_VIDEOS.map((v) => (
              <label key={v.id} className={`zoom-video ${state[`video:${v.id}`] ? "zoom-video--watched" : ""}`}>
                <input type="checkbox" checked={!!state[`video:${v.id}`]} onChange={() => toggleVideo(v.id)} />
                <div>
                  <div className="zoom-video__title">{v.title}</div>
                  <div className="zoom-video__presenter">with {v.presenter}</div>
                  <div className="zoom-video__note">{v.note}</div>
                </div>
              </label>
            ))}
          </section>

          <p className="note" style={{ marginTop: 32, opacity: 0.6 }}>
            Progress saved to browser. Will sync with progress-svc when API integration is wired.
          </p>
        </>
      )}

      {/* ============================================= PLAYBOOK TAB ======= */}
      {tab === "playbook" && (
        <div className="zr-guide">
          <section className="zoom-section">
            <h2>Why Your Zoom Room Matters</h2>
            <div className="zr-callout">
              <p>
                Your Zoom Room is your <strong>clinical office</strong> for remote sessions. It is the first
                thing clients see, and it directly affects their perception of your professionalism,
                competence, and trustworthiness. A well-built Zoom Room communicates: &ldquo;You are
                in safe, capable hands.&rdquo;
              </p>
            </div>
            <p className="zr-prose">
              HMI requires Zoom Room approval before you can receive Pro Bono clients through the
              Community Service Program. This is not bureaucratic -- it protects both the student
              and the client. Poor video, audio, or environment can undermine therapeutic rapport,
              break trance states, and compromise confidentiality.
            </p>
          </section>

          <section className="zoom-section">
            <h2>The Three Pillars</h2>
            <div className="zr-pillars">
              <div className="zr-pillar">
                <div className="zr-pillar__icon">{"\uD83C\uDFA5"}</div>
                <h3>Visual Presence</h3>
                <p>Professional framing, even lighting, clean background. The client should see a competent therapist in a clinical setting -- not someone in a cluttered bedroom.</p>
              </div>
              <div className="zr-pillar">
                <div className="zr-pillar__icon">{"\uD83C\uDF99\uFE0F"}</div>
                <h3>Audio Clarity</h3>
                <p>Crystal-clear voice without echo, hiss, or background noise. During inductions and deepeners, your voice IS the therapeutic tool. Muddy audio breaks trance.</p>
              </div>
              <div className="zr-pillar">
                <div className="zr-pillar__icon">{"\uD83D\uDD12"}</div>
                <h3>Clinical Security</h3>
                <p>Encrypted connection, private space, waiting room control. Hypnotherapy sessions involve deep personal disclosures. Confidentiality is non-negotiable.</p>
              </div>
            </div>
          </section>

          <section className="zoom-section">
            <h2>HMI Approval Process</h2>
            <ol className="zr-process">
              <li>
                <strong>Complete the course.</strong> &ldquo;Getting Your Zoom Room Approved&rdquo; in the 401 Elective
                Library. This course covers HMI&apos;s specific requirements and expectations.
              </li>
              <li>
                <strong>Build your room.</strong> Follow the Cookbook tab to set up equipment, lighting,
                audio, Zoom configuration, and your physical environment.
              </li>
              <li>
                <strong>Request approval.</strong> Contact Lenora Curtis or your Student Counselor. They
                will schedule a live Zoom inspection where they review your setup.
              </li>
              <li>
                <strong>Pass inspection.</strong> They check video quality, audio clarity, background
                professionalism, Zoom security settings, and environment privacy.
              </li>
              <li>
                <strong>Receive clients.</strong> Once approved, you can receive Pro Bono clients through
                HMI&apos;s Community Service Program via Zoom.
              </li>
            </ol>
          </section>

          <section className="zoom-section">
            <h2>First Session via Zoom -- Theory of Mind</h2>
            <div className="zr-callout">
              <p>
                The <strong>Theory of Mind (TOM)</strong> presentation is shared with every new client
                during the first session via Zoom screen share. It explains the conscious/subconscious
                mind model, suggestibility types, the fight-or-flight mechanism, and how hypnosis works.
              </p>
            </div>
            <p className="zr-prose">
              When conducting TOM via Zoom, you screen-share the presentation while narrating. This is
              where most Zoom-specific issues surface: client can&apos;t see the slides, audio drops during
              screen share, or the transition back to face-to-face is clunky. Practice this flow
              multiple times before your first real client session. The Runbook tab has the step-by-step
              protocol.
            </p>
          </section>

          <section className="zoom-section">
            <h2>Zoom vs. In-Person -- Key Differences</h2>
            <div className="zr-comparison">
              <div className="zr-comp-row zr-comp-header">
                <div>Aspect</div><div>In-Person</div><div>Zoom</div>
              </div>
              <div className="zr-comp-row">
                <div>Eye contact</div><div>Look at client&apos;s eyes</div><div>Look at the CAMERA lens, not the screen</div>
              </div>
              <div className="zr-comp-row">
                <div>Body language</div><div>Full body visible</div><div>Head + shoulders only -- exaggerate facial expressions slightly</div>
              </div>
              <div className="zr-comp-row">
                <div>Voice</div><div>Natural room acoustics</div><div>Mic-dependent -- test soft speech, whispers carry differently</div>
              </div>
              <div className="zr-comp-row">
                <div>Ideomotor</div><div>Watch hands, breathing, eyelids</div><div>Limited view -- focus on facial cues, breathing rhythm visible in shoulders</div>
              </div>
              <div className="zr-comp-row">
                <div>Abreaction</div><div>Physical presence reassures</div><div>Voice is your only tool -- practice calm, steady reassurance phrases</div>
              </div>
              <div className="zr-comp-row">
                <div>Privacy</div><div>Office door closed</div><div>Both spaces must be private -- confirm client&apos;s environment too</div>
              </div>
              <div className="zr-comp-row">
                <div>Tech failure</div><div>N/A</div><div>Always have phone backup plan. Never leave client unattended in trance</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ============================================= COOKBOOK TAB ======== */}
      {tab === "cookbook" && (
        <div className="zr-guide">
          <section className="zoom-section">
            <h2>Equipment List</h2>
            <p className="note">Recommended equipment based on HMI courses and professional best practices. Total investment: $200-$500 for a professional setup.</p>
            <div className="zr-equip-table">
              <div className="zr-equip-header">
                <div>Item</div><div>Recommendation</div><div>Price Range</div><div>Priority</div>
              </div>
              {EQUIPMENT.map((e) => (
                <div key={e.item} className="zr-equip-row">
                  <div className="zr-equip-item">{e.item}</div>
                  <div className="zr-equip-rec">{e.rec}</div>
                  <div className="zr-equip-price">{e.price}</div>
                  <div className={`zr-equip-pri zr-equip-pri--${e.priority}`}>{e.priority}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="zoom-section">
            <h2>Setup Recipes</h2>
            <p className="note">Step-by-step instructions for each aspect of your Zoom Room. Click to expand.</p>
            {RECIPES.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                expanded={!!expandedRecipes[r.id]}
                onToggle={() => setExpandedRecipes((s) => ({ ...s, [r.id]: !s[r.id] }))}
              />
            ))}
          </section>

          <section className="zoom-section">
            <h2>Quick Setup Diagram</h2>
            <div className="zr-diagram">
              <pre>{`
    [  WINDOW (blinds closed)  ]
    +--------------------------+
    |                          |
    |   [Fill Light/Reflector] |
    |         \\               |
    |          \\              |
    |     +----------+        |
    |     |  YOU     |        |
    |     | (chair)  |        |
    |     +----------+        |
    |        / |               |
    |       /  |               |
    |  [Mic]  [Monitor/Camera] |
    |         [Ring Light]     |
    |                          |
    |   [Desk: notepad, water, |
    |    tissues, timer]       |
    +--------------------------+
    [  DOOR (closed + sign)    ]
              `}</pre>
            </div>
          </section>
        </div>
      )}

      {/* ============================================== RUNBOOK TAB ======= */}
      {tab === "runbook" && (
        <div className="zr-guide">
          <section className="zoom-section">
            <h2>Operational Procedures</h2>
            <p className="note">
              Step-by-step procedures for before, during, and after Zoom hypnotherapy sessions.
              Click each section to expand.
            </p>
            {RUNBOOK_SECTIONS.map((s) => (
              <RunbookSection
                key={s.id}
                section={s}
                expanded={!!expandedRunbook[s.id]}
                onToggle={() => setExpandedRunbook((p) => ({ ...p, [s.id]: !p[s.id] }))}
              />
            ))}
          </section>

          <section className="zoom-section">
            <h2>Emergency Reference Card</h2>
            <div className="zr-emergency">
              <h3>If Client is in Trance and Connection Drops</h3>
              <ol>
                <li>Call the client&apos;s phone <strong>immediately</strong> (within 30 seconds).</li>
                <li>When they answer, speak in a calm, steady voice: &ldquo;Hi [name], this is [your name]. Our video connection dropped, but you are perfectly safe.&rdquo;</li>
                <li>&ldquo;Take a nice deep breath... and when you&apos;re ready, gently open your eyes.&rdquo;</li>
                <li>Once they are fully alert: &ldquo;How are you feeling? Everything is fine. Would you like to continue by phone, or shall I re-send the Zoom link?&rdquo;</li>
                <li>If you cannot reach them by phone: they will naturally emerge from trance on their own within minutes. Follow up with a text and call again in 5 minutes.</li>
              </ol>
            </div>
          </section>

          <section className="zoom-section">
            <h2>Session Timing Template</h2>
            <div className="zr-timing">
              <div className="zr-timing-row"><span className="zr-timing-time">-10 min</span><span>Open Zoom, check setup, review client file</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:00</span><span>Admit client from waiting room, greeting, tech check</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:03</span><span>Rapport building, check-in on week</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:08</span><span>Pre-talk / TOM presentation (first session) or session review</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:20</span><span>Induction begins (progressive relaxation, eye fixation)</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:30</span><span>Deepener, therapeutic suggestions, imagery</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:45</span><span>Emerge, debrief, post-hypnotic suggestions</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">0:50</span><span>Homework, schedule next session, close</span></div>
              <div className="zr-timing-row"><span className="zr-timing-time">+5 min</span><span>Write session notes, update client file, reset space</span></div>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
