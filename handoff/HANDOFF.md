# VRishi Academy — UI Handoff (look & feel port)

Drop-in source that gives your existing Next.js app (`apps/academy-web`) the
Studio/Lab/Dojo design you approved. No new dependencies, no build changes — same
App Router, same `data/*.json`, same orchestrator/WebSocket protocol.

## Files → destinations

| This package | Copy to |
|---|---|
| `academy-web/app/globals.css` | `apps/academy-web/app/globals.css` |
| `academy-web/app/studio/page.jsx` | `apps/academy-web/app/studio/page.jsx` |
| `academy-web/app/lab/page.jsx` | `apps/academy-web/app/lab/page.jsx` |
| `academy-web/app/dojo/page.jsx` | `apps/academy-web/app/dojo/page.jsx` |
| `academy-web/app/components/AssistantDock.jsx` | `apps/academy-web/app/components/AssistantDock.jsx` |

The first four are **full replacements**. `AssistantDock.jsx` is **new** — also add the
two-line mount to `app/layout.jsx` (see below).

### PowerShell (from the unzipped handoff folder)
```powershell
$dst = "D:\ChatGPT Projects\genai-portfolio\projects\Jeeth.ai\Business\VRishiHypno\PrepPractices\apps\academy-web\app"
Copy-Item .\academy-web\app\globals.css      "$dst\globals.css"      -Force
Copy-Item .\academy-web\app\studio\page.jsx  "$dst\studio\page.jsx"  -Force
Copy-Item .\academy-web\app\lab\page.jsx     "$dst\lab\page.jsx"     -Force
Copy-Item .\academy-web\app\dojo\page.jsx    "$dst\dojo\page.jsx"    -Force
New-Item -ItemType Directory -Force "$dst\components" | Out-Null
Copy-Item .\academy-web\app\components\AssistantDock.jsx "$dst\components\AssistantDock.jsx" -Force
```
Then refresh `http://localhost:3070` — or relaunch with `PrepPractices\academy.ps1`.

### Mount the dock (once) in `app/layout.jsx`
```jsx
import AssistantDock from './components/AssistantDock';
// ...inside <body>:  {children} <AssistantDock />
```
It renders on every route, reads the current path for its `context`, and needs the
orchestrator `POST /assistant/chat` (Claude proxy) endpoint for live chat.

## What each file gives you

**globals.css** — the token set (colors, type scale, spacing, radii, motion) as CSS
custom properties, plus every component class the three pages use. It **keeps your
existing class names** (`.shell .side .brand .navlink .prose .pager .dials .dial
.eyebrow h1 em .note`), so your current `layout.jsx` and `plan/[slug]` pages render
unchanged. No edits needed to `layout.jsx`.

**studio/page.jsx** — two-column console (therapist transcript left, client persona
right). Keeps your exact wiring: `POST /sessions` → `WebSocket /ws/{sid}` → `{cmd:"next"}`,
`Space` to advance. Added: live session timer + ring, stage-divider chips color-coded by
phase, pulsing amber nod-checkpoint indicator, 200ms amber snap flash, source dot
(ollama = green / fallback = grey), typing indicator, and a done summary card.

**lab/page.jsx** — keeps `buildPlan`, the `lab:attempts` localStorage history, and
`drills.json`. Added: the 9 presets regrouped into labeled lanes (First session · PSR ·
Shadows · Variations · Singles), minutes slider, Emotional/Physical mode toggle, prominent
timer + progress bar, prompter with the **active line auto-highlighted by elapsed time**,
toggleable check chips, and a debrief with a radial /100 gauge + per-drill breakdown +
30-run sparkline.

**dojo/page.jsx** — same four cockpit dials, plus a Dec-10 countdown block with color
logic (green > 90 days · amber 30–90 · red < 30) and a weekly-rhythm strip.

## Things to confirm / tune

1. **Studio stage colors** are mapped from the orchestrator's stage `name` by keyword
   (`stageColor()` in `studio/page.jsx`). If your stage keys differ from
   pre/induction/deepening/therapy/emergence/post, adjust that one function.
2. **Done summary** reads `stats.duration_s`, `stats.turns`, `stats.awaits` from your
   `done` turn; it falls back to the live timer/meta if a field is absent.
3. **Snap turns** render an optional `turn.note`; omit it and a default caption shows.
4. `NEXT_PUBLIC_ORCH_URL` still drives the orchestrator base URL (defaults to
   `http://localhost:8600`).

## Visual reference
The interactive design source lives alongside this in the design project as
`Studio.dc.html` and `Lab.dc.html` (self-contained, all three states each) plus
`studio-tokens.css`. Use them as the canonical look; the `.jsx` above is that look
ported onto your real data and sockets.
