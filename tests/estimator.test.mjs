/**
 * Estimator tests — js/estimator.js
 *
 * Covers GAP-2 (estimate arithmetic invariants), GAP-3 (scope-factor
 * composition), GAP-4 (unknown-key fallbacks), GAP-5 (milestone routing) and
 * GAP-6 (kitchen allowance splits) from specs/test-hardening.md.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { loadEstimator } from "./helpers/load_app.mjs";

const app = loadEstimator();
const {
  calculateEstimate,
  formatCurrency,
  getMilestoneTemplate,
  getKitchenAllowances,
  COST_DATA,
  MILESTONES,
  KITCHEN_ALLOWANCES
} = app;

/** A neutral baseline: no location multiplier, no scope adjustments. */
function estimate(overrides = {}) {
  return calculateEstimate({
    roomType: "kitchen",
    sqft: 100,
    finish: "mid",
    location: "",
    changes: [],
    ...overrides
  });
}

// --- GAP-2: core arithmetic invariants ------------------------------------

test("calculateEstimate: low <= mid <= high", () => {
  for (const roomType of Object.keys(COST_DATA)) {
    for (const finish of ["basic", "mid", "luxury"]) {
      const r = estimate({ roomType, finish });
      assert.ok(r.low <= r.mid, `${roomType}/${finish}: low ${r.low} > mid ${r.mid}`);
      assert.ok(r.mid <= r.high, `${roomType}/${finish}: mid ${r.mid} > high ${r.high}`);
    }
  }
});

test("calculateEstimate: mid is the midpoint of low and high", () => {
  const r = estimate({ sqft: 137, location: "Denver" });
  assert.equal(r.mid, Math.round((r.low + r.high) / 2));
});

test("calculateEstimate: money values are whole dollars", () => {
  const r = estimate({ sqft: 137, location: "Boston", changes: ["plumbing"] });
  for (const field of [
    "low",
    "mid",
    "high",
    "gcFeeLow",
    "gcFeeHigh",
    "contingencyLow",
    "contingencyHigh"
  ]) {
    assert.ok(Number.isInteger(r[field]), `${field} must be a whole dollar amount`);
  }
});

test("calculateEstimate: cost scales linearly with square footage", () => {
  const single = estimate({ sqft: 100 });
  const double = estimate({ sqft: 200 });
  assert.equal(double.low, single.low * 2);
  assert.equal(double.high, single.high * 2);
});

test("calculateEstimate: cost scales with the regional multiplier", () => {
  const national = estimate({ location: "" });
  const newYork = estimate({ location: "10001" });
  assert.equal(newYork.multiplier, 1.45);
  assert.equal(newYork.low, Math.round(national.low * 1.45));
  assert.equal(newYork.high, Math.round(national.high * 1.45));
});

test("calculateEstimate: uses the base $/sqft range for the room type and finish", () => {
  const [baseLow, baseHigh] = COST_DATA.bathroom.luxury;
  const r = estimate({ roomType: "bathroom", finish: "luxury", sqft: 50 });
  assert.equal(r.low, baseLow * 50);
  assert.equal(r.high, baseHigh * 50);
});

test("calculateEstimate: GC fee is 12% of low and 18% of high", () => {
  const r = estimate({ sqft: 180, location: "Seattle" });
  assert.equal(r.gcFeeLow, Math.round(r.low * 0.12));
  assert.equal(r.gcFeeHigh, Math.round(r.high * 0.18));
  assert.ok(r.gcFeeLow < r.gcFeeHigh);
});

test("calculateEstimate: contingency is 10% of low and 15% of high", () => {
  const r = estimate({ sqft: 180, location: "Seattle" });
  assert.equal(r.contingencyLow, Math.round(r.low * 0.1));
  assert.equal(r.contingencyHigh, Math.round(r.high * 0.15));
  assert.ok(r.contingencyLow < r.contingencyHigh);
});

test("calculateEstimate: returns every field the results view renders", () => {
  // showResults() in js/app.js reads each of these; a dropped field renders
  // "undefined" into the user's budget with no error.
  const r = estimate();
  for (const field of [
    "roomType",
    "sqft",
    "finish",
    "location",
    "multiplier",
    "path",
    "low",
    "mid",
    "high",
    "gcFeeLow",
    "gcFeeHigh",
    "contingencyLow",
    "contingencyHigh",
    "scopeFactor",
    "changes"
  ]) {
    assert.ok(field in r, `calculateEstimate must return "${field}"`);
    assert.notEqual(r[field], undefined, `"${field}" must not be undefined`);
  }
});

test("calculateEstimate: applies defaults when called with an empty input", () => {
  const r = calculateEstimate({});
  assert.equal(r.roomType, "other");
  assert.equal(r.sqft, 150);
  assert.equal(r.finish, "mid");
  assert.equal(r.path, "photos");
  assert.equal(r.multiplier, 1.0);
  assert.ok(r.low > 0 && r.high > r.low);
});

// --- GAP-3: scope-intensity composition -----------------------------------

test("calculateEstimate: no selected changes leaves the scope factor at 1.0", () => {
  assert.equal(estimate({ changes: [] }).scopeFactor, 1.0);
});

test("calculateEstimate: a structural change adds 25% scope intensity", () => {
  assert.equal(estimate({ changes: ["full_gut"] }).scopeFactor, 1.25);
  assert.equal(estimate({ changes: ["layout"] }).scopeFactor, 1.25);
});

test("calculateEstimate: full_gut and layout together are not double-counted", () => {
  // Deliberate product behavior: the structural bump applies once, not twice.
  assert.equal(estimate({ changes: ["full_gut", "layout"] }).scopeFactor, 1.25);
});

test("calculateEstimate: a systems change adds 10% scope intensity", () => {
  assert.equal(estimate({ changes: ["plumbing"] }).scopeFactor, 1.1);
  assert.equal(estimate({ changes: ["electrical"] }).scopeFactor, 1.1);
  assert.equal(estimate({ changes: ["plumbing", "electrical"] }).scopeFactor, 1.1);
});

test("calculateEstimate: structural and systems changes compose additively", () => {
  const r = estimate({ changes: ["full_gut", "plumbing"] });
  assert.ok(
    Math.abs(r.scopeFactor - 1.35) < 1e-9,
    `expected 1.35, got ${r.scopeFactor}`
  );
});

test("calculateEstimate: a full cabinets+counters+appliances package adds no extra", () => {
  // Already priced into the base $/sqft range — documented in js/estimator.js.
  const r = estimate({ changes: ["cabinets", "counters", "appliances"] });
  assert.equal(r.scopeFactor, 1.0);
});

test("calculateEstimate: finish-only changes do not alter scope intensity", () => {
  assert.equal(estimate({ changes: ["flooring"] }).scopeFactor, 1.0);
  assert.equal(estimate({ changes: ["cabinets"] }).scopeFactor, 1.0);
});

test("calculateEstimate: the scope factor multiplies the final range", () => {
  const plain = estimate({ changes: [] });
  const gutted = estimate({ changes: ["full_gut"] });
  assert.equal(gutted.low, Math.round(plain.low * 1.25));
  assert.equal(gutted.high, Math.round(plain.high * 1.25));
});

test("calculateEstimate: the plans path's assumed full-gut scope yields 1.25", () => {
  // js/app.js hardcodes changes: ["full_gut"] for the plans path.
  const r = estimate({ path: "plans", changes: ["full_gut"] });
  assert.equal(r.scopeFactor, 1.25);
  assert.equal(r.path, "plans");
});

// --- GAP-4: fallbacks for unknown keys ------------------------------------

test("calculateEstimate: an unknown room type falls back to the 'other' cost table", () => {
  const unknown = estimate({ roomType: "wine_cellar" });
  const other = estimate({ roomType: "other" });
  assert.equal(unknown.low, other.low);
  assert.equal(unknown.high, other.high);
  // The unrecognized label is still echoed back for display.
  assert.equal(unknown.roomType, "wine_cellar");
});

test("calculateEstimate: an unknown finish level falls back to the mid tier", () => {
  const unknown = estimate({ finish: "platinum" });
  const mid = estimate({ finish: "mid" });
  assert.equal(unknown.low, mid.low);
  assert.equal(unknown.high, mid.high);
});

// --- GAP-5: milestone template routing ------------------------------------

test("getMilestoneTemplate: kitchens get the kitchen schedule", () => {
  assert.equal(getMilestoneTemplate("kitchen"), MILESTONES.kitchen);
});

test("getMilestoneTemplate: both bathroom variants get the bathroom schedule", () => {
  assert.equal(getMilestoneTemplate("bathroom"), MILESTONES.bathroom);
  assert.equal(getMilestoneTemplate("bathroom_half"), MILESTONES.bathroom);
});

test("getMilestoneTemplate: every other room type gets the default schedule", () => {
  for (const roomType of ["basement", "addition", "whole_house", "other", "wine_cellar"]) {
    assert.equal(
      getMilestoneTemplate(roomType),
      MILESTONES.default,
      `${roomType} should use the default milestone template`
    );
  }
});

test("getMilestoneTemplate: the routed schedule always splits the full budget", () => {
  for (const roomType of [...Object.keys(COST_DATA), "wine_cellar"]) {
    const total = getMilestoneTemplate(roomType).reduce((sum, m) => sum + m.pct, 0);
    assert.equal(total, 100, `${roomType}'s schedule totals ${total}%`);
  }
});

// --- GAP-6: kitchen allowance splits --------------------------------------

test("getKitchenAllowances: returns every benchmark category with its label", () => {
  const allowances = getKitchenAllowances(100000);
  assert.equal(allowances.length, Object.keys(KITCHEN_ALLOWANCES).length);
  for (const row of allowances) {
    assert.ok(KITCHEN_ALLOWANCES[row.key], `unknown allowance key "${row.key}"`);
    assert.equal(row.label, KITCHEN_ALLOWANCES[row.key].label);
  }
});

test("getKitchenAllowances: each row's low is below its high", () => {
  for (const row of getKitchenAllowances(100000)) {
    assert.ok(row.low < row.high, `${row.key}: low ${row.low} >= high ${row.high}`);
  }
});

test("getKitchenAllowances: amounts are the configured fraction of the total", () => {
  const total = 80000;
  for (const row of getKitchenAllowances(total)) {
    const spec = KITCHEN_ALLOWANCES[row.key];
    assert.equal(row.low, Math.round(total * spec.low));
    assert.equal(row.high, Math.round(total * spec.high));
  }
});

test("getKitchenAllowances: amounts scale proportionally with the budget", () => {
  const small = getKitchenAllowances(50000);
  const large = getKitchenAllowances(100000);
  for (let i = 0; i < small.length; i++) {
    assert.equal(large[i].key, small[i].key);
    assert.equal(large[i].low, small[i].low * 2);
    assert.equal(large[i].high, small[i].high * 2);
  }
});

// --- Display formatting ----------------------------------------------------

test("formatCurrency: renders whole-dollar USD", () => {
  assert.equal(formatCurrency(0), "$0");
  assert.equal(formatCurrency(1500), "$1,500");
  assert.equal(formatCurrency(1234567), "$1,234,567");
  // No cents — the estimate is a planning range, not an invoice.
  assert.equal(formatCurrency(1500.49), "$1,500");
});
