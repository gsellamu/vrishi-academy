"""AI vision analysis for Zoom Room photos.

Uses Claude API for photo analysis with structured JSON output.
Falls back to a canned assessment when API key is unavailable.
Prompt grounded in HMI standards (Kappas review + Carr AHA workbook + Carr video class).
"""
from __future__ import annotations
import base64
import json
import logging
import os
import time
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
VISION_MODEL = os.getenv("VISION_MODEL", "claude-haiku-4-5-20251001")
VISION_TIMEOUT = float(os.getenv("VISION_TIMEOUT", "30"))

VISION_PROMPT = """\
You are an HMI Zoom Room reviewer applying the standards used by George Kappas and
Tricia Carr (AHA) when approving student Zoom rooms at the Hypnosis Motivation
Institute. The room must look like a professional therapy office -- "broadcast
standard" -- because that is what clients are programmed to expect from television.
The Zoom room IS your virtual therapy office and your first professional impression.

Analyze this photo and score each category from A (excellent) to F (unacceptable):

CAMERA_ANGLE (most critical -- Kappas: "I never, ever want to see your ceiling"):
- A: Camera slightly ABOVE eye line angled down (Carr standard), centered in frame,
     medium to medium-close-up framing (chest/shoulders up), minimal headroom (just
     a touch above head), NO ceiling visible, HD 16:9 aspect ratio, landscape
     orientation. Subject leaning slightly forward (engaged posture).
- B: Eye level but slightly off-center, or a touch too much headroom.
- C: Noticeable angle issues but face fully visible; ceiling partially showing.
- D: Laptop-on-desk angle (looking up at chin/nose -- Carr: "avoid angling the
     camera so that it sees your chin or neck"), ceiling clearly visible, or user
     is far off-center. Portrait orientation or 4:3 ratio.
- F: Profile view, extreme angle, face partially cut off, extreme close-up
     (face only), or ceiling dominates.

LIGHTING (Kappas: "soft contour lighting, a little dramatic but very soft"):
- A: Even, soft key light from front or 45 degrees; contour lighting that sculpts
     the face without harsh shadows; warm natural tones (Carr: "gold is usually
     very flattering, like beautiful morning light"). Ring light or softbox visible
     (if glasses worn, ring light far enough to avoid ring reflection in lenses).
     Bonus: patio floodlight or lamp behind/beside subject adding depth and drama
     (Carr trick: "creates depth, looks like a whole other room behind you").
     No silhouette. If glasses worn, no glare on lenses.
- B: Good soft lighting with minor shadows or slight color cast.
- C: Adequate but uneven; some harsh shadows or slight backlight from window.
     Plain white wall with no lighting design (Carr: "a missed opportunity").
- D: Strong backlight (window behind = silhouette), overhead-only fluorescent,
     or dark areas. Blown-out appearance from direct sunlight.
- F: Silhouetted, extreme shadows, or no lighting control at all.

BACKGROUND (Kappas: "therapist office looking -- that's what we're going for"):
- A: Professional therapy office look -- curated bookshelf, certificates/diplomas
     hung LOW (at seated eye level ~4 feet, NOT standing height). Colors that
     reflect personality and specialization (Kappas: "reflects who you are").
     Shot depth considered: shallow shot curated cleanly, or deep shot with
     ENTIRE visible area well staged (Carr: "stage the whole shot depth").
     Corner of room can lend engaging depth illusion (Carr: lamp behind you in
     the corner "makes it look like a whole other room"). Plants, tasteful art,
     creative elements that "overtly and subliminally communicate expertise."
- B: Clean and professional but missing certificates or slightly busy.
- C: Some distracting elements; pictures hung at standing height (too high for
     Zoom frame); plain white wall (missed opportunity); needs staging.
- D: Cluttered, personal items (mail, shoes, toys), bare walls, or inappropriate items.
     Domestic disorder visible ("domestic blinders" -- Carr).
- F: Unprofessional; messy, virtual green-screen background (Carr: "not advisable,
     usually kitschy and distracting"), or potentially triggering content.

AUDIO_ENVIRONMENT (visual assessment -- Carr: "audio quality is even MORE important
than visual quality"; "think of sound like water splashing off hard surfaces"):
- A: External USB condenser microphone visible JUST OUT OF CAMERA FRAME or on a
     low-profile stand (Kappas: "I don't want the podcaster look" -- mic should NOT
     dominate the shot). Soft furnishings, curtains, carpet/rug to absorb flutter
     echo. Heavy curtain or blanket IN FRONT of subject (behind monitor/camera) to
     catch sound bouncing off the wall behind them (Carr: "sound goes past you, hits
     the wall, bounces back into mic"). Acoustic treatment panels visible (bonus).
     Headphones/earbuds for monitoring and privacy. Wired ethernet cable visible
     (bonus -- stable connection for uninterrupted sessions).
- B: Some soft surfaces; external mic visible but room has hard surfaces.
- C: Mixed hard/soft surfaces; no external mic visible; internal laptop mic likely.
- D: Hard walls, tile floor, no soft furnishings; echo likely. No external mic.
     No sound treatment (heavy curtain or panels) visible.
- F: Bathroom, kitchen, or highly reverberant space.

PRIVACY (clinical requirement):
- A: Enclosed room with door closed (or "Do Not Disturb" sign), no uncovered
     windows facing neighbors, headphones/earbuds to prevent audio bleed into room.
     Free of family/pet/co-worker traffic. Professional and contained.
- B: Windows with blinds/curtains closed; door visible but closeable.
- C: Some privacy concerns but addressable (open blinds, no headphones).
- D: Open space, visible windows without coverings, shared or public area.
- F: Public area, no privacy possible, household members visible/audible.

HMI-SPECIFIC CHECKLIST (note any of these in issues):
- Ceiling visible? CRITICAL -- tilt camera down or raise seating. "Never, ever."
- Camera below eye line (chin/nose visible in foreground)? CRITICAL -- raise camera.
- Not centered in frame? WARNING -- move camera or chair to center.
- Portrait orientation on phone/tablet? WARNING -- switch to landscape (16:9).
- Certificates/diplomas too high? SUGGESTION -- lower to ~4 feet for Zoom frame.
- Plain white wall background? SUGGESTION -- add staging elements for authority.
- Too much headroom? WARNING -- zoom in or move closer to fill frame.
- Extreme close-up (face only)? WARNING -- pull back to medium/medium-close-up.
- Leaning away from camera? SUGGESTION -- lean slightly forward for engagement.
- No external microphone visible? WARNING -- $100 USB condenser mic recommended.
- Mic too prominent in frame (podcaster look)? SUGGESTION -- move mic just out of
  camera range or use low-profile stand (Kappas preference).
- No headphones/earbuds? SUGGESTION -- needed for client audio privacy.
- Glasses glare from lighting? SUGGESTION -- move ring light farther away or
  reposition to eliminate ring reflection; try softbox instead.
- No sound absorption in FRONT (behind camera)? SUGGESTION -- hang heavy curtain
  or blanket behind your monitor to catch bounced sound.
- Virtual background? WARNING -- not advisable for clinical sessions.
- Domestic clutter visible? WARNING -- scan shot and stash non-professional items.
- No depth lighting? SUGGESTION -- add lamp or floodlight behind/beside you for
  depth and visual interest (inexpensive patio floodlight works well).

For each category scored below A, provide an issue with:
- category: the category name
- severity: "critical" (must fix before approval) | "warning" (should fix) | "suggestion" (nice to have)
- description: specific problem observed in the photo
- fix: actionable step to resolve it (be specific and budget-conscious)

Also estimate room dimensions if visible (width_m, depth_m, height_m).

Respond with ONLY valid JSON in this exact format:
{
  "scores": {"camera_angle": "B", "lighting": "A", "background": "A", "audio_environment": "B", "privacy": "A"},
  "issues": [
    {"category": "camera_angle", "severity": "warning", "description": "...", "fix": "..."}
  ],
  "overall_grade": "B",
  "room_estimate": {"width_m": 3.5, "depth_m": 4.0, "height_m": 2.7},
  "observations": "Brief summary of strengths and what needs improvement."
}
"""

GRADE_ORDER = {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1}
GRADE_FROM_SCORE = {5: "A", 4: "B", 3: "C", 2: "D", 1: "F"}


@dataclass
class VisionResult:
    scores: dict
    issues: list
    overall_grade: str
    room_estimate: dict | None
    observations: str
    model: str
    latency_ms: int
    source: str  # "claude" or "fallback"


def _compute_overall(scores: dict) -> str:
    if not scores:
        return "C"
    vals = [GRADE_ORDER.get(v.upper(), 3) for v in scores.values()]
    avg = sum(vals) / len(vals)
    return GRADE_FROM_SCORE.get(round(avg), "C")


FALLBACK_RESULT = VisionResult(
    scores={
        "lighting": "C",
        "background": "C",
        "camera_angle": "C",
        "audio_environment": "C",
        "privacy": "C",
    },
    issues=[
        {
            "category": "general",
            "severity": "warning",
            "description": "AI vision analysis unavailable. Scores are placeholder estimates.",
            "fix": "Set ANTHROPIC_API_KEY environment variable to enable Claude Vision analysis.",
        }
    ],
    overall_grade="C",
    room_estimate=None,
    observations="AI vision analysis is not available. Please configure ANTHROPIC_API_KEY for real analysis.",
    model="fallback",
    latency_ms=0,
    source="fallback",
)


async def analyze_photo(image_bytes: bytes, media_type: str = "image/jpeg") -> VisionResult:
    """Analyze a single room photo using Claude Vision API."""
    if not ANTHROPIC_API_KEY:
        log.warning("ANTHROPIC_API_KEY not set; returning fallback assessment")
        return FALLBACK_RESULT

    b64 = base64.b64encode(image_bytes).decode("ascii")
    t0 = time.monotonic()

    try:
        async with httpx.AsyncClient(timeout=VISION_TIMEOUT) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": VISION_MODEL,
                    "max_tokens": 1024,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": b64,
                                    },
                                },
                                {"type": "text", "text": VISION_PROMPT},
                            ],
                        }
                    ],
                },
            )
        latency = int((time.monotonic() - t0) * 1000)

        if resp.status_code != 200:
            log.error("Claude API error %d: %s", resp.status_code, resp.text[:500])
            return FALLBACK_RESULT

        data = resp.json()
        text = data["content"][0]["text"]

        # Parse JSON from response (handle markdown code fences)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        parsed = json.loads(text)
        scores = parsed.get("scores", {})

        return VisionResult(
            scores=scores,
            issues=parsed.get("issues", []),
            overall_grade=parsed.get("overall_grade", _compute_overall(scores)),
            room_estimate=parsed.get("room_estimate"),
            observations=parsed.get("observations", ""),
            model=VISION_MODEL,
            latency_ms=latency,
            source="claude",
        )

    except json.JSONDecodeError as e:
        log.error("Failed to parse Claude vision response as JSON: %s", e)
        return FALLBACK_RESULT
    except Exception as e:
        log.error("Vision analysis failed: %s", e)
        return FALLBACK_RESULT


async def analyze_photos(photos: list[tuple[bytes, str, str]]) -> VisionResult:
    """Analyze multiple photos and aggregate scores.

    Args:
        photos: list of (image_bytes, media_type, photo_type) tuples.
    Returns:
        Aggregated VisionResult with worst-case scores and merged issues.
    """
    if not photos:
        return FALLBACK_RESULT

    results = []
    for img_bytes, media_type, _photo_type in photos:
        r = await analyze_photo(img_bytes, media_type)
        results.append(r)

    # Aggregate: take worst score per category, merge all issues
    all_categories = set()
    for r in results:
        all_categories.update(r.scores.keys())

    agg_scores = {}
    for cat in all_categories:
        worst = 5
        for r in results:
            grade = r.scores.get(cat, "C")
            worst = min(worst, GRADE_ORDER.get(grade.upper(), 3))
        agg_scores[cat] = GRADE_FROM_SCORE.get(worst, "C")

    all_issues = []
    seen = set()
    for r in results:
        for issue in r.issues:
            key = "{}:{}".format(issue.get("category", ""), issue.get("description", "")[:50])
            if key not in seen:
                seen.add(key)
                all_issues.append(issue)

    observations = "; ".join(r.observations for r in results if r.observations and r.source != "fallback")

    total_latency = sum(r.latency_ms for r in results)
    model = results[0].model if results else "fallback"
    source = "claude" if any(r.source == "claude" for r in results) else "fallback"

    return VisionResult(
        scores=agg_scores,
        issues=all_issues,
        overall_grade=_compute_overall(agg_scores),
        room_estimate=next((r.room_estimate for r in results if r.room_estimate), None),
        observations=observations,
        model=model,
        latency_ms=total_latency,
        source=source,
    )
