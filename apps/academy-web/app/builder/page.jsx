"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_BUILDER_API || "http://localhost:8606";

const TABS = [
  { id: "chat", label: "AI Assistant" },
  { id: "docs", label: "Doc Generator" },
  { id: "clients", label: "Client Data" },
  { id: "context", label: "Context Files" },
];

export default function BuilderStudio() {
  const [tab, setTab] = useState("chat");

  return (
    <article>
      <div className="studio-head">
        <div>
          <span className="eyebrow">Builder Studio</span>
          <h1 style={{ margin: "8px 0 0" }}>
            Practice <em>Builder</em>
          </h1>
          <p style={{ fontSize: 12, color: "var(--mist)", marginTop: 4 }}>
            AI-powered session prep, document generation, and practice automation
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "chip on" : "chip"}
            onClick={() => setTab(t.id)}
            style={{ fontSize: 11 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat" && <ChatPanel />}
      {tab === "docs" && <DocGeneratorPanel />}
      {tab === "clients" && <ClientDataPanel />}
      {tab === "context" && <ContextPanel />}
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CHAT PANEL — Context-aware Claude assistant
   ═══════════════════════════════════════════════════════════════════════ */
function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchSessions() {
    try {
      const r = await fetch(API + "/api/v1/sessions?limit=10");
      if (r.ok) setSessions(await r.json());
    } catch { /* offline */ }
  }

  async function loadSession(sid) {
    try {
      const r = await fetch(API + "/api/v1/sessions/" + sid);
      if (r.ok) {
        const data = await r.json();
        setSessionId(sid);
        setMessages(data.messages || []);
      }
    } catch { /* offline */ }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const r = await fetch(API + "/api/v1/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg, session_id: sessionId, continue_session: true }),
      });

      if (!r.ok) {
        const err = await r.text();
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Error: " + err }; return u; });
        setLoading(false);
        return;
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("
");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              assistantText += data.text;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistantText }; return u; });
            } else if (data.type === "done") {
              setSessionId(data.session_id);
              setStats({ tokens: data.total_tokens, model: data.model, cached: data.cache_read_input_tokens || 0 });
              fetchSessions();
            } else if (data.type === "error") {
              assistantText += "
Error: " + data.error;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistantText }; return u; });
            }
          } catch { /* partial JSON line */ }
        }
      }
    } catch (e) {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Connection error: " + e.message }; return u; });
    }
    setLoading(false);
  }

  function newSession() {
    setSessionId("");
    setMessages([]);
    setStats(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, minHeight: "60vh" }}>
      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="chip" onClick={newSession} style={{ fontSize: 10, marginBottom: 8 }}>+ New Session</button>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--dim)", marginBottom: 4 }}>Recent</div>
        {sessions.map((s) => (
          <button
            key={s.session_id}
            className="panel"
            onClick={() => loadSession(s.session_id)}
            style={{
              padding: "8px 10px", cursor: "pointer", textAlign: "left", border: "none",
              borderLeft: sessionId === s.session_id ? "2px solid var(--iris)" : "2px solid transparent",
              background: sessionId === s.session_id ? "rgba(139,127,212,.08)" : undefined,
              fontSize: 11, color: "#cfc9dd",
            }}
          >
            {s.title || s.session_id.slice(0, 8) + "..."}
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", marginTop: 2 }}>
              {s.token_count || 0} tokens
            </div>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="panel" style={{ flex: 1, padding: 16, minHeight: 400, maxHeight: "60vh", overflowY: "auto" }}>
          {messages.length === 0 && (
            <div style={{ color: "var(--mist)", textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Context-aware AI Assistant</div>
              <div style={{ fontSize: 11 }}>
                Ask about session prep, client analysis, treatment planning, or documentation.
                <br />Your workspace context (CLAUDE.md, memory) is automatically injected.
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12, display: "flex", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: m.role === "user" ? "var(--iris)" : "var(--teal)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--mono)", fontSize: 10, color: "#0e0d14", fontWeight: 700,
              }}>
                {m.role === "user" ? "J" : "AI"}
              </div>
              <div style={{ fontSize: 12, color: "#e0dced", lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1 }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ fontSize: 11, color: "var(--amber)", fontFamily: "var(--mono)" }}>
              streaming...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about session prep, treatment planning, documentation..."
            rows={2}
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: 8, padding: "10px 14px", color: "#e9e4f2", fontSize: 13,
              lineHeight: 1.5, resize: "none", fontFamily: "inherit",
            }}
          />
          <button className="primary" onClick={send} disabled={loading} style={{ padding: "10px 20px", fontSize: 12, alignSelf: "flex-end" }}>
            Send
          </button>
        </div>
        {stats && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", textAlign: "right" }}>
            {stats.model} | {stats.tokens} tokens{stats.cached ? " | " + stats.cached + " cached" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DOC GENERATOR PANEL
   ═══════════════════════════════════════════════════════════════════════ */
function DocGeneratorPanel() {
  const [clientJson, setClientJson] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!clientJson.trim()) return;
    setLoading(true);
    try {
      const data = JSON.parse(clientJson);
      const r = await fetch(API + "/api/v1/generate-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_data: data, session_index: 0 }),
      });
      if (r.ok) {
        setResult(await r.json());
      } else {
        setResult({ error: await r.text() });
      }
    } catch (e) {
      setResult({ error: "Invalid JSON: " + e.message });
    }
    setLoading(false);
  }

  function openDoc(html) {
    const w = window.open("", "_blank", "width=800,height=1000,scrollbars=yes");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--iris)", marginBottom: 8 }}>
          Paste Client JSON (or load from database)
        </div>
        <textarea
          value={clientJson}
          onChange={(e) => setClientJson(e.target.value)}
          rows={12}
          placeholder='Paste client JSON (same format as data/clients/DS-001.json)...'
          style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: 12, color: "#e9e4f2", fontSize: 11,
            fontFamily: "var(--mono)", lineHeight: 1.4, resize: "vertical",
          }}
        />
        <button className="primary" onClick={generate} disabled={loading} style={{ marginTop: 8, fontSize: 12, padding: "8px 16px" }}>
          {loading ? "Generating..." : "Generate All Documents"}
        </button>
      </div>

      {result && !result.error && (
        <div className="panel" style={{ padding: 16 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--ok)", marginBottom: 10 }}>
            Documents Generated
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {Object.entries(result.documents).map(([type, doc]) => (
              <button
                key={type}
                className="panel"
                onClick={() => openDoc(doc.html)}
                style={{ padding: "12px 14px", cursor: "pointer", textAlign: "left", border: "none" }}
              >
                <div style={{ font: "560 12px var(--body)", color: "#e9e4f2", textTransform: "capitalize" }}>
                  {type.replace(/_/g, " ")}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--iris)", marginTop: 4 }}>
                  Click to preview
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {result && result.error && (
        <div className="panel" style={{ padding: 16, borderLeft: "3px solid var(--red)" }}>
          <div style={{ fontSize: 12, color: "var(--red)" }}>{result.error}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CLIENT DATA PANEL
   ═══════════════════════════════════════════════════════════════════════ */
function ClientDataPanel() {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [clientJson, setClientJson] = useState("");

  async function loadClient(cid) {
    try {
      const r = await fetch(API + "/api/v1/clients/" + cid);
      if (r.ok) {
        const data = await r.json();
        setSelected(cid);
        setClientJson(JSON.stringify(data, null, 2));
      }
    } catch { /* offline */ }
  }

  async function saveClient() {
    if (!clientJson.trim()) return;
    try {
      const data = JSON.parse(clientJson);
      const cid = data.id || selected || "NEW-001";
      const r = await fetch(API + "/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: cid, data }),
      });
      if (r.ok) {
        setSelected(cid);
        alert("Saved: " + cid);
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--iris)", marginBottom: 8 }}>
          Client Data Editor {selected && <span style={{ color: "var(--ok)" }}> | {selected}</span>}
        </div>
        <textarea
          value={clientJson}
          onChange={(e) => setClientJson(e.target.value)}
          rows={20}
          placeholder="Paste or edit client JSON..."
          style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: 12, color: "#e9e4f2", fontSize: 11,
            fontFamily: "var(--mono)", lineHeight: 1.4, resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="primary" onClick={saveClient} style={{ fontSize: 12, padding: "8px 16px" }}>
            Save to Database
          </button>
          <button className="chip" onClick={() => loadClient("DS-001")} style={{ fontSize: 10 }}>
            Load DS-001
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT FILES PANEL
   ═══════════════════════════════════════════════════════════════════════ */
function ContextPanel() {
  const [files, setFiles] = useState([]);
  const [filename, setFilename] = useState("CLAUDE.md");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("context");

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    try {
      const r = await fetch(API + "/api/v1/context-files");
      if (r.ok) setFiles(await r.json());
    } catch { /* offline */ }
  }

  async function saveFile() {
    if (!filename.trim() || !content.trim()) return;
    try {
      const r = await fetch(API + "/api/v1/context-files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content, category }),
      });
      if (r.ok) {
        fetchFiles();
        alert("Saved: " + filename);
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", color: "var(--iris)", marginBottom: 8 }}>
          Workspace Context Files (injected into Claude system prompt)
        </div>

        {files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {files.map((f) => (
              <span key={f.filename} className="chip" style={{ fontSize: 10 }}>
                {f.filename} <span style={{ color: "var(--dim)" }}>({f.category})</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename (e.g. CLAUDE.md)"
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 12,
            }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: 6, padding: "6px 10px", color: "#e9e4f2", fontSize: 12,
            }}
          >
            <option value="context">context</option>
            <option value="prompt">prompt</option>
            <option value="template">template</option>
          </select>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="File content..."
          style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: 8, padding: 12, color: "#e9e4f2", fontSize: 11,
            fontFamily: "var(--mono)", lineHeight: 1.4, resize: "vertical",
          }}
        />
        <button className="primary" onClick={saveFile} style={{ marginTop: 8, fontSize: 12, padding: "8px 16px" }}>
          Save Context File
        </button>
      </div>
    </div>
  );
}
