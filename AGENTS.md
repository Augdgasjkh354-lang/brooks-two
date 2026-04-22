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
## Phase 1C Scope (Current)

Phase 1B is complete. Now implementing Phase 1C only.

**Goal:** Add a basic shop system as the first non-farming 
employment sector. Shops create commercial jobs and generate
non-agricultural economic activity.

**Rules:**

Shops:
- Player can build shops (button in UI)
- Each shop costs 2000 grain to build
- Each shop employs 5 workers (drawn from idle labor)
- Each shop generates 500 GDP per year
- Cannot build shop if idle labor < 5
- Cannot build shop if grainTreasury < 2000

State additions needed in world{}:
- shopCount: 0
- laborAssignedCommerce: 0
- commerceGDP: 0

Labor priority: farming first, then commerce.
If labor drops, commerce workers are released first.

**Files to modify:** state.js, economy.js, render.js, game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 1C):**
- Build Shop button visible, shows cost and labor requirement
- Button disabled if not enough grain or idle labor
- Shop count tracked in state
- Commercial labor calculated each year
- Commerce GDP added to total GDP display
- UI shows shop count and commercial employment
**NEVER modify under any circumstances:**
unlocks.js, policies.js, population.js

population.js was finalized in Phase 1A. 
Any labor logic changes go in economy.js only.
## Phase 1D Scope (Current)

Phase 1C is complete. Now implementing Phase 1D only.

**Goal:** Split GDP into three real sectors so the player can
see the economic structure, not just a single number.

**Rules:**

GDP breakdown:
- Agricultural GDP = actualGrainOutput * grain price (1 grain = 1)
- Commercial GDP = shopCount * 500 (already tracked)
- Construction GDP = reclamation spending that year
- Total GDP = sum of all three

State additions needed in world{}:
- agricultureGDP: 0
- constructionGDP: 0
(commerceGDP already exists from Phase 1C)

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 1D):**
- GDP panel shows three lines: Agriculture / Commerce /
  Construction
- Total GDP = sum of three sectors
- All three update correctly on each year-advance
- Construction GDP is 0 in years with no reclamation
## Phase 2A-1 Scope (Current)

Phase 1D is complete. Now implementing Phase 2A-1 only.

**Goal:** Add merchant as a distinct profession split from
labor force. No economic effects yet — identity only.

**Rules:**

Merchants:
- Merchants are drawn from idle labor only
- Player can assign idle workers as merchants (button in UI)
- Each click assigns 1 idle worker as merchant
- Cannot assign if idleLabor = 0
- Player can also release merchants back to idle labor

State additions needed in world{}:
- merchantCount: 0

Labor hierarchy:
1. Farming (first priority)
2. Commerce (shops)
3. Merchants
4. Idle (remainder)

**Files to modify:** state.js, render.js, game.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
economy.js

**Definition of Done (Phase 2A-1):**
- Assign Merchant button in UI
- Release Merchant button in UI
- Both buttons disabled when not applicable
- merchantCount tracked in state
- UI shows merchant count alongside other labor stats
- Idle labor correctly decreases when merchant assigned
## Phase 2A-2 Scope (Current)

Phase 2A-1 is complete. Now implementing Phase 2A-2 only.

**Goal:** Shops now require merchants to operate. Shops without
merchants produce zero GDP.

**Rules:**

Shop operation:
- 1 shop requires 1 merchant to operate
- operatingShops = min(shopCount, merchantCount)
- idleShops = shopCount - operatingShops
- commerceGDP = operatingShops * 500 (was shopCount * 500)

No other changes to labor or state logic.

State additions needed in world{}:
- operatingShops: 0
- idleShops: 0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 2A-2):**
- operatingShops and idleShops calculated each year
- commerceGDP based on operatingShops only
- UI shows: operating shops / idle shops
- If merchantCount = 0, all shops idle, commerceGDP = 0
## Phase 2A-3 Scope (Current)

Phase 2A-2 is complete. Now implementing Phase 2A-3 only.

**Goal:** Merchants earn more than farmers. Income difference
is calculated and displayed. No labor flow simulation yet.

**Rules:**

Income calculation (per person per year):
- Farmer income = (actualGrainOutput * 0.3) / farmingLaborAllocated
- Merchant income = (commerceGDP * 0.5) / merchantCount
  (if merchantCount = 0, merchant income = 0)
- Income gap = merchant income - farmer income

These are display values only. Do not affect any other
system yet.

State additions needed in world{}:
- farmerIncomePerHead: 0
- merchantIncomePerHead: 0
- incomeGap: 0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 2A-3):**
- farmerIncomePerHead calculated each year
- merchantIncomePerHead calculated each year
- incomeGap = merchantIncomePerHead - farmerIncomePerHead
- UI shows all three values in an income panel
- If no merchants, merchant income shows 0
