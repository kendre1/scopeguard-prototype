# ScopeGuard — Homeowner Co-Pilot Prototype

> Project memory for Claude Code. Keep this concise, accurate, and current — it is loaded into context every session.

## Overview
ScopeGuard is a client-side prototype that turns a homeowner's renovation idea into a defensible planning budget for general-contractor (GC) negotiations. A user enters a project either from **photos + details** (a short questionnaire — the common path) or from **plans / drawings**, and gets back a cost range adjusted for region and finish level, a market-aligned payment-milestone schedule, kitchen allowance benchmarks, and negotiation tips. Everything is illustrative planning data, not a quote — that framing is a product requirement, not a disclaimer formality.

## Architecture
A single static page with no backend, no build step, and no runtime dependencies. Three plain `<script>` tags at the bottom of `index.html` load in a fixed order into one shared global namespace:

1. `data/costs.js` — the data layer. `COST_DATA` ($/sqft ranges per room type × finish level), `REGION_MULTIPLIERS` (ZIP-prefix → factor), `KITCHEN_ALLOWANCES`, `MILESTONES`, `NEGOTIATION_TIPS`, plus `getMultiplier(location)` which resolves a free-text location by ZIP prefix first, then city-name heuristics.
2. `js/estimator.js` — the pure calculation layer. `calculateEstimate(input)` composes `base $/sqft × sqft × regionMultiplier × scopeFactor` into `{low, mid, high}`, then derives GC fee (12–18%) and contingency (10–15%). Also `formatCurrency`, `getMilestoneTemplate(roomType)`, `getKitchenAllowances(totalMid)`.
3. `js/app.js` — the UI layer. Section show/hide (`startPath`, `backToLanding`), form handlers that read the DOM and call `calculateEstimate`, and `showResults` which renders the whole result view as an `innerHTML` template string.

Flow: user clicks an entry card → the matching `<section>` un-hides → submit handler reads inputs by element id → `calculateEstimate` → `showResults` writes into `#resultContent`. There is no router, no state store, and no persistence — a page reload resets everything.

## Key Directories & Entry Points
- `index.html` — **the entry point**. App shell, both forms, the results container, and the inline `onclick`/`onsubmit` handlers that call the globals in `js/app.js`.
- `js/app.js` — UI logic and rendering.
- `js/estimator.js` — cost calculation (the highest-value logic to test).
- `data/costs.js` — sample cost tables, multipliers, milestones, allowances, tips.
- `css/styles.css` — small custom additions on top of Tailwind (loaded from a CDN).
- `tests/` — dependency-free `node:test` suite. `tests/helpers/load_app.mjs` evaluates the browser scripts in a Node `vm` context in index.html's load order, so the sources stay untouched by testability concerns; `dom_contract.test.mjs` statically checks the markup↔script couplings.
- `.claude/` — agentic setup: commands, the `code-reviewer` subagent, the safety hook, and the e2e flows + journey registry under `.claude/commands/e2e/`.
- `adws/` — the AI Developer Workflow harness; per-repo settings in `adws/adw_config.json`.
- `specs/` — plans written by `/feature`, `/bug`, `/chore`; `ai_docs/` — curated external docs.

## Commands
> The real, verified commands for this repo.

- Install:   *none* — zero dependencies, nothing to install
- Build:     *none* — no build step; the browser loads the source directly
- Test:      `node --check data/costs.js && node --check js/estimator.js && node --check js/app.js` then `node --test "tests/**/*.test.mjs"`
- Lint:      *none configured*
- Format:    *none configured*
- Run / dev: `python3 -m http.server 8000` → http://localhost:8000

The `Test` line above is the repo's validation pipeline as wired into `adws/adw_config.json` (`commands.test_sequence`), which `/test` renders at run time. Keep the two in sync — edit the config, never the prompt body.

Coverage is deliberately unconfigured: the suite loads the browser scripts through Node's `vm`, and `--experimental-test-coverage` instruments only the test files, so any number it produced would measure the tests rather than the app.

## Conventions
- **Vanilla JS, no modules.** Plain scripts sharing globals — no `import`/`export`, no bundler, no npm runtime dependencies. Adding any of those is a deliberate architecture change, not a routine one.
- **Load order matters.** `data/costs.js` → `js/estimator.js` → `js/app.js`. A symbol must be defined before a later script uses it, and top-level names must not collide.
- Two-space indent; double-quoted strings in JS; `camelCase` functions; `SCREAMING_SNAKE_CASE` for module-level data tables; a `/** */` banner comment at the top of each JS file.
- Styling is Tailwind utility classes in the markup; `css/styles.css` holds only what utilities can't express (animations, focus resets).
- Tests: unit-level logic (estimator math, multiplier resolution, allowance splits) goes in `tests/*.test.mjs` using only `node:test`/`node:assert` — the suite must stay dependency-free like the app. Only critical user journeys become e2e flows, and every flow must be registered in `.claude/commands/e2e/journeys.json`.
- When adding a room type or finish level, update `index.html`, `data/costs.js`, **and** check `tests/costs.test.mjs` — the markup↔data contract test will fail loudly if you miss one.

## Gotchas
- **Room type and finish level are a three-place contract.** A new option in an `index.html` `<select>` must also exist in `COST_DATA` (and its finish tiers), or `calculateEstimate` silently falls back to `COST_DATA.other` / `ranges.mid` and quietly produces a wrong number.
- **`getMultiplier` is first-match-wins over object key order.** Short ZIP prefixes shadow longer ones, and the city heuristics `"sf "` / `"la "` match on a *trailing space* — a bare `"sf"` will not match. Adding a key can change an existing lookup's result.
- **DOM ids are an untyped contract.** `js/app.js` reaches for `#roomType`, `#sqft`, `#location`, `#notes`, `#plansRoomType`, `#plansSqft`, `#plansLocation`, `#plansFinish`, `#plansNotes`, `#photoPreview`, `#resultContent`, and the section ids `landing`/`photos-form`/`plans-form`/`results`. Renaming one side breaks silently at runtime.
- **`showResults` writes user input into `innerHTML`.** The free-text notes field is interpolated unescaped — any newly interpolated user-controlled value is an XSS vector. Escape it or use `textContent`.
- **`parseInt(...) || default`** treats `0` and `NaN` alike, so a legitimate zero becomes the default.
- **Tailwind comes from a CDN**, so styling (and therefore visual e2e assertions) needs network access. The app's logic works offline.
- **`URL.createObjectURL`** in `handlePhotoSelect` is never revoked — photo previews leak object URLs across submissions.
- All cost data is illustrative sample data. Never present it as a quote, and don't weaken the disclaimers in the landing copy, the amber results banner, the footer, or the README.

## Agentic Workflow
This repo is set up for spec-driven agentic engineering:
- Plan with `/feature`, `/bug`, or `/chore` — they write a detailed plan to `specs/*.md` (and return exclusively its path).
- Execute a plan with `/implement`; make a small targeted fix with `/patch`.
- Deliver a plan with `/ship` — a whole-plan commit on a feature branch behind a PR by default (decomposing into per-task commits only on a failed whole attempt), or `/ship --ultracode` for a fast single-commit Workflow build.
- For work too large for one `/feature` planner, decompose with `/epic` — it emits a DAG of features (a frozen fenced-JSON contract) and the epic harness walks it serial-topologically on one branch/PR, JIT-planning, building, and self-healing-gating each feature before advancing (headless from an issue via `adw_epic`).
- Finalize delivered work with `/close` — marks the spec done (`specs/<name>.md` → `specs/done-<name>.md`) and closes the issue. Headlessly, the unified pipeline (`adw_run`) closes the issue from its merge stage on a successful merge; `adw_close.py` is the standalone phase.
- Validate with `/test` (structured JSON results); fix a single failure with `/resolve_failed_test`.
- Verify spec compliance with `/review`; document shipped work with `/document`.
- Deliver with `/commit` and `/pull_request` (strict single-value outputs — automation parses them).
- Prime a fresh session with `/prime` — it also reconciles this file against the live repo and reports drift (`/prime --apply` fixes it in place, without bloating it); check `.claude/commands/conditional_docs.md` for which docs to read per task.
- Start the app locally with `/start`.
- E2E flows are curated via the journey registry: read `.claude/commands/e2e/journeys.json` before touching e2e — extend an existing journey's flow rather than adding a new one, and register any genuinely new journey (id, covers, tier). Flows are driven by the Playwright MCP server registered in `.mcp.json`, against the harness-started server at http://localhost:8000.
- Curated external docs live in `ai_docs/`; subagents live in `.claude/agents/` (`code-reviewer`); a safety hook in `.claude/hooks/` blocks dangerous commands.
- *(Forward-looking):* `/feedback_mine` scours owner-seeded venues (`adws/adw_config.json` `feedback_mining.venues`) and emits clustered user-feedback themes. It is **default-off** and platform-driven — installed but inert.
- `adws/` holds the AI Developer Workflow harness — headless plan→build→test→review→document pipelines driven by GitHub issues (see `adws/README.md`). Its per-repo settings live in `adws/adw_config.json`; never hand-edit the harness code itself.
