# DaVinci Resolve 21 Python Script
# Run from: DaVinci Resolve > Workspace > Console
# Or: C:\ProgramData\Blackmagic Design\DaVinci Resolve\Fusion\Scripts\Comp\

import csv
import os

# Update this path to your asset directory
ASSET_DIR = r"D:\ChatGPT Projects\genai-portfolio\projects\Jeeth.ai\Business\VRishiHypno\PrepPractices\Clients\TM-002\Movie\assets"

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
        print(f"Imported: {f}")

# Import video clips
video_dir = os.path.join(ASSET_DIR, "video_clips")
for f in sorted(os.listdir(video_dir)):
    if f.endswith(".mp4"):
        mp.ImportMedia([os.path.join(video_dir, f)])
        print(f"Imported: {f}")

# Import keyframes
image_dir = os.path.join(ASSET_DIR, "keyframes")
for f in sorted(os.listdir(image_dir)):
    if f.endswith(".png"):
        mp.ImportMedia([os.path.join(image_dir, f)])
        print(f"Imported: {f}")

print("All assets imported. Arrange on timeline manually or use Edit page.")
print("Project: S4_The_Room_You_Build_TM002")
