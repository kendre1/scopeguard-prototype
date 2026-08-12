# E2E Test: Plans path produces a whole-house planning budget

Validates ScopeGuard's second entry path — "plans / drawings" — which assumes a fuller scope than the photos path and skips the kitchen-only allowance section for non-kitchen projects.

## User Story

As a homeowner who already has architectural drawings
I want to enter my project type, area, and finish level
So that I get a tighter planning range and a milestone schedule matched to a whole-house renovation

## Test Steps

1. Navigate to the `Application URL`
2. **Verify** the landing section is visible with both entry cards
3. Click the "I have plans / drawings" card
4. **Verify** the "Plans / Drawings Path" heading is visible and the photos form is hidden
5. Take a screenshot (a real PNG image) of the plans form
6. Select "Whole-house renovation" in the project type dropdown (`#plansRoomType`)
7. Enter `2200` in the "Total conditioned area (sq ft)" field (`#plansSqft`)
8. Enter `Chicago` in the "Location" field (`#plansLocation`)
9. Leave the finish level at its default ("Mid-range")
10. Click "Generate Planning Budget"
11. **Verify** the results section is visible with the heading "Planning Budget Range"
12. **Verify** the summary line reports "whole house", "2200 sq ft", "mid finish", a region multiplier of `×1.10` (the Chicago heuristic), and the text "plans path"
13. **Verify** the "Scope intensity factor" card shows `×1.25` — the plans path always assumes a full-gut scope
14. **Verify** a dollar range is rendered and the low value is less than the high value
15. **Verify** the default milestone template is used — the first milestone reads "Contract signing / deposit"
16. **Verify** the "Kitchen allowance benchmarks" table is **not** present (this is not a kitchen project)
17. **Verify** the "Negotiation tips for this project" section renders at least 5 tips
18. Take a screenshot (a real PNG image) of the rendered results
19. Click "← Start over", then click "I have photos + details"
20. **Verify** the photos form is visible and the plans form is hidden — switching paths after a result does not leave both forms on screen

## Success Criteria

- The plans path renders a budget using the default (non-kitchen) milestone template
- The city-name location heuristic resolves to the expected multiplier without a ZIP code
- The plans path applies the full-gut scope factor automatically
- The kitchen allowance table is correctly omitted for a non-kitchen project
- Navigating between paths after viewing results leaves exactly one section visible
- 2 screenshots are taken
