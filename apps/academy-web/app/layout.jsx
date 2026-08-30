import "./globals.css";
import Link from "next/link";
import { getPlanPages } from "../lib/plan.mjs";
import gap from "../data/gap.json";
import AssistantDock from "./components/AssistantDock";
import MobileNav from "./components/MobileNav";
import Providers from "./components/Providers";
import AuthChip from "./components/AuthChip";

export const metadata = {
  title: "VRishi Academy",
  description: "Kappasinian practice studio — plan, drill, role-play, grade",
  icons: { icon: "/favicon.ico" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const pages = getPlanPages();
  const pct = Math.round(
    (100 * (gap.contacts.done / gap.contacts.need + gap.conferences.done / gap.conferences.need +
      gap.electives.done / gap.electives.need + gap.workshops.done / gap.workshops.need)) / 4
  );
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Providers>
        <div className="shell">
          <aside>
            <MobileNav>
              <Link href="/command-deck" className="brand">VRishi<span> Academy</span></Link>
              <p className="tag">Kappasinian practice studio</p>
              <nav aria-label="Portal navigation">
                {/* Main */}
                <Link href="/command-deck" className="navlink">
                  <span className="ord">01</span>Command Deck
                </Link>
                <Link href="/studio" className="navlink" style={{ color: "var(--iris)" }}>
                  <span className="ord">02</span>Session Studio
                </Link>
                <Link href="/sessions" className="navlink">
                  <span className="ord">03</span>The Sessions
                </Link>
                <Link href="/lab" className="navlink" style={{ color: "var(--amber)" }}>
                  <span className="ord">04</span>Practice Lab
                </Link>
                <Link href="/room" className="navlink">
                  <span className="ord">05</span>The Room
                </Link>
                <Link href="/teleprompter" className="navlink">
                  <span className="ord">06</span>Teleprompter
                </Link>
                <Link href="/skill-tree" className="navlink">
                  <span className="ord">07</span>Skill Tree
                </Link>
                <Link href="/faculty" className="navlink">
                  <span className="ord">08</span>Faculty
                </Link>
                <Link href="/techniques" className="navlink">
                  <span className="ord">09</span>Techniques
                </Link>

                {/* Clinical */}
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", margin: "14px 0 4px 11px" }}>Clinical</div>
                <Link href="/session-prep" className="navlink">
                  <span className="ord">10</span>Session Prep
                </Link>
                <Link href="/clinical-intake" className="navlink">
                  <span className="ord">11</span>Clinical Intake
                </Link>
                <Link href="/safety" className="navlink">
                  <span className="ord">12</span>Safety & Ethics
                </Link>
                <Link href="/logbook" className="navlink">
                  <span className="ord">13</span>Logbook
                </Link>
                <Link href="/persona-builder" className="navlink">
                  <span className="ord">14</span>Persona Builder
                </Link>

                {/* Content */}
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", margin: "14px 0 4px 11px" }}>Content</div>
                <Link href="/resources" className="navlink">
                  <span className="ord">15</span>Resources
                </Link>
                <Link href="/blog" className="navlink">
                  <span className="ord">16</span>Blog
                </Link>
                <Link href="/support" className="navlink">
                  <span className="ord">17</span>Support
                </Link>

                {/* Tools */}
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", margin: "14px 0 4px 11px" }}>Tools</div>
                <Link href="/zoom-room" className="navlink" style={{ color: "var(--ok)" }}>
                  <span className="ord">&#9713;</span>Zoom Room
                </Link>
                <Link href="/zoom-room/copilot" className="navlink" style={{ color: "var(--ok)", paddingLeft: 28 }}>
                  <span className="ord">&#9672;</span>AI Co-Pilot
                </Link>
                <Link href="/immersive" className="navlink" style={{ color: "var(--amber)" }}>
                  <span className="ord">&#9672;</span>Immersive
                </Link>

                {/* Plan pages */}
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", margin: "14px 0 4px 11px" }}>Plan</div>
                {pages.map((p) => (
                  <Link key={p.slug} href={`/plan/${p.slug}`} className="navlink">
                    <span className="ord">{p.order}</span>{p.title}
                  </Link>
                ))}
              </nav>
              <Link href="/dojo" className="gapchip" aria-label={`Real progress ${pct} percent`}>
                <span className="gaplabel">Real gap to CHt</span>
                <span className="gapbar"><span style={{ width: `${pct}%` }} /></span>
                <span className="gappct">{pct}% · Dec 10 hard stop</span>
              </Link>
              <AuthChip />
            </MobileNav>
          </aside>
          <main className="content" id="main">{children}</main>
        </div>
        </Providers>
        <AssistantDock />
      </body>
    </html>
  );
}
