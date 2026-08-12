/**
 * Test helper — load ScopeGuard's browser scripts without a build step.
 *
 * The app ships as plain <script> tags that declare globals (no modules, no
 * exports, zero dependencies — see CLAUDE.md "Conventions"). To keep the test
 * suite dependency-free too, we evaluate those same source files inside a
 * Node `vm` context, in the exact order index.html loads them, and hand back
 * the resulting globals. The source is never modified for testability.
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

/** The scripts index.html loads, in load order. Keep in sync with index.html. */
export const SCRIPT_LOAD_ORDER = [
  "data/costs.js",
  "js/estimator.js",
  "js/app.js"
];

/** Read a repo file as text. */
export function readSource(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * The names the data + estimator layers publish for the UI layer to use.
 *
 * Needed because top-level `const` declarations are lexical: unlike `function`
 * declarations they never become properties of the context's global object, so
 * a test cannot reach `COST_DATA` off the context the way it reaches
 * `getMultiplier`. Later scripts in the same context still resolve them
 * lexically — exactly as the browser does across <script> tags — so we re-export
 * them explicitly instead. A name removed from the source fails loudly here.
 */
const PUBLIC_GLOBALS = [
  "COST_DATA",
  "REGION_MULTIPLIERS",
  "KITCHEN_ALLOWANCES",
  "MILESTONES",
  "NEGOTIATION_TIPS",
  "getMultiplier",
  "calculateEstimate",
  "formatCurrency",
  "getMilestoneTemplate",
  "getKitchenAllowances"
];

/**
 * Evaluate the data + estimator layers in a fresh context and return it.
 *
 * js/app.js is deliberately excluded: it only touches the DOM at call time,
 * and the contracts it owns are asserted statically in dom_contract.test.mjs.
 */
export function loadEstimator() {
  const context = vm.createContext({});
  for (const file of ["data/costs.js", "js/estimator.js"]) {
    vm.runInContext(readSource(file), context, { filename: file });
  }
  const exportScript = PUBLIC_GLOBALS.map(
    (name) => `globalThis[${JSON.stringify(name)}] = ${name};`
  ).join("\n");
  vm.runInContext(exportScript, context, { filename: "<test-exports>" });
  return context;
}

/** Extract the `value="..."` options of a <select id="..."> in index.html. */
export function selectOptionValues(html, selectId) {
  const openTag = new RegExp(`<select[^>]*\\bid="${selectId}"[^>]*>`);
  const start = html.search(openTag);
  if (start === -1) throw new Error(`<select id="${selectId}"> not found`);
  const end = html.indexOf("</select>", start);
  if (end === -1) throw new Error(`<select id="${selectId}"> is unclosed`);
  const block = html.slice(start, end);
  return [...block.matchAll(/<option[^>]*\bvalue="([^"]*)"/g)]
    .map((m) => m[1])
    .filter((v) => v !== "");
}

/** Extract the `value="..."` of every <input name="..."> in index.html. */
export function inputValuesByName(html, name) {
  const re = new RegExp(`<input[^>]*\\bname="${name}"[^>]*>`, "g");
  return [...html.matchAll(re)]
    .map((m) => /\bvalue="([^"]*)"/.exec(m[0]))
    .filter(Boolean)
    .map((m) => m[1]);
}
