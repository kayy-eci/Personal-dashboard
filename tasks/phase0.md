# Phase 0 — Inspection report

## Baseline
- `npm run build` (tsc -b && vite build): passes.
- `npm run lint`: passes.
- No test runner, no `typecheck` script, no `src/data/`, no `src/core/`.
- Mock/sample data lives in: `src/features/player/usePlayerStatus.ts`, `src/features/player/usePlayerProfile.ts`, `src/pages/Dashboard/dashboard-data.ts`, `src/components/activity-data.ts`, `src/hooks/useGitHubActivity.ts` (live fetch + cache), and FeaturePage-local sample state. Dashboard check-ins are temporary (README: "not saved to a ledger").
- Preferences module already exists (`src/preferences/*`) covering much of section 11 (theme, accent, density, text size, reduce motion, week start, hidden sections, sidebar collapse). Stored via localStorage cache + `src/lib/storage.ts`, applied pre-paint.
- GitHub activity: live fetch in `src/hooks/useGitHubActivity.ts` with localStorage cache and Settings UI (commit `96e2f05`).

## Skills map (project skills in `.agents/skills/`)
| Skill | Used for |
|---|---|
| git-workflow-and-versioning | every commit (atomic, conventional messages) |
| frontend-ui-engineering | any UI work in Settings/states/banners |
| test-driven-development | domain + integration tests |
| debugging-and-error-recovery | failures |
| code-simplification | cleanup phase |
| documentation-and-adrs / shipping-and-launch | docs (QA/DATA/DEPLOY) |
| incremental-implementation | phase slices |
| constraint-driven-development | only if the user asks for a written bar |
| others | not matched this run |

Note: `C:\Users\62812\.config\opencode\skills\git-commit\SKILL.md` contains the anti-ai-slop-design content, not git instructions — so commit convention comes from the project git skill + existing log (`type(scope): msg`).

## Contract findings / differences from the brief
1. **No `src/data/` mock layer exists.** The brief assumes one. ASSUMPTION: I will create `src/data/` as the async contract (section 7's function set), derive row shapes from Dexie schema (section 5) and existing UI types (`dashboard-data.ts`, player types), and rewire components/hooks to it one area at a time. Component-facing display types keep their current names/shapes where possible.
2. `VITE_DATA_SOURCE=mock|local` toggle per the brief: ASSUMPTION — implement as an env-read switch inside `src/data/`, defaulting to `mock` until Phase 4 completes, then `local`.
3. FeaturePage list pages currently hold sample data locally; they will be rewired to `src/data/` in Phase 4 (largest rewiring slice).
4. `prd/` and `design/` are gitignored/empty locally — no PRD beyond the brief.
