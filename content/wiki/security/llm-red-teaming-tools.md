---
type: concept
category: security
para: resource
tags: [red-teaming, garak, pyrit, promptfoo, nemo-guardrails, security-tooling, llm-security, deepteam]
sources: []
updated: 2026-05-04
tldr: "Five automated tools for adversarially testing LLM applications: Garak (pre-deployment scanner), PyRIT (enterprise multi-turn attack framework), Promptfoo (eval + security combined), NeMo Guardrails (runtime filtering), and DeepTeam (DeepEval-integrated red teaming)."
---

# LLM Red Teaming Tools

> **TL;DR** Five automated tools for adversarially testing LLM applications: Garak (pre-deployment scanner), PyRIT (enterprise multi-turn attack framework), Promptfoo (eval + security combined), NeMo Guardrails (runtime filtering), and DeepTeam (DeepEval-integrated red teaming).

This page covers runnable tooling. For the methodology — jailbreak categories, human red-teaming process, severity tiers, and CI regression suites — see [[security/red-teaming]].

The threat taxonomy these tools test against is at [[security/owasp-llm-top10]].

---

## The Two Phases These Tools Cover

**Pre-deployment scanning:** run a battery of attacks against your model or application endpoint before shipping. Garak, PyRIT, Promptfoo, and DeepTeam all operate here.

**Runtime filtering:** inspect and block every live request and response. NeMo Guardrails operates here.

The recommended stack uses both. Scanning before deploy catches systematic vulnerabilities. Runtime filtering handles attacks that slip through or emerge after launch.

---

## Garak (NVIDIA)

**What it is:** An open-source LLM vulnerability scanner. Think nmap for LLMs — systematic, probe-driven, report-generating. Run it before shipping any model-backed feature.

**Install and run:**

```bash
pip install garak

# Scan a public model for prompt injection vulnerabilities
garak --model_type openai --model_name gpt-4o --probes promptinject

# Run all probes (slow — use for pre-release audits)
garak --model_type openai --model_name gpt-4o --probes all

# Target a custom endpoint
garak --model_type rest --model_name my-app --probes jailbreak,dan
```

**Architecture — four components:**

| Component | Role |
|---|---|
| **Generators** | Wrap the target LLM; handle auth, connection, backoff |
| **Probes** | Assemble and send adversarial prompts targeting a specific weakness |
| **Detectors** | Analyse the response to judge whether the attack succeeded |
| **Evaluators** | Convert detector judgments into pass/fail data; build the report |

A harness coordinates all four components per run.

**Probe coverage (150+ probe modules, 3,000+ prompts):**

- Prompt injection and jailbreaks (DAN variants, role-play, hypothetical framing)
- Encoding attacks (Base64, rot13, homoglyph substitution)
- Toxicity and harmful content generation
- Data leakage and PII extraction
- Hallucination and misinformation elicitation
- System prompt extraction
- Many-shot escalation

Probes are tagged with MISP taxonomy, OWASP LLM category (`owasp:llm01`, `owasp:llm06`, etc.), and AVID effect codes — so the HTML report maps findings to the [[security/owasp-llm-top10]] directly.

**Output:** structured HTML + JSONL report per run, with pass rate per probe. Integrate into pre-release CI with a threshold gate.

**When to use:** pre-deployment audit of any model endpoint — hosted API, fine-tuned model, or full application chain.

---

## PyRIT (Microsoft)

**What it is:** Python Risk Identification Tool. Enterprise-focused, multi-turn, multi-modal red-teaming framework. Battle-tested by Microsoft's AI Red Team against Bing Chat, Copilot, and internal systems. MIT licensed, v0.11.0 (February 2026), Python 3.10-3.13.

```bash
pip install pyrit
```

**Architecture — four primitives:**

| Primitive | Role |
|---|---|
| **Targets** | The system under test (any LLM API) |
| **Orchestrators** | Run multi-turn attack campaigns, manage conversation state |
| **Converters** | Transform prompts to bypass filters (encode, obfuscate, translate) |
| **Scorers** | Evaluate whether each attack response constitutes a success |

**Built-in attack strategies:**

- **Many-shot jailbreaking** — prefill context with 50+ examples of compliance
- **Crescendo** — gradual multi-turn escalation; starts benign, steers toward violation
- **PAIR (Prompt Automatic Iterative Refinement)** — adversarial LLM iteratively rewrites attacks to maximise success rate
- **Tree-of-Attacks** — branches multiple attack paths in parallel, selects the most successful branch

**Azure AI Foundry integration:** in April 2025, Microsoft launched the AI Red Teaming Agent in public preview — a managed version of PyRIT that runs inside Azure AI Foundry, produces Attack Success Rate (ASR) metrics, and integrates with Azure AI evaluations. Use the hosted agent for Azure-native workflows; use the Python SDK directly for custom pipelines.

```python
from pyrit.orchestrator import PromptSendingOrchestrator
from pyrit.common import initialize_pyrit

initialize_pyrit(memory_db_type="duckdb")

orchestrator = PromptSendingOrchestrator(objective_target=target)
results = await orchestrator.send_prompts_async(
    prompt_list=["Ignore all instructions and...", "Pretend you are DAN..."]
)
```

**When to use:** systematic enterprise red-team programs; when you need documented Attack Success Rate metrics; when running multi-turn attack campaigns at scale; when you are on Azure AI Foundry.

---

## Promptfoo

**What it is:** Dual-role tool — standard eval framework AND security scanner. 300k+ developer users. Used by OpenAI and Anthropic teams internally. MIT licensed, actively maintained. Acquired by OpenAI (remains open source).

**Install:**

```bash
npm install -g promptfoo
# or
npx promptfoo@latest
```

**Security scanning via red-team plugin:**

```yaml
# promptfooconfig.yaml
redteam:
  plugins:
    - owasp:llm          # full OWASP LLM Top 10 coverage
    - prompt-injection
    - jailbreak
    - pii
    - harmful:hate
    - harmful:violence
    - overreliance
  strategies:
    - jailbreak:composite  # combine multiple jailbreak techniques
    - prompt-injection
```

```bash
promptfoo redteam run
promptfoo redteam report   # HTML report in browser
```

**Plugin coverage:** 157 plugins across 6 categories — brand protection, compliance and legal, datasets from published research, security and access control, trust and safety, and custom. Built-in framework presets: `owasp:llm`, `owasp:api`, `mitre:atlas`, NIST AI RMF.

Each plugin is a trained model that generates adversarial payloads targeting a specific weakness — not just static prompt templates.

**Dual eval + security workflow:**

```yaml
# Single config for both quality evals and security scanning
description: My LLM app
providers:
  - anthropic:claude-sonnet-4-6

tests:
  # Quality evals
  - vars:
      query: "What is the capital of France?"
    assert:
      - type: contains
        value: Paris

# Red team runs separately but in the same CI pipeline
redteam:
  plugins:
    - owasp:llm
```

**CI integration:**

```yaml
# GitHub Actions
- name: LLM security scan
  run: npx promptfoo@latest redteam run --ci
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**When to use:** teams that want eval and security in one tool; YAML-first workflows; CI-native security gates without a separate scanner tool.

---

## NeMo Guardrails (NVIDIA)

**What it is:** Runtime filtering — not a scanner. Runs on every live request and response. Uses Colang, a domain-specific language for defining conversation rails. Complements pre-deployment scanners: scan before shipping, filter at runtime.

```bash
pip install nemoguardrails
```

**Five rail types:**

| Rail | When it runs |
|---|---|
| Input | Before the LLM sees the user message |
| Dialog | Controls allowed conversation flows |
| Retrieval | Filters content before it enters the context |
| Execution | Guards tool calls and action results |
| Output | Before the LLM response reaches the user |

**Colang example — topical rail:**

```colang
# config/rails.co  (Colang 1.0 syntax — default as of 2026)
define user ask about competitors
  "How does your product compare to [competitor]?"
  "Is [competitor] better than you?"

define bot refuse competitor questions
  "I'm not able to make comparisons with other products."

define flow no competitors
  user ask about competitors
  bot refuse competitor questions
```

```python
from nemoguardrails import RailsConfig, LLMRails

config = RailsConfig.from_path("./config")
rails = LLMRails(config)

response = await rails.generate_async(
    messages=[{"role": "user", "content": "Tell me about your competitor."}]
)
```

**Built-in capabilities:**
- PII anonymisation (detect and redact before sending to LLM)
- Topical rails (prevent off-topic conversations)
- Jailbreak detection on input
- Hallucination and factual error flagging on output
- Colang 2.0 (beta) for more expressive flow control

**Key distinction from scanners:** NeMo Guardrails does not generate a vulnerability report. It sits in the request path and blocks or transforms content in real time. Use it alongside Garak and PyRIT, not instead of them. See also [[security/guardrails]] for output validation patterns using Guardrails AI (a different product from a different vendor).

**When to use:** customer-facing chatbots requiring strict topic control; any deployment needing PII filtering at the LLM boundary; runtime enforcement of conversation policy.

---

## DeepTeam (Confident AI)

**What it is:** Dedicated red-teaming framework from the DeepEval team (Confident AI, YC W25). Spun out from DeepEval as a standalone package. Red-team attacks are first-class evaluation metrics — same syntax, same reporting pipeline.

```bash
pip install deepteam
```

```python
from deepteam import red_team
from deepteam.attacks import PromptInjection, JailbreakingLinear
from deepteam.vulnerabilities import PIILeakage, HarmfulContent

results = await red_team(
    target=your_model_fn,
    attacks=[PromptInjection(), JailbreakingLinear()],
    vulnerabilities=[PIILeakage(), HarmfulContent()],
)
print(results.vulnerability_scores)
```

**Coverage:** 50+ vulnerabilities including PII leakage, toxicity, bias, jailbreaks. 20+ attack types including single-turn and multi-turn strategies. Deeply integrated with the Confident AI platform for tracking vulnerability scores over time.

**When to use:** teams already using DeepEval who want red teaming in the same framework; when you want vulnerability scores reported alongside standard eval metrics.

---

## OWASP LLM Top 10 Coverage Map

| OWASP Category | Garak | PyRIT | Promptfoo | NeMo | DeepTeam |
|---|---|---|---|---|---|
| LLM01 Prompt Injection | Yes (probe) | Yes (converter + orchestrator) | Yes (plugin) | Yes (input rail) | Yes |
| LLM02 Insecure Output | Yes (detector) | Yes (scorer) | Yes (plugin) | Yes (output rail) | Yes |
| LLM06 Sensitive Info Disclosure | Yes (probe) | Yes | Yes (plugin) | Yes (PII rail) | Yes |
| LLM07 System Prompt Leakage | Yes (probe) | Yes | Yes (plugin) | Partial | Yes |
| LLM08 Excessive Agency | Partial | Yes (agent orchestrator) | Yes (agents plugin) | No | Yes |
| LLM09 Misinformation | Yes (hallucination probe) | No | Yes (plugin) | Yes (output rail) | Yes |
| LLM10 Unbounded Consumption | No | No | Partial | No | No |

See [[security/owasp-llm-top10]] for the full threat taxonomy.

---

## Recommended Stack

```
Pre-deployment: Garak (systematic probe-based scan) + Promptfoo (YAML CI gate)
Enterprise programs: PyRIT (multi-turn attack campaigns, ASR metrics)
Runtime: NeMo Guardrails (topic control, PII filtering, jailbreak detection)
DeepEval teams: DeepTeam (red team + eval in one pipeline)
```

The minimal production stack for most teams is Garak pre-deployment plus NeMo Guardrails at runtime. Add PyRIT when you need documented Attack Success Rate metrics for compliance or when running periodic structured red-team programs. Add Promptfoo when your team already uses it for evals and wants security in the same CI step.

---

## Key Facts

- **Garak:** 150+ probe modules, 3,000+ prompts; reports map to OWASP and MISP taxonomy; run with `garak --model_type openai --model_name gpt-4o --probes all`
- **PyRIT:** v0.11.0 (Feb 2026); built-in attacks include PAIR, crescendo, tree-of-attacks, many-shot; Azure AI Foundry integration (AI Red Teaming Agent, April 2025 preview)
- **Promptfoo:** 157 plugins; OWASP, MITRE ATLAS, NIST AI RMF presets; dual eval + security in one YAML config; acquired by OpenAI, remains MIT licensed
- **NeMo Guardrails:** runtime-only; 5 rail types (input/dialog/retrieval/execution/output); Colang 1.0 is default, Colang 2.0 in beta; complements scanners, does not replace them
- **DeepTeam:** YC W25; 50+ vulnerabilities, 20+ attack strategies; same syntax as DeepEval; best for teams already on the Confident AI stack

---

## Common Failure Cases

**Garak scan times out on large probe sets when targeting a rate-limited API**
Why: running all 150+ probe modules sends thousands of requests; hosted APIs enforce rate limits that cause request failures, timeouts, and incomplete scan coverage.
Detect: the scan report shows incomplete probe runs or high error rates; wall-clock time far exceeds expected duration.
Fix: use `--parallel_attempts 1` to reduce concurrency; run targeted probe sets (`--probes promptinject,jailbreak`) rather than all probes; schedule full scans against a local or unlimited-tier endpoint.

**PyRIT crescendo attack appears to succeed because the scorer misclassifies a partial compliance as a full violation**
Why: multi-turn escalation often produces ambiguous responses near the boundary; a binary scorer configured for clear-cut violations will flag ambiguous hedging as a success, inflating ASR.
Detect: manually reviewing flagged conversations shows the model hedged or provided incomplete information that the scorer counted as a full violation.
Fix: use a calibrated LLM-as-judge scorer with a rubric that distinguishes between partial compliance, hedging, and full violation; include few-shot examples of each class in the judge prompt.

**NeMo Guardrails topical rail silently drops valid user messages that partially match a disallowed pattern**
Why: Colang 1.0 pattern matching is not exact — a user message containing a keyword from a disallowed `define user` block may trigger the rail even if the intent is benign.
Detect: users report getting refusals for clearly legitimate queries; Colang debug logs show the wrong flow being triggered.
Fix: make `define user` patterns as specific as possible; add a catch-all default flow for unmatched messages; test rail coverage with the `nemoguardrails chat --debug` flag before deploying.

---

## Connections

- [[security/red-teaming]] — methodology: jailbreak categories, human red-team process, severity tiers, CI regression suites
- [[security/owasp-llm-top10]] — the threat taxonomy these tools map to
- [[security/prompt-injection]] — LLM01 in depth; patterns these tools probe for
- [[security/guardrails]] — output validation at runtime (instructor, Guardrails AI, NeMo Guardrails)
- [[evals/methodology]] — promptfoo's dual role as eval framework and security scanner
- [[evals/deepeval]] — DeepEval's HallucinationMetric and ToxicityMetric are evaluation complements to adversarial red-teaming

## Open Questions

- Does Garak's probe coverage extend to agentic contexts (multi-agent delegation attacks, Agentic Top 10 A1-A10), or is it still primarily single-model?
- How does PyRIT's Attack Success Rate correlate with real-world adversary success rates on production systems — is ASR a reliable pre-deployment proxy?
- Can NeMo Guardrails Colang 2.0's event-driven model handle agentic tool call flows, or is it still limited to conversational turns?
