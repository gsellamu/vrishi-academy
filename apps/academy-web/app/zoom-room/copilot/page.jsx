"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

/* ================================================================ CONFIG == */
const API = process.env.NEXT_PUBLIC_COPILOT_API || "http://localhost:8605";
const MAX_PHOTOS = 5;
const PHOTO_SLOTS = ["front", "left", "right", "behind", "overhead"];
const GRADE_COLORS = { A: "#4ade80", B: "#a3e635", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
const LS_KEY = "zoomCopilot:state";
const IDB_NAME = "zoomCopilotPhotos";
const IDB_STORE = "photos";

/* ============================================================= STORAGE == */
function loadLS() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveLS(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePhotosIDB(photos) {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  for (let i = 0; i < 5; i++) {
    if (photos[i]) {
      store.put({ data: photos[i].dataUrl, type: photos[i].file?.type || "image/jpeg" }, "photo_" + i);
    } else {
      store.delete("photo_" + i);
    }
  }
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
}

async function loadPhotosIDB() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const result = Array(5).fill(null);
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(new Promise((resolve) => {
        const req = store.get("photo_" + i);
        req.onsuccess = () => {
          if (req.result) {
            result[i] = { preview: req.result.data, dataUrl: req.result.data, restored: true };
          }
          resolve();
        };
        req.onerror = () => resolve();
      }));
    }
    await Promise.all(promises);
    return result;
  } catch { return Array(5).fill(null); }
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/* ============================================================ EQUIPMENT == */
const EQUIPMENT = [
  // Furniture
  { id: "desk_standard", name: "Desk", w: 120, d: 60, color: "#5c5470", category: "furniture" },
  { id: "chair_office", name: "Chair", w: 50, d: 50, color: "#6b5b7b", category: "furniture" },
  { id: "monitor_24", name: "Monitor", w: 55, d: 10, color: "#2d3748", category: "furniture" },
  { id: "bookshelf", name: "Bookshelf", w: 80, d: 30, color: "#8b6f47", category: "furniture" },
  // Camera & Lighting
  { id: "webcam_hd", name: "Webcam", w: 8, d: 5, color: "#e53e3e", category: "camera" },
  { id: "ringlight_18", name: "Ring Light", w: 46, d: 46, color: "#f6e05e", category: "light" },
  { id: "softbox", name: "Softbox", w: 40, d: 15, color: "#fbd38d", category: "light" },
  { id: "floodlight", name: "Floodlight", w: 20, d: 15, color: "#f6ad55", category: "light" },
  // Audio
  { id: "mic_usb", name: "USB Mic", w: 12, d: 12, color: "#4299e1", category: "mic" },
  { id: "boom_arm", name: "Boom Arm", w: 60, d: 5, color: "#718096", category: "mic" },
  // Accessories
  { id: "plant", name: "Plant", w: 25, d: 25, color: "#48bb78", category: "accessory" },
  { id: "diploma_frame", name: "Diploma", w: 40, d: 2, color: "#d4a373", category: "accessory" },
  // Backdrops & Wall Items
  { id: "curtain", name: "Curtain Panel", w: 120, d: 3, color: "#9f7aea", category: "backdrop", wall: true },
  { id: "backdrop_stand", name: "Backdrop Stand", w: 150, d: 5, color: "#b794f4", category: "backdrop" },
  { id: "fabric_cloth", name: "Fabric Cloth", w: 140, d: 2, color: "#c4b5fd", category: "backdrop", wall: true },
  { id: "wallpaper_panel", name: "Wallpaper Panel", w: 100, d: 1, color: "#a78bfa", category: "backdrop", wall: true },
  { id: "sound_curtain", name: "Sound Curtain", w: 120, d: 5, color: "#7c3aed", category: "backdrop" },
  { id: "acoustic_panel", name: "Acoustic Panel", w: 60, d: 5, color: "#6d28d9", category: "backdrop", wall: true },
  { id: "floor_lamp", name: "Floor Lamp", w: 20, d: 20, color: "#fbbf24", category: "backdrop" },
  // Wall-mounted decor
  { id: "floating_shelf", name: "Float Shelf", w: 80, d: 5, color: "#d4a373", category: "wall", wall: true },
  { id: "pendant_light", name: "Pendant", w: 15, d: 15, color: "#2d3748", category: "wall", wall: true },
  { id: "wall_frame", name: "Wall Frame", w: 40, d: 2, color: "#c4b5a0", category: "wall", wall: true },
  { id: "wall_plant", name: "Wall Plant", w: 30, d: 10, color: "#38a169", category: "wall", wall: true },
  { id: "wall_art", name: "Wall Art", w: 50, d: 2, color: "#e8a87c", category: "wall", wall: true },
  { id: "wall_clock", name: "Clock", w: 25, d: 3, color: "#a0aec0", category: "wall", wall: true },
];

const EQUIPMENT_CATEGORIES = [
  { key: "furniture", label: "Furniture" },
  { key: "camera", label: "Camera" },
  { key: "light", label: "Lighting" },
  { key: "mic", label: "Audio" },
  { key: "accessory", label: "Decor" },
  { key: "backdrop", label: "Backdrops" },
  { key: "wall", label: "Wall Decor" },
];

/* ======================================================== PHOTO UPLOAD == */
function PhotoUpload({ photos, setPhotos, analyzing, onAnalyze }) {
  const fileRefs = useRef([]);

  async function handleFile(index, file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;
    const dataUrl = await fileToDataUrl(file);
    const next = [...photos];
    next[index] = { file, preview: dataUrl, dataUrl };
    setPhotos(next);
  }

  function removePhoto(index, e) {
    e.preventDefault();
    e.stopPropagation();
    const next = [...photos];
    next[index] = null;
    setPhotos(next);
    if (fileRefs.current[index]) fileRefs.current[index].value = "";
  }

  function replacePhoto(index, e) {
    e.preventDefault();
    e.stopPropagation();
    if (fileRefs.current[index]) {
      fileRefs.current[index].value = "";
      fileRefs.current[index].click();
    }
  }

  const hasPhotos = photos.some(Boolean);

  return (
    <div className="zrc-upload">
      <h3>Upload Room Photos</h3>
      <p className="note">Upload up to 5 photos from different angles. JPEG, PNG, or WebP, max 10 MB each.</p>
      <div className="zrc-slots">
        {PHOTO_SLOTS.map((slot, i) => (
          <div key={slot} className={`zrc-slot ${photos[i] ? "zrc-slot--filled" : ""}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden
              ref={(el) => (fileRefs.current[i] = el)}
              onChange={(e) => handleFile(i, e.target.files?.[0])} />
            {photos[i] ? (
              <>
                <img src={photos[i].preview} alt={slot} onClick={(e) => replacePhoto(i, e)} title="Click to replace" />
                <button className="zrc-slot__remove" onClick={(e) => removePhoto(i, e)} title="Remove photo">&times;</button>
                <span className="zrc-slot__replace" onClick={(e) => replacePhoto(i, e)}>Replace</span>
              </>
            ) : (
              <div className="zrc-slot__empty" onClick={() => fileRefs.current[i]?.click()}>
                <span className="zrc-slot__icon">+</span>
                <span className="zrc-slot__label">{slot}</span>
              </div>
            )}
          </div>
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
function ScoreCard({ scores = {}, overall, observations }) {
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

    // Wall labels (top = back wall, bottom = front/camera wall)
    ctx.fillStyle = "#555";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("BACK WALL (camera sees)", PAD + cW / 2, PAD + cH + 22);
    ctx.fillText("FRONT (camera side)", PAD + cW / 2, PAD - 18);
    ctx.textAlign = "start";

    // Equipment
    placements.forEach((p, i) => {
      const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
      if (!eq) return;
      const px = PAD + p.x * SCALE;
      const py = PAD + p.y * SCALE;
      const pw = eq.w * SCALE / 100;
      const ph = eq.d * SCALE / 100;

      ctx.fillStyle = eq.color + "cc";

      if (eq.wall) {
        // Wall-mounted items: rounded rect with dashed border + pin icon
        ctx.beginPath();
        const r = 3;
        const x1 = px - pw / 2, y1 = py - ph / 2;
        ctx.moveTo(x1 + r, y1);
        ctx.lineTo(x1 + pw - r, y1);
        ctx.arcTo(x1 + pw, y1, x1 + pw, y1 + r, r);
        ctx.lineTo(x1 + pw, y1 + ph - r);
        ctx.arcTo(x1 + pw, y1 + ph, x1 + pw - r, y1 + ph, r);
        ctx.lineTo(x1 + r, y1 + ph);
        ctx.arcTo(x1, y1 + ph, x1, y1 + ph - r, r);
        ctx.lineTo(x1, y1 + r);
        ctx.arcTo(x1, y1, x1 + r, y1, r);
        ctx.closePath();
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = dragging === i ? "#f59e0b" : "#c4b5fd";
        ctx.lineWidth = dragging === i ? 2.5 : 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Pin dot
        ctx.beginPath();
        ctx.arc(px, y1 - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
      } else {
        // Floor items: solid rect
        ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
        ctx.strokeStyle = dragging === i ? "#f59e0b" : "#888";
        ctx.lineWidth = dragging === i ? 2 : 1;
        ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
      }

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

    const eq = EQUIPMENT.find((eq) => eq.id === placements[dragging]?.equipment_id);
    const WALL_SNAP = 0.3; // snap zone near walls

    let clampedX = Math.max(0.1, Math.min(room.width_m - 0.1, nx));
    let clampedY = Math.max(0.1, Math.min(room.depth_m - 0.1, ny));

    if (eq?.wall) {
      // Snap to nearest wall edge
      const distTop = ny;
      const distBottom = room.depth_m - ny;
      const distLeft = nx;
      const distRight = room.width_m - nx;
      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      if (minDist < WALL_SNAP || minDist === distBottom) {
        // Default to back wall; snap to whichever wall is closest
        if (minDist === distTop) clampedY = 0.05;
        else if (minDist === distLeft) clampedX = 0.05;
        else if (minDist === distRight) clampedX = room.width_m - 0.05;
        else clampedY = room.depth_m - 0.05; // back wall
      }
    }

    setPlacements((prev) => prev.map((p, i) => i === dragging ? { ...p, x: clampedX, y: clampedY } : p));
  }

  function handleMouseUp() { setDragging(null); }

  function addEquipment(eqId) {
    const eq = EQUIPMENT.find((e) => e.id === eqId);
    const exists = placements.some((p) => p.equipment_id === eqId);
    const jitter = exists ? Math.random() * 0.5 - 0.25 : 0;

    // Wall items snap to back wall (high y = bottom of canvas = wall camera faces)
    const isWall = eq?.wall;
    const wallCount = placements.filter((p) => {
      const pe = EQUIPMENT.find((e) => e.id === p.equipment_id);
      return pe?.wall && p.y > room.depth_m - 0.3;
    }).length;

    setPlacements((prev) => [
      ...prev,
      {
        equipment_id: eqId,
        x: isWall
          ? Math.min(room.width_m - 0.3, 0.5 + wallCount * 1.0 + jitter)
          : room.width_m / 2 + jitter,
        y: isWall
          ? room.depth_m - 0.05
          : room.depth_m / 2 + jitter,
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
        {EQUIPMENT_CATEGORIES.map((cat) => {
          const items = EQUIPMENT.filter((eq) => eq.category === cat.key);
          if (!items.length) return null;
          return (
            <div key={cat.key} className="zrc-eq-group">
              <span className="zrc-eq-group__label">{cat.label}</span>
              {items.map((eq) => (
                <button key={eq.id} className="chip" onClick={() => addEquipment(eq.id)}
                  style={{ borderColor: eq.color, fontSize: 12 }}>
                  + {eq.name}
                </button>
              ))}
            </div>
          );
        })}
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
                {eq?.wall && <span className="zrc-placed__wall">wall</span>}
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

/* ================================================ WALL ELEVATION VIEW == */
function WallElevation({ room, placements }) {
  const canvasRef = useRef(null);
  const SCALE = 100;
  const wW = room.width_m * SCALE;
  const wH = room.height_m * SCALE;
  const PAD = 40;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Wall background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(PAD, PAD, wW, wH);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD, PAD, wW, wH);

    // Grid (0.5m)
    ctx.strokeStyle = "#252540";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= wW; x += 50) {
      ctx.beginPath(); ctx.moveTo(PAD + x, PAD); ctx.lineTo(PAD + x, PAD + wH); ctx.stroke();
    }
    for (let y = 0; y <= wH; y += 50) {
      ctx.beginPath(); ctx.moveTo(PAD, PAD + y); ctx.lineTo(PAD + wW, PAD + y); ctx.stroke();
    }

    // Height labels
    ctx.fillStyle = "#555";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(room.width_m + "m", PAD + wW / 2, PAD - 8);
    ctx.textAlign = "start";
    ctx.save();
    ctx.translate(PAD - 8, PAD + wH / 2 + 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(room.height_m + "m", 0, 0);
    ctx.restore();

    // Height reference lines
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#4a4a6a";
    ctx.lineWidth = 1;
    // Seated eye level ~1.2m from floor = wH - 1.2 * SCALE from top
    const eyeY = PAD + wH - 1.2 * SCALE;
    ctx.beginPath(); ctx.moveTo(PAD, eyeY); ctx.lineTo(PAD + wW, eyeY); ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.font = "9px monospace";
    ctx.fillText("seated eye level (1.2m)", PAD + 4, eyeY - 4);

    // Certificate ideal height ~1.2m (4 feet)
    const certY = PAD + wH - 1.22 * SCALE;
    ctx.fillStyle = "#d4a37388";
    ctx.fillText("cert height (4ft)", PAD + wW - 90, certY - 4);
    ctx.setLineDash([]);

    // Camera frame guide (16:9 aspect centered, ~medium close-up)
    const frameW = wW * 0.55;
    const frameH = frameW * 9 / 16;
    const frameX = PAD + (wW - frameW) / 2;
    const frameY = PAD + wH - frameH - 0.4 * SCALE;
    ctx.strokeStyle = "#e53e3e55";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(frameX, frameY, frameW, frameH);
    ctx.setLineDash([]);
    ctx.fillStyle = "#e53e3e88";
    ctx.font = "9px monospace";
    ctx.fillText("16:9 camera frame", frameX + 4, frameY - 4);

    // Wall-mounted items on back wall
    const wallItems = placements.filter((p) => {
      const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
      return eq?.wall && p.y > room.depth_m - 0.3;
    });

    // Assign default vertical positions based on item type
    const WALL_HEIGHTS = {
      pendant_light: 2.3, floating_shelf: 1.4, wall_frame: 1.2,
      wall_art: 1.5, wall_plant: 1.6, wall_clock: 1.7,
      curtain: 1.8, fabric_cloth: 1.3, wallpaper_panel: 1.3,
      acoustic_panel: 1.0, diploma_frame: 1.2,
    };

    wallItems.forEach((p, idx) => {
      const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
      if (!eq) return;
      const pw = eq.w * SCALE / 100;
      // Use width as height on elevation (wall items are flat, show face-on)
      const ph = Math.max(pw * 0.4, 15);
      const px = PAD + p.x * SCALE;
      // Vertical position: use type-specific default or eye level
      const defaultH = WALL_HEIGHTS[eq.id] || 1.2;
      const wallY = p.wallY != null
        ? PAD + wH - p.wallY * SCALE
        : PAD + wH - defaultH * SCALE;

      ctx.fillStyle = eq.color + "cc";
      const r = 4;
      const x1 = px - pw / 2, y1 = wallY - ph / 2;
      ctx.beginPath();
      ctx.moveTo(x1 + r, y1);
      ctx.lineTo(x1 + pw - r, y1);
      ctx.arcTo(x1 + pw, y1, x1 + pw, y1 + r, r);
      ctx.lineTo(x1 + pw, y1 + ph - r);
      ctx.arcTo(x1 + pw, y1 + ph, x1 + pw - r, y1 + ph, r);
      ctx.lineTo(x1 + r, y1 + ph);
      ctx.arcTo(x1, y1 + ph, x1, y1 + ph - r, r);
      ctx.lineTo(x1, y1 + r);
      ctx.arcTo(x1, y1, x1 + r, y1, r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c4b5fd";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#eee";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(eq.name, px, wallY + 3);
      ctx.textAlign = "start";
    });

    // Floor items visible in background (non-wall items near back wall)
    const bgFloorItems = placements.filter((p) => {
      const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
      return !eq?.wall && p.y > room.depth_m * 0.6;
    });

    bgFloorItems.forEach((p) => {
      const eq = EQUIPMENT.find((e) => e.id === p.equipment_id);
      if (!eq) return;
      const pw = eq.w * SCALE / 100;
      const ph = Math.max(pw * 0.6, 20);
      const px = PAD + p.x * SCALE;
      const floorY = PAD + wH - ph;

      ctx.fillStyle = eq.color + "66";
      ctx.fillRect(px - pw / 2, floorY, pw, ph);
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.strokeRect(px - pw / 2, floorY, pw, ph);

      ctx.fillStyle = "#aaa";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(eq.name, px, floorY + ph / 2 + 3);
      ctx.textAlign = "start";
    });
  }, [placements, room, wW, wH]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="zrc-elevation-wrap">
      <h4>Back Wall Elevation (Camera View)</h4>
      <p className="note">Front-facing view of your back wall. Wall-mounted items appear at seated eye level.
        Floor items near the back wall show as silhouettes.</p>
      <canvas ref={canvasRef} width={wW + PAD * 2} height={wH + PAD * 2} className="zrc-canvas" />
    </div>
  );
}

/* ============================================================== PAGE == */
const DEFAULT_PLACEMENTS = [
  { equipment_id: "desk_standard", x: 2.0, y: 2.8, rotation: 0 },
  { equipment_id: "chair_office", x: 2.0, y: 2.2, rotation: 0 },
  { equipment_id: "monitor_24", x: 2.0, y: 3.0, rotation: 0 },
  { equipment_id: "webcam_hd", x: 2.0, y: 3.1, rotation: 0 },
  { equipment_id: "ringlight_18", x: 2.0, y: 3.3, rotation: 0 },
  { equipment_id: "mic_usb", x: 2.3, y: 2.6, rotation: 0 },
];

export default function CopilotPage() {
  const [loaded, setLoaded] = useState(false);
  const [photos, setPhotos] = useState(Array(5).fill(null));
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [tab, setTab] = useState("upload"); // upload | results | planner | backdrops
  const [room, setRoom] = useState({ width_m: 4.0, depth_m: 3.5, height_m: 2.7 });
  const [placements, setPlacements] = useState(DEFAULT_PLACEMENTS);
  const [validation, setValidation] = useState(null);

  // Load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = loadLS();
        if (saved.room) setRoom(saved.room);
        if (saved.placements) setPlacements(saved.placements);
        if (saved.analysis) setAnalysis(saved.analysis);
        if (saved.chatHistory) setChatHistory(saved.chatHistory);
        if (saved.tab) setTab(saved.tab);

        const restored = await loadPhotosIDB();
        if (restored.some(Boolean)) setPhotos(restored);
      } catch { /* first visit, use defaults */ }
      setLoaded(true);
    })();
  }, []);

  // Save JSON state to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    saveLS({ room, placements, analysis, chatHistory, tab });
  }, [loaded, room, placements, analysis, chatHistory, tab]);

  // Save photos to IndexedDB on change
  useEffect(() => {
    if (!loaded) return;
    savePhotosIDB(photos).catch(() => {});
  }, [loaded, photos]);

  async function handleAnalyze() {
    const files = photos.filter(Boolean);
    if (!files.length) return;
    setAnalyzing(true);

    try {
      const form = new FormData();
      for (const p of files) {
        if (p.file) {
          form.append("photos", p.file);
        } else if (p.dataUrl) {
          // Restored from IDB -- convert dataUrl back to Blob
          const resp = await fetch(p.dataUrl);
          const blob = await resp.blob();
          form.append("photos", blob, "restored.jpg");
        }
      }
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

  function handleClearAll() {
    setPhotos(Array(5).fill(null));
    setAnalysis(null);
    setChatHistory([]);
    setRoom({ width_m: 4.0, depth_m: 3.5, height_m: 2.7 });
    setPlacements(DEFAULT_PLACEMENTS);
    setValidation(null);
    setTab("upload");
    try { localStorage.removeItem(LS_KEY); } catch {}
    openIDB().then((db) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
    }).catch(() => {});
  }

  const TABS = [
    { id: "upload", label: "Upload" },
    { id: "results", label: "Results" },
    { id: "planner", label: "Room Planner" },
    { id: "backdrops", label: "Backdrops" },
  ];

  if (!loaded) return <article className="zoom-room"><p>Loading...</p></article>;

  return (
    <article className="zoom-room">
      <Link href="/zoom-room" className="zr-back-link">&larr; Zoom Room Guide</Link>
      <span className="eyebrow">AI Co-Pilot</span>
      <h1>Zoom Room Analyzer</h1>
      <p className="note">
        Upload photos of your room for AI-powered analysis, then use the 2D planner
        to design your optimal Zoom Room layout.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="zr-tabs" role="tablist" style={{ flex: 1 }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id}
              className={`zr-tab ${tab === t.id ? "zr-tab--active" : ""}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={handleClearAll} className="chip"
          style={{ fontSize: 11, opacity: 0.7 }}>
          Reset All
        </button>
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

          {placements.some((p) => { const eq = EQUIPMENT.find((e) => e.id === p.equipment_id); return eq?.wall; }) && (
            <WallElevation room={room} placements={placements} />
          )}

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

      {tab === "backdrops" && (
        <div className="zrc-backdrops">
          <h3>Make-Up Backgrounds</h3>
          <p className="note">
            Transform any corner into a professional therapy office.
            Kappas: &ldquo;It&rsquo;s all compacted in the corner of the room &mdash;
            only about 7 feet behind me but it looks 20 feet deep.&rdquo;
          </p>

          <div className="zrc-backdrop-grid">
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#b794f4" }}>T</div>
              <h4>Backdrop Stand + Fabric</h4>
              <p>T-stand or tripod backdrop frame (adjustable 5-8 ft) with muslin or polyester
                cloth. Choose warm neutral tones &mdash; charcoal, navy, burgundy, or forest green.
                Portable: Darla travels with hers to hotel rooms.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$30-60</span>
                <span className="chip">Portable</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#9f7aea" }}>C</div>
              <h4>Heavy Curtain Panel</h4>
              <p>Blackout curtain on a tension rod or ceiling track. Does double duty: visual
                backdrop AND sound absorption. Carr: &ldquo;Has to be a big thick curtain &mdash;
                velvety or blackout. Get them from Wayfair.&rdquo;
                Place one BEHIND you (visual) and one behind your monitor (sound catch).</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$25-50</span>
                <span className="chip">Sound + Visual</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#a78bfa" }}>W</div>
              <h4>Peel-and-Stick Wallpaper</h4>
              <p>Removable wallpaper panels in textured or patterned designs. Apply to the wall
                directly behind your seated position. Great for renters &mdash; peels off clean.
                Choose subtle textures: linen, faux brick, wood grain, or muted botanical.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$20-40/panel</span>
                <span className="chip">Permanent look, removable</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#fbbf24" }}>L</div>
              <h4>Depth Lighting (Kappas Trick)</h4>
              <p>Inexpensive patio floodlight or floor lamp placed behind/beside you in a corner.
                Kappas: &ldquo;I have special lighting out in the patio to give it even more depth.
                It looks like it&rsquo;s 20 feet deep and it&rsquo;s not a huge room.&rdquo;
                Turn on only when Zooming &mdash; too much for real life.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$15-30</span>
                <span className="chip">Depth illusion</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#6d28d9" }}>A</div>
              <h4>Acoustic Foam / Bass Trap Panels</h4>
              <p>Decorative sound-absorbing panels on walls. Can look attractive &mdash;
                PET-based trap panels come in colors and patterns. Place on walls flanking
                your seating area. Reduces flutter echo in corner setups.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$20-40</span>
                <span className="chip">Sound treatment</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#d4a373" }}>D</div>
              <h4>Certificate / Diploma Wall</h4>
              <p>HMI diploma + AHA certification hung LOW at seated eye level (~4 feet from floor,
                not standing height). Carr: &ldquo;Overtly and subliminally communicates expertise.&rdquo;
                One or two certificates is enough &mdash; Kappas: &ldquo;Don&rsquo;t overdo it.&rdquo;</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$10-25/frame</span>
                <span className="chip">Authority signal</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#48bb78" }}>P</div>
              <h4>Staged Corner Setup</h4>
              <p>Small table with plant + lamp in background corner. Carr: &ldquo;Lamp behind you
                in the corner makes it look like a whole other room.&rdquo; Use the corner of a
                bedroom or office &mdash; angled shot adds depth. Keep it compact but intentional.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$20-50</span>
                <span className="chip">Carr recommended</span>
              </div>
            </div>

            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#718096" }}>S</div>
              <h4>Sound Blanket (Behind Camera)</h4>
              <p>Heavy moving blanket or comforter hung behind your monitor/camera. Invisible on
                Zoom but catches sound bouncing off the wall behind you. Carr: &ldquo;Think of sound
                like water splashing &mdash; it goes past you, hits the wall, bounces back into mic.&rdquo;</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$15-25</span>
                <span className="chip">Sound catch</span>
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>HMI-Recommended Backdrop Products</h3>
          <p className="note">Official AHA/HMI Zoom background recommendations. Kappas: &ldquo;Create your
            professional Zoom room for $20.&rdquo;</p>
          <div className="zrc-backdrop-grid">
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#8b6f47" }}>B</div>
              <h4>8x6ft Fabric Bookshelf Backdrop</h4>
              <p>Interior shelves with books and decor. Instant &ldquo;therapy office&rdquo; look without
                owning a bookshelf. Hang on backdrop stand or pin to wall.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">HMI Recommended</span>
                <span className="chip">Backdrop</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#a0aec0" }}>B</div>
              <h4>MEHOFOND White Bookshelf Backdrop</h4>
              <p>White bookcase design. Clean, professional aesthetic that photographs well
                on camera. Pairs with warm accent lighting.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">HMI Recommended</span>
                <span className="chip">Backdrop</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#5c5470" }}>S</div>
              <h4>Leyiyi 7x5ft Modern Study Backdrop</h4>
              <p>Photography background with modern study/library look. Medium size,
                good for compact corner setups.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">HMI Recommended</span>
                <span className="chip">Backdrop</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#2d3748" }}>O</div>
              <h4>DASHAN 12x8ft Office Window Backdrop</h4>
              <p>Modern business office with window view. Extra-large polyester backdrop for
                deep-shot staging. Professional corporate therapy look.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">HMI Recommended</span>
                <span className="chip">Backdrop</span>
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>HMI-Recommended Equipment</h3>
          <p className="note">Official equipment list from AHA Zoom Room workbook.</p>
          <div className="zrc-backdrop-grid">
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#e53e3e" }}>W</div>
              <h4>Logitech Brio 4K Webcam</h4>
              <p>Ultra 4K HD video calling. Best-in-class webcam for sharp, professional image.
                Built-in HDR for variable lighting conditions.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">Camera</span>
                <span className="chip">HMI Recommended</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#4299e1" }}>M</div>
              <h4>Blue Yeti Studio Blackout</h4>
              <p>All-in-one USB condenser mic. The HMI studio standard. Cardioid mode for
                voice, multiple polar patterns. Just out of camera range (Kappas preference).</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$100-130</span>
                <span className="chip">Audio</span>
                <span className="chip">HMI Standard</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#f6e05e" }}>R</div>
              <h4>NEEWER 18&quot; Ring Light Kit</h4>
              <p>55W 5600K LED with stand and phone holder. Key front light for even
                face illumination. Move farther away if you wear glasses to avoid ring reflection.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">Lighting</span>
                <span className="chip">HMI Recommended</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#fbd38d" }}>E</div>
              <h4>NEEWER LED Bi-Color Edge Flapjack</h4>
              <p>Ultra-thin studio round light. Bi-color temperature control for warm/cool
                adjustment. Great for fill or contour lighting alongside ring light.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">Lighting</span>
                <span className="chip">HMI Recommended</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#f6ad55" }}>V</div>
              <h4>Feit Electric Vintage Amber Glass LED</h4>
              <p>Exposed filament warm amber bulb. Perfect for background depth lighting &mdash;
                Carr: &ldquo;Gold is usually very flattering, like beautiful morning light.&rdquo;</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$8-15</span>
                <span className="chip">Warm accent</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#718096" }}>D</div>
              <h4>LEPOWER Metal Desk Lamp</h4>
              <p>Adjustable goose neck table lamp. Budget-friendly directional fill light.
                Use for side lighting or as background accent lamp in corner staging.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">~$15-25</span>
                <span className="chip">Lighting</span>
              </div>
            </div>
            <div className="zrc-backdrop-card">
              <div className="zrc-backdrop-card__icon" style={{ background: "#9f7aea" }}>C</div>
              <h4>BOLING BL-P1 RGB LED</h4>
              <p>Full color camera/camcorder light. Compact, portable RGB panel for
                creative accent lighting and color wash effects. Travel-friendly.</p>
              <div className="zrc-backdrop-card__meta">
                <span className="chip">Lighting</span>
                <span className="chip">Portable</span>
              </div>
            </div>
          </div>

          <div className="zrc-backdrop-tips">
            <h4>HMI Pro Tips</h4>
            <ul>
              <li><strong>Make it permanent.</strong> Kappas: &ldquo;Have your setup permanent in your house.
                You don&rsquo;t have to take it down and put it up &mdash; it&rsquo;s a real pain. Flip, flip, flip and it&rsquo;s running.&rdquo;</li>
              <li><strong>Corner = depth.</strong> Position in a room corner. Even 7 feet of depth looks like 20 feet with proper staging and a background floodlight.</li>
              <li><strong>$20 Zoom room.</strong> Kappas demonstrates building a professional Zoom room for $20 using a fabric backdrop + clamps + warm bulb.</li>
              <li><strong>Overpower windows.</strong> Kappas: &ldquo;As long as you&rsquo;re the brightest thing, even a window &mdash; you can overpower it with light in front of you.&rdquo;</li>
              <li><strong>LED too hot?</strong> Carr: &ldquo;Put socks on them &mdash; cotton. It just tones them way down.&rdquo; (LED only, check heat.)</li>
              <li><strong>Mic technique.</strong> Record yourself on Zoom, play it back. Zoom won&rsquo;t let you hear yourself live. Practice soft hypno-voice range with your USB mic.</li>
              <li><strong>Travel kit.</strong> Ring light + USB mic + laptop = professional sessions from any hotel room. Choose a corner with curtains and furniture in background.</li>
              <li><strong>Client setup.</strong> Send clients the &ldquo;Ideal Setup&rdquo; diagram: desk chair for consultation, recliner for hypnosis, headphones, laptop propped on books for camera angle.</li>
            </ul>
          </div>

          <button className="primary" onClick={() => setTab("planner")} style={{ marginTop: 16 }}>
            Add to Room Planner
          </button>
        </div>
      )}
    </article>
  );
}
