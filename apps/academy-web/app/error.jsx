"use client";
export default function Error({ error, reset }) {
  return (
    <article>
      <span className="eyebrow">Error</span>
      <h1>Something went wrong</h1>
      <p className="note">{error?.message || "An unexpected error occurred."}</p>
      <button className="primary" onClick={reset} style={{ marginTop: 16 }}>Try again</button>
    </article>
  );
}
