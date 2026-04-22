# AGENTS.md - Phase 0 Working Rules

## Project Goal
Build the smallest playable foundation for a long-horizon, policy-driven society simulation where systems unlock progressively (not preloaded).

## Repo Layout
- `index.html`, `style.css`: UI shell and styling
- `js/state.js`: initial world state
- `js/population.js`: demographic updates
- `js/economy.js`: grain economy + coupon issuance
- `js/unlocks.js`: generic prerequisite/unlock logic
- `js/policies.js`: policy definitions and effects
- `js/render.js`: UI rendering
- `js/game.js`: wiring, events, yearly loop
- `README.md`: project and phase documentation

## Phase 0 Scope
Only implement:
- Core agricultural state
- Year-by-year progression
- Policy prerequisites and unlock effects
- Bank -> clerks -> anti-counterfeit -> grain coupons chain
- Coupon stats/issuance only after unlock

## Architectural Rules
- Plain HTML/CSS/JS only (no framework, no backend)
- Keep modules small and composable
- Keep unlock logic generic and data-driven
- Run by opening `index.html` directly

## Important Do-Not Rules
Do not implement in Phase 0: migration, schools, hospitals, stock market, housing/villas, diplomacy, combat, maps, accounts, networking, cloud saves, or unrelated feature trees.

## Definition of Done (Phase 0)
- Year progression updates world and log
- Policy chain enforces prerequisites
- Grain coupons impossible before unlock
- Grain coupon UI appears only after unlock
- Required files are complete and non-placeholder
## Phase 1A Scope (Current)

Phase 0 is complete. Now implementing Phase 1A only.

**Goal:** Make labor force a real constraint on agricultural output.

**Rules:**
- 10 mu of farmland requires 1 labor unit to farm
- Required farming labor = farmlandAreaMu / 10
- Actual farming labor = min(laborForce, required)
- Idle labor = laborForce - actual farming labor
- Farm efficiency = actual / required (grain output scales with this)

**Files to modify:** state.js, population.js, render.js  
**Do NOT touch:** unlocks.js, policies.js, game.js, economy.js

**Definition of Done (Phase 1A):**
- Labor allocation calculated every year-advance
- Under-staffed farms produce less grain proportionally
- UI shows: total labor / farming / idle / land utilization %
- Opening state (30000 mu, 3000 labor) shows 100% utilization
## Phase 1B Scope (Current)

Phase 1A is complete. Now implementing Phase 1B only.

**Goal:** Make land the second real constraint. Farming is limited
by both labor AND farmland. Players can expand land via land
reclamation, but it costs grain and labor.

**Rules:**

Land reclamation:
- Minimum order: 1000 mu per reclamation action
- Cost: 500 grain per 100 mu (5 grain/mu)
- Reclamation takes 1 year (available next year-advance)
- Cost is paid immediately from grainTreasury
- Reclamation cost counts as farmer income (stimulates economy)
- Cannot reclaim if grainTreasury < total cost

State additions needed in world{}:
- pendingFarmlandMu: 0  (land being reclaimed, added next year)
- reclaimedThisYear: 0  (for log display)

**Files to modify:** state.js, economy.js, render.js, game.js  
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 1B):**
- Reclaim land button visible in UI with cost preview
- Cannot reclaim if insufficient grain
- Grain deducted immediately on reclaim action
- New land added at next year-advance
- Year log shows reclamation event
- Existing labor allocation logic from Phase 1A still works
**Do NOT touch under any circumstances:** 
unlocks.js, policies.js, population.js
