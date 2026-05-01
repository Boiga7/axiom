---
type: concept
category: llms
tags: [tokenisation, bpe, tiktoken, tokenizer, context-window, token-counting]
sources: []
updated: 2026-04-29
para: resource
tldr: LLMs read tokens not text — BPE algorithm, tiktoken and Anthropic tokenisers, non-English cost penalty, and context window budgeting at production scale.
---

# Tokenisation

> **TL;DR** LLMs read tokens not text — BPE algorithm, tiktoken and Anthropic tokenisers, non-English cost penalty, and context window budgeting at production scale.

LLMs don't read text — they read tokens. Tokenisation is the step that converts text into integer IDs the model can process. Understanding it matters for: cost estimation, context window budgeting, prompt design, and explaining model failures.

---

## What Is a Token?

A token is roughly 3-4 characters of English text. Rules of thumb:
- 1 token ≈ 4 characters ≈ 0.75 words
- 100 tokens ≈ 75 words ≈ a short paragraph
- 1,000 tokens ≈ 750 words ≈ a page of text
- 1M tokens ≈ 750K words ≈ a large novel

These are averages. Code tokenises worse than prose (identifiers, operators). Non-Latin scripts tokenise much worse — a single CJK or Arabic character may be 1-4 tokens.

---

## Byte-Pair Encoding (BPE)

The dominant tokenisation algorithm. BPE builds a vocabulary by iteratively merging the most frequent byte pairs in a corpus.

**Algorithm:**
1. Start with individual bytes (or characters) as the vocabulary
2. Count all adjacent pairs in the training corpus
3. Merge the most frequent pair into a new token
4. Repeat until vocabulary size is reached (typically 32K-200K tokens)

```
Training corpus: "low low low lowest newest"

Initial: ['l','o','w',' ','l','o','w','e','s','t',' ','n','e','w','e','s','t']

Step 1: 'lo' is most frequent → merge → ['lo','w',' ','lo','w','e','s','t',' ','n','e','w','e','s','t']
Step 2: 'low' is most frequent → merge → ['low',' ','low','e','s','t',' ','n','e','w','e','s','t']
...
```

Common words become single tokens. Rare words split into subword pieces. Unknown words never cause failures — they decompose into bytes.

---

## tiktoken

OpenAI's tokeniser library. Fast, Rust-backed, available in Python.

```python
import tiktoken

# GPT-4, GPT-4o
enc = tiktoken.get_encoding("cl100k_base")

# GPT-4o-mini, o1
enc = tiktoken.get_encoding("o200k_base")

text = "Hello, how many tokens is this?"
tokens = enc.encode(text)
print(tokens)          # [9906, 11, 1268, 1690, 11460, 374, 420, 30]
print(len(tokens))     # 8

decoded = enc.decode(tokens)
print(decoded)         # "Hello, how many tokens is this?"

# Count without tokenising (faster)
def count_tokens(text: str, model: str = "gpt-4o") -> int:
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))
```

---

## Anthropic Tokeniser

Claude uses a custom BPE tokeniser. Count tokens via the API:

```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.count_tokens(
    model="claude-sonnet-4-6",
    system="You are a helpful assistant.",
    messages=[{"role": "user", "content": "How many tokens is this message?"}],
)
print(response.input_tokens)  # exact count
```

Or use the `anthropic-tokenizer` package for offline counting.

---

## Why Tokenisation Explains Model Behaviour

### Arithmetic failures

```
"1 + 1 = " → tokens: ['1', ' +', ' 1', ' =', ' ']
"999 + 1 = " → tokens: ['999', ' +', ' 1', ' =', ' ']  — '999' is one token
"9999999 + 1 = " → could split as ['9', '999', '999', ' +', ...] — inconsistent representation
```

Multi-digit arithmetic is hard because numbers tokenise inconsistently. The model learns patterns on whatever token boundaries happen to exist.

### Reversal tasks

"Reverse the string `hello`" is easy. "Reverse `helloworld`" may fail — `helloworld` might be a single token, and the model can't see its internal characters.

### Non-English text costs more

```python
enc = tiktoken.get_encoding("cl100k_base")
english = "The quick brown fox"
chinese = "敏捷的棕色狐狸"    # same meaning

print(len(enc.encode(english)))   # 4 tokens
print(len(enc.encode(chinese)))   # 12 tokens — 3x more expensive
```

---

## Special Tokens

Every model adds control tokens to the vocabulary:

| Token | Purpose |
|---|---|
| `<\|endoftext\|>` | GPT: end of sequence |
| `<\|im_start\|>` / `<\|im_end\|>` | ChatML format: message boundaries |
| `<s>` / `</s>` | Llama: start/end of sequence |
| `[INST]` / `[/INST]` | Mistral instruction format |
| `<\|begin_of_text\|>` | Llama 3 BOS token |

These tokens are invisible in normal chat but critical in fine-tuning and when building raw prompts.

---

## Context Window Budgeting

For a 200K-token context window:
- System prompt: 500-2,000 tokens
- Conversation history: scales with turns
- Retrieved docs (RAG): 2,000-20,000 tokens
- Tools/function schemas: 200-500 tokens per tool
- Output: 1,000-4,000 tokens reserved

```python
def build_prompt_within_budget(
    system: str,
    history: list[dict],
    context: list[str],
    max_tokens: int = 150_000,  # leave 50K headroom in 200K model
) -> list[dict]:
    system_tokens = count_tokens(system)
    available = max_tokens - system_tokens - 2_000  # reserve for output
    
    # Fit context first (truncate if needed)
    context_text = "\n\n".join(context)
    if count_tokens(context_text) > available // 2:
        # Truncate to fit
        context_text = truncate_to_tokens(context_text, available // 2)
    
    # Then fit history (drop oldest turns if needed)
    # ...
```

---

## Token Costs at Scale

1 billion API calls per day × 500 input tokens average = 500B tokens/day.
At $3/M tokens (Sonnet 4.6): **$1.5M/day**.

Prompt caching (Anthropic) reduces repeated prefixes to 0.1x cost. A 10,000-token system prompt cached across 1M calls saves ~$27K at Sonnet pricing.

---

## Key Facts

- 1 token ≈ 4 characters ≈ 0.75 words for English prose
- CJK and Arabic scripts: 1 character = 1-4 tokens — 3x more expensive than equivalent English
- BPE vocabulary sizes: typically 32K-200K tokens built from frequency merges
- tiktoken encodings: cl100k_base (GPT-4/GPT-4o), o200k_base (GPT-4o-mini/o1)
- Anthropic token counting: `client.messages.count_tokens()` gives exact count before the API call
- 10,000-token system prompt cached across 1M calls saves ~$27K at Sonnet 4.6 pricing ($3/M)
- Multi-digit arithmetic fails partly because numbers tokenise inconsistently across models
- Context window budgeting: tools add 200-500 tokens each; reserve 1,000-4,000 for output

## Connections

- [[llms/transformer-architecture]] — how the model processes token IDs into attention
- [[math/transformer-math]] — attention complexity is O(n²) in token count
- [[apis/anthropic-api]] — prompt caching and token counting API
- [[prompting/context-engineering]] — managing the context window in practice

## Open Questions

- Does Anthropic's tokeniser handle code identifiers better or worse than tiktoken cl100k_base?
- How do vocabulary size differences (32K vs 200K) affect multilingual model quality vs token efficiency?
- Will character-level or byte-level models eventually replace BPE as the dominant approach?
