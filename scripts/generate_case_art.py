"""Generate cinematic category header images for the Case Library page.
Uses GPT-4o (OpenAI) image generation API and Gemini Imagen 3.

Usage:
    python scripts/generate_case_art.py
    python scripts/generate_case_art.py --provider gemini
    python scripts/generate_case_art.py --provider openai
"""
import os, sys, json, base64, argparse, time
from pathlib import Path

# Load .env from services/
env_path = Path(__file__).resolve().parent.parent / "services" / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

OUT_DIR = Path(__file__).resolve().parent.parent / "apps" / "academy-web" / "public" / "images" / "cases"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = {
    "sleep": {
        "label": "Sleep Issues",
        "prompt": "A serene moonlit bedroom with soft lavender light filtering through sheer curtains, "
                  "a calm ocean visible through the window, subtle star particles floating in the air. "
                  "Cinematic wide shot, shallow depth of field, warm amber and cool blue tones. "
                  "Ultra-realistic, 16:9 aspect ratio, dark atmospheric background suitable for dark UI overlay."
    },
    "anxiety": {
        "label": "Anxiety & Stress",
        "prompt": "A person standing in a vast calm forest clearing at golden hour, ancient trees forming "
                  "a natural cathedral of light, ground covered in soft moss, particles of light floating "
                  "gently. Grounding and safety. Cinematic lighting, warm amber and deep green tones. "
                  "Ultra-realistic, 16:9, dark atmospheric background suitable for dark UI overlay."
    },
    "confidence": {
        "label": "Confidence & Performance",
        "prompt": "A grand stage seen from backstage wings, dramatic spotlights creating volumetric light beams, "
                  "a single confident figure in silhouette about to step forward. Gold and teal accent lighting. "
                  "Cinematic, shallow depth of field, professional theatre atmosphere. "
                  "16:9, dark atmospheric background suitable for dark UI overlay."
    },
    "habits": {
        "label": "Habits & Behavior",
        "prompt": "A mystical transformation chamber - an old wooden door opening into brilliant warm light, "
                  "butterflies emerging from the doorway, chains on the floor broken apart. "
                  "Cinematic golden hour lighting, amber and purple tones, magical realism. "
                  "16:9, dark atmospheric background suitable for dark UI overlay."
    },
    "pain": {
        "label": "Pain & Comfort",
        "prompt": "A healing garden with a gentle waterfall, warm therapeutic light emanating from smooth stones, "
                  "soft mist rising, flowers blooming in soft purple and gold. "
                  "Cinematic warm lighting, compassionate atmosphere, shallow depth of field. "
                  "16:9, dark atmospheric background suitable for dark UI overlay."
    },
    "relationships": {
        "label": "Relationships",
        "prompt": "Two silhouettes on a bridge at twilight, connected by a soft golden thread of light, "
                  "city lights reflected in calm water below, warm sunset colors fading to deep purple sky. "
                  "Cinematic wide shot, emotional warmth, depth of field. "
                  "16:9, dark atmospheric background suitable for dark UI overlay."
    },
}


def generate_openai(category_id, prompt, label):
    """Generate image using GPT-4o responses API with image_generation tool."""
    try:
        from openai import OpenAI
    except ImportError:
        print("pip install openai")
        return None

    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    out_path = OUT_DIR / "{}.png".format(category_id)

    print("  [OpenAI] Generating: {} ...".format(label))
    try:
        response = client.responses.create(
            model="gpt-4o",
            input="Generate a cinematic, atmospheric image: {}".format(prompt),
            tools=[{"type": "image_generation", "size": "1536x1024", "quality": "high"}],
        )

        for output in response.output:
            if output.type == "image_generation_call":
                img_bytes = base64.b64decode(output.result)
                out_path.write_bytes(img_bytes)
                print("    Saved: {} ({:.0f} KB)".format(out_path.name, len(img_bytes) / 1024))
                return str(out_path)
    except Exception as e:
        print("    Error: {}".format(e))
    return None


def generate_gemini(category_id, prompt, label):
    """Generate image using Gemini 2.5 Flash (Nano Banana) native image generation."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("pip install google-genai")
        return None

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("    No GEMINI_API_KEY or GOOGLE_API_KEY found")
        return None

    client = genai.Client(api_key=api_key)
    out_path = OUT_DIR / "{}_gemini.png".format(category_id)

    print("  [Gemini] Generating: {} ...".format(label))
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents="Generate a cinematic, atmospheric image for a hypnotherapy category '{}': {}".format(label, prompt),
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                img_bytes = part.inline_data.data
                out_path.write_bytes(img_bytes)
                print("    Saved: {} ({:.0f} KB)".format(out_path.name, len(img_bytes) / 1024))
                return str(out_path)
        print("    No image in response")
    except Exception as e:
        print("    Error: {}".format(e))
    return None


def main():
    parser = argparse.ArgumentParser(description="Generate Case Library category art")
    parser.add_argument("--provider", choices=["openai", "gemini", "both"], default="both")
    parser.add_argument("--categories", nargs="*", default=list(CATEGORIES.keys()))
    args = parser.parse_args()

    print("Case Library Art Generator")
    print("Output: {}".format(OUT_DIR))
    print("Provider: {}".format(args.provider))
    print()

    results = {}
    for cat_id in args.categories:
        if cat_id not in CATEGORIES:
            print("Unknown category: {}".format(cat_id))
            continue
        cat = CATEGORIES[cat_id]
        print("[{}] {}".format(cat_id, cat["label"]))

        if args.provider in ("openai", "both"):
            path = generate_openai(cat_id, cat["prompt"], cat["label"])
            if path:
                results.setdefault(cat_id, []).append(("openai", path))

        if args.provider in ("gemini", "both"):
            path = generate_gemini(cat_id, cat["prompt"], cat["label"])
            if path:
                results.setdefault(cat_id, []).append(("gemini", path))

        time.sleep(1)

    print()
    print("Generated {} images for {} categories".format(
        sum(len(v) for v in results.values()), len(results)))
    for cat_id, paths in results.items():
        for provider, path in paths:
            print("  {} [{}]: {}".format(cat_id, provider, Path(path).name))


if __name__ == "__main__":
    main()
