# -*- coding: utf-8 -*-
"""
Assemble 'The Room You Build' movie from keyframes + narration audio.
Uses FFmpeg Ken Burns effect (slow zoom/pan) on each keyframe, timed to narration.
"""
import subprocess
import json
from pathlib import Path

FFMPEG = r"C:\Users\gsell\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"
ASSET_DIR = Path(__file__).parent / "assets"
AUDIO_DIR = ASSET_DIR / "narration"
IMAGE_DIR = ASSET_DIR / "keyframes"
OUT_DIR = ASSET_DIR / "assembly"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FINAL_OUTPUT = OUT_DIR / "The_Room_You_Build_TM002.mp4"

# Scene ordering and Ken Burns direction
SCENES = [
    {"id": 1, "zoom": "in", "pan": "center"},
    {"id": 2, "zoom": "out", "pan": "right"},
    {"id": 3, "zoom": "in", "pan": "down"},
    {"id": 4, "zoom": "in", "pan": "center"},
    {"id": 5, "zoom": "out", "pan": "left"},
    {"id": 6, "zoom": "in", "pan": "center"},
    {"id": 7, "zoom": "out", "pan": "right"},
    {"id": 8, "zoom": "in", "pan": "left"},
    {"id": 9, "zoom": "in", "pan": "center"},
    {"id": 10, "zoom": "out", "pan": "right"},
    {"id": 11, "zoom": "in", "pan": "center"},
    {"id": 12, "zoom": "out", "pan": "up"},
    {"id": 13, "zoom": "out", "pan": "up"},
    {"id": 14, "zoom": "out", "pan": "center"},
]


def get_audio_duration(audio_path):
    """Get duration of audio file in seconds using ffprobe."""
    cmd = [
        FFMPEG.replace("ffmpeg.exe", "ffprobe.exe") if "ffmpeg.exe" in FFMPEG else "ffprobe",
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        str(audio_path),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return float(result.stdout.strip())
    except Exception:
        # Fallback: estimate from file size (MP3 ~128kbps)
        return audio_path.stat().st_size / (128 * 1024 / 8)


def ken_burns_filter(zoom_dir, pan_dir, duration):
    """Generate FFmpeg zoompan filter for Ken Burns effect."""
    fps = 24
    total_frames = int(duration * fps)
    # Zoom: 1.0 to 1.15 (in) or 1.15 to 1.0 (out) over duration
    if zoom_dir == "in":
        zoom_expr = "min(1+0.15*on/{},1.15)".format(total_frames)
    else:
        zoom_expr = "max(1.15-0.15*on/{},1.0)".format(total_frames)

    # Pan expressions for 1920x1080 output from larger source
    if pan_dir == "right":
        x_expr = "iw/2-(iw/zoom/2)+on*2"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan_dir == "left":
        x_expr = "iw/2-(iw/zoom/2)-on*2"
        y_expr = "ih/2-(ih/zoom/2)"
    elif pan_dir == "down":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)+on"
    elif pan_dir == "up":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)-on"
    else:  # center
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"

    return "zoompan=z='{}':x='{}':y='{}':d={}:s=1920x1080:fps={}".format(
        zoom_expr, x_expr, y_expr, total_frames, fps
    )


def make_scene_clip(scene_id, zoom_dir, pan_dir):
    """Create a video clip for one scene: keyframe + Ken Burns + narration audio."""
    # Find audio file
    audio_files = sorted(AUDIO_DIR.glob("scene_{:02d}_*".format(scene_id)))
    if not audio_files:
        print("  SKIP scene {} (no audio)".format(scene_id))
        return None

    audio_path = audio_files[0]
    image_path = IMAGE_DIR / "keyframe_{:02d}.png".format(scene_id)
    if not image_path.exists():
        print("  SKIP scene {} (no keyframe)".format(scene_id))
        return None

    clip_path = OUT_DIR / "clip_{:02d}.mp4".format(scene_id)
    if clip_path.exists():
        print("  SKIP scene {} (clip exists)".format(scene_id))
        return clip_path

    duration = get_audio_duration(audio_path)
    # Add 2s fade padding at end
    total_dur = duration + 2.0
    zp_filter = ken_burns_filter(zoom_dir, pan_dir, total_dur)

    print("  Scene {}: {:.1f}s audio, {:.1f}s total...".format(scene_id, duration, total_dur))

    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", str(image_path),
        "-i", str(audio_path),
        "-filter_complex",
        "[0:v]{},format=yuv420p[v]".format(zp_filter),
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(total_dur),
        "-shortest",
        str(clip_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode == 0:
        size_mb = clip_path.stat().st_size / (1024 * 1024)
        print("    OK: {:.1f} MB".format(size_mb))
        return clip_path
    else:
        print("    FAIL: {}".format(result.stderr[-200:] if result.stderr else "unknown"))
        return None


def concatenate_clips(clip_paths):
    """Concatenate all scene clips into final movie."""
    # Write concat list
    concat_file = OUT_DIR / "concat_list.txt"
    with open(concat_file, "w", encoding="utf-8") as f:
        for cp in clip_paths:
            f.write("file '{}'\n".format(str(cp.resolve()).replace("\\", "/")))

    print("\nConcatenating {} clips into final movie...".format(len(clip_paths)))

    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(FINAL_OUTPUT),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode == 0:
        size_mb = FINAL_OUTPUT.stat().st_size / (1024 * 1024)
        print("FINAL MOVIE: {} ({:.1f} MB)".format(FINAL_OUTPUT.name, size_mb))
        return True
    else:
        print("CONCAT FAIL: {}".format(result.stderr[-300:] if result.stderr else "unknown"))
        return False


def main():
    print("=" * 60)
    print("ASSEMBLING: 'The Room You Build'")
    print("=" * 60)
    print("FFmpeg: {}".format(FFMPEG))
    print("Output: {}".format(FINAL_OUTPUT))
    print()

    # Step 1: Generate individual scene clips
    print("--- GENERATING SCENE CLIPS (Ken Burns + Narration) ---")
    clip_paths = []
    for scene in SCENES:
        clip = make_scene_clip(scene["id"], scene["zoom"], scene["pan"])
        if clip:
            clip_paths.append(clip)

    if not clip_paths:
        print("ERROR: No clips generated!")
        return

    print("\n{}/{} scene clips ready.".format(len(clip_paths), len(SCENES)))

    # Step 2: Concatenate into final movie
    if len(clip_paths) == len(SCENES):
        concatenate_clips(clip_paths)
    else:
        print("WARNING: Only {}/{} clips. Assembling partial movie.".format(len(clip_paths), len(SCENES)))
        concatenate_clips(clip_paths)

    # Step 3: Open the movie
    if FINAL_OUTPUT.exists():
        print("\nOpening movie...")
        subprocess.run(["cmd.exe", "/c", "start", "", str(FINAL_OUTPUT)], timeout=5)


if __name__ == "__main__":
    main()
