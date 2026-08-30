"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAcademy } from "../../lib/academy-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, user } = useAcademy();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return (
      <section className="page-wrap" style={{ textAlign: "center", paddingTop: 80 }}>
        <h1>Signed in as {user.name}</h1>
        <p style={{ color: "var(--dim)", marginTop: 8 }}>{user.email}</p>
        <button className="btn" style={{ marginTop: 24 }} onClick={() => router.push("/command-deck")}>
          Go to Command Deck
        </button>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
        await register({ email, password, name: name.trim() });
      }
      router.push("/command-deck");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-wrap" style={{ maxWidth: 420, margin: "0 auto", paddingTop: 60 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>VRishi Academy</h1>
      <p style={{ color: "var(--dim)", fontSize: 13, marginBottom: 24 }}>Sign in to sync your progress across devices</p>

      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        <button
          onClick={() => { setTab("login"); setError(""); }}
          style={{
            flex: 1, padding: "8px 0", border: "1px solid var(--edge)",
            borderBottom: tab === "login" ? "2px solid var(--iris)" : "1px solid var(--edge)",
            background: tab === "login" ? "var(--glass)" : "transparent",
            color: tab === "login" ? "var(--fg)" : "var(--dim)",
            cursor: "pointer", fontSize: 13, fontFamily: "var(--mono)",
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => { setTab("register"); setError(""); }}
          style={{
            flex: 1, padding: "8px 0", border: "1px solid var(--edge)",
            borderBottom: tab === "register" ? "2px solid var(--iris)" : "1px solid var(--edge)",
            background: tab === "register" ? "var(--glass)" : "transparent",
            color: tab === "register" ? "var(--fg)" : "var(--dim)",
            cursor: "pointer", fontSize: 13, fontFamily: "var(--mono)",
          }}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {tab === "register" && (
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--dim)", display: "block", marginBottom: 4 }}>Full name</span>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required autoComplete="name"
              style={{
                width: "100%", padding: "8px 10px", background: "var(--glass)",
                border: "1px solid var(--edge)", color: "var(--fg)", borderRadius: 4,
                fontSize: 14, fontFamily: "var(--mono)",
              }}
            />
          </label>
        )}
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--dim)", display: "block", marginBottom: 4 }}>Email</span>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email"
            style={{
              width: "100%", padding: "8px 10px", background: "var(--glass)",
              border: "1px solid var(--edge)", color: "var(--fg)", borderRadius: 4,
              fontSize: 14, fontFamily: "var(--mono)",
            }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "var(--dim)", display: "block", marginBottom: 4 }}>Password</span>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={8} autoComplete={tab === "login" ? "current-password" : "new-password"}
            style={{
              width: "100%", padding: "8px 10px", background: "var(--glass)",
              border: "1px solid var(--edge)", color: "var(--fg)", borderRadius: 4,
              fontSize: 14, fontFamily: "var(--mono)",
            }}
          />
        </label>

        {error && (
          <p style={{ color: "var(--err)", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          style={{
            width: "100%", padding: "10px 0", background: "var(--iris)",
            color: "#fff", border: "none", borderRadius: 4, cursor: "pointer",
            fontSize: 14, fontFamily: "var(--mono)", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : tab === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 20, textAlign: "center" }}>
        {tab === "login"
          ? "No account? Switch to Register above."
          : "Already have an account? Switch to Sign In above."}
      </p>
      <p style={{ color: "var(--dim)", fontSize: 11, marginTop: 12, textAlign: "center" }}>
        Works offline too -- your progress is saved locally and syncs when the backend is available.
      </p>
    </section>
  );
}
