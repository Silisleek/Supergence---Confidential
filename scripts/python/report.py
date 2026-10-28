#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                 PageBreak, HRFlowable, ListFlowable, ListItem, KeepTogether)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas as canvas_mod

INK = colors.HexColor("#1a1a2e")
ACCENT = colors.HexColor("#7b2ff7")
ACCENT2 = colors.HexColor("#0f9d8f")
GREY = colors.HexColor("#555566")
LIGHT = colors.HexColor("#f4f2fb")
LINE = colors.HexColor("#d8d4ea")

styles = getSampleStyleSheet()

def style(name, **kw):
    if "parent" not in kw:
        kw["parent"] = styles["Normal"]
    return ParagraphStyle(name, **kw)

S_TITLE = style("S_TITLE", fontName="Helvetica-Bold", fontSize=27, leading=32, textColor=INK, spaceAfter=6)
S_SUB = style("S_SUB", fontName="Helvetica", fontSize=13, leading=18, textColor=GREY, spaceAfter=4)
S_META = style("S_META", fontName="Helvetica", fontSize=9.5, leading=13, textColor=GREY)
S_H1 = style("S_H1", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=ACCENT, spaceBefore=22, spaceAfter=10)
S_H2 = style("S_H2", fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=INK, spaceBefore=14, spaceAfter=6)
S_H3 = style("S_H3", fontName="Helvetica-BoldOblique", fontSize=10.5, leading=14, textColor=ACCENT2, spaceBefore=8, spaceAfter=4)
S_BODY = style("S_BODY", fontName="Helvetica", fontSize=9.7, leading=14.5, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=7)
S_BODY_SM = style("S_BODY_SM", fontName="Helvetica", fontSize=9, leading=13, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=5)
S_BULLET = style("S_BULLET", parent=S_BODY, leftIndent=14, bulletIndent=2, spaceAfter=4)
S_QUOTE = style("S_QUOTE", fontName="Helvetica-Oblique", fontSize=9.3, leading=13.5, textColor=GREY, leftIndent=14, borderColor=LINE, spaceAfter=8)
S_CAPTION = style("S_CAPTION", fontName="Helvetica-Oblique", fontSize=8, leading=11, textColor=GREY, spaceBefore=2, spaceAfter=10)
S_TAG = style("S_TAG", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white)
S_VERDICT = style("S_VERDICT", fontName="Helvetica-Bold", fontSize=11, leading=16, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=8)
S_TOC = style("S_TOC", fontName="Helvetica", fontSize=10, leading=18, textColor=INK)

def hr(color=LINE, thickness=0.8, space_before=2, space_after=10):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceBefore=space_before, spaceAfter=space_after)

def para(txt, s=S_BODY):
    return Paragraph(txt, s)

def bullets(items, s=S_BULLET):
    return ListFlowable([ListItem(Paragraph(i, s), leftIndent=10) for i in items],
                         bulletType='bullet', start='•', bulletFontSize=8, leftIndent=10)

def section_header(num, title):
    return Paragraph(f'<font color="#7b2ff7">§{num}</font>&nbsp;&nbsp;{title}', S_H1)

def system_card(name, tagline, org, date, meta_row, description_paras, mechanism_bullets,
                 results_bullets, limits_bullets, verdict_line):
    flow = []
    flow.append(Paragraph(f'<b>{name}</b>', S_H2))
    flow.append(Paragraph(f'<i>{tagline}</i>', style("tl", parent=S_BODY_SM, textColor=ACCENT2, spaceAfter=4)))
    flow.append(Paragraph(meta_row, S_META))
    flow.append(Spacer(1, 4))
    for p in description_paras:
        flow.append(para(p, S_BODY_SM))
    flow.append(Paragraph("How it self-improves:", S_H3))
    flow.append(bullets(mechanism_bullets, style("mb", parent=S_BULLET, fontSize=8.8, leading=12.5)))
    flow.append(Paragraph("Verified results:", S_H3))
    flow.append(bullets(results_bullets, style("rb", parent=S_BULLET, fontSize=8.8, leading=12.5)))
    flow.append(Paragraph("Limits / open problems:", S_H3))
    flow.append(bullets(limits_bullets, style("lb", parent=S_BULLET, fontSize=8.8, leading=12.5)))
    flow.append(Spacer(1, 3))
    flow.append(Paragraph(f'<font color="#0f9d8f"><b>Where it sits:</b></font> {verdict_line}',
                           style("vl", parent=S_BODY_SM, backColor=LIGHT, borderPadding=6, spaceAfter=4)))
    flow.append(Spacer(1, 10))
    flow.append(hr())
    return flow

# ----------------------------------------------------------------------------------
def build():
    doc = SimpleDocTemplate("/home/claude/rsi_report/RSI_Report.pdf", pagesize=LETTER,
                             topMargin=0.75*inch, bottomMargin=0.75*inch,
                             leftMargin=0.75*inch, rightMargin=0.75*inch,
                             title="The State of Recursive Self-Improvement in AI",
                             author="Research Report")
    story = []

    # ---------------- COVER ----------------
    story.append(Spacer(1, 1.6*inch))
    story.append(Paragraph("RECURSIVE SELF-IMPROVEMENT IN AI", S_TITLE))
    story.append(Paragraph("A Deep-Research Report on the Systems Teaching Machines to Rewrite, Retrain, and Redesign Themselves — and a Verdict on the Best One Yet", S_SUB))
    story.append(Spacer(1, 0.35*inch))
    story.append(hr(color=ACCENT, thickness=1.4, space_after=14))
    story.append(Paragraph("Prepared for: Akshan · Founder, Silisleek", S_META))
    story.append(Paragraph("Scope: Academic RSI (Gödel-machine lineage), applied algorithm discovery, self-adapting weights, self-play reasoning, and frontier-lab production RSI evidence (Anthropic, OpenAI, DeepMind).", S_META))
    story.append(Paragraph("Method: Multi-pass web research across arXiv, lab technical reports, and primary-source blog posts (Sept 2026), cross-checked across independent sources before synthesis.", S_META))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(
        "This report does not summarize hype. It traces one continuous engineering lineage — "
        "DGM → SICA → Huxley-Gödel Machine → Red Queen Gödel Machine — the academic frontier of agents that "
        "literally rewrite their own source code, alongside AlphaEvolve, SEAL, and Absolute Zero, which self-improve "
        "different layers of the stack (algorithms, weights, and training data respectively). It closes with primary "
        "evidence from inside Anthropic and OpenAI on what recursive self-improvement looks like when it leaves the "
        "lab and starts shipping production code.", S_BODY))
    story.append(PageBreak())

    # ---------------- TOC-ish overview ----------------
    story.append(section_header("0", "Executive Summary"))
    story.append(para(
        "\"Recursive self-improvement\" (RSI) is used loosely across the field, so this report first separates "
        "<b>bounded self-refinement</b> (a system polishing one output, then stopping) from <b>true RSI</b> (a system "
        "whose changes persist, compound, and improve its own future ability to improve). A 1,250-paper 2026 arXiv "
        "survey found that almost everything marketed as \"self-improving AI\" is the former; genuine open-ended RSI "
        "remains bounded by three hard constraints on every measured system to date: it needs an external grounding "
        "signal (a verifier or benchmark), it is vulnerable to reward hacking and model collapse if that signal is "
        "gamed, and it is compute-bounded rather than intelligence-bounded.", S_BODY))
    story.append(para(
        "Inside that boundary, one lineage of systems has made the most unambiguous, benchmarked progress: agents "
        "that rewrite their own Python codebase and validate each rewrite empirically. It runs "
        "<b>Darwin Gödel Machine (2025) → Self-Improving Coding Agent (2025) → Huxley-Gödel Machine (2025) → "
        "Red Queen Gödel Machine (2026)</b> — each one explicitly built to beat its predecessor, and each one doing so "
        "on the same public benchmarks (SWE-bench Verified, Polyglot). As of September 2026, the "
        "<b>Red Queen Gödel Machine (RQGM)</b> is the most recent, most rigorously validated entrant in this lineage "
        "and the closest thing the field has to a documented, reproducible \"best self-improving AI system.\"", S_BODY))
    story.append(para(
        "Running in parallel, three systems self-improve a different layer of the stack rather than their own agent "
        "scaffold: <b>AlphaEvolve</b> (Google DeepMind) evolves algorithms and has already been redeployed into "
        "Google's own production infrastructure and genomics pipelines; <b>SEAL</b> (MIT) teaches a language model to "
        "write its own fine-tuning data and permanently update its own weights; and <b>Absolute Zero</b> teaches a "
        "reasoner to invent its own training tasks with zero human-curated data. None of the three modifies its own "
        "source code the way the Gödel-machine lineage does, which is why they are complementary to it, not "
        "competitors for the same title.", S_BODY))
    story.append(para(
        "The largest-scale evidence of RSI, however, is not a single paper — it is what Anthropic and OpenAI report "
        "happening inside their own frontier-model pipelines. As of May 2026, Anthropic reports that "
        "<b>over 80% of the code merged into Anthropic's own codebase is written by Claude</b>, that Claude-run "
        "agents recovered 97% of an open-ended AI-safety research gap that two human researchers only closed 23% of "
        "in the same time, and that engineers now ship roughly 8x the code per quarter versus 2021-2025. OpenAI has "
        "separately stated that GPT-5.3-Codex was its \"first model instrumental in creating itself.\" This is not a "
        "closed self-improvement loop yet — humans still choose research directions and score results — but at the "
        "scale of full frontier-lab R&D pipelines, it is the most consequential RSI signal that currently exists.", S_BODY))
    story.append(Paragraph(
        '<font color="#0f9d8f"><b>Bottom line:</b></font> There is no single AI system that is simultaneously the most '
        'autonomous, most general, and most impactful self-improver — those three properties currently trade off '
        'against each other. Section 6 gives a full reasoned verdict; the short version is that the '
        '<b>Red Queen Gödel Machine is the best-documented pure RSI system</b> (most autonomous, narrowest domain), '
        '<b>AlphaEvolve is the best real-world-deployed self-improving system</b> (verified production impact, '
        'human-gated), and <b>Anthropic\'s Claude-in-the-loop pipeline is the best evidence of RSI at civilizational '
        'scale</b> (largest impact, least architecturally "closed").', S_VERDICT))
    story.append(PageBreak())

    # ---------------- SECTION 1: Taxonomy ----------------
    story.append(section_header("1", "What \"Recursive Self-Improvement\" Actually Means"))
    story.append(para(
        "Because the term is used to describe everything from a chatbot re-reading its own answer to a hypothetical "
        "machine that redesigns its own successor, this report anchors on the taxonomy used in the most rigorous 2026 "
        "review of the field (<i>\"The Last AI Built by Humans,\"</i> alphaXiv 2609.11873), which scores systems on five "
        "increasing levels of autonomy:", S_BODY))
    levels = [
        ("L1 — Executing prescribed improvements", "A human specifies exactly what to change; the AI just does it (e.g., an AI implementing a human-designed optimizer)."),
        ("L2 — Selecting improvement strategies", "The AI chooses which of several human-designed improvement strategies to apply."),
        ("L3 — Acquiring future learning experience", "The AI decides what new experience or data it needs, and goes and gets it (self-play, task generation)."),
        ("L4 — Adapting through deployment feedback", "The AI updates itself continuously from real-world / environmental feedback, not just a fixed offline benchmark."),
        ("L5 — Improving the mechanisms that govern future improvement", "The AI modifies its own improvement process itself — e.g. co-evolving the evaluator that judges its own changes."),
    ]
    rows = [[Paragraph(f"<b>{a}</b>", style("lvl_h", parent=S_BODY_SM, fontSize=9)), Paragraph(b, S_BODY_SM)] for a,b in levels]
    t = Table(rows, colWidths=[2.1*inch, 4.4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 0.6, LINE),
        ('INNERGRID', (0,0), (-1,-1), 0.5, LINE),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))
    story.append(para(
        "Almost every system marketed as \"self-improving\" (self-refinement loops, agentic retries, RAG that logs "
        "corrections) sits at <b>L1-L2</b>. The systems worth taking seriously as genuine RSI candidates — the subject "
        "of this report — operate at <b>L3 to L5</b>: they generate their own training signal, adapt from live "
        "feedback, or evolve the very evaluator that scores them.", S_BODY))
    story.append(para(
        "A second, orthogonal axis matters just as much: <b>what layer of the system actually changes.</b> A system "
        "can self-improve its <i>prompts/scaffold</i>, its <i>source code</i>, its <i>weights</i>, its <i>training "
        "data</i>, or its <i>evaluator</i>. The systems in this report are grouped by which layer they target, because "
        "that is what makes them complementary rather than directly comparable.", S_BODY))
    story.append(PageBreak())

    # ---------------- SECTION 2: The Gödel-machine lineage ----------------
    story.append(section_header("2", "The Core RSI Lineage: Agents That Rewrite Their Own Code"))
    story.append(para(
        "The theoretical \"Gödel machine\" (Schmidhuber, 2003) imagined a self-improving AI that would only rewrite "
        "itself when it could formally <i>prove</i> the rewrite was beneficial. That proof requirement made it "
        "unbuildable. Every system below is a pragmatic descendant: instead of a proof, each uses <b>empirical "
        "validation against a coding benchmark</b> as the gate for keeping a self-modification. This is the most "
        "direct, most rigorously benchmarked RSI lineage that exists today, and each entry was explicitly built and "
        "published to outperform the one before it.", S_BODY))

    story.extend(system_card(
        "Darwin Gödel Machine (DGM)",
        "The system that proved code-rewriting RSI works at all",
        "Sakana AI + collaborators", "Published May 2025",
        "<b>Layer:</b> Own source code &nbsp;|&nbsp; <b>Autonomy:</b> L3-L4 &nbsp;|&nbsp; <b>Paper:</b> arXiv 2505.22954",
        ["DGM is a coding agent that reads and edits its own Python codebase, then empirically checks whether the "
         "edited version is actually better at solving coding problems — no formal proof, just a benchmark score. "
         "Instead of evolving one lineage, it keeps a growing <b>archive</b> of every agent variant ever produced and "
         "samples from the whole archive to breed the next generation, deliberately preserving \"stepping-stone\" "
         "agents that aren't the best performers yet but unlock better descendants later — the paper's core "
         "\"open-endedness\" insight."],
        ["Foundation model (LLM) proposes a code diff to the agent's own scaffold (e.g., a new file-editing tool, a better long-context strategy).",
         "The modified agent is run against a coding benchmark (SWE-bench Verified, Polyglot).",
         "If it scores higher, the new agent is added to the archive as a candidate parent for future generations.",
         "Repeat for 80 iterations with no further human input."],
        ["Improved autonomously from 20.0% → 50.0% on SWE-bench Verified over 80 iterations, with zero plateau versus a non-self-improving baseline.",
         "Improved from 14.2% → 30.7% on Polyglot, surpassing the human-engineered Aider agent on that benchmark.",
         "Discovered its own improvements independently — better patch-validation steps, better long-context file handling, peer-review-style self-checks."],
        ["A single full run takes about two weeks and significant API spend.",
         "Still fell short of the best closed-source, human-engineered SWE-bench solutions at publication time.",
         "Self-modification is limited to the agent's prompts/scaffold code, not the underlying LLM's weights."],
        "The foundational proof-of-concept for the entire lineage below. Landmark, but already surpassed on every benchmark it introduced."
    ))

    story.extend(system_card(
        "Self-Improving Coding Agent (SICA)",
        "The parallel-track sibling that focused on single-lineage depth over archive breadth",
        "Independent research (Robeyns et al.)", "Published 2025",
        "<b>Layer:</b> Own source code &nbsp;|&nbsp; <b>Autonomy:</b> L3 &nbsp;|&nbsp; Cited throughout the DGM/HGM lineage as the key single-agent baseline",
        ["SICA modifies its own codebase the same way DGM does, but instead of growing a branching archive of many "
         "agent lineages, it keeps improving a single, best-known agent — closer to classic greedy hill-climbing than "
         "DGM's evolutionary tree. It is the direct baseline that later work (HGM) had to beat to justify a more "
         "expensive, tree-based search."],
        ["An LLM inspects the current best agent's own source and proposes one self-edit.",
         "The edit is validated on the same coding benchmarks used by DGM.",
         "Only the single best-performing lineage is carried forward — no archive of alternates."],
        ["Established that even single-lineage, non-branching self-modification produces real, compounding gains.",
         "Later shown by both DGM and HGM to plateau earlier than archive/tree-based search, motivating the next two systems."],
        ["Prone to getting stuck in local optima since it discards non-improving branches instead of banking them as future stepping stones.",
         "No mechanism to identify agents that look mediocre now but unlock bigger future gains."],
        "Historically important control condition; effectively superseded by HGM, which formalized exactly why single-lineage search underperforms."
    ))

    story.extend(system_card(
        "Huxley-Gödel Machine (HGM)",
        "Fixed DGM's central flaw: the best-scoring agent isn't always the best parent",
        "Wang, Piękos, Schmidhuber et al.", "Published Oct 2025",
        "<b>Layer:</b> Own source code &nbsp;|&nbsp; <b>Autonomy:</b> L4 &nbsp;|&nbsp; <b>Paper:</b> arXiv 2510.21614 &nbsp;|&nbsp; Code: github.com/metauto-ai/HGM",
        ["HGM's contribution is a genuinely new idea, not just more compute: it identifies the "
         "<b>\"Metaproductivity–Performance Mismatch\"</b> — the empirical finding that an agent's current benchmark "
         "score is a poor predictor of how good its <i>descendants</i> will be. Named after Thomas Huxley's concept "
         "of a biological \"clade,\" HGM estimates a metric called CMP (clade metaproductivity): instead of asking "
         "\"is this agent good?\", it asks \"how good, on average, are the children this agent tends to produce?\" and "
         "uses that to decide which agent in the archive to breed from next."],
        ["Builds the same kind of self-modification archive/tree as DGM.",
         "Estimates each node's CMP — the aggregate future performance of its descendant lineage — rather than its own raw score.",
         "Uses CMP as the guide for tree search, provably approximating how the theoretical (provably-optimal) Gödel machine would behave under stated assumptions."],
        ["Outperformed both DGM and SICA on SWE-bench Verified and Polyglot while using fewer CPU-hours.",
         "An HGM-discovered agent reached human-level performance on SWE-bench Lite, matching the best officially-verified human-engineered coding agent (SWE-agent) under matched compute budgets.",
         "Demonstrated strong transfer: an agent tuned on SWE-bench Verified with GPT-5-mini kept human-level performance when tested on a different benchmark (SWE-bench Lite) with a different backbone model (GPT-5)."],
        ["CMP is an estimated, not exact, quantity — its accuracy is itself a bottleneck.",
         "Still evaluated against a single, fixed benchmark criterion throughout a run — which the next system in the lineage identifies as the next weak point."],
        "The first system in this lineage to match human-engineered, officially-verified agent performance — the point where RSI research crossed from \"promising\" to \"competitive with the best humans have hand-built.\""
    ))

    story.extend(system_card(
        "Red Queen Gödel Machine (RQGM) — current published state of the art",
        "Solves the last big loophole: agents were still being graded by a judge that never changes",
        "Iacob, Jovanović, Lane (Cambridge) et al.", "Published June 2026 (v2)",
        "<b>Layer:</b> Own source code + its own evaluator &nbsp;|&nbsp; <b>Autonomy:</b> L5 &nbsp;|&nbsp; <b>Paper:</b> arXiv 2606.26294",
        ["Every system above shares one hidden assumption: the yardstick used to judge whether a self-modification "
         "is an improvement (a fixed benchmark or verifier) never itself changes. RQGM's authors point out this is "
         "unrealistic — in real evolution, environments and competitors adapt too (the \"Red Queen effect\": you have "
         "to keep improving just to stay in the same relative place). RQGM makes the <b>evaluator itself part of the "
         "evolving system</b>: agents and the code-review judges that score them co-evolve together, epoch by epoch, "
         "which is exactly the L5 capability defined in Section 1 — improving the mechanism that governs future "
         "improvement, not just the thing being improved."],
        ["Search is split into epochs; within an epoch the evaluation criterion is held fixed (preserving DGM/HGM-style improvement guarantees).",
         "At each epoch boundary, the evaluator (an evolved \"agent-as-a-judge\" code reviewer) is itself allowed to evolve — becoming cheaper and more discriminating.",
         "The reviewer signal is deliberately cheaper to compute than a full benchmark pass, so the system reaches a target quality level using far less compute than re-running the full benchmark every time."],
        ["Exceeded HGM's held-out pass rate on the Polyglot benchmark while using 1.35x-1.72x fewer search tokens to reach the same quality.",
         "Showed that adding a co-evolved, cheap code-review signal is not just faster but strictly more accurate at the same compute budget than the prior best static-evaluator approach.",
         "Demonstrated evaluator replacement mid-run without collapsing the improvement guarantees that HGM and DGM rely on."],
        ["Still bounded to the coding domain — has not been shown to generalize RSI to open-ended, non-verifiable tasks.",
         "Co-evolving the judge alongside the agent reopens (in a controlled, epoch-bounded way) the exact reward-hacking risk that a fixed external evaluator was originally meant to prevent — the paper's epoch design is explicitly an engineering answer to that risk, not a total elimination of it.",
         "As with its predecessors, a full run still requires substantial, non-trivial compute and sandboxed infrastructure."],
        "The most recently published, most rigorously validated entry in the direct DGM→SICA→HGM→RQGM lineage. On the specific, well-defined criterion of \"an AI system that autonomously rewrites its own code AND the standard used to judge those rewrites, with published, reproducible gains over every predecessor,\" RQGM is the current state of the art."
    ))

    story.append(PageBreak())

    # ---------------- SECTION 3: Other-layer self-improvers ----------------
    story.append(section_header("3", "Self-Improvement at Other Layers: Algorithms, Weights, and Data"))
    story.append(para(
        "These three systems are not competing for the same crown as the Gödel-machine lineage — they self-improve a "
        "different part of the stack, and two of them (AlphaEvolve, SEAL) are arguably more consequential in practice "
        "because they change either deployed production code or the model's actual weights, rather than an "
        "experimental research agent's own scaffold.", S_BODY))

    story.extend(system_card(
        "AlphaEvolve",
        "Self-improving algorithm discovery, already redeployed into real production systems",
        "Google DeepMind", "Published May 2025; impact update May 2026",
        "<b>Layer:</b> Target algorithms/code (not its own agent code) &nbsp;|&nbsp; <b>Autonomy:</b> L3 &nbsp;|&nbsp; Built on Gemini Flash + Gemini Pro",
        ["AlphaEvolve is an evolutionary coding agent: given a starting program and an automatic scoring function, it "
         "uses an ensemble of Gemini models (Flash for breadth of ideas, Pro for depth) to evolve entire codebases, "
         "not just single functions — extending DeepMind's earlier FunSearch work. It doesn't rewrite its own agent "
         "code the way DGM does; instead it recursively improves <i>the algorithms and infrastructure Google itself "
         "runs on</i>, which is why it has already been redeployed rather than left as a research artifact."],
        ["Maintains a database of candidate programs plus their evaluation scores.",
         "A prompt sampler builds rich prompts from the best-known programs in that database.",
         "The LLM ensemble proposes new program variants; each is automatically scored and, if better, added back to the database — a direct evolutionary loop, conceptually a sibling of DGM's archive but applied to target algorithms rather than to AlphaEvolve's own scaffold."],
        ["Matched or beat the best known bounds on multiple open mathematical problems (e.g., improved the best-known lower bound for a sum/difference-of-sets problem from θ=1.14465 to θ=1.1584).",
         "Discovered a faster algorithm for a component of Google's own data-center scheduling, which was deployed into production.",
         "May 2026 update: applied to DeepConsensus (Google's DNA-sequencing error-correction model), cutting variant-detection errors by 30%.",
         "May 2026 update: applied to the AC Optimal Power Flow grid-optimization problem, raising a trained model's rate of finding feasible solutions from 14% to over 88%."],
        ["Requires the user to supply a machine-checkable scoring function up front — it cannot self-improve on problems without an automatic evaluator.",
         "Improves target algorithms, not itself; it is not evolving its own reasoning process or scaffold the way the Gödel-machine lineage is.",
         "Human researchers still select which problems AlphaEvolve is pointed at."],
        "The best-evidenced example of RSI-style evolutionary search creating <b>real, deployed, production value</b> outside a benchmark leaderboard — genomics, power grids, and Google's own infrastructure, not just papers."
    ))

    story.extend(system_card(
        "SEAL (Self-Adapting Language Models)",
        "Teaches a model to write its own training data and permanently rewire its own weights",
        "MIT (Zweiger, Pari, Agrawal et al.)", "Published June 2025",
        "<b>Layer:</b> Own weights &nbsp;|&nbsp; <b>Autonomy:</b> L3-L4 &nbsp;|&nbsp; <b>Paper:</b> arXiv 2506.10943",
        ["Most LLM \"self-improvement\" today is temporary: in-context learning that vanishes the moment the context "
         "window resets. SEAL instead gives the model the ability to write a <b>\"self-edit\"</b> — a natural-language "
         "instruction describing exactly how it should be fine-tuned (what synthetic training data to generate, what "
         "hyperparameters to use) — and then actually applies that edit via real gradient updates, producing a "
         "<i>persistent</i> change to the model's own weights, not just a longer prompt."],
        ["Outer loop (reinforcement learning): the model proposes candidate self-edits, each is applied, and the model is scored on downstream task performance; good self-edits are rewarded, training the model to generate better ones over time.",
         "Inner loop (supervised fine-tuning): the chosen self-edit is used as the model's own training data, and standard gradient descent bakes it permanently into the weights.",
         "The model directly parameterizes and controls its own adaptation process, rather than relying on an external adaptation module."],
        ["Boosted knowledge-assimilation QA accuracy from roughly one-third correct (no adaptation) to nearly half correct after a couple of self-edit rounds.",
         "Beat both naive prompting and untrained self-edit baselines on few-shot reasoning generalization by a wide margin."],
        ["Repeated self-edits can cause <b>catastrophic forgetting</b> — the paper's own continual-learning experiments show performance on earlier tasks degrading as new self-edits are layered on, with no built-in fix yet (replay, constrained updates, and representational superposition are named as open directions, not solved problems).",
         "Independent critics note the standard comparison (self-adapting model vs. a model that never trains at all) inflates the apparent gain versus more realistic baselines.",
         "Not yet demonstrated at frontier-model scale — published results are on smaller research-scale models."],
        "The most credible published route to RSI at the <b>weights layer</b> rather than the code layer — genuinely different from the Gödel-machine lineage, and the most likely candidate to eventually merge with it (an agent that rewrites both its scaffold and its weights)."
    ))

    story.extend(system_card(
        "Absolute Zero Reasoner (AZR)",
        "Removes human-curated data from the loop entirely via self-play",
        "Tsinghua / LeapLab et al.", "Published May 2025",
        "<b>Layer:</b> Own training curriculum/data &nbsp;|&nbsp; <b>Autonomy:</b> L3 &nbsp;|&nbsp; <b>Paper:</b> arXiv 2505.03335",
        ["Reinforcement learning with verifiable rewards (RLVR) still depends on humans supplying a curated set of "
         "questions and answers. Absolute Zero removes that dependency: a single model plays both roles in a self-play "
         "loop — a <b>proposer</b> that invents its own reasoning tasks (deduction, abduction, induction, framed as "
         "code) and a <b>solver</b> that attempts them — with a code executor providing objective, ungameable ground "
         "truth for both roles."],
        ["Proposer generates a candidate task; a code interpreter validates it is well-formed and assigns a \"learnability\" reward (neither trivial nor unsolvable).",
         "Solver attempts the validated task; the code executor checks the answer and provides a verifiable correctness reward.",
         "Both roles are trained jointly via reinforcement learning, with zero external human-labeled data at any point."],
        ["Achieved state-of-the-art results on combined math + coding reasoning benchmarks with literally zero curated training examples.",
         "Outperformed models trained on tens of thousands of expert-labeled, in-domain examples, despite operating fully out-of-distribution from any human dataset."],
        ["Confined to domains where a code executor can provide an objective, verifiable reward — doesn't generalize automatically to open-ended or subjective tasks.",
         "The authors themselves flag this as most relevant for a future where AI capability exceeds what human-set tasks can usefully teach — an argument for later relevance more than a solved current bottleneck."],
        "The strongest existing demonstration that a model can bootstrap its own useful training curriculum from nothing — directly relevant to a future where the Gödel-machine lineage runs out of human-authored coding benchmarks to be judged against."
    ))

    story.append(PageBreak())

    # ---------------- SECTION 4: Frontier lab evidence ----------------
    story.append(section_header("4", "The Elephant in the Room: RSI at Frontier-Lab Scale"))
    story.append(para(
        "Every system above is a controlled research artifact, benchmarked in a sandbox. The largest, highest-stakes "
        "evidence of recursive self-improvement in September 2026 comes instead from what Anthropic and OpenAI report "
        "happening inside their own model-development pipelines — a distributed, human-supervised version of the same "
        "loop, running at the scale of an entire company's R&D.", S_BODY))

    story.append(Paragraph("Anthropic: \"When AI Builds Itself\" (May 2026 institute report)", S_H2))
    story.append(para(
        "Anthropic's own account, corroborated with internal metrics rather than benchmark claims, is the single "
        "richest primary source found in this research pass:", S_BODY_SM))
    story.append(bullets([
        "<b>Over 80% of code merged into Anthropic's production codebase is now authored by Claude</b> (up from low single digits before Claude Code's Feb 2025 launch); leadership has separately estimated 90%+ once scripts and experimental code are included.",
        "Engineers merged roughly <b>8x as much code per quarter</b> in Q2 2026 versus the 2021-2024 baseline.",
        "In a controlled experiment, Claude-powered agents were left to run an <b>open-ended AI safety research project</b> end-to-end (\"can a weaker model reliably supervise a stronger one?\") and recovered <b>97% of the measurable performance gap</b> over 800 cumulative agent-hours and ~$18,000 of compute — versus two human researchers recovering only ~23% of the same gap working for about a week.",
        "On a mid-course \"what should happen next\" judgment task inside real research sessions, Claude's suggested next step was rated better than the human researcher's actual choice <b>64% of the time</b> as of April 2026, up from 51% in November 2025.",
        "On a fixed \"make this training code run faster\" benchmark with the goal and success metric held constant, Claude went from a ~3x speedup (Opus 4, May 2025) to a ~52x speedup (Mythos Preview, April 2026) — a domain Anthropic explicitly calls \"superhuman\" for skilled human researchers working the same problem.",
        "In April 2026, Claude shipped over 800 fixes that cut a class of API errors by 1000x, work Anthropic's own engineer estimated would have taken a human about four years.",
    ], style("anth", parent=S_BULLET, fontSize=8.9, leading=13)))
    story.append(para(
        "Anthropic is explicit that this is <b>not yet closed-loop RSI</b>: humans still choose which problems matter "
        "and define the scoring rubric in every one of these examples — the gap that separates today's systems from "
        "one capable of fully autonomously designing its own successor. But at the scale of an entire frontier lab's "
        "R&D pipeline, this is the most consequential, most extensively measured RSI signal that currently exists "
        "anywhere, academic or corporate.", S_BODY_SM))

    story.append(Paragraph("OpenAI: GPT-5.3-Codex", S_H2))
    story.append(para(
        "In February 2026, OpenAI shipped GPT-5.3-Codex describing it as <b>\"our first model that was instrumental "
        "in creating itself\"</b> — earlier versions of the model had helped debug its own training run. Independent "
        "analysis of the announcement (Future AGI, Aug 2026) cautions that this was a <b>bounded engineering assist "
        "judged by people</b>, not a scored, self-reseeding closed loop like RQGM's — i.e., an L1-L2 event by the "
        "taxonomy in Section 1, dressed in RSI language. The distinction matters: it illustrates exactly how easily "
        "\"AI helped build the next AI\" gets reported as \"recursive self-improvement\" when the actual mechanism is "
        "much more bounded.", S_BODY))

    story.append(PageBreak())

    # ---------------- SECTION 5: Comparison table ----------------
    story.append(section_header("5", "Side-by-Side Comparison"))
    header = ["System", "Layer changed", "Autonomy", "Best verified result", "Domain scope"]
    data = [
        ["Darwin Gödel\nMachine (2025)", "Own agent code", "L3-L4", "SWE-bench 20%→50%;\nPolyglot 14.2%→30.7%", "Coding (narrow)"],
        ["SICA (2025)", "Own agent code", "L3", "Baseline for HGM;\nsingle-lineage gains", "Coding (narrow)"],
        ["Huxley-Gödel\nMachine (2025)", "Own agent code", "L4", "Human-level on\nSWE-bench Lite", "Coding (narrow)"],
        ["Red Queen Gödel\nMachine (2026)", "Own agent code +\nown evaluator", "L5", "Beats HGM w/\n1.35-1.72x fewer tokens", "Coding (narrow)"],
        ["AlphaEvolve\n(2025-26)", "Target algorithms/\nproduction code", "L3", "30% fewer genomics\nerrors; 14%→88% grid\nsolution rate", "Math, infra,\ngenomics, energy"],
        ["SEAL (2025)", "Own weights", "L3-L4", "~33%→~50% QA acc.\nafter self-edits", "Research-scale\nLLM adaptation"],
        ["Absolute Zero\n(2025)", "Own training\ncurriculum/data", "L3", "SOTA math+code\nreasoning, zero\nhuman data", "Verifiable\nreasoning tasks"],
        ["Claude / Anthropic\npipeline (2026)", "Company-wide\nR&D process", "L2-L3\n(human-gated)", ">80% of merged code;\n97% of research gap\nclosed vs. 23% human", "General software\nR&D (broad, but\nhuman-directed)"],
    ]
    tbl_data = [header] + data
    tw = [1.15*inch, 1.15*inch, 0.7*inch, 1.55*inch, 1.25*inch]
    t2 = Table(tbl_data, colWidths=tw, repeatRows=1)
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8.3),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 7.6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, LINE),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('LEFTPADDING', (0,0), (-1,-1), 5), ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t2)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Autonomy levels use the L1-L5 scale defined in Section 1. \"Domain scope\" is deliberately separated from "
        "\"autonomy\" because they trade off in every row above: the most autonomous systems (RQGM) are also the "
        "narrowest, and the broadest-scope system (Anthropic's pipeline) is currently the least architecturally "
        "autonomous.", S_CAPTION))

    story.append(PageBreak())

    # ---------------- SECTION 6: Verdict ----------------
    story.append(section_header("6", "Connecting the Dots: The Verdict"))
    story.append(para(
        "Combining every thread above into a single answer requires resisting the temptation to name one universal "
        "\"winner\" — the research itself shows why that would be a category error. Three genuinely different "
        "questions are being conflated whenever someone asks for \"the best self-improving AI system,\" and each has "
        "a different, defensible answer as of September 2026:", S_BODY))

    story.append(Paragraph("If the question is \"which system most closely realizes the original Gödel-machine dream?\"", S_H3))
    story.append(para(
        "→ The <b>Red Queen Gödel Machine (RQGM)</b>. It is the most recent, most rigorously benchmarked entry in a "
        "direct, published, four-generation lineage (DGM → SICA → HGM → RQGM) where each system was explicitly built "
        "to and did outperform its predecessor on identical, reproducible benchmarks. It is also the first in the "
        "lineage to operate at Level 5 autonomy — improving not just itself, but the evaluator that judges its own "
        "improvements — which is the single capability every earlier system in the lineage explicitly lacked. On the "
        "narrow, well-posed question of \"pure\" self-referential RSI, this is the current, citable state of the art.", S_BODY))

    story.append(Paragraph("If the question is \"which system has done the most real-world good, already, outside a benchmark?\"", S_H3))
    story.append(para(
        "→ <b>AlphaEvolve.</b> It is the only system in this report whose self-discovered improvements are already "
        "running in production outside the lab that built it: a redeployed data-center scheduling algorithm at "
        "Google, a 30% error reduction in a real genomics pipeline, and a >6x improvement in a power-grid "
        "optimization model's success rate. Autonomy-wise it is a step behind the Gödel-machine lineage (it improves "
        "target algorithms rather than its own reasoning process, and a human still points it at each problem), but "
        "it is the strongest evidence that RSI-style evolutionary self-improvement creates value beyond a leaderboard.", S_BODY))

    story.append(Paragraph("If the question is \"which system is having the largest total impact on the pace of AI development itself?\"", S_H3))
    story.append(para(
        "→ <b>Claude, inside Anthropic's own R&D pipeline</b> (with GPT-5.3-Codex inside OpenAI's as a close, less "
        "transparently-documented parallel). This is the least architecturally \"closed\" loop of anything in this "
        "report — a human still chooses what problem to work on in every documented case — but it is operating at a "
        "scale nothing else here approaches: an entire company's software output, not a sandboxed benchmark run. The "
        "97%-of-research-gap-recovered result and the sustained 8x engineering-output multiplier are, in aggregate, "
        "the largest measured effect of AI improving AI development that currently exists in the public record.", S_BODY))

    story.append(Spacer(1, 6))
    story.append(Paragraph("So, if forced to name one:", S_H2))
    story.append(para(
        "The single system that best deserves the label <b>\"the best self-improving AI system yet\"</b> — weighing "
        "autonomy, rigor, reproducibility, and recency together, and treating real-world deployed impact as the "
        "tie-breaker over pure benchmark autonomy — is the <b>Red Queen Gödel Machine</b>, as the most current, most "
        "self-referential, most independently-reproducible point in the only lineage of systems that literally "
        "rewrites its own source code and improves its own judge, generation after generation, with every claim "
        "checkable against a public arXiv paper and public benchmark numbers. AlphaEvolve is the strongest challenger "
        "specifically because it has already escaped the lab; Anthropic's internal pipeline is the strongest "
        "challenger specifically because of its sheer scale. But neither is <i>itself</i> the self-modifying artifact "
        "in the way RQGM, DGM, SICA, and HGM are — they are evidence that the RSI paradigm generalizes, not "
        "instances of the sharpest version of it.", S_VERDICT))

    story.append(PageBreak())

    # ---------------- SECTION 7: Risks & open problems ----------------
    story.append(section_header("7", "What Still Stands Between Here and Genuine, Open-Ended RSI"))
    story.append(bullets([
        "<b>Grounding dependency.</b> Every system in this report — RQGM included — still needs an external, machine-checkable signal (a benchmark, a code executor, a verifier) to know whether a self-modification actually helped. None has demonstrated open-ended self-improvement on tasks without such a signal.",
        "<b>Evaluator gaming / collapse dynamics.</b> The moment an evaluator becomes part of what's being optimized (as in RQGM, or in SEAL's repeated self-edits), the system risks exploiting quirks in its own judge rather than genuinely improving — RQGM's epoch-bounded design and SEAL's observed catastrophic forgetting are both, in different ways, symptoms of this same underlying risk.",
        "<b>Compute, not intelligence, is currently the binding constraint.</b> DGM's full run takes ~2 weeks and meaningful API spend; Anthropic explicitly frames its own scenario planning around whether the bottleneck becomes compute/energy supply rather than model capability.",
        "<b>The direction-setting gap.</b> Anthropic's own data shows Claude matching or beating human judgment on well-specified execution and even on some open-ended research <i>steps</i>, but choosing which problems are worth working on at all remains the clearest remaining human advantage across every system in this report, corporate or academic.",
        "<b>Safety and control.</b> Anthropic's own framing is the most candid public statement from any lab on this point: full recursive self-improvement, if reached, could either compound alignment successes or compound rare misalignments as a system builds its own successor — and no organization in this report claims to have solved that question, only to be actively researching it.",
    ], style("risk", parent=S_BULLET, fontSize=9, leading=13.5)))

    story.append(Spacer(1, 14))
    story.append(hr(color=ACCENT, thickness=1.2))
    story.append(Paragraph(
        "Sources consulted include: arXiv 2505.22954 (DGM), 2510.21614 (HGM), 2606.26294 (RQGM), 2506.13131 / "
        "DeepMind AlphaEvolve technical report and blog (2025-2026), 2506.10943 (SEAL, MIT), 2505.03335 (Absolute "
        "Zero), arXiv 2607.07663 (1,250-paper RSI taxonomy survey), alphaXiv 2609.11873 (\"The Last AI Built by "
        "Humans\"), and Anthropic's \"When AI Builds Itself\" institute report (anthropic.com/institute/"
        "recursive-self-improvement, May 2026).", S_CAPTION))

    doc.build(story)
    print("PDF built.")

if __name__ == "__main__":
    build()