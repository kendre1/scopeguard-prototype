# Test Hardening Analysis

## Metadata
date: 2026-08-12
line_rate: 0.0
basis: structural
format: none
suite_command: none
candidates_analyzed: 4 files

> Basis note (honest reporting): the repo has **no test tooling and no test files**, so no line rate was measured. The structural proxy over the *application source* is 0 test files / 4 source files = **0.0**. Running the proxy over the whole working tree returns 0.017, but that number is diluted by the freshly vendored `adws/` harness (56 Python files that are athema infrastructure, not this project's source) — it is not a meaningful figure for ScopeGuard and is not used here.

> Candidate selection: churn is uninformative (the repo has a single commit, so every file has equal churn). Candidates are therefore the entire application source surface — 4 files, well under the ~15 cap — selected by entry point (`index.html`, `js/app.js`) and security surface (`innerHTML` sinks in `js/app.js`). All 4 were deep-read.

## Gaps

### GAP-1: Location strings resolve to the correct regional multiplier
- priority: P1
- level: unit
- files: data/costs.js
- rationale: `getMultiplier` is the highest-leverage pure function in the app — its return value multiplies **every** dollar figure the user sees. It is also the most fragile: it iterates `REGION_MULTIPLIERS` keys and returns the **first** `loc.startsWith(key)` hit, so insertion order silently decides the winner and a short ZIP prefix shadows a longer one. The city-name heuristics `"sf "` and `"la "` match on a *trailing space*, so a bare `"sf"` or `"la"` falls through to 1.0 — a latent bug no syntax check can see. Untested behaviors: exact-ZIP hits, prefix hits, prefix-shadowing order, case-insensitivity, whitespace trimming, city-name heuristics, the trailing-space heuristics specifically, and empty/missing input defaulting to 1.0.

### GAP-2: Estimate arithmetic holds its invariants
- priority: P1
- level: unit
- files: js/estimator.js, data/costs.js
- rationale: `calculateEstimate` is the product's core value proposition, and every downstream number (GC fee, contingency, milestone dollar splits, kitchen allowances) is derived from its output. Entry-point signal: both form handlers funnel into it. Untested invariants: `low <= mid <= high`; `mid` is exactly the midpoint of low and high; output scales linearly in `sqft` and in the region multiplier; GC fee is 12% of low and 18% of high; contingency is 10% of low and 15% of high; all money values are integers; the returned object carries every field `showResults` reads.

### GAP-3: Scope-intensity factors compose correctly and are not double-counted
- priority: P1
- level: unit
- files: js/estimator.js
- rationale: `scopeFactor` is built by additive mutation (`+= 0.25` for `full_gut` **or** `layout`; `+= 0.10` for `plumbing` **or** `electrical`), which makes double-counting the obvious regression when a new change flag is added. Also encodes a deliberate product decision worth pinning: selecting `full_gut` *and* `layout` together must still add only 0.25, not 0.50. Untested behaviors: no changes → 1.0; each flag group's contribution; both groups → 1.35; the deliberate no-op branch for the cabinets+counters+appliances combination; and that the plans path's hardcoded `["full_gut"]` yields 1.25.

### GAP-4: Unknown room types and finish levels fall back without silently misestimating
- priority: P1
- level: unit
- files: js/estimator.js, data/costs.js, index.html
- rationale: `COST_DATA[roomType] || COST_DATA.other` and `ranges[finish] || ranges.mid` are the only guards against an unknown key, and they fail **silently** — the user still gets a confident-looking number, just the wrong one. The real risk is the three-place contract between `index.html`'s `<select>` options, `COST_DATA`'s room-type keys, and each type's finish tiers: adding an option to the markup without adding data is an undetectable regression today. Untested invariants: the documented fallback behavior itself, and — critically — that **every** `roomType` value offered by either form's `<select>` exists in `COST_DATA`, and every one of those entries defines all three finish tiers with `[low, high]` pairs where `low < high`.

### GAP-5: Payment milestone templates route correctly and always total 100%
- priority: P2
- level: unit
- files: js/estimator.js, data/costs.js
- rationale: `getMilestoneTemplate` routes by `roomType === "kitchen"`, then `roomType.startsWith("bathroom")` (which deliberately catches both `bathroom` and `bathroom_half`), else default. The percentages are rendered as an actual dollar split of the mid estimate, so a template that does not sum to 100 silently misallocates the user's budget — the exact failure this product exists to prevent. Untested: routing for each room type, the `bathroom_half` prefix case, and a sum-to-100 invariant across all three templates.

### GAP-6: Kitchen allowance benchmarks split the budget proportionally
- priority: P2
- level: unit
- files: js/estimator.js, data/costs.js
- rationale: `getKitchenAllowances` maps `KITCHEN_ALLOWANCES` fractions onto the mid estimate and is shown to users as guidance for judging whether a GC's allowances are realistic — a wrong split produces bad negotiation advice. Untested: every category is returned with its label, each row's low is below its high, values scale proportionally with the total, and each fraction stays within 0–1.

### GAP-7: The UI's DOM and handler contracts stay intact
- priority: P2
- level: unit
- files: js/app.js, index.html
- rationale: This repo has no build step, no module system, and no type checker, so the couplings between markup and script are entirely untyped and fail **silently at runtime**. Two contracts are worth pinning as a test: (a) every element id `js/app.js` reaches for via `getElementById` exists in `index.html`, and (b) every inline `onclick`/`onsubmit`/`onchange` handler named in `index.html` is actually defined as a global function in `js/app.js`. Renaming either side today produces a dead button with no error at load time and no failing check anywhere in the pipeline.

### GAP-8: Free-text user input is not executed when rendered into the results view
- priority: P1
- level: e2e
- files: js/app.js
- journey: photos-path-estimate
- rationale: Security surface. `showResults` builds the entire results view as a template string assigned to `container.innerHTML` (js/app.js:219), and interpolates the user's free-text notes field unescaped (`${notes.trim()}`, js/app.js:214). Any markup a user types into "Anything else we should know?" is parsed as HTML. Today this is a self-XSS in a backend-less prototype, but the same sink is the one every future field (bid text, plan notes, an uploaded filename) will flow through, and the README's roadmap points at exactly that. The behavior to pin: text entered into the notes field is displayed as literal text and never executed as markup.
