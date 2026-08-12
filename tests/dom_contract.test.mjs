/**
 * Markup ↔ script contract tests — index.html + js/app.js
 *
 * Covers GAP-7 from specs/test-hardening.md.
 *
 * This repo has no build step, no module system and no type checker, so the
 * couplings between the markup and the scripts are entirely untyped: a renamed
 * element id or handler produces a dead control at runtime with no error at
 * load time and nothing else in the pipeline to catch it. These tests are
 * static analysis of the source text — no DOM, no dependencies.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readSource, SCRIPT_LOAD_ORDER } from "./helpers/load_app.mjs";

const html = readSource("index.html");
const appJs = readSource("js/app.js");
const estimatorJs = readSource("js/estimator.js");

/** Every `id="..."` present in index.html. */
const declaredIds = new Set(
  [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
);

/** Every global function declared across the app's scripts. */
const definedFunctions = new Set(
  [...(appJs + estimatorJs).matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(
    (m) => m[1]
  )
);

test("every element id js/app.js looks up exists in index.html", () => {
  const referenced = [
    ...appJs.matchAll(/getElementById\(\s*"([^"]+)"\s*\)/g)
  ].map((m) => m[1]);
  assert.ok(referenced.length > 0, "expected getElementById lookups in js/app.js");
  for (const id of new Set(referenced)) {
    assert.ok(
      declaredIds.has(id),
      `js/app.js looks up #${id}, which does not exist in index.html — ` +
        `the control would silently do nothing`
    );
  }
});

test("the sections the UI toggles all exist", () => {
  for (const id of ["landing", "photos-form", "plans-form", "results", "resultContent"]) {
    assert.ok(declaredIds.has(id), `index.html is missing #${id}`);
  }
});

test("every inline handler in index.html resolves to a defined function", () => {
  const handlers = [
    ...html.matchAll(/\son(?:click|submit|change)="([A-Za-z_$][\w$]*)\s*\(/g)
  ].map((m) => m[1]);
  assert.ok(handlers.length > 0, "expected inline handlers in index.html");
  for (const name of new Set(handlers)) {
    assert.ok(
      definedFunctions.has(name),
      `index.html calls ${name}() inline, but no such global function is defined — ` +
        `the control would throw a ReferenceError on click`
    );
  }
});

test("the radio and checkbox groups js/app.js queries exist in the markup", () => {
  const queried = [
    ...appJs.matchAll(/input\[name="([^"]+)"\]/g)
  ].map((m) => m[1]);
  assert.ok(queried.length > 0, "expected name-based queries in js/app.js");
  for (const name of new Set(queried)) {
    assert.ok(
      new RegExp(`<input[^>]*\\bname="${name}"`).test(html),
      `js/app.js queries input[name="${name}"], which does not exist in index.html`
    );
  }
});

test("index.html loads the scripts in the order the globals require", () => {
  // data/costs.js defines the tables js/estimator.js reads, and js/app.js calls
  // into both. Reordering these tags breaks the app at load time.
  const positions = SCRIPT_LOAD_ORDER.map((src) => {
    const index = html.indexOf(`src="${src}"`);
    assert.notEqual(index, -1, `index.html does not load ${src}`);
    return index;
  });
  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i - 1] < positions[i],
      `${SCRIPT_LOAD_ORDER[i - 1]} must be loaded before ${SCRIPT_LOAD_ORDER[i]}`
    );
  }
});

test("js/app.js calls into the estimator layer rather than recomputing costs", () => {
  for (const fn of [
    "calculateEstimate",
    "formatCurrency",
    "getMilestoneTemplate",
    "getKitchenAllowances"
  ]) {
    assert.ok(
      definedFunctions.has(fn),
      `${fn} must be defined as a global function for the UI to reach it`
    );
  }
  assert.ok(appJs.includes("calculateEstimate("), "js/app.js must call calculateEstimate");
});

test("the planning-estimate disclaimers are present in the markup", () => {
  // Product requirement, not decoration: ScopeGuard reports planning ranges,
  // never quotes. See README and CLAUDE.md.
  assert.match(
    html,
    /illustrative planning ranges only/i,
    "the landing-page disclaimer is missing"
  );
  assert.match(
    html,
    /Planning estimate only/i,
    "the results-view disclaimer banner is missing"
  );
  assert.match(
    html,
    /not financial or construction advice/i,
    "the footer disclaimer is missing"
  );
});
