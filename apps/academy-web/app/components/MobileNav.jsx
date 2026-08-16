"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MobileNav({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close nav on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button
        className="hamburger"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>
      <div className={open ? "side side--open" : "side"} data-mobile-nav>
        {children}
      </div>
      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
