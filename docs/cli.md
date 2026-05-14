# CLI Reference

The `aeo.js` (or `aeojs`) CLI works on any project — framework integrations call into it under the hood, and you can invoke it directly for vanilla / static-site workflows.

## Installation

```bash
# Zero-install via npx
npx aeo.js <command>

# Or installed
npm install --save-dev aeo.js
npx aeo.js <command>
```

Both `aeo.js` and `aeojs` are registered as binaries — they're identical, use whichever your shell prefers.

## Commands at a glance

| Command | Writes files? | Use for |
|---|---|---|
| [`init`](#init) | ✅ — creates `aeo.config.ts` | First-time project setup |
| [`generate`](#generate) | ✅ — writes AEO files to `outDir` | Production builds, CI |
| [`check`](#check) | ❌ — read-only | Quick audit, PR gating |
| [`report`](#report) | ❌ — read-only | Full citability + platform-hint report |

## Global flags

These work on every command:

| Flag | Description |
|---|---|
| `--help`, `-h` | Print help and exit |
| `--version`, `-v` | Print version and exit |

Flags can use either form: `--out public` or `--out=public`.

---

## `init`

Scaffold an `aeo.config.ts` in the current directory.

```bash
npx aeo.js init
```

**Behavior**
- Writes `aeo.config.ts` to the current working directory using a templated default config.
- Fails (exit 1) if `aeo.config.ts` already exists — won't overwrite. Delete it manually first if you want a fresh template.

**Generated config (excerpt)**

```ts
import { defineConfig } from 'aeo.js';

export default defineConfig({
  title: 'My Site',
  url: 'https://example.com',
  description: 'A site optimized for AI discovery',
  generators: { robotsTxt: true, llmsTxt: true, /* … */ },
  robots: { allow: ['/'], disallow: ['/admin'], crawlDelay: 0 },
  widget: { enabled: true, position: 'bottom-right', /* … */ },
});
```

---

## `generate`

Generate all enabled AEO files based on your config and project state.

```bash
npx aeo.js generate [options]
```

**Options**

| Flag | Type | Default | Description |
|---|---|---|---|
| `--out <dir>` | string | auto-detected from framework | Where to write the AEO files |
| `--url <url>` | string | `https://example.com` | Production URL — drives `sitemap.xml`, absolute URLs in `llms.txt`, JSON-LD |
| `--title <title>` | string | `My Site` | Site title for `llms.txt` and JSON-LD |
| `--no-widget` | boolean | widget enabled | Disable widget injection / generation |

**What it does**
1. Detects your framework (Next.js, Astro, Nuxt, Vite, Angular, Webpack, or static).
2. Resolves config from CLI flags + defaults. See [Configuration files](#configuration-files) below — the standalone CLI does **not** currently read `aeo.config.{ts,js}`.
3. Walks `outDir` for HTML and/or `contentDir` for markdown.
4. Writes the enabled generators:
   - `robots.txt` — AI crawler directives + sitemap reference
   - `llms.txt` — short LLM-readable site summary
   - `llms-full.txt` — full content dump for LLMs
   - `sitemap.xml` — standard XML sitemap
   - `ai-index.json` — chunked content for embedding pipelines
   - `docs.json` — page manifest
   - `schema.json` — JSON-LD structured data (if `schema.enabled`)
   - Per-page `.md` files (if `generators.rawMarkdown`)
5. Prints a summary of written files.

**Exit codes**
- `0` — generation succeeded
- `1` — one or more generators threw (error message printed; partial files may exist)

**Examples**

```bash
# Static site
npx aeo.js generate --url https://mysite.com --title "My Site" --out public

# Staging build with different URL
npx aeo.js generate --url https://staging.mysite.com --title "Staging" --out public

# Production build without the widget
npx aeo.js generate --url https://mysite.com --title "My Site" --out public --no-widget

# Inside a framework project (Next.js, Astro, Nuxt, etc.) — outDir is auto-detected
npx aeo.js generate --url https://mysite.com --title "My Site"
```

---

## `check`

Run a fast, read-only AEO + GEO readiness audit. **Does not write any files.**

```bash
npx aeo.js check [options]
```

**Options**

| Flag | Type | Description |
|---|---|---|
| `--out <dir>` | string | Output dir to inspect (defaults to auto-detected) |
| `--url <url>` | string | Override the configured URL |
| `--title <title>` | string | Override the configured title |
| `--json` | boolean | Emit machine-readable JSON instead of the formatted report |

**Default (formatted) output**

```text
[aeo.js] AEO Configuration Check
────────────────────────────────────────
  Framework:    next
  Content dir:  content
  Output dir:   public
  Title:        My Site
  URL:          https://mysite.com
  Widget:       enabled

  Generators:
    + robots.txt
    + llms.txt
    + llms-full.txt
    + raw markdown
    + docs.json
    + sitemap.xml
    + ai-index.json
    + schema.json

  Config file: found

═══════════════════════════════════════
  GEO Readiness Score: 84/100 (Good)
═══════════════════════════════════════
  ✓ AI Access:           20/20
  ✓ Content Structure:   18/20
  ✓ Schema Presence:     20/20
  ⚠ Meta Quality:        12/20
  ⚠ Citability:          14/20

Issues:
  ⚠  Meta Quality: 2 pages have descriptions shorter than 50 chars
  ⚠  Citability: 3 pages have fewer than 2 FAQ-style headings
```

**JSON output (`--json`)**

```json
{
  "framework": "next",
  "config": {
    "title": "My Site",
    "url": "https://mysite.com",
    "outDir": "public"
  },
  "audit": {
    "score": 84,
    "grade": "Good",
    "categories": [
      { "name": "AI Access",         "score": 20, "max": 20, "checks": [...] },
      { "name": "Content Structure", "score": 18, "max": 20, "checks": [...] },
      { "name": "Schema Presence",   "score": 20, "max": 20, "checks": [...] },
      { "name": "Meta Quality",      "score": 12, "max": 20, "checks": [...] },
      { "name": "Citability",        "score": 14, "max": 20, "checks": [...] }
    ],
    "issues": [
      { "category": "Meta Quality", "severity": "warning", "message": "…", "fix": "…" }
    ]
  }
}
```

**Scripting pattern: fail CI when the score drops**

```bash
SCORE=$(npx aeo.js check --json | jq '.audit.score')
if [ "$SCORE" -lt 70 ]; then
  echo "GEO score $SCORE is below 70 — failing build"
  exit 1
fi
```

---

## `report`

Run a deeper analysis than `check`: per-page citability scores, platform-specific hints (ChatGPT, Claude, Perplexity, Google AI Overviews, Bing Copilot), and a prioritized fix list.

```bash
npx aeo.js report [options]
```

**Options**

| Flag | Type | Description |
|---|---|---|
| `--out <dir>` | string | Output dir to inspect |
| `--url <url>` | string | Override the configured URL |
| `--title <title>` | string | Override the configured title |
| `--json` | boolean | Emit JSON instead of markdown |

**Default output**: a long-form markdown report covering:
- Overall score breakdown (same five categories as `check`)
- Per-page citability scores (Answer Blocks, Self-Containment, Statistical Density, Structure)
- Platform-specific hints — ChatGPT, Claude, Perplexity, Google AI Overviews, Bing Copilot
- Prioritized fix list ranked by impact

**JSON output**: stable shape with `categories`, `pages`, `platformHints`, `issues`. Stream into your own dashboards or LLM-driven tooling.

```bash
# Pipe report straight into a markdown file
npx aeo.js report > aeo-report.md

# Or JSON for tooling
npx aeo.js report --json > aeo-report.json
```

---

## Configuration files

> **Heads up:** the standalone CLI (`generate`, `check`, `report`) currently configures itself from **CLI flags only** — it does not load `aeo.config.ts` or `aeo.config.js`. Tracked as a follow-up. For now: pass `--url` / `--title` / `--out` on the command line, or use a framework integration which **does** read the config (see below).

`npx aeo.js init` scaffolds an `aeo.config.ts` template — it's the canonical place to keep your settings, but today the file is consumed by framework integrations rather than the CLI itself:

```ts
// vite.config.ts (or next.config.mjs / astro.config.mjs / etc.)
import aeoConfig from './aeo.config';
import { aeoVitePlugin } from 'aeo.js/vite';

export default {
  plugins: [aeoVitePlugin(aeoConfig)],
};
```

For raw CLI invocations on a static site, pass the values directly:

```bash
npx aeo.js generate \
  --url https://mysite.com \
  --title "My Site" \
  --out public
```

A `package.json` script keeps this repeatable without a config file:

```jsonc
{
  "scripts": {
    "aeo": "aeo.js generate --url https://mysite.com --title \"My Site\" --out public"
  }
}
```

## Framework auto-detection

`generate` and `check` detect your framework by inspecting your `package.json` `dependencies` and `devDependencies` (see [src/core/detect.ts](https://github.com/multivmlabs/aeo.js/blob/main/src/core/detect.ts) for the exact logic). The first match wins, in this order:

| Order | Framework | Detected via (package) | Default `outDir` |
|---|---|---|---|
| 1 | Next.js | `next` | `public` |
| 2 | Nuxt | `nuxt` or `@nuxt/kit` | `.output/public` |
| 3 | Astro | `astro` or `@astrojs/astro` | `dist` |
| 4 | Remix | `@remix-run/dev` | `build/client` |
| 5 | SvelteKit | `@sveltejs/kit` | `build` |
| 6 | Angular | `@angular/core` | `dist` |
| 7 | Docusaurus | `@docusaurus/core` | `build` |
| 8 | Vite | `vite` | `dist` |
| — | Unknown / vanilla | none of the above | `dist` |

A project that has both `next` and `vite` in its `package.json` resolves as Next.js because of the order. Config files (`next.config.mjs`, `angular.json`, etc.) are **not** consulted — only the dependency list.

Detection only affects the default `outDir` and `contentDir`. You can always override with `--out` or set `outDir` in the config.

## Common patterns

### One-shot generation for a static site

```bash
npx aeo.js generate --url https://mysite.com --title "My Site" --out .
```

### Production build hook (any framework)

```jsonc
// package.json
{
  "scripts": {
    "build": "your-build-command",
    "postbuild": "aeo.js generate"
  }
}
```

### PR check (GitHub Actions)

```yaml
- run: npx aeo.js check --json | tee audit.json
- run: |
    SCORE=$(jq '.audit.score' audit.json)
    [ "$SCORE" -ge 70 ] || { echo "GEO score $SCORE below 70"; exit 1; }
```

### Multi-environment build

```bash
# Staging
npx aeo.js generate --url https://staging.mysite.com --title "Staging"

# Production
npx aeo.js generate --url https://mysite.com --title "Production"
```

## Further Reading

- [Vanilla JS / Static HTML Guide](./vanilla.md) — full no-framework workflow
- [aeo.js Reference Configuration](https://aeojs.org/reference/configuration/) — every config field documented
- [Back to Overview](./README.md)
