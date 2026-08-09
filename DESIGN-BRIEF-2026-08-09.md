# VRishi Academy — Design Brief (2026-08-09)

## Product
Practice drill + AI role-play platform for a hypnotherapy student preparing for HMI's Practical Skills Review (PSR). Solo operator, local-first, dark theme, clinical but warm. The user is the therapist; the AI plays the client.

## Brand
- **Name**: VRishi Academy (internal training tool; client-facing practice is VRishi Hypno)
- **Tone**: professional clinical + encouraging mentor. Not corporate, not new-age.
- **Colors**: dark background (slate/charcoal), warm accent (amber/gold for active states, teal for calm/deepening stages), red only for snap cues and urgent warnings.
- **Typography**: monospace for stage labels and timers, clean sans-serif for body. No script fonts.

## Pages to design

### 1. `/studio` — Role-Play Console (NOT YET BUILT — highest priority)
Two-column layout (therapist left, client right) or single-column mobile.
**Left column (therapist)**: setup bar with profile/plan/persona pickers, "Begin Session" button, transcript feed (therapist lines as neutral cards, stage transitions as colored divider chips, snap cues as flash/pulse, await checkpoints as pulsing "waiting..." indicator), spacebar or "Next" button bottom-anchored.
**Right column (client persona)**: persona avatar card pinned at top (name, archetype, issue, EP badge), reply bubbles with typing indicator, source badge (ollama=green, fallback=gray), nod counter badge.
**Done state**: full-width summary card with duration, turn count, await count, "Run Again" action.

### 2. `/lab` — Practice Lab (EXISTS, needs polish)
Preset grid (9 buttons) grouped: First Session | PSR | Shadows | Variations | Singles. Timer prominent with progress bar. Prompter card with active line highlighted, check items as toggleable chips. Debrief: score /100 radial gauge, check breakdown, history sparkline (30 runs).

### 3. `/dojo` — Gap Dashboard (EXISTS, needs visual lift)
Circular gauge dials for gap metrics (cockpit feel). Dec 10 countdown with color shift (green >90d, amber 30-90, red <30). Weekly rhythm prompt strip.

## Components
- **Stage chip**: colored pill. Pre-induction=neutral, induction=blue, deepening=indigo, therapy=purple, emergence=amber, post=green.
- **Persona card**: initials circle avatar, name, archetype, EP badge with percentage, issue tagline.
- **Nod checkpoint indicator**: pulsing amber ring -> green check when answered.
- **Snap cue**: 200ms amber full-width flash.
- **Timer**: large monospace mm:ss with circular progress ring.

## Technical constraints
- Next.js 14 App Router, React client components. No MUI/Chakra.
- No Tailwind — CSS modules or globals.css with CSS custom properties.
- WebSocket for `/studio` (`ws://localhost:8600/ws/{sid}`).
- Data: `data/drills.json` (19 drills), `data/gap.json` (HMI progress).
- All UI is typographic + geometric (chips, gauges, cards, bubbles). No generated images.

## Deliverables
1. `/studio` page — complete visual design + component specs + interaction states.
2. `/lab` page — visual polish pass.
3. `/dojo` — gauge redesign + countdown color logic.
4. Global token set (colors, type scale, spacing) as CSS custom properties.
