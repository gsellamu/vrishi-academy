"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Scene metadata
// ---------------------------------------------------------------------------

const SCENES = [
  {
    label: "Scene 1 — Arrival and Consent",
    bg: "/immersive/backgrounds/scene1_arrival_space.mp4",
    audio: "/immersive/audio/scene1_avatar_intro.mp3",
    text: "Welcome. Before anything changes, you can simply arrive. Notice the chair beneath you, the space around you, and the fact that you are here now.",
  },
  {
    label: "Scene 2 — Empathy and Permission",
    bg: "/immersive/backgrounds/scene1_arrival_space.mp4",
    audio: "/immersive/audio/scene2_empathy_permission.mp3",
    text: "You do not have to force anything. You can simply notice what is present, with curiosity and respect.",
  },
  {
    label: "Scene 3 — Pacing Into Hypnotic Focus",
    bg: "/immersive/backgrounds/scene3_floating_induction.mp4",
    audio: "/immersive/audio/scene3_pacing_leading.mp3",
    text: "You are sitting here now. You can hear this voice. You may notice one small place in the body that already feels a little calmer.",
  },
  {
    label: "Scene 4 — Resource Anchor",
    bg: "/immersive/backgrounds/scene4_staircase_deepening.mp4",
    audio: "/immersive/audio/scene4_resource_anchor.mp3",
    text: "Imagine a moment when you felt even slightly stronger, calmer, or more capable. It does not have to be perfect. It only needs to be enough.",
  },
  {
    label: "Scene 5 — Reorientation",
    bg: "/immersive/backgrounds/scene1_arrival_space.mp4",
    audio: "/immersive/audio/scene5_reorientation.mp3",
    text: "One... returning gently. Two... body becoming more alert. Three... mind clearing. Four... eyes ready to open. Five... eyes open, present, steady, and fully awake.",
  },
];

// ---------------------------------------------------------------------------
// Three.js 3D Book
// ---------------------------------------------------------------------------

function useThreeBook(containerRef) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      el.clientWidth / el.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Book page
    const bookGeo = new THREE.BoxGeometry(4, 5, 0.05);
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xfaf4e8,
      roughness: 0.35,
      metalness: 0.05,
    });
    const book = new THREE.Mesh(bookGeo, pageMat);
    book.position.y = -0.3;
    scene.add(book);

    // Spine
    const spineGeo = new THREE.BoxGeometry(0.12, 5, 0.08);
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0xc4a86e,
      roughness: 0.6,
      metalness: 0.2,
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.set(-2.06, -0.3, 0);
    scene.add(spine);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xfffaed, 1.2);
    key.position.set(5, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd4a0, 0.4);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    camera.position.z = 6;

    let frameId;
    function animate() {
      frameId = requestAnimationFrame(animate);
      book.rotation.y = Math.sin(Date.now() * 0.0005) * 0.12;
      book.rotation.x = Math.sin(Date.now() * 0.0003) * 0.03;
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [containerRef]);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ImmersivePage() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Ready to begin");
  const audioRef = useRef(null);
  const bgVideoRef = useRef(null);
  const threeRef = useRef(null);

  useThreeBook(threeRef);

  const scene = SCENES[sceneIdx];

  // Swap background video when scene changes
  useEffect(() => {
    const v = bgVideoRef.current;
    if (!v) return;
    const currentFile = (v.src || "").split("/").pop();
    const newFile = scene.bg.split("/").pop();
    if (currentFile !== newFile) {
      v.src = scene.bg;
      v.load();
      v.play();
    }
  }, [scene.bg]);

  const playScene = useCallback(async () => {
    setPlaying(true);
    setStatus(`Playing Scene ${sceneIdx + 1}...`);

    return new Promise((resolve) => {
      const audio = new Audio(scene.audio);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        setStatus(`Scene ${sceneIdx + 1} complete.`);
        resolve();
      };
      audio.onerror = () => {
        setPlaying(false);
        setStatus("Audio error — check console.");
        resolve();
      };
      audio.play().catch(() => {
        setPlaying(false);
        setStatus("Audio blocked — click to interact first.");
        resolve();
      });
    });
  }, [scene.audio, sceneIdx]);

  const handleStart = useCallback(async () => {
    setSceneIdx(0);
    await new Promise((r) => setTimeout(r, 100));
    await playScene();
  }, [playScene]);

  const handleNext = useCallback(async () => {
    if (sceneIdx >= SCENES.length - 1) {
      setStatus("Session complete.");
      return;
    }
    const next = sceneIdx + 1;
    setSceneIdx(next);
    await new Promise((r) => setTimeout(r, 300));
  }, [sceneIdx]);

  // Auto-play when sceneIdx changes (after initial)
  useEffect(() => {
    if (sceneIdx > 0) {
      playScene();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdx]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    setSceneIdx(0);
    setStatus("Session ended.");
  }, []);

  return (
    <div style={styles.root}>
      {/* Layer 0: Background video */}
      <video
        ref={bgVideoRef}
        style={styles.bgVideo}
        autoPlay
        loop
        muted
        playsInline
        src={scene.bg}
      />

      {/* Layer 1: Three.js 3D book */}
      <div ref={threeRef} style={styles.threeCanvas} />

      {/* Layer 2: Book text overlay */}
      <div style={styles.bookText}>{scene.text}</div>

      {/* HUD: Scene label */}
      <div style={styles.sceneLabel}>{scene.label}</div>

      {/* HUD: Status */}
      <div style={styles.status}>{status}</div>

      {/* HUD: Controls */}
      <div style={styles.controls}>
        <button
          style={styles.btn}
          onClick={handleStart}
          disabled={playing}
        >
          Begin Session
        </button>
        <button
          style={styles.btn}
          onClick={handleNext}
          disabled={playing || sceneIdx >= SCENES.length - 1}
        >
          Next Scene
        </button>
        <button style={styles.btn} onClick={handleStop}>
          End Session
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (fullscreen immersive — overrides layout)
// ---------------------------------------------------------------------------

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    background: "#050508",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#e0d8cc",
    zIndex: 9999,
  },
  bgVideo: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
    opacity: 0.4,
    filter: "saturate(0.8) contrast(1.1)",
  },
  threeCanvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  bookText: {
    position: "absolute",
    bottom: "18%",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    maxWidth: 520,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 1.8,
    color: "rgba(240,230,210,0.75)",
    pointerEvents: "none",
    transition: "opacity 0.8s ease",
  },
  sceneLabel: {
    position: "absolute",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  status: {
    position: "absolute",
    bottom: 90,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    fontSize: 13,
    opacity: 0.45,
  },
  controls: {
    position: "absolute",
    bottom: 36,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    display: "flex",
    gap: 14,
  },
  btn: {
    background: "rgba(255,215,160,0.12)",
    color: "#e0d8cc",
    border: "1px solid rgba(255,215,160,0.25)",
    padding: "11px 26px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: 0.5,
    transition: "all 0.3s",
  },
};
