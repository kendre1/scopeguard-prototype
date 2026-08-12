# E2E Test: Photos path produces a kitchen planning budget

Validates ScopeGuard's primary end-to-end flow: the landing page → the "photos + details" questionnaire → a rendered planning budget with milestones, kitchen allowances, and the planning-estimate disclaimer.

## User Story

As a homeowner planning a kitchen renovation
I want to answer a short questionnaire about my space
So that I get a defensible cost range, a payment-milestone schedule, and allowance benchmarks to take into GC negotiations

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot (a real PNG image) of the initial state
3. **Verify** the page title contains "ScopeGuard"
4. **Verify** both entry cards are visible: "I have plans / drawings" and "I have photos + details"
5. **Verify** the landing disclaimer is present — text containing "Estimates are illustrative planning ranges only"
6. Click the "I have photos + details" card
7. **Verify** the "Photos + Details Path" heading is visible and the landing section is hidden
8. Select "Kitchen" in the "What are you renovating?" dropdown (`#roomType`)
9. Enter `180` in the "Approx. size (sq ft)" field (`#sqft`)
10. Enter `10001` in the "Location (ZIP or City)" field (`#location`)
11. Select the "Mid-range" finish level radio option
12. Check the "New cabinets", "New countertops", and "Layout / open wall" boxes
13. Take a screenshot (a real PNG image) of the completed form
14. Click "Generate Planning Budget"
15. **Verify** the results section is visible with the heading "Planning Budget Range"
16. **Verify** a dollar range is rendered in the form `$<low> – $<high>` and a "mid ≈ $<value>" line is present
17. **Verify** the summary line reports the inputs back: "kitchen", "180 sq ft", "mid finish", and a region multiplier of `×1.45` (the 10001 ZIP multiplier)
18. **Verify** the "Scope intensity factor" card shows `×1.25` (the layout/open-wall adjustment)
19. **Verify** the "Est. GC fee (12–18%)" and "Suggested contingency (10–15%)" cards each show a dollar range
20. **Verify** the "Market-aligned payment milestones" section lists 5 milestones whose percentages sum to 100
21. **Verify** the "Kitchen allowance benchmarks" table is present and includes a "Cabinets & hardware" row (kitchen-only section)
22. **Verify** the amber disclaimer banner is present — text containing "Planning estimate only"
23. Take a screenshot (a real PNG image) of the rendered results
24. Click "← Start over"
25. **Verify** the landing section is visible again and the results section is hidden

## Success Criteria

- The photos path is reachable from the landing page and renders a budget without a page reload
- The rendered estimate reflects every input: room type, square footage, finish level, ZIP-derived region multiplier, and scope-intensity factor
- Milestones total 100% and the kitchen-only allowance table appears for a kitchen project
- Planning-estimate disclaimers are visible on both the landing page and the results view
- "Start over" returns the app to the landing state
- 3 screenshots are taken
