/**
 * ScopeGuard — main UI logic
 */

function startPath(path) {
  document.getElementById("landing").classList.add("hidden");
  document.getElementById("results").classList.add("hidden");
  if (path === "photos") {
    document.getElementById("photos-form").classList.remove("hidden");
    document.getElementById("plans-form").classList.add("hidden");
  } else {
    document.getElementById("plans-form").classList.remove("hidden");
    document.getElementById("photos-form").classList.add("hidden");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToLanding() {
  document.getElementById("landing").classList.remove("hidden");
  document.getElementById("photos-form").classList.add("hidden");
  document.getElementById("plans-form").classList.add("hidden");
  document.getElementById("results").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handlePhotoSelect(e) {
  const preview = document.getElementById("photoPreview");
  preview.innerHTML = "";
  const files = Array.from(e.target.files || []);
  files.slice(0, 6).forEach(file => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = url;
    img.className = "w-16 h-16 object-cover rounded-lg border border-slate-200";
    preview.appendChild(img);
  });
  if (files.length > 6) {
    const more = document.createElement("div");
    more.className = "w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500";
    more.textContent = `+${files.length - 6}`;
    preview.appendChild(more);
  }
}

function handlePhotoSubmit(e) {
  e.preventDefault();
  const roomType = document.getElementById("roomType").value;
  const sqft = parseInt(document.getElementById("sqft").value, 10) || 150;
  const location = document.getElementById("location").value;
  const finish = document.querySelector('input[name="finish"]:checked')?.value || "mid";
  const changes = Array.from(document.querySelectorAll('input[name="changes"]:checked')).map(c => c.value);
  const notes = document.getElementById("notes").value;

  const result = calculateEstimate({
    roomType,
    sqft,
    finish,
    location,
    changes,
    path: "photos"
  });

  showResults(result, notes);
}

function handlePlansSubmit(e) {
  e.preventDefault();
  const roomType = document.getElementById("plansRoomType").value;
  const sqft = parseInt(document.getElementById("plansSqft").value, 10) || 200;
  const location = document.getElementById("plansLocation").value;
  const finish = document.getElementById("plansFinish").value;
  const notes = document.getElementById("plansNotes").value;

  const result = calculateEstimate({
    roomType,
    sqft,
    finish,
    location,
    changes: ["full_gut"], // plans path assumes more complete scope
    path: "plans"
  });

  showResults(result, notes);
}

function showResults(result, notes) {
  document.getElementById("photos-form").classList.add("hidden");
  document.getElementById("plans-form").classList.add("hidden");
  document.getElementById("results").classList.remove("hidden");

  const container = document.getElementById("resultContent");
  const milestones = getMilestoneTemplate(result.roomType);
  const isKitchen = result.roomType === "kitchen";

  let html = `
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Planning Budget Range</h2>
          <p class="text-sm text-slate-500 mt-1">
            ${result.roomType.replace("_", " ")} · ${result.sqft} sq ft · ${result.finish} finish · 
            region multiplier ×${result.multiplier.toFixed(2)}
            ${result.path === "photos" ? " · photos path (ROM)" : " · plans path"}
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold text-brand-700">${formatCurrency(result.low)} – ${formatCurrency(result.high)}</div>
          <div class="text-sm text-slate-500">mid ≈ ${formatCurrency(result.mid)}</div>
        </div>
      </div>

      <div class="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
        <div class="bg-slate-50 rounded-xl p-4">
          <div class="text-slate-500">Est. GC fee (12–18%)</div>
          <div class="font-semibold mt-1">${formatCurrency(result.gcFeeLow)} – ${formatCurrency(result.gcFeeHigh)}</div>
        </div>
        <div class="bg-slate-50 rounded-xl p-4">
          <div class="text-slate-500">Suggested contingency (10–15%)</div>
          <div class="font-semibold mt-1">${formatCurrency(result.contingencyLow)} – ${formatCurrency(result.contingencyHigh)}</div>
        </div>
        <div class="bg-slate-50 rounded-xl p-4">
          <div class="text-slate-500">Scope intensity factor</div>
          <div class="font-semibold mt-1">×${result.scopeFactor.toFixed(2)}</div>
        </div>
      </div>
    </div>
  `;

  // Milestones
  html += `
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 class="font-semibold text-lg text-slate-900 mb-4">Market-aligned payment milestones</h3>
      <p class="text-sm text-slate-500 mb-4">Example schedule tied to work completed (not calendar dates). Adjust with your GC.</p>
      <div class="space-y-3">
        ${milestones.map(m => `
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1">
              <div class="text-sm font-medium">${m.stage}</div>
              <div class="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div class="h-full bg-brand-500 rounded-full" style="width: ${m.pct}%"></div>
              </div>
            </div>
            <div class="text-sm font-semibold w-12 text-right">${m.pct}%</div>
            <div class="text-sm text-slate-500 w-24 text-right">${formatCurrency(Math.round(result.mid * m.pct / 100))}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Kitchen allowances if applicable
  if (isKitchen) {
    const allowances = getKitchenAllowances(result.mid);
    html += `
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 class="font-semibold text-lg text-slate-900 mb-2">Kitchen allowance benchmarks</h3>
        <p class="text-sm text-slate-500 mb-4">Typical share of total kitchen budget. Use these to evaluate whether a GC’s allowances are realistic.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-slate-500 border-b">
                <th class="pb-2 font-medium">Category</th>
                <th class="pb-2 font-medium text-right">Low</th>
                <th class="pb-2 font-medium text-right">High</th>
              </tr>
            </thead>
            <tbody>
              ${allowances.map(a => `
                <tr class="border-b border-slate-100">
                  <td class="py-2.5">${a.label}</td>
                  <td class="py-2.5 text-right">${formatCurrency(a.low)}</td>
                  <td class="py-2.5 text-right">${formatCurrency(a.high)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Negotiation tips
  html += `
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 class="font-semibold text-lg text-slate-900 mb-4">Negotiation tips for this project</h3>
      <div class="space-y-4">
        ${NEGOTIATION_TIPS.map(t => `
          <div class="border-l-4 border-brand-500 pl-4">
            <div class="font-medium text-sm">${t.title}</div>
            <div class="text-sm text-slate-600 mt-0.5">${t.body}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Next steps
  html += `
    <div class="bg-brand-50 border border-brand-100 rounded-2xl p-6">
      <h3 class="font-semibold text-brand-900 mb-2">What to do next</h3>
      <ol class="list-decimal list-inside text-sm text-brand-800 space-y-1.5">
        <li>Use the range above as your internal target when requesting bids.</li>
        <li>Ask every GC for the same scope description and the same allowance categories.</li>
        <li>Compare line items and milestones, not just the bottom-line number.</li>
        <li>Keep a 10–15% contingency on top of the signed contract.</li>
        <li>In a future version of ScopeGuard you will be able to upload the actual bids for AI-assisted comparison.</li>
      </ol>
    </div>
  `;

  if (notes && notes.trim()) {
    html += `
      <div class="text-sm text-slate-500">
        <strong>Your notes:</strong> ${notes.trim()}
      </div>
    `;
  }

  container.innerHTML = html;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
