# -*- coding: utf-8 -*-
"""
S4 Immersive Movie Production Pipeline: "The Room You Build"
=============================================================
Automated production for TM-002 inner child guided visualization.

Usage:
    python produce_s4_movie.py --step narration    # Generate ElevenLabs audio
    python produce_s4_movie.py --step prompts      # Export AI video prompts
    python produce_s4_movie.py --step images        # Generate DALL-E key frames
    python produce_s4_movie.py --step video         # Generate Gemini Veo 2 videos
    python produce_s4_movie.py --step music         # Export Suno AI prompt
    python produce_s4_movie.py --step assemble      # FFmpeg assembly
    python produce_s4_movie.py --step all           # Full pipeline
    python produce_s4_movie.py --step status        # Show asset status
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent.parent  # Jeeth.ai root
OUTPUT_DIR = SCRIPT_DIR / "assets"
AUDIO_DIR = OUTPUT_DIR / "narration"
VIDEO_DIR = OUTPUT_DIR / "video_clips"
IMAGE_DIR = OUTPUT_DIR / "keyframes"
PROMPTS_DIR = OUTPUT_DIR / "prompts"
MUSIC_DIR = OUTPUT_DIR / "music"
ASSEMBLY_DIR = OUTPUT_DIR / "assembly"

for d in [AUDIO_DIR, VIDEO_DIR, IMAGE_DIR, PROMPTS_DIR, MUSIC_DIR, ASSEMBLY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# ENV
# ---------------------------------------------------------------------------
def load_env():
    """Load API keys from .env files."""
    from dotenv import load_dotenv
    # Try PrepPractices .env first, then Jeeth.ai root
    env_paths = [
        SCRIPT_DIR.parent.parent.parent / ".env",  # PrepPractices/.env
        PROJECT_ROOT / ".env",                       # Jeeth.ai/.env
    ]
    for p in env_paths:
        if p.exists():
            load_dotenv(p, override=False)

    keys = {
        "ELEVENLABS_API_KEY": os.getenv("ELEVENLABS_API_KEY"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY") or os.getenv("VIDEO_GEN_GOOGLE_AI_API_KEY"),
        "RUNWAY_API_KEY": os.getenv("VIDEO_GEN_RUNWAY_API_KEY"),
        "KLING_API_KEY": os.getenv("VIDEO_GEN_KLING_API_KEY"),
        "REPLICATE_API_TOKEN": os.getenv("VIDEO_GEN_REPLICATE_API_TOKEN"),
    }
    return keys


# ---------------------------------------------------------------------------
# SCENE DATA
# ---------------------------------------------------------------------------
SCENES = [
    {
        "id": 1,
        "title": "Title Card + Safety Framing",
        "act": "I: ARRIVAL",
        "timecode": "0:00-0:45",
        "duration_sec": 45,
        "narration": (
            "This is a guided visualization designed to help you relax and "
            "explore your inner world. It is not a replacement for therapy. "
            "If at any point you feel uncomfortable, you can pause or stop. "
            "Find a quiet, comfortable place. Do not watch this while driving. "
            "When you are ready, allow your eyes to soften and your breathing to slow."
        ),
        "visual": "Black screen fading to deep navy. Soft golden particles drift slowly upward. Title text: 'The Room You Build'. Subtitle: 'A Guided Visualization'.",
        "prompts": {
            "veo2": "Cinematic slow-motion golden dust particles floating upward against a deep navy background, soft bokeh, warm light from below, 4K, gentle movement, meditative atmosphere, no text, no people",
            "runway": "Golden particles rising slowly against dark blue background, warm light from below, bokeh, meditative, 4K cinematic, abstract, no text",
            "dalle": "Abstract dark navy background with golden dust particles floating upward, soft warm light from below, cinematic bokeh, meditative atmosphere, 16:9 aspect ratio",
        },
        "music_notes": "Silence 3 sec, then single sustained pad note C3, warm analog. Binaural theta 6Hz undertone fades in. Volume -20dB.",
        "el_settings": {"stability": 0.75, "similarity_boost": 0.80, "style": 0.25},
    },
    {
        "id": 2,
        "title": "Breathing Induction",
        "act": "I: ARRIVAL",
        "timecode": "0:45-2:30",
        "duration_sec": 105,
        "narration": (
            "Breathe in through your nose. Slowly. Fill your lungs completely. "
            "... Hold. ... And release through your mouth. Let the breath carry tension out of your body. "
            "... Again. In through the nose. Feel your chest expand. Your shoulders rise slightly. "
            "... Hold. ... And release. Slower this time. Let the shoulders drop. Let the jaw soften. "
            "... One more. The deepest breath. In. ... Hold. ... And release everything. "
            "Every muscle. Every thought. Just let it go."
        ),
        "visual": "Slow aerial shot drifting over calm ocean at golden hour. Waves rolling gently. Horizon at center. Light refracting through water.",
        "prompts": {
            "veo2": "Aerial cinematic shot slowly moving over a calm turquoise ocean at golden hour, gentle rolling waves, sun low on horizon creating golden light path on water, dreamy soft focus, slow camera drift, peaceful meditative, no people, no boats, 16:9",
            "runway": "Ultra slow motion aerial ocean at sunset, calm turquoise water, golden light reflections, gentle waves, cinematic depth of field, meditative peaceful, no people, 16:9 widescreen",
            "kling": "Ultra slow motion ocean waves rolling onto pristine golden sand beach at sunset, camera at water level, warm golden light, bokeh reflections on water surface, therapeutic calming atmosphere, cinematic depth of field",
            "dalle": "Aerial view of calm turquoise ocean at golden hour, gentle rolling waves, golden sunlight path on water, dreamy atmosphere, cinematic photography, 16:9",
        },
        "music_notes": "Ocean ambience fades in beneath pad. Wave rhythm matching 4-count breathing (4s in, 4s hold, 6s out). Binaural deepens to 5Hz.",
        "el_settings": {"stability": 0.80, "similarity_boost": 0.85, "style": 0.20},
    },
    {
        "id": 3,
        "title": "The Staircase Descent",
        "act": "I: ARRIVAL",
        "timecode": "2:30-5:30",
        "duration_sec": 180,
        "narration": (
            "And now, in this relaxed state, see yourself at the top of a staircase. "
            "It is well-built. Solid stone. Warm to the touch. Handrails on both sides. "
            "Well-lit. Safe. Ten steps leading down into warm light. "
            "... Ten. Starting down. Feeling the smooth stone under your feet. "
            "... Nine. Twice as deep. The light below getting warmer. "
            "... Eight. The walls on either side, solid and protective. "
            "... Seven. Deeper still. Twice as deep. "
            "... Six. You can hear a gentle sound from below. Warmth. "
            "... Five. Halfway. You can see the destination now. A warm, open, sunlit space. "
            "No walls. Just light and peace. "
            "... Four. Almost there. "
            "... Three. Twice as deep again. "
            "... Two. One more step. "
            "... One. Step off into that sunlit space. Warm. Bright. Safe. You have arrived."
        ),
        "visual": "POV descending elegant stone staircase. Warm amber lighting from below. Each step reveals more golden light. At bottom: bright sunlit open space.",
        "prompts": {
            "veo2": "POV walking slowly down an elegant wide stone staircase, warm amber lighting from below, soft shadows, smooth stone walls with gentle golden glow, each step reveals more light, cinematic depth, meditative pace, no people visible, warm color palette, 4K",
            "runway": "First person perspective descending beautiful ancient stone staircase into golden light, warm amber atmosphere, soft particles of dust in light beams, slow deliberate movement, sacred temple aesthetic, peaceful, cinematic 24fps",
            "kling": "POV slowly descending warm stone staircase, golden light increasing with each step, smooth stone walls, soft dust particles in light beams, arriving at bright sunlit space at bottom, cinematic, meditative, 4K",
        },
        "music_notes": "Ocean fades out 10s. Warm reverberant space acoustic. Single cello G2 sustained. Binaural 4Hz. Gentle chime on each step count.",
        "el_settings": {"stability": 0.80, "similarity_boost": 0.85, "style": 0.15},
    },
    {
        "id": 4,
        "title": "Body Awareness - Where Does It Live?",
        "act": "II: THE MIST",
        "timecode": "5:30-7:00",
        "duration_sec": 90,
        "narration": (
            "In this deep, safe state, I want you to notice something. "
            "There is a feeling you have been carrying. The one you described: "
            "feeling alone even when surrounded by people. The thought that says: "
            "they do not really care. "
            "... Let that feeling come now. Not the thought. The feeling underneath it. "
            "... And notice where in your body it lives. Some people feel it in the pit of the stomach. "
            "Others in the chest. A tightness. A heaviness. A hollowness. "
            "Wherever it is, notice it. It has been there a long time. "
            "It knows where it came from. "
            "... Now let that feeling become a thread. A compass. Trust it. "
            "Let it guide you back. Back through time. To the very first moment you felt this way."
        ),
        "visual": "Warm glowing human silhouette from behind, standing in sunlit space. Subtle blue-violet light pulses from chest/stomach area. Camera slowly orbits.",
        "prompts": {
            "runway": "Ethereal glowing human silhouette standing in golden light, seen from behind, subtle blue-violet light pulsing from chest area, warm ambient space, abstract therapeutic visualization, cinematic, soft particles, 4K",
            "dalle": "Ethereal glowing human silhouette from behind, standing in warm golden light, subtle blue-violet glow pulsing from chest area, abstract meditative visualization, cinematic, 16:9",
        },
        "music_notes": "Cello continues. Add low frequency pulse 60 BPM (heartbeat). Binaural 4Hz sustained.",
        "el_settings": {"stability": 0.75, "similarity_boost": 0.80, "style": 0.30},
    },
    {
        "id": 5,
        "title": "Arriving in the Mist",
        "act": "II: THE MIST",
        "timecode": "7:00-8:30",
        "duration_sec": 90,
        "narration": (
            "You are arriving somewhere. A memory. A feeling. A moment from long ago. "
            "... Perhaps it appears as though you are surrounded by a dense layer of mist. "
            "A fog that has been sitting over this moment for years. "
            "You may feel alone in it. Even though you are safe. Even though you are the adult, here, now. "
            "... And through the mist, something becomes visible. A small figure. "
            "Standing very still. A child. "
            "Your subconscious knows exactly how old he is. You do not need to choose. "
            "He is just there. In the mist. Waiting."
        ),
        "visual": "Sunlit space gradually fills with dense soft white-gray mist. Golden light diffuses. A small child silhouette appears in the fog. Alone. Still.",
        "prompts": {
            "veo2": "Dense soft morning mist in a golden-lit space, ethereal atmosphere, a small child silhouette barely visible through the fog, standing alone, backlit by warm diffused golden light, cinematic, emotional, dreamlike, 16:9 aspect ratio, no face visible",
            "kling": "Atmospheric morning fog slowly rolling through a warm golden space, a small boy silhouette standing alone in the distance, soft light filtering through mist creating god rays, emotional cinematic photography, shallow depth of field, no face visible",
        },
        "music_notes": "Cello drops to pianissimo. Distant gentle wind (sighing, not harsh). Binaural 3.5Hz. Heartbeat pulse slows.",
        "el_settings": {"stability": 0.70, "similarity_boost": 0.80, "style": 0.35},
    },
    {
        "id": 6,
        "title": "The Adult Arrives",
        "act": "II: THE MIST",
        "timecode": "8:30-10:00",
        "duration_sec": 90,
        "narration": (
            "And now, from behind you, your adult self moves forward. Arms open. "
            "Pushing through the mist. Not with force. With presence. "
            "The mist parts because the adult has arrived. "
            "... And there he is. As the fog clears. Face to face with the person you are now. "
            "The adult who handles difficult situations with calm. "
            "Who shows up every week for his group. Who pulled a friend from a river. "
            "Who is doing this work right now. "
            "... That adult is you. And the child has been waiting for you. For a very long time."
        ),
        "visual": "POV hands reaching forward parting thick mist like curtains. Golden light floods through. Child's figure becomes clear. Mist clears around both. Two figures: adult (strong) and child (small, looking up).",
        "prompts": {
            "runway": "POV hands reaching forward parting thick white mist like curtains, golden warm light flooding through from behind, revealing a small boy standing in cleared space ahead, cinematic emotional moment, warm color palette, soft particles in light beams, no faces visible",
            "veo2": "Dense mist parting dramatically revealing golden light behind, a small child silhouette becoming visible as fog clears, god rays streaming through, emotional cinematic moment, warm amber palette, abstract therapeutic, 4K",
        },
        "music_notes": "SWELL: cello rises mezzo-forte. Warm string pad joins (Am to C major resolution). Mist parts = harmonic resolution. Golden bell tone. Binaural 7Hz briefly then back to 4Hz.",
        "el_settings": {"stability": 0.70, "similarity_boost": 0.80, "style": 0.35},
    },
    {
        "id": 7,
        "title": "Building the Safe Room",
        "act": "III: THE ROOM",
        "timecode": "10:00-11:30",
        "duration_sec": 90,
        "narration": (
            "Now, you are not going to stay in his memory. You are going to take him somewhere new. "
            "Somewhere safe. A room that exists only in your mind. You are the architect. "
            "... Watch the walls form around you. What are they made of? "
            "What is the light like? Is there a window? What do you see through it? "
            "... This room is yours. You built it. Nothing enters without your permission. "
            "And the child is here with you. Inside this room, both of you are safe. "
            "For the first time, safe in the same space."
        ),
        "visual": "Mist dissolves. Warm wood walls materialize around both figures. Window appears showing soft landscape. Natural light pours in. Fireplace ignites. Room assembles like time-lapse of creation.",
        "prompts": {
            "veo2": "Time-lapse of a warm cozy room materializing from nothing, wooden walls forming, a large window appearing showing soft mountains, natural light flooding in, comfortable chair appearing, fireplace igniting, warm color palette, magical manifestation, peaceful, cinematic, 4K",
            "runway": "Magical room construction from nothing, warm wooden walls materializing, window forming to reveal mountain landscape, golden natural light flooding in, fireplace appearing and igniting, dreamy time-lapse, warm palette, cinematic",
        },
        "music_notes": "Strings settle warm sustained bed. Add gentle crackling fire. Room acoustic reverb. Binaural 4Hz steady.",
        "el_settings": {"stability": 0.75, "similarity_boost": 0.80, "style": 0.25},
    },
    {
        "id": 8,
        "title": "Understanding What the Child Carries",
        "act": "III: THE ROOM",
        "timecode": "11:30-13:30",
        "duration_sec": 120,
        "narration": (
            "Look at him. This child made two decisions a long time ago. "
            "Made them with the only information he had. "
            "... The first: the people who should be here are not here. "
            "So I must not be worth being here for. "
            "... The second: the people who are here are angry. "
            "So I must be causing it. Something about me is bad. "
            "... He has been carrying those two stories ever since. "
            "In every room. In every group. In every moment of closeness that felt dangerous instead of safe. "
            "... But underneath those stories, there is a child who was always creative and curious. "
            "A child with a deep desire to belong. A child who did his very best. "
            "He had always done his very best. And his very best was enough. It was always enough."
        ),
        "visual": "Close-up: adult hand resting near smaller child hand (not touching). Firelight on wood. Child silhouette by window. Faint dark aura around child's shoulders gradually thinning as narration progresses.",
        "prompts": {
            "kling": "Close-up cinematic shot of a large gentle hand resting near a small child hand on a warm wooden surface, firelight flickering, shallow depth of field, warm amber lighting, emotional intimate moment, not touching yet, anticipation, no faces",
            "runway": "Small boy silhouette standing by a large window in a warm room, looking out at soft golden landscape, subtle dark shadow around shoulders gradually dissolving, firelight reflections, emotional cinematic, warm palette, no face visible",
        },
        "music_notes": "Cello solo. Simple melodic emotional. Major/minor ambiguity. Fire crackling continues.",
        "el_settings": {"stability": 0.70, "similarity_boost": 0.80, "style": 0.35},
    },
    {
        "id": 9,
        "title": "Speaking to the Child - The Correction",
        "act": "III: THE ROOM",
        "timecode": "13:30-15:00",
        "duration_sec": 90,
        "narration": (
            "You were always worth staying for. The people who left did not leave because of you. "
            "Their battles were theirs. Adult battles that a child should never have had to carry. "
            "... And the anger in the house, that was not about you. "
            "Those were adults dealing with their own pain. They did not know how to raise a child. "
            "And instead of asking for help, they lashed out at whoever was smallest and closest. "
            "That was their failure. Not yours. Not for one moment. "
            "... The proof that you are worth caring about is right here. You survived. You grew. "
            "You show up for others even when the wall is up. "
            "You handle anger with more composure than most people develop in a lifetime. "
            "That is who you are. Not the old stories. This."
        ),
        "visual": "Adult hand covers child hand. Golden light emanates from contact point. Dark aura dissolves completely. Room brightens. Fire burns warmer. Window landscape transforms from muted to vivid saturated colors.",
        "prompts": {
            "veo2": "Cinematic close-up of an adult hand gently covering a child smaller hand on wooden surface, warm golden light emanating from point of contact, room brightening, shadows dissolving, window view transforming from muted to vivid colorful landscape, emotional peak, warm amber lighting, 4K",
            "dalle": "Close-up of adult hand covering child's small hand, golden light glowing from the point of contact, warm wooden surface, firelight, shadows dissolving into warmth, emotional tender moment, cinematic photography, 16:9",
        },
        "music_notes": "CLIMAX: String swell full ensemble. Major key resolution. Contact = harmonic climax. Warm tender not dramatic. Golden bell tone. Binaural 7.83Hz Schumann resonance.",
        "el_settings": {"stability": 0.65, "similarity_boost": 0.80, "style": 0.40},
    },
    {
        "id": 10,
        "title": "Walking the Life Path Together",
        "act": "IV: THE PATH FORWARD",
        "timecode": "15:00-17:00",
        "duration_sec": 120,
        "narration": (
            "Now take the child's hand. Your adult hand holding his smaller one. "
            "And together, step out of the room. "
            "... You are on a path. Your life path. And on either side, "
            "you see the moments where the old fear lived. They are there like old photographs. "
            "But this time, you are not alone in those photographs. "
            "You are walking through with the child's hand in yours. "
            "... Smile at those experiences as you pass. Wave to them. You survived. "
            "They thought they could define you. They were wrong. "
            "... And ahead on the path, something new. A group of people sitting in a circle. "
            "Familiar faces. And this time, as you approach, something has changed. "
            "The glass wall is thinner. Maybe still there. But thinner. "
            "Because the child knows now. He knows he was always worth staying for."
        ),
        "visual": "Adult and child walking hand-in-hand (from behind, above). Golden hour path. Translucent faded photograph-memories float on either side. Each fades as they pass. Ahead: warm group sitting in circle.",
        "prompts": {
            "kling": "Cinematic tracking shot from behind and above, adult and small child walking hand-in-hand along a golden sunlit path, translucent faded memory frames floating on either side like ghostly photographs, warm golden hour lighting, ahead a group of people sit in a circle, emotional journey, 16:9, no faces visible",
            "veo2": "Two figures walking hand in hand on golden sunlit path, adult and child seen from behind, translucent ghostly photo frames floating on sides of path fading as they pass, warm amber light, cinematic, emotional, 4K",
        },
        "music_notes": "Walking pizzicato cello. Gentle forward-moving. String pad underneath. Nature: birdsong, gentle wind. Binaural 6Hz.",
        "el_settings": {"stability": 0.70, "similarity_boost": 0.80, "style": 0.35},
    },
    {
        "id": 11,
        "title": "Integration - The Child Comes Home",
        "act": "IV: THE PATH FORWARD",
        "timecode": "17:00-19:00",
        "duration_sec": 120,
        "narration": (
            "Look at the child now. Something has changed. He heard you. "
            "He received what you gave him. "
            "... And now, if it feels right, move closer. "
            "The child steps toward you. Glowing. Warm. "
            "And as he reaches you, he does not disappear. He integrates. "
            "He becomes part of you again. Not locked away. Not behind a wall. Part of you. "
            "... The child's sensitivity, his curiosity, his capacity for feeling, those are gifts. "
            "And the adult's strength, his evidence, his ability to see the truth, "
            "that is the protection the child always needed. "
            "Both exist in you now. Together. Not at war. Integrated. "
            "... Press your thumb and forefinger together. Right hand. "
            "Feel everything. The tribe. The circle. The armor. "
            "And now, the child. Held. Safe. No longer alone. "
            "One gesture. One breath. Everything you have built. Layered. Compounded. Yours."
        ),
        "visual": "Child glows golden, steps forward into adult silhouette, merging. Adult glows from within. Golden aura emanates. Camera pulls back to full figure, tall, glowing. 11 tribe circle figures appear briefly in ring, dissolve into aura. 5-sec silence after merge.",
        "prompts": {
            "veo2": "Ethereal scene of a glowing golden child stepping into the silhouette of an adult, light merging, adult figure now glowing from within with warm amber aura, translucent protective figures appearing in circle then dissolving into golden light, cinematic emotional climax, abstract therapeutic, 4K",
            "runway": "Glowing child figure merging into adult silhouette, golden light integration, adult body illuminated from within, protective translucent figures appearing in circle around them then dissolving, emotional peak, abstract cinematic, warm palette",
        },
        "music_notes": "Full orchestral swell warm. Major key. Merge = crescendo. Then settle single cello note. Binaural 7.83Hz Schumann. 5 SECONDS SILENCE after merge before anchor instruction.",
        "el_settings": {"stability": 0.65, "similarity_boost": 0.80, "style": 0.40},
    },
    {
        "id": 12,
        "title": "The Bubbles - Old Fears Released",
        "act": "V: RETURN",
        "timecode": "19:00-20:00",
        "duration_sec": 60,
        "narration": (
            "And the old fears? They have become like bubbles now. "
            "The kind a child blows in the yard. Watch them rise. "
            "Not enough. Pop. My fault. Pop. Nobody cares. Pop. "
            "Gone. Not because you fought them. Because there is nothing left inside them. "
            "The air is out. The beach ball is deflated. It does not bob back up."
        ),
        "visual": "Translucent bubbles rise from ground around glowing figure. Inside each: faint text ('not enough', 'alone', 'my fault'). Each pops releasing tiny golden light burst. Sky clears above.",
        "prompts": {
            "runway": "Beautiful translucent iridescent bubbles rising from golden ground, faint text words dissolving as bubbles pop into tiny golden light bursts, dreamy sky background clearing, playful liberating, cinematic, warm palette, abstract, 4K",
        },
        "music_notes": "Gentle pizzicato playful. Each pop = soft chime. Binaural rising toward 10Hz alpha.",
        "el_settings": {"stability": 0.75, "similarity_boost": 0.80, "style": 0.25},
    },
    {
        "id": 13,
        "title": "Ascending - Count Out",
        "act": "V: RETURN",
        "timecode": "20:00-21:15",
        "duration_sec": 75,
        "narration": (
            "One. Feel your body. The surface beneath you. Your feet on the ground. "
            "... Two. Fingers move. Toes wiggle. A stretch if your body wants it. "
            "... Three. Halfway back. Refreshed. Clear. Something is lighter. "
            "... Four. More alert. Sounds around you. Light. "
            "The child is with you. Not behind a wall. With you. "
            "... Five. Eyes open. Wide awake. Fully alert. Welcome back."
        ),
        "visual": "Reverse of Scene 3. POV ascending stone staircase. Each step brighter. Golden underground gives way to natural daylight. At top: bright clear sky, vivid saturated world.",
        "prompts": {
            "veo2": "POV ascending elegant stone staircase, each step brighter, warm golden light transitioning to bright natural daylight, emerging into clear blue sky and fresh air, vivid saturated colors at the top, cinematic, hopeful, uplifting, 4K",
        },
        "music_notes": "Ascending string line, semitone per step. Binaural 10-12-14Hz toward beta. Nature returns: birdsong, wind.",
        "el_settings": {"stability": 0.80, "similarity_boost": 0.85, "style": 0.15},
    },
    {
        "id": 14,
        "title": "Closing Card + Post-Hypnotic",
        "act": "V: RETURN",
        "timecode": "21:15-22:00",
        "duration_sec": 45,
        "narration": (
            "Between now and your session, you may notice something. "
            "Moments of unexpected calm. Moments where the old beliefs try to fire "
            "and something new meets them first. The adult's voice. The evidence. The truth. "
            "... Notice those moments. Do not dismiss them. "
            "That is the child receiving what was always owed to him. "
            "... The door between you is always open now. He is no longer alone."
        ),
        "visual": "Bright warm outdoor landscape. Camera pulling back to reveal vista. Text fades in: 'The door is always open. The child is no longer alone.' VRishi logo. Fade to warm black.",
        "prompts": {
            "kling": "Beautiful warm sunset landscape wide vista, mountains, golden light, camera slowly pulling back revealing expansive peaceful view, cinematic, hopeful, warm palette, 4K",
            "dalle": "Panoramic sunset landscape with mountains and golden light, warm peaceful vista, cinematic photography, hopeful atmosphere, 16:9 aspect ratio",
        },
        "music_notes": "Single cello resolving to tonic. Binaural fades out. Nature ambience 5s past fade-to-black. Silence.",
        "el_settings": {"stability": 0.80, "similarity_boost": 0.85, "style": 0.20},
    },
]

# Suno AI music generation prompt
SUNO_PROMPT = (
    "Therapeutic hypnotherapy ambient music, warm emotional cello melody, "
    "gentle sustained string pads, binaural theta waves 4-6 Hz undertone throughout, "
    "slow evolving warm analog pads, key of C major, 70 BPM, "
    "quiet meditative opening building slowly, "
    "emotional string swell climax at 14:00 mark with major key resolution, "
    "gentle playful pizzicato section at 19:00, "
    "ascending hopeful strings from 20:00 to end, "
    "no vocals, no drums, no percussion, no guitar, "
    "total duration 22 minutes, "
    "inspired by Max Richter, Olafur Arnalds, Nils Frahm therapeutic ambient"
)


# ---------------------------------------------------------------------------
# STEP 1: NARRATION (ElevenLabs)
# ---------------------------------------------------------------------------
def generate_narration(keys: dict, scene_ids: Optional[list] = None):
    """Generate per-scene narration audio via ElevenLabs API."""
    import requests

    api_key = keys.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not found in .env")
        return

    voice_id = "EXAVITQu4vr4xnSDxMaL"  # Sophia Empathetic
    url = "https://api.elevenlabs.io/v1/text-to-speech/{}".format(voice_id)
    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}

    scenes = SCENES if scene_ids is None else [s for s in SCENES if s["id"] in scene_ids]

    for scene in scenes:
        out_path = AUDIO_DIR / "scene_{:02d}_{}.mp3".format(scene["id"], scene["title"].replace(" ", "_").replace("-", "").replace("'", "")[:30])
        if out_path.exists():
            print("  SKIP (exists): {}".format(out_path.name))
            continue

        # Replace ... with SSML-style pauses (ElevenLabs handles natural pauses)
        text = scene["narration"].replace("...", " <break time=\"3s\"/> ")

        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": scene.get("el_settings", {
                "stability": 0.75,
                "similarity_boost": 0.80,
                "style": 0.25,
            }),
        }

        print("  Generating scene {}: {} ({} chars)...".format(scene["id"], scene["title"], len(text)))
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=120)
            if resp.status_code == 200:
                out_path.write_bytes(resp.content)
                print("    OK: {} ({:.1f} KB)".format(out_path.name, len(resp.content) / 1024))
            else:
                print("    ERROR {}: {}".format(resp.status_code, resp.text[:200]))
        except Exception as e:
            print("    EXCEPTION: {}".format(e))

        time.sleep(1)  # Rate limiting


# ---------------------------------------------------------------------------
# STEP 2: PROMPTS EXPORT
# ---------------------------------------------------------------------------
def export_prompts():
    """Export all AI video prompts as individual text files, organized by tool."""
    tools = ["veo2", "runway", "kling", "dalle"]
    for tool in tools:
        tool_dir = PROMPTS_DIR / tool
        tool_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for scene in SCENES:
            if tool in scene.get("prompts", {}):
                fname = "scene_{:02d}_{}.txt".format(scene["id"], tool)
                (tool_dir / fname).write_text(
                    "SCENE {}: {}\n"
                    "TIMECODE: {}\n"
                    "DURATION: {}s\n"
                    "VISUAL DESCRIPTION: {}\n\n"
                    "PROMPT:\n{}\n".format(
                        scene["id"], scene["title"],
                        scene["timecode"], scene["duration_sec"],
                        scene["visual"],
                        scene["prompts"][tool]
                    ),
                    encoding="utf-8",
                )
                count += 1
        print("  {}: {} prompt files".format(tool, count))

    # Suno music prompt
    (PROMPTS_DIR / "suno_music_prompt.txt").write_text(
        "SUNO AI MUSIC GENERATION PROMPT\n"
        "================================\n"
        "Title: The Room You Build - Therapeutic Score\n"
        "Duration: 22 minutes\n\n"
        "PROMPT:\n{}\n\n"
        "SCENE-BY-SCENE MUSIC NOTES:\n{}\n".format(
            SUNO_PROMPT,
            "\n".join("Scene {}: {}".format(s["id"], s["music_notes"]) for s in SCENES)
        ),
        encoding="utf-8",
    )
    print("  suno: 1 music prompt file")


# ---------------------------------------------------------------------------
# STEP 3: KEY FRAME IMAGES (DALL-E 3)
# ---------------------------------------------------------------------------
def generate_keyframes(keys: dict, scene_ids: Optional[list] = None):
    """Generate key frame images via OpenAI DALL-E 3."""
    from openai import OpenAI

    api_key = keys.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found")
        return

    client = OpenAI(api_key=api_key)
    scenes = SCENES if scene_ids is None else [s for s in SCENES if s["id"] in scene_ids]

    for scene in scenes:
        dalle_prompt = scene.get("prompts", {}).get("dalle")
        if not dalle_prompt:
            continue

        out_path = IMAGE_DIR / "keyframe_{:02d}_{}.png".format(scene["id"], scene["title"].replace(" ", "_")[:25])
        if out_path.exists():
            print("  SKIP (exists): {}".format(out_path.name))
            continue

        print("  Generating keyframe scene {}...".format(scene["id"]))
        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=dalle_prompt,
                size="1792x1024",
                quality="hd",
                n=1,
            )
            image_url = response.data[0].url
            import requests
            img_data = requests.get(image_url, timeout=60).content
            out_path.write_bytes(img_data)
            print("    OK: {} ({:.1f} KB)".format(out_path.name, len(img_data) / 1024))
        except Exception as e:
            print("    ERROR: {}".format(e))

        time.sleep(2)


# ---------------------------------------------------------------------------
# STEP 4: VIDEO GENERATION (Gemini Veo 2)
# ---------------------------------------------------------------------------
def generate_videos_veo2(keys: dict, scene_ids: Optional[list] = None):
    """Generate video clips via Google Gemini Veo 2."""
    api_key = keys.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found")
        return

    from google import genai
    client = genai.Client(api_key=api_key)

    scenes = SCENES if scene_ids is None else [s for s in SCENES if s["id"] in scene_ids]

    for scene in scenes:
        veo2_prompt = scene.get("prompts", {}).get("veo2")
        if not veo2_prompt:
            continue

        out_path = VIDEO_DIR / "veo2_scene_{:02d}.mp4".format(scene["id"])
        if out_path.exists():
            print("  SKIP (exists): {}".format(out_path.name))
            continue

        print("  Generating Veo 2 video scene {}...".format(scene["id"]))
        try:
            operation = client.models.generate_videos(
                model="veo-2.0-generate-001",
                prompt=veo2_prompt,
                config=genai.types.GenerateVideosConfig(
                    person_generation="dont_allow",
                    aspect_ratio="16:9",
                    number_of_videos=1,
                ),
            )
            # Poll for completion
            print("    Waiting for generation (may take 2-5 min)...")
            while not operation.done:
                time.sleep(15)
                operation = client.operations.get(operation)

            if operation.result and operation.result.generated_videos:
                video = operation.result.generated_videos[0]
                vid_bytes = client.files.download(file=video.video)
                out_path.write_bytes(vid_bytes)
                print("    OK: {} ({:.1f} MB)".format(out_path.name, len(vid_bytes) / (1024*1024)))
            else:
                print("    ERROR: No video generated")
        except Exception as e:
            print("    ERROR: {}".format(e))

        time.sleep(5)


# ---------------------------------------------------------------------------
# STEP 5: ASSEMBLY (FFmpeg or DaVinci timeline)
# ---------------------------------------------------------------------------
def generate_assembly():
    """Generate FFmpeg concat script and DaVinci Resolve timeline markers."""
    # FFmpeg concat file
    concat_lines = []
    timeline_csv = ["scene,title,start_sec,duration_sec,audio_file,video_file"]
    cumulative = 0

    for scene in SCENES:
        audio_name = "scene_{:02d}_*.mp3".format(scene["id"])
        audio_files = list(AUDIO_DIR.glob(audio_name))
        audio_file = audio_files[0].name if audio_files else "MISSING"

        video_name = "veo2_scene_{:02d}.mp4".format(scene["id"])
        video_file = video_name if (VIDEO_DIR / video_name).exists() else "MISSING"

        concat_lines.append("# Scene {}: {} ({})".format(scene["id"], scene["title"], scene["timecode"]))
        if audio_files:
            concat_lines.append("file '{}'".format(audio_files[0].resolve()))

        timeline_csv.append("{},{},{},{},{},{}".format(
            scene["id"], scene["title"], cumulative, scene["duration_sec"], audio_file, video_file
        ))
        cumulative += scene["duration_sec"]

    # Write FFmpeg concat list
    (ASSEMBLY_DIR / "audio_concat.txt").write_text("\n".join(concat_lines), encoding="utf-8")

    # Write timeline CSV (for DaVinci Resolve import)
    (ASSEMBLY_DIR / "timeline.csv").write_text("\n".join(timeline_csv), encoding="utf-8")

    # Write FFmpeg assembly script
    ffmpeg_script = '''@echo off
REM S4 Movie Assembly Script
REM Requires: ffmpeg installed and on PATH
REM Step 1: Concatenate all narration audio
ffmpeg -f concat -safe 0 -i audio_concat.txt -c copy full_narration.mp3

REM Step 2: Mix narration with music (music at -12dB under narration)
REM Requires: music/therapeutic_score.mp3 to exist
ffmpeg -i full_narration.mp3 -i ..\\music\\therapeutic_score.mp3 -filter_complex "[1:a]volume=0.25[music];[0:a][music]amix=inputs=2:duration=longest" mixed_audio.mp3

REM Step 3: Create video from image sequence + audio (fallback if video clips not ready)
REM ffmpeg -loop 1 -i ..\\keyframes\\keyframe_01_Title_Card.png -i mixed_audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -shortest scene_01.mp4

echo Assembly complete. Import timeline.csv into DaVinci Resolve for final edit.
'''
    (ASSEMBLY_DIR / "assemble.bat").write_text(ffmpeg_script, encoding="utf-8")

    # Write DaVinci Resolve Python script
    davinci_script = '''# DaVinci Resolve 21 Python Script
# Run from: DaVinci Resolve > Workspace > Console
# Or: C:\\ProgramData\\Blackmagic Design\\DaVinci Resolve\\Fusion\\Scripts\\Comp\\

import csv
import os

# Update this path to your asset directory
ASSET_DIR = r"{asset_dir}"

resolve = bmd.scriptapp("Resolve")  # noqa: F821
pm = resolve.GetProjectManager()
project = pm.CreateProject("S4_The_Room_You_Build_TM002")
mp = project.GetMediaPool()
root = mp.GetRootFolder()

# Set project settings
project.SetSetting("timelineFrameRate", "24")
project.SetSetting("timelineResolutionWidth", "1920")
project.SetSetting("timelineResolutionHeight", "1080")

# Create timeline
timeline = mp.CreateEmptyTimeline("The Room You Build")

# Import audio files
audio_dir = os.path.join(ASSET_DIR, "narration")
for f in sorted(os.listdir(audio_dir)):
    if f.endswith(".mp3"):
        mp.ImportMedia([os.path.join(audio_dir, f)])
        print(f"Imported: {{f}}")

# Import video clips
video_dir = os.path.join(ASSET_DIR, "video_clips")
for f in sorted(os.listdir(video_dir)):
    if f.endswith(".mp4"):
        mp.ImportMedia([os.path.join(video_dir, f)])
        print(f"Imported: {{f}}")

# Import keyframes
image_dir = os.path.join(ASSET_DIR, "keyframes")
for f in sorted(os.listdir(image_dir)):
    if f.endswith(".png"):
        mp.ImportMedia([os.path.join(image_dir, f)])
        print(f"Imported: {{f}}")

print("All assets imported. Arrange on timeline manually or use Edit page.")
print("Project: S4_The_Room_You_Build_TM002")
'''.format(asset_dir=str(OUTPUT_DIR.resolve()))

    (ASSEMBLY_DIR / "davinci_import.py").write_text(davinci_script, encoding="utf-8")

    print("  audio_concat.txt: FFmpeg concat list")
    print("  timeline.csv: Scene timeline for DaVinci")
    print("  assemble.bat: FFmpeg assembly script")
    print("  davinci_import.py: DaVinci Resolve import script")


# ---------------------------------------------------------------------------
# STATUS
# ---------------------------------------------------------------------------
def show_status():
    """Show asset generation status for all scenes."""
    print("\n{:<6} {:<35} {:<10} {:<10} {:<10}".format("Scene", "Title", "Audio", "Video", "KeyFrame"))
    print("-" * 75)
    for scene in SCENES:
        audio_ok = "OK" if list(AUDIO_DIR.glob("scene_{:02d}_*".format(scene["id"]))) else "---"
        video_ok = "OK" if (VIDEO_DIR / "veo2_scene_{:02d}.mp4".format(scene["id"])).exists() else "---"
        keyframe_ok = "OK" if list(IMAGE_DIR.glob("keyframe_{:02d}_*".format(scene["id"]))) else "---"
        print("{:<6} {:<35} {:<10} {:<10} {:<10}".format(
            scene["id"], scene["title"][:34], audio_ok, video_ok, keyframe_ok
        ))

    total_narration = sum(1 for _ in AUDIO_DIR.glob("scene_*.mp3"))
    total_video = sum(1 for _ in VIDEO_DIR.glob("*.mp4"))
    total_keyframes = sum(1 for _ in IMAGE_DIR.glob("*.png"))
    print("\nTotals: {}/14 narrations, {}/14 videos, {}/14 keyframes".format(
        total_narration, total_video, total_keyframes
    ))


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="S4 Movie Production Pipeline")
    parser.add_argument("--step", required=True,
                        choices=["narration", "prompts", "images", "video", "music", "assemble", "all", "status"],
                        help="Production step to execute")
    parser.add_argument("--scenes", type=str, default=None,
                        help="Comma-separated scene IDs (e.g., 1,5,9). Default: all")
    args = parser.parse_args()

    scene_ids = [int(x) for x in args.scenes.split(",")] if args.scenes else None

    print("=" * 60)
    print("S4 MOVIE PRODUCTION: 'The Room You Build'")
    print("=" * 60)
    print("Output: {}".format(OUTPUT_DIR))
    print()

    keys = load_env()

    if args.step == "status":
        show_status()
        return

    if args.step in ("narration", "all"):
        print("\n--- STEP 1: NARRATION (ElevenLabs) ---")
        generate_narration(keys, scene_ids)

    if args.step in ("prompts", "all"):
        print("\n--- STEP 2: PROMPTS EXPORT ---")
        export_prompts()

    if args.step in ("images", "all"):
        print("\n--- STEP 3: KEY FRAMES (DALL-E 3) ---")
        generate_keyframes(keys, scene_ids)

    if args.step in ("video", "all"):
        print("\n--- STEP 4: VIDEO (Gemini Veo 2) ---")
        generate_videos_veo2(keys, scene_ids)

    if args.step in ("music", "all"):
        print("\n--- STEP 5: MUSIC PROMPT (Suno AI) ---")
        (PROMPTS_DIR / "suno_music_prompt.txt").write_text(
            "Open https://suno.com and paste this prompt:\n\n{}\n".format(SUNO_PROMPT),
            encoding="utf-8",
        )
        print("  Saved: prompts/suno_music_prompt.txt")
        print("  NOTE: Suno AI requires manual web UI. Open suno.com and paste the prompt.")

    if args.step in ("assemble", "all"):
        print("\n--- STEP 6: ASSEMBLY ---")
        generate_assembly()

    if args.step == "all":
        print("\n--- STATUS ---")
        show_status()

    print("\nDone.")


if __name__ == "__main__":
    main()
