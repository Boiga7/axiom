---
type: concept
category: agents
para: resource
tags: [voice-agents, livekit, pipecat, vapi, retell, realtime, STT, TTS, pipeline, VAD, webrtc, telephony]
sources: []
updated: 2026-05-03
tldr: "Voice agents run on either a pipeline (STT+LLM+TTS, 800ms–2s, most production) or a native multimodal model (GPT-4o Realtime/Gemini Live, 200–500ms); LiveKit Agents v1.5 is the leading open-source framework, VAPI/Retell for managed deployment."
---

# Voice Agents

> **TL;DR** Two architectures: pipeline (STT+LLM+TTS, 800ms–2s, debuggable, most production) and native multimodal (GPT-4o Realtime/Gemini Live, 200–500ms, lower latency but opaque). LiveKit Agents v1.5 is the leading open-source framework. VAPI and Retell for managed phone deployment.

Voice agents turn LLMs into real-time conversational systems. The stack has two distinct shapes — a composable pipeline of specialist models, or a single model that processes audio natively end-to-end. The right choice depends on latency requirements, debuggability needs, and infrastructure appetite.

---

## Architecture 1: Pipeline (STT → LLM → TTS)

The dominant production pattern. Three independent stages connected by text buffers.

```
Microphone → VAD → STT → LLM (streaming) → sentence buffer → TTS → Speaker
                                          ↑
                               Interruption detection clears queue here
```

**Stages:**

| Stage | Options | Latency contribution |
|---|---|---|
| STT | Deepgram Nova-3 (streaming), Whisper (batch), faster-whisper | 50–150ms |
| LLM | Claude Haiku, GPT-4o-mini, Llama 3 (Groq LPU) | 100–400ms (first token) |
| TTS | ElevenLabs Turbo v2.5, Cartesia, Kokoro (open-source), OpenAI TTS | 100–200ms |
| **Total E2E** | | **800ms–2s** |

**Latency optimisation:** Stream all three stages concurrently. Start TTS synthesis at the first sentence boundary (`.`, `!`, `?`) rather than waiting for the LLM to finish. Pre-warm TTS connections. Use fastest models per stage (Deepgram > Whisper API for streaming; Haiku/GPT-4o-mini > larger models for TTFT).

**Why pipeline wins in production:** Each component is independently testable, swappable, and observable. Debugging a pipeline is straightforward — you can inspect the transcript, the LLM output, and the TTS input independently. Switching STT providers or LLMs doesn't require changing anything else.

See [[multimodal/audio]] for ASR and TTS model specifics, streaming patterns, and code examples.

---

## Architecture 2: Native Multimodal / Realtime

A single model processes audio input and generates audio output directly, bypassing the STT→text→TTS round trip. Lower latency; less modular.

### GPT-4o Realtime API

OpenAI's production realtime offering. WebSocket-based, bidirectional audio stream. First-audio latency: 250–600ms on stable connections. Handles VAD, turn detection, and barge-in internally.

```python
# WebSocket session — audio in/out as base64 PCM16
# See multimodal/audio.md for full code pattern

session_config = {
    "voice": "alloy",
    "instructions": "You are a helpful voice assistant.",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "turn_detection": {"type": "server_vad"},  # or "none" for manual
}
```

The `gpt-realtime` and `gpt-realtime-mini` model variants target different cost/latency trade-offs. `gpt-realtime-mini` added 18.6pp improvement in instruction-following and 12.9pp in tool-calling accuracy in internal evals (2025). [unverified exact figures]

### Gemini Live API

Google's equivalent. Gemini 2.5 Flash Live processes 16kHz PCM audio input and generates 24kHz audio responses with simultaneous text transcripts as a side channel. Reported TTFT: ~192ms. Supports 45+ languages. Two variants: "half-cascade" (audio in, internally transcribed, audio out) and experimental "native audio" (full end-to-end).

### Moshi (Kyutai)

Open-source native audio model. Theoretical latency 160ms, strong noise robustness. Trained on 20k hours of audio. Kyutai founded Gradium (December 2025, $70M seed) to commercialise Moshi — initial clients in gaming and customer support. [unverified]

**Trade-offs vs pipeline:**

| | Pipeline | Native Multimodal |
|---|---|---|
| E2E latency | 800ms–2s | 200–600ms |
| Debuggability | High — inspect each stage | Low — audio in, audio out |
| Component swapping | Yes | No |
| Vendor lock-in | Low | High (provider-specific) |
| Paralinguistic preservation | Lost (text intermediate) | Preserved (tone, pace, emphasis) |
| Production maturity | High | Medium |

---

## Key Technical Challenges

### Voice Activity Detection (VAD)

VAD decides when the user has finished speaking. This is the hardest problem in real-time voice — getting it wrong causes the agent to cut the user off mid-sentence or wait too long before responding.

**Silero VAD** is the de facto standard for pipeline systems. It is a small neural network that classifies each audio frame as speech or non-speech using probability rather than energy thresholds. This makes it robust to background noise (a sudden loud noise does not register as speech). VAD latency: 85–100ms.

```python
# LiveKit Agents uses Silero VAD as default
# Pipecat also ships Silero VAD as default
# Standalone usage:
from silero_vad import load_silero_vad, read_audio, get_speech_timestamps

model = load_silero_vad()
wav = read_audio("audio.wav")
speech_timestamps = get_speech_timestamps(wav, model, threshold=0.5)
```

Key VAD parameters: `threshold` (higher = less sensitive), `min_speech_duration_ms` (avoids triggering on very short sounds), `min_silence_duration_ms` (how long silence before end-of-turn is declared).

### Interruption Handling (Barge-In)

When the user speaks while the agent is talking, three things must happen atomically:
1. Echo Cancellation (AEC) — strip agent audio from the microphone signal so VAD doesn't classify the agent's own voice as user speech
2. VAD detects genuine speech (probability-based, not energy spikes)
3. TTS playback stops immediately; queued audio is flushed; pipeline restarts from STT

LiveKit Agents v1.5 introduced an ML-based interruption classifier (enabled by default) that distinguishes genuine interruptions from backchannels ("mm-hmm"), coughs, sighs, and background noise. This is a qualitative improvement over pure VAD thresholds.

### Turn Detection

Separate from VAD. VAD detects speech frames; turn detection decides whether a pause means the user is done speaking or just thinking.

**Energy/timeout approach:** declare end-of-turn after N milliseconds of silence after speech ends. Simple but cuts off users who pause mid-sentence.

**Semantic turn detection:** LiveKit Agents v1.5 adds a transformer model that predicts whether the utterance so far is a complete turn. Reduces false end-of-turn triggers significantly.

### Streaming TTS to Reduce Perceived Latency

Do not wait for the LLM to finish generating before starting TTS. Instead:
1. Buffer LLM token stream until a sentence boundary (`.`, `!`, `?`, or word count threshold ~15 words)
2. Send the sentence to TTS
3. Play TTS audio while the LLM continues generating the next sentence

The first word of audio can start playing within 300-500ms of the LLM receiving the user's text, even if the full response takes 2 seconds to generate. See [[multimodal/audio]] for the sentence-boundary streaming code pattern and the edge case where `".` (closing quote + period) breaks `endswith()` detection.

### Telephony Integration

Phone calls use SIP/PSTN rather than WebRTC. Integration options:

- **Twilio** — SIP trunking, programmable voice, `<Stream>` WebSocket for real-time audio
- **Vonage / Nexmo** — similar SIP WebSocket approach
- **Daily.co** — WebRTC + PSTN bridging, native to Pipecat

VAPI and Retell handle phone number provisioning and PSTN bridging as a managed service — the main reason to choose them over self-hosted frameworks for telephony use cases.

---

## Frameworks

### LiveKit Agents (v1.5.x) — Most Production-Ready Open-Source

Open-source Python framework for building real-time voice (and video) agents. Built on LiveKit's WebRTC infrastructure. As of April 2026: v1.5.7.

**Two agent types:**

`VoicePipelineAgent` — pipeline mode (STT → LLM → TTS). Handles VAD, turn detection, interruption, and audio transport. Composable plugin system.

```python
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents.voice_pipeline_agent import VoicePipelineAgent
from livekit.plugins import deepgram, openai, silero, elevenlabs

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=elevenlabs.TTS(voice_id="21m00Tcm4TlvDq8ikWAM"),
    )
    agent.start(ctx.room)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

`MultimodalAgent` — realtime mode. Wraps GPT-4o Realtime or Gemini Live. Same worker/room abstraction, different audio path.

**Plugin ecosystem:** Deepgram, OpenAI (STT/LLM/TTS/Realtime), Anthropic (LLM), Silero VAD, ElevenLabs, Cartesia, Google (STT/TTS/Realtime), Groq, Azure, Speechmatics.

**v1.5 headline features:**
- ML-based interruption classifier (distinguishes barge-in from backchannels by default)
- Semantic turn detection via transformer model
- Native MCP tool support
- Built-in test framework with LLM-as-judge eval support
- Telephony integration via LiveKit's PSTN stack

Self-hosted: entire stack (LiveKit server + worker) runs on your own infrastructure. No vendor lock-in beyond the plugin providers you choose.

---

### Pipecat (Daily.co) — Complex Pipeline Specialist

Open-source Python framework. Pipeline-based component graph where processors are connected explicitly. 40+ service plugins. Good for complex branching pipelines or multi-agent voice architectures.

```python
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.openai import OpenAILLMService
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.transports.services.daily import DailyTransport

transport = DailyTransport(room_url, token, "Bot")

pipeline = Pipeline([
    transport.input(),
    stt,        # DeepgramSTTService
    llm,        # OpenAILLMService
    tts,        # ElevenLabsTTSService
    transport.output(),
])

runner = PipelineRunner()
await runner.run(pipeline)
```

Pipecat Subagents (2025): distributed multi-agent voice architecture — agents run independent pipelines, communicate via shared message bus. Enables handoffs between specialist agents (e.g., triage → billing specialist) or background task dispatch.

Telephony: native Twilio and Daily PSTN support. Pipecat Cloud (Daily managed) for serverless deployment.

Differentiator vs LiveKit: more explicit pipeline composition — good when you need non-standard routing, conditional branches, or to inject custom processors at specific points in the audio chain. LiveKit is more opinionated but ships working defaults faster.

---

### VAPI — Managed, API-First

Hosted voice agent platform. Provides STT, LLM, TTS, phone number provisioning, and PSTN as a single managed API. No infrastructure to operate.

**Strengths:** Maximum flexibility via API — configure any STT/LLM/TTS combination; deep customisation through code. HIPAA, SOC 2 Type 1 & 2, GDPR compliant. Large enterprise integration ecosystem.

**Weakness:** Developer-heavy — nearly everything requires code; fewer no-code/low-code templates than Retell.

**Pricing:** Base platform fee plus per-minute and component usage fees. Adds $0.01/min for STT. Phone numbers pricing varies.

Best for: teams with developer resources who need maximum programmatic control and custom pipeline configurations.

---

### Retell AI — Managed, Faster Deployment

Similar managed platform to VAPI. Stronger emphasis on ease of deployment and time-to-production.

**Differentiators vs VAPI:**
- ~600ms response latency (among the fastest managed platforms)
- Built-in agent builder with templates, integrations, and pre-built functions
- Flat transparent pricing: $0.07/min, $2/month per phone number; STT included
- Strong for sales and support voice bot patterns with pre-built CRM integrations
- SOC 2, HIPAA, GDPR compliant

Best for: teams that need a working voice agent fast without deep infrastructure work; sales/support automation.

---

## Decision Framework

```
Need phone calls?
  Yes → VAPI (max customisation) or Retell (fastest deploy)
  No → continue below

Need open-source / self-hosted?
  Yes → continue below
  No → consider VAPI or Retell

Need lowest possible latency (sub-500ms)?
  Yes → LiveKit MultimodalAgent + GPT-4o Realtime (experiment first)
  No → continue below

Need complex pipeline routing / multi-agent handoffs?
  Yes → Pipecat
  No → LiveKit VoicePipelineAgent (best defaults, fastest to production)
```

| Framework | Best for | Latency | Phone | Open-source |
|---|---|---|---|---|
| LiveKit Agents v1.5 | WebRTC, open-source, standard pipeline | 800ms–2s (pipeline), 300ms (realtime mode) | Via LiveKit PSTN | Yes |
| Pipecat | Complex pipelines, multi-agent voice | 800ms–2s | Twilio/Daily | Yes |
| VAPI | Managed, max dev control | ~600ms | Yes, included | No |
| Retell AI | Managed, fast deploy, sales/support | ~600ms | Yes, $2/month | No |
| GPT-4o Realtime direct | Lowest latency experiments | 250–600ms | Via Twilio | No |

---

## Key Facts

- Pipeline (STT+LLM+TTS) is the production default — debuggable, swappable, 800ms–2s E2E
- Native multimodal (GPT-4o Realtime, Gemini Live) achieves 250–600ms but sacrifices debuggability
- Silero VAD is the standard for pipeline speech detection — probability-based, not energy-based
- Semantic turn detection (transformer model) is the correct fix for users who pause mid-sentence
- Interruption handling requires: AEC + VAD + immediate TTS flush — all three, atomically
- LiveKit Agents v1.5.7 is the current release (April 2026); ML interruption classifier ships by default
- Retell AI targets ~600ms total latency at $0.07/min flat; VAPI adds STT at $0.01/min extra
- Moshi (Kyutai) is the leading open-source native audio model; commercialised via Gradium (Dec 2025)
- Pipecat Subagents enables multi-agent voice systems with per-agent pipelines and message bus handoffs

---

## Connections

- [[multimodal/audio]] — ASR/TTS model specifics, streaming code patterns, OpenAI Realtime API
- [[agents/react-pattern]] — voice agents implement an agentic loop with audio I/O
- [[agents/multi-agent-patterns]] — Pipecat Subagents maps to supervisor/handoff patterns
- [[protocols/mcp]] — LiveKit Agents v1.5 has native MCP tool integration
- [[infra/inference-serving]] — self-hosting STT (faster-whisper) and LLM for lowest cost
- [[cs-fundamentals/websockets-se]] — WebRTC and WebSocket transport for audio streaming
- [[apis/openai-api]] — GPT-4o Realtime API, gpt-realtime-mini
- [[security/owasp-llm-top10]] — voice agents are agentic systems; excessive agency and tool misuse risks apply
- [[observability/platforms]] — tracing voice pipeline stages for latency debugging
