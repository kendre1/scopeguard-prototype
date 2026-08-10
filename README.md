# ScopeGuard — Homeowner Co-Pilot Prototype

**Turn renovation ideas into defensible budgets and better GC negotiations.**

This is a lightweight, client-side prototype of the ScopeGuard concept:

- Dual entry paths: **Photos + details** (most common) or **Architectural plans**
- Planning-level cost ranges adjusted for location and finish level
- Market-aligned payment milestone templates
- Kitchen allowance benchmarks
- Practical negotiation tips

> **Disclaimer**: All numbers are illustrative planning ranges only. They are not formal quotes or financial advice. Always obtain multiple detailed bids from licensed local contractors.

---

## Quick Start (no build step)

1. Clone this repo
2. Open `index.html` in any modern browser  
   **or** serve it locally:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Then visit http://localhost:8000
```

That’s it. Everything runs in the browser. No backend, no API keys, no npm install required for the prototype.

---

## Project Structure

```
scopeguard-prototype/
├── index.html          # Main app shell + forms
├── css/
│   └── styles.css      # Small custom styles
├── js/
│   ├── app.js          # UI logic & form handling
│   └── estimator.js    # Cost calculation
├── data/
│   └── costs.js        # Sample cost tables, multipliers, milestones, tips
└── README.md
```

---

## What the prototype demonstrates

| Feature | Status |
|---------|--------|
| Dual path entry (Photos vs Plans) | ✅ |
| Guided questionnaire for photos path | ✅ |
| Location-aware cost multipliers | ✅ (sample data) |
| Finish-level tiers (Basic / Mid / Luxury) | ✅ |
| Scope intensity adjustment | ✅ |
| Payment milestone templates | ✅ |
| Kitchen allowance benchmarks | ✅ |
| Negotiation tips | ✅ |
| Mock photo upload preview | ✅ |
| Real AI vision / plan takeoff | ❌ (future) |
| Bid upload + AI comparison | ❌ (future) |
| Live cost API | ❌ (future) |
| Materials sourcing integrations | ❌ (future) |

---

## Next development steps (suggested)

1. Replace static cost tables with a real regional cost API (e.g. EstimationPro or curated RSMeans-derived data)
2. Add AI vision for rough room dimension extraction from photos
3. PDF / image upload + LLM-based scope extraction for the plans path
4. Bid comparison module (upload 2–4 GC proposals → side-by-side normalized view)
5. Materials budget allocator with external price links
6. Account / save project state
7. Mobile-responsive polish + PWA

---

## Tech notes

- Pure HTML + CSS + vanilla JS
- Tailwind CSS via CDN (for rapid styling)
- No framework, no build step — easy to open, share, and iterate
- All calculation is client-side and transparent

When you are ready for a production stack, the natural evolution is:

- Next.js or Vite + React
- Supabase or Firebase for auth + saved projects
- LLM layer (Claude / GPT) for bid parsing and plan understanding
- Real cost data backend

---

## License

Prototype code is provided as-is for exploration and further development.
