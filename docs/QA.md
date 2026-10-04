# QA checklist

## Automated (run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`)

- [x] Domain: XP multipliers, rounding, consistency, caps, levels, splitting, streaks, vitality math, time helpers
- [x] Dexie: unique constraints, ledger append-only hooks, settings validation, tx rollback, seed
- [x] Completion pipeline: quest/milestone/habit end-to-end, ALREADY_COMPLETED / ALREADY_CHECKED_IN / RECOVERY_LIMIT_REACHED, last-milestone goal completion + bonus-once, goal bonus only once
- [x] Vitality check: closed for several days, idempotent rerun, weekly habits never counted, future/late habits not counted, quest deadline miss, never runs for today
- [x] Backup: export → clear → import round trip, integrity passes, rejects wrong-app/newer-schema/missing-table/checksum-mismatch, token excluded

## Manual verification (needs a browser; run `npm run dev` / preview the build)

### First run
- [ ] Setup screen creates a profile; Dashboard renders
- [ ] Reload keeps data (Dexie persists)

### Dashboard
- [ ] Checking a habit writes ledger, toast shows +XP
- [ ] Completing a quest shows +XP and updates level/vitality where applicable
- [ ] Unchecking a habit removes today’s log
- [ ] Sections hide with Undo and restore from Settings → Display
- [ ] hud and today cannot be hidden

### Habits
- [ ] Create daily/weekly, edit, archive/restore, check in, double check-in blocked, yesterday backfill via daily check only
- [ ] Streak/consistency/reward numbers consistent with ledger

### Quests
- [ ] Create each type, filters work, XP preview not implemented — verify awarded XP matches breakdown in toast
- [ ] Recovery counter shows 0/2; third same day blocked with message

### Goals
- [ ] Create with milestones, reorder not in UI — milestone add/delete/complete work; last milestone completes the goal; bonus awarded once (check Attributes page / total XP)

### Character / Attributes
- [ ] Vitality history shows real events; achievements list updates; attributes read-only with XP totals

### Timeline
- [ ] Events grouped newest first; filters and date presets work; XP/HP badges correct

### Analytics
- [ ] 7/30/90 ranges change charts; XP totals match ledger; habit consistency is real; "Needs 7 days of data" empty state n/a yet

### Settings
- [ ] Display options apply instantly and persist (theme, accent, density, text size, reduce motion, week start, focus mode, hidden sections)
- [ ] Data section shows persistence status + usage + last backup; Export downloads a JSON; Import replaces data with preview/validation
- [ ] Health rules mirror into the daily check
- [ ] Integrations: username save, token stored locally, sync states render
- [ ] About shows version and formula version

### Data safety
- [ ] reload persists; bad import file rejected with message
- [ ] storage-full / storage-unavailable banners — not yet implemented (see report)

### PWA
- [ ] Install prompt appears (Chrome/Edge); opens standalone
- [ ] Offline reload works after first visit
- [ ] Update toast appears when a new build is served; Reload picks it up

### Accessibility / polish
- [ ] Ctrl+K search, Ctrl+B sidebar, focus rings, aria labels on toggles
- [ ] 900 px width in every density/text-size combination
- [ ] No console errors/warnings in devtools

### Performance
- [ ] Run the large seed (not yet built) and measure: dashboard < 50 ms, timeline < 30 ms, analytics 90d < 150 ms — build the seed first
