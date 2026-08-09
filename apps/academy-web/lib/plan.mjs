import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const DIR = path.join(process.cwd(), "..", "..", "docs", "plan");

export function getPlanPages() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const raw = fs.readFileSync(path.join(DIR, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
    const meta = Object.fromEntries((m ? m[1] : "").split("\n").filter(Boolean).map((l) => l.split(/:\s*/)));
    return { slug: f.replace(/\.md$/, ""), title: meta.title || f, order: meta.order || "", body: raw.slice(m ? m[0].length : 0) };
  });
}

export function getPlanPage(slug) {
  const p = getPlanPages().find((x) => x.slug === slug);
  return p ? { ...p, html: marked.parse(p.body) } : null;
}
