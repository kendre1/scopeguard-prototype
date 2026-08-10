/**
 * ScopeGuard — Sample cost data for prototype
 * These are illustrative 2025-2026 US national averages + regional multipliers.
 * In production this would come from a live cost API / curated database.
 */

const COST_DATA = {
  // Base $/sqft ranges by project type and finish level (national mid)
  // Format: { basic: [low, high], mid: [low, high], luxury: [low, high] }
  kitchen: {
    basic: [80, 140],
    mid: [150, 280],
    luxury: [300, 550]
  },
  bathroom: {
    basic: [150, 280],
    mid: [300, 550],
    luxury: [600, 1100]
  },
  bathroom_half: {
    basic: [80, 150],
    mid: [160, 280],
    luxury: [300, 500]
  },
  basement: {
    basic: [30, 55],
    mid: [55, 95],
    luxury: [100, 180]
  },
  addition: {
    basic: [120, 180],
    mid: [180, 280],
    luxury: [300, 500]
  },
  whole_house: {
    basic: [40, 70],
    mid: [70, 130],
    luxury: [150, 280]
  },
  other: {
    basic: [50, 90],
    mid: [90, 160],
    luxury: [170, 300]
  }
};

// Simple regional multipliers (illustrative)
const REGION_MULTIPLIERS = {
  // High cost
  "10001": 1.45, "10002": 1.45, "10003": 1.45, // NYC
  "100": 1.45,   // NYC area prefix
  "941": 1.50,   // SF
  "902": 1.40,   // LA
  "021": 1.35,   // Boston
  "981": 1.30,   // Seattle
  // Mid
  "606": 1.10,   // Chicago
  "303": 1.05,   // Atlanta
  "752": 1.05,   // Dallas
  "331": 1.15,   // Miami
  "802": 1.15,   // Denver
  // Lower
  "372": 0.95,   // Nashville
  "282": 0.95,   // Charlotte
  "850": 0.95,   // Phoenix
  "default": 1.0
};

// Kitchen allowance benchmarks (% of total kitchen budget)
const KITCHEN_ALLOWANCES = {
  cabinets: { low: 0.28, high: 0.38, label: "Cabinets & hardware" },
  appliances: { low: 0.12, high: 0.18, label: "Appliances" },
  countertops: { low: 0.08, high: 0.14, label: "Countertops" },
  labor: { low: 0.20, high: 0.32, label: "Labor & installation" },
  flooring: { low: 0.05, high: 0.09, label: "Flooring" },
  fixtures: { low: 0.04, high: 0.07, label: "Plumbing & lighting fixtures" },
  contingency: { low: 0.10, high: 0.15, label: "Contingency" }
};

// Typical payment milestone templates
const MILESTONES = {
  kitchen: [
    { stage: "Contract signing / mobilization", pct: 15 },
    { stage: "Demolition + rough plumbing/electrical complete", pct: 25 },
    { stage: "Cabinets + counters installed", pct: 30 },
    { stage: "Finishes, appliances, punch list", pct: 20 },
    { stage: "Final retention (after walkthrough)", pct: 10 }
  ],
  bathroom: [
    { stage: "Contract signing", pct: 15 },
    { stage: "Demo + rough-in complete", pct: 30 },
    { stage: "Tile + fixtures installed", pct: 30 },
    { stage: "Finishes + punch list", pct: 15 },
    { stage: "Final retention", pct: 10 }
  ],
  default: [
    { stage: "Contract signing / deposit", pct: 15 },
    { stage: "Rough work complete (framing, mech, electrical)", pct: 30 },
    { stage: "Drywall + finishes in progress", pct: 25 },
    { stage: "Substantial completion", pct: 20 },
    { stage: "Final retention after punch list", pct: 10 }
  ]
};

// Sample negotiation tips
const NEGOTIATION_TIPS = [
  {
    title: "Never negotiate only on total price",
    body: "Ask what scope or finish level can be adjusted to hit your number. Good GCs will help value-engineer rather than just cut their margin."
  },
  {
    title: "Demand line-item or clear allowances",
    body: "Vague lump-sum bids hide risk. Ask for allowances on cabinets, counters, appliances, tile, fixtures so you can compare apples-to-apples."
  },
  {
    title: "Watch the payment schedule",
    body: "More than 20–25% upfront on a large remodel is a yellow/red flag. Tie payments to verifiable milestones, not calendar dates."
  },
  {
    title: "Compare scope, not just price",
    body: "The lowest bid often excludes demolition, protection, cleanup, permits, or uses lower-grade materials. Ask every bidder the same clarifying questions."
  },
  {
    title: "Owner-supplied materials can save money — carefully",
    body: "You can buy appliances and some fixtures yourself to avoid GC markup, but coordinate delivery, storage, and warranty carefully."
  }
];

// Helper: get regional multiplier from location string
function getMultiplier(location) {
  if (!location) return 1.0;
  const loc = location.toString().trim().toLowerCase();
  // Check exact ZIP prefixes first
  for (const key of Object.keys(REGION_MULTIPLIERS)) {
    if (key !== "default" && loc.startsWith(key)) {
      return REGION_MULTIPLIERS[key];
    }
  }
  // City name heuristics
  if (loc.includes("new york") || loc.includes("nyc") || loc.includes("manhattan") || loc.includes("brooklyn")) return 1.45;
  if (loc.includes("san francisco") || loc.includes("sf ")) return 1.50;
  if (loc.includes("los angeles") || loc.includes("la ")) return 1.40;
  if (loc.includes("boston")) return 1.35;
  if (loc.includes("seattle")) return 1.30;
  if (loc.includes("chicago")) return 1.10;
  if (loc.includes("miami")) return 1.15;
  if (loc.includes("denver")) return 1.15;
  if (loc.includes("atlanta")) return 1.05;
  if (loc.includes("dallas") || loc.includes("houston") || loc.includes("austin")) return 1.05;
  if (loc.includes("phoenix")) return 0.95;
  return REGION_MULTIPLIERS.default;
}
