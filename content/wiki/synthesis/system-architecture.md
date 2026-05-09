---
type: synthesis
category: synthesis
para: resource
tags: [architecture, meta, framework, nexus, axiom]
tldr: The Three Ms and Four Cs framework describing the Nexus/Axiom system architecture and workflow.
sources: []
updated: 2026-05-09
---

# System Architecture: Three Ms and Four Cs

Two complementary frameworks for understanding this system. Three Ms describes the architecture (what exists). Four Cs describes the workflow (what you do with it).

## Three Ms — Architecture

| Layer | Name | What it is |
|---|---|---|
| Mind | Nexus vault | The persistent knowledge store: `wiki/` and `raw/` |
| Machinery | Skills + Agents + Tools | The automation layer that operates on knowledge |
| Medium | Axiom | The published surface that makes knowledge accessible |

## Four Cs — Workflow

| Stage | Name | What happens |
|---|---|---|
| Capture | Ingest sources | Research and pull sources into `raw/` |
| Compile | Synthesize knowledge | Build wiki pages, cross-link, update index |
| Configure | Set behavior | CLAUDE.md + Skills govern how the system operates |
| Communicate | Publish | Axiom makes compiled knowledge publicly accessible |

## How they relate

Three Ms are nouns. Four Cs are verbs. A Capture session feeds the Mind. Compile operations run in Machinery. Configure lives in Machinery and governs it. Communicate flows through Medium.

## Connections

- [[synthesis/gap-report]] — identifies where Mind is thin
- [[synthesis/audit-report]] — health check across all three Ms
- [[synthesis/architecture-patterns]] — patterns compiled into the vault
