---
type: concept
category: evals
tags: [benchmarks, swe-bench, mmlu, gpqa, humaneval, lmsys, evaluation, livecodebench]
sources: []
updated: 2026-05-03
para: resource
tldr: Standard LLM benchmarks and what they actually measure — knowing which are saturated, contaminated, or misused prevents drawing wrong production decisions from benchmark scores.
---

# LLM Benchmarks

> **TL;DR** Standard LLM benchmarks and what they actually measure — knowing which are saturated, contaminated, or misused prevents drawing wrong production decisions from benchmark scores.

Standard benchmarks used to compare models. Knowing what each measures (and what it doesn't) prevents you from drawing wrong conclusions from benchmark scores.

---

## The Benchmark Problem

Benchmarks become invalid as soon as models are trained on them. "Training on benchmarks" (data contamination) inflates scores without reflecting real capability. This is why:
- HumanEval is saturated (95%+ for frontier models — o3 at 97%; cannot differentiate between frontier models)
- MMLU is near-saturated for frontier models (~90%+)
- The community constantly needs harder benchmarks

Always look at multiple benchmarks. No single benchmark tells the whole story.

---

## Coding

### SWE-bench

**What it measures:** Resolving real GitHub issues. Model generates a code patch; it passes if the repo's test suite passes.

**Why it matters:** Tests real program synthesis, not pattern matching. Can't be gamed with memorisation — every issue requires reasoning about the actual codebase.

**Variants:**

**SWE-bench Verified** — 500 human-validated tasks (subset of the original 2,294-issue set filtered for test reliability). Was the standard frontier comparison benchmark. OpenAI now recommends SWE-bench Pro over Verified for frontier model comparison.

**SWE-bench Pro** — harder successor. 1,865 tasks from proprietary codebases, multi-language (includes Go and TypeScript in addition to Python). Designed to resist saturation as frontier models approach ceiling scores on Verified.

**Scores on SWE-bench Verified (May 2026):**
- Claude Mythos Preview: ~93.9% [unverified]
- Claude Opus 4.6: 80.8%
- Claude Sonnet 4.6: 79.6%
- Claude Haiku 4.5: 73.3%
- [[llms/deepseek-r1|DeepSeek R1]]: ~72%
- GPT-4o: ~50–60%

> [Source: Perplexity research, 2026-04-29] [unverified — scores change frequently]

**"Verified" naming note:** The original SWE-bench had 19.7% ambiguous test failures. The Verified subset filtered to 2,294 issues where test failures are reliable. The newer SWE-bench Pro is the separate harder benchmark described above.

### HumanEval / MBPP

**What it measures:** Writing Python functions from docstrings. Pass@1: does the first attempt pass all test cases?

**Problem:** Fully saturated. Frontier models all score 95%+ (o3 at 97%). Differences between frontier models at this ceiling are not statistically meaningful. Mostly measures whether the model saw the problem in training data.

**Use:** Still valid as a minimum capability bar and for comparing small or open-source models. Not a frontier discriminator — use SWE-bench for any frontier coding comparison.

### LiveCodeBench

**What it measures:** Competitive programming problems sourced from contests that post-date model training cutoffs (problems added monthly). Because the problems did not exist when frontier models were trained, scores reflect genuine problem-solving ability rather than training data recall.

**Why it matters:** Contamination resistance is the core design goal. Most coding benchmarks (HumanEval included) are in training data for all frontier models. LiveCodeBench's rolling update mechanism gives it a structural advantage over static benchmarks for measuring real coding capability.

**Maintained by:** Researchers from MIT, Princeton, and UT Austin.

**Use:** Preferred over HumanEval for measuring coding capability on problems models have not seen. Complements SWE-bench (real-world repo tasks) with a pure problem-solving signal.

---

## Reasoning and Knowledge

### GPQA Diamond

**What it measures:** Graduate-level multiple choice in physics, chemistry, biology. Hand-crafted to require deep reasoning (not lookup).

**Difficulty:** Domain experts score ~65%. Frontier models scoring 85%+ is genuinely impressive.

**Scores (April 2026):**
- Claude Opus 4.6: 91.3%
- Gemini Ultra / o-series: ~85–90%

### MMLU (Massive Multitask Language Understanding)

**What it measures:** 57 subjects, 14K questions. Knowledge breadth across academic subjects.

**Problem:** Mostly knowledge lookup, not reasoning. Near-saturated for frontier models (85–90%+). Better for measuring open-source model quality.

### BIG-Bench Hard (BBH)

**What it measures:** 23 challenging tasks from BIG-bench that require multi-step reasoning. Less saturated than MMLU. Good for reasoning-focused comparison.

### MATH / AIME

**What it measures:** Competition-level mathematics. Multi-step proofs, algebra, calculus.

**AIME 2024:** The 2024 American Invitational Mathematics Examination. Claude Opus and o3 score in the top percentile. Still discriminative for frontier models.

---

## Human Preference

### LMSYS Chatbot Arena

**What it measures:** Head-to-head human preference votes. Users chat with two anonymous models and vote for the better response. ELO-ranked.

**Why it matters:** The most realistic measure of "which model do users actually prefer?" Real humans, real conversations, real preferences.

**Limitation:** Humans prefer longer, more confident responses (verbosity bias). The leaderboard leans toward models that are engaging rather than accurate.

Claude consistently ranks top-3. See the live leaderboard at lmsys.org/chat.

---

## Safety

### TruthfulQA

**What it measures:** Model's tendency to produce false statements that humans believe. Questions calibrated to where humans are most often wrong (conspiracy theories, folk wisdom, etc.).

### WildGuard / SimpleSafety

**What it measures:** Refusal accuracy on harmful prompts. Avoids over-refusal on benign prompts. 

---

## Reading Benchmark Numbers

**Compare on the same task.** A GPQA improvement from 85% to 87% at the same token budget is meaningful. A GPQA comparison across different token budgets (one with extended thinking, one without) is not.

**Look for held-out evaluation.** Benchmarks where the model's training data is verified to not include the test set. OpenAI's evals infrastructure guarantees this for their internal benchmarks; third-party benchmarks don't.

**Use multiple benchmarks.** A model strong on SWE-bench might be weak on GPQA. Task-specific benchmarks matter more than general leaderboards for production decisions.

**Don't trust a vendor's own published benchmarks without verification.** Labs have strong incentives to benchmark favourably.

---

## Building Custom Benchmarks

For production use cases, custom benchmarks matter more than general ones.

See [[evals/methodology]] for the full golden set construction guide. Short version:
1. Sample 200 real queries from your domain
2. Write expected answers or scoring criteria
3. Run candidate models against the set
4. Use LLM-as-judge (see [[evals/llm-as-judge]]) for open-ended answers
5. Track score over time as you update your system

---

## Key Facts

- SWE-bench Verified: 500 human-validated tasks; Claude Sonnet 4.6 scores 79.6%, Opus 4.6 scores 80.8%, Claude Mythos Preview ~93.9% [unverified]
- SWE-bench Pro: 1,865 tasks, proprietary codebases, multi-language — OpenAI recommends over Verified for frontier comparison
- HumanEval is saturated at 95%+ for frontier models (o3 at 97%) — useless for frontier comparisons; minimum capability bar only
- LiveCodeBench: contamination-resistant coding benchmark, new problems added monthly from post-training-cutoff contests
- MMLU: 57 subjects, 14K questions; frontier models at 85-90%+ (near-saturated)
- GPQA Diamond: domain experts score ~65%; frontier models scoring 85%+ is genuinely meaningful
- LMSYS Chatbot Arena has verbosity bias — longer responses get preferred regardless of accuracy
- Minimum custom benchmark size: 50 examples to start; 200+ for statistical confidence
- Never trust vendor-published benchmarks without third-party verification

## Common Failure Cases

**Citing HumanEval scores to justify a model choice for production coding tasks**  
Why: HumanEval is saturated at 95%+ for frontier models (o3 at 97%); differences of 1-3 percentage points are not statistically meaningful, and the benchmark's synthetic docstring-to-function tasks do not reflect real engineering work.  
Detect: two models show HumanEval scores of 96% and 94%; the lower-scoring model actually outperforms on SWE-bench.  
Fix: use SWE-bench Verified or SWE-bench Pro for coding evaluations; treat HumanEval as a minimum capability bar for open-source models, not a differentiator for frontier models.

**Comparing benchmark scores across different token budgets as if they are equivalent**  
Why: a model running with extended thinking enabled will score significantly higher on GPQA than the same model without extended thinking; comparing the two numbers as "model A vs model B" is misleading.  
Detect: a vendor announces "our model achieves X% on GPQA" without specifying whether extended thinking, chain-of-thought, or other compute-amplifying features were used.  
Fix: always compare models at equivalent token budget and configuration; verify whether the reported benchmark used a standard evaluation protocol before drawing conclusions.

**Building a production system on a custom benchmark with fewer than 50 examples**  
Why: small test sets have high variance; a model that scores 80% on 25 examples could score anywhere from 60-95% on a different sample of the same population; the confidence interval is too wide to make decisions.  
Detect: the benchmark result changes substantially when you add or remove 10 examples; standard error on the score is >5%.  
Fix: minimum 200 examples for a benchmark used to make production deployment decisions; use Wilson confidence intervals to report uncertainty alongside the point estimate.

**Trusting vendor-published benchmark numbers without checking evaluation methodology**  
Why: labs have strong incentives to benchmark favorably; they may use prompt formats optimised for their model, include test examples in training data, or selectively report benchmarks where their model performs well.  
Detect: the model's claimed score is significantly higher than any independent third-party evaluation; no public evaluation code or data is provided.  
Fix: prefer benchmarks run by independent third parties (EleutherAI, HuggingFace Open LLM Leaderboard); run your own internal benchmark on a held-out set before deployment decisions.

## Connections

- [[evals/methodology]] — full evaluation methodology and how to build a golden set
- [[evals/llm-as-judge]] — evaluating custom tasks without ground truth answers
- [[landscape/ai-labs]] — benchmark context for each lab's research priorities
- [[llms/claude]] — Claude's benchmark scores in full context
- [[papers/swe-bench]] — full paper: SWE-bench methodology, dataset construction, and why it's the gold standard for coding evals

## Open Questions

- What replaces MMLU and HumanEval as the canonical general-purpose benchmarks once they're fully saturated?
- How does SWE-bench Verified handle the risk of test-suite contamination for models trained on GitHub data?
- LiveCodeBench addresses contamination-resistant coding evaluation — does its monthly update cadence keep pace with training data recency for the fastest-training labs?
