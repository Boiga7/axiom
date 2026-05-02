---
type: concept
category: multimodal
tags: [image-generation, flux, dall-e, stable-diffusion, midjourney, text-to-image, diffusion, comfyui]
sources: []
updated: 2026-05-01
para: resource
tldr: Flux.1 has displaced Stable Diffusion as the open-source default; DALL-E 3 leads on text-prompt adherence; all major image gen models are accessible via API with no local GPU needed.
---

# Image Generation Models

> **TL;DR** Flux.1 has displaced Stable Diffusion as the open-source default; DALL-E 3 leads on text-prompt adherence; all major image gen models are accessible via API with no local GPU needed.

Text-to-image diffusion models are a separate model family from LLMs. They don't generate tokens, they denoise latent vectors. As of 2026, frontier image gen is accessible via API (no GPU required) or via Replicate/Fal.ai for managed open-source hosting.

---

## Model Landscape (2026)

| Model | Strength | API | Open weights |
|---|---|---|---|
| **DALL-E 3** | Best text adherence, consistent style | OpenAI API | No |
| **Flux.1 [dev]** | Best open-source quality, detail | Replicate, Fal.ai | Yes (non-commercial) |
| **Flux.1 [schnell]** | Fast, open-source | Replicate, Fal.ai | Yes (Apache 2.0) |
| **Stable Diffusion 3.5** | Flexible, ControlNet/LoRA ecosystem | Stability AI API | Yes |
| **Midjourney v6** | Aesthetic quality, art styles | Discord UI only | No |
| **Ideogram 2** | Text-in-image, typography | Ideogram API | No |
| **Adobe Firefly** | Commercial-safe, IP-clean training | Adobe API | No |

Flux.1 [dev] quality matches Midjourney v6 on most prompts. Flux.1 [schnell] is ~12x faster with slightly lower quality. SD3.5 has the richest ecosystem (ControlNet, LoRA fine-tuning, ComfyUI nodes).

---

## DALL-E 3 via OpenAI API

```python
from openai import OpenAI
import httpx

client = OpenAI()

# Generate image
response = client.images.generate(
    model="dall-e-3",
    prompt="A photorealistic neural network visualised as glowing blue synapses in a dark void, macro photography style",
    size="1024x1024",    # "1024x1024", "1792x1024", "1024x1792"
    quality="hd",        # "standard" or "hd" (2x cost, more detail)
    n=1,                 # DALL-E 3 always n=1
    style="natural",     # "vivid" (dramatic) or "natural" (realistic)
    response_format="url",
)

image_url = response.data[0].url
revised_prompt = response.data[0].revised_prompt  # DALL-E often improves your prompt

# Download the image (URL expires after 1 hour)
image_bytes = httpx.get(image_url).content
with open("output.png", "wb") as f:
    f.write(image_bytes)
```

DALL-E 3 internally rewrites prompts for better results. `revised_prompt` shows what it actually used. Useful for debugging why the output differs from expectations.

**Pricing (2026-05-01):** HD 1024×1024: $0.080 per image. Standard: $0.040.

---

## Flux via Replicate

Replicate hosts Flux.1 as a managed API. No GPU setup required:

```python
import replicate
import httpx

output = replicate.run(
    "black-forest-labs/flux-1.1-pro",  # or "black-forest-labs/flux-schnell"
    input={
        "prompt": "A detailed architectural diagram of a RAG pipeline, technical illustration, blueprint style",
        "width": 1440,
        "height": 1440,
        "num_outputs": 1,
        "num_inference_steps": 25,  # schnell: 4 steps; dev: 25-50
        "guidance_scale": 3.5,      # how closely to follow the prompt
        "output_format": "webp",
        "output_quality": 90,
    }
)

# output is a list of FileOutput objects
image_url = str(output[0])
image_bytes = httpx.get(image_url).content
with open("output.webp", "wb") as f:
    f.write(image_bytes)
```

**Flux.1 [schnell]** is Apache 2.0 licensed — safe for commercial use in products.  
**Flux.1 [dev]** is higher quality but non-commercial only.

---

## Fal.ai API (Faster, Cheaper for Flux)

Fal.ai typically 2-4x faster and cheaper than Replicate for Flux:

```python
import fal_client

result = fal_client.run(
    "fal-ai/flux/dev",
    arguments={
        "prompt": "A clean minimal icon of a brain circuit board, flat design, dark background",
        "image_size": "square_hd",  # 1024x1024
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
        "num_images": 1,
        "enable_safety_checker": True,
    }
)

image_url = result["images"][0]["url"]
```

---

## Stable Diffusion 3.5 via Stability AI API

```python
import stability_sdk.client as stability_client
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation

stability_api = stability_client.StabilityInference(
    key=os.environ["STABILITY_API_KEY"],
    verbose=False,
)

answers = stability_api.generate(
    prompt="Technical diagram of transformer attention mechanism, clean white background, labeled",
    height=1024,
    width=1024,
    cfg_scale=7.0,      # prompt adherence (higher = closer to prompt)
    sampler=generation.SAMPLER_K_DPMPP_2M,
    steps=30,
    samples=1,
)

for resp in answers:
    for artifact in resp.artifacts:
        if artifact.finish_reason == generation.FILTER:
            print("Safety filter triggered")
        elif artifact.type == generation.ARTIFACT_IMAGE:
            with open("output.png", "wb") as f:
                f.write(artifact.binary)
```

---

## Prompt Engineering for Image Generation

Image gen prompts work differently from LLM prompts. Key patterns:

**Style tokens work:** `photorealistic`, `hyperrealistic`, `4k`, `8k`, `artstation`, `oil painting`, `watercolour`, `digital art`, `isometric`, `flat design`, `blueprint`, `wireframe`

**Composition control:** `close-up`, `wide shot`, `overhead view`, `bokeh background`, `dramatic lighting`, `soft studio lighting`

**Negative prompts** (Stable Diffusion / some Flux configs): `ugly, blurry, low quality, watermark, text, signature`

**What works for technical diagrams:**
```
"clean architectural diagram of [concept], technical illustration, white background, 
labeled components, professional diagram style, vector art"
```

DALL-E 3 is best for prompts with text that must be readable in the image (labels, signs). Flux is better for photorealistic and artistic content.

---

## Running Flux Locally

For privacy or cost reasons. Requires ~12GB VRAM (RTX 3080 or better):

```bash
pip install diffusers transformers accelerate
```

```python
import torch
from diffusers import FluxPipeline

# Downloads ~24GB of model weights on first run
pipe = FluxPipeline.from_pretrained(
    "black-forest-labs/FLUX.1-dev",
    torch_dtype=torch.bfloat16
)
pipe.enable_model_cpu_offload()  # reduces VRAM requirement

image = pipe(
    "A photorealistic diagram of a vector database with glowing nodes",
    height=1024,
    width=1024,
    guidance_scale=3.5,
    num_inference_steps=50,
    generator=torch.Generator("cpu").manual_seed(42),  # reproducible
).images[0]

image.save("output.png")
```

**ComfyUI** is the standard GUI for local SD/Flux workflows — node-based editor, ControlNet, LoRA loading, inpainting. Install from `comfyanonymous/ComfyUI` on GitHub.

---

## Key Facts

- Flux.1 [schnell]: Apache 2.0, 4 inference steps, fastest open-source quality; good for products
- Flux.1 [dev]: non-commercial, 25-50 steps, highest quality open-source image gen as of 2026
- DALL-E 3 always rewrites your prompt internally — check `revised_prompt` to understand the output
- Stable Diffusion 3.5 ecosystem: ControlNet (pose/edge guidance), LoRA fine-tuning, ComfyUI nodes
- Midjourney v6: Discord-only interface, no API, highest aesthetic consistency for artistic styles
- Ideogram 2: the best model for generating images with readable text embedded in them
- Local Flux: needs ~12GB VRAM (fp16) or ~8GB with quantisation via `diffusers`

## Common Failure Cases

**DALL-E 3 `revised_prompt` shows the model silently modified the prompt to remove a key element, explaining why the output looks wrong**  
Why: DALL-E 3 internally rewrites prompts to improve safety and coherence; if your prompt contains elements that trigger content policy checks, those elements are quietly removed from the revised prompt, producing an image that omits them entirely with no error.  
Detect: the output image is missing a requested element; checking `response.data[0].revised_prompt` shows the missing element was stripped; the API returned 200 with no error.  
Fix: log `revised_prompt` on every call; if the revised prompt is substantially different from the original, surface this to the user or retry with a differently-phrased prompt; avoid terms that commonly trigger policy rewrites.

**Replicate Flux generation returns a stale cached URL that has expired, causing `httpx.get(image_url)` to return a 403**  
Why: Replicate output URLs are signed and expire after a few minutes; if the pipeline stores the URL and downloads it later (or the download is delayed), the URL is no longer valid.  
Detect: `httpx.get(image_url)` returns HTTP 403 or 410; the URL timestamp in the path shows it was generated more than a few minutes ago.  
Fix: download the image immediately after generation completes and persist the bytes, not the URL; never cache Replicate or Fal.ai output URLs for more than a few minutes.

**Local Flux pipeline runs out of VRAM mid-generation because `enable_model_cpu_offload()` was not called and the full model is loaded to GPU**  
Why: `FluxPipeline.from_pretrained()` loads the full model to GPU by default; at bfloat16, Flux.1 [dev] requires ~24GB VRAM; without CPU offloading, the pipeline crashes with `CUDA out of memory` on cards with less than 24GB.  
Detect: `torch.cuda.OutOfMemoryError` occurs during pipeline loading or on the first inference call; `nvidia-smi` shows GPU memory near capacity before the generation starts.  
Fix: always call `pipe.enable_model_cpu_offload()` after loading the pipeline; this reduces peak VRAM to ~12GB by swapping model components between CPU and GPU as needed; for cards with <8GB, use Flux [schnell] with quantisation.

## Connections

- [[multimodal/vision]] — image understanding is a separate capability from generation; Claude reads but doesn't generate images
- [[multimodal/audio]] — audio generation follows similar managed API patterns (ElevenLabs for voice)
- [[apis/anthropic-api]] — Claude cannot generate images; use the image gen APIs above alongside Claude for vision+generation pipelines
- [[infra/gpu-hardware]] — local image gen GPU requirements; RTX 3080+ for Flux
