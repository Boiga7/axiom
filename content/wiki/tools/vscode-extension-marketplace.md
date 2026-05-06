---
type: concept
category: tools
para: resource
tags: [vscode, extension, marketplace, publishing, distribution, vsix]
tldr: "Publishing VS Code extensions — package.json manifest, contribution points, VSIX packaging, Marketplace listing, automated publishing via vsce and GitHub Actions."
sources: []
updated: 2026-05-06
---

# VS Code Extension Marketplace

> **TL;DR** Publishing VS Code extensions — package.json manifest, contribution points, VSIX packaging, Marketplace listing, automated publishing via vsce and GitHub Actions.

The VS Code Marketplace hosts 50,000+ extensions. Relevant to the vault because Cline, Continue, and Cursor are all VS Code extensions — understanding distribution helps when building MCP-integrated tooling or custom dev tools.

---

## Extension Anatomy

```
my-extension/
├── package.json          # Manifest — declares id, activation, contributions
├── src/
│   └── extension.ts      # activate() + deactivate() entry points
├── .vscodeignore         # Files excluded from VSIX package
└── README.md             # Shown on the Marketplace listing page
```

### package.json key fields

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "publisher": "your-publisher-id",
  "version": "1.0.0",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onCommand:myext.helloWorld"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "myext.helloWorld", "title": "Hello World" }
    ],
    "configuration": {
      "title": "My Extension",
      "properties": {
        "myext.apiKey": { "type": "string", "description": "API key" }
      }
    }
  }
}
```

**Activation events:** When VS Code loads your extension.
- `onCommand:` — activated when user runs the command
- `onLanguage:python` — activated when a Python file is opened
- `*` — activated at startup (avoid unless necessary; slows startup)

---

## Contribution Points

Contribution points declare what an extension adds to VS Code's UI:

| Point | What it adds |
|---|---|
| `commands` | Command Palette entries |
| `configuration` | Settings in the Settings UI |
| `keybindings` | Keyboard shortcuts |
| `menus` | Context menu items |
| `languages` | Language support (grammar, file icons) |
| `views` | Custom sidebar panels |
| `viewsContainers` | Custom activity bar icons |
| `webviewPanels` | Custom editor panels |

---

## Packaging and Publishing

### Install vsce (VS Code Extension CLI)

```bash
npm install -g @vscode/vsce
```

### Package locally (VSIX)

```bash
vsce package
# Produces: my-extension-1.0.0.vsix
```

Install the VSIX locally for testing:
```bash
code --install-extension my-extension-1.0.0.vsix
```

### Publish to Marketplace

**One-time setup:**
1. Create a publisher at https://marketplace.visualstudio.com/manage
2. Generate a Personal Access Token (PAT) in Azure DevOps with "Marketplace → Manage" scope
3. `vsce login <publisher-id>`

**Publish:**
```bash
vsce publish
# or publish a specific version bump:
vsce publish minor
```

### GitHub Actions CI publishing

```yaml
name: Publish Extension

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx vsce publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

Store `VSCE_PAT` as a GitHub Actions secret. Trigger on version tags.

---

## Open Source Extension Publishing (OVSX)

Open VSX Registry (https://open-vsx.org) is the open-source alternative used by VSCodium, Theia, Gitpod, and CodeServer. Publish to both registries to maximise reach:

```bash
npm install -g ovsx
ovsx publish my-extension-1.0.0.vsix -p $OVSX_TOKEN
```

---

## Listing Quality

The Marketplace listing is built from `README.md`. Key elements:
- Animated GIF or screenshot in the first 500px
- Clear description of what the extension does
- Configuration section listing all settings
- Known issues or limitations
- Changelog link

**Marketplace badge:** Add to GitHub README:
```markdown
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/publisher.extension)](https://marketplace.visualstudio.com/items?itemName=publisher.extension)
```

---

## Key Facts

- `package.json` `publisher` field must match your Marketplace publisher ID
- VSIX is a ZIP archive — `.vscodeignore` keeps build artefacts out
- PAT scope must be "Marketplace → Manage" scoped to "All accessible organisations"
- Open VSX Registry (open-vsx.org) is the alternative for non-Microsoft editors
- `vsce publish minor/major/patch` bumps version automatically before publishing
- Activation event `*` delays VS Code startup — prefer specific activation events

## Connections

- [[tools/github-marketplace-apps]] — GitHub Marketplace publishing; complementary distribution channel for developer tooling
- [[ai-tools/claude-code]] — Claude Code is a CLI, not a VS Code extension, but its MCP integration surfaces in Cursor/Continue which are extensions
- [[ai-tools/cline]] — open-source VS Code extension; published on both Marketplace and Open VSX
- [[ai-tools/continue]] — VS Code/JetBrains extension; uses the VS Code Extension API for context providers
- [[protocols/mcp]] — MCP servers can be bundled inside VS Code extensions (like Cline's tool integrations)

## Open Questions

- Does the Marketplace enforce any content policy review for AI-powered extensions, or is it purely automated?
- What is the recommended approach for extensions that need to bundle Node.js binaries for different platforms?
