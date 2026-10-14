#!/usr/bin/env python3
"""
Generate client feedback/status update form (fillable Word DOCX).
Sent between sessions for client to complete before next appointment.

Usage:
    python scripts/generate_client_feedback_form.py data/clients/DS-001.json --session 2
    python scripts/generate_client_feedback_form.py data/clients/TM-002.json --session 1
"""
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT


def generate_feedback_form(client_json_path, session_num, output_dir=None):
    with open(client_json_path, "r", encoding="utf-8") as f:
        client = json.load(f)

    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # Header
    header = doc.add_heading("Between-Session Feedback Form", level=1)
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = sub.add_run("VRishi Hypnotherapy | Jithendran Sellamuthu, C.MH.")
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(128, 128, 128)

    doc.add_paragraph("")

    # Client info
    info = doc.add_table(rows=2, cols=4)
    info.style = "Light Grid Accent 1"
    info.rows[0].cells[0].text = "Client"
    info.rows[0].cells[1].text = client.get("name", "")
    info.rows[0].cells[2].text = "Session Completed"
    info.rows[0].cells[3].text = "S{}".format(session_num)
    info.rows[1].cells[0].text = "Date Completed"
    info.rows[1].cells[1].text = "_______________"
    info.rows[1].cells[2].text = "Date Filling This"
    info.rows[1].cells[3].text = "_______________"

    doc.add_paragraph("")

    # Instructions
    p = doc.add_paragraph()
    run = p.add_run(
        "Please complete this form before your next session. Be honest \u2014 there are no "
        "right or wrong answers. Your feedback helps me adjust the therapy to what works best for you. "
        "You can type directly into this document or print and handwrite."
    )
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(80, 80, 80)

    doc.add_paragraph("")

    # === SECTION 1: Overall Status ===
    doc.add_heading("1. How Are You Doing?", level=2)

    doc.add_paragraph("How would you describe your overall state since our last session?")
    t1 = doc.add_table(rows=1, cols=5)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, label in enumerate(["Much Worse", "Slightly Worse", "About the Same", "Slightly Better", "Much Better"]):
        t1.rows[0].cells[i].text = "[ ] " + label

    doc.add_paragraph("")
    doc.add_paragraph("In your own words, how have things been?")
    _add_fill_box(doc, 4)

    # === SECTION 2: Sleep-specific (DS-001) or Anxiety-specific (TM-002) ===
    presenting = client.get("presenting", "").lower()
    if "sleep" in presenting:
        doc.add_heading("2. Sleep Update", level=2)

        sleep_table = doc.add_table(rows=6, cols=3)
        sleep_table.style = "Light Grid Accent 1"
        sleep_table.rows[0].cells[0].text = "Measure"
        sleep_table.rows[0].cells[1].text = "This Week"
        sleep_table.rows[0].cells[2].text = "Notes"
        measures = [
            "How I feel waking up (1-10)",
            "Sleep onset (easy/moderate/difficult, approx minutes)",
            "Night-waking (none / 1x / 2x / 3+, easy or hard to return)",
            "Daytime energy (1-10)",
            "Overall sleep quality (1-10)",
        ]
        for i, m in enumerate(measures):
            sleep_table.rows[i + 1].cells[0].text = m

        doc.add_paragraph("")
        doc.add_paragraph("Any changes in your sleep pattern you want to share?")
        _add_fill_box(doc, 3)

    elif "trauma" in presenting or "anxiety" in presenting:
        doc.add_heading("2. Emotional & Anxiety Update", level=2)

        anx_table = doc.add_table(rows=7, cols=3)
        anx_table.style = "Light Grid Accent 1"
        anx_table.rows[0].cells[0].text = "Measure"
        anx_table.rows[0].cells[1].text = "This Week (1-10)"
        anx_table.rows[0].cells[2].text = "Notes"
        measures = [
            "Comfort being yourself",
            "Ease of setting boundaries / saying no",
            "Anxiety level (1=barely there, 10=runs everything)",
            "Trust in people close to you",
            "Feeling at ease without being on guard",
            "Past influencing present reactions (1=barely, 10=everything)",
        ]
        for i, m in enumerate(measures):
            anx_table.rows[i + 1].cells[0].text = m

        doc.add_paragraph("")
        doc.add_paragraph("Any moments this week where you noticed a shift \u2014 positive or negative?")
        _add_fill_box(doc, 3)

    else:
        doc.add_heading("2. Progress Update", level=2)
        doc.add_paragraph("How have things been with your presenting issue since our last session?")
        _add_fill_box(doc, 4)

    # === SECTION 3: Homework Compliance ===
    doc.add_heading("3. Homework Practice", level=2)

    homework = client.get("homework", [])
    if homework:
        hw_table = doc.add_table(rows=len(homework) + 1, cols=4)
        hw_table.style = "Light Grid Accent 1"
        hw_table.rows[0].cells[0].text = "Homework Item"
        hw_table.rows[0].cells[1].text = "Did You Practice?"
        hw_table.rows[0].cells[2].text = "How Often"
        hw_table.rows[0].cells[3].text = "How Did It Go?"
        for i, hw in enumerate(homework):
            hw_table.rows[i + 1].cells[0].text = hw
            hw_table.rows[i + 1].cells[1].text = "[ ] Yes  [ ] No"
    else:
        doc.add_paragraph("Did you practice the techniques discussed in session? What worked? What was difficult?")
        _add_fill_box(doc, 3)

    doc.add_paragraph("")
    doc.add_paragraph("What made the practice easy or difficult?")
    _add_fill_box(doc, 2)

    # === SECTION 4: Dreams ===
    doc.add_heading("4. Dreams", level=2)
    doc.add_paragraph("Did you have any vivid or memorable dreams this week? (Brief notes \u2014 even 2-3 words per dream)")

    dream_table = doc.add_table(rows=8, cols=2)
    dream_table.style = "Light Grid Accent 1"
    dream_table.rows[0].cells[0].text = "Day"
    dream_table.rows[0].cells[1].text = "Dream Notes (or \"none\")"
    for i in range(1, 8):
        dream_table.rows[i].cells[0].text = "Day {}".format(i)

    # === SECTION 5: Experiences & Observations ===
    doc.add_heading("5. What Did You Notice?", level=2)

    notices = [
        "Moments of unexpected calm or relaxation?",
        "Any new reactions to old triggers (responding differently than before)?",
        "Changes in self-talk (how you speak to yourself internally)?",
        "Physical changes (tension, breathing, body awareness)?",
        "Anything surprising, confusing, or concerning?",
    ]
    for n in notices:
        doc.add_paragraph(n)
        _add_fill_box(doc, 2)

    # === SECTION 6: Questions / Concerns ===
    doc.add_heading("6. Questions or Concerns for Next Session", level=2)
    doc.add_paragraph("Anything you want to discuss, ask about, or focus on in our next session?")
    _add_fill_box(doc, 4)

    # === SECTION 7: Readiness ===
    doc.add_heading("7. Readiness for Next Session", level=2)
    doc.add_paragraph("How ready do you feel for our next session?")
    t7 = doc.add_table(rows=1, cols=5)
    t7.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, label in enumerate(["Not Ready", "Somewhat", "Neutral", "Ready", "Very Ready"]):
        t7.rows[0].cells[i].text = "[ ] " + label

    doc.add_paragraph("")
    doc.add_paragraph("Is there anything you need from me before our next session?")
    _add_fill_box(doc, 2)

    # Footer
    doc.add_paragraph("")
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run(
        "Thank you for completing this. Your feedback directly shapes the therapy. "
        "Please email this back to jeeth@vrishihypno.com before your next session."
    )
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(100, 100, 100)
    run.bold = True

    f2 = doc.add_paragraph()
    f2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run2 = f2.add_run("VRishi Hypnotherapy | jeeth@vrishihypno.com | Confidential")
    run2.font.size = Pt(8)
    run2.font.color.rgb = RGBColor(160, 160, 160)

    # Save
    if output_dir:
        out = Path(output_dir)
    else:
        out = Path("Clients") / client.get("full_name", client["name"]) / "Documents"
    out.mkdir(parents=True, exist_ok=True)

    filename = "Feedback-Form-After-S{}-{}.docx".format(session_num, client["id"])
    filepath = out / filename
    doc.save(str(filepath))
    print("Feedback form saved: {}".format(filepath))
    return filepath


def _add_fill_box(doc, lines=3):
    """Add a bordered fill-in area."""
    for _ in range(lines):
        p = doc.add_paragraph("_" * 85)
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        for run in p.runs:
            run.font.color.rgb = RGBColor(200, 200, 200)
            run.font.size = Pt(10)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate client feedback form")
    parser.add_argument("client_json", help="Path to client JSON file")
    parser.add_argument("--session", "-s", type=int, default=1, help="Session number just completed")
    parser.add_argument("--output-dir", "-o", help="Output directory")
    args = parser.parse_args()
    generate_feedback_form(args.client_json, args.session, args.output_dir)
