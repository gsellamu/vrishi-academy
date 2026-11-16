"""Generate per-case visual story images for the Case Library.
3 images per case: presenting (the problem), therapeutic (the moment), resolution (the hope).
Uses GPT-4o image generation.

Usage:
    python scripts/generate_case_story_art.py
    python scripts/generate_case_story_art.py --cases SLEEP-001 TRAUMA-001
    python scripts/generate_case_story_art.py --provider gemini
"""
import os, sys, json, base64, argparse, time
from pathlib import Path

# Load .env
env_path = Path(__file__).resolve().parent.parent / "services" / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

OUT_DIR = Path(__file__).resolve().parent.parent / "apps" / "academy-web" / "public" / "images" / "cases"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Cinematic, atmospheric, ultra-realistic digital art. Shallow depth of field, "
    "warm amber and cool purple tones. Dark moody background suitable for dark UI overlay. "
    "16:9 composition. No text, no watermarks, no logos."
)

# ── Per-case story prompts ──────────────────────────────────────────────
CASE_PROMPTS = {
    "SLEEP-001": {
        "presenting": "A person lying in bed at 2 AM, eyes wide open, surrounded by floating translucent thought bubbles containing work tasks, emails, and to-do lists swirling around their head like a cyclone. Blue-white screen glow on face. Exhaustion visible. {}".format(STYLE),
        "therapeutic": "Same person in the same bed, but now breathing deeply with hands on chest. The thought bubbles are gently floating upward and dissolving into soft moonlight. A warm amber glow replaces the screen light. Peaceful transition moment. {}".format(STYLE),
        "resolution": "A person sleeping deeply and peacefully in a moonlit room, ocean waves visible through a window. Soft starlight particles. Complete serenity. The mind is quiet, body relaxed. {}".format(STYLE),
    },
    "SLEEP-002": {
        "presenting": "A powerful executive in a glass-walled corner office at night, still working at a standing desk, multiple screens glowing. City lights below. His body is exhausted but his posture is rigid, refusing to stop. A ticking clock shows 1 AM. {}".format(STYLE),
        "therapeutic": "The same executive office, but now the screens are powering down one by one like departments closing. Warm amber light replaces blue screen glow. The man is loosening his tie, shoulders dropping. A visualization of a boardroom with chairs being tucked in. {}".format(STYLE),
        "resolution": "The executive sleeping deeply in a premium dark bedroom. His face is peaceful. A subtle visualization shows his brain like a server room in maintenance mode, with calm green indicator lights. Dawn light beginning at the horizon through the window. {}".format(STYLE),
    },
    "SLEEP-003": {
        "presenting": "A woman founder sitting in bed surrounded by floating holographic screens showing metrics, charts, worst-case scenarios, and Slack messages. Her eyes are tired but her mind won't stop. A physical notepad sits untouched on the nightstand. Midnight blue atmosphere. {}".format(STYLE),
        "therapeutic": "The same woman writing on the notepad, transferring the floating screens onto paper. As each item is written down, the holographic screen dissolves peacefully. The list holds the burden. She is letting go. Warm candlelight replacing blue glow. {}".format(STYLE),
        "resolution": "The woman sleeping peacefully, the notepad closed on the nightstand. Her brain visualized as a calm data center with servers in peaceful maintenance mode, gentle amber status lights. Deep restful sleep. {}".format(STYLE),
    },
    "SLEEP-004": {
        "presenting": "A 56-year-old man in a new apartment in an unfamiliar city, lying awake. Through the window, an exciting but overwhelming new cityscape. His mind is processing new faces, new language sounds, new maps - visualized as data streams flowing into his head. {}".format(STYLE),
        "therapeutic": "The same man in a visualization: a warm sorting room with three sections - a Face Gallery of portraits being calmly filed, a Language Wing with sound waves being organized, a Map Room with routes being traced. Orderly, calming, systematic processing. {}".format(STYLE),
        "resolution": "The man sleeping deeply, a visualization of a depth dial turning from 'surface' to 'deep'. His brain processing in three clear stages. The new city visible through the window now feels like home. Dawn warmth, comfort, belonging. {}".format(STYLE),
    },
    "TRAUMA-001": {
        "presenting": "A young person (22) sitting alone in a dark room, hypervigilant, body tense, scanning the environment. Shadowy figures from the past visible in the periphery. A protective shield of anxiety surrounds them like static electricity. The feeling of being constantly on guard. {}".format(STYLE),
        "therapeutic": "The same person in a warm, safe room they have designed themselves - sunlit, open, with personal comfort objects. Their thumb and index finger pressed together, a warm golden glow radiating from the contact point through their body. The grounding anchor activating. Peace beginning. {}".format(STYLE),
        "resolution": "The young person standing in an open sunlit field, shoulders relaxed, breathing freely. The shadowy figures have transformed into distant mountains - still part of the landscape but no longer threatening. A golden thread connects the inner child to the adult self. Freedom and integration. {}".format(STYLE),
    },
    "WEIGHT-001": {
        "presenting": "A person alone in a dimly lit kitchen at 11 PM, standing at the open refrigerator. The fridge light illuminates their conflicted face. Empty take-out containers on the counter. The switch has flipped - autopilot eating. Emotional storm clouds swirling inside the figure. {}".format(STYLE),
        "therapeutic": "A visualization of the Emotional Pause: between a glowing trigger (stress/loneliness cloud) and the automatic hand reaching for food, a luminous 5-second gap appears - a golden pause button floating in space. The person notices the gap, breath catching. The moment of choice. {}".format(STYLE),
        "resolution": "The same kitchen, but now in warm morning light. The person preparing a mindful meal, fully present. A fork on the plate feels intentionally heavier - the satisfied signal. No storm clouds. Peace with food. The kitchen is a nourishing space, not a battlefield. {}".format(STYLE),
    },
    "WEIGHT-002": {
        "presenting": "A man sitting alone at night surrounded by empty fast food containers, shame and numbness on his face. The switch has flipped - the binge spiral. An inner void visualized as a dark vortex in his chest that food cannot fill. Late night, blue screen light. {}".format(STYLE),
        "therapeutic": "A visualization of the Speed Bump intervention: the man seeing a glowing yellow speed bump appearing in his path between the trigger and the binge. He pauses, takes one conscious breath. In that 5-second window, awareness breaks through the autopilot. {}".format(STYLE),
        "resolution": "The man at a normal dinner table, eating a reasonable meal at a normal pace. Evening light, no shame. The inner void has been replaced by a warm glow of self-compassion. He is present with his food, not battling it. Calm, dignified, free. {}".format(STYLE),
    },
    "WEIGHT-003": {
        "presenting": "A woman in a hospital office at 3 PM, stress visible in her posture. A vending machine glowing in the corridor behind her. Her hand reaches automatically for a candy bar. Cortisol visualized as red energy waves building in her body. The afternoon crash. {}".format(STYLE),
        "therapeutic": "The same woman at 2:45 PM performing a 90-second micro-recovery: eyes closed at her desk, hands on armrests, breathing deeply. The red cortisol waves are being replaced by cool blue-green calm spreading from her center outward. The 3 PM Protocol activating before the crash. {}".format(STYLE),
        "resolution": "The woman walking past the vending machine at 3 PM without stopping, calm and centered. She carries a water bottle and has a small healthy snack from her drawer. The corridor is warm and she is in control. Cortisol managed, stress redirected. {}".format(STYLE),
    },
    "WEIGHT-004": {
        "presenting": "A young woman on a couch at 8 PM, Netflix glowing, hand buried in a chip bag. She looks checked out, dissociated - autopilot mode. The couch-screen-eat circuit is running on its own. Her conscious mind has left the building. {}".format(STYLE),
        "therapeutic": "A visualization of the 8 PM Circuit Breaker: before sitting down, the woman pauses at the living room entrance. A luminous doorway checkpoint appears. She takes one conscious breath, feels her feet on the floor, and CHOOSES what happens next. Awareness re-entering. {}".format(STYLE),
        "resolution": "The woman on the same couch at 8 PM but present and aware. A cup of herbal tea replaces the chip bag. She is watching the screen mindfully, hands visible and still. The autopilot is off. She chose to be here. Evening peace. {}".format(STYLE),
    },
    "WEIGHT-005": {
        "presenting": "A 52-year-old man at a doctor's office, medical charts showing elevated numbers. His body feels like it is working against him - visualized as internal biological machinery (insulin, cortisol, metabolism gears) grinding and stuck. Weight, fatigue, medical pressure. {}".format(STYLE),
        "therapeutic": "A visualization of the body as a complex system receiving new signals: the insulin machinery being gently recalibrated, cortisol levels settling, sleep cycle restoring. A medical scope boundary - the doctor handles medical, the therapist handles behavioral. Collaborative healing. {}".format(STYLE),
        "resolution": "The same man months later, walking outdoors in morning light, lighter on his feet. The biological machinery inside is running smoothly now. His desk drawer at work contains healthy snacks. He is working WITH his body, not against it. Hope and progress. {}".format(STYLE),
    },
    "WEIGHT-006": {
        "presenting": "A 47-year-old woman looking at herself in a mirror, seeing layers of identity wrapped around her like armor. Her mother's voice echoes: 'food is love.' The weight is protection, invisibility, safety. When thin, she felt naked and exposed. Deep identity-level struggle. {}".format(STYLE),
        "therapeutic": "A visualization of the Mother's Voice Reframe: the mother's voice 'eat, eat, food is love' being gently translated - not silenced - into 'I love you, I want you safe.' The woman places a hand on her heart, receiving the love without the food. The protection strategy being honored but released. {}".format(STYLE),
        "resolution": "The woman standing confidently, her inner child visible beside her - both smiling. The armor of weight is dissolving into golden light. She is visible, seen, and safe without it. Identity has expanded beyond the protection. She is free to choose who she becomes. {}".format(STYLE),
    },
}


def generate_openai(case_id, img_type, prompt):
    """Generate image using GPT-4o."""
    from openai import OpenAI
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    out_path = OUT_DIR / "{}_{}.png".format(case_id, img_type)

    print("  [GPT-4o] {} / {} ...".format(case_id, img_type))
    try:
        response = client.responses.create(
            model="gpt-4o",
            input="Generate this cinematic scene: {}".format(prompt),
            tools=[{"type": "image_generation", "size": "1536x1024", "quality": "high"}],
        )
        for output in response.output:
            if output.type == "image_generation_call":
                img_bytes = base64.b64decode(output.result)
                out_path.write_bytes(img_bytes)
                print("    Saved: {} ({:.0f} KB)".format(out_path.name, len(img_bytes) / 1024))
                return True
    except Exception as e:
        print("    Error: {}".format(e))
    return False


def generate_gemini(case_id, img_type, prompt):
    """Generate image using Gemini 2.5 Flash."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return False

    client = genai.Client(api_key=api_key)
    out_path = OUT_DIR / "{}_{}_gemini.png".format(case_id, img_type)

    print("  [Gemini] {} / {} ...".format(case_id, img_type))
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents="Generate this cinematic scene: {}".format(prompt),
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                img_bytes = part.inline_data.data
                out_path.write_bytes(img_bytes)
                print("    Saved: {} ({:.0f} KB)".format(out_path.name, len(img_bytes) / 1024))
                return True
    except Exception as e:
        print("    Error: {}".format(e))
    return False


def main():
    parser = argparse.ArgumentParser(description="Generate per-case story images")
    parser.add_argument("--provider", choices=["openai", "gemini", "both"], default="openai")
    parser.add_argument("--cases", nargs="*", default=list(CASE_PROMPTS.keys()))
    parser.add_argument("--types", nargs="*", default=["presenting", "therapeutic", "resolution"])
    args = parser.parse_args()

    print("Case Story Art Generator")
    print("Output: {}".format(OUT_DIR))
    print("Provider: {}".format(args.provider))
    print("Cases: {}".format(len(args.cases)))
    print()

    total = 0
    for case_id in args.cases:
        if case_id not in CASE_PROMPTS:
            print("Unknown case: {}".format(case_id))
            continue
        prompts = CASE_PROMPTS[case_id]
        print("[{}]".format(case_id))
        for img_type in args.types:
            if img_type not in prompts:
                continue
            if args.provider in ("openai", "both"):
                if generate_openai(case_id, img_type, prompts[img_type]):
                    total += 1
            if args.provider in ("gemini", "both"):
                if generate_gemini(case_id, img_type, prompts[img_type]):
                    total += 1
            time.sleep(0.5)
        print()

    print("Done. Generated {} images.".format(total))


if __name__ == "__main__":
    main()
