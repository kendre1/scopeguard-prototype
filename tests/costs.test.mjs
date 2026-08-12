/**
 * Data-layer tests — data/costs.js
 *
 * Covers GAP-1 (regional multiplier resolution), GAP-4 (cost-table shape and
 * the markup↔data contract), GAP-5 (milestone templates total 100%) and
 * GAP-6's fraction bounds from specs/test-hardening.md.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { loadEstimator, readSource, selectOptionValues } from "./helpers/load_app.mjs";

const app = loadEstimator();
const { getMultiplier, COST_DATA, REGION_MULTIPLIERS, MILESTONES, KITCHEN_ALLOWANCES } = app;

const FINISH_LEVELS = ["basic", "mid", "luxury"];

test("getMultiplier: missing or empty location defaults to 1.0", () => {
  assert.equal(getMultiplier(""), 1.0);
  assert.equal(getMultiplier(null), 1.0);
  assert.equal(getMultiplier(undefined), 1.0);
});

test("getMultiplier: an unrecognized location falls back to the default multiplier", () => {
  assert.equal(getMultiplier("Nowheresville, ZZ"), REGION_MULTIPLIERS.default);
  assert.equal(getMultiplier("99999"), REGION_MULTIPLIERS.default);
});

test("getMultiplier: exact ZIP entries resolve to their own rate", () => {
  assert.equal(getMultiplier("10001"), 1.45);
  assert.equal(getMultiplier("10002"), 1.45);
});

test("getMultiplier: ZIP-prefix entries match longer ZIPs", () => {
  assert.equal(getMultiplier("94110"), 1.50); // 941 — SF
  assert.equal(getMultiplier("60614"), 1.10); // 606 — Chicago
  assert.equal(getMultiplier("85018"), 0.95); // 850 — Phoenix
});

test("getMultiplier: input is trimmed and case-insensitive", () => {
  assert.equal(getMultiplier("  10001  "), 1.45);
  assert.equal(getMultiplier("CHICAGO"), 1.10);
  assert.equal(getMultiplier("  New York, NY "), 1.45);
});

test("getMultiplier: city-name heuristics resolve without a ZIP", () => {
  assert.equal(getMultiplier("New York, NY"), 1.45);
  assert.equal(getMultiplier("Brooklyn"), 1.45);
  assert.equal(getMultiplier("San Francisco, CA"), 1.50);
  assert.equal(getMultiplier("Los Angeles"), 1.40);
  assert.equal(getMultiplier("Boston, MA"), 1.35);
  assert.equal(getMultiplier("Seattle"), 1.30);
  assert.equal(getMultiplier("Chicago, IL"), 1.10);
  assert.equal(getMultiplier("Miami"), 1.15);
  assert.equal(getMultiplier("Denver"), 1.15);
  assert.equal(getMultiplier("Atlanta"), 1.05);
  assert.equal(getMultiplier("Austin, TX"), 1.05);
  assert.equal(getMultiplier("Phoenix"), 0.95);
});

test("getMultiplier: ZIP prefixes take precedence over city-name heuristics", () => {
  // "021" (Boston, 1.35) is checked in the prefix loop before any city name.
  assert.equal(getMultiplier("02134"), 1.35);
});

test("getMultiplier: shorter numeric prefixes shadow longer exact ZIPs", () => {
  // A genuine footgun, pinned deliberately. getMultiplier iterates
  // Object.keys(REGION_MULTIPLIERS) and returns the FIRST startsWith hit — but
  // JS enumerates integer-like keys in ascending NUMERIC order, not source
  // order. So "100" is tested before "10001" even though costs.js lists the
  // exact NYC ZIPs first, which makes those exact entries unreachable.
  const keys = Object.keys(REGION_MULTIPLIERS);
  assert.ok(
    keys.indexOf("100") < keys.indexOf("10001"),
    "expected numeric-ascending key enumeration, not source order"
  );
  // Harmless today only because both entries carry the same rate.
  assert.equal(getMultiplier("10001"), 1.45);
  assert.equal(getMultiplier("10055"), 1.45);
});

test("getMultiplier: no ZIP entry is shadowed by a shorter entry with a different rate", () => {
  // The regression guard for the shadowing above: adding e.g. "10004": 1.60
  // next to the existing "100": 1.45 would silently never take effect. Any
  // longer numeric key must agree with every shorter numeric key that prefixes
  // it — otherwise the longer one is dead configuration.
  const numericKeys = Object.keys(REGION_MULTIPLIERS).filter((k) => /^\d+$/.test(k));
  for (const key of numericKeys) {
    for (const other of numericKeys) {
      if (other.length < key.length && key.startsWith(other)) {
        assert.equal(
          REGION_MULTIPLIERS[key],
          REGION_MULTIPLIERS[other],
          `REGION_MULTIPLIERS["${key}"] (${REGION_MULTIPLIERS[key]}) is unreachable: ` +
            `the shorter prefix "${other}" (${REGION_MULTIPLIERS[other]}) matches first`
        );
      }
    }
  }
});

test("getMultiplier: the abbreviation heuristics require a trailing space", () => {
  // Pins a real footgun documented in CLAUDE.md: the "sf " / "la " heuristics
  // match a trailing space, so a bare abbreviation does NOT resolve. If this
  // test starts failing, the heuristics were made more permissive on purpose —
  // update it deliberately rather than by accident.
  assert.equal(getMultiplier("sf bay area"), 1.50);
  assert.equal(getMultiplier("sf"), REGION_MULTIPLIERS.default);
  assert.equal(getMultiplier("la"), REGION_MULTIPLIERS.default);
});

test("COST_DATA: every room type defines all three finish tiers as ascending pairs", () => {
  const roomTypes = Object.keys(COST_DATA);
  assert.ok(roomTypes.length > 0, "COST_DATA must not be empty");
  for (const roomType of roomTypes) {
    for (const finish of FINISH_LEVELS) {
      const range = COST_DATA[roomType][finish];
      assert.ok(
        Array.isArray(range) && range.length === 2,
        `COST_DATA.${roomType}.${finish} must be a [low, high] pair`
      );
      const [low, high] = range;
      assert.ok(
        Number.isFinite(low) && Number.isFinite(high),
        `COST_DATA.${roomType}.${finish} must hold finite numbers`
      );
      assert.ok(low > 0, `COST_DATA.${roomType}.${finish} low must be positive`);
      assert.ok(
        low < high,
        `COST_DATA.${roomType}.${finish} low (${low}) must be below high (${high})`
      );
    }
  }
});

test("COST_DATA: an 'other' fallback entry exists for unknown room types", () => {
  assert.ok(COST_DATA.other, "calculateEstimate falls back to COST_DATA.other");
});

test("every room type offered in the markup has cost data behind it", () => {
  // The three-place contract: index.html <select> ↔ COST_DATA keys ↔ finish
  // tiers. Adding an option without data silently estimates it as "other".
  const html = readSource("index.html");
  const offered = new Set([
    ...selectOptionValues(html, "roomType"),
    ...selectOptionValues(html, "plansRoomType")
  ]);
  assert.ok(offered.size > 0, "no room-type options found in index.html");
  for (const roomType of offered) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(COST_DATA, roomType),
      `index.html offers room type "${roomType}" with no COST_DATA entry — ` +
        `it would silently be estimated as "other"`
    );
  }
});

test("every finish level offered in the markup exists in the cost tables", () => {
  const html = readSource("index.html");
  const offered = new Set([
    ...selectOptionValues(html, "plansFinish"),
    ...[...html.matchAll(/<input[^>]*\bname="finish"[^>]*>/g)]
      .map((m) => /\bvalue="([^"]*)"/.exec(m[0]))
      .filter(Boolean)
      .map((m) => m[1])
  ]);
  assert.ok(offered.size > 0, "no finish-level options found in index.html");
  for (const finish of offered) {
    assert.ok(
      FINISH_LEVELS.includes(finish),
      `index.html offers finish level "${finish}" which is not a cost tier`
    );
    for (const roomType of Object.keys(COST_DATA)) {
      assert.ok(
        COST_DATA[roomType][finish],
        `COST_DATA.${roomType} has no "${finish}" tier`
      );
    }
  }
});

test("MILESTONES: every template's percentages total 100", () => {
  // These percentages are rendered as an actual dollar split of the estimate —
  // a template that does not total 100 misallocates the user's budget.
  for (const [name, template] of Object.entries(MILESTONES)) {
    assert.ok(Array.isArray(template) && template.length > 0, `${name} must have stages`);
    const total = template.reduce((sum, m) => sum + m.pct, 0);
    assert.equal(total, 100, `MILESTONES.${name} totals ${total}%, expected 100%`);
    for (const stage of template) {
      assert.equal(typeof stage.stage, "string");
      assert.ok(stage.stage.length > 0, `${name} has a stage with no label`);
      assert.ok(stage.pct > 0, `${name} has a non-positive percentage`);
    }
  }
});

test("MILESTONES: each template holds back a final retention payment", () => {
  // Core negotiation advice from the README: never pay out 100% before walkthrough.
  for (const [name, template] of Object.entries(MILESTONES)) {
    const final = template[template.length - 1];
    assert.ok(
      /retention/i.test(final.stage),
      `MILESTONES.${name} must end on a retention stage, got "${final.stage}"`
    );
    assert.ok(final.pct > 0, `MILESTONES.${name} retention must be non-zero`);
  }
});

test("KITCHEN_ALLOWANCES: every category is a labelled fraction range within 0-1", () => {
  const categories = Object.entries(KITCHEN_ALLOWANCES);
  assert.ok(categories.length > 0, "KITCHEN_ALLOWANCES must not be empty");
  for (const [key, value] of categories) {
    assert.equal(typeof value.label, "string");
    assert.ok(value.label.length > 0, `${key} needs a display label`);
    assert.ok(value.low > 0 && value.low < 1, `${key}.low must be a fraction`);
    assert.ok(value.high > 0 && value.high < 1, `${key}.high must be a fraction`);
    assert.ok(value.low < value.high, `${key}.low must be below ${key}.high`);
  }
});
