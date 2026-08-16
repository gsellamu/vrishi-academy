import Link from "next/link";
export default function NotFound() {
  return (
    <article>
      <span className="eyebrow">404</span>
      <h1>Page not found</h1>
      <p className="note">The page you requested does not exist.</p>
      <Link href="/command-deck" className="primary" style={{ marginTop: 16, display: "inline-block" }}>Back to Command Deck</Link>
    </article>
  );
}
