@echo off
REM S4 Movie Assembly Script
REM Requires: ffmpeg installed and on PATH
REM Step 1: Concatenate all narration audio
ffmpeg -f concat -safe 0 -i audio_concat.txt -c copy full_narration.mp3

REM Step 2: Mix narration with music (music at -12dB under narration)
REM Requires: music/therapeutic_score.mp3 to exist
ffmpeg -i full_narration.mp3 -i ..\music\therapeutic_score.mp3 -filter_complex "[1:a]volume=0.25[music];[0:a][music]amix=inputs=2:duration=longest" mixed_audio.mp3

REM Step 3: Create video from image sequence + audio (fallback if video clips not ready)
REM ffmpeg -loop 1 -i ..\keyframes\keyframe_01_Title_Card.png -i mixed_audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -shortest scene_01.mp4

echo Assembly complete. Import timeline.csv into DaVinci Resolve for final edit.
