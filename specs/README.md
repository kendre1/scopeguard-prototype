# specs — Plans

The `/feature`, `/bug`, and `/chore` commands write detailed implementation plans here as Markdown, one file per task. `/implement <plan>` consumes them.

Each plan is a self-contained spec: the what/why, the relevant files, an ordered list of step-by-step tasks, an `Execution Strategy` (how `/implement` should run it), and the concrete validation commands. Treat plans as living documents — review and refine the plan before implementing it.

Naming: name each file after its task, e.g. `add-oauth-login.md`, `fix-pagination-off-by-one.md`.

> athema scaffolds this directory. Plans accumulate here as you work; keep or prune them as you like.
