"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

/* ================================================================
   VRishi Academy — The Room (idle entry overlay)
   Cinematic practice-room gateway. Full-viewport fixed overlay that
   breaks out of the shell layout. Three.js fibonacci sphere background
   (single teal shell, slow rotation). Info cards + "Begin Session" CTA.
   ================================================================ */

const INFO = [
  {
    label: "What",
    text: "A reactive client and the full script, stage by stage.",
  },
  {
    label: "Why",
    text: "Drill delivery, voice, tone and pacing against a client that responds in real time.",
  },
  {
    label: "How",
    text: "Next / Space to advance; snap fires the snap cue.",
  },
  {
    label: "Value",
    text: "Closest thing to a real chair \u2014 with a live PSR score and an auto-drafted SOAP note.",
  },
];

export default function Room() {
  const canvasRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    let raf;
    let ro;
    stopRef.current = false;

    (async () => {
      const THREE = await import("three");
      const cv = canvasRef.current;
      if (!cv || stopRef.current) return;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
      cam.position.z = 3.2;
      const renderer = new THREE.WebGLRenderer({
        canvas: cv,
        antialias: true,
        alpha: true,
      });
      renderer.setClearColor(0x000000, 0);

      /* single fibonacci sphere shell — teal, 1200 pts, r=1.8 */
      const group = new THREE.Group();
      scene.add(group);

      const N = 1200;
      const R = 1.8;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const th = i * 2.399963; // golden angle
        pos[i * 3] = Math.cos(th) * rad * R;
        pos[i * 3 + 1] = y * R;
        pos[i * 3 + 2] = Math.sin(th) * rad * R;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.022,
        color: 0x2dd4bf,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Points(geo, mat));

      const resize = () => {
        const w = cv.clientWidth || window.innerWidth;
        const h = cv.clientHeight || window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(cv);

      const clock = new THREE.Clock();
      const tick = () => {
        if (stopRef.current) {
          renderer.dispose();
          return;
        }
        const t = clock.getElapsedTime();
        group.rotation.y = t * 0.04; // slow rotation
        group.rotation.x = Math.sin(t * 0.08) * 0.1;
        renderer.render(scene, cam);
        if (!reduce) raf = requestAnimationFrame(tick);
      };
      tick();
      if (reduce) renderer.render(scene, cam);
    })();

    return () => {
      stopRef.current = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        background: "var(--void)",
        overflow: "hidden",
      }}
    >
      {/* three.js canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* radial vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(14,13,20,.15) 0%, rgba(14,13,20,.8) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* centered content overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          overflowY: "auto",
        }}
      >
        {/* eyebrow */}
        <div
          className="rise"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: ".32em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}
        >
          Phase 2 &middot; practice room
        </div>

        {/* heading */}
        <h1
          className="rise2"
          style={{
            font: "340 clamp(38px,6vw,72px)/1.05 var(--display)",
            margin: "18px 0 0",
            letterSpacing: ".5px",
          }}
        >
          Enter the{" "}
          <span
            style={{
              color: "var(--amber)",
              fontWeight: 560,
              fontStyle: "italic",
            }}
          >
            Room
          </span>
        </h1>

        {/* subtitle */}
        <p
          className="rise3"
          style={{
            maxWidth: "46ch",
            color: "#cfc9dd",
            fontSize: "clamp(14px,1.5vw,17px)",
            margin: "18px 0 0",
            lineHeight: 1.7,
          }}
        >
          A cinematic practice room &mdash; a reactive client presence and the
          full first-session script, stage by stage.
        </p>

        {/* info grid */}
        <div
          className="rise3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginTop: 36,
            maxWidth: 880,
            width: "100%",
          }}
        >
          {INFO.map((card) => (
            <div
              key={card.label}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                padding: "18px 16px",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                {card.label}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "#cfc9dd",
                  lineHeight: 1.55,
                }}
              >
                {card.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA section */}
        <div
          className="rise3"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginTop: 32,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className="primary"
            style={{
              padding: "14px 30px",
              fontSize: 15,
              boxShadow: "0 8px 34px rgba(224,164,88,.28)",
            }}
          >
            Begin Session &rarr;
          </button>
          <Link
            href="/safety"
            className="ghost"
            style={{
              padding: "10px 20px",
              fontSize: 13,
            }}
          >
            Safety &amp; consent gate
          </Link>
        </div>
      </div>

      {/* bottom status bar */}
      <div
        className="rise3"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "14px 24px",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".1em",
          color: "var(--dim)",
          background:
            "linear-gradient(0deg, rgba(14,13,20,.9) 0%, rgba(14,13,20,0) 100%)",
          pointerEvents: "none",
        }}
      >
        Space or Next advances &middot; snap fires the snap cue
      </div>
    </div>
  );
}
