# Axiom

Axiom is a Next.js web app that publishes Lewis's personal wiki publicly. The wiki content lives in `content/wiki/` and mirrors the Nexus vault.

## Content source

The source of truth for all wiki pages is the Nexus vault:
```
C:\Dev\Claude MD\Nexus\wiki\
```

Do not edit wiki content directly in `content/wiki/` as a primary action. If a wiki page needs updating, update it in Nexus first, then sync to `content/wiki/`. The exception is fixing rendering bugs or frontmatter issues specific to how Axiom displays content.

## Knowledge queries

If you need to understand a topic covered in the wiki while working on Axiom, use the Nexus agents:
```
C:\Dev\Claude MD\Nexus\agents\
```

Open the relevant subfolder in Claude Code:
- `Nexus/agents/` — Q&A over vault content
- `Nexus/agents/research/` — research and ingest a new topic
- `Nexus/agents/build/` — implementation grounded in vault pages

## Wiki page format

Every page in `content/wiki/` uses this frontmatter:

```yaml
---
type: concept | entity | synthesis
category: <folder name>
para: project | area | resource | archive
tags: [tag1, tag2]
tldr: <one sentence>
sources: []
updated: YYYY-MM-DD
---
```

Wikilinks use `[[category/slug]]` syntax. The graph renderer in Axiom resolves these.

## Syncing new pages from Nexus

When a new page is ingested via Nexus/agents/research/, it lands in both:
- `Nexus/wiki/<category>/<slug>.md`
- `axiom/content/wiki/<category>/<slug>.md`

After syncing, update `content/wiki/index.md` to include the new page entry.

## Accuracy

- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Output Style

- No status updates like "Now I will..." or "I have completed...". Execute the task.
- No em-dashes. Plain hyphens only.
