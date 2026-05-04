---
type: paper
category: papers
para: resource
tags: [swe-bench, benchmark, code, agents, jimenez, 2024, evaluation]
sources: []
updated: 2026-05-01
tldr: A benchmark of 2,294 real GitHub issues from 12 popular Python repositories — to resolve each issue, a model must understand a full codebase, write a patch, and pass the existing test suite.
---

# SWE-bench: Can Language Models Resolve Real-World GitHub Issues? (Jimenez et al., 2024)

**Citation:** Jimenez, C. E., Yang, J., Wettig, A., Yao, S., Pei, K., Press, O., & Narasimhan, K. (2024). SWE-bench: Can Language Models Resolve Real-World GitHub Issues? ICLR 2024.

**One sentence:** A benchmark of 2,294 real GitHub issues from 12 popular Python repositories — to resolve each issue, a model must understand a full codebase, write a patch, and pass the existing test suite.

---

## What Problem It Solved

Coding benchmarks before SWE-bench (HumanEval, MBPP, CodeContests) test isolated function completion. They don't capture what software engineering actually requires: navigating a large existing codebase, understanding context, making multi-file edits, and validating changes against tests.

SWE-bench uses real issues from real open-source repos. The task is not "write a function". It is "fix this reported bug in this production codebase".

---

## Benchmark Construction

### Source Repositories (12 Python repos)

Django, Flask, Requests, scikit-learn, pandas, Matplotlib, Sympy, Pillow, Sphinx, pytest, seaborn, Astropy. Popular, well-maintained, high-quality repos with good test coverage.

### Issue Selection

For each resolved GitHub issue:
1. Find the PR that fixed it
2. Identify the test(s) added in the PR that verify the fix
3. Revert the codebase to pre-fix state
4. Record: (repository, issue description, test(s) that should pass after the fix)

### Evaluation

A model is given: the repository at the pre-fix state + the issue text. It must output a unified diff (git patch).

The patch is applied to the repo and the target tests are run. Pass = the tests pass. Fail = tests fail or patch doesn't apply.

**No human evaluation needed** — test suite pass/fail is the oracle.

---

## Difficulty and Results

### Why It's Hard

- Repos have hundreds to thousands of files
- The relevant code to change is not identified — the model must find it
- Changes often touch multiple files
- Understanding the issue requires understanding the codebase's abstractions
- The fix must not break existing tests (many submissions introduce regressions)

### Baseline Performance (2024)

At publication, leading models performed poorly:

| System | SWE-bench (full) | SWE-bench Lite (300 issues) |
|---|---|---|
| Claude 2 + retrieval | 4.8% | — |
| GPT-4 + retrieval | 1.7% | — |
| SWE-agent (GPT-4) | 12.5% | — |
| Devin (2024, claimed) | 13.9% | — |

### Progress After Publication

SWE-bench Verified was introduced (500 manually verified issues). Scores rose rapidly:

| System | SWE-bench Verified |
|---|---|
| Claude 3.5 Sonnet (2024) | 49% |
| Claude 3.7 Sonnet (2025) | 62% |
| Claude Opus 4.6 (2025) | 80.8% |
| Claude Opus 4.7 (2026) | 87.6% |

The benchmark drove a rapid improvement cycle. Labs optimised their agents specifically for SWE-bench.

---

## SWE-agent — The Accompanying Agent

The paper introduced SWE-agent: a simple agent scaffold (shell commands, file viewer, search) that outperformed all prior RAG-based approaches.

Key insight from SWE-agent: models need an interactive environment to efficiently navigate code, not just a static dump of relevant files. Navigation, searching, and editing in a loop dramatically outperforms "retrieve relevant files, then generate patch".

---

## Impact

- Became the gold standard benchmark for agentic coding capability
- SWE-bench scores are now cited in model launch announcements alongside MMLU and HumanEval
- Drove development of coding agents: Devin, SWE-agent, Claude Code, GitHub Copilot Workspace
- "SWE-bench Verified" subset validated by human raters to filter ambiguous or impossible issues
- SWE-bench Multimodal extended to issues involving screenshots and UIs

---

## Key Facts

- 2,294 issues; 12 Python repos; ICLR 2024; Princeton team
- Evaluation: apply patch → run test suite → pass/fail (automated, reproducible)
- SWE-bench Lite: 300 representative subset for cheaper evaluation
- SWE-bench Verified: 500 human-validated issues (more reliable than full set)
- Claude 3.7 Sonnet: 62% on Verified (2025); frontier as of that release
- Repos: Django, Flask, Requests, scikit-learn, pandas, Matplotlib, Sympy, Pillow, pytest, Sphinx, seaborn, Astropy

---

## Connections

[[papers/key-papers]] · [[papers/react]] · [[agents/practical-agent-design]] · [[evals/methodology]] · [[ai-tools/claude-code]] · [[landscape/ai-labs]]
## Open Questions

- What claims in this paper have since been challenged or superseded by follow-up work?
- What did later research reveal about the limitations of this approach?
