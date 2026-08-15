"use client";
import { useEffect, useRef, useState, useCallback } from "react";

/* ================================================================ CONFIG == */
const API = process.env.NEXT_PUBLIC_COPILOT_API || "http://localhost:8605";
const MAX_PHOTOS = 5;
const PHOTO_SLOTS = ["front", "left", "right", "behind", "overhead"];
const GRADE_COLORS = { A: "#4ade80", B: "#a3e635", C: "#f59e0b", D: "#f97316", F: "#ef4444" };

/* ============================================================ EQUIPMENT == */
const EQUIPMENT = [
  { id: "desk_standard", name: "Desk", w: 120, d: 60, color: "#5c5470", category: "furniture" },
  { id: "chair_office", name: "Chair", w: 50, d: 50, color: "#6b5b7b", category: "furniture" },
  { id: "monitor_24", name: "Monitor", w: 55, d: 10, color: "#2d3748", category: "furniture" },
  { id: "webcam_hd", name: "Webcam", w: 8, d: 5, color: "#e53e3e", category: "camera" },
  { id: "ringlight_18", name: "Ring Light", w: 46, d: 46, color: "#f6e05e", category: "light" },
  { id: "mic_usb", name: "USB Mic", w: 12, d: 12, color: "#4299e1", category: "mic" },
  { id: "boom_arm", name: "Boom Arm", w: 60, d: 5, color: "#718096", category: "mic" },
  { id: "softbox", name: "Softbox", w: 40, d: 15, color: "#fbd38d", category: "light" },
  { id: "bookshelf", name: "Bookshelf", w: 80, d: 30, color: "#8b6f47", category: "furniture" },
  { id: "curtain", name: "Curtain", w: 120, d: 3, color: "#9f7aea", category: "accessory" },
  { id: "plant", name: "Plant", w: 25, d: 25, color: "#48bb78", category: "accessory" },
  { id: "diploma_frame", name: "Diploma", w: 40, d: 2, color: "#d4a373", category: "accessory" },
];

/* ======================================================== PHOTO UPLOAD == */
function PhotoUpload({ photos, setPhotos, analyzing, onAnalyze }) {
  function handleFile(index, file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;
    const next = [...photos];
    next[index] = { file, preview: URL.createObjectURL(file) };
    setPhotos(next);
  }

  const hasPhotos = photos.some(Boolean);

  return (
    <div className="zrc-upload">
      <h3>Upload Room Photos</h3>
      <p className="note">Upload up to 5 photos from different angles. JPEG, PNG, or WebP, max 10 MB each.</p>
      <div className="zrc-slots">
        {PHOTO_SLOTS.map((slot, i) => (
          <label key={slot} className={`zrc-slot ${photos[i] ? "zrc-slot--filled" : ""}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => handleFile(i, e.target.files?.[0])} />
            {photos[i] ? (
              <img src={photos[i].preview} alt={slot} />
            ) : (
              <div className="zrc-slot__empty">
                <span className="zrc-slot__icon">+</span>
                <span className="zrc-slot__label">{slot}</span>
              </div>
            )}
          </label>
        ))}
      </div>
      {hasPhotos && (
        <button className="primary" onClick={onAnalyze} disabled={analyzing} style={{ marginTop: 12 }}>
          {analyzing ? "Analyzing..." : "Analyze My Room"}
        </button>
      )}
    </div>
  );
}

/* ======================================================== SCORE CARD == */
function ScoreCard({ scores, overall, observations }) {
  const categories = {
    lighting: "Lighting",
    background: "Background",
    camera_angle: "Camera Angle",
    audio_environment: "Audio Environment",
    privacy: "Privacy",
  };
  return (
    <div className="zrc-scores">
      <div className="zrc-overall">
        <div className="zrc-overall__grade" style={{ color: GRADE_COLORS[overall] || "#f59e0b" }}>
          {overall}
        </div>
        <div className="zrc-overall__label">Overall Grade</div>
      </div>
      <div className="zrc-score-bars">
        {Object.entries(categories).map(([key, label]) => {
          const grade = scores[key] || "?";
          return (
            <div key={key} className="zrc-bar">
              <span className="zrc-bar__label">{label}</span>
              <span className="zrc-bar__grade" style={{ color: GRADE_COLORS[grade] }}>{grade}</span>
            </div>
          );
        })}
      </div>
      {observations && <p className="note" style={{ marginTop: 10 }}>{observations}</p>}
    </div>
  );
}

/* ======================================================== ISSUES LIST == */
function IssuesList({ issues }) {
  if (!issues || issues.length === 0) return null;
  const severityIcon = { critical: "!!", warning: "!", suggestion: "~" };
  const severityColor = { critical: "#ef4444", warning: "#f59e0b", suggestion: "#818cf8" };
  return (
    <div className="zrc-issues">
      <h3>Issues Found ({issues.length})</h3>
      {issues.map((issue, i) => (
        <div key={i} className="zrc-issue">
          <span className="zrc-issue__sev" style={{ color: severityColor[issue.severity] }}>
            {severityIcon[issue.severity]}
          </span>
          <div>
            <div className="zrc-issue__desc">{issue.description}</div>
            <div className="zrc-issue__fix">{issue.fix}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================== CHAT UI == */
function ChatUI({ analysisId, chatHistory, setChatHistory }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function send() {
    if (!message.trim() || sending) return;
    const userMsg = message.trim();
    setMessage("");
    setChatHistory((h) => [...h, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const resp = await fetch(API + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId, message: userMsg }),
      });
      const data = await resp.json();
      setChatHistory((h) => [...h, { role: "assistant", content: data.reply || "Unable to respond." }]);
    } catch {
      setChatHistory((h) => [...h, { role: "assistant", content: "Connection error. Check if copilot-svc is running on port 8605." }]);
    }
    setSending(false);
  }

  return (
    <div className="zrc-chat">
      <h3>Ask the Co-Pilot</h3>
      <div className="zrc-chat__messages">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`zrc-chat__msg zrc-chat__msg--${msg.role}`}>
            <span className="zrc-chat__who">{msg.role === "user" ? "You" : "Co-Pilot"}</span>
            {msg.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="zrc-chat__input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your room setup..."
          disabled={sending}
        />
        <button className="primary" onClick={send} disabled={sending || !message.trim()}>
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

/* ======================================================== 2D CANVAS == */
function RoomCanvas({ room, placements, setPlacements }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const SCALE = 100; // 1m = 100px
  const cW = room.width_m * SCALE;
  const cH = room.depth_m * SCALE;
  const PAD = 40;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Room outline
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD, PAD, cW, cH);

    // Grid (0.5m)
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= cW; x += 50) {
      ctx.beginPath();
      ctx.moveTo(PAD + x, PAD);
      ctx.lineTo(PAD + x, PAD + cH);
      ctx.stroke();
    }
    for (let y = 0; y <= cH; y += 50) {
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + y);
      ctx.lineTo(PAD + cW, PAD + y);
      ctx.stroke();
    }

    // Room labels
    ctx.fillStyle = "#555";
    ctx.font = "11px monospace";
    ctx.fillText(`${room.width_m}m`, PAD + cW / 2 - 10, PAD - 8);
    ctx.save();
    ctx.translate(PAD - 8, PAD + cH / 2 + 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${room.depth_m}m`, 0, 0);
    ctx.restore();

    // Door indicator
    ctx.fillStyle = "#8b6f47";
    ctx.fillRect(PAD + cW - 40, PAD + cH - 2, 35, 4);
    ctx.fillStyle = "#666";
    ctx.font = "9px monospace";
    ctx.fillText("DOOR", PAD + cW - 38, PAD + cH + 12);

    // Window indicator
    ctx.fillStyle = "#7ea8d4";
    ctx.fillRect(PAD + 20, PAD - 2, 80, 4);
    ctx.fillStyle = "#666";
    ctx.fillText("WINDOW", PAD + 30, PAD - 8);

    // Equipment
    placements.forEach((p, i) => {
      const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
      if (!eq) return;
      const px = PAD + p.x * SCALE;
      const py = PAD + p.y * SCALE;
      const pw = eq.w * SCALE / 100;
      const ph = eq.d * SCALE / 100;

      ctx.fillStyle = eq.color + "cc";
      ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
      ctx.strokeStyle = dragging === i ? "#f59e0b" : "#888";
      ctx.lineWidth = dragging === i ? 2 : 1;
      ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);

      ctx.fillStyle = "#eee";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(eq.name, px, py + 3);
      ctx.textAlign = "start";
    });

    // "Camera" position (the virtual subject position)
    const chair = placements.find((p) => p.equipment_id === "chair_office");
    if (chair) {
      const cx = PAD + chair.x * SCALE;
      const cy = PAD + chair.y * SCALE;
      ctx.beginPath();
      ctx.arc(cx, cy - 30, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#e0a458";
      ctx.fill();
      ctx.fillStyle = "#e0a458";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("YOU", cx, cy - 42);
      ctx.textAlign = "start";
    }
  }, [placements, dragging, room, cW, cH]);

  useEffect(() => { draw(); }, [draw]);

  function getMousePos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - PAD) / SCALE,
      y: (e.clientY - rect.top - PAD) / SCALE,
    };
  }

  function handleMouseDown(e) {
    const pos = getMousePos(e);
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      const eq = EQUIPMENT.find((eq) => eq.id === p.equipment_id);
      if (!eq) continue;
      const hw = (eq.w / 100) / 2;
      const hd = (eq.d / 100) / 2;
      if (pos.x >= p.x - hw && pos.x <= p.x + hw && pos.y >= p.y - hd && pos.y <= p.y + hd) {
        setDragging(i);
        setDragOffset({ x: pos.x - p.x, y: pos.y - p.y });
        return;
      }
    }
  }

  function handleMouseMove(e) {
    if (dragging === null) return;
    const pos = getMousePos(e);
    const snap = 0.1; // 10cm grid snap
    const nx = Math.round((pos.x - dragOffset.x) / snap) * snap;
    const ny = Math.round((pos.y - dragOffset.y) / snap) * snap;
    const clamped = {
      x: Math.max(0.3, Math.min(room.width_m - 0.3, nx)),
      y: Math.max(0.3, Math.min(room.depth_m - 0.3, ny)),
    };
    setPlacements((prev) => prev.map((p, i) => i === dragging ? { ...p, ...clamped } : p));
  }

  function handleMouseUp() { setDragging(null); }

  function addEquipment(eqId) {
    const exists = placements.some((p) => p.equipment_id === eqId);
    setPlacements((prev) => [
      ...prev,
      {
        equipment_id: eqId,
        x: room.width_m / 2 + (exists ? Math.random() * 0.5 : 0),
        y: room.depth_m / 2 + (exists ? Math.random() * 0.5 : 0),
        rotation: 0,
      },
    ]);
  }

  function removeEquipment(index) {
    setPlacements((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="zrc-canvas-wrap">
      <h3>2D Room Planner</h3>
      <p className="note">Click equipment below to add, then drag to position. Grid snaps to 10cm.</p>

      <div className="zrc-eq-palette">
        {EQUIPMENT.map((eq) => (
          <button key={eq.id} className="chip" onClick={() => addEquipment(eq.id)}
            style={{ borderColor: eq.color, fontSize: 12 }}>
            + {eq.name}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={cW + PAD * 2}
        height={cH + PAD * 2}
        className="zrc-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {placements.length > 0 && (
        <div className="zrc-placed">
          <h4>Placed Equipment</h4>
          {placements.map((p, i) => {
            const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
            return (
              <div key={i} className="zrc-placed__item">
                <span style={{ color: eq?.color }}>{eq?.name}</span>
                <span className="mono" style={{ fontSize: 11, color: "#888" }}>
                  ({p.x.toFixed(1)}, {p.y.toFixed(1)})m
                </span>
                <button className="zrc-placed__rm" onClick={() => removeEquipment(i)}>x</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================== PAGE == */
export default function CopilotPage() {
  const [photos, setPhotos] = useState(Array(5).fill(null));
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [tab, setTab] = useState("upload"); // upload | results | planner
  const [room, setRoom] = useState({ width_m: 4.0, depth_m: 3.5, height_m: 2.7 });
  const [placements, setPlacements] = useState([
    { equipment_id: "desk_standard", x: 2.0, y: 2.8, rotation: 0 },
    { equipment_id: "chair_office", x: 2.0, y: 2.2, rotation: 0 },
    { equipment_id: "monitor_24", x: 2.0, y: 3.0, rotation: 0 },
    { equipment_id: "webcam_hd", x: 2.0, y: 3.1, rotation: 0 },
    { equipment_id: "ringlight_18", x: 2.0, y: 3.3, rotation: 0 },
    { equipment_id: "mic_usb", x: 2.3, y: 2.6, rotation: 0 },
  ]);
  const [validation, setValidation] = useState(null);

  async function handleAnalyze() {
    const files = photos.filter(Boolean);
    if (!files.length) return;
    setAnalyzing(true);

    try {
      const form = new FormData();
      files.forEach((p) => form.append("photos", p.file));
      form.append("notes", "");

      const resp = await fetch(API + "/analyze", { method: "POST", body: form });
      const data = await resp.json();
      setAnalysis(data);

      if (data.room_estimate) {
        setRoom({
          width_m: data.room_estimate.width_m || 4.0,
          depth_m: data.room_estimate.depth_m || 3.5,
          height_m: data.room_estimate.height_m || 2.7,
        });
      }

      setChatHistory([{
        role: "assistant",
        content: `Room analyzed! Overall grade: ${data.overall_grade}. ${data.issues?.length || 0} issues found. ${data.observations || ""} Ask me anything about improving your setup.`,
      }]);
      setTab("results");
    } catch (err) {
      setAnalysis({
        scores: { lighting: "?", background: "?", camera_angle: "?", audio_environment: "?", privacy: "?" },
        issues: [{ category: "connection", severity: "critical", description: "Could not connect to copilot-svc", fix: "Start zoom-copilot-svc on port 8605" }],
        overall_grade: "?",
        observations: "Service unavailable. Start the backend: cd services/zoom-copilot-svc && python main.py",
      });
      setTab("results");
    }
    setAnalyzing(false);
  }

  async function handleValidate() {
    try {
      const resp = await fetch(API + "/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, placements }),
      });
      setValidation(await resp.json());
    } catch {
      setValidation({
        rules: [{ id: "ERR", name: "Connection", verdict: "FAIL", detail: "Cannot reach copilot-svc" }],
        pass_count: 0, total: 1, all_pass: false,
      });
    }
  }

  const TABS = [
    { id: "upload", label: "Upload" },
    { id: "results", label: "Results" },
    { id: "planner", label: "Room Planner" },
  ];

  return (
    <article className="zoom-room">
      <span className="eyebrow">AI Co-Pilot</span>
      <h1>Zoom Room Analyzer</h1>
      <p className="note">
        Upload photos of your room for AI-powered analysis, then use the 2D planner
        to design your optimal Zoom Room layout.
      </p>

      <div className="zr-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`zr-tab ${tab === t.id ? "zr-tab--active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <PhotoUpload photos={photos} setPhotos={setPhotos}
          analyzing={analyzing} onAnalyze={handleAnalyze} />
      )}

      {tab === "results" && analysis && (
        <div className="zrc-results">
          <ScoreCard scores={analysis.scores} overall={analysis.overall_grade}
            observations={analysis.observations} />
          <IssuesList issues={analysis.issues} />
          {analysis.id && (
            <ChatUI analysisId={analysis.id} chatHistory={chatHistory}
              setChatHistory={setChatHistory} />
          )}
          <p className="note" style={{ marginTop: 16 }}>
            Source: {analysis.source || "unknown"} | Model: {analysis.model || "n/a"} |
            Latency: {analysis.latency_ms || 0}ms | Advisory only
          </p>
        </div>
      )}

      {tab === "planner" && (
        <div className="zrc-planner">
          <div className="zrc-room-config">
            <label>
              Width (m)
              <input type="number" value={room.width_m} min={2} max={8} step={0.5}
                onChange={(e) => setRoom((r) => ({ ...r, width_m: +e.target.value }))} />
            </label>
            <label>
              Depth (m)
              <input type="number" value={room.depth_m} min={2} max={8} step={0.5}
                onChange={(e) => setRoom((r) => ({ ...r, depth_m: +e.target.value }))} />
            </label>
            <button className="chip" onClick={handleValidate}>Validate Layout</button>
          </div>

          <RoomCanvas room={room} placements={placements} setPlacements={setPlacements} />

          {validation && (
            <div className="zrc-validation">
              <h3>
                Validation: {validation.pass_count}/{validation.total} rules pass
                {validation.all_pass && <span style={{ color: "#4ade80", marginLeft: 8 }}>All Clear</span>}
              </h3>
              {validation.rules.map((r) => (
                <div key={r.id} className={`zrc-rule zrc-rule--${r.verdict.toLowerCase()}`}>
                  <span className="zrc-rule__id">{r.id}</span>
                  <span className="zrc-rule__name">{r.name}</span>
                  <span className={`zrc-rule__verdict zrc-rule__verdict--${r.verdict.toLowerCase()}`}>
                    {r.verdict}
                  </span>
                  <span className="zrc-rule__detail">{r.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
