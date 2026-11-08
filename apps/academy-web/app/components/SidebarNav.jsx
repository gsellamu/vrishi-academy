"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "Practice",
    defaultOpen: true,
    links: [
      { href: "/command-deck", text: "Command Deck" },
      { href: "/lab", text: "Practice Lab", color: "var(--amber)" },
      { href: "/studio", text: "Session Studio", color: "var(--iris)" },
      { href: "/teleprompter", text: "Teleprompter" },
      { href: "/skill-tree", text: "Skill Tree" },
      { href: "/room", text: "The Room" },
      { href: "/immersive", text: "Immersive", color: "var(--amber)" },
    ],
  },
  {
    label: "Clinical",
    defaultOpen: true,
    links: [
      { href: "/session-prep", text: "Session Prep" },
      { href: "/client-journey", text: "Client Journey", color: "var(--ok)" },
      { href: "/case-journal", text: "Case Journal", color: "var(--iris)" },
      { href: "/logbook", text: "Logbook" },
      { href: "/clinical-intake", text: "Clinical Intake" },
      { href: "/safety", text: "Safety & Ethics" },
    ],
  },
  {
    label: "Clients",
    defaultOpen: false,
    links: [
      { href: "/csp-dashboard", text: "CSP Dashboard", color: "var(--iris)" },
      { href: "/csp", text: "Client Intake" },
      { href: "/persona-builder", text: "Persona Builder" },
      { href: "/business-practice", text: "Business Practice", color: "var(--amber)" },
      { href: "/cases", text: "Case Library", color: "#7fb8d4" },
    ],
  },
  {
    label: "Learn",
    defaultOpen: false,
    links: [
      { href: "/sessions", text: "The Sessions" },
      { href: "/faculty", text: "Faculty" },
      { href: "/techniques", text: "Techniques" },
      { href: "/resources", text: "Resources" },
      { href: "/blog", text: "Blog" },
      { href: "/support", text: "Support" },
    ],
  },
  {
    label: "Tools",
    defaultOpen: false,
    links: [
      { href: "/zoom-room", text: "Zoom Room", color: "var(--ok)" },
      { href: "/zoom-room/copilot", text: "AI Co-Pilot", color: "var(--ok)" },
    ],
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    for (const g of NAV_GROUPS) init[g.label] = g.defaultOpen;
    return init;
  });

  const toggle = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav aria-label="Portal navigation">
      {NAV_GROUPS.map((group) => {
        const isOpen = openGroups[group.label];
        return (
          <div key={group.label} className="nav-group">
            <button
              className={"nav-group-header" + (isOpen ? " open" : "")}
              onClick={() => toggle(group.label)}
              aria-expanded={isOpen}
            >
              {group.label}
              <span className="chevron">&#9656;</span>
            </button>
            <div className={"nav-group-items " + (isOpen ? "expanded" : "collapsed")}>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="navlink"
                  style={link.color ? { color: link.color } : undefined}
                  aria-current={pathname === link.href ? "page" : undefined}
                >
                  <span className="ord">&bull;</span>
                  {link.text}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
