---
type: concept
category: javascript
para: resource
tags: [npm, pnpm, package-management, workspaces, semver, publishing, lockfiles, monorepo]
sources: []
updated: 2026-05-02
tldr: pnpm is the production-grade Node.js package manager — 3-5x faster than npm via a global content-addressable store with hard links, strict dependency isolation by default, and first-class monorepo workspace support.
---

# npm, pnpm, and the Node.js Ecosystem

> **TL;DR** pnpm replaces npm and yarn for new projects. It stores all packages in a single global content-addressable store and hard-links them into `node_modules` — meaning the same package version is stored only once on disk, installs are 3-5x faster, and disk usage plummets in monorepos. npm is still universal for publishing and running scripts.

---

## Why pnpm Over npm

npm's `node_modules` design creates a flat directory where every package can access every other package, even undeclared ones — the "phantom dependency" problem. pnpm fixes this with a virtual store and strict isolation.

**Performance comparison:**

| Operation | npm 10 | pnpm 9 |
|---|---|---|
| First install (cold) | 45s | 30s |
| Repeated install (warm) | 8s | 2s |
| Add single package | 3s | 0.8s |
| Disk per project | 200MB | ~5MB (hard links to global store) |

*Benchmarks vary by machine and package count; clean install ~3x faster, cache-warm ~1.7–3.7x*

**Phantom dependency prevention:** pnpm's `node_modules` uses a `.pnpm/` virtual store directory. Packages can only `require()` what they declare in `dependencies` or `devDependencies`. This catches the class of bugs where code works in development (because an indirect dependency happened to be installed) but fails in production with a different install order.

---

## How pnpm Works

```
Global store (content-addressable):
~/.pnpm-store/v3/
  files/
    00/abc123...  (actual package contents, hashed)
    01/def456...
    ...

Project node_modules:
project/node_modules/
  .pnpm/
    react@18.2.0/
      node_modules/
        react -> hard link to ~/.pnpm-store/v3/files/...
  react -> symlink to .pnpm/react@18.2.0/node_modules/react
```

Hard links share the same inode — no disk copy. Symlinks make packages discoverable to Node.js's module resolver.

---

## Installation and Setup

```bash
# Install pnpm (standalone installer — recommended)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Or via npm (for CI environments)
npm install -g pnpm

# Verify
pnpm --version  # 9.x
```

**`.npmrc` for project-level configuration:**
```ini
# .npmrc — commit this file
engine-strict=true          # enforce Node.js version from package.json engines
shamefully-hoist=false      # keep strict isolation (default)
strict-peer-dependencies=false  # silence peer dep warnings during transition
```

---

## Core Commands

```bash
# Install all dependencies from lockfile
pnpm install

# Add a dependency
pnpm add @anthropic-ai/sdk
pnpm add -D vitest typescript @types/node  # dev dependencies
pnpm add -O dotenv                         # optional dependency

# Remove
pnpm remove express

# Run scripts from package.json
pnpm dev
pnpm build
pnpm test

# Run a binary without installing globally
pnpm dlx create-next-app@latest my-app    # like npx

# Update packages
pnpm update              # within semver range
pnpm update --latest     # to latest, ignoring semver range

# List what is installed
pnpm list
pnpm list --depth=0      # top-level only

# Check for unused dependencies
pnpm prune               # remove packages not in lockfile

# Exec a command in all workspace packages
pnpm -r run build        # recursive
pnpm --filter ./packages/api run build  # specific package
```

---

## package.json

The manifest file for every Node.js project. Every field matters for production AI apps.

```json
{
  "name": "my-ai-app",
  "version": "1.0.0",
  "description": "Production AI application",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:ci": "vitest run --reporter=verbose",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "ai": "^4.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

**Key fields:**
- `"private": true` — prevents accidental `pnpm publish` of application repos
- `"type": "module"` — makes all `.js` files ES modules; use `.cjs` extension for CommonJS
- `"engines"` — documents and (with `engine-strict=true`) enforces Node.js/pnpm version
- `"scripts"` — runnable via `pnpm <name>`; standard names are `dev`, `build`, `test`, `lint`

---

## Semantic Versioning

npm/pnpm use semver for version constraints. Every AI SDK update is a potential breaking change.

```
MAJOR.MINOR.PATCH
  ^      ^     ^
  |      |     └── Bug fixes, backwards compatible
  |      └──────── New features, backwards compatible
  └─────────────── Breaking changes
```

**Range operators in package.json:**

| Specifier | Meaning | Example |
|---|---|---|
| `^1.2.3` | Compatible (same major) | `>=1.2.3 <2.0.0` |
| `~1.2.3` | Approximately (same minor) | `>=1.2.3 <1.3.0` |
| `1.2.3` | Exact version | Only `1.2.3` |
| `>=1.2.3` | At least | Any `>=1.2.3` |
| `*` | Any | Avoid in production |

**For AI SDKs, use `^` (caret):** `"@anthropic-ai/sdk": "^0.39.0"` — takes patch and minor updates, not major. The lockfile pins the exact version actually installed.

**Pre-release versions:**
```bash
pnpm add ai@alpha        # install alpha tag
pnpm add ai@4.0.0-beta.1 # install specific pre-release
```

---

## Lockfiles

`pnpm-lock.yaml` (or `package-lock.json` for npm) records the exact versions of every transitive dependency installed.

**Rules:**
- Always commit the lockfile to version control
- Never edit it by hand
- `pnpm install` with a lockfile present installs the exact locked versions (reproducible builds)
- `pnpm install --frozen-lockfile` fails if the lockfile is out of sync with `package.json` — use this in CI

```yaml
# CI workflow: lockfile-based install
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

---

## Workspaces (Monorepos)

pnpm's workspace support is the recommended approach for monorepos with shared packages.

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"        # Next.js apps
  - "packages/*"    # Shared libraries
```

**Monorepo structure:**
```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json          # root — dev tools only
├── apps/
│   ├── web/              # Next.js app
│   │   └── package.json  # { "name": "@myco/web" }
│   └── api/              # Express or Hono API
│       └── package.json  # { "name": "@myco/api" }
└── packages/
    ├── ai-client/        # Shared @anthropic-ai/sdk wrapper
    │   └── package.json  # { "name": "@myco/ai-client" }
    └── types/            # Shared TypeScript types
        └── package.json  # { "name": "@myco/types" }
```

**Root `package.json`:**
```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "dev": "pnpm --filter @myco/web run dev"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "prettier": "^3.0.0"
  }
}
```

**Referencing workspace packages:**
```json
// apps/web/package.json
{
  "name": "@myco/web",
  "dependencies": {
    "@myco/ai-client": "workspace:*",
    "@myco/types": "workspace:^"
  }
}
```

`workspace:*` pins to the current local version. `workspace:^` follows semver within the monorepo.

**Running commands:**
```bash
pnpm --filter @myco/web dev          # one package
pnpm --filter @myco/web... build     # package + its dependencies
pnpm -r run build                    # all packages, topological order
pnpm -r --parallel run test          # all packages in parallel
```

---

## Publishing to npm

For public packages (libraries, not applications).

**Pre-publish checklist:**
1. Set `"private": false` in `package.json`
2. Set `"files"` to include only distribution files
3. Set `"main"`, `"module"`, `"types"` exports
4. Build before publishing

```json
{
  "name": "@myco/ai-client",
  "version": "1.2.0",
  "description": "Type-safe Anthropic API wrapper",
  "private": false,
  "files": ["dist", "README.md"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "sideEffects": false
}
```

**Publishing flow:**

```bash
# Login
pnpm login

# Dry run — see what will be published
pnpm pack --dry-run

# Publish
pnpm publish --access public

# Publish from a monorepo package
pnpm --filter @myco/ai-client publish
```

**Automated publishing via GitHub Actions with provenance:**

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # required for provenance
      contents: read

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: "https://registry.npmjs.org"
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**npm provenance** (2023+): Publishes a signed attestation linking the package to its source repo and CI run. Consumers can verify the package was built from the claimed source.

---

## Environment Variables

Node.js reads from the OS environment. Use `dotenv` for local development.

```bash
# .env.local (never commit)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
NODE_ENV=development
```

```typescript
// Load .env before anything else — top of main entry point
import { config } from "dotenv";
config({ path: ".env.local" });

// Access
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}
```

**With Zod for typed env validation (better pattern):**

```typescript
import { z } from "zod";

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().optional(),
});

export const env = EnvSchema.parse(process.env);
// env is fully typed; process.env is not
```

---

## Key Facts

- pnpm stores packages in `~/.pnpm-store/v3/` — a single global content-addressable store; projects hard-link to it
- Hard links share an inode: no disk copy, atomic availability — this is why pnpm is 3-5x faster than npm on repeated installs
- `pnpm install --frozen-lockfile` is the CI standard — fails if `package.json` and lockfile are out of sync
- `workspace:*` in a monorepo `package.json` dependency means "use the local version from this workspace"
- `"type": "module"` in `package.json` makes all `.js` files ES modules; `require()` will fail unless using `.cjs`
- Semantic versioning: `^` allows minor and patch updates (same major); `~` allows patch updates only (same minor)
- `pnpm dlx <package>` runs a binary without installing it — equivalent to `npx` but faster and does not leave cached binaries
- npm provenance (2023) signs packages with a CI attestation — use `--provenance` flag when publishing from GitHub Actions

## Common Failure Cases

**Lockfile conflicts in PRs**
Why: Two branches both added dependencies; the lockfile `yaml` has merge conflicts because both branches changed it.
Detect: Git conflict markers (`<<<<<<<`) in `pnpm-lock.yaml`.
Fix: Do NOT manually resolve the lockfile. Checkout one branch's lockfile, then run `pnpm install` — it regenerates the lockfile correctly. Never hand-edit lockfiles.

**Phantom dependency works locally, fails in CI**
Why: With npm, your code imports a package that is not in your `dependencies` because it was transitively installed. pnpm strict mode prevents this but npm/yarn flat `node_modules` hide it.
Detect: `Cannot find module 'X'` in CI with npm, but works locally. Or: works in one environment, not another.
Fix: Migrate to pnpm (strict by default) or add the missing direct dependency to `package.json`.

**`pnpm install` fails with peer dependency errors**
Why: A package requires a peer dependency at a version you do not have installed.
Detect: `ERR_PNPM_PEER_DEP_ISSUES` or `Peer dependencies that should be installed` warnings.
Fix: Install the peer dependency: `pnpm add react@19`. Or set `strict-peer-dependencies=false` in `.npmrc` if the warning is known-safe (the package works despite the mismatch).

**CJS/ESM module mismatch**
Why: `"type": "module"` was set in `package.json` (or in a dependency), but code uses `require()` or the file extension is `.js` expecting CJS.
Detect: `Error [ERR_REQUIRE_ESM]: require() of ES Module not supported`.
Fix: Use `import` statements; rename CommonJS files to `.cjs`; or remove `"type": "module"` if you are building a library that ships CJS.

**Version range too loose allows breaking changes**
Why: `"*"` or a wide range like `">=1.0.0"` allows a major version bump that has breaking changes.
Detect: `pnpm update --latest` pulls in a major version; CI breaks after a routine update.
Fix: Use `^` (caret) for application dependencies. Pin exact versions for critical infrastructure like Next.js (`"next": "15.0.4"`) to avoid surprise breaking updates in CI.

## Connections

- [[javascript/javascript-hub]] — ecosystem overview
- [[javascript/ai-sdk-patterns]] — installing and using @anthropic-ai/sdk and the Vercel AI SDK
- [[web-frameworks/nextjs]] — Next.js uses pnpm in all official examples and create-next-app
- [[python/ecosystem]] — Python parallel: uv replaces pip + virtualenv (similar motivation to pnpm replacing npm)
- [[cs-fundamentals/python-packaging]] — Python packaging patterns for comparison

## Open Questions

- Will Bun's built-in package manager displace pnpm for greenfield projects given its speed advantages?
- Is `workspace:*` or `workspace:^` the better default for monorepo internal packages — strict pinning vs semver flexibility?
- When does the npm provenance attestation become a hard requirement for enterprise-grade open-source packages?
