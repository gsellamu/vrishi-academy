"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ================================================================
   VRishi Academy — Cinematic Landing Globe
   Three.js fibonacci sphere particle shells with breathing animation.
   Full-viewport overlay; navigates to /command-deck on entry.
   ================================================================ */
export default function Landing() {
  const canvasRef = useRef(null);
  const stopRef = useRef(false);
  const router = useRouter();

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

      /* fibonacci sphere shell */
      const group = new THREE.Group();
      scene.add(group);
      const shell = (n, r, size, color, op) => {
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const y = 1 - (i / (n - 1)) * 2;
          const rad = Math.sqrt(1 - y * y);
          const th = i * 2.399963; // golden angle
          pos[i * 3] = Math.cos(th) * rad * r;
          pos[i * 3 + 1] = y * r;
          pos[i * 3 + 2] = Math.sin(th) * rad * r;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const m = new THREE.PointsMaterial({
          size,
          color,
          transparent: true,
          opacity: op,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        group.add(new THREE.Points(g, m));
      };
      shell(2600, 1.35, 0.022, 0x2dd4bf, 0.55); // teal outer
      shell(1600, 1.02, 0.02, 0x8b7fd4, 0.6); // iris mid
      shell(700, 0.62, 0.03, 0xe0a458, 0.75); // amber core

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
        const s = 1 + Math.sin(t * (Math.PI / 2)) * 0.06; // 2s breath
        group.scale.setScalar(s);
        group.rotation.y = t * 0.06;
        group.rotation.x = Math.sin(t * 0.12) * 0.15;
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
            "radial-gradient(ellipse at center, rgba(14,13,20,.2) 0%, rgba(14,13,20,.75) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* centered text overlay */}
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
        }}
      >
        <div
          className="rise"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: ".4em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}
        >
          Kappasinian Practice Portal
        </div>

        <h1
          className="rise2"
          style={{
            font: "340 clamp(44px,7vw,92px)/1 var(--display)",
            margin: "20px 0 0",
            letterSpacing: ".5px",
          }}
        >
          VRishi{" "}
          <span
            style={{
              color: "var(--amber)",
              fontWeight: 560,
              fontStyle: "italic",
            }}
          >
            Academy
          </span>
        </h1>

        <p
          className="rise3"
          style={{
            maxWidth: "52ch",
            color: "#cfc9dd",
            fontSize: "clamp(15px,1.6vw,18px)",
            margin: "22px 0 0",
            lineHeight: 1.7,
          }}
        >
          A flight simulator for the craft. Learn, drill, role-play with AI
          avatars, and get graded on the full session &mdash; on the road C.MH
          &rarr; CHt &rarr; CCHt.
        </p>

        <div
          className="rise3"
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginTop: 38,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className="primary"
            onClick={() => router.push("/command-deck")}
            style={{
              padding: "14px 30px",
              fontSize: 15,
              boxShadow: "0 8px 34px rgba(224,164,88,.28)",
            }}
          >
            Enter the Studio &rarr;
          </button>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--mist)",
              letterSpacing: ".06em",
            }}
          >
            &#9673; 3 services live &middot; orchestrator :8600
          </span>
        </div>
      </div>

      {/* bottom nav strip */}
      <div
        className="rise3"
        style={{
          position: "absolute",
          bottom: 34,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 26,
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "var(--dim)",
        }}
      >
        <span>Learn</span>
        <span>Drill</span>
        <span style={{ color: "var(--amber)" }}>Role-play</span>
        <span>Grade</span>
        <span>Review</span>
      </div>
    </div>
  );
}
