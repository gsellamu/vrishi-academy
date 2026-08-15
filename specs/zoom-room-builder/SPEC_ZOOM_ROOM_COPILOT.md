# SPEC: Zoom Room AI Co-Pilot and 3D Builder

**Status:** proposal
**Author:** Claude Code (agentic engineer)
**Reviewer:** Jeeth (architect/approver)
**Date:** 2026-08-14
**Reference:** Modutectures NextGen Room Builder/Planner (InterviewPrep\modutecture\modutecture-nextgen)

---

## 1. Intent

Build an AI-powered Zoom Room Builder that helps HMI students and practitioners:
1. **Analyze** their existing room via photo/video upload (AI Co-pilot)
2. **Plan** optimal equipment placement in a 3D room builder (Unity WebGL)
3. **Validate** their setup against HMI professional standards (deterministic gate)
4. **Iterate** on AI-recommended layouts or create custom ones

Follows the Modutectures pattern: **AI proposes -> Gate validates -> Human approves -> Journal remembers.**

---

## 2. Architecture Overview

```
+------------------------------------------------------------------+
|  academy-web (Next.js :3070)                                     |
|  /zoom-room/copilot  - AI analysis UI (photo upload + chat)      |
|  /zoom-room/builder  - 3D room builder (Unity WebGL embed)       |
|  /zoom-room          - existing guide (Playbook/Cookbook/Runbook) |
+----------+----------------------------+-------------------------+
           |                            |
           v                            v
+-------------------+     +---------------------------+
| zoom-copilot-svc  |     | Unity WebGL Build         |
| FastAPI :8605     |     | (embedded via iframe/div) |
| - POST /analyze   |     | ZoomRoomBridge.cs         |
| - POST /recommend |     | - GraphQL to copilot-svc  |
| - WS /chat        |     | - Equipment catalog       |
| - GET /catalog    |     | - Placement + validation  |
+--------+----------+     +----------+----------------+
         |                            |
         v                            v
+--------------------------------------------------+
| Shared Infrastructure                            |
| - Ollama (gemma3:4b) or Claude API for vision    |
| - MinIO (photo/video storage)                    |
| - PostgreSQL (layouts, analysis history)          |
| - Redis (session cache)                          |
+--------------------------------------------------+
```

---

## 3. Phased Delivery

### Phase 1: AI Co-Pilot (Web-only, no Unity) -- TARGET FIRST

**Scope:** Photo upload + AI analysis + recommendations + 2D layout canvas

| Component | Description |
|-----------|-------------|
| Photo Upload UI | Drag-drop or camera capture, up to 5 photos (front, left, right, behind, overhead) |
| AI Room Analyzer | Vision model analyzes photos for: lighting conditions, background issues, camera angle, mic placement, window positions, clutter, privacy concerns |
| Recommendation Engine | Generates scored report card (A-F per category) with specific actionable fixes |
| 2D Layout Canvas | Top-down room planner (Canvas API) with drag-drop equipment icons |
| Equipment Catalog | Browseable list of recommended equipment with links to the Cookbook |
| Chat Interface | Conversational follow-up: "What if I move my desk to the other wall?" |

**Tech Stack (Phase 1):**
- Frontend: Next.js pages under `/zoom-room/copilot`
- Backend: `zoom-copilot-svc` (FastAPI, port 8605) -- reuses academy_shared OOP layer
- AI: Claude API (claude-sonnet-4-5-20250514 for vision analysis) with Ollama fallback
- Storage: MinIO for uploaded photos, PostgreSQL for analysis history
- 2D Canvas: HTML5 Canvas with studio.js-inspired interaction model

### Phase 2: Unity 3D Room Builder

**Scope:** Full 3D room with realistic lighting, camera preview, equipment placement

| Component | Description |
|-----------|-------------|
| Unity WebGL Build | Embedded in `/zoom-room/builder` via iframe or React Unity WebGL |
| ZoomRoomBridge.cs | GraphQL bridge to copilot-svc (same pattern as ModutectureBridge.cs) |
| Room Shell | Configurable room dimensions, walls, windows, doors |
| Equipment Catalog | 3D models: desk, chair, monitor, webcam, ring light, mic, boom arm, softbox, bookshelf |
| Placement Validation | Rules engine (R1-R5 adapted for Zoom rooms) |
| Camera Preview | Real-time "what the client sees" viewport from webcam position |
| Lighting Simulation | Approximate light distribution from equipment positions |
| AI Layout Suggestions | Agent proposes placement based on room constraints |
| Export | Screenshot, PDF report, equipment shopping list |

**Tech Stack (Phase 2):**
- Unity 6 with WebGL build target
- C# scripts following Modutectures patterns (Bridge, Catalog, Tool, Renderer)
- GraphQL mutations to copilot-svc
- Governed AI Gateway pattern (AI proposes, gate validates)

### Phase 3: Advanced Features (Future)

- Video analysis (analyze a Zoom test recording for quality issues)
- AR overlay (phone camera shows equipment placement suggestions in real space)
- Before/after comparison (photos before vs after setup)
- Peer review (share layout with instructor for feedback before approval)
- Integration with progress-svc (auto-complete checklist items when builder validates)

---

## 4. AI Co-Pilot Service (Phase 1 Detail)

### 4.1 Endpoints

```
POST /api/v1/copilot/analyze
  Body: multipart/form-data { photos: File[], room_dimensions?: {w,d,h}, notes?: string }
  Response: { analysis_id, scores: {video:A-F, audio:A-F, background:A-F, lighting:A-F, privacy:A-F},
              issues: [{category, severity, description, fix}], overall_grade, room_sketch }

POST /api/v1/copilot/recommend
  Body: { analysis_id, constraints?: {budget?, existing_equipment?, room_type?} }
  Response: { layouts: [{id, name, equipment_positions, rationale, estimated_cost}] }

POST /api/v1/copilot/chat
  Body: { analysis_id, message: string, history: [{role,content}] }
  Response: { reply: string, updated_layout?: Layout, suggestions?: string[] }

GET  /api/v1/copilot/catalog
  Response: { equipment: [{id, name, category, models, price_range, priority}] }

GET  /api/v1/copilot/analysis/{id}
  Response: { full analysis result }

POST /api/v1/copilot/layout/save
  Body: { analysis_id?, name, room: {w,d,h}, placements: [{equipment_id, x, y, rotation}] }
  Response: { layout_id }

GET  /api/v1/copilot/layouts
  Response: { layouts: [{id, name, created, thumbnail}] }
```

### 4.2 AI Vision Analysis Pipeline

```
1. Upload photos to MinIO (bucket: zoom-room-photos)
2. For each photo, call Claude Vision API:
   - Prompt: structured analysis of room for Zoom hypnotherapy sessions
   - Categories: lighting quality, background professionalism, camera angle,
     audio environment (hard surfaces = echo risk), privacy (windows, doors),
     equipment visible, overall impression
3. Aggregate per-category scores across all photos
4. Generate issues list with severity (critical/warning/suggestion) and specific fixes
5. Estimate room dimensions from photos (if not provided)
6. Generate 2D room sketch from analysis
7. Store analysis in PostgreSQL, photos in MinIO
```

### 4.3 Vision Prompt (Grounded)

```
Role: You are an HMI-certified Zoom Room assessment specialist.

Analyze this photo of a room intended for Zoom-based hypnotherapy sessions.
Score each category A through F:

LIGHTING:
- A: Even, soft key light from front; no shadows; 4000-5000K neutral
- B: Good lighting with minor shadows or slight color cast
- C: Adequate but uneven; some harsh shadows or backlight
- D: Poor lighting; strong backlight, overhead-only, or dark areas
- F: Unacceptable; silhouetted, extreme shadows, or no lighting control

BACKGROUND:
- A: Clean, professional; neutral wall or curated bookshelf; certificates visible
- B: Clean but slightly busy; acceptable for sessions
- C: Some distracting elements; needs cleanup
- D: Cluttered, personal items visible, or inappropriate items
- F: Unprofessional; messy, distracting, or potentially triggering

CAMERA ANGLE:
- A: Eye level, centered, head-and-shoulders framing, space above head
- B: Slightly off-center or slightly above/below eye level
- C: Noticeable angle issues but face fully visible
- D: Laptop-on-desk angle (looking up nose) or too far away
- F: Unusable angle; profile view, extreme angle, or face partially cut off

AUDIO ENVIRONMENT (visual assessment):
- A: Soft furnishings, curtains, carpet; external mic visible; quiet indicators
- B: Some soft surfaces; reasonable acoustic environment
- C: Mixed; some hard surfaces but manageable
- D: Hard walls, tile floor, no soft furnishings; echo likely
- F: Bathroom, kitchen, or highly reverberant space

PRIVACY:
- A: Closed room, no windows visible to outside, door closed
- B: Windows with blinds/curtains closed; door visible but closeable
- C: Some privacy concerns but addressable
- D: Open space, visible windows without coverings, shared space
- F: Public area, no privacy possible

For each category below A, provide:
- issue: specific problem observed
- fix: actionable step to resolve it
- severity: critical (must fix) | warning (should fix) | suggestion (nice to have)

Output as JSON.
```

### 4.4 Validation Rules (Zoom Room Gate)

Adapted from Modutectures R1-R10 for Zoom context:

| Rule | Name | Description |
|------|------|-------------|
| ZR-1 | Camera-Eye-Level | Camera must be within 10cm of seated eye height |
| ZR-2 | Key-Light-Front | Primary light source must be within 30deg of camera axis |
| ZR-3 | No-Backlight | No light source (window/lamp) behind subject position |
| ZR-4 | Mic-Distance | Microphone 15-30cm from mouth position |
| ZR-5 | Clear-Background | No items in background violation list (green screen, virtual bg, clutter) |
| ZR-6 | Privacy-Enclosed | Room must have closeable door; windows must have coverings |
| ZR-7 | Min-Distance | Subject at least 60cm from camera |
| ZR-8 | Desk-Clear | Visible desk area has only professional items |
| ZR-9 | Internet-Position | Wired connection point or router within 10m |
| ZR-10 | Emergency-Access | Clear path to door (safety requirement) |

### 4.5 Database Schema (zoom-room-copilot)

```sql
-- Room analyses
CREATE TABLE zoom_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES academy_users(id) ON DELETE SET NULL,
  room_dimensions JSONB,        -- {width_m, depth_m, height_m}
  scores JSONB,                 -- {video: "B", audio: "C", ...}
  issues JSONB,                 -- [{category, severity, description, fix}]
  overall_grade VARCHAR(2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Uploaded photos linked to analyses
CREATE TABLE zoom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES zoom_analyses(id) ON DELETE CASCADE,
  minio_key VARCHAR(512) NOT NULL,
  photo_type VARCHAR(32),       -- front, left, right, behind, overhead
  ai_annotations JSONB,         -- bounding boxes, detected objects
  created_at TIMESTAMP DEFAULT now()
);

-- Saved room layouts (2D/3D)
CREATE TABLE zoom_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES academy_users(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES zoom_analyses(id) ON DELETE SET NULL,
  name VARCHAR(128) NOT NULL,
  room JSONB NOT NULL,          -- {width_m, depth_m, height_m, walls, windows, doors}
  placements JSONB NOT NULL,    -- [{equipment_id, x, y, z, rotation, label}]
  source VARCHAR(32) DEFAULT 'manual',  -- manual | ai_recommended | imported
  validation JSONB,             -- gate results: [{rule, verdict, detail}]
  thumbnail_key VARCHAR(512),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Equipment catalog
CREATE TABLE zoom_equipment (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(32) NOT NULL,  -- camera, mic, light, furniture, accessory
  models JSONB,                   -- [{brand, model, url, price}]
  dimensions JSONB,               -- {width_cm, depth_cm, height_cm} for 3D
  icon VARCHAR(32),               -- emoji or icon class for 2D canvas
  priority VARCHAR(16),           -- essential, recommended, optional
  sort_order INT DEFAULT 0
);
```

---

## 5. Unity 3D Builder (Phase 2 Detail)

### 5.1 Unity Project Structure

```
src/ZoomRoomBuilder/
  Assets/
    Scripts/
      Bridge/
        ZoomRoomBridge.cs          -- GraphQL client (from ModutectureBridge pattern)
      Tools/
        PlacementTool.cs           -- Select/Place/Move/Rotate equipment
        CameraPreviewTool.cs       -- Show "what client sees" from webcam position
        LightingAnalyzer.cs        -- Approximate light distribution visualization
      Equipment/
        EquipmentCatalog.cs        -- ScriptableObject catalog of 3D equipment
        EquipmentInstance.cs        -- Runtime equipment representation
      Room/
        RoomShell.cs               -- Configurable walls, floor, ceiling
        WindowController.cs        -- Window with blinds (open/close)
        DoorController.cs          -- Door with open/close
      Validation/
        ZoomRoomGate.cs            -- Client-side preview of ZR-1 through ZR-10
        ViolationRenderer.cs       -- Visual indicators for rule violations
      UI/
        CatalogPanel.cs            -- Equipment browser panel
        ScoreCard.cs               -- Analysis results overlay
        CameraViewport.cs          -- Picture-in-picture camera preview
    Prefabs/
      Equipment/
        Desk.prefab
        OfficeChair.prefab
        Monitor.prefab
        Webcam.prefab
        RingLight18in.prefab
        Softbox.prefab
        MicBoomArm.prefab
        BluYetiMic.prefab
        Headphones.prefab
        Bookshelf.prefab
        DiplomFrame.prefab
        PlantPot.prefab
      Room/
        Wall.prefab
        Floor.prefab
        Window.prefab
        Door.prefab
    Materials/
      WallNeutral.mat
      WoodDesk.mat
      CarpetFloor.mat
    Scenes/
      ZoomRoomBuilder.unity
  ProjectSettings/
    (WebGL build target configured)
```

### 5.2 Bridge Protocol (GraphQL)

Reuses the Modutectures pattern:

```graphql
# Queries
query GetCatalog { zoomEquipment { id name category dimensions icon } }
query GetLayout(id: ID!) { zoomLayout(id: $id) { room placements validation } }
query ValidatePlacement(layout: LayoutInput!) { validateZoomRoom(layout: $layout) { rules { id verdict detail } } }

# Mutations
mutation PlaceEquipment(layoutId: ID!, equipment: PlacementInput!) {
  placeZoomEquipment(layoutId: $layoutId, equipment: $equipment) {
    verdict  # ALLOWED | REJECTED | WARNING
    violations { rule description fix }
    updatedLayout { placements }
  }
}

mutation SaveLayout(layout: LayoutInput!) {
  saveZoomLayout(layout: $layout) { id thumbnail }
}

mutation RequestAiSuggestion(layoutId: ID!, goal: String!) {
  suggestZoomPlacement(layoutId: $layoutId, goal: $goal) {
    proposal { equipmentId x y rotation }
    rationale
    alternativeCount
  }
}
```

### 5.3 Camera Preview Feature

The signature feature of Phase 2:
- Place a virtual webcam in the scene
- Render a secondary camera from the webcam's perspective
- Display in a picture-in-picture viewport
- Shows exactly what the Zoom client would see
- Updates in real-time as you move furniture/camera/lights

### 5.4 Lighting Simulation

- Place light sources (ring light, softbox, window, overhead)
- Unity real-time lighting shows approximate illumination on face
- Color temperature visualization (warm/neutral/cool indicators)
- Shadow analysis on the user's avatar/mannequin
- Warning overlays when backlight or uneven lighting detected

---

## 6. Equipment Catalog (Seed Data)

| ID | Name | Category | 3D Dims (cm) | Priority |
|----|------|----------|--------------|----------|
| desk_standard | Standard Desk | furniture | 120x60x75 | essential |
| chair_office | Office Chair | furniture | 60x60x100 | essential |
| monitor_24 | 24" Monitor | tech | 55x20x40 | essential |
| webcam_logitech | Logitech C920 Webcam | camera | 8x5x5 | essential |
| ringlight_18 | 18" Ring Light + Stand | light | 46x46x180 | essential |
| mic_blue_yeti | Blue Yeti USB Mic | audio | 12x12x30 | essential |
| boom_arm | Mic Boom Arm | audio | 80x10x50 | recommended |
| pop_filter | Pop Filter | audio | 15x5x15 | recommended |
| softbox_key | Softbox Key Light | light | 60x25x180 | recommended |
| headphones_wired | Wired Headphones | audio | 18x8x20 | recommended |
| bookshelf_2x3 | 2-Shelf Bookcase | furniture | 80x30x80 | optional |
| plant_pot | Decorative Plant | decor | 25x25x60 | optional |
| diplom_frame | Diploma Frame | decor | 40x2x30 | optional |
| curtain_panel | Window Curtain | room | 120x5x220 | essential |
| ethernet_cable | Ethernet Cable | tech | - | recommended |
| timer_desk | Desk Timer/Clock | session | 10x5x10 | essential |
| notepad | Notepad + Pen | session | 20x1x25 | essential |
| tissue_box | Tissue Box | session | 12x12x8 | recommended |
| water_bottle | Water Bottle | session | 8x8x25 | essential |

---

## 7. Frontend Pages

### /zoom-room/copilot (Phase 1)

```
+------------------------------------------+
| Zoom Room AI Co-Pilot                    |
+------------------------------------------+
| [Upload Photos]  [Take Photo]            |
|                                          |
| +------+ +------+ +------+              |
| |front | |left  | |right |   (5 slots)  |
| +------+ +------+ +------+              |
| +------+ +------+                        |
| |behind| |above |                        |
| +------+ +------+                        |
|                                          |
| [Analyze My Room]                        |
|                                          |
| === Analysis Report ===                  |
| Video:    [====B====]                    |
| Audio:    [===C=====]                    |
| Lighting: [==D======]                    |
| Privacy:  [=====A===]                    |
| Background:[====B===]                    |
|                                          |
| Issues (3 critical, 2 warnings):         |
| ! Camera below eye level -> mount higher |
| ! Backlight from window -> close blinds  |
| ! No external mic visible -> get Blue Yeti|
| ~ Desk slightly cluttered -> clean up     |
| ~ No certificates on wall -> hang diplomas|
|                                          |
| [View AI Recommendations] [Open Builder] |
|                                          |
| === Chat ===                             |
| You: What if I face the window instead?  |
| AI: That would solve the backlight issue.|
|     Your lighting score would improve to |
|     A if you use the window as key light.|
|     However, ensure curtains are closed   |
|     for privacy during sessions.          |
+------------------------------------------+
```

### /zoom-room/builder (Phase 2)

```
+------------------------------------------+
| Zoom Room 3D Builder                     |
+--+---------------------------------------+
|  | [Unity WebGL Canvas]                  |
|C |                                       |
|A |   3D Room View                        |
|T |   - Draggable equipment               |
|A |   - Real-time lighting                |
|L |   - Validation overlays               |
|O |                                       |
|G |   +--------+                          |
|  |   |Camera  |  <- PIP: what client sees|
|  |   |Preview |                          |
|  |   +--------+                          |
|  |                                       |
+--+---------------------------------------+
| Score: B+ | Rules: 8/10 pass | [Save] [Export PDF] [AI Suggest] |
+------------------------------------------+
```

---

## 8. Requirement Register

| ID | Class | Description | Priority |
|----|-------|-------------|----------|
| ZRC-FR-001 | FR | User can upload up to 5 room photos for AI analysis | P0 |
| ZRC-FR-002 | FR | AI vision analyzes photos and scores 5 categories A-F | P0 |
| ZRC-FR-003 | FR | System generates actionable fix list per issue found | P0 |
| ZRC-FR-004 | FR | User can chat with AI copilot about their room setup | P0 |
| ZRC-FR-005 | FR | 2D top-down room canvas with drag-drop equipment | P0 |
| ZRC-FR-006 | FR | Equipment catalog browseable by category and priority | P0 |
| ZRC-FR-007 | FR | Layout validation against ZR-1 through ZR-10 rules | P1 |
| ZRC-FR-008 | FR | AI recommends optimal equipment layouts based on room analysis | P1 |
| ZRC-FR-009 | FR | Save/load room layouts to database | P1 |
| ZRC-FR-010 | FR | 3D Unity room builder with real-time lighting (Phase 2) | P2 |
| ZRC-FR-011 | FR | Camera preview PIP showing client's Zoom view (Phase 2) | P2 |
| ZRC-FR-012 | FR | Export layout as PDF report with shopping list (Phase 2) | P2 |
| ZRC-FR-013 | FR | AI suggests placements via governed gateway (Phase 2) | P2 |
| ZRC-NFR-001 | NFR | Photo analysis completes within 15 seconds | P0 |
| ZRC-NFR-002 | NFR | Photos stored encrypted in MinIO; deleted after 30 days | P0 |
| ZRC-NFR-003 | NFR | Unity WebGL build < 30MB compressed (Phase 2) | P2 |
| ZRC-GR-001 | GR | AI can only propose layouts; cannot auto-commit or bypass gate | P0 |
| ZRC-GR-002 | GR | All photo uploads require authenticated user | P0 |
| ZRC-GR-003 | GR | Vision prompt grounded in HMI standards only; no hallucinated criteria | P0 |
| ZRC-ZH-001 | ZH | AI scores must cite specific visual evidence from the photo | P1 |
| ZRC-ZH-002 | ZH | Equipment recommendations cite HMI course materials only | P1 |

---

## 9. Port Assignment

| Service | Port | Profile |
|---------|------|---------|
| zoom-copilot-svc | 8605 | p3 |

Port 8605 is the last in the academy block (8600-8605). Verify with port-map.ps1 before claiming.

---

## 10. Build Plan

### Increment 0: Walking Skeleton (Phase 1a)
- Photo upload to MinIO via copilot-svc
- Single-photo Claude Vision analysis with hardcoded prompt
- JSON score response rendered in Next.js
- No chat, no layout, no persistence

### Increment 1: Full Co-Pilot (Phase 1b)
- Multi-photo analysis with aggregation
- Chat interface with analysis context
- 2D room canvas (Canvas API)
- Equipment catalog + drag-drop
- Layout save/load to PostgreSQL
- ZR-1 through ZR-10 validation on 2D placements

### Increment 2: Unity Room Builder (Phase 2)
- Unity 6 WebGL project with ZoomRoomBridge.cs
- 19 equipment prefabs + room shell
- Camera preview PIP
- Real-time lighting simulation
- AI placement suggestions via governed gateway
- PDF export

---

## 11. Open Questions (for Jeeth)

1. **AI Provider for Vision:** Claude API (best quality, ~$0.01/photo) vs Ollama with LLaVA (free, lower quality, local). Recommend Claude API with Ollama offline fallback.
2. **Unity License:** Unity Personal (free for < $100K revenue) sufficient? WebGL build requires Unity Pro for some features.
3. **3D Asset Source:** Create custom low-poly models or use Unity Asset Store packs?
4. **Integration with HMI:** Should the analysis report be exportable to show the HMI counselor during Zoom Room approval?
5. **Phase 1 target:** Should we build Phase 1 (AI Co-Pilot + 2D canvas) now, or wait for Unity setup for Phase 2?
