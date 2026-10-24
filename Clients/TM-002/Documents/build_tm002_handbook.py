#!/usr/bin/env python3
"""
Build TM002_Master_Therapeutic_Handbook.docx.

Python 3.9+; standard library only.
No network requests, macros, external templates, or font files.
The generated handbook is an editable clinical planning draft.

Usage:
    python build_tm002_handbook.py
    python build_tm002_handbook.py --output "D:\\ChatGPT Projects\\genai-portfolio\\projects\\Jeeth.ai\\Business\\VRishiHypno\\PrepPractices\\Clients\\TM-002\\Documents\\handbook.docx"
    python build_tm002_handbook.py --overwrite

The script validates its XML and ZIP package before saving.
It cannot perform clinical approval or visual Word-layout review.
"""

from __future__ import annotations

import argparse
import os
import re
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple
from xml.etree import ElementTree
from xml.sax.saxutils import escape, quoteattr


# ---------------------------------------------------------------------
# DOCUMENT CONTENT
# ---------------------------------------------------------------------

TITLE = "Master Therapeutic Session Plan"
SUBTITLE = "Guidebook, Handbook & Clinical Playbook"
CASE_ID = "TM-002"
VERSION = "1.0"
PREPARED = "6 October 2026"

FRONT_MATTER = r"""
# 1. Document control and conditions of use

**Case identifier:** TM-002, as used in the supplied working notes.
**Document status:** AI-assisted consolidation; clinical planning draft.
**Version:** 1.0.
**Prepared:** 6 October 2026.
**Intended setting:** Adult outpatient assessment and psychotherapy, with optional adjunctive clinical hypnosis where appropriate.
**Approval status:** Not yet reviewed or approved by the treating clinician, supervisor, or service.

! This handbook is not a validated twenty-session treatment package, a diagnostic instrument, a hypnosis-clearance test, or evidence that the client has been assessed. It does not establish a professional qualification or expand a practitioner's scope of practice.

## 1.1 Required local completion

| Responsibility | Complete before implementation |
|---|---|
| Treating clinician | Name, credentials, role, relevant training, and contact arrangements |
| Supervisor, when applicable | Name, consultation arrangements, availability, and review requirements |
| Clinical service | Emergency pathway, safeguarding process, privacy arrangements, and documentation policy |
| Client information | Confirm identifiers, age, pronouns, preferences, current location, and consent |
| Measurement | Obtain exact official instruments, scoring keys, versions, languages, and permissions |
| Treatment selection | Document the assessment, options discussed, client preference, and clinical rationale |
| Handbook approval | Review wording, referral thresholds, forms, and intended uses before adoption |

**Treating clinician:** ______________________________________________
**Supervisor/service lead:** _______________________________________
**Review date:** __________________________________________________
**Approved modifications:** _______________________________________

## 1.2 Use policy

This draft is intended for a qualified mental-health clinician with relevant trauma-treatment competence, or a trainee working within appropriate supervision. A hypnosis qualification alone is not treated by this handbook as authorization to independently diagnose or treat complex psychiatric presentations. The service must verify actual qualifications, jurisdictional requirements, and scope.

When the practitioner is working in a limited adjunctive role, the responsible mental-health clinician should lead diagnostic assessment, suicide-risk disposition, specialist trauma treatment, and decisions about psychiatric destabilization. Define coordination and referral arrangements before using evocative exercises.

The client may decline hypnosis, tapping, younger-self imagery, a particular question, or an exercise without being labeled resistant. Declining a procedure does not establish a psychiatric risk category.

## 1.3 How the book is organized

The handbook contains: case formulation; assessment and decision support; an original structured interview; memory safeguards; a twenty-session roadmap; spoken session scripts; optional procedure modules; client worksheets; and clinician forms.

Spoken dialogue is set apart from stage directions. Replace bracketed placeholders only with information the client has actually provided. Ask one question at a time, wait, and reflect the response. Do not read a series of questions over the client's answers.

A session script is a navigation aid. The actual agenda, clinical findings, consent, and selected evidence-based treatment take precedence over the planned sequence.

## 1.4 Evidence and provenance labels

| Label | Meaning |
|---|---|
| C0 | The original case statement supplied in this conversation |
| C1 | The assessment protocol, twenty-session draft, and later refinements developed in this conversation |
| U1 | Pasted text.txt: HMI presentation descriptions, commentary, interpretations, and proposed case applications |
| U2 | Pasted text (2).txt: a noisy timestamped teaching transcript |
| R01–R20 | External sources listed in the reference register |
| Original clinical template | Newly drafted dialogue, worksheet, rubric, or workflow; not psychometrically validated |

No completed assessment, clinical diagnosis, questionnaire result, treatment response, medication history, or risk classification was supplied for this client. Blank clinical fields must remain blank until assessed.

## 1.5 Consolidation decisions and revisions

| Earlier material | Treatment in this handbook |
|---|---|
| Twenty sessions as a fixed progression | Retained as a provisional navigation framework, not a required dose or delay before trauma-focused care |
| Green/amber/red readiness language | Replaced operationally by action categories and an unscored readiness profile; not suicide prediction |
| DES-II, DERS, and a large compulsory battery | Preserved as possible alternatives; a more focused core battery is proposed |
| EFT at every session | Optional, with client preference and a clear purpose; not compulsory preparation |
| Hypnosis as subconscious repair that psychotherapy cannot achieve | Not retained as a factual explanation |
| Inner-child work automatically in Session 2–3 | Not retained as a timing rule |
| E&P determines the entire treatment | Preserved as a claim in U1, not adopted as a validated allocation or clearance rule |
| Adult and child must merge | Replaced by optional symbolism and observable present-day integration |
| Neural maps overwritten or a reconsolidation window proven open | Not presented as measured mechanisms in this case |
| Recovery of hidden memories | Excluded as a treatment objective |

The book consolidates the material rather than endorsing every earlier statement. Source-derived descriptions, research findings, and original adaptations remain distinguishable.


# 2. Case formulation and treatment aims

## 2.1 Information actually supplied

The client is reported to be 22 years old. The presenting statement describes difficulty letting go of childhood traumatic experiences and associated feelings; meaningful benefit from previous psychotherapy; continuing concerns about self-esteem, confidence, assertiveness, feeling comfortable in one's own skin, trusting close people, anxiety, and hypervigilance; and a preference for a male intern where possible because this may make discussion of men's issues more comfortable. [C0]

The wording of the original statement contains a likely typographical error in the therapist preference. The working drafts interpret this as a preference for a male intern; confirm rather than assume. Confirm the client's preferred pronouns and identity language separately.

## 2.2 Known, proposed, and unknown

| Area | Current status |
|---|---|
| Childhood experiences described as traumatic | Client-reported in the supplied statement; details and diagnostic exposure criteria not assessed here |
| Previous psychotherapy | Reported to have helped substantially; type, duration, and outcomes unknown |
| Anxiety and hypervigilance | Client-reported concerns; frequency, severity, triggers, and impairment unknown |
| Self-worth and assertiveness | Client-identified goals; specific patterns require examples |
| Trust in close relationships | Client-reported difficulty; actual relationship safety must be assessed |
| Shame, attachment pattern, perfectionism, avoidance | Possible formulation areas, not established findings |
| PTSD or complex PTSD | Not diagnosed in this handbook |
| Dissociation, depression, panic, substance-use disorder | Not established; assess when relevant |
| Suicide, self-harm, interpersonal harm, or current abuse | Not assessed in the supplied case; do not record as absent |
| Medication, medical history, sleep, supports, functioning | Unknown |
| Interest in inner-child work or hypnosis | Hypnotherapy is being considered in the planning conversation; the client's informed preference remains to be established |

## 2.3 Provisional working formulation

A possible formulation is that some earlier experiences may be associated with current expectations about threat, rejection, worth, or vulnerability. Behaviors such as guarding, avoiding, withholding, or overaccommodating could provide short-term protection while limiting confidence, openness, and choice.

This is a hypothesis to test collaboratively. It is not a statement that the client has every behavior listed, that all anxiety is trauma-related, or that current danger is imaginary.

**Working sequence:** Situation → meaning/prediction → emotion and bodily response → urge → action → immediate effect → longer-term effect.

A second, interpersonal sequence may be useful when supported by examples: wish for connection → perceived interpersonal risk → protective response → effect on the relationship → interpretation of that effect.

## 2.4 Formulation interview

> What do you already understand about these reactions?
> What has previous therapy helped you do differently?
> Which difficulty interferes most with everyday life now?
> When you say “letting go,” what would actually change?
> Are there current situations where your caution is responding to a real problem?
> Does the explanation we are developing fit, or are we connecting things that do not belong together?

## 2.5 Treatment targets

| Client concern | Proposed target | Example of an observable outcome |
|---|---|---|
| Anxiety runs the show | Greater choice despite manageable anxiety | Participate in a valued activity that was previously avoided |
| Hypervigilance | More flexible attention and more accurate appraisal of current conditions | Notice a trigger, assess the actual situation, and choose a response |
| Low self-esteem | Less global self-condemnation and more accurate self-evaluation | Describe a mistake without turning it into a verdict on the whole self |
| Low confidence | Greater confidence in responding, not control over every outcome | Attempt an agreed action and evaluate what was learned |
| Assertiveness | Express needs, preferences, disagreement, and limits appropriately | Make an ordinary request or state a boundary |
| Trust difficulties | Graduated, specific trust based on behavior | Distinguish reliability, ambiguity, and genuine warning signs |
| Discomfort with oneself | More participation in personally meaningful life | Engage in an activity without continuous self-evaluation |
| Childhood-related distress | Reduced present impact and more workable meaning | Discuss an already-known experience without automatically adopting a global negative conclusion |

These are original proposed outcomes. Establish baselines and targets with the client; do not populate them with invented numbers.

## 2.6 Treatment selection and sequencing

For diagnosed PTSD, CPT, PE, and EMDR have strong guideline support. This handbook is not a replacement for their manuals, training, or treatment structure. [R01, R02]

One randomized trial in adults with childhood-abuse-related PTSD did not find an advantage for the tested mandatory preparatory skills phase over immediate EMDR. That finding does not remove the need to address an acute crisis; it argues against imposing a lengthy preparatory phase on everyone. [R15]

The clinician may begin an appropriate established trauma-focused treatment earlier than Session 13. The later numbering of memory-related themes in this draft is organizational, not a clinical barrier. Sessions 13–16 are not a four-session substitute for a complete PTSD treatment.

Hypnosis and Emotional Freedom Techniques—EFT/tapping—are optional adjuncts in this plan. The VA/DoD guideline rates the evidence as insufficient to recommend for or against these approaches for PTSD. Do not describe them as equivalent replacements for established first-line treatment. [R02]

Co-occurring substance-use difficulties do not automatically exclude someone from trauma-focused treatment. Current intoxication or medical instability and the longer-term treatment of co-occurring conditions are different decisions. [R17]


# 3. Assessment and measurement-based care

## 3.1 Operating sequence

**Screen → clarify → formulate → choose an action → document → follow up.**

Do not delay an urgent assessment while completing a battery. Use official standardized instruments unchanged. Original interview prompts in this book supplement those instruments; they do not inherit their validity.

Choose a focused baseline battery, adding measures when the interview identifies a reason. The complete assessment may span appointments, but immediate safety questions should not be deferred.

## 3.2 Core instrument register

| Domain and measure | Calculation | Interpretation and action |
|---|---|---|
| Trauma exposure: LEC-5 | No total or composite score | Clarify relevant exposures and diagnostic exposure criteria where needed. Do not equate event count with severity or readiness. [R07] |
| PTSD symptoms: PCL-5 | 20 items scored 0–4; total 0–80 | Around 31–33 can indicate probable PTSD in some settings; cutoff choice depends on purpose and population. Interview follow-up is required. [R05] |
| Depression: PHQ-9 | Nine items scored 0–3; total 0–27 | 0–4 minimal; 5–9 mild; 10–14 moderate; 15–19 moderately severe; 20–27 severe symptom burden. Clarify item 9 independently. [R08] |
| Anxiety: GAD-7 | Seven items scored 0–3; total 0–21 | Conventional bands: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe. Assess impairment and possible alternative explanations. [R09] |
| Suicide screening: ASQ | Follow the official sequence and branching; no total | Use the current official screening result to initiate the appropriate follow-up assessment. [R03, R04] |
| Dissociation: DSS-B | Eight items scored 0–4 over the past week; total 0–32 | Characterize actual symptoms and consequences. No universal diagnostic or hypnosis-readiness cutoff is established on the official page. [R06] |
| Substances: WHO ASSIST | Substance-specific weighted scoring and skip rules | Obtain the official manual and scoring sheet. Review current effects and withdrawal separately from longer-term use. [R10] |
| Insomnia: ISI | Seven items scored 0–4; total 0–28 | Conventional bands: 0–7, 8–14, 15–21, and 22–28 correspond to increasing insomnia severity. Use the authorized version and its recall period. [R12] |
| Functioning: WHODAS 2.0, 12-item | With the specified 0–4 coding, simple raw sum 0–48 | Do not confuse a raw sum with a separately calculated complex 0–100 score; match coding to the official method. [R11] |

## 3.3 Additional measures and alternatives

PDSS-SR may be added when panic is a central concern. Its seven 0–4 items yield a raw sum of 0–28; the linked scoring sheet also describes an average composite of raw sum divided by seven. Label which metric is used. [R13]

CAPS-5 may be appropriate when a formal structured PTSD assessment is needed and the clinician is trained. PCL-5 alone does not establish a complete diagnosis. [R05]

The earlier drafts also named DES-II, DSPS, DERS, CTQ, Rosenberg Self-Esteem Scale, Brief COPE, AUDIT-C/AUDIT, DAST-10, and C-SSRS. They remain possible alternatives or specialist additions, not a requirement to administer every instrument. Before use, the clinician must obtain the exact official version, instructions, interpretation guidance, and permissions. This edition does not activate unverified scoring keys for those additional tools. [C1]

When Brief COPE is selected, do not invent a global readiness total from its coping subscales. When a self-esteem measure is selected, do not use a self-esteem threshold to determine hypnosis suitability.

## 3.4 Instrument availability and permissions

The standardized questionnaires themselves are not reproduced in this handbook. They are incorporated by reference so that the clinician can attach and administer the authorized forms unchanged.

PCL-5 is described by the VA as public domain. Other instruments have their own conditions for clinical use, reproduction, translations, electronic administration, and commercial use. Do not generalize one instrument's permissions to the entire battery. [R05]

Maintain an instrument file containing: exact version; language; date obtained; authorized form; scoring instructions; missing-item rules; relevant permissions; and the service-approved response pathway.

The ASSIST manual download and some other pages could not be retrieved during this consolidation. Scoring details carried forward from earlier drafts must be cross-checked locally before activation. Access limitations are recorded in the reference register.

## 3.5 PCL-5 scoring detail

The total is the sum of all twenty item scores. Symptom-cluster sums may be recorded separately: B, items 1–5; C, 6–7; D, 8–14; and E, 15–20.

For a provisional symptom-pattern assessment, the VA describes treating scores of 2 or higher as endorsed and applying the required pattern of at least one B symptom, one C symptom, two D symptoms, and two E symptoms. This does not replace assessment of exposure, duration, impairment, exclusions, and differential diagnosis.

A decrease of approximately ten points is a suggested response indicator, not a guarantee of recovery or procedural safety. [R05]

## 3.6 Calculation rules

**Absolute change = current score − baseline score.**

For measures where lower scores mean fewer symptoms, a negative value indicates a lower reported symptom score.

**Descriptive percentage reduction = ((baseline − current) ÷ baseline) × 100**, only when baseline is greater than zero.

Hypothetical example, not client data: PCL-5 48 to 36 gives a change of −12 and a descriptive reduction of 25%. This does not mean “25% healed” or a 25% reduction in suicide risk.

When a specific instrument requires reverse scoring on a 0–3 scale: **reversed value = 3 − original value**. Apply reversal only to the exact items in that instrument's official key.

Do not combine PCL-5, PHQ-9, DSS-B, or other scores into an invented total. Do not treat missing answers as zero. Use the official missing-data rule or mark the measure incomplete. A missing total does not prevent acting on a concerning answer.

Use the same version, coding, and reporting period for comparisons. Overlapping recall periods produce overlapping information.

## 3.7 Proposed monitoring schedule

| Time | Proposed activity |
|---|---|
| Intake | Immediate safety, clinical history, preferences, focused baseline measures |
| Early appointments | Complete relevant assessment and clarify positive findings |
| Each visit | Review important changes, functioning, safety concerns, and effects of prior work |
| Every 2–4 weeks | Relevant symptom measures and client-defined outcomes |
| Weekly when dissociation is active | DSS-B and review of actual episodes, when clinically useful |
| Approximately monthly | Functioning review; sleep and substance measures as appropriate |
| Major treatment transition | Relevant scores, client preferences, adverse effects, and revised rationale |
| Ending or transfer | Outcomes, unresolved needs, maintenance plan, and actual handoff |

These are original proposed intervals, not a universally validated schedule. Do not wait for a scheduled questionnaire to assess an emerging concern.


# 4. Immediate safety and procedural decision support

## 4.1 Suicide screening is not a clearance score

Use the current official ASQ form or the service's established alternative. The ASQ form retrieved for this edition is dated 29 September 2025. Administer it as written; the following is an implementation summary, not replacement wording. [R03]

| Finding | Action |
|---|---|
| Negative initial screen | Continue assessment; independent clinical concerns still require attention |
| Acute positive ASQ result | Urgent safety/full mental-health evaluation; pause the planned procedure and follow the local pathway |
| Non-acute positive result | Brief Suicide Safety Assessment to determine disposition, subject to official exceptions |
| Adult declines screening | Document refusal and assess other concerns; refusal alone is not classified as a positive adult screen on the retrieved form |

For a 22-year-old, the official remote-attempt exception requires attention to the under-25 provision: when the only positive response concerns a lifetime attempt, the form describes an exception involving an attempt more than a year ago and a documented brief safety assessment since that attempt. Use the exact current instructions. [R03]

## 4.2 Follow-up assessment

The relevant trained clinician should clarify current thoughts, intent, planning and access, recent behavior, prior attempts, non-suicidal or mixed-intent self-injury, current symptoms, stressors, available supports, and the practical safety arrangement.

The NIMH adult outpatient guide suggests a check-in within 48 hours when possible after a positive screen; further non-emergency evaluation, when needed, is preferably within 72 hours. These suggestions never justify postponing an assessment needed now. [R04]

Use a collaborative safety plan and practical means-safety arrangements. Do not treat a promise not to self-harm or a “no-suicide contract” as evidence of safety. [R04]

## 4.3 Unscored readiness profile

For each domain, record **A: adequate**, **S: adequate with specified support**, **U: unresolved concern**, or **N: not assessed**.

These letters are documentation codes. Do not convert them to numbers or calculate a total.

| Domain | What needs establishing |
|---|---|
| Immediate safety | Urgent concerns have been assessed and disposition fits current needs |
| Informed choice | The client understands the procedure, alternatives, and ability to decline |
| Present orientation | The client can meaningfully engage with the setting and clinician |
| Communication | There is a workable way to disagree, pause, or stop |
| Emotional participation | Distress can be addressed without losing meaningful participation |
| Dissociative symptoms | Relevant episodes and consequences have been sufficiently explored |
| Substance and medical considerations | Current effects or medical concerns do not remain unassessed |
| Environment | Current safety, privacy, transport, and immediate needs are considered |
| After-session arrangements | The client understands support and follow-up arrangements |
| Treatment fit and competence | The rationale and clinician's competence fit the intended intervention |

An S rating is not failure. A U rating does not automatically mean emergency referral. An N rating is not reassurance. Do not provoke a traumatic memory merely to test readiness.

## 4.4 Action categories

| Category | Typical situation | Next step |
|---|---|---|
| 1. Immediate evaluation | Acute safety concern, medical instability, dangerous intoxication/withdrawal, severe new confusion, or immediate interpersonal danger | Stop the planned procedure, activate the appropriate pathway, maintain appropriate contact/observation, and document the handoff |
| 2. Same-session clarification or adaptation | Non-acute positive screen, unexplained time loss, marked deterioration, major sleep disruption, or prolonged post-session difficulty | Clarify the concern; continue, adapt, defer the particular procedure, coordinate, or refer according to findings |
| 3. Planned care with monitoring | No urgent issue identified; meaningful consent and participation; appropriate rationale and supports | Proceed with the agreed plan and monitor |
| 4. Procedure not undertaken | Client declines; competence, privacy, setting, or consent is insufficient for that procedure | Do not perform that procedure; agree on an appropriate alternative or referral |

These are original action categories, not validated low/medium/high suicide-risk strata. A favorable symptom score cannot cancel an urgent finding. A severe symptom score does not by itself prohibit evidence-based trauma treatment.

## 4.5 Decision sequence

**Urgent concern?** Address it now.
**Unresolved issue affecting today's procedure?** Clarify or adapt.
**Consent, competence, or setting problem?** Do not perform that procedure.
**Otherwise:** Proceed with the agreed plan and monitoring.

## 4.6 Worked examples

**Example A—high PTSD symptoms:** A hypothetical PCL-5 score of 52 supports assessment and treatment planning. It does not by itself require twelve preparatory sessions.

**Example B—low depression total, acute concern:** A low PHQ-9 total does not override current suicidal thoughts requiring urgent assessment.

**Example C—modest dissociation total, concerning episode:** Unexplained loss of awareness while driving requires clarification despite a modest questionnaire score.

**Example D—hypnosis declined:** Choose an acceptable alternative; do not document “failed readiness.”

**Example E—tapping becomes compulsory:** Review whether the exercise supports participation or has become a rule the client believes prevents catastrophe.

## 4.7 Remote-care and service readiness

Before remote work, confirm actual location, callback details, privacy, emergency contact arrangements where appropriate, and a connection-failure plan. Do not assume the user's or clinician's location is the client's location.

Do not use an unattended questionnaire submission system as an implied emergency service. Establish who reviews submissions and how quickly; explain those limits accurately. The NIMH toolkit emphasizes establishing a response process before screening implementation. [R19]

For a client in the United States, include 988 in the actual resource plan where appropriate. Emergency medical or immediate-danger arrangements must follow the relevant local pathway. [R03]


# 5. Original structured intake interview

! The questions that follow are original clinical prompts, not a validated questionnaire. Use them conversationally, with consent and clinical judgment. They supplement official instruments and do not produce a diagnostic or readiness total.

For relevant answers, document: onset; recent frequency; most recent example; context; effect on functioning; what helps; uncertainties; and the action required.

Record “not assessed,” “uncertain,” and “declined” distinctly from “absent.” Do not require a detailed trauma narrative merely to complete an intake.
"""

INTERVIEW_GROUPS = [
    ("A. Goals, preferences, and previous treatment", [
        "What are the two or three changes that would make treatment worthwhile for you?",
        "When you say “letting go,” what would be different in everyday life?",
        "What has previous therapy helped with, and what still feels difficult?",
        "Were parts of earlier treatment overwhelming, invalidating, ineffective, or difficult to refuse?",
        "What helps you feel respected and able to speak openly with a therapist?",
        "What would be helpful about your stated preference for a male therapist or intern?",
        "What cultural, identity, religious, disability, or family considerations should we include?",
        "How would you tell me that I have misunderstood you or that you disagree with the plan?"
    ]),
    ("B. Present safety and environment", [
        "Do you feel physically safe where you currently live?",
        "Is anyone currently threatening, hurting, pressuring, monitoring, or controlling you?",
        "Could someone see therapy messages or records in a way that creates a problem for you?",
        "Are there immediate concerns about housing, food, money, transport, or medication access?",
        "Could saying no or setting a boundary in a current relationship put you in danger?",
        "Are children, dependent adults, or other people potentially in immediate danger?",
        "After a difficult appointment, where would you go and whom could you contact?",
        "Is anything happening today that should take priority over the planned treatment?"
    ]),
    ("C. Childhood experiences and present impact", [
        "Which experiences you already identify as traumatic seem connected to current difficulties?",
        "Would you prefer to describe the general type of experience rather than details today?",
        "Are the circumstances entirely in the past, still happening, or linked to current contact?",
        "Which present situations seem to bring up associated reactions?",
        "Which feelings are most difficult, using your own words?",
        "What conclusions about yourself or other people seem connected with those experiences?",
        "Are there things you avoid because they bring up distress?",
        "Are there uncertainties you would prefer not to resolve through treatment, while focusing on the present impact?"
    ]),
    ("D. Dissociation and orientation", [
        "Do you sometimes feel detached from your body, emotions, or sense of being yourself?",
        "Do your surroundings sometimes feel unreal, dreamlike, or unfamiliar?",
        "Have you noticed periods of time you cannot account for beyond ordinary forgetfulness?",
        "Have others described things you did or said that you do not remember?",
        "During these experiences, can you recognize where you are and communicate?",
        "Have episodes happened during driving, work, caregiving, or another activity where awareness matters?",
        "Do episodes seem related to stress, panic, poor sleep, medication changes, or substances?",
        "What helps you reconnect, and have any exercises made disconnection worse?"
    ]),
    ("E. Sleep, panic, activation, and unusual experiences", [
        "How much have you slept recently, and how different is that from your usual pattern?",
        "Are you tired but unable to sleep, or unusually energetic despite much less sleep?",
        "Have energy, confidence, speech, activity, spending, or risk-taking been markedly unlike your usual self?",
        "Have there been sudden episodes of intense fear or physical symptoms, and what occurs?",
        "Are you avoiding activities or places because you fear another episode?",
        "Have you had recent experiences that other people do not appear to share?",
        "Do any experiences feel as though they direct you to hurt yourself or someone else?",
        "Have you had new confusion, fainting, seizures, severe physical symptoms, or a recent head injury?"
    ]),
    ("F. Substances, medications, and health", [
        "What alcohol, cannabis, nicotine, other substances, supplements, and medications have you used recently?",
        "Has the amount, frequency, or purpose of use changed?",
        "Do you use anything to manage memories, emotions, sleep difficulties, or appointments?",
        "Have there been blackouts, overdoses, withdrawal symptoms, or difficulty controlling use?",
        "Have you used anything today that could affect attention, judgment, or awareness?",
        "Have medications recently been started, stopped, missed, or changed?",
        "Which medical conditions or health changes should we consider when planning sessions?",
        "Who provides medical or prescribing care, and may we coordinate when needed?"
    ]),
    ("G. Self-harm and interpersonal-harm clarification", [
        "Have you intentionally injured yourself recently, and what were you hoping would happen or change?",
        "Was any part of you trying to die, trying to cope without dying, or was the intention unclear?",
        "Have thoughts or urges about suicide or self-injury changed since the last assessment?",
        "Have you taken any steps toward acting on those thoughts?",
        "What has helped you delay or not act, and is that help available today?",
        "Have you felt close to seriously harming someone else or worried about losing control?",
        "What would make it harder to use a safety plan or contact someone?",
        "What needs to happen before you leave so the next few hours are more manageable?"
    ]),
    ("H. Coping, functioning, and participation", [
        "When distress increases, what do you usually do first?",
        "Which responses help immediately and later, and which create problems afterward?",
        "Can you notice early signs of becoming overwhelmed or disconnected?",
        "Would you consider a brief non-trauma-focused orienting exercise and tell me whether it helps?",
        "How would you signal that you need to pause or stop an exercise?",
        "What happened later that day, overnight, and the next day after previous difficult sessions?",
        "How are work or study, relationships, self-care, and ordinary responsibilities going?",
        "What support would make the next stage of treatment more workable?",
        "What concerns do you have about trauma-focused treatment or hypnosis?",
        "Which approach do you prefer after discussing the options, and which do you not want?"
    ]),
]

METHODS = r"""
# 6. Hypnosis, grounding, EFT, and memory safeguards

## 6.1 Grounding as an optional support

The proposed purpose is present orientation and participation, not proving that anxiety has disappeared. Offer choices: looking around, a small movement, noticing an external object, changing position, ordinary conversation, or no special exercise.

Do not require eyes closed, eye contact, breath holding, a body scan, or a vividly imagined “safe place.” Ask whether the exercise helps, feels neutral, or makes things harder. A low distress rating with marked disconnection is not automatically improvement.

Grounding should not become something the client believes must be completed perfectly before difficult feelings can be tolerated. During a selected manualized treatment, use supports in a way consistent with its rationale rather than automatically interrupting every rise in distress.

## 6.2 EFT/tapping

In this handbook, EFT means Emotional Freedom Techniques/tapping, not emotion-focused therapy. The optional tapping dialogue is an adjunctive self-regulation practice, not a complete standardized EFT training protocol.

Use an agreed self-administered method within the clinician's competence. Keep the target present and manageable; use the client's language. Do not insert an unreported abuse narrative into a tapping statement.

Track the person's experience before and after, including unwanted effects. Do not claim that a change in distress proves a particular memory or theory. Evidence limitations for PTSD should be disclosed. [R02]

## 6.3 Hypnosis-specific consent

Discuss the intended target, alternatives, evidence limitations, possible discomfort or unwanted imagery, the ability to pause or decline, monitoring, and the after-session plan.

Do not promise a particular depth of trance, accurate recovery of forgotten events, guaranteed control, permanent change, or a neurological mechanism measured in this client.

Consent to hypnosis does not imply consent to touch, recording, memory-focused work, or other procedures. Obtain the relevant separate permissions.

Teach-back prompts:
> What are we hoping this exercise will help with?
> What would you do if you wanted to stop or change it?
> What would an unfamiliar image mean—and not mean?
> What other treatment choices remain available?

## 6.4 Memory-safeguarding principle

**Validate distress without manufacturing certainty.**

The APA position statement describes the need for an empathic, neutral stance toward uncertain memories and cautions that suggestion can alter recollection. Symptoms alone do not establish a particular childhood event. The clinician should neither automatically confirm nor dismiss unfamiliar material. [R14]

The following safeguards are original operational applications for this handbook.

| Do | Do not |
|---|---|
| Describe material as an image, thought, sensation, familiar memory, or possible memory according to the client's account | Label unfamiliar material a recovered memory proving an event |
| Ask neutral questions about what the client is experiencing now | Introduce a perpetrator, age, location, or event the client has not reported |
| Work on present meaning and distress | Make memory recovery necessary for improvement |
| Clearly label intentional therapeutic imagery | Present imagination as historical reconstruction |
| Retain uncertainty in documentation | Equate confidence, tears, bodily reactions, or vividness with accuracy |
| Support considered, autonomous decisions | Encourage accusations or confrontation based solely on hypnotically elicited material |
| Assess current safeguarding concerns using appropriate procedures | Assume uncertainty removes all present safeguarding responsibilities |
| Seek supervision when the situation exceeds competence | Intensify imagery to force a catharsis or an answer |

Avoid statements such as “the subconscious never lies,” “your symptoms prove abuse,” or “go back to the first time this happened” when that presupposes an unknown event.

## 6.5 Neutral response when unfamiliar material appears

> That sounds significant and possibly upsetting.
> We can take the experience seriously without deciding immediately what it represents.
> I cannot establish its historical accuracy from this exercise.
> Let’s pause and focus on what would help you now.

Record the preceding clinician prompt, the client's spontaneous words, the client's expressed uncertainty, observations of orientation and distress, the response provided, and any consultation or safeguarding action. Keep observation, report, and interpretation distinct.

## 6.6 Documentation contrast

**Appropriate:** During intentional imagery, the client described an unfamiliar image and expressed uncertainty about whether it represented an event. The clinician paused the exercise and assessed current orientation and safety. Historical accuracy was not determined.

**Inappropriate:** Hypnosis recovered a repressed memory proving that the event occurred.

## 6.7 Home practice

This handbook does not assign self-directed searches for memories, age regression, or unsupervised trauma reliving. Optional home practice should be agreed, brief, and appropriate to the person's circumstances.

Do not use inwardly focused exercises while driving, operating equipment, or in another setting requiring continuous external attention. The client should know when to stop an exercise and which actual contact pathway to use.


# 7. Inner-child and younger-self work: source-informed adaptation

## 7.1 What the supplied sources support

U1 contains presentation descriptions and extensive commentary. It is not a transcript of all named instructors. U2 is a timestamped transcript with errors, gaps, and unclear wording. Do not silently reconstruct unclear passages.

| Source passage | Supported point | Boundary |
|---|---|---|
| U2, approximately 1:54–4:00 | Clarify expectations and identify the desired change in functioning | Does not make a requested modality automatically indicated |
| U2, approximately 3:19–3:29 | Possible behavioral explanations are explicitly qualified as guesses | Does not establish sabotage or authority conflict in TM-002 |
| U2, approximately 4:05–5:12 | Re-parenting, self-value, advocacy, listening, and safety are discussed | Specific needs must come from this client |
| U2, approximately 6:21–6:38 | Potentially strong emotional responses and possible psychologist involvement are acknowledged | Competence, consultation, and coordination matter |
| U2, approximately 6:45–8:01 | Adult-to-younger-self work in a newly created room, distinguished from returning to an actual childhood location | Not a historical reconstruction or memory-verification method |

The teaching case concerns a different, 51-year-old female client. Its possible behavior patterns must not be imported as findings about this 22-year-old client. [U1, U2]

## 7.2 Preserving differences between the teaching-note strands

**John Melton material:** Retain the supported emphasis on expectations, actual goals, re-parenting, adult perspective, and attention to emotional intensity.

**George Kappas material:** U1 describes a critique of repeatedly revisiting childhood at the expense of current functioning and refers to theory of mind, message-unit theory, and suggestibility. A complete verbatim transcript of this presentation was not supplied. Preserve these as attributed teaching-note concepts, not established mechanisms in TM-002.

**Saman Nasir material:** U1 describes a neuroscience-framed presentation and then extrapolates to the amygdala, hippocampus, vagus nerve, and memory reconsolidation in TM-002. The attachments contain no measurements establishing those specific mechanisms in this client or the room exercise.

Do not state that psychotherapy works only with conscious understanding, that the limbic system cannot respond to psychotherapy, or that hypnosis necessarily finishes what psychotherapy cannot. Established trauma psychotherapies address cognitive, emotional, and behavioral processes. [R01]

## 7.3 E&P

The official HMI introduction describes an E&P suggestibility framework. That page does not establish it as a validated rule for diagnosing PTSD, assessing acute safety, determining dissociation risk, or allocating this client to inner-child work. [R18]

This handbook does not use “E&P decides everything” as an operational rule. Ask about language preferences and observe the person's actual response without making preference a clearance test.

## 7.4 Revised framing

> What do you already understand about these reactions, and what would you like to be different in how you feel or respond?

This replaces the false choice between understanding why and being ready to change.

> What made the practice difficult to use?

This replaces assumptions that missed homework, humor, or cancellation proves subconscious sabotage.

## 7.5 The newly imagined room

The optional procedure is named **Younger-Self Re-parenting in a Newly Imagined Space**. “Inner child” is an optional metaphor; “younger self” or another term may fit better.

The proposed sequence retains the room concept while clearly labeling adaptations:
1. Clarify purpose and consent.
2. Create a new, sufficiently comfortable or neutral imagined setting.
3. Consider a younger-self representation chosen by the client.
4. Explore a supportive response based on identified needs.
5. Link the experience to present-day confidence and choice.
6. End through client-chosen symbolism or ordinary reorientation, then identify a concrete action.

These are original adaptations, not a verbatim HMI protocol and not an independently validated package.

## 7.6 Supportive figures and integration

An imagined parent-like, sibling-like, family-like, or other supportive figure may be included only by choice and explicitly as intentional imagination. Do not introduce a real relative or assume that physical closeness is wanted.

No merging image is required. “Integration” in this handbook means acknowledging earlier feelings and needs while retaining adult perspective, present orientation, choice, and access to support.

Possible endings include a brief goodbye to the image, leaving the imagined scene, carrying forward a phrase or quality, or simply returning to conversation. An embrace or another symbol is optional. Declining it is not failure or evidence of a split.

## 7.7 Relation to imagery-rescripting research

A randomized trial involving 155 adults with childhood-trauma-related PTSD found substantial improvement after both the studied imagery-rescripting treatment and EMDR. That study used defined procedures and trained clinicians; it does not validate every intervention described as inner-child work. [R16]

Keep compassionate younger-self imagery, formal imagery rescripting, and attempts at memory recovery conceptually separate. Formal memory-focused work requires the relevant competence and treatment rationale.

## 7.8 Criteria for offering the optional room exercise

Offer only when there is a clear client-relevant purpose, meaningful consent, an appropriate current clinical assessment, competence to manage likely responses, a workable stop plan, and time for review.

Use ordinary conversation or writing instead when preferred. Do not introduce the exercise solely because Session 2, 3, 8, or 15 has arrived. Do not use it as a test of cooperation.

## 7.9 Outcome review

Ask whether the exercise affects self-criticism, boundaries, help-seeking, trust discrimination, anxiety interference, or functioning. Do not use vividness, tears, a merging image, or a reported feeling of “healing” as the only outcome.
"""

OPENING = r"""
## Opening: review, safety, and shared agenda

~ Review the previous note, submitted measures, outstanding follow-up, and actual care arrangements before starting. Ask one question at a time and respond to the answer.

> Good to see you. What feels most important for me to understand about the time since we last met?
> How was the period after our previous appointment, including later that day and that night?
> Have thoughts about suicide, wishing you were dead, or hurting yourself come up or changed since our last assessment?

~ A positive or unclear response activates the relevant clinical assessment pathway. Do not mechanically finish this opening first.

> Has anything changed about your safety at home or in relationships?
> How has your sleep been?
> Have substances, medications, or physical-health changes affected you?
> Have there been episodes of feeling unreal, disconnected, confused, or unable to account for time?
> Have you noticed unusual changes in energy, thinking, or everyday functioning?

~ Clarify relevant answers and administer official measures due under the agreed protocol.

> How distressed do you feel right now? Words or an optional zero-to-ten rating are both fine.
> Separately, how connected do you feel to this conversation and the room?
> Would you prefer a brief orienting exercise, a change in position, or to continue without an exercise?

~ Use Grounding G only when appropriate and agreed. Decide whether today's proposed procedure still fits.

> Based on what you have told me, let's decide what deserves our attention today.
"""

CLOSING = r"""
## Closing: integration, next steps, and disposition

~ Leave adequate time. Do not introduce a new evocative exercise while closing.

> Let's leave time to finish rather than stopping abruptly.
> What feels most useful or important from today?
> Was there anything I misunderstood, moved through too quickly, or approached in a way that did not fit?

~ Respond to feedback and repair misunderstandings.

> Where are you now with distress and your sense of connection to the room and this conversation?
> Would looking around, moving a little, or talking through your next activity help?

~ Assess clinically. A low number is not sufficient reassurance, and zero distress is not required.

> Put the between-session plan into your own words. What are you choosing to try?
> What might get in the way?
> What is a smaller or more practical version?
> What signs would tell you to contact someone sooner rather than wait for our next planned contact?

~ Confirm real support arrangements and service response times. Do not imply continuous availability.

> What is your plan immediately after this appointment?
> Our next agreed step is [actual appointment, review, referral, or other arrangement].
> Before we finish, is there anything affecting your safety or ability to manage the next few hours that we have not addressed?

~ Complete any necessary assessment and disposition before ending. Document what actually occurred, not the intended result of the script.
"""

GROUNDING = r"""
## Grounding G: optional present orientation

~ Use a conversational voice. Do not require closed eyes, eye contact, breath control, or touch.

> You do not need to make yourself feel anything in particular.
> Let your breathing stay as it is for now.
> At a comfortable pace, notice one ordinary object in the room.
> Notice a concrete detail, such as its color, shape, or position.

~ Pause.

> You can keep looking there or choose another point.
> Would noticing the chair or another support underneath you be useful, or would you rather stay with what you can see?

~ Follow the preference.

> You may make a small comfortable movement, such as adjusting your position.
> Notice that we are having a conversation here, in this setting, today.
> What happened as we tried that: did it help, feel neutral, or make things harder?

~ Stop and reassess if it worsens symptoms. Do not repeat until the client provides a preferred answer.

> Thank you. That tells us something useful about what does and does not suit you.
"""

BRANCHES = r"""
# 8. Response-dependent branches and delivery rules

## 8.1 General delivery rules

Every session consists of an opening, a client-responsive main section, an agreed practice or next step, and a closing. The scripts below contain the spoken language; silence and actual client dialogue determine the pace.

A proposed 50–60-minute appointment might use approximately ten minutes for review, thirty to thirty-five for main work, and ten to fifteen for closing. This is an original planning example, not a prescribed dose. Adjust to the selected treatment and actual needs.

Never finish a script at the expense of assessment, consent, or an appropriate ending.

## Branch S: suicide or self-harm concern

> Thank you for telling me. I want to give this the attention it needs rather than continue with our original agenda.
> I am going to ask some direct questions so we can understand what is happening and decide on the right support.

~ Use the service's official screening and safety-assessment pathway. For an urgent concern, pause the planned procedure and arrange the necessary evaluation.

> We are pausing the planned exercise. The priority now is arranging the assessment and support you need.

~ Maintain appropriate contact or observation and document the actual handoff. Do not substitute reassuring language or a safety promise for assessment.

## Branch D: marked disorientation or disconnection

> Let's pause the exercise.
> My name is [name]. We are in [setting], and today is [date].
> Can you hear me clearly?

~ Wait. Use one simple prompt at a time.

> Would looking at something in the room help?
> You do not need to explain the experience right now.

~ Do not touch unexpectedly or intensify imagery. Persistent, new, or unexplained altered awareness requires assessment rather than indefinite grounding. Consider medical and substance-related possibilities as appropriate.

## Branch E: increased distress with continued engagement

> I notice this has become more difficult. How is it from your side?
> Would you prefer to continue at this pace, slow down, change the approach, or stop the exercise?

~ Honor the response and the selected treatment's rationale. Do not assume every increase in distress is harmful or that all distress must be pushed through.

## Branch M: unfamiliar image or possible memory

> That sounds significant and possibly upsetting.
> We can take the experience seriously without deciding immediately what it represents.
> I cannot establish historical accuracy from this exercise.
> Let's pause and focus on what would help now.

~ Avoid leading detail, preserve uncertainty, and use the memory-event record.

## Branch R: misunderstanding or relationship rupture

> Thank you for correcting me.
> I said [actual statement], and you experienced that as [client's description]. Have I understood?
> What would you like me to understand differently?

~ Acknowledge an actual mistake and apologize when appropriate.

> Let's change how we approach this.

## Branch P: practice was not completed

> What made the practice difficult to use?
> Was it unclear, uncomfortable, impractical, not relevant, or something else?
> Should we change the task, make it smaller, or choose a different approach?

~ Do not infer sabotage, lack of motivation, or an attachment pattern from noncompletion alone.

## Branch N: little or no improvement

> What do the measures and your experience suggest is changing?
> What is not improving?
> Are we working on the right problem in the right way?
> Is there anything about the treatment that is making life harder?
> What should we continue, change, assess further, or refer for?

~ Review formulation, treatment fit, fidelity, dose, access barriers, comorbidity, and client preference. Do not explain every deterioration as necessary healing.
"""

HYPNOSIS = r"""
## Optional module H1: focused attention and present-day choice

! Original adjunctive script. Use only after assessment, informed consent, and an appropriate rationale. This is not memory recovery or a complete PTSD treatment. Ordinary conversation is an equally available alternative.

### H1.1 Introduction

> The purpose is to practice attention and choice.
> We are not going to search for forgotten experiences.
> You can keep your eyes open, speak, move, disagree, or stop.
> You do not have to become deeply relaxed or have an unusual experience.
> These are suggestions to consider, not instructions you have to obey.
> What would you like me to remember while we do this?

~ Incorporate the response.

> Are you comfortable beginning?

### H1.2 Induction

> Choose somewhere comfortable to rest your gaze.
> Notice that you can look there while still knowing we are in this room.
> You can notice my voice without blocking out other sounds.
> Let your breathing remain comfortable and unforced.
> There is nothing you need to push away.
> A thought may come, and you can notice it.
> A sound may occur, and it can remain an ordinary sound in the room.
> You are welcome to tell me what you are noticing.

~ Pause briefly and check participation.

### H1.3 Steadier attention

> For a few moments, you might notice one simple detail, such as a color or the support of the chair.
> Then you can broaden attention to the room again.
> You are practicing moving attention, rather than losing contact with the present.
> You can stay as alert as you find useful.
> Nothing needs to become deeper.
> Would you like to continue, change something, or finish?

### H1.4 Suggestion and rehearsal

> Consider one small present-day choice that belongs to you.
> It might be asking for time to think or expressing an ordinary preference.
> Choose something manageable rather than a difficult memory.

~ Let the client choose.

> A possible sentence is, “I can take a moment before I answer.”
> Another is, “My preference is worth expressing even when someone else differs.”
> Do not repeat wording that feels wrong.
> What sentence fits your situation?

~ Use the client's words.

> Imagine, only as intentional rehearsal, saying that sentence in the situation you selected.
> You do not need to imagine a perfect response.
> Notice your chosen action: pausing, speaking, asking, or deciding.
> The practice is about your choice, not controlling another person.

### H1.5 Reorientation and review

> Let the rehearsal finish.
> Bring attention more fully to the room.
> Notice what you can see around you.
> Move or adjust your position comfortably.
> Take the time you need to return to ordinary conversation.
> How are you feeling, and how connected do you feel to what is happening here?

~ Assess actual orientation and response before proceeding to the session closing.

> What was useful, neutral, or uncomfortable?
> Do you want this approach included again, changed, or left out?

### Non-hypnotic alternative

> Let's practice the same choice in ordinary conversation.
> Tell me one preference you have about this appointment.

~ Respond respectfully to the actual preference.

> What was it like to say that?
> Would another attempt be useful, or is that enough practice for today?
"""

ROOM = r"""
## Optional module Y1: younger-self re-parenting in a newly imagined space

! Original, source-informed adaptation—not a verbatim HMI protocol or a validated standalone trauma treatment. It does not require hypnosis, an age-regression procedure, a vivid image, physical touch, or a merging endpoint.

### Y1.1 Consent and purpose

> There is an optional exercise in which you consider your younger self from your present-day perspective.
> Some people call this inner-child work. Does that language fit, or would you prefer another term?
> What would you hope to gain from it?

~ Wait and clarify a present-day goal.

> We would use an imagined setting, not reconstruct a childhood scene.
> There is no need to discover a memory, produce a particular emotion, or imagine vividly.
> We can do similar work through conversation or writing.
> You can decline, pause, or change the exercise.
> What concerns or preferences should we address before deciding?

~ Establish the actual choice and stop signal. Do not proceed without agreement.

### Y1.2 Retain present orientation

> Keep your eyes open or choose the position that suits you.
> Notice something in this actual room.
> You can continue to know where you are while considering an imagined scene.
> Tell me if the exercise becomes less useful or harder to stay connected with.

### Y1.3 Create the setting

> Consider a new, imagined place that is sufficiently comfortable or neutral.
> It does not need to resemble anywhere you lived.
> You may imagine a room, another setting, a simple outline, or just an idea.
> You can choose the amount of detail.
> What would make it more workable: space, light, distance, furniture, or something else?

~ Do not insist on multisensory vividness or a feeling of perfect safety.

> Nothing needs to appear unless you choose it.
> You can change the setting or leave it at any point.

### Y1.4 Consider the younger-self representation

> Would it be useful to consider a younger version of yourself here?
> You do not need to choose an exact age or retrieve an event.
> It can be an image, a few words on a page, or simply a way of thinking about yourself earlier in life.
> What distance or arrangement feels appropriate?

~ Do not demand approach, eye contact, affection, or dialogue.

> From your present perspective, what do you want to understand about the needs you already associate with that time?
> Is there a supportive response you would like to offer?

### Y1.5 Offer support without supplying a history

> Use words that fit what you know, rather than what you think you are supposed to say.
> Would listening, respect, protection, permission to disagree, practical help, or something else be relevant?

~ The client identifies the need. Do not presume that each need was absent.

> What would you want a younger person in those circumstances to understand?
> How could you say that in a way you can genuinely stand behind?

~ Possible wording may be offered only as optional language, not as a conclusion about unknown events.

> “Your needs are worth hearing.”
> “You can have feelings without being reduced to them.”
> “You do not have to manage everything alone.”
> “We can look at what is happening now and choose appropriate support.”

> Which words fit, and which should we leave out?

### Y1.6 Optional imagined supporters

> Would the exercise be more useful with only your present-day perspective, or with an intentionally imagined supportive figure?
> A supportive figure does not have to resemble a real relative.
> What role would you choose, and what would you want that figure to do—or not do?

~ Keep the figure explicitly imagined. Do not insert an actual family member or impose physical closeness. Do not use the therapist as an exclusive rescuer.

### Y1.7 Carry the learning forward

> What quality or understanding would you like to carry into your life now?
> How might it affect the way you respond to a mistake, express a need, or choose a boundary?
> What is one ordinary action that would make this more than an image?

~ Link to the client's agreed treatment goal.

### Y1.8 Optional symbolic ending

> There is no required ending.
> You could let the scene fade, leave the imagined room, say a brief goodbye, or carry forward a word or quality.
> Another image is available only if you choose it.
> You do not need to merge with an image or make anything become one.
> What ending fits for you?

~ Honor the choice. No interpretation of failure or resistance.

### Y1.9 Reorientation and debrief

> Let the imagined scene finish.
> Look around this actual room.
> Notice where we are and that we are speaking together now.
> Move or adjust your position comfortably.
> How connected do you feel to the present conversation?
> What was useful, neutral, uncomfortable, or unexpected?
> Did anything feel imposed or inaccurate?
> Would you prefer to use this approach again, change it, or not repeat it?

~ Use the appropriate branch if unfamiliar memories, disorientation, or a safety concern emerged. Document imagery as imagery; do not infer historical accuracy or neurological integration.

> What practical action are you choosing to take from the exercise?

~ Complete the full session closing and after-session plan. Do not assign unsupervised memory searching.
"""

SESSION_DATA: List[Tuple[str, str, str, str, str]] = [
    (
        "01 — Meeting, expectations, consent, and priorities",
        "Establish a workable relationship, assess current needs, and translate broad concerns into client-defined goals.",
        r"""
## Main dialogue

### 1. Welcome and explain the service

> Welcome. Before we get into difficult experiences, I would like to understand what you are looking for and how we can work together.
> You do not need to tell your whole history today.
> You can ask why I am asking something, request a pause, or tell me that it does not fit.
> Let's review privacy, the limits of confidentiality, and how this service works.

~ Explain actual locally approved arrangements, including trainee status and supervision when relevant.

> What questions or concerns do you have?
> You mentioned that a male clinician might help you feel more comfortable. What would be helpful for us to understand about that preference?

### 2. Establish immediate priorities

> What brought you to seek additional help at this point?
> What has been hardest to manage recently?
> Is anything happening now that should take priority over the longer-term goals?

~ Complete the immediate safety assessment and relevant official screening. Use the structured interview without requiring an unnecessary trauma narrative.

> Some questions are direct because they help us choose appropriate support. They are not a test of whether you deserve treatment.

### 3. Build on previous psychotherapy

> You said previous psychotherapy helped a great deal. What changed?
> Which approaches were useful?
> Was anything unhelpful or something you do not want repeated?
> What do you understand now that you did not understand before?
> I want to build on that work rather than assume we need to start again.

### 4. Clarify expectations

> What are you hoping hypnotherapy would add?
> What do you expect would happen during a session?
> What does “resolve” mean to you?
> When you say you want to feel comfortable in your own skin, what would be different during an ordinary day?

~ Correct misconceptions without devaluing prior therapy or promising neurological reprogramming.

### 5. Agree on goals

> What would you be doing more of?
> What would anxiety interfere with less?
> Which concern feels most important to begin with?
> Here is my understanding: you would like less [client's description] and greater ability to [chosen behavior].
> What needs changing in that summary?
> For next time, would it be manageable to notice one recent situation in which anxiety, self-criticism, or difficulty speaking up appeared?
""",
        "Notice one manageable recent example. A few words about the situation, feeling, and response are enough; no detailed trauma history is assigned.",
        "Record actual goals, preferences, assessment findings and gaps, prior treatment gains, and the agreed next step."
    ),
    (
        "02 — Shared formulation and treatment choice",
        "Develop a tentative explanation collaboratively and choose an appropriate treatment direction.",
        r"""
## Main dialogue

### 1. Review without grading

> What did you notice about the situation we agreed to observe?
> If nothing was recorded, we can work with something you remember.
> Was the task unclear, impractical, uncomfortable, or not useful?

### 2. Finish relevant assessment

> I would like to complete the parts of the assessment that matter for planning care.
> We can discuss the general nature of past experiences without unnecessary detail.

~ Administer outstanding official measures and investigate positive findings.

> How well do these results fit your experience?
> What do they capture accurately?
> What do they miss?

### 3. Offer a tentative formulation

> Let me offer a possibility, and you can correct it.
> When [trigger] happens, you seem to expect [client's prediction].
> You then notice [reported reactions] and respond by [reported action].
> That may help with [immediate effect] while making [longer-term difficulty] harder.
> Does that fit, or am I connecting things that do not belong together?
> Where is caution responding to an actual current problem?

### 4. Discuss options

> We can choose approaches based on what the assessment shows, what you prefer, and the treatments available here.
> What appeals to you about the options?
> What concerns you?
> What would you need to know before deciding?

~ Explain the specific appropriate therapies within competence. Discuss evidence limitations for adjuncts.

> Twenty appointments is a provisional framework, not a requirement or a promise.
> We will not postpone appropriate treatment simply because a skill appears earlier on a schedule.

### 5. Agree on the next step

> Our working understanding is [agreed summary].
> The next step we have chosen is [actual decision].
> What would tell us that we need to revisit that decision?
""",
        "Continue observing one situation, including the immediate benefit and longer-term cost of the response.",
        "Record the formulation as provisional, the options discussed, consent, and actual treatment selection."
    ),
    (
        "03 — Present orientation and workable regulation",
        "Find supports that help participation without requiring complete calm.",
        r"""
## Main dialogue

### 1. Identify early signs

> Today, let's explore what helps you stay engaged when the difficult pattern begins.
> The aim is not to remove every feeling before you can act.
> What tells you that you are becoming overwhelmed?
> What tells you that you are becoming disconnected rather than simply anxious?

### 2. Learn from existing coping

> When you have managed a difficult moment reasonably well, what helped?
> Was it something you did, another person's response, a practical change, or a combination?
> Have inward attention, breathing, imagery, or body-focused exercises made things harder?
> What do you already know you do not want to use?

### 3. Try an external option

> Would you be willing to try a short exercise focused on the room rather than a memory?

~ Use Grounding G with agreement.

> What did you notice?
> Did it help you participate, even if it did not make you relaxed?
> What would you change?

### 4. Compare rather than prescribe

> We could compare that with a small movement, a change in position, or talking through your next activity.
> Which seems suitable?

~ Briefly try the chosen option.

> What was different?
> Which would you be most likely to use in everyday life?
> If neither helps, we do not need to make either one your technique.

### 5. Link practice to choice

> Let's choose an ordinary moment for practice.
> Instead of asking whether it eliminates anxiety, ask whether it helps you notice the present and choose your next action.
> What would tell you to stop an exercise and bring it back for discussion?
""",
        "Try one brief agreed orienting or practical support in an ordinary situation; note helpful, neutral, or adverse effects.",
        "Record early warning signs, preferred supports, adverse responses, and whether the method aids participation."
    ),
    (
        "04 — Agency and optional focused-attention work",
        "Practice choice; consider tapping or hypnosis only when appropriate and preferred.",
        r"""
## Main dialogue

### 1. Review the practice

> How did the practice fit your actual week?
> Was it useful, neutral, uncomfortable, or something you did not use?
> Did it begin to feel like something you had to complete before handling anything difficult?
> I want exercises to support your choices, not become another rule.

### 2. Offer a genuine choice

> We could practice a small choice in ordinary conversation.
> Another option is a brief focused-attention exercise.
> Tapping is also an optional adjunct, with limitations in the evidence for PTSD.
> Which option, including no special exercise, makes sense to you?

~ Do not automatically stack several procedures.

### 3. Optional tapping dialogue

> Let's focus on something present and manageable, not on searching for a childhood event.
> You can use the agreed gentle self-tapping method, omit a location, or stop.
> A possible phrase is, “I notice tension, and I am choosing what would help now.”
> Does that fit, or would you prefer your own words?

~ Briefly practice only a method already explained within the clinician's competence.

> What changed, if anything?
> There is no answer you need to give me.

### 4. Optional focused attention

~ When selected after consent and assessment, use module H1 below. Otherwise use its ordinary-conversation alternative.

### 5. Review agency

> What did you learn about the exercise and your ability to make choices?
> Was anything uncomfortable or different from what you expected?
> Do you want the approach repeated, changed, or left out?
> What ordinary preference or pause would you like to practice this week?
""",
        "Practice one ordinary pause or preference. No assignment to retrieve memories or eliminate all feelings.",
        "Record procedure-specific consent, actual method, response, adverse effects, and the client's choice about future use."
    ),
    (
        "05 — Triggers and protective responses",
        "Map a specific recent pattern and identify an appropriate point of choice.",
        r"""
## Main dialogue

### 1. Review the action

> What happened when you tried pausing or expressing a preference?
> What did you predict?
> What actually happened?

### 2. Select a manageable example

> Choose one recent situation where anxiety seemed to take over.
> It does not need to be the most difficult example.
> What happened that another person could have observed?
> What did you immediately think it meant?
> What did you notice emotionally or physically?
> What did you feel an urge to do?
> What did you actually do?

~ Keep observable events separate from interpretations.

### 3. Examine effects

> How did the response help in the next few minutes?
> What effect did it have later?
> Was there a genuine present danger needing protection?
> Where there was uncertainty, how did you decide what it meant?
> What information did you have, and what remained unknown?

### 4. Identify choice

> Where might a small change be possible?
> Would it help to examine the meaning, ask for clarification, change the action, or address a practical problem?
> Which is most relevant?
> What would you say to yourself?
> What would you do next?
> What would make that realistic?

### 5. Agree on observation

> The task is to notice one sequence, not perform it perfectly.
> A useful observation remains useful even when the response does not change.
""",
        "Complete one trigger–meaning–response record using an actual situation.",
        "Record real danger separately from uncertainty; do not automatically challenge protective behavior in an unsafe setting."
    ),
    (
        "06 — Behavioral experiments and confidence",
        "Test a specific prediction through a small, appropriate action.",
        r"""
## Main dialogue

### 1. Identify the prediction

> Which example gives us the clearest picture?
> What did you predict?
> How convincing did that prediction feel?

### 2. Choose an appropriate experiment

> Choose a small action that matters and is reasonably safe in the actual circumstances.
> This is not a test that requires confronting someone dangerous.
> What action would give useful information?
> Complete this sentence: “If I do [action], I predict [observable outcome].”
> What outcome would remain ambiguous?

### 3. Rehearse

> Say it in words you might actually use.
> What feels natural?
> What feels forced?
> Would you change the wording or make the action smaller?

### 4. Prepare for different outcomes

> If the response is positive, what can you learn without concluding that everyone is safe?
> If it is unclear, how could you avoid immediately filling in the uncertainty?
> If it is disappointing, what would help you respond without treating it as a verdict on your worth?
> What support or boundary would still be available?

### 5. Agree on the learning record

> Record the prediction, what happened, what you did, and what you learned.
> The goal is information and practice, not a passing grade or the disappearance of anxiety.
""",
        "Carry out one agreed low-risk experiment when a suitable opportunity occurs.",
        "Record the actual outcome, including neutral or adverse responses; no opportunity is not failure."
    ),
    (
        "07 — Self-criticism and global judgments",
        "Replace whole-person condemnation with accurate, specific evaluation.",
        r"""
## Main dialogue

### 1. Review learning and self-talk

> What happened with the action you chose?
> What did you learn?
> What did you say to yourself afterward?

### 2. Identify the exact judgment

> What were the actual words?
> Is that sentence describing an action, predicting something, or labeling your whole self?
> What does the label mean?
> What counts as evidence for it?
> What information gets ignored when it takes over?

### 3. Examine the standard

> What standard are you expecting yourself to meet?
> Is that standard achievable in ordinary life?
> How do you respond when someone you respect makes a similar mistake?
> What is different about the standard applied to you?
> We can begin with accuracy and fairness rather than forced positivity.

### 4. Develop specificity

> What happened in this situation, without the whole-person label?
> How would you describe the feeling, the behavior, and the next thing to work on?
> Does that description avoid needed accountability, or make accountability more precise?

### 5. Introduce optional younger-self perspective

> Would it be useful to consider whether you are applying an adult standard to a younger version of yourself?
> We do not need a new memory or an imagined scene to explore that.
> What would a fair standard take into account?

~ Do not impose the younger-self metaphor.
""",
        "Record one exact self-critical statement and a more specific, fair description.",
        "Record the client's actual belief and standard; do not insert a presumed childhood cause."
    ),
    (
        "08 — Self-respect and optional younger-self work",
        "Practice a constructive response to oneself; optionally use a newly imagined space.",
        r"""
## Main dialogue

### 1. Review the alternative description

> What happened when you described an event without labeling your whole self?
> Did the alternative feel more accurate, even if it was not comforting?
> Was there a concern that being less harsh would mean not trying?

### 2. Choose acceptable language

> What happens when you hear “self-compassion”?
> Would fairness, respect, steadiness, or constructive accountability fit better?
> What would a useful response need to include?

### 3. Work with an ordinary difficulty

> What are the facts?
> What circumstances influenced the event?
> Is there something to repair or change?
> What response would help you do that?

~ Develop three sentences: what happened; what was difficult without a global label; and a useful next step.

> How would those sentences sound in your own words?

### 4. Optional explicit younger-self component

> Would considering your younger self be useful, or would you prefer to stay with present-day conversation?
> We can use writing or an optional newly imagined space.
> There is no need to visualize, recover a memory, or produce a particular feeling.

~ Use module Y1 below only when clinically appropriate and chosen. It can be deferred or omitted without failure.

### 5. Translate into action

> What is one action that would reflect respect for yourself this week?
> What would make it practical rather than another standard to criticize yourself over?
""",
        "Use the three-sentence constructive response or one chosen action of self-respect; do not assign unsupervised memory-focused imagery.",
        "Record whether younger-self language was accepted, declined, or modified and any actual response to Y1."
    ),
    (
        "09 — Expressing needs and preferences",
        "Develop direct, personally natural communication in an appropriate relationship.",
        r"""
## Main dialogue

### 1. Identify a situation

> Where did you have an opportunity to treat your needs as relevant?
> Was there something you wanted to say but did not?
> What did you predict would happen?

### 2. Choose a low-risk target

> Choose an ordinary request or preference.
> We are not using this to test a dangerous relationship.
> What do you want the person to understand?
> What are you asking for?
> What part is yours to decide, and what part belongs to them?

### 3. Build wording

> We can state what happened, the need or preference, and the request.
> Use language you would actually say.
> What wording fits your relationship, culture, and usual way of speaking?

~ An optional neutral example: “When plans change at the last minute, it is difficult to rearrange my day. Please tell me earlier when possible.”

### 4. Role-play with consent

> Would you like me to play the other person?
> We can begin with an ordinary, receptive response.
> We will not recreate an abusive interaction.

~ Practice.

> What worked?
> What would you change?
> Would another straightforward attempt or a mildly hesitant response be useful?

### 5. Plan transfer

> Where is a suitable opportunity?
> What counts as completing the practice even if the answer is no?
> What will you do if the situation no longer seems appropriate?
""",
        "Make one agreed request or express one preference when an appropriate opportunity occurs.",
        "Do not require eye contact, a prescribed posture, or stereotyped gender performance."
    ),
    (
        "10 — Boundaries, criticism, and midpoint review",
        "Review treatment fit and practice maintaining a reasonable limit.",
        r"""
## Main dialogue

### 1. Review the practice and progress

> What happened when you expressed the request?
> How did you respond to yourself afterward?
> What has become more manageable in treatment?
> What has not changed?
> Is anything worse, or are we missing an important problem?

~ Review scheduled symptom and functioning measures and revise the plan when needed.

### 2. State a boundary

> Choose a situation where you need a limit.
> What is the limit in one sentence?
> Does “I need time to think before deciding” fit, or is another sentence needed?

### 3. Distinguish explaining from persuading

> Would an explanation help understanding, or are you trying to make disagreement impossible?
> What would it be like to clarify the limit while allowing the other person to dislike it?

~ Role-play an agreed mild response.

> Does your next sentence preserve the limit or withdraw it?

### 4. Examine criticism

> Is there a specific accurate point you can use?
> Is something unclear and worth asking about?
> Is the claim inaccurate or the delivery disrespectful?

~ Rehearse the relevant response: specific repair, clarification, or an appropriate limit.

> What response protects your self-respect while addressing the actual issue?

### 5. Notice the aftermath

> What feeling tends to appear after setting a limit?
> Does it identify something to repair, or appear even when the limit is reasonable?
> What would help you evaluate that rather than automatically undo the boundary?
""",
        "Practice one appropriate limit and observe both the interaction and the after-response.",
        "Complete a midpoint review of benefit, adverse effects, formulation, client preference, and treatment direction."
    ),
    (
        "11 — Graduated and specific trust",
        "Base trust decisions on the area of trust and observed behavior.",
        r"""
## Main dialogue

### 1. Review boundary information

> What did the practice tell you about the situation?
> What did it tell you about the other person?
> Did it change what you want to share, ask for, or protect?

### 2. Make trust specific

> What are you considering trusting this person with?
> Keeping an appointment, respecting a limit, handling private information, or responding to emotion?
> Could you trust them in one area and remain cautious in another?

### 3. Examine evidence

> What behavior supports trust in this area?
> What gives reason for caution?
> What do you genuinely not know?
> Is this one event, a pattern, or an expectation not yet tested?
> What level of trust fits the information rather than what you think you should give?

### 4. Choose a limited next step

> Would a small request, a low-stakes disclosure, or a clearer boundary provide useful information?
> What are you comfortable choosing?
> What would count as a respectful response?
> What would tell you to slow down or step back?

~ Prefer transparent communication rather than covert tests.

### 5. Include therapy

> You do not have to trust me completely because I am the therapist.
> What have I done that helps you judge whether this relationship is workable?
> What still needs attention?
""",
        "Try one transparent, limited trust-related action or simply record observed behavior when action is not appropriate.",
        "Avoid the target “trust everyone more”; document specific reliability, ambiguity, and warning signs."
    ),
    (
        "12 — Chosen vulnerability and repair",
        "Practice openness with boundaries and the possibility of disagreement.",
        r"""
## Main dialogue

### 1. Review the trust decision

> What did you choose?
> How did the person respond?
> What does that suggest about this relationship?
> What remains uncertain?

~ Acknowledge actual hurtful outcomes rather than immediately reframing them.

### 2. Clarify the purpose of sharing

> What are you hoping for when you share something personal?
> How much information is needed for that purpose?
> What do you prefer to keep private?

### 3. Rehearse the request

> Would it help to say what kind of response you need first?
> A possible sentence is, “Do you have time to listen? I mainly need understanding rather than a solution.”
> Another is, “I want to explain something, but I am not ready to discuss all the details.”
> Which wording fits?

### 4. Explore relevant identity expectations

> What messages have you received about being a man and needing support?
> Which fit the person you want to be?
> Which feel restrictive or inaccurate?
> How would you define strength here using your own values?

~ Do not assume identity, sexuality, culture, or the client's preferred understanding of masculinity.

### 5. Practice therapeutic repair

> Has there been a time here when you felt misunderstood or wanted to disagree but held back?
> What do you want more of, less of, or handled differently?

~ Use Branch R when indicated. Review whether the next treatment phase remains appropriate.
""",
        "Choose a bounded disclosure, a request for support, or a repair conversation only where appropriate.",
        "Document the client's definition of useful openness, not a requirement for maximum disclosure."
    ),
    (
        "13 — Trauma-related conclusions",
        "Examine one current meaning linked to an already-reported experience, when appropriate.",
        r"""
## Main dialogue

### 1. Confirm the focus

> We could examine one conclusion connected with an experience you have already described.
> A detailed retelling is not required for this discussion.
> Would that be useful today, or does a current concern need attention?

~ Use the chosen established treatment when indicated. This dialogue is not a replacement protocol.

### 2. Identify the meaning

> Which conclusion affects your life most now?
> Complete this in your words: “Because of what happened, I came to believe…”
> When does it appear most strongly?
> What does it lead you to do?
> What does it keep you from doing?

### 3. Separate experience and generalization

> What part describes the experience itself?
> What part becomes a claim about your whole self, everyone else, or every future situation?
> What makes the wider conclusion convincing?
> What information does it leave out?

~ Acknowledge actual harm.

> We are not trying to make what happened acceptable. We are examining what you have carried forward from it.

### 4. Develop an accurate alternative

> What could acknowledge the experience without the broadest conclusion?
> What wording is accurate enough to consider, even if it does not feel fully convincing yet?
> What would change in an ordinary situation if you acted from that understanding?

### 5. Agree on limited practice

> Notice when the old conclusion appears and record the more specific alternative.
> There is no assignment to search for additional memories.
> What reactions after today would need earlier attention?
""",
        "Observe the agreed belief in present-day situations; no additional memory search is assigned.",
        "Confirm the appropriateness of this focus, monitor after-effects, and record uncertainty rather than presumed historical details."
    ),
    (
        "14 — Responsibility, control, and hindsight",
        "Examine reported self-blame or present pressure to control outcomes.",
        r"""
## Main dialogue

### 1. Review the previous work

> How did the discussion affect you afterward?
> Was the alternative useful, unconvincing, upsetting, or mixed?
> Has the belief changed in any particular situation?

### 2. Identify the relevant issue

> Is there something you hold yourself responsible for that you want to examine?

~ Do not introduce self-blame when the client has not reported it.

> What exactly do you believe you should have done differently?
> What standard are you using?

~ When control, rather than self-blame, is central:

> What do you feel you must prevent or manage now?

### 3. Examine actual context

> What did you know at the time?
> What options were actually available?
> What limits existed on your power, resources, or access to help?
> What choices belonged to other people?
> Are you using information or abilities you have now but did not have then?
> What standard would you apply to someone in the same circumstances?

### 4. Distinguish wishing from responsibility

> What is the difference between wishing an outcome were different and having the ability to make it different?
> What is within your control now?
> What present responsibility would support your life rather than punish you?

### 5. Summarize and act

> How would you summarize this without excusing harm or condemning your whole self?
> What small action would be consistent with that understanding?
""",
        "Record one balanced responsibility statement and an appropriate present-day action.",
        "Stay with known information; do not fill gaps through imagery or impose a finding about responsibility."
    ),
    (
        "15 — Grief, anger, and unmet needs",
        "Make room for client-identified feelings and needs without forced catharsis or forgiveness.",
        r"""
## Main dialogue

### 1. Identify the actual feeling

> What feelings are present when you think about the meaning of those experiences now?
> There is no feeling you are supposed to produce.

~ When the client reports numbness or uncertainty:

> We can work with not knowing or not feeling much. We do not need to force an emotion.

### 2. Clarify letting go

> What do you hope would change?
> Is there anything you worry would be lost if the feelings became less dominant?
> Does letting go sound like forgetting, excusing, giving up on justice, or something else?
> What would a more acceptable goal sound like?

### 3. Put needs into words

> Would it help to use a short written or spoken reflection?
> You could begin, “I wish I had received…”
> Or, “What mattered to me was…”
> Or, “What I need in my life now is…”
> Choose one, change the wording, or leave these aside.
> What do you want me to understand?

~ This is not a letter to send automatically. Y1 may be revisited only if appropriate and chosen, not to intensify emotion.

### 4. Distinguish feeling and action

> What action does this feeling urge?
> What would that do immediately?
> What might it cost?
> What action would express the underlying need more effectively?
> You do not need to forgive anyone or resume contact to choose how to act now.

### 5. Plan present care

> What is one practical action that responds to the need?
> What would be too much right now?
""",
        "Choose one present act of care, support, advocacy, or protection. Do not assign confrontation or compulsory forgiveness.",
        "Record feelings the client actually identifies, chosen actions, and any sustained destabilization."
    ),
    (
        "16 — Present-day integration",
        "Apply revised understanding to ordinary situations and review remaining treatment needs.",
        r"""
## Main dialogue

### 1. Review without presuming success

> What has shifted?
> What has stayed the same?
> Has any part of our work been unhelpful or destabilizing?

~ Review relevant measures and functioning.

> How well do these results match your experience?

### 2. Update the pattern

> The familiar trigger is [client's example].
> The old conclusion is [client's words].
> The response is [reported action].
> What would you add or change now?

### 3. Apply the learning

> Choose a current situation where this understanding could matter.
> What does the old prediction say?
> What information is available now?
> What uncertainty remains?
> What action would you choose while allowing that uncertainty?

~ Rehearse a present-day action.

### 4. Prepare for an imperfect outcome

> Suppose the response is imperfect but not dangerous.
> How would you interpret it?
> What prevents one outcome becoming a judgment about your whole self?
> Would the next step be clarification, a boundary, another attempt, or stepping back?

### 5. Review treatment needs

> What still needs focused treatment?
> Should we continue, change the approach, or arrange additional care?
> Reaching this session number does not prove that trauma-related difficulties are resolved.
> What do you want your life to include beyond managing symptoms?
""",
        "Apply one revised understanding to an ordinary choice and record the result.",
        "Document remaining needs and whether the chosen treatment should continue, change, or be supplemented."
    ),
    (
        "17 — Identity and values",
        "Build a life organized around chosen values, not only symptom management.",
        r"""
## Main dialogue

### 1. Broaden attention

> What matters to you that has received too little attention while you have been managing these difficulties?
> What would you like your life to contain more of?

### 2. Identify chosen values

> What kind of friend, partner, colleague, family member, or person do you want to be?
> Which area matters most now?
> What qualities do you want to bring to it?
> Is this genuinely important to you or something you believe you should value?
> What would you choose without having to perform a particular version of confidence or masculinity?

### 3. Turn a value into action

> Choose one small action that expresses the value.
> What would it look like on a specific day?
> What time or energy would it require?
> Could you do it while still feeling some self-doubt?

> This is practice in what matters, not a test that proves you deserve respect.

### 4. Plan for obstacles

> What thought or feeling may get in the way?
> What familiar protective response may appear?
> How could you acknowledge it without automatically following it?
> What support makes the action more realistic?

### 5. Discuss transition

> What comes up when you think about appointments becoming less frequent or this phase ending?
> What needs to be in place for that transition to be workable?
""",
        "Complete one realistically sized values-consistent action.",
        "Record the client's own values and response to possible ending; do not assume termination is appropriate."
    ),
    (
        "18 — Comfort with oneself",
        "Clarify and practice the client's own meaning of feeling comfortable in their own skin.",
        r"""
## Main dialogue

### 1. Review participation

> What happened with the action linked to your values?
> What mattered about the attempt, regardless of confidence?
> What adjustment would make it sustainable?

### 2. Clarify the goal

> Does “comfortable in my own skin” mean something different now?
> Is the main difficulty about appearance, physical sensations, emotions, being seen, or something else?

~ Assess a distinct emerging concern rather than assuming the existing formulation explains it.

### 3. Practice participation without constant evaluation

> Would it help to practice an ordinary activity without evaluating yourself throughout?
> We can keep attention outside the body or include a neutral sensation only if comfortable.

~ Choose an ordinary conversation, interest, object, or preference.

> For the next moment, the task is simply to participate.
> When an evaluation appears, notice what it says.
> Then choose whether to return attention to the activity.

~ Brief practice.

> What did you notice?
> What helped participation?

### 4. Rehearse being seen without perfection

> Choose a situation where you want to be more present.
> What would participation look like?
> What does the internal critic ask you to monitor?
> What could you give attention to instead?
> What is a reasonable standard?
> What would be unnecessarily punishing?

### 5. Prepare the review

> What do you still need from treatment?
> What should not remain unspoken as we approach the end of this planned phase?
""",
        "Practice participation in one ordinary, chosen activity without making the outcome a test of worth.",
        "Assess body-image, medical, or dissociative concerns separately when indicated; do not force body-focused practice."
    ),
    (
        "19 — Outcomes and maintenance planning",
        "Review actual progress, unresolved needs, and a practical response to setbacks.",
        r"""
## Main dialogue

### 1. Compare with initial goals

> What has changed in everyday life?
> What changed less than you hoped?
> What is easier to do even when feelings remain?
> What has become more difficult?

~ Review relevant measures using consistent versions and reporting periods.

### 2. Decide the next phase

> Which parts were most useful?
> Which were less useful?
> What have we not understood well enough?
> Does it make sense to end this phase, extend it for a defined purpose, or arrange another form of care?

### 3. Build a practical plan

> What helps when things are going reasonably well?
> What are the early signs that difficulties are increasing?
> What response fits at that stage?
> What signs mean professional help is needed sooner?
> Who will do what, and how can they be reached?

### 4. Practice asking for help

> Would it help to rehearse a message?
> One possible structure is, “I have noticed [change], it is affecting [functioning], and I would like a review.”
> What would you actually say?
> What tends to stop you making contact?
> How can we address that obstacle?

### 5. Prepare the transition appointment

> What would you like our next meeting to include?
> What would make an ending or transition respectful rather than abrupt?
""",
        "Review the written maintenance plan and identify any practical obstacle or missing contact arrangement.",
        "Update safety planning when indicated; make the ending, extension, or referral decision explicit."
    ),
    (
        "20 — Consolidation and agreed transition",
        "Complete a collaborative phase review and establish actual continuing-care arrangements.",
        r"""
## Main dialogue

### 1. State the purpose accurately

> Today is the final scheduled appointment in this phase unless our review identifies a reason to change the plan.
> Let's look at what you are taking forward, what still needs attention, and what happens next.
> What is most important to you today?

### 2. Let the client describe the learning

> How would you describe the difficulties you came with now?
> What understanding is useful?
> What have you learned about your needs, limits, and choices?
> What do you understand differently about trust?
> What description of your worth is more accurate than the harshest judgments you brought here?

~ Accept mixed, uncertain, or unfinished answers.

### 3. Rehearse a likely situation

> What may trigger the familiar response?
> What would you notice first?
> What would you say to yourself?
> What action fits your values and the actual circumstances?
> What would tell you to seek support?

~ Rehearse and revise.

### 4. Confirm continuing care

> Which difficulties need further treatment?
> What are we doing about them?
> The next contact is [actual arrangement].
> The non-urgent route is [actual service route and response expectation].
> The urgent plan is [actual local pathway].
> What might make these arrangements hard to use?

### 5. Feedback and ending

> What do you want me to understand about how this work has been for you?
> What was helpful?
> What did I miss or need to handle differently?
> What feelings are present about ending or changing frequency?
> There is no particular feeling you need to have.

~ Acknowledge specific efforts actually made, not invented improvement.

> You have worked on [actual efforts].
> The next phase is about continuing what is useful, recognizing what needs attention, and seeking help when needed.
> Is there anything important you have not had the opportunity to say?
""",
        "Use the agreed maintenance and continuing-care plan. Additional appointments are a clinical decision, not a failure of the twenty-session framework.",
        "Complete the outcome and handoff record. Use the actual transition arrangement in the closing; do not imply another routine appointment exists."
    ),
]

WORKSHEETS = [
    ("W01 — Trigger, meaning, and response", [
        "Situation: observable events, separated from assumptions",
        "Meaning or prediction",
        "Feelings and bodily responses",
        "Urge and actual action",
        "Immediate effect",
        "Longer-term effect",
        "Current danger, uncertainty, or missing information",
        "Alternative interpretation or practical response",
        "Chosen next action and result"
    ]),
    ("W02 — Behavioral experiment", [
        "Reason for the experiment and value it serves",
        "Specific prediction",
        "Chosen action and appropriate context",
        "Actual-safety considerations",
        "What would count as an observable outcome",
        "What would remain ambiguous",
        "Actual outcome",
        "What I did in response",
        "What I learned and what remains uncertain"
    ]),
    ("W03 — Fair self-evaluation", [
        "Exact self-critical words",
        "Specific event or behavior",
        "Standard I applied to myself",
        "Relevant context and information",
        "Standard I would apply fairly to another person",
        "Any repair or accountability needed",
        "More accurate description",
        "Constructive next step"
    ]),
    ("W04 — Request or boundary practice", [
        "Situation and relevant relationship",
        "Actual safety considerations",
        "What I want understood",
        "Request, preference, or limit in my own words",
        "What is within my control",
        "Likely response and how I can respond",
        "Actual outcome",
        "After-feelings and whether any repair is needed"
    ]),
    ("W05 — Graduated trust", [
        "Person and specific area of trust",
        "Observed reliable behavior",
        "Observed concerning behavior",
        "What remains unknown",
        "Appropriate level of trust now",
        "Transparent next step, if any",
        "What would support greater trust",
        "What would lead me to slow down or step back"
    ]),
    ("W06 — Younger-self reflection", [
        "Preferred language for this exercise",
        "Present-day goal",
        "What I already know and what remains uncertain",
        "Need or feeling I choose to consider",
        "A supportive response that feels accurate",
        "Words or images that do not fit",
        "A present-day action I choose",
        "Helpful, neutral, or unwanted effects",
        "What I want changed before any future exercise"
    ]),
    ("W07 — Values and participation", [
        "Life area",
        "Value in my own words",
        "Small observable action",
        "When and where",
        "Likely barriers",
        "Support or smaller alternative",
        "Actual attempt and learning",
        "Next adjustment"
    ]),
    ("W08 — Maintaining progress", [
        "Practices useful when life is going reasonably well",
        "Early signs of increasing difficulty",
        "First practical responses",
        "People and services I can contact",
        "Specific professional-review triggers",
        "Urgent-response plan",
        "Barriers to using the plan and solutions",
        "Where I will keep the plan",
        "Review date and actual next appointment or handoff"
    ]),
]

CLINICIAN_FORMS = [
    ("F01 — Administrative and clinical cover sheet", [
        "Client identifier; confirmed age; preferred name and pronouns",
        "Date; clinician; credentials; supervisor",
        "Appointment type and delivery setting",
        "Language and accessibility requirements",
        "Current treating professionals and consent to coordinate",
        "Emergency contact and agreed limits",
        "For remote care: actual location, callback, privacy, and connection-failure plan",
        "Local urgent mental-health and medical pathways",
        "Client's priorities and procedure preferences"
    ]),
    ("F02 — Shared formulation and goals", [
        "Client's goals in their own words",
        "Observable baseline and desired change for each goal",
        "Known facts",
        "Tentative hypotheses",
        "Alternative explanations and current environmental concerns",
        "Strengths, previous treatment gains, and supports",
        "Treatment options discussed",
        "Client preference and informed choice",
        "Selected approach and rationale",
        "Review date"
    ]),
    ("F03 — Instrument administration register", [
        "Instrument and exact version",
        "Language and reporting period",
        "Date administered",
        "Authorized form and scoring key location",
        "Permission or access requirements checked",
        "Completeness and official missing-item handling",
        "Total and relevant item-level findings",
        "Clinical interpretation, not just cutoff",
        "Action, responsible clinician, and follow-up"
    ]),
    ("F04 — Safety-screen follow-up and disposition", [
        "Screening instrument, version, and exact result",
        "Client's current concerns in their own words",
        "Current thoughts, intent, behavior, and recent changes",
        "Self-injury: suicidal, non-suicidal, mixed, or uncertain intent",
        "Relevant symptoms, stressors, substances, and medical needs",
        "Access to dangerous means and practical arrangements",
        "Available supports, reasons for living, and barriers to help",
        "Consultation obtained",
        "Disposition and rationale",
        "Follow-up owner, date/time, and failed-contact contingency"
    ]),
    ("F05 — Unscored readiness and procedure decision", [
        "Proposed intervention and actual clinical target",
        "Immediate safety: A / S / U / N and evidence",
        "Informed choice: A / S / U / N and evidence",
        "Orientation and communication: A / S / U / N and evidence",
        "Emotional participation and dissociation: A / S / U / N and evidence",
        "Substance, medical, and environmental considerations",
        "Required supports or adaptations",
        "Competence, supervision, and treatment fit",
        "Action category selected and rationale",
        "What would change the decision"
    ]),
    ("F06 — Hypnosis and imagery consent discussion", [
        "Purpose and expected role in the treatment",
        "Alternatives and evidence limitations discussed",
        "Possible unwanted experiences and response plan",
        "Client's questions and preferences",
        "Ability to pause, decline, or change the procedure",
        "Understanding that imagery does not verify history",
        "Eye position, proximity, and touch preferences",
        "Separate recording consent, if relevant",
        "Teach-back responses",
        "Decision: agrees / declines / undecided"
    ]),
    ("F07 — Pre-session monitoring", [
        "Important events since last contact",
        "Safety and self-harm changes",
        "Current relational or environmental danger",
        "Sleep and change from usual pattern",
        "Substance effects, medication, and health changes",
        "Disconnection, time loss, or confusion",
        "Effects after the previous session",
        "Current distress and connection, words or optional ratings",
        "Functioning and today's priority",
        "Measures due; action category; agreed plan"
    ]),
    ("F08 — Post-session review", [
        "Intervention actually delivered",
        "Target and client understanding",
        "Client report and clinician observations, separately",
        "Orientation, participation, distress, and new concerns",
        "Helpful, neutral, or unwanted effects",
        "Feedback and repairs made",
        "Chosen practice and support arrangements",
        "Immediate activities and transport considerations",
        "Follow-up and earlier-contact plan",
        "Disposition and rationale"
    ]),
    ("F09 — Unfamiliar image or memory-event record", [
        "Procedure underway and preceding clinician prompt",
        "Client's spontaneous words, clearly labeled as quotation",
        "Client's description: image, sensation, thought, familiar memory, possible memory, or uncertain",
        "Reported previous awareness of the material",
        "Client's expressed uncertainty",
        "Observed orientation, distress, and current safety",
        "Response provided and actual effect",
        "Independent information, if any, with its source",
        "Consultation or safeguarding consideration",
        "Next steps without a claim of historical verification"
    ]),
    ("F10 — Collaborative safety-plan worksheet", [
        "My early warning signs",
        "Personal coping actions I can try",
        "People or places that reduce isolation",
        "People I can tell directly that I need help",
        "Professional and crisis contacts with actual details",
        "Practical means-safety arrangements",
        "Barriers to using the plan",
        "How those barriers will be addressed",
        "Who has agreed to do what",
        "Where the plan is kept and when it will be reviewed"
    ]),
    ("F11 — Progress and treatment-review record", [
        "Measures, dates, reporting periods, baseline, current, and change",
        "Client-defined behavioral outcomes",
        "Daily functioning",
        "Client experience of the treatment",
        "Adverse effects or sustained deterioration",
        "Attendance and practice barriers without inferred motives",
        "Formulation and treatment-fit review",
        "Decision to continue, modify, extend, or refer",
        "Responsible clinician and review date"
    ]),
    ("F12 — Supervision and referral", [
        "Reason for consultation",
        "Relevant facts and explicit uncertainties",
        "Current safety and time-sensitive needs",
        "Scope or competence question",
        "Client consent and information-sharing considerations",
        "Advice received and by whom",
        "Action agreed and responsible person",
        "Referral acceptance or handoff confirmation",
        "Interim care and contingency",
        "Follow-up date"
    ]),
    ("F13 — Phase completion or transfer", [
        "Original goals and actual outcomes",
        "Relevant measures and functioning",
        "Useful interventions and client preferences",
        "Unresolved concerns and further assessment needs",
        "Current care and safety arrangements",
        "Maintenance plan reviewed",
        "Client feedback on the relationship and process",
        "Ending, extension, booster, or transfer decision",
        "Actual receiving service or next contact",
        "Handoff confirmation and contingency"
    ]),
]

IMPLEMENTATION = r"""
# 9. Measurement dashboard and implementation review

## 9.1 Longitudinal dashboard

Use one row per administration. Keep the exact measure and reporting period visible. Store critical safety findings and disposition separately.

| Date / session | Measure and version | Score and change | Functioning, interpretation, and action |
|---|---|---|---|
| __________________ | __________________ | __________________ | __________________ |
| __________________ | __________________ | __________________ | __________________ |
| __________________ | __________________ | __________________ | __________________ |
| __________________ | __________________ | __________________ | __________________ |
| __________________ | __________________ | __________________ | __________________ |

For a behavioral practice rate, the proposed descriptive calculation is: completed agreed attempts divided by relevant appropriate opportunities, multiplied by 100. Do not penalize the client when no suitable opportunity occurred. This is an original progress measure, not a standardized scale.

## 9.2 Review triggers

Initiate review for a new safety concern, sustained symptom deterioration, worsening function, unexplained disconnection, repeated prolonged after-effects, a mismatch between scores and lived experience, little benefit despite engagement, or the client's wish to change the approach.

A review does not automatically mean stopping all therapy. It means investigating the cause and choosing a justified next step. Consider formulation, current circumstances, treatment fit, fidelity to a selected protocol, other conditions, practical barriers, and client preference.

## 9.3 Service implementation checklist

| Requirement | Verified by / date |
|---|---|
| Responsible licensed clinician and supervision arrangements confirmed | __________________ |
| Exact instrument versions, scoring keys, and permitted uses obtained | __________________ |
| Suicide screening and urgent-response pathway approved | __________________ |
| Current local safeguarding and reporting procedures reviewed | __________________ |
| Electronic-submission monitoring and response limits defined | __________________ |
| Privacy and sensitive-record handling reviewed | __________________ |
| Hypnosis and imagery consent wording approved | __________________ |
| Medical, psychiatric, substance-use, and specialist referral arrangements available | __________________ |
| Adverse effects and nonresponse review process established | __________________ |
| Document formatting, table of contents, and forms visually checked | __________________ |

## 9.4 Source-access limitations

The core VA assessment pages, the ASQ form, NIMH follow-up guidance, the PTSD guideline, the APA memory statement, and selected research were available for review during this consolidation.

The current NICE recommendations page and the WHO ASSIST manual download were blocked during retrieval. Some optional instrument-owner pages were also unavailable. Those items are identified in the reference register and require local verification before operational use. Their appearance in the register is not a claim that their full current content was retrieved.

No blanket licensing conclusion is made for the instrument battery. No new clinical data about TM-002 were obtained through this consolidation.

## 9.5 Final use reminder

This is a planning and documentation resource. Its typography, completeness, or length does not establish validity or clinical suitability.

The central outcome is a collaborative, documented decision and improved real-world functioning—not completing every script, producing a trance, recovering a memory, or obtaining a numerical declaration of safety.
"""

REFERENCES: List[Tuple[str, str, str, str]] = [
    ("C0", "Original client case statement supplied in this conversation.",
     "", "Client-reported material relayed by the user; not independently assessed."),
    ("C1", "Prior collaboratively developed assessment protocol and twenty-session scripts.",
     "", "Original planning drafts; not independently validated treatment manuals."),
    ("U1", "Pasted text.txt — HMI presentation descriptions and commentary.",
     "", "User-supplied source. Contains interpretations and proposed case applications; not a transcript of all instructors."),
    ("U2", "Pasted text (2).txt — timestamped teaching transcript.",
     "", "User-supplied source. Substantial transcription errors; uncertain passages remain uncertain."),
    ("R01", "VA National Center for PTSD. Overview of Psychotherapy for PTSD.",
     "https://www.ptsd.va.gov/professional/treat/txessentials/overview_therapy.asp",
     "Official treatment overview; consulted 6 October 2026."),
    ("R02", "VA/DoD Clinical Practice Guideline for Management of PTSD and Acute Stress Disorder, 2023; posted edited PDF.",
     "https://www.healthquality.va.gov/guidelines/MH/ptsd/VA-DoD-CPG-PTSD-Full-CPG-Edited-111624-V5-81825.pdf",
     "Recommendations 8, 10, 11, 27, and 34 are particularly relevant. Guideline date is 2023, not 2026."),
    ("R03", "NIMH. Ask Suicide-Screening Questions: screening tool for youth and adults.",
     "https://www.nimh.nih.gov/sites/default/files/documents/research/research-conducted-at-nimh/asq-toolkit-materials/asq-tool/screening-tool-asq-nimh-toolkit.pdf",
     "Retrieved form dated 29 September 2025. Obtain the current form before implementation."),
    ("R04", "NIMH. Adult Outpatient Brief Suicide Safety Assessment Guide.",
     "https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials/adult-outpatient/adult-outpatient-brief-suicide-safety-assessment-guide",
     "Official follow-up and disposition guidance; use a local approved pathway."),
    ("R05", "VA National Center for PTSD. PTSD Checklist for DSM-5 (PCL-5).",
     "https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp",
     "Official scoring, interpretation, availability, and change guidance."),
    ("R06", "VA National Center for PTSD. Dissociative Symptoms Scale and DSS-B.",
     "https://www.ptsd.va.gov/professional/assessment/adult-sr/dss.asp",
     "Official scoring and discussion of limitations concerning cut points."),
    ("R07", "VA National Center for PTSD. Life Events Checklist for DSM-5.",
     "https://www.ptsd.va.gov/professional/assessment/te-measures/life_events_checklist.asp",
     "Official administration and no-total-score guidance."),
    ("R08", "University of Washington, National HIV Curriculum. PHQ-9.",
     "https://www.hiv.uw.edu/page/mental-health-screening/phq-9",
     "Academic clinical instrument page and scoring bands."),
    ("R09", "University of Washington, National HIV Curriculum. GAD-7.",
     "https://www.hiv.uw.edu/page/mental-health-screening/gad-7",
     "Academic clinical instrument page."),
    ("R10", "World Health Organization. ASSIST: Manual for Use in Primary Care, 2010.",
     "https://www.who.int/publications/i/item/978924159938-2",
     "Publication page verified; manual download blocked during consolidation. Obtain and cross-check the official key locally."),
    ("R11", "World Health Organization. WHODAS 2.0.",
     "https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health/who-disability-assessment-schedule",
     "Official coding and scoring-method distinctions."),
    ("R12", "Morin CM, Belleville G, Bélanger L, Ivers H. The Insomnia Severity Index: Psychometric Indicators to Detect Insomnia Cases and Evaluate Treatment Response. Sleep. 2011;34:601–608.",
     "https://pmc.ncbi.nlm.nih.gov/articles/PMC3079939/",
     "Primary instrument research. Obtain the authorized current instrument separately."),
    ("R13", "Panic Disorder Severity Scale—Self Report Form and scoring sheet hosted by McGill University.",
     "https://www.mcgill.ca/psy/files/psy/pdss.pdf",
     "The form describes both raw sum and average composite; permissions are stated on the source form."),
    ("R14", "American Psychiatric Association. Position Statement on Therapies Focused on Memories of Childhood Physical and Sexual Abuse.",
     "https://www.psychiatry.org/getattachment/930fb215-2147-40e9-9d44-f06d84fc64de/Position-2013-Memories-Child-Abuse.pdf",
     "Approved 2000; reaffirmed 2013. Professional position statement, not a 2026 research study."),
    ("R15", "van Vliet and colleagues. Phase-based treatment versus immediate trauma-focused treatment for PTSD due to childhood abuse: randomized clinical trial, 2021.",
     "https://research.vu.nl/en/publications/phase-based-treatment-versus-immediate-trauma-focused-treatment-f/",
     "Primary trial; do not generalize beyond its design and population."),
    ("R16", "Boterhoven de Haan and colleagues. Imagery rescripting and EMDR for adults with PTSD from childhood trauma: randomized clinical trial, 2020.",
     "https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/imagery-rescripting-and-eye-movement-desensitisation-and-reprocessing-as-treatment-for-adults-with-posttraumatic-stress-disorder-from-childhood-trauma-randomised-clinical-trial/A97132EE142BA88DA207E8CCB0044475",
     "Primary trial involving 155 participants; evidence for the studied treatments, not every inner-child exercise."),
    ("R17", "VA National Center for PTSD. Treatment of Co-Occurring PTSD and Substance Use Disorder.",
     "https://www.ptsd.va.gov/professional/treat/cooccurring/tx_sud_va.asp",
     "Official clinical overview."),
    ("R18", "Hypnosis Motivation Institute. Introduction to Hypnotic Suggestibility.",
     "https://hypnosis.edu/sq/",
     "Primary description of HMI's framework; not validation of a trauma-readiness rule."),
    ("R19", "NIMH. ASQ Toolkit.",
     "https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials",
     "Official implementation and resource guidance."),
    ("R20", "NICE. Self-harm: assessment, management and preventing recurrence. NG225.",
     "https://www.nice.org.uk/guidance/ng225/chapter/Recommendations",
     "Reference carried forward from the earlier protocol. Current recommendations page was blocked during this consolidation; verify locally before adopting service policy.")
]


# ---------------------------------------------------------------------
# MINIMAL, EDITABLE WORD DOCUMENT GENERATOR
# ---------------------------------------------------------------------

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
PAGE_WIDTH = 12240       # US Letter, twips
PAGE_HEIGHT = 15840
MARGIN = 1080            # 0.75 inch
CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

def x(value: object) -> str:
    return escape(str(value))

def run(text: str, bold: bool = False) -> str:
    prop = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return f'<w:r>{prop}<w:t xml:space="preserve">{x(text)}</w:t></w:r>'

def rich_runs(text: str) -> str:
    parts = re.split(r"(\*\*.*?\*\*)", text)
    result = []
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            result.append(run(part[2:-2], bold=True))
        else:
            result.append(run(part))
    return "".join(result)

def paragraph(text: str = "", style: str = "Normal",
              extra_props: str = "") -> str:
    return (
        f'<w:p><w:pPr><w:pStyle w:val="{x(style)}"/>'
        f'{extra_props}</w:pPr>{rich_runs(text)}</w:p>'
    )

def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

def field(instruction: str, cached_text: str = "") -> str:
    return (
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        f'<w:r><w:instrText xml:space="preserve">{x(instruction)}</w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        f'{run(cached_text)}'
        '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    )

def make_style(style_id: str, name: str, size: int = 22,
               color: str = "243447", bold: bool = False,
               italic: bool = False, ppr: str = "",
               based_on: str = "Normal") -> str:
    base = "" if style_id == "Normal" else f'<w:basedOn w:val="{based_on}"/>'
    default = ' w:default="1"' if style_id == "Normal" else ""
    rp = (
        '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
        f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
        f'<w:color w:val="{color}"/>'
        + ("<w:b/>" if bold else "")
        + ("<w:i/>" if italic else "")
    )
    return (
        f'<w:style w:type="paragraph" w:styleId="{style_id}"{default}>'
        f'<w:name w:val="{name}"/>{base}<w:qFormat/>'
        f'<w:pPr>{ppr}</w:pPr><w:rPr>{rp}</w:rPr></w:style>'
    )

def styles_xml() -> str:
    styles = [
        make_style("Normal", "Normal", ppr=(
            '<w:widowControl/><w:spacing w:after="100" '
            'w:line="276" w:lineRule="auto"/>'
        )),
        make_style("CoverTitle", "Cover Title", 58, "17324D", True,
                   ppr='<w:spacing w:before="900" w:after="260"/><w:keepNext/>'),
        make_style("CoverSubtitle", "Cover Subtitle", 30, "187A87",
                   ppr='<w:spacing w:after="300"/><w:keepNext/>'),
        make_style("CoverLabel", "Cover Label", 20, "526778", True,
                   ppr='<w:spacing w:before="200" w:after="140"/>'),
        make_style("Heading1", "heading 1", 36, "17324D", True,
                   ppr=(
                       '<w:keepNext/><w:keepLines/><w:pageBreakBefore/>'
                       '<w:spacing w:before="0" w:after="200"/>'
                       '<w:outlineLvl w:val="0"/>'
                   )),
        make_style("Heading2", "heading 2", 27, "187A87", True,
                   ppr=(
                       '<w:keepNext/><w:keepLines/>'
                       '<w:spacing w:before="220" w:after="100"/>'
                       '<w:outlineLvl w:val="1"/>'
                   )),
        make_style("Heading3", "heading 3", 23, "17324D", True,
                   ppr=(
                       '<w:keepNext/><w:keepLines/>'
                       '<w:spacing w:before="160" w:after="70"/>'
                       '<w:outlineLvl w:val="2"/>'
                   )),
        make_style("ContentsTitle", "Contents Title", 36, "17324D", True,
                   ppr='<w:keepNext/><w:spacing w:after="200"/>'),
        make_style("Spoken", "Therapist Spoken Dialogue", 22, "243447",
                   ppr='<w:ind w:left="180"/><w:spacing w:after="85"/>'),
        make_style("Stage", "Clinical Stage Direction", 20, "657687",
                   italic=True,
                   ppr='<w:spacing w:before="70" w:after="90"/>'),
        make_style("Alert", "Clinical Caution", 21, "793D12",
                   ppr=(
                       '<w:spacing w:before="120" w:after="140"/>'
                       '<w:shd w:val="clear" w:fill="FFF2DF"/>'
                       '<w:pBdr><w:left w:val="single" w:sz="20" '
                       'w:space="8" w:color="C47B28"/></w:pBdr>'
                   )),
        make_style("TableText", "Table Text", 20, "243447",
                   ppr='<w:spacing w:after="40" w:line="240" w:lineRule="auto"/>'),
        make_style("TableHead", "Table Header", 20, "FFFFFF", True,
                   ppr='<w:spacing w:after="40" w:line="240" w:lineRule="auto"/>'),
        make_style("Small", "Small Reference Text", 19, "526778",
                   ppr='<w:spacing w:after="90"/>'),
        make_style("Header", "Header", 18, "526778",
                   ppr='<w:spacing w:after="0"/>'),
        make_style("Footer", "Footer", 18, "526778",
                   ppr='<w:jc w:val="right"/><w:spacing w:after="0"/>'),
    ]
    return XML_DECL + f'<w:styles xmlns:w="{W}">' + "".join(styles) + "</w:styles>"

class Handbook:
    def __init__(self) -> None:
        self.body: List[str] = []
        self.web_relationships: List[Tuple[str, str]] = []

    def p(self, text: str = "", style: str = "Normal") -> None:
        self.body.append(paragraph(text, style))

    def heading(self, text: str, level: int = 1) -> None:
        self.p(text, f"Heading{level}")

    def table(self, rows: Sequence[Sequence[str]],
              widths: Sequence[int] | None = None,
              minimum_row_height: int | None = None) -> None:
        if not rows:
            return
        n = len(rows[0])
        if any(len(row) != n for row in rows):
            raise ValueError("Table rows have inconsistent column counts.")
        if widths is None:
            base = CONTENT_WIDTH // n
            widths = [base] * n
            widths = list(widths)
            widths[-1] += CONTENT_WIDTH - sum(widths)
        if len(widths) != n or sum(widths) != CONTENT_WIDTH:
            raise ValueError("Invalid table widths.")

        parts = [
            '<w:tbl><w:tblPr>',
            f'<w:tblW w:w="{CONTENT_WIDTH}" w:type="dxa"/>',
            '<w:tblLayout w:type="fixed"/>',
            '<w:tblBorders>',
            '<w:top w:val="single" w:sz="4" w:color="D8E1E8"/>',
            '<w:left w:val="single" w:sz="4" w:color="D8E1E8"/>',
            '<w:bottom w:val="single" w:sz="4" w:color="D8E1E8"/>',
            '<w:right w:val="single" w:sz="4" w:color="D8E1E8"/>',
            '<w:insideH w:val="single" w:sz="4" w:color="D8E1E8"/>',
            '<w:insideV w:val="single" w:sz="4" w:color="D8E1E8"/>',
            '</w:tblBorders>',
            '<w:tblCellMar><w:top w:w="100" w:type="dxa"/>',
            '<w:left w:w="110" w:type="dxa"/>',
            '<w:bottom w:w="100" w:type="dxa"/>',
            '<w:right w:w="110" w:type="dxa"/></w:tblCellMar>',
            '</w:tblPr><w:tblGrid>',
        ]
        parts.extend(f'<w:gridCol w:w="{width}"/>' for width in widths)
        parts.append("</w:tblGrid>")

        for index, row in enumerate(rows):
            props = "<w:cantSplit/>"
            if index == 0:
                props += "<w:tblHeader/>"
            elif minimum_row_height:
                props += (
                    f'<w:trHeight w:val="{minimum_row_height}" w:hRule="atLeast"/>'
                )
            parts.append(f"<w:tr><w:trPr>{props}</w:trPr>")
            fill = "17324D" if index == 0 else ("F2F6F9" if index % 2 else "FFFFFF")
            style = "TableHead" if index == 0 else "TableText"
            for width, cell in zip(widths, row):
                parts.append(
                    f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>'
                    f'<w:shd w:val="clear" w:fill="{fill}"/>'
                    '<w:vAlign w:val="top"/></w:tcPr>'
                    + paragraph(cell, style)
                    + "</w:tc>"
                )
            parts.append("</w:tr>")
        parts.append("</w:tbl>")
        self.body.append("".join(parts))
        self.p("")

    def render(self, text: str) -> None:
        lines = text.strip().splitlines()
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            if line.startswith("|"):
                rows: List[List[str]] = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                    if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                        rows.append(cells)
                    i += 1
                self.table(rows)
                continue
            if line.startswith("### "):
                self.heading(line[4:], 3)
            elif line.startswith("## "):
                self.heading(line[3:], 2)
            elif line.startswith("# "):
                self.heading(line[2:], 1)
            elif line.startswith("> "):
                self.p("“" + line[2:] + "”", "Spoken")
            elif line.startswith("~ "):
                self.p("[" + line[2:] + "]", "Stage")
            elif line.startswith("! "):
                self.p(line[2:], "Alert")
            else:
                self.p(line)
            i += 1

    def add_link(self, label: str, url: str) -> None:
        rid = f"rIdWeb{len(self.web_relationships) + 1}"
        self.web_relationships.append((rid, url))
        self.body.append(
            '<w:p><w:pPr><w:pStyle w:val="Small"/></w:pPr>'
            f'<w:hyperlink r:id="{rid}" w:history="1">'
            '<w:r><w:rPr><w:color w:val="187A87"/>'
            '<w:u w:val="single"/></w:rPr>'
            f'<w:t xml:space="preserve">{x(label)}</w:t></w:r>'
            '</w:hyperlink></w:p>'
        )

    def add_form(self, title: str, labels: Sequence[str]) -> None:
        self.heading(title)
        self.p(
            "Original working form—not a validated scale. "
            "Client ID: __________  Date: __________  Clinician: __________",
            "Small"
        )
        rows = [("Field", "Record actual information")]
        rows.extend((label, "") for label in labels)
        self.table(rows, widths=[3600, CONTENT_WIDTH - 3600],
                   minimum_row_height=620)

    def package(self) -> dict:
        section = (
            '<w:sectPr>'
            '<w:headerReference w:type="default" r:id="rIdHeader"/>'
            '<w:footerReference w:type="default" r:id="rIdFooter"/>'
            '<w:headerReference w:type="first" r:id="rIdFirstHeader"/>'
            '<w:footerReference w:type="first" r:id="rIdFirstFooter"/>'
            f'<w:pgSz w:w="{PAGE_WIDTH}" w:h="{PAGE_HEIGHT}"/>'
            f'<w:pgMar w:top="{MARGIN}" w:right="{MARGIN}" '
            f'w:bottom="{MARGIN}" w:left="{MARGIN}" '
            'w:header="420" w:footer="420" w:gutter="0"/>'
            '<w:titlePg/>'
            '</w:sectPr>'
        )
        document = (
            XML_DECL
            + f'<w:document xmlns:w="{W}" xmlns:r="{R}"><w:body>'
            + "".join(self.body) + section
            + "</w:body></w:document>"
        )
        relationships = [
            ("rIdStyles", f"{R}/styles", "styles.xml", False),
            ("rIdSettings", f"{R}/settings", "settings.xml", False),
            ("rIdHeader", f"{R}/header", "header1.xml", False),
            ("rIdFooter", f"{R}/footer", "footer1.xml", False),
            ("rIdFirstHeader", f"{R}/header", "header2.xml", False),
            ("rIdFirstFooter", f"{R}/footer", "footer2.xml", False),
        ]
        relationships.extend(
            (rid, f"{R}/hyperlink", url, True)
            for rid, url in self.web_relationships
        )
        document_rels = XML_DECL + f'<Relationships xmlns="{PKG}">'
        for rid, kind, target, external in relationships:
            mode = ' TargetMode="External"' if external else ""
            document_rels += (
                f'<Relationship Id={quoteattr(rid)} Type={quoteattr(kind)} '
                f'Target={quoteattr(target)}{mode}/>'
            )
        document_rels += "</Relationships>"

        content_types = XML_DECL + (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
            '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
            '<Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
            '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
            '<Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            '</Types>'
        )
        root_rels = XML_DECL + (
            f'<Relationships xmlns="{PKG}">'
            f'<Relationship Id="rId1" Type="{R}/officeDocument" Target="word/document.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            f'<Relationship Id="rId3" Type="{R}/extended-properties" Target="docProps/app.xml"/>'
            '</Relationships>'
        )
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        core = XML_DECL + (
            '<cp:coreProperties '
            'xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" '
            'xmlns:dcterms="http://purl.org/dc/terms/" '
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            f'<dc:title>{x(TITLE)} — {x(CASE_ID)}</dc:title>'
            '<dc:subject>Clinical planning draft; licensed review required</dc:subject>'
            '<dc:creator>AI-assisted editorial consolidation</dc:creator>'
            '<cp:lastModifiedBy>Document generator</cp:lastModifiedBy>'
            f'<cp:version>{x(VERSION)}</cp:version>'
            f'<dcterms:created xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:created>'
            f'<dcterms:modified xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:modified>'
            '</cp:coreProperties>'
        )
        app = XML_DECL + (
            '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
            '<Application>TM-002 handbook generator</Application>'
            '<AppVersion>1.0</AppVersion>'
            '</Properties>'
        )
        header = XML_DECL + f'<w:hdr xmlns:w="{W}">' + paragraph(
            f"{CASE_ID}  |  MASTER THERAPEUTIC HANDBOOK  |  CLINICAL PLANNING DRAFT",
            "Header"
        ) + "</w:hdr>"
        footer = (
            XML_DECL + f'<w:ftr xmlns:w="{W}"><w:p>'
            '<w:pPr><w:pStyle w:val="Footer"/></w:pPr>'
            + run("Confidential case planning  •  Page ")
            + field(" PAGE ", "1")
            + run(" of ")
            + field(" NUMPAGES ", "1")
            + "</w:p></w:ftr>"
        )
        settings = XML_DECL + (
            f'<w:settings xmlns:w="{W}">'
            '<w:updateFields w:val="true"/>'
            '<w:defaultTabStop w:val="720"/>'
            '</w:settings>'
        )
        return {
            "[Content_Types].xml": content_types,
            "_rels/.rels": root_rels,
            "docProps/core.xml": core,
            "docProps/app.xml": app,
            "word/document.xml": document,
            "word/styles.xml": styles_xml(),
            "word/settings.xml": settings,
            "word/header1.xml": header,
            "word/footer1.xml": footer,
            "word/header2.xml": XML_DECL + f'<w:hdr xmlns:w="{W}"><w:p/></w:hdr>',
            "word/footer2.xml": XML_DECL + f'<w:ftr xmlns:w="{W}"><w:p/></w:ftr>',
            "word/_rels/document.xml.rels": document_rels,
        }

    def save(self, output: Path, overwrite: bool = False) -> None:
        output = output.expanduser().resolve()
        if output.suffix.lower() != ".docx":
            raise ValueError("Output filename must end in .docx.")
        if output.exists() and not overwrite:
            raise FileExistsError(
                f"{output} already exists. Use --overwrite to replace it."
            )
        output.parent.mkdir(parents=True, exist_ok=True)
        parts = self.package()

        # Validate every XML part before writing.
        for name, xml in parts.items():
            try:
                ElementTree.fromstring(xml.encode("utf-8"))
            except ElementTree.ParseError as error:
                raise ValueError(f"Invalid XML in {name}: {error}") from error

        handle = tempfile.NamedTemporaryFile(
            prefix="tm002_", suffix=".tmp", dir=str(output.parent), delete=False
        )
        temporary = Path(handle.name)
        handle.close()
        try:
            with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as archive:
                for name, xml in parts.items():
                    archive.writestr(name, xml.encode("utf-8"))
            with zipfile.ZipFile(temporary, "r") as archive:
                bad = archive.testzip()
                if bad:
                    raise ValueError(f"ZIP validation failed for {bad}.")
            os.replace(temporary, output)
        finally:
            if temporary.exists():
                temporary.unlink()
        print(f"Created: {output}")
        print("Open in Word, update the Contents field, and visually review the layout.")
        print("Clinical review and local approval remain required.")


def build_handbook() -> Handbook:
    if len(SESSION_DATA) != 20:
        raise ValueError("The handbook must contain all twenty session playbooks.")

    book = Handbook()

    # Cover
    book.p("CONFIDENTIAL CASE PLANNING", "CoverLabel")
    book.p(TITLE, "CoverTitle")
    book.p(SUBTITLE, "CoverSubtitle")
    book.p(f"CASE {CASE_ID}  •  VERSION {VERSION}", "CoverLabel")
    book.p("Childhood-related distress • Self-worth • Assertiveness • Trust")
    book.p("Assessment, decision support, twenty-session scripts, and reusable forms")
    book.p(
        "CLINICAL PLANNING DRAFT — LICENSED REVIEW REQUIRED",
        "Alert"
    )
    book.p(
        "Not a validated treatment package, diagnostic instrument, "
        "or hypnosis-clearance test."
    )
    book.p(f"Prepared {PREPARED}", "Small")
    book.p(
        "Client information is limited to the supplied case statement and working notes. "
        "No completed clinical assessment or treatment outcome is implied.",
        "Small"
    )

    # Contents field
    book.body.append(page_break())
    book.p("Contents", "ContentsTitle")
    book.p(
        "In Microsoft Word, right-click the field below and choose Update Field / "
        "Update entire table. Heading styles also support the Navigation Pane.",
        "Small"
    )
    book.body.append(
        '<w:p>'
        + field(' TOC \\o "1-2" \\h \\z \\u ',
                "Update this field in Word to display the table of contents.")
        + '</w:p>'
    )

    # Handbook and interview
    book.render(FRONT_MATTER)
    for section, questions in INTERVIEW_GROUPS:
        book.heading(section, 2)
        prefix = section.split(".")[0]
        for number, question in enumerate(questions, start=1):
            book.p(f"**{prefix}{number}. {question}**")
            book.p(
                "Response / example / impact / action: "
                "____________________________________________________________",
                "Small"
            )
            book.p(
                "________________________________________________________________________",
                "Small"
            )

    book.render(METHODS)
    book.render(BRANCHES)
    book.render(GROUNDING)

    # Roadmap
    book.heading("Twenty-session roadmap")
    book.p(
        "The numbering is a navigation framework, not a required sequence or dose. "
        "An appropriate selected trauma-focused treatment may begin earlier and "
        "replace or reorganize these modules. All scripts are original clinical templates.",
        "Alert"
    )
    rows = [("Session", "Focus", "Proposed purpose")]
    for title, aim, _, _, _ in SESSION_DATA:
        number, focus = title.split(" — ", 1)
        rows.append((number, focus, aim))
    book.table(rows, widths=[900, 3100, CONTENT_WIDTH - 4000])

    # Complete session playbooks, including repeated openings and closings
    for index, (title, aim, main, practice, note) in enumerate(SESSION_DATA, start=1):
        book.heading("Session " + title)
        book.p("**Purpose:** " + aim)
        book.p(
            "Original adaptable dialogue. Actual assessment, consent, client responses, "
            "and the selected treatment take precedence over this script.",
            "Small"
        )
        if index != 1:
            book.render(OPENING)
        else:
            book.p(
                "Use the intake opening within this session. Complete the relevant "
                "official screening and current-safety assessment before deciding on "
                "any procedure.",
                "Stage"
            )

        book.render(main)

        if index == 4:
            book.render(HYPNOSIS)
        if index == 8:
            book.render(ROOM)

        book.heading("Agreed practice or next step", 2)
        book.p(practice)
        book.render(CLOSING)
        book.heading("Clinical record and continuing flow", 2)
        book.p(note)
        if index < 20:
            book.p(
                "The next proposed module is Session "
                + SESSION_DATA[index][0]
                + ". Confirm that it remains appropriate rather than moving on automatically.",
                "Small"
            )
        else:
            book.p(
                "Document the actual ending, extension, booster, or transfer arrangement. "
                "No further appointment is presumed.",
                "Small"
            )

    # Reusable worksheets
    book.heading("Client worksheets — use selectively")
    book.p(
        "These are original worksheets, not standardized tests. Agree on a manageable "
        "task and review its usefulness. Do not assign all worksheets at once."
    )
    for title, fields in WORKSHEETS:
        book.add_form(title, fields)

    # Reusable clinician forms
    book.heading("Clinician forms — assessment, consent, and documentation")
    book.p(
        "These forms contain no prefilled clinical findings. Use the official validated "
        "instruments separately and preserve their wording and scoring."
    )
    for title, fields in CLINICIAN_FORMS:
        book.add_form(title, fields)

    book.render(IMPLEMENTATION)

    # Sources
    book.heading("Reference and source register")
    book.p(
        "Source dates and access limitations are stated individually. "
        "The source register is not an endorsement of every claim in the supplied notes. "
        "Original scripts and forms do not become validated because they cite research.",
        "Small"
    )
    for code, title, url, annotation in REFERENCES:
        book.p(f"**[{code}] {title}**")
        book.p(annotation, "Small")
        if url:
            book.add_link("Open source / obtain official material", url)

    book.heading("Version and approval record", 2)
    book.table([
        ("Version / date", "Change", "Reviewer / approval"),
        ("1.0 / 6 October 2026",
         "Consolidated case plan, assessment, scripts, source audit, and working forms.",
         "Not yet approved"),
        ("__________________", "__________________", "__________________"),
        ("__________________", "__________________", "__________________"),
    ])
    book.p(
        "END OF HANDBOOK — Clinical approval, official instrument acquisition, "
        "and visual document review remain required.",
        "Small"
    )
    return book


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the TM-002 master therapeutic handbook as an editable DOCX."
    )
    parser.add_argument(
        "--output",
        default="TM002_Master_Therapeutic_Handbook.docx",
        help="Destination .docx filename."
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace an existing destination file."
    )
    args = parser.parse_args()

    try:
        build_handbook().save(Path(args.output), overwrite=args.overwrite)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(status=1, message=f"Document generation failed: {error}\n")


if __name__ == "__main__":
    main()