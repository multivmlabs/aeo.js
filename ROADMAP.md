# aeo.js — Growth & Product Roadmap

> Goal: make aeo.js the default tool developers reach for when they want their site to show up in ChatGPT, Claude, Perplexity, and other AI answer engines — and make adoption itself viral.
>
> Status baseline (June 2026): v0.0.14 on npm, ~50 downloads/month, 6 framework plugins, CLI with 4 commands, docs at aeojs.org, 180 passing tests.
>
> Companion app: **check.aeojs.org** (source at `~/work/aeochecker`, Next.js on Cloudflare Workers + Supabase). Already shipped there: streaming URL scans (homepage + up to 10 inner pages), 22-bot access matrix, 5-category audit, per-page citability via aeo.js, permalinks with date slugs, dynamic OG images (`/api/og`), social share buttons, markdown export, leaderboard, most-scanned, per-host score history, rate limiting. The roadmap below builds on this — it does not duplicate it.

---

## Part 1 — Why this can go viral

AEO/GEO is having a moment: a large share of searches now end in an AI answer instead of a click, and most sites have done *nothing* about it. The viral mechanics that work for dev tools all apply here:

1. **A score people want to share.** "My site scored 87/100 for AI readiness" is a screenshot-able, tweet-able artifact. Scores create competition.
2. **Zero-friction try-out.** If someone can audit *any* URL in 10 seconds without installing anything, every tweet about aeo.js converts to a try.
3. **A distribution loop.** Badges in READMEs, generated `llms.txt` files with an attribution line, and "powered by aeo.js" footers turn every user into an ad.
4. **Fear + curiosity content.** "Is YOUR site invisible to ChatGPT?" + public audits of famous sites = classic viral dev content.

Everything below is ordered to maximize these loops.

---

## Part 2 — Product improvements

### P0 — Viral enablers (do these first)

#### 2.1 Unify remote scoring + `npx aeo.js check <url>` — audit any live site, zero install
- **What:** Two halves:
  1. **Upstream the checker's remote-audit logic into the library.** The checker (`~/work/aeochecker/lib/remote-audit.ts` + `lib/crawler.ts`) reimplements the 5-category audit for remote sites and pins **aeo.js v0.0.11** while the library is at 0.0.14. Move the remote crawl + audit into `aeo.js` core (e.g. `aeo.js/remote`), have the checker consume it, and bump its dependency.
  2. **Add URL mode to the CLI:** `npx aeo.js check https://example.com` runs the same remote audit and prints the GEO score with a colorful terminal report. Optionally `--via-api` to hit the checker's API instead (gets a permalink for free); local crawl stays the default so the CLI works offline.
- **Why:** This is the single biggest funnel improvement — every social post can end with "try it: `npx aeo.js check yoursite.com`" — and it guarantees CLI, web checker, and (later) extension all report the same score from one codebase.
- **Acceptance criteria:**
  - `npx aeo.js check https://example.com` completes in <15s and prints score + top issues.
  - Checker imports the shared remote audit from aeo.js ≥ latest; its custom `remote-audit.ts` is deleted or reduced to glue. Scores before/after stay consistent (spot-check 5 known domains).
  - Unit tests for the URL fetch/normalize path; existing local-mode behavior unchanged.
  - Graceful errors for unreachable hosts, non-HTML responses, and robots-blocked fetches.

#### 2.2 Close the shareability gaps on check.aeojs.org
- **What:** The score-card foundation already exists (permalinks, `/api/og` dynamic OG images, share buttons, markdown export). Ship the missing pieces:
  - **Badge endpoint** (`/api/badge?url=…`): shields.io-style SVG (`GEO Score 87 — aeo.js`) backed by the latest scan, embeddable in READMEs.
  - **Public JSON API** (`GET /api/v1/scan?url=…`): scan results without HTML scraping — this is what the CLI `--via-api`, GitHub Action, and extension consume.
  - Ensure every permalink page serves its per-scan dynamic OG image (some pages still fall back to static `/og.png`).
  - `npx aeo.js check <url> --share` prints the permalink + badge snippet.
- **Why:** Badges in READMEs are the compounding distribution loop; the public API turns the checker into infrastructure for every other roadmap item.
- **Acceptance criteria:**
  - Badge renders for any previously scanned domain; documented snippet in README (add aeo.js's own badge — eat your own dog food).
  - Public API documented, rate-limited (reuse `lib/rate-limit.ts`), returns the same JSON stored in `report_json`.
  - Permalink links unfurl on X/LinkedIn/Discord with domain + score + category breakdown.

#### 2.3 Browser extension (rebuild, in-repo this time)
- **What:** Chrome/Firefox MV3 extension: open any page → popup shows live GEO score, category breakdown, detected JSON-LD, whether llms.txt / ai-index.json exist, and one-click "view this page as an AI sees it" (markdown render via the existing `widget/extract.ts` logic). DevTools panel for the deep view.
- **Why:** Extensions are inherently viral among devs (Wappalyzer, Lighthouse pattern). "Check any site you browse" makes aeo.js a daily-use tool, not a one-time setup.
- **Current state:** `extension/` contains only built `dist/` output and node_modules — **the source was never committed**. Rebuild as a proper workspace (`extension/src/`) reusing `src/core/` audit + extract code so the score matches the CLI exactly. For full-site signals (llms.txt, robots matrix, sitemap) it can call the checker's public API (2.2) instead of re-crawling.
- **Acceptance criteria:**
  - Source committed, builds reproducibly (`extension/` workspace with its own build script).
  - Popup score matches `aeo.js check <url>` for the same page (shared scoring code, not a fork).
  - Published to Chrome Web Store + Firefox Add-ons; store listing links to aeojs.org.
  - "Share score" button generates the 2.2 score-card link.

#### 2.4 GitHub Action — `aeo-check`
- **What:** A marketplace action that runs `aeo.js check` on the build output (or preview URL) and comments the score + diff on PRs ("GEO score: 82 → 87 ▲").
- **Why:** CI comments are seen by whole teams → organic spread inside companies. Marketplace listing is free distribution.
- **Acceptance criteria:** published action, PR-comment mode, fail-threshold option (`min-score: 70`), README example.

### P1 — Reach & ecosystem

#### 2.5 SvelteKit and Remix plugins
- Types already include them (`FrameworkType`); detection already recognizes them. Ship `aeo.js/sveltekit` and `aeo.js/remix` following the existing plugin pattern in `src/plugins/`. Add demo apps + docs pages like the other six. Svelte devs are a loud, appreciative community — good launch-tweet material on its own.

#### 2.6 MCP server — `aeo.js mcp`
- Expose `audit_url`, `citability_report`, and `generate_files` as MCP tools so Claude Code / agents can audit and fix sites conversationally. MCP is high-attention right now; "ask Claude to make your site AI-readable" is a great demo video. Small surface: wrap existing core functions in an MCP stdio server entry point.

#### 2.7 AI crawler analytics ("who's reading your llms.txt?")
- **What:** Lightweight edge middleware / log-parser (`aeo.js/analytics`) that detects hits from GPTBot, ClaudeBot, PerplexityBot, etc. and produces a simple report; optionally a hosted dashboard later.
- **Why:** Closes the loop — today users generate files but never see proof AI crawlers consume them. "GPTBot visited 14× this week" is retention *and* a shareable stat. This is also the natural seed for a paid tier.

#### 2.8 `aeo.js fix` — autofix mode
- The audit already produces actionable suggestions; add a command that applies the mechanical ones (missing meta description stubs, missing alt placeholders, JSON-LD injection from detected FAQ/HowTo patterns). "Lighthouse tells you what's wrong; aeo.js fixes it" is a strong differentiator.

### P2 — Platform & polish

- **Leaderboard upgrades** on check.aeojs.org (leaderboard + most-scanned already shipped): category filters (docs, SaaS, blogs), and **scheduled rescans** so leaderboard scores stay fresh (Cloudflare cron → existing scan pipeline). People campaign to get on leaderboards.
- **Score monitoring**: weekly re-audit + email/webhook on score changes, building on the existing per-host history in Supabase (hosted; future monetization). Add JSON/CSV export alongside the existing markdown export.
- **Docusaurus/VitePress plugins**: docs sites are the highest-affinity audience for llms.txt.
- **i18n llms.txt** and per-locale ai-index for multilingual sites.
- **Toolchain housekeeping:** add a real linter/formatter (Biome) — currently only `tsc --noEmit`; keep npm as the repo's package manager (established standard).

### Explicit non-goals (for now)
- No paid product before the viral loops exist (analytics dashboard is the first candidate, later).
- No attempt to influence *off-site* AEO (model training data, third-party citations) — already documented as out of scope.
- No CMS plugins (WordPress etc.) until the JS ecosystem motion is proven.

---

## Part 3 — Growth & social plan

### 3.1 Foundations (week 0–1, before any launch push)
- [ ] Create **@aeojs** on X/Twitter (+ Bluesky mirror). Bio links to `npx aeo.js check yoursite.com`.
- [ ] README polish: 30-second value prop at top, the one-liner try-out command above the fold, fresh demo GIF showing `check` on a real site.
- [ ] Cross-link hard: aeojs.org homepage gets a prominent "Check your site" box/CTA pointing at check.aeojs.org (the checker already exists — make it impossible to miss); checker results pages link back to install docs for every failing category.
- [ ] Make sure aeo.js's own properties score 95+ (people *will* check).
- [ ] Set up plausible/umami analytics on aeojs.org + UTM discipline for all launch links.

### 3.2 Launch ladder (sequence, don't fire all at once)
Each P0 feature is its own launch moment. Order:

1. **`npx aeo.js check <url>`** → Show HN: "Show HN: Check if your site is visible to ChatGPT in 10 seconds". HN loves zero-install CLI tools + AI anxiety. Same day: Twitter thread, r/webdev, r/SEO, lobste.rs.
2. **Badges + public API** → "Add your AI-readiness badge" tweet; reply-guy famous OSS repos with their scores (politely). The checker's existing leaderboard and permalinks make this launch mostly marketing, not engineering.
3. **Browser extension** → Product Hunt launch (extensions do well there) + demo video.
4. **GitHub Action** → marketplace + "add AEO checks to CI" dev.to post.
5. **MCP server** → demo video of Claude auditing + fixing a site; post in MCP/AI-tooling communities.

### 3.3 Content engine (2–3 posts/week, repeatable formats)
- **Public audits:** "We ran the GEO audit on the top 50 YC company sites — 80% are invisible to AI crawlers. Results: 🧵". Data + named sites = quote-tweets. Repeat per niche (docs sites, dev tools, news sites, e-commerce).
- **Before/after case studies:** install aeo.js on a real site, show Perplexity/ChatGPT citing it weeks later. Even one solid case study is gold.
- **Explainer threads:** "What is llms.txt and why your site needs one", "How ChatGPT decides what to cite", "GEO vs SEO in 60 seconds". You become the educator → the tool follows.
- **Score-of-the-week:** audit a famous site, post the card. Cheap, recurring, taggable.
- **Cross-post** every thread as dev.to / Hashnode / LinkedIn articles for SEO (ironically) and reach beyond X.

### 3.4 Community & ecosystem distribution
- [ ] PRs adding aeo.js to popular starter templates (Astro themes, Next.js starters, Starlight) — each merged template is permanent distribution.
- [ ] Get listed: awesome-astro, awesome-nextjs, awesome-seo, llms.txt directories/communities.
- [ ] Engage the llms.txt standard discussions (GitHub, X) — be the reference implementation.
- [ ] Discord (or GitHub Discussions first) once there's inbound traffic; don't open an empty room.
- [ ] Reach out to 5–10 dev YouTubers/newsletters (Theo, Fireship-style, TLDR, Bytes) when the extension launches — the demo is visual, which is what they need.
- [ ] Talk/lightning-talk submissions: ViteConf, Astro community calls, SEO conferences moving into GEO.

### 3.5 Built-in viral loops (product = marketing)
- Generated `llms.txt` ends with `# Generated by aeo.js (aeojs.org)` (already-common convention, keep it).
- Score-card pages and badges all link back to the 10-second try-out command.
- Extension store listings + GitHub Action marketplace are permanent passive channels.
- Leaderboard pages rank well in search for "site name + AEO score".

### 3.6 Metrics (review weekly)
| Funnel stage | Metric | 90-day target |
|---|---|---|
| Awareness | X followers / post impressions | 2k followers |
| Try-out | `check <url>` runs (CLI telemetry: opt-out, anonymous count only) + web checker audits | 5k audits |
| Adoption | npm downloads/week | 1k/week (from ~12) |
| Retention | repos with badge / Action installs / extension WAU | 100 badges, 500 extension WAU |
| Community | GitHub stars | 2k |

---

## Part 4 — Suggested 8-week sequence

| Week | Product | Marketing |
|---|---|---|
| 1 | Unify remote scoring in lib; URL mode for `check` (2.1) | Foundations: @aeojs account, README/homepage polish, cross-link checker |
| 2 | Badge endpoint + public API on checker (2.2) | Show HN launch for `check <url>`; first audit thread |
| 3 | Extension rebuild starts (2.3); SvelteKit plugin (2.5) | "Top 50 sites audited" data post; SvelteKit launch tweet |
| 4 | Extension MVP (popup score) | Explainer threads; template/awesome-list PRs |
| 5 | Extension store submission; GitHub Action (2.4) | Before/after case study #1 |
| 6 | Extension launch fixes; Remix plugin | Product Hunt launch (extension) |
| 7 | MCP server (2.6) | MCP demo video; YouTuber/newsletter outreach |
| 8 | Crawler analytics MVP (2.7) | "Who's crawling your site" data post; review metrics, re-plan |

---

## Assumptions & open questions
- **check.aeojs.org** source is at `~/work/aeochecker` (Next.js 16 / React 19 on Cloudflare Workers via OpenNext, Supabase persistence). It currently pins `aeo.js@0.0.11` and reimplements the remote 5-category audit in `lib/remote-audit.ts` — 2.1 resolves both. Confirmed shareability gaps there: no badge endpoint, no public JSON API, some pages still use static `/og.png`, no scheduled rescans, markdown-only export.
- CLI telemetry (audit counts) must be opt-out, anonymous, and disclosed in the README — confirm you're comfortable shipping any telemetry at all; the plan works without it, you just lose the try-out metric.
- Targets in 3.6 are order-of-magnitude guesses for an early OSS tool, not commitments.
- Public-audit content names real companies; keep tone "here's how to fix it" rather than shaming, and re-verify scores before posting.
