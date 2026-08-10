/**
 * ScopeGuard Estimator — pure client-side planning calculation
 */

function calculateEstimate(input) {
  const {
    roomType = "other",
    sqft = 150,
    finish = "mid",
    location = "",
    changes = [],
    path = "photos"
  } = input;

  const multiplier = getMultiplier(location);
  const ranges = COST_DATA[roomType] || COST_DATA.other;
  const [baseLow, baseHigh] = ranges[finish] || ranges.mid;

  // Adjust for scope intensity
  let scopeFactor = 1.0;
  if (changes.includes("full_gut") || changes.includes("layout")) scopeFactor += 0.25;
  if (changes.includes("plumbing") || changes.includes("electrical")) scopeFactor += 0.10;
  if (changes.includes("cabinets") && changes.includes("counters") && changes.includes("appliances")) {
    // full kitchen package already in base; no extra
  }

  const low = Math.round(baseLow * sqft * multiplier * scopeFactor);
  const high = Math.round(baseHigh * sqft * multiplier * scopeFactor);
  const mid = Math.round((low + high) / 2);

  // GC fee assumption (10-18%)
  const gcFeeLow = Math.round(low * 0.12);
  const gcFeeHigh = Math.round(high * 0.18);

  // Contingency
  const contingencyLow = Math.round(low * 0.10);
  const contingencyHigh = Math.round(high * 0.15);

  return {
    roomType,
    sqft,
    finish,
    location,
    multiplier,
    path,
    low,
    mid,
    high,
    gcFeeLow,
    gcFeeHigh,
    contingencyLow,
    contingencyHigh,
    scopeFactor,
    changes
  };
}

function formatCurrency(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);
}

function getMilestoneTemplate(roomType) {
  if (roomType === "kitchen") return MILESTONES.kitchen;
  if (roomType.startsWith("bathroom")) return MILESTONES.bathroom;
  return MILESTONES.default;
}

function getKitchenAllowances(totalMid) {
  return Object.entries(KITCHEN_ALLOWANCES).map(([key, val]) => ({
    key,
    label: val.label,
    low: Math.round(totalMid * val.low),
    high: Math.round(totalMid * val.high)
  }));
}
