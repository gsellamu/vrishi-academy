# -*- coding: utf-8 -*-
"""Merge S3 Readout + Self-Esteem Script + Toolkit into one continuous session PDF."""
import re
from pathlib import Path

BASE = Path(__file__).parent

def extract_body(html_text):
    """Extract content between <body> and </body>."""
    m = re.search(r'<body[^>]*>(.*?)</body>', html_text, re.DOTALL)
    return m.group(1).strip() if m else html_text

def extract_styles(html_text):
    """Extract content between <style> and </style>."""
    m = re.search(r'<style[^>]*>(.*?)</style>', html_text, re.DOTALL)
    return m.group(1).strip() if m else ""

# Read source files
s3 = (BASE / "S3-Verbatim-Readout-TM-002.html").read_text(encoding="utf-8")
se = (BASE / "Script-SelfEsteem-FlipTheory-TM-002.html").read_text(encoding="utf-8")
tk = (BASE / "SelfEsteem-Toolkit-TM-002.html").read_text(encoding="utf-8")

# Extract bodies
s3_body = extract_body(s3)
se_body = extract_body(se)
tk_body = extract_body(tk)

# S3: split at Phase 15 (count out) -- everything before is Part A, Phase 15+ is Part C
# Find the Phase 15 comment marker
split_marker = '<!-- PHASE 15: COUNT OUT -->'
# Actually use the phase div that starts Phase 15
phase15_marker = 'PHASE 15: COUNT OUT'
idx = s3_body.find(phase15_marker)
# Go back to find the preceding divider or phase div
# Find the <hr class="divider"> before Phase 15
divider_before_15 = s3_body.rfind('<hr class="divider">', 0, idx)
s3_part_a = s3_body[:divider_before_15].strip()
s3_part_c = s3_body[divider_before_15:].strip()

# Self-esteem script: remove Section 8 (standalone count out) and therapist notes footer
# Find SECTION 8 marker
sec8_marker = 'SECTION 8: SEAL + EMERGENCE'
sec8_idx = se_body.find(sec8_marker)
# Go back to find the phase div start
phase_start = se_body.rfind('<div class="phase">', 0, sec8_idx)
# Also remove the divider before it
divider_before_8 = se_body.rfind('<hr class="divider">', 0, phase_start)
if divider_before_8 == -1:
    divider_before_8 = phase_start

# Remove the header/meta/crit notes (keep only Sections 1-7)
# Find the first <div class="phase"> (Section 1)
first_section = se_body.find('<div class="phase">')
se_sections = se_body[first_section:divider_before_8].strip()

# Build transition from Circle Therapy to Self-Esteem
transition_in = '''
<hr class="divider">
<div style="background:#e0f2f1;border:2px solid #00796b;border-radius:6px;padding:10px 14px;margin:10px 0">
<div style="font-size:10px;font-weight:700;color:#00796b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">
TIME CHECK + TRANSITION: CIRCLE THERAPY &rarr; SELF-ESTEEM IMAGERY
<span style="font-family:Consolas;font-size:9px;color:#888;float:right">~28 min remaining</span>
</div>
<div class="note">You are still in trance after the Phase 14 seal. Do NOT count out yet. Bridge directly into the workshop imagery. If running short on time (&lt;20 min left), skip to Phase 15 count out and save self-esteem for Session 4.</div>
<div class="say">&ldquo;And now, still in this deep state, I want to take you somewhere new. Not the circle. Somewhere you have never been. A place your subconscious is about to build for you.&rdquo;</div>
</div>
'''

# Build transition from Self-Esteem back to Count Out
transition_out = '''
<div style="background:#e0f2f1;border:2px solid #00796b;border-radius:6px;padding:10px 14px;margin:10px 0">
<div style="font-size:10px;font-weight:700;color:#00796b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">
TRANSITION: SELF-ESTEEM SEALED &rarr; COUNT OUT
</div>
<div class="note">Self-esteem PHS delivered. Workshop sealed. Now proceed to standard count out. The count out seals BOTH Circle Therapy AND Self-Esteem work together.</div>
</div>
'''

# Toolkit: add page break header
toolkit_section = '''
<div style="page-break-before:always"></div>
<hr class="divider">
<div style="background:#1a1a2e;color:#fff;padding:8px 14px;border-radius:4px;font-size:13px;font-weight:700;margin:0 0 4px">
APPENDIX: CLIENT HANDOUT &mdash; SELF-ESTEEM TOOLKIT (GIVE TO TRISTAN)
</div>
<div style="font-size:9px;color:#666;margin-bottom:10px;border-bottom:1px solid #ddd;padding-bottom:4px">
Print this section separately or tear off. This is the client-facing take-home document.
</div>
''' + tk_body

# Combine all CSS
combined_css = extract_styles(s3) + "\n" + extract_styles(se) + "\n" + extract_styles(tk)
# Deduplicate some common rules
# Just use them all -- browser handles duplicates fine

# Updated title and meta
header = '''
<h1>SESSION 3 COMPLETE READOUT &mdash; CIRCLE THERAPY + SELF-ESTEEM (FLIP THEORY)</h1>
<div class="session-meta">TM-002 (T.M., 22, 69% Emotional) | TRAUMA-001 | CSP Pro Bono | Friday Oct 24, 2026 6:00 PM PST | Zoom | ~105 min (extended) | <b style="color:#c00">READ TOP TO BOTTOM &mdash; THERAPIST ONLY</b></div>

<div class="crit"><b>SESSION STRUCTURE:</b> Phases 1&ndash;5 (check-in, baselines, recap, pre-talk, recording) &rarr; Phases 6&ndash;7 (induction + deepening) &rarr; Phases 8&ndash;14 (Circle Therapy: 4 extinction cycles + reversal + compound anchor) &rarr; <b style="color:#4a148c">Self-Esteem Imagery (workshop, 5 workbenches, critic&rarr;coach, gauges, future pace)</b> &rarr; Phases 15&ndash;17 (count out, debrief, homework). Appendix: Self-Esteem Toolkit handout for client.</div>
'''

# Remove original h1 and session-meta from s3_part_a
# Find and remove everything up to first <div class="crit">
first_crit = s3_part_a.find('<div class="crit"><b>SESSION-WIDE RULES')
s3_rules = s3_part_a[first_crit:]

# Assemble
merged_body = header + "\n" + s3_rules + "\n" + transition_in + "\n" + se_sections + "\n" + transition_out + "\n" + s3_part_c + "\n" + toolkit_section

# Write merged HTML
merged_html = f'''<!DOCTYPE html><html><head><title>SESSION 3 COMPLETE - TM-002</title>
<style>
{combined_css}
</style></head><body>
{merged_body}
</body></html>'''

out = BASE / "S3-Complete-Readout-TM-002.html"
out.write_text(merged_html, encoding="utf-8")
print(f"Merged: {out} ({len(merged_html):,} bytes)")
