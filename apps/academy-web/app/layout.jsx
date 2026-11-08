import "./globals.css";
import Link from "next/link";
import gap from "../data/gap.json";
import AssistantDock from "./components/AssistantDock";
import MobileNav from "./components/MobileNav";
import Providers from "./components/Providers";
import AuthChip from "./components/AuthChip";
import SidebarNav from "./components/SidebarNav";

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
              <div className="brand-area">
                <Link href="/command-deck" className="brand">VRishi<span> Academy</span></Link>
                <p className="tag">Kappasinian practice studio</p>
              </div>
              <SidebarNav />
              <Link href="/dojo" className="gapchip" aria-label={`Real progress ${pct} percent`}>
                <span className="gaplabel">Real gap to CHt</span>
                <span className="gapbar"><span style={{ width: `${pct}%` }} /></span>
                <span className="gappct">{pct}% &middot; Dec 10 hard stop</span>
                <span className="gapdetail">
                  {gap.daysRemaining < 30 && <span className="gap-pulse" />}
                  {gap.contacts.done}/{gap.contacts.need} sessions &middot; {gap.conferences.done}/{gap.conferences.need} conferences
                </span>
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
