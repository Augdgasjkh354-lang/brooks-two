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
## Phase 2B-1 Scope (Current)

Phase 2A-3 is complete. Now implementing Phase 2B-1 only.

**Goal:** Population size sets a natural ceiling on commercial
demand. Too many shops for the population = diminishing returns.

**Rules:**

Demand ceiling:
- maxMarketDemand = totalPopulation / 50
  (1 shop can serve 50 people at full efficiency)
- demandSaturation = operatingShops / maxMarketDemand
  (capped at 1.0 max)
- If demandSaturation <= 1.0: no penalty
- If demandSaturation > 1.0: excess shops still operate
  but display a warning

No GDP changes yet. Saturation is display only.

State additions needed in world{}:
- maxMarketDemand: 0
- demandSaturation: 0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 2B-1):**
- maxMarketDemand calculated each year from population
- demandSaturation calculated and stored
- UI shows market demand panel with both values
- Warning visible in UI when demandSaturation > 1.0
## Phase 2B-2 Scope (Current)

Phase 2B-1 is complete. Now implementing Phase 2B-2 only.

**Goal:** Demand saturation now actually affects commerceGDP.
Oversaturated markets earn less per shop.

**Rules:**

GDP adjustment:
- If demandSaturation <= 1.0:
  commerceGDP = operatingShops * 500 (no change)
- If demandSaturation > 1.0:
  efficiencyRate = 1 / demandSaturation
  commerceGDP = operatingShops * 500 * efficiencyRate

Example: 20 shops, maxMarketDemand = 10
  demandSaturation = 2.0
  efficiencyRate = 0.5
  commerceGDP = 20 * 500 * 0.5 = 5000 (not 10000)

No new state fields needed.

**Files to modify:** economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js, state.js

**Definition of Done (Phase 2B-2):**
- commerceGDP reduced when demandSaturation > 1.0
- UI shows effective commerce GDP
- UI shows efficiency rate as a percentage
## Phase 2B-3 Scope (Current)

Phase 2B-2 is complete. Now implementing Phase 2B-3 only.

**Goal:** Persistent low demand satisfaction shows a warning
and slightly suppresses population growth.

**Rules:**

Demand shortage penalty:
- If demandSaturation < 0.5 for current year:
  populationGrowthRate reduced by 0.5%
  (from default 2% to 1.5%)
- If demandSaturation >= 0.5: no penalty
- Penalty is recalculated every year, not cumulative

State additions needed in world{}:
- demandShortfall: false (boolean, true if sat < 0.5)

**Files to modify:** state.js, economy.js, population.js,
render.js
**Do NOT touch:** unlocks.js, policies.js, game.js

**Definition of Done (Phase 2B-3):**
- demandShortfall calculated each year
- Population growth rate reduced when shortfall is true
- UI shows warning message when demandShortfall is true
- No penalty when demandSaturation >= 0.5
## Phase 2C-1+2 Scope (Current)

Phase 2B-3 is complete. Now implementing Phase 2C-1+2 only.

**Goal:** Shops consume grain each year. Grain supply vs
demand sets a basic grain price that affects agricultural GDP.

**Rules:**

Grain consumption:
- Each operating shop consumes 200 grain per year
- totalGrainDemand = operatingShops * 200
- Grain deducted from grainTreasury each year-advance
- If grainTreasury < totalGrainDemand:
  only consume what's available
  remaining shops still operate but at reduced efficiency

Grain price:
- baseGrainPrice = 1.0
- supplyRatio = grainTreasury / (totalPopulation * 2)
  (2 grain per person = comfortable supply)
- If supplyRatio >= 1.0: grainPrice = 1.0
- If supplyRatio < 1.0: grainPrice = supplyRatio (cheaper)
- If supplyRatio > 2.0: grainPrice = 1.2 (scarcity premium)

Agricultural GDP:
- agricultureGDP = actualGrainOutput * grainPrice
  (was actualGrainOutput * 1)

State additions needed in world{}:
- totalGrainDemand: 0
- grainPrice: 1.0
- supplyRatio: 1.0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 2C-1+2):**
- Grain consumed by shops each year-advance
- grainPrice calculated from supply ratio
- agricultureGDP uses grainPrice multiplier
- UI shows grain price and supply ratio
- UI shows grain consumed by commerce this year
## Phase 2C-3 Scope (Current)

Phase 2C-1+2 is complete. Now implementing Phase 2C-3 only.

**Goal:** High commercial income accelerates population growth.
Forms a positive feedback loop between commerce and population.

**Rules:**

Population growth adjustment:
- Base growth rate: 2%
- If merchantIncomePerHead > farmerIncomePerHead * 1.5:
  growth rate += 0.5% (commerce is thriving)
- If demandShortfall is true:
  growth rate -= 0.5% (already implemented in 2B-3)
- Both conditions can apply simultaneously
- Final growth rate floored at 0.5% (never negative)

No new state fields needed.

**Files to modify:** population.js, render.js
**Do NOT touch:** unlocks.js, policies.js, game.js,
state.js, economy.js

**Definition of Done (Phase 2C-3):**
- Population growth rate adjusted by commerce prosperity
- Bonus applies when merchant income > 1.5x farmer income
- UI shows current effective growth rate
- UI shows which modifiers are active
## Phase 3A-1 Scope (Current)

Phase 2C-3 is complete. Now implementing Phase 3A-1 only.

**Goal:** Add a social stability index driven by income
inequality. High income gap = lower stability.

**Rules:**

Stability index:
- stabilityIndex range: 0 to 100
- Base stability: 80
- Income gap penalty:
  If incomeGap < 500: no penalty
  If incomeGap 500-1000: -10
  If incomeGap 1000-2000: -20
  If incomeGap > 2000: -30
- stabilityIndex = base - penalties (floored at 0)
- Recalculated every year-advance

State additions needed in world{}:
- stabilityIndex: 80
- stabilityPenalty: 0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 3A-1):**
- stabilityIndex calculated every year
- UI shows stability index with color coding:
  80-100: green (stable)
  50-79: yellow (tense)
  0-49: red (unstable)
- UI shows current income gap and penalty reason
## Phase 3A-2 Scope (Current)

Phase 3A-1 is complete. Now implementing Phase 3A-2 only.

**Goal:** Low stability now causes real economic damage.
Unstable society = lower farming and commerce output.

**Rules:**

Efficiency multiplier from stability:
- stabilityIndex 80-100: efficiencyMultiplier = 1.0
- stabilityIndex 50-79: efficiencyMultiplier = 0.85
- stabilityIndex 0-49: efficiencyMultiplier = 0.65

Apply multiplier to:
- actualGrainOutput *= efficiencyMultiplier
- commerceGDP *= efficiencyMultiplier

State additions needed in world{}:
- efficiencyMultiplier: 1.0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 3A-2):**
- efficiencyMultiplier calculated from stabilityIndex
- Both grain and commerce output reduced when unstable
- UI shows current efficiency multiplier as percentage
- UI shows estimated output loss when multiplier < 1.0
## Phase 3A-3 Scope (Current)

Phase 3A-2 is complete. Now implementing Phase 3A-3 only.

**Goal:** Player can use policies to stabilize society,
but each intervention has a real cost.

**Rules:**

Two new policies available:

1. Grain Redistribution
- Cost: 5000 grain from grainTreasury
- Effect: stabilityIndex += 15 (capped at 100)
- Can only use once per year
- Button disabled if grainTreasury < 5000

2. Merchant Tax
- Effect: merchantIncomePerHead *= 0.8 (20% income cut)
- Effect: stabilityIndex += 10
- Effect: grainTreasury += merchantCount * 200
- Can only use once per year
- Button disabled if merchantCount = 0

Policy limits:
- Each policy has a usedThisYear boolean
- Both reset to false on each year-advance

State additions needed in world{}:
- grainRedistributionUsed: false
- merchantTaxUsed: false

**Files to modify:** state.js, render.js, game.js
**Do NOT touch:** unlocks.js, economy.js, population.js

**Definition of Done (Phase 3A-3):**
- Both policy buttons visible in UI
- Buttons disabled when conditions not met
- Buttons disabled after use until next year
- Effects applied immediately on click
- Year log records which policies were used
- stabilityIndex updates immediately after policy use
## Phase 3B-1a Scope (Current)

Phase 3A-3 is complete. Now implementing Phase 3B-1a only.

**Goal:** Split treasury into grain and coupon. Add basic
grain coupon issuance mechanism. Only available after
grainCouponsUnlocked = true.

**Rules:**

Treasury split:
- grainTreasury remains (physical grain)
- New: couponTreasury (government-held coupons, not circulating)
- New: couponCirculating (coupons in market)
- New: couponTotalIssued

Coupon issuance:
- Player sets amount to issue (in jin units)
- Government pays farmers that amount in coupons
- Farmers hand over equivalent grain (1:1 fixed rate always)
- grainTreasury += issued amount
- couponCirculating += issued amount
- couponTotalIssued += issued amount
- Cannot issue more than grainTreasury can absorb
- Cannot issue if grainCouponsUnlocked = false

Coupon denominations (UI display only, internal is total):
1钱、5钱、1两、5两、1斤、2斤、5斤、10斤、20斤、50斤、100斤
Show suggested denomination breakdown in UI after issuance.

Exchange rate: always 1:1, never changes.

State additions needed:
- world.couponTreasury: 0
- world.couponCirculating: 0  
- world.couponTotalIssued: 0

**Files to modify:** state.js, economy.js, render.js, game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 3B-1a):**
- Treasury panel shows grain and coupon separately
- Issue Coupons button only visible after unlock
- Player can input amount to issue
- Grain and coupons update correctly after issuance
- UI shows total issued / circulating / government held
- Denomination breakdown shown as reference in UI
## Phase 3B-1b Scope (Current)

Phase 3B-1a is complete. Now implementing Phase 3B-1b only.

**Goal:** Tax collection and official salaries can be paid
in grain, coupons, or a mix. Options only appear after
grainCouponsUnlocked = true.

**Rules:**

Tax collection ratio:
- New setting: taxGrainRatio (0.0 to 1.0)
- taxCouponRatio = 1 - taxGrainRatio
- Default: taxGrainRatio = 1.0 (all grain, pre-unlock behavior)
- Player can adjust via slider in UI
- On year-advance, tax revenue split accordingly:
  grainTreasury += totalTaxRevenue * taxGrainRatio
  couponTreasury += totalTaxRevenue * taxCouponRatio

Official salary payment ratio:
- New setting: salaryGrainRatio (0.0 to 1.0)
- salaryCouponRatio = 1 - salaryGrainRatio
- Default: salaryGrainRatio = 1.0 (all grain, pre-unlock)
- Player can adjust via slider in UI
- On year-advance, salary costs split accordingly:
  grainTreasury -= totalSalaryCost * salaryGrainRatio
  couponTreasury -= totalSalaryCost * salaryCouponRatio
- Cannot pay coupon salary if couponTreasury insufficient

Both sliders only visible when grainCouponsUnlocked = true.
When locked: behavior identical to current (all grain).

State additions needed in world{}:
- taxGrainRatio: 1.0
- salaryGrainRatio: 1.0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 3B-1b):**
- Tax ratio slider visible after coupon unlock
- Salary ratio slider visible after coupon unlock
- Both default to 1.0 (all grain) before unlock
- Treasury updates correctly reflect chosen ratios
- UI shows current ratio settings clearly
- Warning shown if coupon treasury insufficient for
  salary payment
## Phase 3B-2 Scope (Current)

Phase 3B-1b is complete. Now implementing Phase 3B-2 only.

**Goal:** Coupon circulation affects commercial activity.
More coupons in circulation = more active commerce.

**Rules:**

Commerce activity multiplier from coupon circulation:
- Only applies when grainCouponsUnlocked = true
- circulationRatio = couponCirculating / totalPopulation
  (coupons per person)
- If circulationRatio >= 2.0: commerceActivityBonus = 1.2
- If circulationRatio 1.0-1.99: commerceActivityBonus = 1.0
- If circulationRatio 0.5-0.99: commerceActivityBonus = 0.85
- If circulationRatio < 0.5: commerceActivityBonus = 0.7
- Before unlock: commerceActivityBonus = 1.0 (no effect)

Apply to commerceGDP:
- commerceGDP *= commerceActivityBonus

State additions needed in world{}:
- circulationRatio: 0
- commerceActivityBonus: 1.0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 3B-2):**
- circulationRatio calculated each year-advance
- commerceActivityBonus applied to commerceGDP
- UI shows circulation ratio and activity bonus
- UI shows estimated commerce boost/penalty
- No effect before grainCouponsUnlocked = true
## Phase 3B-3 Scope (Current)

Phase 3B-2 is complete. Now implementing Phase 3B-3 only.

**Goal:** Issuing too many coupons causes inflation.
High inflation reduces real purchasing power and
destabilizes society.

**Rules:**

Inflation calculation:
- Only applies when grainCouponsUnlocked = true
- backingRatio = grainTreasury / couponCirculating
  (how much grain backs each coupon)
- If backingRatio >= 1.0: inflationRate = 0%
- If backingRatio 0.7-0.99: inflationRate = 5%
- If backingRatio 0.4-0.69: inflationRate = 15%
- If backingRatio < 0.4: inflationRate = 30%
- Before unlock or couponCirculating = 0: inflationRate = 0%

Inflation effects:
- High inflation reduces stabilityIndex:
  inflationRate 5%: stabilityIndex -= 5
  inflationRate 15%: stabilityIndex -= 15
  inflationRate 30%: stabilityIndex -= 25
- High inflation reduces commerceActivityBonus:
  inflationRate 15%: commerceActivityBonus *= 0.9
  inflationRate 30%: commerceActivityBonus *= 0.7

State additions needed in world{}:
- backingRatio: 1.0
- inflationRate: 0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 3B-3):**
- backingRatio calculated each year-advance
- inflationRate derived from backingRatio
- Stability and commerce penalties applied
- UI shows backing ratio and inflation rate
- UI shows inflation warning when rate > 0%
- Color coding: 0%=green, 5%=yellow, 15%=orange, 30%=red
## Phase 3C-1 Scope (Current)

Phase 3B-3 is complete. Now implementing Phase 3C-1 only.

**Goal:** Each social class has its own satisfaction index
driven by different factors. This is display only — no
behavioral effects yet.

**Rules:**

Four classes, each with satisfaction 0-100:

1. farmerSatisfaction
- Base: 70
- Penalties:
  agriculturalTaxRate > 0.5: -15
  inflationRate >= 15%: -10
  grainTreasury < totalPopulation * 1: -20
    (less than 1 jin per person = food insecurity)
  taxGrainRatio < 0.5: -10
    (forced to accept too many coupons)

2. merchantSatisfaction
- Base: 70
- Penalties:
  inflationRate >= 15%: -20
  inflationRate >= 30%: additional -20
  demandSaturation > 1.5: -10
  stabilityIndex < 50: -15
- Bonus:
  commerceActivityBonus > 1.0: +10

3. officialSatisfaction
- Base: 70
- Penalties:
  salaryGrainRatio < 0.5 AND inflationRate >= 15%: -20
  salaryGrainRatio < 0.3 AND inflationRate >= 5%: -15
  stabilityIndex < 50: -10

4. landlordSatisfaction (new class, display only for now)
- Base: 70
- Penalties:
  inflationRate >= 15%: -15
  grainPrice < 0.8: -10
  stabilityIndex < 50: -10
- Bonus:
  farmlandAreaMu > 40000: +10

All satisfaction values floored at 0, capped at 100.
Recalculated every year-advance.

State additions needed in world{}:
- farmerSatisfaction: 70
- merchantSatisfaction: 70
- officialSatisfaction: 70
- landlordSatisfaction: 70

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 3C-1):**
- All four satisfaction indices calculated each year
- UI shows satisfaction panel with all four classes
- Color coding per class:
  70-100: green, 40-69: yellow, 0-39: red
- UI shows which factors are penalizing each class
## Phase 3C-2 Scope (Current)

Phase 3C-1 is complete. Now implementing Phase 3C-2 only.

**Goal:** Low satisfaction now triggers concrete behavioral
responses from each class. These are real economic effects,
not just display penalties.

**Rules:**

Farmer behavior:
- farmerSatisfaction < 40:
  farmEfficiency *= 0.8
  yearLog shows: "农民消极怠工，农业产出下降"

Merchant behavior:
- merchantSatisfaction < 40:
  commerceGDP *= 0.7
  yearLog shows: "商人拒收粮劵，改用实物交易"
- merchantSatisfaction < 20:
  commerceGDP *= 0.5 (replaces 0.7, not stacked)
  yearLog shows: "商业市场大规模萎缩"

Official behavior:
- officialSatisfaction < 40:
  all policy effects reduced by 20%
  stabilityIndex -= 10 additional
  yearLog shows: "官员消极，政策执行力下降"

Landlord behavior:
- landlordSatisfaction < 40:
  farmlandAreaMu growth from reclamation blocked
  yearLog shows: "地主抵制开荒，土地扩张受阻"

All behavior checks happen during year-advance,
after satisfaction is calculated.

No new state fields needed.

**Files to modify:** economy.js, game.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
state.js

**Definition of Done (Phase 3C-2):**
- Each class behavior triggers at correct threshold
- Effects applied correctly during year-advance
- Year log records triggered behaviors
- UI shows active behavior warnings per class
- Effects stack correctly with existing multipliers
