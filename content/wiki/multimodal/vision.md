---
type: concept
category: multimodal
tags: [vision, vlm, multimodal, documents, pdf, images, claude-vision, gpt-4v]
sources: []
updated: 2026-04-29
para: resource
tldr: VLM architecture (ViT encoder → projection → LLM), Claude's document-understanding strength, multimodal RAG with ColPali, and image generation model comparison.
---

# Vision and Multimodal AI

> **TL;DR** VLM architecture (ViT encoder → projection → LLM), Claude's document-understanding strength, multimodal RAG with ColPali, and image generation model comparison.

Models that process multiple modalities (text, images, audio, video) in a unified architecture. As of 2026, vision is default on all frontier models. "Multimodal" no longer means experimental.

---

## The Vision Pipeline

How VLMs process images:

```
Image
  ↓ [Vision encoder — ViT or similar]
Image patch embeddings (e.g. 1,024 tokens for a 1024×1024 image)
  ↓ [Projection layer]
Visual tokens in language model space
  ↓ [LLM with interleaved text + visual tokens]
Text output
```

The vision encoder (typically a ViT, Vision Transformer) divides the image into patches (16×16 or 32×32 pixels), embeds each as a vector, and feeds these into the language model alongside text tokens. The LLM treats visual tokens like text tokens.

---

## Frontier VLMs (April 2026)

| Model | Vision strength | Notes |
|---|---|---|
| **Claude Opus / Sonnet** | Best-in-class document understanding | PDF parsing, table extraction, chart reading |
| **GPT-4V / GPT-4o** | Strong general vision | Real-time audio + video in GPT-4o |
| **Gemini 1.5 Pro / Ultra** | Native multimodal from training | Best video understanding; 1M context |
| **LLaVA-1.6 / Idefics3** | Open-source | Good for self-hosted vision tasks |
| **Qwen-VL** | Strong for documents + Chinese | Best open OCR |

> [Source: general knowledge as of 2026-04-29, specific benchmark rankings may vary] [unverified]

---

## Claude Vision

Claude's vision capability is strongest for **document understanding**: reading PDFs, extracting tables, interpreting charts and technical diagrams.

### Sending Images via the API

```python
import anthropic, base64

with open("diagram.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_data,
                }
            },
            {"type": "text", "text": "Describe the architecture shown in this diagram."}
        ]
    }]
)
```

**URL instead of base64:**
```python
"source": {"type": "url", "url": "https://example.com/image.png"}
```

Use URL for publicly accessible images. Use base64 for local files, private images, or when you need offline reproducibility.

**Supported formats:** JPEG, PNG, GIF, WebP.

### Vision Limitations

- No text recognition from handwriting (weak OCR on cursive/stylised text)
- Counting objects > ~20 is unreliable
- Spatial reasoning ("is X to the left of Y") degrades for complex scenes
- Maximum image size varies by model — resize images > 2MB before sending

---

## Document Processing

The primary production use case for Claude vision. Processing PDFs, financial statements, legal docs, technical drawings.

**PDF workflow:**
```python
with open("contract.pdf", "rb") as f:
    pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_data}
            },
            {"type": "text", "text": "Extract all payment terms and conditions."}
        ]
    }]
)
```

For very long PDFs (50+ pages): use the Files API to upload once and reference by ID, rather than base64-encoding on every call.

**Table extraction:** Claude handles tables in PDFs better than most OCR tools. Request output as JSON or markdown table for structured downstream processing.

---

## Multimodal RAG

Combining vision with retrieval. Two approaches:

**Text-centric:** Extract text + structure from documents (using vision), embed the extracted text, retrieve textually. Works well for most document Q&A.

**True multimodal RAG (ColPali):** Embed document *images* directly using a VLM-based embedder. Retrieve by visual similarity. Better for heavily visual documents (charts, diagrams, slide decks). Slower and more expensive. ColPali model (2024) enables this.

---

## Audio

| Task | Best tool | Notes |
|---|---|---|
| Speech-to-text | Whisper (OpenAI) | Open-source, runs locally, multilingual |
| Text-to-speech | ElevenLabs, OpenAI TTS | High quality voices |
| Real-time audio | GPT-4o Realtime API | Ultra-low latency voice; not Claude-native |

Claude does not natively process audio input. For voice-to-Claude pipelines: Whisper → text → Claude → TTS.

---

## Image Generation

Not Claude's domain. Generation is a separate model family.

| Model | Strength | Notes |
|---|---|---|
| **DALL-E 3** | Best text adherence | Via OpenAI API; integrates with ChatGPT |
| **Flux.1** | Best open-source quality | Replaces Stable Diffusion in most workflows |
| **Stable Diffusion 3** | Open, flexible | ControlNet, LoRA fine-tuning |
| **Midjourney v6** | Aesthetic quality | No API; Discord only |
| **Ideogram 2** | Text in images | Best for designs with embedded text |

---

## Key Facts

- VLM image → tokens: a 1024×1024 image → ~1,024 patch embeddings fed to the LLM alongside text
- Claude supported image formats: JPEG, PNG, GIF, WebP; resize images >2MB before sending
- Claude vision weakness: handwriting OCR, counting objects >20, complex spatial reasoning
- PDF via Files API: upload once, reference by ID; avoids re-encoding base64 on every call
- True multimodal RAG (ColPali, 2024): embeds document images directly; better for chart/diagram-heavy docs
- Claude does not natively process audio input — pipeline is Whisper→text→Claude→TTS
- Flux.1 has largely replaced Stable Diffusion as the open-source image generation default

## Common Failure Cases

**Image sent as `"type": "url"` is not accessible by Claude because the URL requires authentication or is behind a VPN**  
Why: Claude fetches URL-referenced images from its own servers; any URL that requires cookies, auth headers, or is not publicly reachable returns a 403 or 404 when Claude attempts to fetch it; the API returns a successful response but the model cannot see the image.  
Detect: the model responds as if no image was provided ("I don't see any image in your message"); switching to base64 encoding of the same image resolves the issue.  
Fix: use base64 encoding for any non-public image; reserve URL references for truly public, unauthenticated URLs (e.g., public S3 objects, CDN assets without signed URLs).

**`base64.standard_b64encode(f.read()).decode("utf-8")` encodes a large image that exceeds Claude's per-image token limit, causing a 400 error**  
Why: Claude converts images to patch embeddings; a very high-resolution image (e.g., a 6000×4000 photo) generates thousands of tokens; combined with the text prompt, this may exceed the model's input token limit.  
Detect: the API returns `400 Request too large` or the token usage in the response shows unexpectedly high input token counts for a simple image query.  
Fix: resize images before encoding — target 1024×1024 or smaller for most tasks; use `PIL.Image.thumbnail((1024, 1024))` to resize in-place without distortion; for document PDFs, use the document block type rather than sending each page as an image.

**Counting objects in an image returns systematically wrong results because the image contains more than ~15-20 instances**  
Why: Claude's spatial reasoning degrades for dense counting tasks; it reliably counts 5-10 items but undercounts or approximates when items exceed ~15-20, especially if they are small or overlapping.  
Detect: asking "how many X are in this image?" returns an answer that differs from the ground truth by more than 10%; the error rate increases with the number of items.  
Fix: for counting tasks, use a dedicated object detection model (YOLO, Detectron2) rather than a VLM; or ask Claude to count by segmenting the image into quadrants and summing the partial counts.

## Connections

- [[apis/anthropic-api]] — vision in the Messages API; Files API for large PDFs
- [[rag/pipeline]] — multimodal RAG patterns
- [[llms/transformer-architecture]] — how ViT encoders integrate with LLMs
- [[prompting/techniques]] — prompting strategies with image context
- [[multimodal/audio]] — audio capabilities alongside vision
- [[multimodal/document-processing]] — deep dive on PDF extraction pipelines, OCR, and table extraction with Claude
- [[multimodal/video]] — video understanding with Gemini; frame extraction fallback for Claude
- [[multimodal/image-generation]] — DALL-E 3, Flux, Stable Diffusion — generation is a separate model family from understanding

## Open Questions

- When will Claude gain native audio input, and will it use a ViT-style audio encoder or a different architecture?
- Does ColPali's visual embedding approach scale to very long documents (100+ pages) without prohibitive cost?
- How does Claude's document understanding compare to specialised document AI tools (AWS Textract, Azure Document Intelligence) for structured extraction tasks?
