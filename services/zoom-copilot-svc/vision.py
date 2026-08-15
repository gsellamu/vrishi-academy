"""AI vision analysis for Zoom Room photos.

Uses Claude API (claude-sonnet-4-5-20250514) for photo analysis with structured
JSON output. Falls back to a canned assessment when API key is unavailable.
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
VISION_MODEL = os.getenv("VISION_MODEL", "claude-sonnet-4-5-20250514")
VISION_TIMEOUT = float(os.getenv("VISION_TIMEOUT", "30"))

VISION_PROMPT = """\
You are an HMI-certified Zoom Room assessment specialist for hypnotherapy sessions.

Analyze this photo of a room intended for Zoom-based hypnotherapy sessions.
Score each category from A (excellent) to F (unacceptable):

LIGHTING:
- A: Even, soft key light from front; no shadows; neutral 4000-5000K color
- B: Good lighting with minor shadows or slight color cast
- C: Adequate but uneven; some harsh shadows or backlight
- D: Poor lighting; strong backlight, overhead-only, or dark areas
- F: Unacceptable; silhouetted, extreme shadows, or no lighting control

BACKGROUND:
- A: Clean, professional; neutral wall or curated bookshelf; certificates visible
- B: Clean but slightly busy; acceptable for sessions
- C: Some distracting elements; needs cleanup
- D: Cluttered, personal items visible, or inappropriate items
- F: Unprofessional; messy, distracting, or potentially triggering content

CAMERA_ANGLE:
- A: Eye level, centered, head-and-shoulders framing, space above head
- B: Slightly off-center or slightly above/below eye level
- C: Noticeable angle issues but face fully visible
- D: Laptop-on-desk angle (looking up nose) or too far away
- F: Unusable angle; profile view, extreme angle, or face partially cut off

AUDIO_ENVIRONMENT (visual assessment of room acoustics):
- A: Soft furnishings, curtains, carpet; external mic visible; quiet indicators
- B: Some soft surfaces; reasonable acoustic environment
- C: Mixed; some hard surfaces but manageable
- D: Hard walls, tile floor, no soft furnishings; echo likely
- F: Bathroom, kitchen, or highly reverberant space

PRIVACY:
- A: Enclosed room, no windows visible to outside, door closed
- B: Windows with blinds/curtains closed; door visible but closeable
- C: Some privacy concerns but addressable
- D: Open space, visible windows without coverings, shared space
- F: Public area, no privacy possible

For each category scored below A, provide an issue with:
- category: the category name
- severity: "critical" (must fix before sessions) | "warning" (should fix) | "suggestion" (nice to have)
- description: specific problem observed in the photo
- fix: actionable step to resolve it

Also estimate room dimensions if visible (width_m, depth_m, height_m).

Respond with ONLY valid JSON in this exact format:
{
  "scores": {"lighting": "B", "background": "A", "camera_angle": "C", "audio_environment": "B", "privacy": "A"},
  "issues": [
    {"category": "camera_angle", "severity": "critical", "description": "...", "fix": "..."}
  ],
  "overall_grade": "B",
  "room_estimate": {"width_m": 3.5, "depth_m": 4.0, "height_m": 2.7},
  "observations": "Brief summary of what you see in the photo."
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
