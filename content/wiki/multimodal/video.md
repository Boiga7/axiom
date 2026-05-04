---
type: concept
category: multimodal
tags: [video, multimodal, gemini, video-understanding, video-generation, sora, temporal-reasoning]
sources: []
updated: 2026-05-01
para: resource
tldr: Gemini 1.5 Pro / 2.0 Flash are the frontier for video understanding — 1M token context handles full-length films; video generation (Sora, Veo, Runway) is improving fast but still unreliable for complex motion.
---

# Video AI

> **TL;DR** Gemini 1.5 Pro / 2.0 Flash are the frontier for video understanding — 1M token context handles full-length films; video generation (Sora, Veo, Runway) is improving fast but still unreliable for complex motion.

Video is the last major modality to reach production quality. Understanding lags image understanding by about two years. Generation lags further. Claude does not natively process video. Gemini is the practical option for video understanding tasks.

---

## Video Understanding

### Gemini Video API

Gemini 1.5 Pro and 2.0 Flash are the primary APIs for video understanding. Both support uploading video files and asking questions across the full temporal span.

```python
import google.generativeai as genai
import time

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# Upload video file (Files API — handles files >20MB)
video_file = genai.upload_file("product_demo.mp4")

# Wait for processing
while video_file.state.name == "PROCESSING":
    time.sleep(5)
    video_file = genai.get_file(video_file.name)

if video_file.state.name == "FAILED":
    raise ValueError("Video processing failed")

# Query across the full video
model = genai.GenerativeModel("gemini-2.0-flash")
response = model.generate_content([
    video_file,
    "List every distinct feature demonstrated in this product demo video. "
    "Include timestamps for each feature introduction."
])
print(response.text)
```

**Supported formats:** MP4, MPEG, MOV, AVI, FLV, MKV, WebM  
**Max file size:** 2GB via Files API  
**Max video duration:** Gemini 1.5 Pro supports ~1 hour at 1fps (1M token context)

### What Gemini Can Do With Video

```python
# Temporal reasoning — what happens at a specific time
response = model.generate_content([
    video_file,
    "What is happening in the video between the 2-minute and 3-minute mark?"
])

# Object tracking
response = model.generate_content([
    video_file,
    "Track the main character's movement through the scene. "
    "Describe their position at each major scene transition."
])

# Content moderation
response = model.generate_content([
    video_file,
    "Does this video contain any of the following: violence, explicit content, "
    "drug use? Answer yes/no for each and provide timestamps if yes."
])

# Meeting/lecture summarisation
response = model.generate_content([
    video_file,
    "Summarise the key decisions made in this meeting. "
    "Format as bullet points with the speaker's name and timestamp."
])
```

### Token Costs for Video

Gemini counts video frames as tokens. Default: 1fps (1 frame per second).

```
1 video frame ≈ 258 tokens
1 minute of video at 1fps ≈ 15,480 tokens
10-minute video ≈ 154,800 tokens
```

For long videos, explicitly set a lower frame rate:

```python
response = model.generate_content([
    genai.Part.from_uri(video_file.uri, mime_type="video/mp4"),
    "Summarise the key segments of this 30-minute video.",
])
# Or specify fps via video metadata
```

---

## Video Generation

### Current Landscape (2026)

| Model | Strength | Access | Notes |
|---|---|---|---|
| **Sora (OpenAI)** | Highest quality motion | sora.com | Web UI only; limited API |
| **Veo 2 (Google)** | Realistic physics, camera motion | VideoFX, API preview | Best temporal consistency |
| **Runway Gen-3 Alpha** | Creative, artistic | API + web | Best for artistic/stylised |
| **Pika Labs** | Fast, lip sync | Pika API | Good for social content |
| **Kling AI** | Long clips (2 min) | API | Strong character consistency |
| **Luma Dream Machine** | Speed | API | Fast turnaround |

Video generation is still not reliable for: complex object interactions, physics simulation, consistent identity across shots, text readability in video.

### Runway Gen-3 via API

```python
import runwayml

client = runwayml.RunwayML()

# Text-to-video
task = client.image_to_video.create(
    model="gen3a_turbo",
    prompt_image="https://example.com/first-frame.jpg",  # starting frame
    prompt_text="Camera slowly pulls back to reveal a server room filled with glowing GPUs",
    duration=10,       # seconds; max 10 for gen3
    ratio="1280:768",
    watermark=False,
)

# Poll until complete
import time
while task.status not in ("SUCCEEDED", "FAILED"):
    time.sleep(10)
    task = client.tasks.retrieve(task.id)

if task.status == "SUCCEEDED":
    video_url = task.output[0]
    print(f"Video ready: {video_url}")
```

### Luma Dream Machine

```python
from lumaai import LumaAI

client = LumaAI(auth_token=os.environ["LUMAAI_API_KEY"])

generation = client.generations.create(
    prompt="A neural network training visualised as sparks of electricity between nodes, cinematic",
    model="dream-machine",
    loop=False,
    duration="5s",       # "5s" or "10s"
    aspect_ratio="16:9",
)

# Poll for completion
while generation.state not in ("completed", "failed"):
    time.sleep(5)
    generation = client.generations.get(id=generation.id)

video_url = generation.assets.video
```

---

## Video Understanding Without Gemini

For self-hosted or cost-sensitive use cases:

### Frame Extraction + Vision Model

Any vision-capable LLM (including Claude) can analyse video if you extract frames:

```python
import cv2
import base64
import anthropic

def extract_frames(video_path: str, interval_seconds: int = 5) -> list[str]:
    """Extract frames every N seconds, return as base64 PNG."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % (int(fps) * interval_seconds) == 0:
            _, buffer = cv2.imencode(".png", frame)
            frames.append(base64.standard_b64encode(buffer).decode())

        frame_idx += 1

    cap.release()
    return frames

def analyse_video_with_claude(video_path: str) -> str:
    frames = extract_frames(video_path, interval_seconds=10)

    # Claude can handle up to ~20 images per request
    # For longer videos, batch or summarise in chunks
    content = [{"type": "text", "text": "These frames are extracted from a video at 10-second intervals. Describe what's happening across the video."}]
    for frame_b64 in frames[:20]:  # cap at 20 frames
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": frame_b64}
        })

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": content}]
    )
    return response.content[0].text
```

**Limitation:** Frame-by-frame misses motion continuity. Gemini's native video processing preserves temporal relationships.

### Whisper for Video Audio

```python
import whisper

model = whisper.load_model("large-v3")

# Whisper accepts video files directly (extracts audio internally)
result = model.transcribe("video.mp4")
print(result["text"])

# With speaker-labelled segments
for segment in result["segments"]:
    print(f"[{segment['start']:.1f}s - {segment['end']:.1f}s] {segment['text']}")
```

Combined pattern: Whisper for transcript + Gemini (or frame extraction + Claude) for visual content = full video understanding without a single native video API.

---

## Key Facts

- Gemini 2.0 Flash: fastest video understanding API; 1M context supports ~1 hour of video at 1fps
- Video tokens: 1 frame ≈ 258 Gemini tokens; a 10-min video at 1fps ≈ 155K tokens
- Sora: highest quality video generation as of 2026; web UI only, limited API access
- Veo 2: best physics simulation and camera movement; Google Labs access
- Frame extraction fallback: `cv2.VideoCapture` + Claude vision handles video without Gemini; loses temporal continuity
- Runway Gen-3: best commercially accessible API for text-to-video; 10s max clip length
- Video gen common failures: physics (objects pass through each other), text legibility, identity consistency across cuts

## Common Failure Cases

**Gemini `video_file.state.name` stays `"PROCESSING"` indefinitely because the video codec is not supported and the upload failed silently**  
Why: Gemini's Files API accepts many video formats but some codec/container combinations (e.g., H.265 in MKV, certain HEVC encodings) fail during server-side processing; the file object is created and the state transitions to `PROCESSING` but never reaches `ACTIVE`.  
Detect: the polling loop runs for more than 5 minutes without state change; adding a timeout check reveals the file is stuck; re-uploading the same video re-encoded to H.264 MP4 processes successfully.  
Fix: add a timeout to the polling loop (e.g., fail after 10 minutes); re-encode problematic videos to H.264 MP4 before upload using `ffmpeg -c:v libx264 input.mkv output.mp4`.

**Token cost for a 30-minute meeting video exceeds the Gemini context window, causing a 400 error**  
Why: at 1fps, 30 minutes = 1,800 frames × 258 tokens = ~464,400 tokens; combined with a long system prompt and expected output, this may exceed the 1M token limit for some Gemini models or incur unexpectedly high costs.  
Detect: the API returns `400 Request payload size exceeds the limit`; checking `1_800 * 258` confirms the video alone consumes half the context window.  
Fix: reduce frame rate by specifying a lower fps in the content part; for meeting summarisation, Whisper transcription + Claude is often cheaper (audio-only, no frames) and sufficient when the visual content is not needed.

**Frame extraction with Claude misses temporal events because `interval_seconds=5` skips a 3-second action that happens between frames**  
Why: sampling at fixed intervals does not capture brief events (a chart displayed for 2 seconds, a speaker change); the frame-extraction approach loses all continuity between samples.  
Detect: Claude's analysis omits events that are clearly visible in the video at timestamps not aligned to the sampling interval; reducing `interval_seconds` to 1 captures more events at the cost of more tokens.  
Fix: for event-dense content, use Gemini's native video processing instead of frame extraction; if Gemini is unavailable, sample at 1 fps and add a Whisper transcript as additional context for temporal anchoring.

## Connections

- [[multimodal/vision]] — image understanding; Gemini, Claude, and GPT-4V all handle images
- [[multimodal/audio]] — Whisper for video audio transcription alongside visual analysis
- [[multimodal/image-generation]] — image gen is more mature and reliable than video gen
- [[apis/anthropic-api]] — Claude does not natively process video; use frame extraction or Gemini
- [[llms/model-families]] — Gemini 1.5 Pro / 2.0 Flash are the primary video-capable models
## Open Questions

- What input types or combinations produce unexpectedly poor results?
- How does quality degrade at the edges of the training distribution?
