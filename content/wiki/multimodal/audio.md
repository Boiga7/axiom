---
type: concept
category: multimodal
tags: [audio, whisper, tts, voice-agents, speech-to-text, elevenlabs, openai-audio]
sources: []
updated: 2026-04-29
para: resource
tldr: ASR (Whisper/Deepgram) + LLM + TTS (ElevenLabs/OpenAI) voice pipeline — targeting 300-700ms latency via sentence-boundary streaming and fastest model selection.
---

# Audio and Voice AI

> **TL;DR** ASR (Whisper/Deepgram) + LLM + TTS (ElevenLabs/OpenAI) voice pipeline — targeting 300-700ms latency via sentence-boundary streaming and fastest model selection.

Speech-to-text, text-to-speech, and voice agents. Audio is the interface where LLMs stop being text tools and become genuinely conversational. The stack: Whisper (or Deepgram) for ASR, an LLM for reasoning, ElevenLabs (or OpenAI TTS) for synthesis.

---

## ASR (Automatic Speech Recognition)

### Whisper

OpenAI's open-source ASR model. Best open-source accuracy across 99 languages.

```python
import whisper

# Load model (tiny/base/small/medium/large-v3)
# large-v3: highest accuracy, requires ~10GB VRAM
# small: good balance for most use cases, ~2GB VRAM
model = whisper.load_model("large-v3")

# Transcribe file
result = model.transcribe("audio.mp3")
print(result["text"])

# With word timestamps
result = model.transcribe("audio.mp3", word_timestamps=True)
for segment in result["segments"]:
    for word in segment["words"]:
        print(f"{word['start']:.2f}s: {word['word']}")

# Translate to English (any language → English)
result = model.transcribe("french_audio.mp3", task="translate")
```

### faster-whisper

4x faster than original Whisper, same accuracy. Uses CTranslate2 backend.

```python
from faster_whisper import WhisperModel

# Download quantised model (INT8 — smaller, faster)
model = WhisperModel("large-v3", device="cuda", compute_type="int8")

segments, info = model.transcribe("audio.mp3", beam_size=5)

print(f"Detected language: {info.language} ({info.language_probability:.0%})")
for segment in segments:
    print(f"[{segment.start:.2f}s → {segment.end:.2f}s] {segment.text}")
```

### OpenAI Whisper API

Managed, no GPU needed:

```python
from openai import OpenAI
client = OpenAI()

with open("speech.mp3", "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="verbose_json",  # includes word timestamps
        timestamp_granularities=["word"],
    )

print(transcript.text)
for word in transcript.words:
    print(f"{word.word}: {word.start:.2f}s")
```

### Deepgram

Fastest real-time ASR, best for live streaming. 30-50% cheaper than Whisper API at scale.

```python
from deepgram import DeepgramClient, PrerecordedOptions

dg = DeepgramClient("DEEPGRAM_API_KEY")

with open("audio.mp3", "rb") as f:
    buffer_data = f.read()

options = PrerecordedOptions(
    model="nova-3",              # Deepgram's latest model
    smart_format=True,           # auto-punctuation, paragraphs
    diarize=True,                # speaker separation
    language="en-US",
)

response = dg.listen.rest.v("1").transcribe_file(
    {"buffer": buffer_data, "mimetype": "audio/mp3"},
    options,
)
print(response.results.channels[0].alternatives[0].transcript)
```

---

## TTS (Text-to-Speech)

### ElevenLabs

Best quality. Natural-sounding, emotion-aware, voice cloning.

```python
from elevenlabs import ElevenLabs, VoiceSettings

client = ElevenLabs(api_key="ELEVENLABS_API_KEY")

# Generate speech
audio = client.text_to_speech.convert(
    voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel voice
    text="Hello, how can I help you today?",
    model_id="eleven_turbo_v2_5",      # fastest, lowest latency
    voice_settings=VoiceSettings(
        stability=0.5,
        similarity_boost=0.75,
        style=0.0,
        use_speaker_boost=True,
    ),
)

# Write to file
with open("output.mp3", "wb") as f:
    for chunk in audio:
        f.write(chunk)
```

### OpenAI TTS

Simpler, cheaper, lower latency than ElevenLabs. Good enough for most applications.

```python
from openai import OpenAI
from pathlib import Path

client = OpenAI()

# Generate speech
response = client.audio.speech.create(
    model="tts-1",          # or "tts-1-hd" (higher quality, slower)
    voice="alloy",          # alloy/echo/fable/onyx/nova/shimmer
    input="The quick brown fox jumps over the lazy dog.",
    speed=1.0,              # 0.25 to 4.0
)

# Stream to file
response.stream_to_file("output.mp3")
```

### Streaming TTS for Low Latency

The key to a natural voice assistant: start speaking before the LLM finishes generating.

```python
import asyncio
import anthropic
from elevenlabs import ElevenLabs, stream as el_stream

async def voice_response(user_text: str):
    anthropic_client = anthropic.Anthropic()
    el_client = ElevenLabs(api_key="ELEVENLABS_API_KEY")

    # Collect LLM chunks and feed to TTS
    text_buffer = ""

    with anthropic_client.messages.stream(
        model="claude-haiku-4-5-20251001",  # fast model for voice
        max_tokens=300,
        messages=[{"role": "user", "content": user_text}],
    ) as stream:
        for text in stream.text_stream:
            text_buffer += text

            # When we have a complete sentence, synthesise it
            if text_buffer.endswith((".", "!", "?", "\n")):
                audio = el_client.text_to_speech.convert(
                    text=text_buffer,
                    voice_id="21m00Tcm4TlvDq8ikWAM",
                    model_id="eleven_turbo_v2_5",
                )
                el_stream(audio)  # play audio immediately
                text_buffer = ""
```

---

## Voice Agents

Full pipeline: capture audio → transcribe → LLM → synthesise → play.

```python
import asyncio
import pyaudio
import anthropic
import whisper
from elevenlabs import ElevenLabs

class VoiceAgent:
    def __init__(self):
        self.whisper = whisper.load_model("base")
        self.llm = anthropic.Anthropic()
        self.tts = ElevenLabs(api_key="ELEVENLABS_API_KEY")
        self.conversation_history = []

    def record_audio(self, duration: int = 5) -> bytes:
        """Record from microphone."""
        p = pyaudio.PyAudio()
        stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True)
        frames = [stream.read(1024) for _ in range(0, int(16000 / 1024 * duration))]
        stream.close()
        p.terminate()
        return b"".join(frames)

    def transcribe(self, audio_bytes: bytes) -> str:
        result = self.whisper.transcribe(audio_bytes)
        return result["text"].strip()

    def respond(self, user_text: str) -> str:
        self.conversation_history.append({"role": "user", "content": user_text})
        response = self.llm.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=self.conversation_history,
        )
        assistant_text = response.content[0].text
        self.conversation_history.append({"role": "assistant", "content": assistant_text})
        return assistant_text

    def speak(self, text: str):
        audio = self.tts.text_to_speech.convert(
            text=text,
            voice_id="21m00Tcm4TlvDq8ikWAM",
            model_id="eleven_turbo_v2_5",
        )
        # Play audio...
```

---

## OpenAI Realtime API

GPT-4o's real-time audio API — handles ASR + LLM + TTS in one WebSocket connection. Lowest latency for voice applications.

```python
import websockets
import json
import base64

async def realtime_session():
    url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }

    async with websockets.connect(url, extra_headers=headers) as ws:
        # Configure session
        await ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "voice": "alloy",
                "instructions": "You are a helpful voice assistant.",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
            }
        }))

        # Send audio chunks
        audio_chunk = get_audio_chunk()  # raw PCM16 bytes
        await ws.send(json.dumps({
            "type": "input_audio_buffer.append",
            "audio": base64.b64encode(audio_chunk).decode(),
        }))

        # Receive audio response
        async for message in ws:
            event = json.loads(message)
            if event["type"] == "response.audio.delta":
                audio_bytes = base64.b64decode(event["delta"])
                play_audio(audio_bytes)
```

---

## Latency Targets for Voice

Human conversation expects <300ms response time. Full pipeline breakdown:

| Component | Latency |
|---|---|
| ASR (Deepgram streaming) | 50-150ms |
| LLM (Haiku, first token) | 100-300ms |
| TTS (ElevenLabs Turbo) | 100-200ms |
| Audio playback start | 50ms |
| **Total** | **300-700ms** |

Optimisations:
- Use streaming for all three components (don't wait for complete outputs)
- Sentence-boundary TTS (synthesise at `.`, `!`, `?`)
- Use fastest models: Deepgram Nova-3, Claude Haiku, ElevenLabs Turbo v2.5
- Pre-warm TTS connections

---

## Key Facts

- Whisper large-v3: highest open-source ASR accuracy, ~10GB VRAM; small model ~2GB VRAM
- faster-whisper: 4x faster than original Whisper at same accuracy via CTranslate2 + INT8 quant
- Deepgram Nova-3: fastest real-time streaming ASR; 30-50% cheaper than Whisper API at scale
- ElevenLabs eleven_turbo_v2_5: fastest TTS model, lowest latency for voice applications
- OpenAI TTS: tts-1 (fast/cheap) vs tts-1-hd (higher quality, slower); 6 voice options
- Human conversation target: <300ms response; realistic full pipeline: 300-700ms
- Sentence-boundary streaming (synthesise at `.`, `!`, `?`) is the primary latency optimisation
- OpenAI Realtime API: WebSocket, PCM16 audio, handles ASR+LLM+TTS in one connection

## Connections

- [[multimodal/vision]] — vision capabilities alongside audio
- [[llms/model-families]] — which models support native audio
- [[agents/react-pattern]] — voice agents as a specialisation of agentic loops
- [[web-frameworks/fastapi]] — serving the voice pipeline via WebSocket

## Open Questions

- Will Anthropic add native audio input/output to Claude, or will Whisper→Claude→TTS remain the standard pipeline?
- At what scale does Deepgram's cost advantage over Whisper API justify the migration from OpenAI's ecosystem?
- How much latency reduction does the OpenAI Realtime API actually achieve over a well-optimised Whisper+GPT-4o+TTS pipeline?
