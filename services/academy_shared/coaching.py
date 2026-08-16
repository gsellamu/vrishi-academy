"""AI coaching engine -- OOP wrapper around Ollama for agentic feedback.

All coaching output is advisory-only with source attribution.
Gracefully falls back to canned responses when Ollama is unavailable.
"""
from __future__ import annotations
import logging
import time
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class CoachingResult:
    """Immutable result from a coaching call."""
    text: str
    model: str
    latency_ms: int
    source: str        # "ollama" or "offline"
    advisory: bool = True


class CoachingEngine:
    """Stateful AI coaching service backed by Ollama.

    Constructor-injected config makes it testable (pass a mock URL or
    override ``_call_llm`` in a subclass) and swappable (change model
    without touching callers).
    """

    SYSTEM_PROMPT = (
        "You are VRishi Coach, an AI teaching assistant for Kappasinian "
        "hypnotherapy students. You provide specific, actionable practice "
        "advice grounded in HMI curriculum. Always be encouraging but honest. "
        "Reference specific techniques (PHS, E/P axis, ToM, NLP rapport model, "
        "VAK matching). Keep responses under 200 words. "
        "You are advisory only - always note that human mentors provide the "
        "definitive guidance."
    )

    FALLBACKS = {
        "drill_debrief": (
            "Great effort on completing this drill. Focus on the checkpoints "
            "you missed - each one represents a clinical safety or technique "
            "element that matters in real sessions. Try isolating the missed "
            "items as single-skill drills before your next full run. "
            "(Advisory: consult your mentor for personalized feedback.)"
        ),
        "session_debrief": (
            "Good work completing this studio session. Review the NLP "
            "annotations to deepen your understanding of conversational "
            "hypnosis techniques. Pay attention to the tonality shifts "
            "between stages - they guide your vocal delivery. "
            "(Advisory: your mentor can provide clinical supervision.)"
        ),
        "gap_advice": (
            "Track your progress weekly and aim for consistent small gains "
            "rather than cramming. Prioritize the category furthest behind "
            "your target pace. "
            "(Advisory: coordinate with your HMI advisor for the most "
            "accurate guidance.)"
        ),
        "study_plan": (
            "Aim for daily 15-minute PSR warm-ups, 2-3 full studio sessions "
            "per week, and at least one new drill focus area each week. Rest "
            "one day per week. "
            "(Advisory: your mentor can customize this plan.)"
        ),
        "grading": (
            "Review your session against the rubric criteria. Focus on areas "
            "scoring below 70% -- these represent the highest-impact "
            "improvement opportunities. "
            "(Advisory: your mentor provides the definitive grade.)"
        ),
    }

    def __init__(self, ollama_url: str, model: str, timeout: float = 15.0):
        self._url = ollama_url
        self._model = model
        self._timeout = timeout

    # -- core LLM call (override for testing) --------------------------------

    async def _call_llm(self, prompt: str) -> str | None:
        """Call Ollama and return the response text, or None on failure."""
        async with httpx.AsyncClient(timeout=self._timeout) as cli:
            r = await cli.post(
                "{}/api/chat".format(self._url),
                json={
                    "model": self._model,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": self.SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "options": {"num_predict": 300, "temperature": 0.7},
                },
            )
            r.raise_for_status()
            return r.json().get("message", {}).get("content", "").strip() or None

    async def chat(self, messages: list[dict], max_tokens: int = 300) -> CoachingResult:
        """Send a pre-built messages list to Ollama and return a CoachingResult."""
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as cli:
                r = await cli.post(
                    "{}/api/chat".format(self._url),
                    json={
                        "model": self._model,
                        "stream": False,
                        "messages": messages,
                        "options": {"num_predict": max_tokens, "temperature": 0.7},
                    },
                )
                r.raise_for_status()
                text = r.json().get("message", {}).get("content", "").strip()
                latency = int((time.monotonic() - start) * 1000)
                if text:
                    return CoachingResult(text=text, model=self._model, latency_ms=latency, source="ollama")
        except Exception as exc:
            log.debug("Ollama chat call failed: %s", exc)
        latency = int((time.monotonic() - start) * 1000)
        return CoachingResult(
            text="I'm unable to process your question right now. Please try again later. (Advisory: consult your mentor.)",
            model="fallback", latency_ms=latency, source="offline",
        )

    async def coach(self, prompt: str, context_type: str = "general") -> CoachingResult:
        """Send a prompt to the LLM and return a CoachingResult.

        Falls back to a canned response when Ollama is unreachable.
        """
        start = time.monotonic()
        try:
            text = await self._call_llm(prompt)
            latency = int((time.monotonic() - start) * 1000)
            if text:
                return CoachingResult(text=text, model=self._model, latency_ms=latency, source="ollama")
        except Exception as exc:
            log.debug("Ollama call failed: %s", exc)
        latency = int((time.monotonic() - start) * 1000)
        return CoachingResult(
            text=self.FALLBACKS.get(context_type, self.FALLBACKS["drill_debrief"]),
            model="fallback", latency_ms=latency, source="offline",
        )

    # -- drill coaching ------------------------------------------------------

    @staticmethod
    def build_drill_prompt(drill_id: str, score: int, missed: list, mode: str) -> str:
        missed_str = "; ".join(missed[:6]) if missed else "none"
        return (
            "A student just completed the '{}' drill in {} mode and scored "
            "{}/100. Missed checkpoints: [{}]. Give 3 specific tips to "
            "improve on the missed areas. Reference the Kappasinian "
            "technique and explain WHY each checkpoint matters clinically."
        ).format(drill_id, mode, score, missed_str)

    async def debrief_drill(self, drill_id: str, score: int, missed: list, mode: str) -> CoachingResult:
        prompt = self.build_drill_prompt(drill_id, score, missed, mode)
        return await self.coach(prompt, "drill_debrief")

    # -- session coaching ----------------------------------------------------

    @staticmethod
    def build_session_prompt(
        plan: str, persona: str, ep_type: str, nlp_pct: float,
        nods: int, awaits: int, duration_s: int, tonalities: list,
    ) -> str:
        return (
            "A student completed a '{}' studio session with persona '{}' "
            "(EP: {}). Stats: {}/{} ideomotor responses captured, NLP "
            "coverage {:.0f}%, duration {}s, tonalities used: {}. "
            "Provide a clinical debrief: What went well based on the nod "
            "count? How can NLP coverage improve? Are the tonality choices "
            "correct for this EP type? Give 3 actionable recommendations "
            "for the next session."
        ).format(plan, persona, ep_type, nods, awaits, nlp_pct, duration_s,
                 ", ".join(tonalities))

    async def debrief_session(
        self, plan: str, persona: str, ep_type: str, nlp_pct: float,
        nods: int, awaits: int, duration_s: int, tonalities: list,
    ) -> CoachingResult:
        prompt = self.build_session_prompt(plan, persona, ep_type, nlp_pct,
                                           nods, awaits, duration_s, tonalities)
        return await self.coach(prompt, "session_debrief")

    # -- gap coaching --------------------------------------------------------

    @staticmethod
    def build_gap_prompt(
        contacts: tuple, conferences: tuple, electives: tuple,
        workshops: tuple, days_left: int,
    ) -> str:
        return (
            "An HMI student has {} days until graduation (Dec 10, 2026). "
            "Current progress: Contacts: {}/{}, Conferences: {}/{}, "
            "Electives: {:.0f}/{:.0f} hrs, Workshops: {}/{}. "
            "Calculate the weekly pace needed for each category. "
            "Identify which area is most behind and suggest a specific "
            "weekly schedule. Be encouraging but realistic about the timeline."
        ).format(days_left, contacts[0], contacts[1], conferences[0],
                 conferences[1], electives[0], electives[1],
                 workshops[0], workshops[1])

    async def analyze_pace(
        self, contacts: tuple, conferences: tuple, electives: tuple,
        workshops: tuple, days_left: int,
    ) -> CoachingResult:
        prompt = self.build_gap_prompt(contacts, conferences, electives,
                                       workshops, days_left)
        return await self.coach(prompt, "gap_advice")

    # -- weak area coaching --------------------------------------------------

    @staticmethod
    def build_weak_area_prompt(weak_items: list[dict]) -> str:
        items_str = "; ".join(
            "'{}' in {} (missed {} times)".format(w["check"], w["drill_id"], w["miss_count"])
            for w in weak_items[:8]
        )
        return (
            "A student's most-missed practice checkpoints are: [{}]. "
            "For each weak area, explain the clinical importance and give "
            "a focused micro-drill (30-60 seconds) the student can use to "
            "strengthen that specific skill."
        ).format(items_str)

    async def analyze_weak_areas(self, weak_items: list[dict]) -> CoachingResult:
        prompt = self.build_weak_area_prompt(weak_items)
        return await self.coach(prompt, "drill_debrief")

    # -- study plan ----------------------------------------------------------

    @staticmethod
    def build_study_plan_prompt(
        drill_stats: list[dict], session_count: int, days_since_start: int,
        gap_behind: str, weak_areas: list[str],
    ) -> str:
        drills_str = ", ".join(
            "{} (avg {}, {}x)".format(d["drill_id"], d["avg_score"], d["attempts"])
            for d in drill_stats[:10]
        )
        return (
            "Build a personalized weekly study plan for this HMI "
            "hypnotherapy student. They have been practicing for {} days "
            "with {} studio sessions. Drill stats: [{}]. Gap status: {}. "
            "Weak areas: {}. Create a Monday-Sunday plan with specific "
            "drills, presets, and studio sessions for each day. Include "
            "rest days. Prioritize weak areas and the most-behind gap category."
        ).format(days_since_start, session_count, drills_str, gap_behind,
                 ", ".join(weak_areas[:5]))

    async def generate_study_plan(
        self, drill_stats: list[dict], session_count: int,
        days_since_start: int, gap_behind: str, weak_areas: list[str],
    ) -> CoachingResult:
        prompt = self.build_study_plan_prompt(drill_stats, session_count,
                                              days_since_start, gap_behind,
                                              weak_areas)
        return await self.coach(prompt, "study_plan")

    # -- grading (used by grader-svc) ----------------------------------------

    @staticmethod
    def build_grading_prompt(rubric_name: str, dimensions: list[dict], data: dict) -> str:
        dims = "\n".join(
            "- {} (weight {}): {}".format(d["name"], d["weight"], d["criteria"])
            for d in dimensions
        )
        return (
            "Grade this hypnotherapy practice attempt using the '{}' rubric.\n\n"
            "RUBRIC DIMENSIONS:\n{}\n\n"
            "ATTEMPT DATA:\n{}\n\n"
            "For each dimension, provide a score from 0-100 and a one-sentence "
            "justification. Then give an overall weighted score and a 2-3 "
            "sentence narrative summary with the single most impactful "
            "improvement recommendation."
        ).format(rubric_name, dims, _fmt_data(data))

    async def grade(self, rubric_name: str, dimensions: list[dict], data: dict) -> CoachingResult:
        prompt = self.build_grading_prompt(rubric_name, dimensions, data)
        return await self.coach(prompt, "grading")


def _fmt_data(data: dict) -> str:
    """Format attempt data for prompt inclusion."""
    lines = []
    for k, v in data.items():
        if isinstance(v, list) and len(v) > 6:
            v = v[:6]
        lines.append("{}: {}".format(k, v))
    return "\n".join(lines)
