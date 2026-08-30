"use client";
import Link from "next/link";
import { useAcademy } from "../../lib/academy-store";

export default function AuthChip() {
  const { user, isAuthenticated, authReady, logout } = useAcademy();

  if (!authReady) return null;

  if (isAuthenticated) {
    return (
      <div style={{ padding: "8px 11px", fontSize: 12, color: "var(--dim)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--ok)", fontSize: 10 }} title="Signed in">&#9679;</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.email}>
          {user.name}
        </span>
        <button
          onClick={logout}
          style={{
            background: "none", border: "none", color: "var(--dim)", cursor: "pointer",
            fontSize: 11, fontFamily: "var(--mono)", padding: "2px 4px",
          }}
          title="Sign out"
        >
          out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      style={{
        display: "block", padding: "8px 11px", fontSize: 12,
        color: "var(--dim)", textDecoration: "none", fontFamily: "var(--mono)",
      }}
    >
      Sign in
    </Link>
  );
}
