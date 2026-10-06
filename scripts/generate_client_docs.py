#!/usr/bin/env python3
"""
Generate all client documents (4 HTML + 4 PDF) from a client JSON file.

Usage:
    python scripts/generate_client_docs.py data/clients/DS-001.json
    python scripts/generate_client_docs.py data/clients/DS-001.json --output-dir ./out
    python scripts/generate_client_docs.py data/clients/DS-001.json --session 1

Requires Chrome/Edge installed for PDF generation.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime

PRACTITIONER = {
    "name": "Jithendran Sellamuthu, C.MH.",
    "credentials": "Certified Master Hypnotist, AHA #007913",
    "practice": "VRishi Hypnotherapy",
    "email": "jeeth@vrishihypno.com",
    "address": "Virtual (Zoom)",
    "license": "CA B&P 2908 \u2014 Vocational/Avocational Self-Improvement",
    "booking": "calendly.com/jeeth-vrishihypno/90min",
    "training": (
        "Hypnosis Motivation Institute (HMI), Tarzana, CA \u2014 nationally accredited "
        "college of hypnotherapy (ACCET). Completed Semester 2 coursework "
        "(700.5/720 hours, 3.9 GPA). Pending graduation requirements: "
        "Case Conferences and Client Contact hours."
    ),
}

CSS_BASE = """\
*{box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:28px 36px 60px;color:#222;font-size:12px;line-height:1.5}
.hdr{border-bottom:2px solid #1a1a2e;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between}
.logo{font-size:18px;font-weight:700;color:#1a1a2e}
.cred{font-size:10px;color:#555;margin-top:2px}
.rt{font-size:9px;color:#666;text-align:right;line-height:1.4}
.vbar{background:#f0f4f8;border-radius:6px;padding:12px 16px;margin-bottom:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.vbar .vl{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:#888}
.vbar .vv{font-size:12px;font-weight:600;color:#1a1a2e}
h2{font-size:12px;font-weight:700;margin:16px 0 5px;color:#1a1a2e;border-bottom:1px solid #e0e0e0;padding-bottom:2px;text-transform:uppercase;letter-spacing:.05em}
h3{font-size:11px;font-weight:700;margin:12px 0 4px;color:#333}
.f{margin:2px 0;font-size:11px}.fl{font-weight:600;color:#555;display:inline-block;min-width:140px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:11px}
th{background:#f0f4f8;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:2px solid #ddd}
td{padding:4px 8px;border-bottom:1px solid #eee}
.met{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}
.met>div{background:#f8f9fa;padding:8px;border-radius:5px;text-align:center;border:1px solid #e8e8e8}
.met .mv{font-size:18px;font-weight:700;color:#1a1a2e}
.met .ml{font-size:8px;text-transform:uppercase;color:#888;margin-top:1px}
ul{margin:3px 0;padding-left:16px}li{margin:2px 0;font-size:11px}
ol{margin:4px 0;padding-left:18px}ol li{margin:3px 0;font-size:11px}
.box{background:#f0f4f8;border-radius:6px;padding:12px 16px;margin:10px 0;font-size:11px}
.warn{background:#fff3cd;border:1px solid #e8d8a0;border-radius:6px;padding:12px 16px;margin:10px 0;font-size:11px}
.check{margin:6px 0;font-size:11px}
.disc{margin-top:20px;padding:10px 12px;background:#fdf6e3;border:1px solid #e8d8a0;border-radius:4px;font-size:9px;color:#555;line-height:1.4}
.disc b{color:#444}
.sig{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px}
.sig>div{border-top:1px solid #999;padding-top:3px;font-size:9px;color:#888}
.ft{margin-top:12px;padding-top:8px;border-top:1px solid #e0e0e0;font-size:7px;color:#aaa;text-align:center}
@page{margin:0}@media print{body{padding:18px 22px 40px;font-size:10px}.disc{break-inside:avoid}}
"""

YES_TAG = '<b style="color:#2d6a4f">YES</b>'
NO_TAG = '<span style="color:#999">--</span>'


def _hw_row(name, done):
    mark = YES_TAG if done else NO_TAG
    return '<tr><td>{}</td><td>Daily</td><td style="text-align:center">{}</td></tr>'.format(name, mark)


def _phs_item(idx, text):
    parts = text.split(":", 1)
    label = parts[0]
    desc = parts[1] if len(parts) > 1 else ""
    return "<li><b>{}. {}:</b>{}</li>".format(idx, label, desc)


def _goal_row(g, with_method=False):
    if with_method:
        return "<tr><td>{}</td><td>{}</td><td>{}</td><td>Client self-report</td></tr>".format(
            g["measure"], g["baseline"], g["target"]
        )
    return "<tr><td>{}</td><td>{}</td><td>{}</td></tr>".format(
        g["measure"], g["baseline"], g["target"]
    )


def _plan_row(ps):
    return "<tr><td>{}</td><td>{}</td><td>{}</td></tr>".format(
        ps["num"], ps["focus"], ps["status"].title()
    )


def header_html(p=None):
    if p is None:
        p = PRACTITIONER
    parts = [
        '<div class="hdr">',
        '<div><div class="logo">{}</div>'.format(p["practice"]),
        '<div class="cred">{}<br>{}</div></div>'.format(p["name"], p["credentials"]),
        '<div class="rt">{}<br>{}<br>{}<br>{}</div>'.format(
            p["address"], p["email"], p["booking"], p["license"]
        ),
        "</div>",
    ]
    return "\n".join(parts)


def footer_html(doc_id, p=None):
    if p is None:
        p = PRACTITIONER
    now = datetime.now().strftime("%Y-%m-%d")
    return (
        '<div class="ft">\n'
        "{p} | {n} | {c} | {e}<br>\n"
        "PHI \u2014 Handle per HIPAA. Do not share or store on unsecured devices.<br>\n"
        "Generated: {d} | ID: {id}\n"
        "</div>"
    ).format(p=p["practice"], n=p["name"], c=p["credentials"], e=p["email"], d=now, id=doc_id)


def sig_html(p=None):
    if p is None:
        p = PRACTITIONER
    return (
        '<div class="sig">\n'
        "<div><br><br>Client Name (Print): ___________________________<br><br>\n"
        "Client Signature: ___________________________<br><br>\n"
        "Date: ___________________________</div>\n"
        "<div><br><br>Practitioner: {}<br><br>\n"
        "Signature: ___________________________<br><br>\n"
        "Date: ___________________________</div>\n"
        "</div>"
    ).format(p["name"])


def disclaimer_html(p=None):
    if p is None:
        p = PRACTITIONER
    return (
        '<div class="disc">\n'
        "<b>SB 577 Disclosure:</b> {name} is not a licensed physician, psychologist, "
        "or psychiatrist. Services are provided for vocational/avocational self-improvement "
        "under CA B&amp;P Code &#167;2908. Not a substitute for medical/psychological treatment.<br><br>\n"
        "<b>No Guarantee of Outcomes:</b> Individual results vary based on suggestibility, "
        "compliance, and health. {practice} does not guarantee specific outcomes, cure rates, "
        "or timelines.<br><br>\n"
        "<b>Therapeutic Exclusions:</b> Clients on anti-depressant, anti-psychotic, or "
        "anti-anxiety medications, or with psychiatric history/suicidal ideation, must be "
        "referred to licensed mental health professionals.<br><br>\n"
        "<b>Confidentiality:</b> All information kept confidential per HIPAA Privacy Rule "
        "(45 CFR &#167;&#167;160, 164) and CA law, except where disclosure required by law.\n"
        "</div>"
    ).format(name=p["name"], practice=p["practice"])


def gen_avs(client, session_idx=0):
    """Generate After Visit Summary HTML."""
    s = client["sessions"][session_idx]
    is_first = s["num"] == 1
    hw_done = set(s.get("homework_done", []))

    hw_rows = "\n".join(_hw_row(h, h in hw_done) for h in client.get("homework", []))
    phs_items = "\n".join(_phs_item(i + 1, p) for i, p in enumerate(client.get("phs", [])))
    goals_rows = "\n".join(_goal_row(g) for g in client.get("smart_goals", []))
    plan_rows = "\n".join(_plan_row(ps) for ps in client.get("treatment_plan", {}).get("sessions", [])[:6])
    soap = s.get("soap", {})
    tracker = client.get("tracker", {})
    tp = client.get("treatment_plan", {})

    visit_type = "Initial Consultation" if is_first else "Follow-Up"
    presenting_quote = client.get("presenting_quote", client["presenting"])
    assessment = soap.get("assessment", "")
    assessment_html = ""
    if assessment:
        assessment_html = '<div class="f" style="margin-top:4px"><span class="fl">Assessment:</span> {}</div>'.format(assessment)

    phs_note = ""
    if is_first:
        phs_note = '<div class="f" style="color:#888">Session 1 was cognitive assessment + first induction. PHS scheduled for installation in Session 2.</div>'

    phs_title = "Post-Hypnotic Suggestions (Pending \u2014 Installation in Session 2)" if is_first else "Post-Hypnotic Suggestions (Installed)"

    feedback_html = ""
    if s.get("feedback"):
        feedback_html = '<h2>Client-Reported Outcomes</h2><div class="f">{}</div>'.format(s["feedback"])

    sleep_score = s.get("sleep_score", "\u2014")
    deep_rem = tracker.get("deep_rem_combined_pct", "\u2014")
    light = tracker.get("light_pct", "\u2014")
    duration = s.get("duration_min", 60)

    html = """<!DOCTYPE html><html><head><title>AVS - {name} - Session {num}</title>
<style>{css}</style></head><body>
{header}

<div class="vbar">
<div><div class="vl">Client</div><div class="vv">{name}</div></div>
<div><div class="vl">Date</div><div class="vv">{date}</div></div>
<div><div class="vl">Visit Type</div><div class="vv">{visit} (#{num})</div></div>
<div><div class="vl">Modality</div><div class="vv">Zoom (Virtual)</div></div>
<div><div class="vl">Suggestibility</div><div class="vv">{ep}</div></div>
<div><div class="vl">Duration</div><div class="vv">~{dur} min</div></div>
</div>

<h2>Issues Addressed</h2>
<div class="f"><span class="fl">Presenting concern:</span> "{quote}"</div>
{assessment_html}

<h2>Session Metrics (Client-Reported Baseline)</h2>
<div class="met">
<div><div class="mv">{sleep}/10</div><div class="ml">Sleep Quality (subjective)</div></div>
<div><div class="mv">{deep}%</div><div class="ml">Deep+REM combined*</div></div>
<div><div class="mv">{light}%</div><div class="ml">Light Sleep</div></div>
<div><div class="mv">Bad</div><div class="ml">Tracker Depth Score</div></div>
</div>
<div class="f" style="color:#888;font-size:9px">*Tracker data is for client's personal reference \u2014 therapy outcomes are measured through subjective experience and clinical observation.</div>

<h2>Techniques Used</h2>
<div class="f">{techniques}</div>

<h2>{phs_title}</h2>
{phs_note}
<ul>{phs_items}</ul>

<h2>Treatment Plan</h2>
<div class="f"><span class="fl">Sessions:</span> {total_sessions}</div>
<div class="f"><span class="fl">Frequency:</span> {frequency}</div>
<div class="f"><span class="fl">Approach:</span> {approach}</div>
<table><tr><th>#</th><th>Focus</th><th>Status</th></tr>
{plan_rows}</table>

<h2>Progress Indicators</h2>
<table><tr><th>How We Measure</th><th>Where You Started</th><th>What Improvement Looks Like</th></tr>
{goals_rows}</table>
<div class="f" style="color:#888;font-size:9px">Progress is measured through subjective experience and clinical observation.</div>

<h2>Client Responsibilities</h2>
<table><tr><th>Nightly Sleep Ceremony (10:30 PM)</th><th>Freq</th><th>Done</th></tr>
{hw_rows}</table>

{feedback_html}

<h2>Next Steps</h2>
<div class="f"><span class="fl">Schedule at:</span> <a href="https://{booking}">{booking}</a></div>
<div class="f" style="margin-top:6px;color:#666">If sleep deteriorates significantly or you experience persistent anxiety, panic, or suicidal thoughts \u2014 contact your primary care physician immediately.</div>

{disclaimer}
<div class="sig"><div>Client Signature / Date</div><div>Therapist: {pname} / Date</div></div>
{footer}
</body></html>""".format(
        name=client["name"], num=s["num"], css=CSS_BASE, header=header_html(),
        date=s["date"], visit=visit_type, ep=client["ep"], dur=duration,
        quote=presenting_quote, assessment_html=assessment_html,
        sleep=sleep_score, deep=deep_rem, light=light,
        techniques=s.get("techniques", "N/A"), phs_title=phs_title,
        phs_note=phs_note, phs_items=phs_items,
        total_sessions=tp.get("total_sessions", "TBD"),
        frequency=tp.get("frequency", "TBD"),
        approach=tp.get("approach", "TBD"),
        plan_rows=plan_rows, goals_rows=goals_rows, hw_rows=hw_rows,
        feedback_html=feedback_html,
        booking=PRACTITIONER["booking"], disclaimer=disclaimer_html(),
        pname=PRACTITIONER["name"],
        footer=footer_html("AVS-{}-S{}-{}".format(client["id"], s["num"], s["date"])),
    )
    return html


def gen_treatment_plan(client):
    """Generate Treatment Plan HTML."""
    tp = client.get("treatment_plan", {})
    goals_rows = "\n".join(_goal_row(g, with_method=True) for g in client.get("smart_goals", []))
    plan_rows = "\n".join(_plan_row(ps) for ps in tp.get("sessions", []))

    html = """<!DOCTYPE html><html><head><title>Treatment Plan - {cid}</title>
<style>{css}</style></head><body>
{header}
<h2 style="font-size:14px;margin-bottom:10px">Treatment Plan</h2>

<div class="vbar">
<div><div class="vl">Client</div><div class="vv">{name}</div></div>
<div><div class="vl">Case ID</div><div class="vv">{cid} ({cref})</div></div>
<div><div class="vl">Plan Date</div><div class="vv">{start}</div></div>
<div><div class="vl">Age</div><div class="vv">{age}</div></div>
<div><div class="vl">Occupation</div><div class="vv">{occ}</div></div>
<div><div class="vl">Suggestibility</div><div class="vv">{ep}</div></div>
</div>

<h2>Presenting Concerns</h2>
<div class="f">{history}</div>

<h2>Treatment Protocol</h2>
<div class="f"><span class="fl">Modality:</span> Clinical hypnotherapy (vocational/avocational self-improvement)</div>
<div class="f"><span class="fl">Lane:</span> {ep}</div>
<div class="f"><span class="fl">Duration:</span> {total} sessions</div>
<div class="f"><span class="fl">Frequency:</span> {freq}</div>

<table><tr><th>#</th><th>Focus</th><th>Status</th></tr>
{plan_rows}</table>

<h2>Progress Indicators (Subjective + Clinical)</h2>
<table><tr><th>Measure</th><th>Baseline</th><th>Target</th><th>Method</th></tr>
{goals_rows}</table>
<div class="f" style="color:#888;font-size:9px">Progress is measured through subjective experience and clinical observation.</div>

<h2>Important Information</h2>
<div class="f"><b>Emotional responses:</b> Hypnotherapy may bring up emotions, memories, or associations that cause temporary discomfort, including delayed emotional responses after sessions. This is a normal part of the therapeutic process.</div>
<div class="f"><b>Memory accuracy:</b> Memories, images, or impressions experienced during hypnosis may be symbolic, metaphorical, or inaccurate. They should not be assumed to be factual representations of past events.</div>
<div class="f"><b>Experiences vary:</b> Depth of trance, responsiveness, and progress vary between individuals and between sessions. Treatment is adjusted based on your response.</div>
<div class="f"><b>Confidentiality:</b> Session content is kept confidential except where disclosure is required by law. If you are receiving services through a community service program, session content may be discussed with clinical supervisors for educational purposes, with your identity protected.</div>

<h2>AI Disclosure</h2>
<div class="f">This treatment plan was developed by the therapist with AI-assisted tools for documentation. All clinical decisions are performed by the therapist. AI is advisory only.</div>

{disclaimer}
{sig}
{footer}
</body></html>""".format(
        cid=client["id"], css=CSS_BASE, header=header_html(),
        name=client["name"], cref=client.get("case_ref", ""),
        start=client["start_date"], age=client["age"],
        occ=client["occupation"], ep=client["ep"],
        history=client.get("history", client["presenting"]),
        total=tp.get("total_sessions", "TBD"),
        freq=tp.get("frequency", "TBD"),
        plan_rows=plan_rows, goals_rows=goals_rows,
        disclaimer=disclaimer_html(), sig=sig_html(),
        footer=footer_html("TP-{}-{}".format(client["id"], client["start_date"])),
    )
    return html


def gen_sb577(client):
    """Generate SB 577 Disclosure & Acknowledgment of Services HTML."""
    p = PRACTITIONER
    html = """<!DOCTYPE html><html><head><title>SB 577 Disclosure - {name}</title>
<style>{css}</style></head><body>
{header}

<h2>Part A: SB 577 Disclosure</h2>
<p style="font-size:11px;color:#333">Pursuant to California Senate Bill 577 (Health &amp; Safety Code &#167;2053.5-2053.6):</p>

<div class="box">
<h3>Practitioner Information</h3>
<div class="f"><span class="fl">Name:</span> {pname}</div>
<div class="f"><span class="fl">Credential:</span> Certified Master Hypnotist (C.MH.)</div>
<div class="f"><span class="fl">Certification Body:</span> American Hypnosis Association (AHA), Member #007913</div>
<div class="f"><span class="fl">Training:</span> {training}</div>
<div class="f"><span class="fl">Practice Name:</span> {practice}</div>
<div class="f"><span class="fl">Service Location:</span> {address}</div>
<div class="f"><span class="fl">Authority:</span> {license}</div>
</div>

<h3>Important Disclosures</h3>
<ol>
<li><b>Not a licensed healthcare provider.</b> I am not a licensed physician, psychologist, psychiatrist, marriage and family therapist, licensed clinical social worker, or any other type of licensed healthcare provider. I do not diagnose or treat medical or psychological disorders.</li>
<li><b>Vocational and avocational self-improvement.</b> Hypnotherapy services are provided for self-improvement purposes under CA Business &amp; Professions Code &#167;2908. This is not psychotherapy, counseling, or medical treatment.</li>
<li><b>Not a substitute for professional care.</b> If you have a medical or mental health condition, consult an appropriately licensed healthcare provider. Hypnotherapy complements but does not replace professional care.</li>
<li><b>No guarantees of outcomes.</b> Individual results vary based on suggestibility, compliance, and overall health. No specific outcomes, cure rates, or timelines are promised.</li>
<li><b>Emotional responses.</b> Hypnotherapy may bring up emotions, memories, or associations that cause temporary discomfort, including delayed emotional responses after sessions. This is a normal part of the process and will be managed therapeutically.</li>
<li><b>Memory accuracy.</b> Memories, images, or impressions experienced during hypnosis may be symbolic, metaphorical, or inaccurate. They should not be assumed to be factual representations of past events.</li>
<li><b>Subconscious work.</b> Hypnosis works with the subconscious mind. Experiences, depth of trance, and responsiveness vary between individuals and between sessions.</li>
<li><b>Therapeutic exclusions.</b> Clients with active psychiatric conditions, psychosis, or suicidal ideation should work with a licensed mental health professional. Appropriate referrals will be provided.</li>
<li><b>Right to refuse or discontinue.</b> You may refuse any technique during a session or discontinue services entirely at any time, without obligation.</li>
<li><b>Confidentiality.</b> Session content and personal information are kept confidential consistent with applicable privacy standards and CA law, except where disclosure is required by law (e.g., imminent danger to self or others, abuse of a minor or elder).</li>
<li><b>Independent practice.</b> The practitioner operates independently and is not an employee of any institution, training school, or professional association. Any referral source is separate from the therapeutic relationship.</li>
<li><b>Zoom telehealth.</b> Sessions are conducted via Zoom video. You are responsible for a quiet, interruption-free environment and a reliable internet connection. Sessions are by mutual consent and may be rescheduled if technical issues arise.</li>
</ol>

<h2>Part B: Acknowledgment of Services</h2>
<h3>Fees</h3>
<div class="f"><span class="fl">Session Fee:</span> $250 (60 min) / $300 (90 min). Pro bono clients: waived per separate agreement.</div>
<div class="f"><span class="fl">Payment:</span> Due at time of service via PocketSuite</div>
<div class="f"><span class="fl">Cancellation:</span> 24-hour notice required; late cancellations may be charged the full session fee</div>
<div class="f"><span class="fl">Insurance:</span> Hypnotherapy is generally not covered by insurance. Receipts provided upon request.</div>

<h3>Community Service Program Disclosure</h3>
<div class="f" style="margin-bottom:8px">If you are receiving services through a community service or training referral program:</div>
<ul style="font-size:10px;margin:4px 0">
<li>The therapeutic relationship is <b>separate and independent</b> from the referring institution (e.g., HMI, AHA). The practitioner is not an employee of the referring organization, and they do not exercise control over professional services.</li>
<li>Session content may be discussed with <b>clinical supervisors or instructors</b> for educational and quality assurance purposes. Your identity will be protected using initials only.</li>
<li>Information shared in sessions is <b>not protected by psychotherapist-patient privilege</b>, as the practitioner is not a licensed psychotherapist.</li>
<li>After any initial complimentary sessions, paid services (if applicable) are provided under a private agreement between you and the practitioner. The referring organization does not participate in or receive payment for those services.</li>
</ul>

<h3>Client Consent</h3>
<div class="check">&#9744; I have read and understand the SB 577 disclosure above in its entirety.</div>
<div class="check">&#9744; I understand that the practitioner is not a licensed healthcare provider.</div>
<div class="check">&#9744; I understand that hypnotherapy is for vocational/avocational self-improvement, not medical or psychological treatment.</div>
<div class="check">&#9744; I understand that no specific outcomes are guaranteed.</div>
<div class="check">&#9744; I understand that hypnotherapy may bring up emotions or memories that cause temporary discomfort, including delayed responses.</div>
<div class="check">&#9744; I understand that memories experienced during hypnosis may be symbolic or inaccurate and should not be assumed factual.</div>
<div class="check">&#9744; I understand the fee structure and cancellation policy (24-hour notice required).</div>
<div class="check">&#9744; I confirm that I am not currently being treated for active psychosis or suicidal ideation. (If taking medications or in therapy, I have disclosed this to the practitioner.)</div>
<div class="check">&#9744; I consent to receive hypnotherapy services via Zoom telehealth and will ensure a quiet, private environment.</div>
<div class="check">&#9744; I understand I may discontinue services at any time without obligation.</div>
<div class="check">&#9744; If applicable: I understand that session content may be discussed with clinical supervisors for educational purposes, with my identity protected.</div>

{sig}
{footer}
</body></html>""".format(
        name=client["name"], css=CSS_BASE, header=header_html(),
        pname=p["name"], training=p["training"], practice=p["practice"],
        address=p["address"], license=p["license"], sig=sig_html(),
        footer=footer_html("SB577-AOS-{}-{}".format(client["id"], client["start_date"])),
    )
    return html


def gen_recording_consent(client):
    """Generate Session Recording Consent HTML."""
    html = """<!DOCTYPE html><html><head><title>Recording Consent - {name}</title>
<style>{css}</style></head><body>
{header}

<h2>Session Recording Consent &amp; Authorization</h2>
<div class="box">
<div class="f"><span class="fl">Client Name:</span> {name}</div>
<div class="f"><span class="fl">Case ID:</span> {cid}</div>
<div class="f"><span class="fl">Date:</span> {start}</div>
</div>

<h3>Purpose of Recording</h3>
<ol>
<li><b>Client self-reinforcement:</b> Listen to the therapy portion between appointments.</li>
<li><b>Progress tracking:</b> Review session content and track progress over time.</li>
<li><b>Clinical documentation:</b> Support accurate session notes and treatment planning.</li>
</ol>

<h3>What Will Be Recorded</h3>
<ul>
<li>The <b>therapy portion only</b> (induction, deepening, suggestion work, emerging).</li>
<li>Consultation and discussion portions are <b>not recorded</b> unless separately agreed.</li>
<li>Audio-only (no video) unless otherwise specified.</li>
</ul>

<h3>Terms and Conditions</h3>
<ol>
<li><b>Personal use only:</b> Do not share, distribute, upload, or publish the recording.</li>
<li><b>Storage:</b> Store on an encrypted or password-protected device only.</li>
<li><b>Deletion:</b> Therapist deletes their copy within 30 days of program completion.</li>
<li><b>Confidentiality:</b> Recordings are treated as protected information consistent with applicable privacy standards.</li>
<li><b>Supervision:</b> If you are receiving services through a community service or training program, recordings or session content may be reviewed with clinical supervisors for educational and quality assurance purposes. Your identity will be protected.</li>
<li><b>Revocation:</b> You may revoke this consent at any time in writing.</li>
<li><b>California law:</b> Two-party consent state (Penal Code &#167;632).</li>
</ol>

<div class="warn">
<b>Safety Warning:</b><br>
<ul style="margin:4px 0">
<li><b>Never listen while driving or operating machinery.</b></li>
<li>Listen only in a safe, comfortable environment.</li>
<li>Do not allow others to listen \u2014 suggestions are personalized to your profile.</li>
</ul>
</div>

<h3>Community Service Program Disclosure</h3>
<div class="f" style="margin-bottom:8px">If you are receiving services through a community service or training referral program:</div>
<ul style="font-size:10px;margin:4px 0">
<li>The therapeutic relationship is <b>separate and independent</b> from the referring institution (e.g., HMI, AHA). The practitioner is not an employee of the referring organization, and they do not exercise control over professional services.</li>
<li>Session content may be discussed with <b>clinical supervisors or instructors</b> for educational and quality assurance purposes. Your identity will be protected using initials only.</li>
<li>Information shared in sessions is <b>not protected by psychotherapist-patient privilege</b>, as the practitioner is not a licensed psychotherapist.</li>
<li>After any initial complimentary sessions, paid services (if applicable) are provided under a private agreement between you and the practitioner. The referring organization does not participate in or receive payment for those services.</li>
</ul>

<h3>Client Consent</h3>
<div class="check">&#9744; I consent to audio recording of the therapy portions of my sessions.</div>
<div class="check">&#9744; I will not share or distribute recordings.</div>
<div class="check">&#9744; I will store recordings securely.</div>
<div class="check">&#9744; I understand the safety warnings.</div>
<div class="check">&#9744; I understand I may revoke this consent at any time in writing.</div>

{sig}
{footer}
</body></html>""".format(
        name=client["name"], css=CSS_BASE, header=header_html(),
        cid=client["id"], start=client["start_date"], sig=sig_html(),
        footer=footer_html("REC-CONSENT-{}-{}".format(client["id"], client["start_date"])),
    )
    return html


def find_chrome():
    """Find Chrome or Edge executable."""
    candidates = [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return None


def html_to_pdf(html_path, pdf_path, chrome=None):
    """Convert HTML to PDF using headless Chrome."""
    if not chrome:
        chrome = find_chrome()
    if not chrome:
        print("  [SKIP PDF] No Chrome/Edge found: {}".format(pdf_path.name))
        return False
    file_url = "file:///{}".format(html_path.resolve().as_posix())
    win_pdf = str(pdf_path.resolve())
    subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-sandbox",
         "--print-to-pdf={}".format(win_pdf), "--print-to-pdf-no-header", file_url],
        capture_output=True, text=True, timeout=30,
    )
    return pdf_path.exists()


def main():
    parser = argparse.ArgumentParser(description="Generate client documents from JSON")
    parser.add_argument("client_json", help="Path to client JSON file")
    parser.add_argument("--output-dir", "-o", help="Output directory")
    parser.add_argument("--session", "-s", type=int, default=0, help="Session index (0-based)")
    parser.add_argument("--no-pdf", action="store_true", help="Skip PDF generation")
    args = parser.parse_args()

    client_path = Path(args.client_json)
    if not client_path.exists():
        print("Error: {} not found".format(client_path))
        sys.exit(1)

    with open(client_path, "r", encoding="utf-8") as f:
        client = json.load(f)

    if args.output_dir:
        out = Path(args.output_dir)
    else:
        out = Path("Clients") / client.get("full_name", client["name"]) / "Documents"
    out.mkdir(parents=True, exist_ok=True)

    docs = {
        "02-Treatment-Plan-{}".format(client["id"]): gen_treatment_plan(client),
        "03-SB577-Disclosure-AoS": gen_sb577(client),
        "04-Recording-Consent": gen_recording_consent(client),
    }

    # AVS requires at least one session
    if client.get("sessions") and args.session < len(client["sessions"]):
        session = client["sessions"][args.session]
        prefix_date = session["date"]
        docs["01-AVS-Session{}-{}".format(session["num"], prefix_date)] = gen_avs(client, args.session)
    else:
        print("  [SKIP] AVS: no session data yet (intake client)")

    chrome = find_chrome()
    for name, html_content in docs.items():
        html_path = out / "{}.html".format(name)
        html_path.write_text(html_content, encoding="utf-8")
        print("  HTML: {}".format(html_path))

        if not args.no_pdf:
            pdf_path = out / "{}.pdf".format(name)
            if html_to_pdf(html_path, pdf_path, chrome):
                print("  PDF:  {}".format(pdf_path))

    print("\nDone. {} documents generated in {}".format(len(docs), out))


if __name__ == "__main__":
    main()
