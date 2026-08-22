#!/usr/bin/env python3
"""VRishi session renderer v1.0 — profile.yaml + plan.yaml -> SSML.
Usage: render_session.py --profile p.yaml --plan plan.yaml [--flavor full|elevenlabs] [-o out.ssml]"""
import argparse, re, sys
from pathlib import Path
import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
AXES = yaml.safe_load((ROOT / "schema/axes.yaml").read_text(encoding="utf-8"))


def resolve(profile: dict, plan: dict) -> dict:
    ax = AXES
    sex = ax["sex"][profile["sex"]]
    age = ax["age_band"][profile["age_band"]]
    occ = ax["occupation_class"][profile["occupation_class"]]
    ppct = int(profile["suggestibility"]["physical_pct"])
    mode = "literal" if ppct >= 60 else "inferred" if ppct <= 40 else "blended"
    rel = profile.get("relationship_type")
    payoff = ax["relationship_type"][rel]["frame"] if rel else "a steady, quiet satisfaction settling in."
    swaps = age.get("swaps", {})
    lane = plan["lane"]
    if ax["issue_lane"][lane]["referral_required"] and not profile.get("referral_doc_id"):
        sys.exit(f"BLOCKED: lane '{lane}' requires referral_doc_id on the profile (booking gate).")
    if profile["age_band"] in ("child", "teen") and not profile.get("guardian_consent"):
        sys.exit("BLOCKED: minor profile requires guardian_consent: true.")
    if profile["age_band"] == "child" and not profile.get("guardian_present"):
        sys.exit("BLOCKED: child sessions require guardian_present: true.")
    return {
        "name": profile["first_name"], "subj": sex["subj"], "obj": sex["obj"], "poss": sex["poss"],
        "rate": age["rate"], "volume": "+2dB" if profile["age_band"] == "elder" else "medium",
        "mode": mode, "physical_pct": ppct,
        "anchor": occ["anchor"], "metaphor": occ["metaphor"], "payoff_frame": payoff,
        "deepener_style": swaps.get("staircase", "staircase"),
        "vak": profile.get("vak", "balanced"),
        "count_from": 3 if profile["age_band"] == "child" else 20,
        "age_band": profile["age_band"],
        "heavy_light": profile["age_band"] == "adult",
        "induction": profile.get("vars", {}).get("induction", plan.get("induction", "arm_raising")),
        "guided_imagery": bool(profile.get("vars", {}).get("guided_imagery", plan.get("guided_imagery", False))),
        "teach_self_hypnosis": bool(profile.get("vars", {}).get("teach_self_hypnosis", plan.get("teach_self_hypnosis", False))),
        "vars": profile.get("vars", {}),
    }


def pers_factory(p):
    def pers(text, _p=None):
        ctx = {"name": p["name"], "subj": p["subj"], "obj": p["obj"], "poss": p["poss"], **p["vars"]}
        return re.sub(r"\{(\w+)\}", lambda m: str(ctx.get(m.group(1), m.group(0))), text)
    return pers


def substitute_plan(plan, pers):
    def walk(x):
        if isinstance(x, str):
            return pers(x)
        if isinstance(x, list):
            return [walk(i) for i in x]
        if isinstance(x, dict):
            return {k: walk(v) for k, v in x.items()}
        return x
    return walk(plan)


def to_elevenlabs(ssml: str) -> str:
    """EL supports <break>; strip prosody/emphasis/mark/p to plain text + breaks."""
    out = re.sub(r"</?(speak|prosody|emphasis|p)[^>]*>", "", ssml)
    out = re.sub(r"<mark[^>]*/>", "", out)
    out = re.sub(r"[ \t]+", " ", out)
    return re.sub(r"\n{3,}", "\n\n", out).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--template", default="session_first.ssml.j2")
    ap.add_argument("--flavor", choices=["full", "elevenlabs"], default="full")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()

    profile = yaml.safe_load(Path(a.profile).read_text(encoding="utf-8"))
    plan = yaml.safe_load(Path(a.plan).read_text(encoding="utf-8"))
    p = resolve(profile, plan)
    pers = pers_factory(p)
    s = substitute_plan(plan, pers)

    env = Environment(loader=FileSystemLoader(ROOT / "templates"), undefined=StrictUndefined,
                      trim_blocks=True, lstrip_blocks=True)
    env.filters["pers"] = lambda text, p=None: pers(text)
    ssml = env.get_template(a.template).render(p=p, s=s)

    etree.fromstring(ssml.encode())  # hard validation: malformed XML -> raise
    out = to_elevenlabs(ssml) if a.flavor == "elevenlabs" else ssml
    if a.out:
        out_path = Path(a.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(out, encoding="utf-8")
        wc = len(re.sub(r"<[^>]+>", " ", out).split())
        print(f"OK {a.out}  mode={p['mode']} deepener={p['deepener_style']} words={wc}")
    else:
        print(out)


if __name__ == "__main__":
    main()
