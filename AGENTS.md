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
## Phase 3C-3 Scope (Current)

Phase 3C-2 is complete. Now implementing Phase 3C-3 only.

**Goal:** When coupon credibility collapses, a bank run
event triggers. Player must respond or face cascading
collapse.

**Rules:**

Credit crisis trigger conditions (all must be true):
- grainCouponsUnlocked = true
- backingRatio < 0.4
- merchantSatisfaction < 40
- inflationRate >= 30%

When triggered:
- creditCrisis = true
- couponCirculating *= 0.3 (70% of coupons dumped back)
- grainTreasury -= dumped amount (people redeem for grain)
- If grainTreasury goes negative: grainTreasury = 0
  and stabilityIndex -= 30
- merchantSatisfaction -= 20
- yearLog shows: "粮劵信用崩塌，市场发生挤兑"

Credit crisis resolution:
- Player can trigger "紧急回笼" once per crisis:
  Cost: couponTreasury >= 10000
  Effect: couponCirculating -= 10000
          couponTreasury -= 10000
          backingRatio recalculated
          creditCrisis = false if backingRatio >= 0.6
- Player can trigger "紧急赎回" once per crisis:
  Cost: grainTreasury >= 20000
  Effect: couponCirculating -= 20000
          grainTreasury -= 20000
          creditCrisis = false if backingRatio >= 0.6

Crisis persists until resolved or couponCirculating = 0.
Only one crisis can be active at a time.

State additions needed in world{}:
- creditCrisis: false
- creditCrisisResolved: false

**Files to modify:** state.js, economy.js, render.js,
game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 3C-3):**
- Crisis triggers when all conditions met
- Crisis event shown prominently in UI (red banner)
- Two resolution buttons appear during crisis
- Buttons disabled if resources insufficient
- Year log records crisis and resolution actions
- Crisis resolves correctly when backingRatio >= 0.6
- No duplicate crisis if already active
## Phase 4A-1 Scope (Current)

Phase 3C-3 is complete. Now implementing Phase 4A-1 only.

**Goal:** Initialize Xikou Village as an independent entity
with its own internal economy that runs every year-advance.

**Rules:**

Xikou Village initial state:
- population: 3000
- laborForce: 1800 (60%)
- children: 600 (20%)
- elderly: 600 (20%)
- farmlandMu: 3000
- mulberryLandMu: 2000
- saltMines: 2
- saltMineWorkers: 20 (10 per mine)
- saltOutputJin: 200000 per year
- grainTreasury: 500000 (initial reserve)
- clothOutput: 0 (calculated from mulberry land)
- stabilityIndex: 75
- attitudeToPlayer: 0 (neutral, range -100 to +100)
- diplomaticContact: false (no contact yet)

Labor allocation (auto each year):
- saltWorkers: 20 (fixed, priority)
- farmWorkers: farmlandMu / 10 = 300
- mulberryWorkers: mulberryLandMu / 10 = 200
- idleLabor: 1800 - 520 = 1280

Annual auto-calculation:
- grainOutput = farmlandMu * 500 * farmEfficiency
- clothOutput = mulberryLandMu * 50
  (50 jin cloth per mu per year)
- saltOutput = 200000 (fixed if saltMineWorkers >= 20)
- grainTreasury += grainOutput - population * 2
  (2 jin per person annual consumption)
- grainTreasury floored at 0

Population growth:
- Same 2% annual growth as player city
- laborForce, children, elderly scale proportionally

Xikou state stored under state.xikou{}

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 4A-1):**
- state.xikou initialized with all fields
- Xikou economy auto-calculated each year-advance
- UI shows Xikou Village panel with:
  population / labor / grain reserve / salt output /
  cloth output / stability / attitude
- Attitude shown as: 敌对/中立/友好/依附
- Panel visible but marked as "未建立外交关系"
  when diplomaticContact = false
## Phase 4A-2 Scope (Current)

Phase 4A-1 is complete. Now implementing Phase 4A-2 only.

**Goal:** Player can initiate diplomatic contact with Xikou
Village. Contact unlocks further interaction options and
starts attitude tracking.

**Rules:**

Send Envoy (派遣使者):
- Only available if diplomaticContact = false
- Cost: 5000 grain from player grainTreasury
- Effect: diplomaticContact = true
- Effect: attitudeToPlayer += 10
- yearLog: "派遣使者前往溪口村，初步建立外交联系"

Attitude change triggers (checked each year-advance):
- Player grainTreasury > 500000: attitudeToPlayer += 2
  (prosperous neighbor is reassuring)
- Player stabilityIndex < 50: attitudeToPlayer -= 3
  (unstable neighbor is threatening)
- Player inflationRate >= 15%: attitudeToPlayer -= 5
  (economic chaos is concerning)
- creditCrisis = true: attitudeToPlayer -= 10
  (financial crisis alarms Xikou)
- Xikou grainTreasury < 100000: attitudeToPlayer += 5
  (food insecurity makes them more open)

Attitude thresholds display:
- -100 to -50: 敌对 (red)
- -49 to -10: 警惕 (orange)
- -9 to +20: 中立 (grey)
- +21 to +50: 友好 (green)
- +51 to +100: 依附 (blue)

Diplomatic actions only available if
diplomaticContact = true.

No new state fields needed beyond diplomaticContact
already in Phase 4A-1.

**Files to modify:** economy.js, render.js, game.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
state.js

**Definition of Done (Phase 4A-2):**
- Send Envoy button visible when no contact established
- Button disabled if player grainTreasury < 5000
- After contact: attitude tracking begins
- Attitude updates each year-advance
- UI shows current attitude value and label
- UI shows factors affecting attitude this year
- yearLog records attitude-changing events
## Phase 4A-3 Scope (Current)

Phase 4A-2 is complete. Now implementing Phase 4A-3 only.

**Goal:** Player can establish trade agreements with Xikou
Village. Trade affects both economies and attitude.

**Rules:**

Trade only available if:
- diplomaticContact = true
- attitudeToPlayer >= -9 (neutral or better)

Two trade options:

1. 粮食换盐 (Grain for Salt)
- Player offers: grainAmount (player sets amount)
- Xikou gives: grainAmount * 0.5 jin of salt
  (2 jin grain = 1 jin salt, salt is valuable)
- Minimum order: 10000 grain
- Maximum order: xikou.saltOutputJin * 0.5 per year
  (Xikou keeps half their salt)
- Cannot trade if xikou.saltOutputJin = 0
- Cannot trade if player grainTreasury < grainAmount
- Effect: player grainTreasury -= grainAmount
- Effect: player saltReserve += salt received
- Effect: xikou.grainTreasury += grainAmount
- Effect: attitudeToPlayer += 3
- yearLog: "与溪口村完成粮盐交易"

2. 粮食换布匹 (Grain for Cloth)
- Player offers: grainAmount
- Xikou gives: grainAmount * 0.3 jin of cloth
- Minimum order: 5000 grain
- Cannot trade if xikou.clothOutput = 0
- Effect: player grainTreasury -= grainAmount
- Effect: player clothReserve += cloth received
- Effect: xikou.grainTreasury += grainAmount
- Effect: attitudeToPlayer += 2
- yearLog: "与溪口村完成粮布交易"

Both trades can happen once per year each.
Trade resets on year-advance.

Attitude bonus from trade:
- If player trades both in same year: attitudeToPlayer += 3
  additional bonus

State additions needed in world{}:
- saltReserve: 0
- clothReserve: 0
- saltTradeUsed: false
- clothTradeUsed: false

State additions needed in xikou{}:
- saltReserve: 0 (accumulated unsold salt)

**Files to modify:** state.js, economy.js, render.js,
game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 4A-3):**
- Trade buttons visible when conditions met
- Player inputs grain amount before confirming
- Both resources update correctly after trade
- Trade buttons disabled after use until next year
- UI shows player salt and cloth reserves
- UI shows Xikou available salt and cloth for trade
- Attitude updates after each trade
- yearLog records trade details including amounts
## Phase 5A-1 Scope (Current)

Phase 4A-3 is complete. Now implementing Phase 5A-1 only.

**Goal:** Establish commodity market for salt and cloth only.
Grain has no price before grainCouponsUnlocked.
After unlock, grain gets a coupon-denominated price.
Salt and cloth prices are measured in grain (pre-unlock)
or coupons (post-unlock, 1:1 so values unchanged).

**Rules:**

Grain:
- annualDemand = totalPopulation * 360
- No price field before grainCouponsUnlocked
- After unlock: grainPrice enters market (existing field)
- grainSurplus = grainTreasury - annualDemand
  (positive = surplus, negative = shortage)

Salt:
- annualSupply = salt received from Xikou trade this year
- annualDemand = totalPopulation * 15
- basePrice = 4.0 (4 jin grain per jin salt)
- range: 1.0 - 10.0
- reserve = saltReserve (existing)

Cloth:
- annualSupply = cloth received from Xikou trade this year
- annualDemand = totalPopulation * 0.3
- basePrice = 2.0 (2 jin grain per bolt)
- range: 0.8 - 5.0
- reserve = clothReserve (existing)

Price calculation for salt and cloth:
- supplyDemandRatio = (annualSupply + reserve * 0.1) /
  annualDemand
- ratio >= 1.5: price *= 0.85
- ratio 1.0-1.49: price unchanged
- ratio 0.7-0.99: price *= 1.2
- ratio 0.4-0.69: price *= 1.5
- ratio < 0.4: price *= 2.0
- Price change capped at 30% per year
- Price floored/capped within range

Purchasing power index:
- Based on salt and cloth prices only (pre-unlock)
- saltAffordability = saltPrice / 4.0
  (1.0 = normal, >1.0 = expensive)
- clothAffordability = clothPrice / 2.0
- purchasingPower = 100 / ((saltAffordability * 0.6) +
  (clothAffordability * 0.4))
  (salt weighted more as daily necessity)
- purchasingPower floored at 10, capped at 150
- After grainCouponsUnlocked: grain price also factors in

Grain shortage warning:
- grainSurplus < 0: show famine risk warning in UI
- grainSurplus < totalPopulation * -100:
  stabilityIndex -= 10 (severe shortage)

State additions needed in world{}:
- saltPrice: 4.0
- clothPrice: 2.0
- saltAnnualSupply: 0
- saltAnnualDemand: 0
- clothAnnualSupply: 0
- clothAnnualDemand: 0
- grainAnnualDemand: 0
- grainSurplus: 0
- purchasingPower: 100

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 5A-1):**
- Salt and cloth prices calculated each year via
  supply/demand ratio
- grainAnnualDemand and grainSurplus calculated each year
- purchasingPower calculated from salt and cloth prices
- UI shows commodity market panel:
  grain: demand / surplus / shortage warning
  salt: price / supply / demand / reserve
  cloth: price / supply / demand / reserve
- UI shows purchasingPower with color coding:
  80-150: green, 50-79: yellow, 10-49: red
- Famine risk warning shown when grainSurplus < 0
## Phase 5A-2 Scope (Current)

Phase 5A-1 is complete. Now implementing Phase 5A-2 only.

**Goal:** Purchasing power now actually affects class
satisfaction. Different classes are affected differently
by commodity price changes.

**Rules:**

Class purchasing power sensitivity:

Farmer:
- Most affected by salt price (daily necessity)
- saltAffordability > 1.5: farmerSatisfaction -= 15
- saltAffordability > 2.0: farmerSatisfaction -= 25
- clothAffordability > 1.5: farmerSatisfaction -= 10
- grainSurplus < 0: farmerSatisfaction -= 20
  (food insecurity hits farmers hardest)

Merchant:
- Benefits from high prices (sells goods)
- saltPrice > 5.0: merchantSatisfaction += 10
- clothPrice > 3.0: merchantSatisfaction += 10
- purchasingPower < 50: merchantSatisfaction -= 15
  (collapsed purchasing power = no customers)

Official:
- Cares about stability, not prices directly
- purchasingPower < 50: officialSatisfaction -= 10
  (social unrest from unaffordable goods)
- grainSurplus < 0: officialSatisfaction -= 15
  (famine is a governance failure)

Landlord:
- Benefits from grain scarcity
- grainSurplus < 0: landlordSatisfaction += 10
  (shortage means their grain is worth more)
- saltAffordability > 2.0: landlordSatisfaction -= 5
  (even wealthy feel extreme salt prices)

All adjustments applied after base satisfaction
calculation. Stack with existing penalties.

No new state fields needed.

**Files to modify:** economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js, state.js

**Definition of Done (Phase 5A-2):**
- Each class satisfaction updated by commodity prices
- Effects stack correctly with existing satisfaction logic
- UI shows which price factors are affecting each class
- Landlord grain scarcity bonus visible in UI
- All effects recalculated every year-advance
## Phase 5B-1 Scope (Current)

Phase 5A-2 is complete. Now implementing Phase 5B-1 only.

**Goal:** Salt demand is now a real annual pressure.
Player sets import quota from Xikou. Shortfall creates
real consequences.

**Rules:**

Salt demand:
- saltAnnualDemand = totalPopulation * 15
- saltImportQuota: player-set max import per year
  default: 0 (player must actively set)
  max: xikou.saltOutputJin * 0.5
  (Xikou keeps at least half their salt)

Salt import execution (each year-advance):
- actualSaltImport = min(saltImportQuota,
  xikou.saltOutputJin * 0.5)
- Cost = actualSaltImport * saltPrice (paid in grain
  if no coupons, or coupons if unlocked)
- Cannot import if player cannot afford cost
- saltReserve += actualSaltImport
- xikou.grainTreasury += cost paid
- attitudeToPlayer += 1 (trade is good for relations)

Salt consumption (each year-advance):
- saltConsumed = min(saltAnnualDemand, saltReserve)
- saltReserve -= saltConsumed
- saltShortfallRatio = 1 - (saltConsumed / saltAnnualDemand)
  (0 = fully supplied, 1 = no salt at all)

Shortfall effects:
- saltShortfallRatio > 0.3:
  farmerSatisfaction -= 20
  purchasingPower -= 15
  yearLog: "盐荒严重，民间怨声载道"
- saltShortfallRatio 0.1-0.3:
  farmerSatisfaction -= 10
  purchasingPower -= 8
  yearLog: "盐供应紧张"
- saltShortfallRatio = 0:
  no penalty

State additions needed in world{}:
- saltImportQuota: 0
- actualSaltImport: 0
- saltConsumed: 0
- saltShortfallRatio: 0

**Files to modify:** state.js, economy.js, render.js,
game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 5B-1):**
- saltImportQuota input visible in UI
- Player can set quota before each year-advance
- Import cost shown before confirming year-advance
- saltShortfallRatio calculated each year
- UI shows salt supply status:
  demand / imported / reserve / shortfall ratio
- Shortfall warning shown when ratio > 0.1
- yearLog records import amount and cost
## Phase 5B-2 Scope (Current)

Phase 5B-1 is complete. Now implementing Phase 5B-2 only.

**Goal:** Player can intervene in salt market by selling
from government reserve at a set price. Selling below
market price costs money but stabilizes society.

**Rules:**

Official salt sale:
- Player sets officialSaltPrice (in grain or coupons)
- Player sets officialSaltAmount (jin to release)
- Cannot set price above current saltPrice
  (no point selling above market)
- Cannot release more than saltReserve
- Minimum release: 1000 jin

Effects of official sale:
- saltReserve -= officialSaltAmount
- Revenue = officialSaltAmount * officialSaltPrice
- If grainCouponsUnlocked:
  couponTreasury += revenue
- Else:
  grainTreasury += revenue
- Loss = officialSaltAmount * (saltPrice - officialSaltPrice)
  (subsidy cost to government)

Market price response:
- officialSaltAmount / saltAnnualDemand >= 0.3:
  saltPrice *= 0.85 (significant supply injection)
- officialSaltAmount / saltAnnualDemand 0.1-0.29:
  saltPrice *= 0.95 (modest price relief)
- officialSaltAmount / saltAnnualDemand < 0.1:
  saltPrice unchanged

Satisfaction effects:
- officialSaltPrice <= saltPrice * 0.7:
  farmerSatisfaction += 15
  yearLog: "官府平价放盐，民心稳定"
- officialSaltPrice <= saltPrice * 0.9:
  farmerSatisfaction += 8
  yearLog: "官府适量投放食盐"

Official sale can happen once per year.
Player can choose not to intervene.

State additions needed in world{}:
- officialSaltPrice: 0
- officialSaltAmount: 0
- officialSaltSaleUsed: false

**Files to modify:** state.js, economy.js, render.js,
game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 5B-2):**
- Official salt sale panel visible in UI
- Player inputs price and amount
- Cost/revenue/loss preview shown before confirming
- saltPrice adjusts after sale
- Satisfaction effects applied correctly
- Button disabled after use until next year
- yearLog records sale price, amount, and subsidy cost
## Phase 5C-1 Scope (Current)

Phase 5B-2 is complete. Now implementing Phase 5C-1 only.

**Goal:** Player can open mulberry and hemp land.
Each has its own production chain and cost flow.
All costs enter economic circulation, not lost.

**Rules:**

Land reclamation minimums:
- Hemp land: minimum 100 mu per order
- Mulberry land: minimum 100 mu per order
- Both take 1 year (available next year-advance)
  except mulberry trees take 2 years to first harvest

Hemp land cost: 8 grain per mu
- 100% flows to farmerIncome
- farmerSatisfaction += 2 per reclamation order

Mulberry land cost: 15 grain per mu
- 10 grain per mu → farmerIncome
- 5 grain per mu → commerceGDP
  (buying saplings through merchants)
- farmerSatisfaction += 2 per order
- merchantSatisfaction += 1 per order
- attitudeToPlayer += 1 (buying saplings from Xikou)

Hemp production chain (per mu per year):
- 100 jin hemp fiber
- → 5 bolts coarse cloth
- Requires 1 labor per 10 mu (same as farmland)
- hempLaborRequired = hempLandMu / 10

Mulberry/silk production chain (per mu per year):
- 1000 jin mulberry leaves
- ÷ 20 = 50 jin fresh cocoons
- ÷ 10 = 5 jin raw silk
- Raw silk: 1 jin = 3 bolts fine cloth
- Requires 1 labor per 5 mu (more intensive)
- mulberryLaborRequired = mulberryLandMu / 5

Cloth output:
- coarseClothOutput = hempLandMu * 5 (bolts per year)
- fineClothOutput = mulberryLandMu * 15 (bolts per year)
  (only after 2-year maturation period)
- totalClothOutput = coarseCloth + fineCloth
- Added to clothReserve each year-advance

Labor priority order:
1. Farming
2. Salt mines (if any)
3. Hemp land
4. Mulberry land
5. Commerce
6. Merchants
7. Idle

Pending land tracking:
- pendingHempLandMu: 0 (added next year)
- pendingMulberryLandMu: 0 (added after 2 years)
- mulberryMaturationYear: 0 (year when mulberry matures)

State additions needed in world{}:
- hempLandMu: 0
- mulberryLandMu: 0
- pendingHempLandMu: 0
- pendingMulberryLandMu: 0
- mulberryMaturationYear: 0
- hempLaborRequired: 0
- mulberryLaborRequired: 0
- coarseClothOutput: 0
- fineClothOutput: 0
- rawSilkOutput: 0

**Files to modify:** state.js, economy.js, render.js,
game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 5C-1):**
- Two reclamation buttons: Open Hemp Land / Open Mulberry Land
- Each shows cost preview before confirming
- Minimum 100 mu enforced
- Costs deducted from grainTreasury immediately
- Cost flows correctly to farmer/commerce income
- Hemp land available next year
- Mulberry land available after 2 years
- Cloth output calculated each year from both land types
- Labor requirements calculated and displayed
- UI shows land holdings:
  hemp land / mulberry land / pending
- UI shows annual cloth production breakdown
- yearLog records reclamation and first harvest events
## Phase 5C-2 Scope (Current)

Phase 5C-1 is complete. Now implementing Phase 5C-2 only.

**Goal:** Player's own cloth production now enters the
market. Reduces dependence on Xikou imports.
Cloth supply now comes from both local production
and Xikou trade.

**Rules:**

Cloth supply calculation:
- totalClothSupply = coarseClothOutput + fineClothOutput
  + clothTradeReceived (from Xikou this year)
- clothReserve += totalClothSupply each year
- clothAnnualSupply = totalClothSupply (for price calc)

Cloth price differentiation:
- coarse cloth (hemp): base price 2.0 grain/bolt
- fine cloth (silk): base price 6.0 grain/bolt
- Market tracks blended average price:
  blendedClothPrice = (coarseClothOutput * 2.0 +
  fineClothOutput * 6.0) / totalClothOutput
  (if totalClothOutput = 0: use clothPrice as is)

Import substitution effect:
- If localClothRatio >= 0.5 (local covers 50%+ of demand):
  attitudeToPlayer unchanged from trade reduction
- If localClothRatio >= 0.8:
  clothImportQuota can be reduced to 0 without
  attitude penalty from Xikou
- localClothRatio = totalClothOutput / clothAnnualDemand

Xikou attitude adjustment:
- If player reduces cloth imports while
  localClothRatio < 0.5:
  attitudeToPlayer -= 5 per year
  yearLog: "溪口村对进口减少表示不满"

State additions needed in world{}:
- totalClothSupply: 0
- localClothRatio: 0
- blendedClothPrice: 2.0
- clothImportQuota: 0

**Files to modify:** state.js, economy.js, render.js
**Do NOT touch:** unlocks.js, policies.js, population.js,
game.js

**Definition of Done (Phase 5C-2):**
- totalClothSupply includes both local and imported
- blendedClothPrice calculated from production mix
- localClothRatio calculated each year
- UI shows cloth supply breakdown:
  local coarse / local fine / imported / total
- UI shows local self-sufficiency ratio
- Xikou attitude penalty shown when reducing imports
  prematurely
- yearLog records when player achieves 50% and 80%
  cloth self-sufficiency milestones
## Phase 5D-1 Scope (Current)

Phase 5C-2 is complete. Now implementing Phase 5D-1 only.

**Goal:** Silkworm excrement (蚕沙) from mulberry land
becomes agricultural fertilizer. Players can also import
it from Xikou Village as a trade good.

**Rules:**

Silkworm excrement production:
- playerSilkwormDung = mulberryLandMu * 600 jin per year
- Only produced from mature mulberry land
  (after 2-year maturation period)

Xikou silkworm excrement:
- xikouMulberryLandMu = 1200 (part of existing 2000 mu)
- xikouHempLandMu = 800
- xikouSilkwormDungOutput = 1200 * 600 = 720000 jin/year
- xikouSilkwormDungAvailable = 720000 -
  (xikou.farmlandMu * 600 * 0.3)
  (Xikou uses 30% coverage on own farmland first)

Silkworm dung trade:
- Player can import silkworm dung from Xikou
- Price: 1 grain per 100 jin dung
  (or 1 coupon per 100 jin if unlocked)
- Max import: xikouSilkwormDungAvailable per year
- attitudeToPlayer += 1 per trade

Fertilizer coverage calculation:
- totalDung = playerSilkwormDung + importedDung
- dungCoverage = totalDung /
  (farmlandAreaMu * 600)
  (600 jin per mu = full coverage)
- Coverage capped at 1.0 (100%)

Fertilizer effect on grain yield:
- dungCoverage < 0.15: fertilizerBonus = 1.05 (+5%)
- dungCoverage 0.15-0.40: fertilizerBonus = 1.12 (+12%)
- dungCoverage > 0.40: fertilizerBonus = 1.20 (+20%)
- dungCoverage = 0: fertilizerBonus = 1.0 (no effect)

Apply to grain output:
- actualGrainOutput *= fertilizerBonus
- Max yield per mu = 600 jin (500 * 1.20)

Dung import resets each year (perishable).
Cannot stockpile silkworm dung.

State additions needed in world{}:
- playerSilkwormDung: 0
- importedDung: 0
- dungImportQuota: 0
- totalDung: 0
- dungCoverage: 0
- fertilizerBonus: 1.0

State additions needed in xikou{}:
- silkwormDungOutput: 720000
- silkwormDungAvailable: 0
- mulberryLandMu: 1200
- hempLandMu: 800

**Files to modify:** state.js, economy.js, render.js,
game.js
**Do NOT touch:** unlocks.js, policies.js, population.js

**Definition of Done (Phase 5D-1):**
- playerSilkwormDung calculated from mature mulberry land
- xikouSilkwormDungAvailable calculated each year
- Dung import panel visible in UI
- Player sets dungImportQuota
- Import cost deducted from grain/coupon treasury
- dungCoverage and fertilizerBonus calculated each year
- Grain output correctly boosted by fertilizerBonus
- UI shows fertilizer panel:
  own dung / imported / total coverage % / bonus %
- UI shows max yield per mu with current bonus
- yearLog records dung import and fertilizer effect
## Refactor: Modular Structure (Current)

Phase 5D-1 is complete. Before adding tech tree,
refactor all JS into clean modules.

**Goal:** Split large files into focused modules.
No logic changes. No value changes. Move only.

**New directory structure:**

js/
├── state.js          (keep: initialState + createGameState only)
├── game.js           (keep: main year loop + event binding only)
├── render.js         (keep: renderAll() entry point only)
│
├── economy/
│   ├── agriculture.js  (grain output, land, fertilizer, hemp,
│                         mulberry, silk)
│   ├── commerce.js     (shops, merchants, commerce GDP,
│                         demand saturation)
│   ├── market.js       (commodity prices, purchasing power,
│                         salt market, cloth market)
│   ├── currency.js     (coupons, inflation, credit crisis,
│                         treasury split)
│   └── labor.js        (labor allocation, all sector
│                         labor requirements)
│
├── society/
│   ├── population.js   (population growth, growth rate
│                         modifiers)
│   ├── satisfaction.js (all four class satisfaction
│                         calculations and behavior triggers)
│   └── stability.js    (stability index, efficiency
│                         multiplier, policy interventions)
│
├── diplomacy/
│   └── xikou.js        (Xikou Village state, annual economy,
│                         diplomacy, trade, dung trade)
│
└── ui/
    ├── render_economy.js   (all economy panels)
    ├── render_society.js   (satisfaction, stability,
│                            purchasing power panels)
    ├── render_diplomacy.js (Xikou village panel,
│                            trade panels)
    └── render_world.js     (core stats, labor, land,
                              year log)

**Rules:**
- Do NOT change any logic, formulas, or values
- Do NOT rename any functions or variables
- Every function goes into exactly one file
- Modules only import from state.js (no circular deps)
- Each new file must have clear section comments

**index.html updates:**
- Remove old script tags for economy.js, population.js,
  render.js
- Add new script tags in correct dependency order:
  1. state.js
  2. economy/labor.js
  3. economy/agriculture.js
  4. economy/commerce.js
  5. economy/market.js
  6. economy/currency.js
  7. society/population.js
  8. society/stability.js
  9. society/satisfaction.js
  10. diplomacy/xikou.js
  11. ui/render_world.js
  12. ui/render_economy.js
  13. ui/render_society.js
  14. ui/render_diplomacy.js
  15. render.js
  16. policies.js
  17. unlocks.js
  18. game.js

**Old files to empty after migration:**
- js/economy.js → replace with single comment:
  // Migrated to js/economy/ modules
- js/population.js → replace with single comment:
  // Migrated to js/society/population.js

**Definition of Done:**
- All new module files created with complete content
- All functions correctly placed in new modules
- index.html script tags updated
- Old files emptied with migration comment
- No logic or value changes anywhere
- Game runs identically after refactor
## Phase 6A-1 Scope (Current)

Refactor complete. Now implementing 6A-1 only.

**Goal:** Build the tech tree data structure and research
queue system. No tech effects yet — infrastructure only.

**New file:** js/tech/research.js

**Tech data structure:**
Each tech is an object:
{
  id: string,
  name: string (Chinese),
  category: string (agriculture/commerce/society/military),
  description: string,
  researchYears: number,
  cost: { grain: number, cloth: number, coupon: number },
  prerequisites: [string] (array of tech ids),
  unlocks: [{ type: string, target: string, value: any }],
  status: string (locked/available/researching/completed)
}

**Initial tech list (no prerequisites = available at start):**

Agriculture:
- id: "basic_farming", name: "基础农耕",
  years: 1, cost: { grain: 2000 },
  unlocks: [{ type: "available", target: "intensive_farming" }]

- id: "intensive_farming", name: "精耕细作",
  prerequisites: ["basic_farming"],
  years: 2, cost: { grain: 5000 },
  unlocks: [{ type: "bonus", target: "grainYieldPerMu",
  value: 0.1 }]

- id: "crop_rotation", name: "轮作制度",
  prerequisites: ["intensive_farming"],
  years: 3, cost: { grain: 8000 },
  unlocks: [{ type: "bonus", target: "grainYieldPerMu",
  value: 0.1 },
  { type: "bonus", target: "droughtResistance", value: 0.2 }]

- id: "irrigation", name: "水利灌溉",
  prerequisites: ["intensive_farming"],
  years: 3, cost: { grain: 10000, cloth: 100 },
  unlocks: [{ type: "bonus", target: "grainYieldPerMu",
  value: 0.15 }]

Commerce:
- id: "folk_trade", name: "民间贸易",
  years: 1, cost: { grain: 1000 },
  unlocks: [{ type: "available", target: "contract_law" },
  { type: "available", target: "weights_measures" }]

- id: "contract_law", name: "契约法",
  prerequisites: ["folk_trade"],
  years: 2, cost: { grain: 4000 },
  unlocks: [{ type: "bonus", target: "merchantSatisfaction",
  value: 10 }]

- id: "weights_measures", name: "度量衡统一",
  prerequisites: ["folk_trade"],
  years: 1, cost: { grain: 3000 },
  unlocks: [{ type: "bonus", target: "tradeEfficiency",
  value: 0.1 }]

Society:
- id: "written_records", name: "文字记录",
  years: 2, cost: { grain: 3000 },
  unlocks: [{ type: "available", target: "papermaking" },
  { type: "available", target: "codified_law" }]

- id: "papermaking", name: "造纸术",
  prerequisites: ["written_records"],
  years: 2, cost: { grain: 5000, cloth: 50 },
  unlocks: [{ type: "system", target: "bureaucracy_system" }]

- id: "codified_law", name: "律法成文",
  prerequisites: ["written_records"],
  years: 2, cost: { grain: 4000 },
  unlocks: [{ type: "bonus", target: "stabilityIndex",
  value: 10 }]

- id: "herbalism", name: "草药知识",
  years: 2, cost: { grain: 2000 },
  unlocks: [{ type: "available", target: "basic_medicine" }]

- id: "basic_medicine", name: "初级医学",
  prerequisites: ["herbalism"],
  years: 3, cost: { grain: 6000 },
  unlocks: [{ type: "bonus", target: "populationGrowthRate",
  value: 0.005 }]

Military:
- id: "militia", name: "民兵训练",
  years: 2, cost: { grain: 3000 },
  unlocks: [{ type: "system", target: "military_system" },
  { type: "available", target: "weapon_forging" }]

- id: "weapon_forging", name: "武器锻造",
  prerequisites: ["militia"],
  years: 2, cost: { grain: 5000, cloth: 100 },
  unlocks: [{ type: "bonus", target: "combatPower",
  value: 0.2 }]

**Research queue:**
- Only one tech can be researching at a time
- state.research = {
    currentTech: null,
    yearsRemaining: 0,
    completed: [],
    available: []
  }
- Each year-advance: yearsRemaining -= 1
- When yearsRemaining = 0: tech completes, effects apply

**Research initiation:**
- Player clicks "研究" on an available tech
- Cost deducted immediately from treasury
- Cannot start if already researching
- Cannot start if prerequisites not completed
- Cannot start if insufficient resources

**State additions:**
- state.research = {
    currentTech: null,
    yearsRemaining: 0,
    completed: [],
    available: ["basic_farming", "folk_trade",
    "written_records", "herbalism", "militia"]
  }
- state.techBonuses = {
    grainYieldBonus: 0,
    tradeEfficiency: 0,
    droughtResistance: 0,
    combatPower: 0
  }

**New file:** js/tech/research.js
Contains: techTree array, initResearch(),
updateResearch(), applyTechEffect(),
getAvailableTechs()

**Files to modify:** state.js, game.js, render.js
**New files:** js/tech/research.js,
js/ui/render_tech.js
**Do NOT touch:** unlocks.js, policies.js,
any economy/ society/ diplomacy/ files

**Definition of Done (Phase 6A-1):**
- techTree data defined in research.js
- Research queue tracked in state.research
- Player can select and start researching a tech
- Progress advances each year-advance
- Completed techs apply bonuses to techBonuses state
- UI shows tech tree panel:
  available techs with cost and years
  current research with progress bar
  completed techs list
- Cannot start research if already researching
- index.html updated with new script tags
## UI Refactor: Tab Layout (Current)

Tech tree scaffold complete. Now refactoring UI only.
No logic or value changes. Layout only.

**Goal:** Replace infinite scroll with a tab-based mobile
UI. Fixed dashboard at top, tab navigation at bottom,
content panels per tab.

**Fixed header (always visible):**
- Game title (small)
- Year | Population | Grain Treasury | Stability | 
  Purchasing Power
- Next Year button

**Bottom tab navigation (7 tabs):**
1. 总览 (Overview)
2. 经济 (Economy)
3. 农业 (Agriculture)
4. 社会 (Society)
5. 外交 (Diplomacy)
6. 科技 (Technology)
7. 货币 (Currency)

**Tab contents:**

总览:
- Core stats (year, population, labor breakdown)
- Land utilization
- Year log (last 10 entries)
- Available policies panel

经济:
- GDP breakdown (agriculture/commerce/construction)
- Shop count, operating shops, idle shops
- Merchant count
- Income per head (farmer/merchant/income gap)
- Commerce activity bonus
- Demand saturation

农业:
- Grain output (potential/actual/lost)
- Yield per mu (effective)
- Farmland area
- Hemp/mulberry land holdings
- Pending land
- Cloth production breakdown
- Silkworm dung panel
- Land reclamation buttons

社会:
- Stability index (with color)
- Efficiency multiplier
- Four class satisfaction panels
- Active behavior warnings
- Policy intervention buttons
  (grain redistribution, merchant tax)

外交:
- Xikou Village full panel
- Send envoy button
- Trade panels (grain for salt, grain for cloth)
- Silkworm dung import panel

科技:
- Available techs (with cost, years, research button)
- Current research progress bar
- Completed techs list

货币:
- Treasury (grain/coupon split)
- Coupon issuance panel
- Tax ratio slider
- Salary ratio slider
- Inflation panel
- Credit crisis panel

**Design requirements:**
- Mobile-first, portrait orientation
- Fixed header: ~80px tall
- Fixed bottom tabs: ~60px tall
- Scrollable content area between header and tabs
- Active tab highlighted
- Tab icons optional, Chinese labels required
- Color scheme: keep existing dark theme
- Each panel is a card with subtle border
- All existing HTML element IDs must be preserved
  (do not rename any id attributes)

**Files to modify:** index.html, style.css,
js/render.js, js/ui/render_world.js,
js/ui/render_economy.js, js/ui/render_society.js,
js/ui/render_diplomacy.js, js/ui/render_tech.js
**Do NOT touch:** any js/economy/ js/society/
js/diplomacy/ js/tech/research.js files

**Definition of Done:**
- 7 tabs visible at bottom
- Fixed header always shows key stats
- Each tab shows correct panels
- Next Year button always accessible
- No content lost (everything still renders)
- Smooth tab switching (no page reload)
- Works on mobile portrait screen
## Phase 6A-2 Scope (Current)

UI refactor complete. Now implementing 6A-2 only.

**Goal:** Tech research effects now actually apply to game
state when a tech is completed. Connect techBonuses to
real calculations.

**Rules:**

When a tech completes, applyTechEffect() runs:

Agriculture bonuses:
- intensive_farming: grainYieldPerMu += 50 (500→550)
- crop_rotation: grainYieldPerMu += 50 (→600)
  AND droughtResistance = true (placeholder for now)
- irrigation: grainYieldPerMu += 75 (→675)
  capped at 800 absolute max

Commerce bonuses:
- contract_law: merchantSatisfaction permanent +10
  (added as flat bonus each year)
- weights_measures: tradeEfficiency += 0.1
  (Xikou trade gives 10% more goods)

Society bonuses:
- codified_law: stabilityIndex base += 10
  (base changes from 80 to 90)
- basic_medicine: populationGrowthRate += 0.005
  (2% → 2.5%)
- papermaking: bureaucracyUnlocked = true
  (enables new policy options, placeholder for now)

Military bonuses:
- weapon_forging: combatPower += 0.2
  (placeholder, no military system yet)

All bonuses are permanent and cumulative.
Store applied bonuses in state.techBonuses:
- grainYieldBonus: 0 (added to grainYieldPerMu)
- stabilityBase: 80 (modified by codified_law)
- populationGrowthBonus: 0
- tradeEfficiency: 0
- combatPower: 0
- bureaucracyUnlocked: false

Apply techBonuses in calculations:
- agriculture.js: effectiveYield =
  grainYieldPerMu + techBonuses.grainYieldBonus
- population.js: growth rate +=
  techBonuses.populationGrowthBonus
- stability.js: base stability =
  techBonuses.stabilityBase
- diplomacy/xikou.js: trade output *=
  (1 + techBonuses.tradeEfficiency)

**Files to modify:** js/tech/research.js,
js/economy/agriculture.js, js/society/population.js,
js/society/stability.js, js/diplomacy/xikou.js,
js/state.js
**Do NOT touch:** unlocks.js, policies.js,
any ui/ files

**Definition of Done (Phase 6A-2):**
- Completed techs apply real bonuses to state
- grainYieldPerMu increases after farming techs
- Population growth rate increases after medicine
- Stability base increases after codified law
- Trade efficiency applies to Xikou trade
- Tech panel shows applied bonus values
- yearLog records when tech completes and what
  bonus was applied
## Phase 5D-2 Scope (Current)

Phase 6A-2 is complete. Now implementing 5D-2 only.

**Goal:** Hemp land produces three types of byproducts
automatically each year. All byproducts have real effects.

**Rules:**

Byproduct calculation (per year, from hempLandMu):
- paperMaterial = hempLandMu * 20
  (jin of scrap hemp fiber, usable for paper)
- hempStalks = hempLandMu * 200
  (jin of dried stalks, usable as fuel)
- buildingFiber = hempLandMu * 10
  (jin of fiber for wall reinforcement)

All three auto-calculated each year, no player input.

Papermaking (requires bureaucracyUnlocked = false,
this phase just accumulates material):
- paperMaterialReserve += paperMaterial each year
- paperMaterialReserve capped at hempLandMu * 100
  (can't stockpile indefinitely)
- When bureaucracyUnlocked = true (from papermaking tech):
  paperOutput = paperMaterialReserve / 50
  (50 jin material = 1 unit of paper)
  officialSatisfaction += min(paperOutput * 0.01, 10)

Fuel (hemp stalks):
- fuelBonus reduces construction costs
- hempLandMu >= 500: constructionCostReduction = 0.05
- hempLandMu >= 2000: constructionCostReduction = 0.10
- hempLandMu >= 5000: constructionCostReduction = 0.15
- Apply to: farmland reclamation cost
  hemp/mulberry reclamation cost
- constructionCostReduction capped at 0.15

Building fiber:
- buildingFiberReserve += buildingFiber each year
- When reserve >= farmlandAreaMu * 5:
  structuralBonus = true
  farmerSatisfaction += 3
  laborEfficiency += 0.02 (2% boost to all labor output)
- structuralBonus resets if reserve drops below threshold

State additions needed in world{}:
- paperMaterial: 0
- paperMaterialReserve: 0
- paperOutput: 0
- hempStalks: 0
- constructionCostReduction: 0
- buildingFiber: 0
- buildingFiberReserve: 0
- structuralBonus: false
- laborEfficiency: 1.0

**Files to modify:** state.js,
js/economy/agriculture.js,
js/ui/render_economy.js
**Do NOT touch:** unlocks.js, policies.js,
js/tech/research.js, any society/ diplomacy/ files

**Definition of Done (Phase 5D-2):**
- All three byproducts calculated each year
- paperMaterialReserve accumulates over time
- Paper output activates when bureaucracyUnlocked
- constructionCostReduction applied to reclamation costs
- structuralBonus triggers at correct threshold
- laborEfficiency applied to labor calculations
- UI shows byproduct panel in 农业 tab:
  paper material / hemp stalks / building fiber
  construction cost reduction %
  structural bonus status
## Cost Rebalance (Current)

All previous costs were too low relative to actual
economy scale. Annual net grain gain is ~8.7M jin.
Rebalancing all costs to create real economic pressure.

**New cost standards:**

Land reclamation:
- Farmland: 500 grain/mu (was 5)
- Hemp land: 800 grain/mu (was 8)
- Mulberry land: 1500 grain/mu (was 15)

Buildings:
- Shop: 1,500,000 grain (was 2,000)

Diplomacy:
- Send envoy: 500,000 grain (was 5,000)
- Salt trade: prices unchanged (market-driven)
- Cloth trade: prices unchanged (market-driven)

Policy interventions:
- Grain redistribution: 3,000,000 grain (was 5,000)
- Merchant tax: unchanged (revenue-generating)

Bureaucracy policies (bureaucracyUnlocked required):
- 户籍制度 (Household Registry):
  1,500,000 grain one-time + 300,000 grain/year
  Effect: tax efficiency +10%
- 粮仓台账 (Granary Ledger):
  800,000 grain one-time
  Effect: grainTreasury retains 3% more each year
- 官府布告 (Official Proclamation):
  600,000 grain/year
  Effect: stability penalty reduced by 15%
- 契约制度 (Contract System):
  2,000,000 grain one-time
  Effect: merchantSatisfaction permanent +10
- 律法成文 (Codified Law):
  4,000,000 grain one-time
  Effect: stabilityIndex base +10

Bureaucracy policy rules:
- All require bureaucracyUnlocked = true
- All can be active simultaneously
- One-time costs deducted immediately
- Annual maintenance deducted each year-advance
- Cannot activate if insufficient grain

Tech research costs (all ×100 from original):
- basic_farming: 200,000 grain (was 2,000)
- intensive_farming: 500,000 grain (was 5,000)
- crop_rotation: 800,000 grain (was 8,000)
- irrigation: 1,000,000 grain + 100,000 cloth (was 10,000)
- folk_trade: 100,000 grain (was 1,000)
- contract_law: 400,000 grain (was 4,000)
- weights_measures: 300,000 grain (was 3,000)
- written_records: 300,000 grain (was 3,000)
- papermaking: 500,000 grain + 50,000 cloth (was 5,000)
- codified_law: 400,000 grain (was 4,000)
- herbalism: 200,000 grain (was 2,000)
- basic_medicine: 600,000 grain (was 6,000)
- militia: 300,000 grain (was 3,000)
- weapon_forging: 500,000 grain + 100,000 cloth (was 5,000)

**Files to modify:**
- js/economy/agriculture.js (reclamation costs)
- js/economy/commerce.js (shop cost)
- js/diplomacy/xikou.js (envoy cost)
- js/society/stability.js (policy costs)
- js/tech/research.js (all tech costs)
- js/state.js (new bureaucracy policy state fields)
- js/ui/render_society.js (bureaucracy policy buttons)
- js/ui/render_tech.js (updated cost display)

**Do NOT touch:** unlocks.js, any economy/market.js,
economy/currency.js, economy/labor.js

**Definition of Done:**
- All costs updated to new values
- Bureaucracy policies implemented with correct costs
- Annual maintenance deducted each year-advance
- UI shows bureaucracy policy panel in 社会 tab
  when bureaucracyUnlocked = true
- Tech costs updated in research panel
- yearLog records policy activation and costs
## Phase 6A-3 Scope (Current)

Phase 6A-2 and cost rebalance complete.
Now adding third-tier technologies.

**Goal:** Add 8 new tier-3 techs with real effects.
All require tier-2 prerequisites.

**New techs to add to techTree in research.js:**

Agriculture:
- id: "selective_breeding", name: "育种改良",
  prerequisites: ["crop_rotation"],
  years: 3, cost: { grain: 1200000 },
  unlocks: [
    { type: "bonus", target: "grainYieldPerMu", value: 50 },
    { type: "available", target: "new_crops" }
  ]

- id: "watermill", name: "水车磨坊",
  prerequisites: ["irrigation"],
  years: 3, cost: { grain: 1500000, cloth: 150000 },
  unlocks: [
    { type: "bonus", target: "laborEfficiency", value: 0.05 },
    { type: "system", target: "flour_processing" }
  ]

Commerce:
- id: "moneylender", name: "钱庄系统",
  prerequisites: ["contract_law"],
  years: 3, cost: { grain: 2000000 },
  unlocks: [
    { type: "system", target: "lending_system" },
    { type: "bonus", target: "commerceGDP", value: 0.1 }
  ]

- id: "long_distance_trade", name: "远途贸易",
  prerequisites: ["weights_measures"],
  years: 4, cost: { grain: 2500000, cloth: 200000 },
  unlocks: [
    { type: "system", target: "new_trade_partners" },
    { type: "bonus", target: "tradeEfficiency", value: 0.15 }
  ]

Society:
- id: "imperial_exam_proto", name: "科举雏形",
  prerequisites: ["papermaking", "codified_law"],
  years: 4, cost: { grain: 3000000 },
  unlocks: [
    { type: "system", target: "scholar_class" },
    { type: "bonus", target: "officialSatisfaction", value: 15 },
    { type: "bonus", target: "stabilityBase", value: 5 }
  ]

- id: "advanced_medicine", name: "高级医学",
  prerequisites: ["basic_medicine"],
  years: 4, cost: { grain: 2000000, cloth: 100000 },
  unlocks: [
    { type: "bonus", target: "populationGrowthRate",
      value: 0.005 },
    { type: "bonus", target: "farmerSatisfaction", value: 5 }
  ]

Military:
- id: "fortification", name: "城防工事",
  prerequisites: ["weapon_forging"],
  years: 3, cost: { grain: 2500000, cloth: 250000 },
  unlocks: [
    { type: "bonus", target: "defenseRating", value: 0.3 },
    { type: "system", target: "defense_system" }
  ]

- id: "intelligence", name: "情报系统",
  prerequisites: ["weapon_forging"],
  years: 3, cost: { grain: 1500000 },
  unlocks: [
    { type: "system", target: "espionage_system" },
    { type: "bonus", target: "attitudeToPlayer", value: 5 }
  ]

**Apply new tech effects in applyTechEffect():**
- watermill: laborEfficiency += 0.05
- moneylender: commerceGDP multiplier += 0.1
- long_distance_trade: tradeEfficiency += 0.15
- imperial_exam_proto: officialSatisfaction += 15,
  stabilityBase += 5
- advanced_medicine: populationGrowthRate += 0.005,
  farmerSatisfaction permanent += 5
- fortification: defenseRating += 0.3 (new field)
- intelligence: attitudeToPlayer += 5 (one-time bonus)
- selective_breeding: grainYieldPerMu += 50

**New state fields needed in techBonuses:**
- defenseRating: 0
- flourProcessing: false
- lendingSystem: false
- newTradePartners: false
- scholarClass: false
- espionageSystem: false

**Files to modify:**
- js/tech/research.js
- js/state.js
- js/ui/render_tech.js
**Do NOT touch:** any economy/ society/ diplomacy/
ui/render_economy.js ui/render_society.js files

**Definition of Done (Phase 6A-3):**
- All 8 new techs appear in tech tree UI
- Prerequisites correctly enforced
- All techs show correct costs and research time
- Completed techs apply correct bonuses
- New techBonuses fields initialized in state
- yearLog records completion of each new tech
- Tech panel organizes by tier visually
## Phase 6B-1 Scope (Current)

Phase 6A-3 complete. Now implementing 6B-1 only.

**Goal:** Every grain/coupon expenditure has a defined
destination. Add land rent system. Add income pools
that drive consumption demand.

**Rules:**

Income pools (new state fields):
- farmerIncomePool: 0 (accumulated this year)
- merchantIncomePool: 0
- officialIncomePool: 0

Reset to 0 each year-advance after effects applied.

Expenditure flow routing:

Tech research cost:
- 60% → merchantIncomePool (craftsmen)
- 40% → officialIncomePool (scholars)

Shop construction cost:
- 80% → farmerIncomePool (construction workers)
- 20% → merchantIncomePool (merchants)

Send envoy cost:
- 100% → officialIncomePool

Grain redistribution policy:
- 100% → farmerIncomePool

Bureaucracy policy costs (one-time):
- 100% → officialIncomePool

Bureaucracy policy annual maintenance:
- 100% → officialIncomePool

Land reclamation (farmland):
- Already implemented, maintain existing logic

Income pool effects (applied each year):
farmerIncomePool effects:
- farmerSatisfaction += min(farmerIncomePool /
  1000000, 10)
- saltAnnualDemand += farmerIncomePool / 500000
- clothAnnualDemand += farmerIncomePool / 2000000

merchantIncomePool effects:
- merchantSatisfaction += min(merchantIncomePool /
  1000000, 8)
- clothAnnualDemand += merchantIncomePool / 1500000

officialIncomePool effects:
- officialSatisfaction += min(officialIncomePool /
  500000, 10)
- clothAnnualDemand += officialIncomePool / 2000000

Land rent system:
- farmlandRentRate: 0 (default, jin per mu per year)
- adjustable range: 0-20 jin/mu/year
- collection method follows taxGrainRatio
  (same grain/coupon split as tax)
- rent revenue added to grainTreasury/couponTreasury
- rent too high penalty:
  farmlandRentRate > 10: farmerSatisfaction -= 10
  farmlandRentRate > 15: farmerSatisfaction -= 25
- rent flows:
  100% → government treasury (landlord is government)

Year log entries:
- Record total income distributed to each pool
- Record rent collected
- Record demand increases from income

State additions needed in world{}:
- farmerIncomePool: 0
- merchantIncomePool: 0
- officialIncomePool: 0
- farmlandRentRate: 0

**Files to modify:**
- js/state.js
- js/economy/agriculture.js (reclamation flow)
- js/economy/commerce.js (shop construction flow)
- js/diplomacy/xikou.js (envoy cost flow)
- js/society/stability.js (policy cost flow)
- js/tech/research.js (research cost flow)
- js/economy/market.js (demand updates from income)
- js/ui/render_society.js (rent rate control)
- js/ui/render_world.js (income pool display)

**Do NOT touch:** unlocks.js, policies.js,
economy/currency.js, economy/labor.js

**Definition of Done (Phase 6B-1):**
- All expenditures route to correct income pools
- Income pools affect satisfaction and demand
- Land rent collected each year-advance
- Rent rate slider in 社会 tab (0-20 jin/mu)
- UI shows annual income distribution panel:
  farmer pool / merchant pool / official pool
- UI shows rent collected this year
- yearLog records all flows
## Phase 6B-2 Scope (Current)

Phase 6B-1 complete. Now implementing 6B-2 only.

**Goal:** Add moneylender shop upgrade system with
government licensing. Add lending pool and interest
mechanics.

**Rules:**

Unlock conditions (all must be true):
- moneylenderUnlocked = true (tech completed)
- bureaucracyUnlocked = true (papermaking tech)
- shopCount >= 10

Moneylender shop upgrade:
- Player sets approvedMoneylenders (how many to license)
- Cannot exceed shopCount
- Each license costs 5,000,000 coupon (default)
  or grain if grainCouponsUnlocked = false
- licenseFee adjustable by player (policy panel)
- License fee → 100% couponTreasury/grainTreasury
- moneylenderShops = approvedMoneylenders

Moneylender income:
- Each moneylender shop earns base commerceGDP
  (same as regular shop: 500/year)
- Plus lending interest income (see below)

Moneylender fees:
- Pays shop rent (same as regular shops)
- Pays moneylender tax: moneylenderGDP * moneylenderTaxRate
- moneylenderTaxRate: 0.01 (1%, adjustable 0%-20%)
- Tax → couponTreasury/grainTreasury

Lending pool:
- lendingPoolSize = moneylenderShops * 10,000,000
  (each moneylender can lend 10M per year)
- Government can borrow from lending pool
- Max government borrow = lendingPoolSize * 0.5
- Civilian auto-lending:
  Each year, moneylenders auto-lend to merchants
  civilianLending = lendingPoolSize * 0.3
  → new shop opens every 5 years of lending
    (civilianLendingAccumulator += civilianLending)
    when accumulator >= 50,000,000: shopCount += 1,
    accumulator -= 50,000,000

Interest rates:
- Government borrowing:
  coupon loan: 5%/year
  grain loan: 3%/year
- Civilian lending: fixed 8%/year
- Interest income → moneylenderIncomePool
  → 50% merchantIncomePool
  → 50% couponTreasury (moneylender profit)

Government debt:
- governmentDebt: 0 (total outstanding)
- governmentDebtInterest: 0 (annual interest due)
- Debt repayment: player sets annualRepayment
- Cannot borrow if governmentDebt >
  lendingPoolSize (overleveraged)
- Default penalty (debt > grainTreasury * 2):
  merchantSatisfaction -= 30
  creditCrisis = true

Debt effects on satisfaction:
- governmentDebt > lendingPoolSize * 0.3:
  merchantSatisfaction -= 5
- governmentDebt > lendingPoolSize * 0.6:
  merchantSatisfaction -= 15
- governmentDebt > lendingPoolSize * 0.9:
  merchantSatisfaction -= 30

State additions needed in world{}:
- moneylenderShops: 0
- approvedMoneylenders: 0
- licenseFee: 5000000
- moneylenderTaxRate: 0.01
- lendingPoolSize: 0
- governmentDebt: 0
- governmentDebtInterest: 0
- annualRepayment: 0
- civilianLendingAccumulator: 0
- moneylenderGDP: 0

**Files to modify:**
- js/state.js
- js/economy/commerce.js
- js/economy/currency.js
- js/ui/render_economy.js
- js/ui/render_society.js (policy controls)
- js/game.js (debt repayment each year)

**Do NOT touch:** unlocks.js, policies.js,
economy/agriculture.js, economy/market.js,
economy/labor.js, any society/ diplomacy/ files

**Definition of Done (Phase 6B-2):**
- Moneylender panel appears when conditions met
- Player can set approvedMoneylenders count
- License fee deducted on approval
- moneylenderTaxRate slider (0%-20%)
- licenseFee adjustable in policy panel
- Government borrow button with amount input
- Annual repayment input
- Debt panel shows:
  total debt / interest due / lending pool size
- Civilian lending auto-generates shops over time
- yearLog records borrowing, repayment, interest
- Warning shown when debt levels are high
## Phase 7A-1 Scope (Current)

Phase 6B-2 complete. Now implementing 7A-1 only.

**Goal:** Add literacy system with class-based tracking.
Initial state has only farmers. Other classes appear
as game progresses. Literacy affects efficiency of
each class.

**Rules:**

Initial state:
- Only farmers exist at game start
- Overall literacy = farmer literacy only
- No merchants/officials/workers/landlords initially

Literacy tracking per class:
- farmerLiteracy: 5% (exists from start)
- merchantLiteracy: 0% (appears when shopCount > 0,
  default 25% on first appearance)
- officialLiteracy: 0% (appears when bureaucracyUnlocked,
  default 50% on first appearance)
- workerLiteracy: 0% (appears when hempLandMu > 0 or
  mulberryLandMu > 0, default 8%)
- landlordLiteracy: 0% (appears when farmlandRentRate > 0,
  default 20%)

Overall literacy:
- overallLiteracy = weighted average of all active classes
  weighted by their population share

Literacy growth per year (per active class):
- Base growth: +0.1%/year for all active classes
- bureaucracyUnlocked: farmerLiteracy += 0.3%/year
- scholarClass (科举雏形): all classes += 0.5%/year
- commerceGDP > 1,000,000: merchantLiteracy += 0.2%/year
- grainSurplus > 0: farmerLiteracy += 0.1%/year
- moneylenderShops > 0: merchantLiteracy += 0.1%/year

Literacy caps without schools:
- farmerLiteracy max: 15%
- merchantLiteracy max: 40%
- officialLiteracy max: 70%
- workerLiteracy max: 20%
- landlordLiteracy max: 35%
(schools will raise these caps in 7A-2)

Literacy effects:
- farmerLiteracy:
  every 5%: farmEfficiency += 0.01 (1% boost)
  max bonus: +5% at 25% literacy
- merchantLiteracy:
  every 10%: commerceGDP multiplier += 0.02
  max bonus: +10% at 50% literacy
- officialLiteracy:
  every 10%: policy execution efficiency += 0.02
  stability penalty reduced by 2% per 10%
- workerLiteracy:
  every 10%: textile output += 2%
- landlordLiteracy:
  every 10%: landReclaimEfficiency += 0.01

Class population tracking:
- farmerPopulation: laborAssignedFarming
- merchantPopulation: merchantCount
- officialPopulation: 0 (defined in later phase)
- workerPopulation: hempLaborRequired +
  mulberryLaborRequired
- landlordPopulation: 0 (defined in later phase)

Education graduate tracking:
- primaryGraduates: 0 (蒙学 cumulative)
- secondaryGraduates: 0 (私塾/县学 cumulative)
- higherGraduates: 0 (书院 cumulative)

Higher school unlock check each year:
- higherSchoolUnlocked = true when:
  secondaryGraduates >= 2000 AND world.year >= 100

State additions needed in world{}:
- farmerLiteracy: 0.05
- merchantLiteracy: 0
- officialLiteracy: 0
- workerLiteracy: 0
- landlordLiteracy: 0
- overallLiteracy: 0.05
- primaryGraduates: 0
- secondaryGraduates: 0
- higherGraduates: 0
- higherSchoolUnlocked: false

**Files to modify:**
- js/state.js
- js/society/population.js (class appearance triggers)
- js/society/satisfaction.js (literacy effects)
- js/economy/agriculture.js (farmer literacy bonus)
- js/economy/commerce.js (merchant literacy bonus)
- js/ui/render_society.js (literacy panel)

**Do NOT touch:** unlocks.js, policies.js,
any economy/market.js, economy/currency.js,
economy/labor.js, diplomacy/xikou.js

**Definition of Done (Phase 7A-1):**
- farmerLiteracy starts at 5% from year 1
- Other class literacy appears when class unlocks
- All literacy rates grow each year per rules
- Literacy caps enforced without schools
- Literacy effects applied to relevant calculations
- overallLiteracy calculated as weighted average
- higherSchoolUnlocked checks each year
- UI shows literacy panel in 社会 tab:
  each class literacy % / overall literacy %
  literacy effects active
- yearLog records when new class literacy appears
- yearLog records higherSchoolUnlocked when triggered
## Phase 7A-2 Scope (Current)

Phase 7A-1 complete. Now implementing 7A-2 only.

**Goal:** Add school construction system. Commercial
schools serve wealthy classes. Government schools
serve all. Schools raise literacy caps and generate
graduates.

**Rules:**

School types and unlock conditions:

Commercial schools (商办，shop upgrade):
- 商办蒙学 (Primary): requires bureaucracyUnlocked
- 商办私塾 (Secondary): requires scholarClass
- Both require government license (like moneylenders)
- License fee: 2,000,000 grain/coupon per school
- Annual tuition per student = GDP per capita * 15%
- Tuition → merchantIncomePool
- Serves: merchant + landlord children only

Government schools (官办):
- 官办蒙学 (Primary): requires bureaucracyUnlocked
- 官办县学 (Secondary): requires scholarClass
- 官办书院 (Higher): requires higherSchoolUnlocked
- Player sets capacity (number of students)
- Annual cost per student = GDP per capita * 20%
  deducted from grainTreasury/couponTreasury
- Serves: all classes

School capacity and enrollment:

Commercial primary (蒙学):
- Each licensed school: 50 students max
- Students drawn from merchant + landlord children
- If merchant/landlord children < capacity: unfilled

Commercial secondary (私塾):
- Each licensed school: 30 students max
- Requires primary graduation first

Government schools:
- Player sets total capacity directly
- Students drawn from all classes proportionally
- Priority: poorest classes first (unless player changes)

Graduation system:
- Primary school: 3 year program
- Secondary school: 4 year program  
- Higher school: 3 year program
- Each year: graduates = enrolled / program length
- primaryGraduates += primary graduates this year
- secondaryGraduates += secondary graduates this year
- higherGraduates += higher graduates this year

Literacy cap increases from schools:
- Each primary school (any type):
  farmerLiteracy cap += 5%
  workerLiteracy cap += 3%
- Each secondary school:
  merchantLiteracy cap += 10%
  officialLiteracy cap += 10%
  landlordLiteracy cap += 8%
- Each higher school:
  all literacy caps += 15%

Literacy growth boost from schools:
- Primary schools: farmerLiteracy += 0.5%/year extra
- Secondary schools: merchantLiteracy += 0.8%/year
  officialLiteracy += 1%/year
- Higher schools: all classes += 1.5%/year

学子下乡 policy:
- Requires: secondaryGraduates >= 100
- Player sets 下乡人数 (number of students sent)
- Annual cost = GDP per capita * 150% * 人数
- Cost → farmerIncomePool (local teachers paid)
- Effect per 100 students sent:
  farmerLiteracy += 1%/year extra
  farmerLiteracy cap += 3%
- Students sent cannot work other jobs
  (deducted from scholarPool)

State additions needed in world{}:
- commercialPrimarySchools: 0
- commercialSecondarySchools: 0
- govPrimaryCapacity: 0
- govSecondaryCapacity: 0
- govHigherCapacity: 0
- primaryEnrolled: 0
- secondaryEnrolled: 0
- higherEnrolled: 0
- schoolLicenseFee: 2000000
- studentsDownToVillage: 0
- annualPrimaryGrads: 0
- annualSecondaryGrads: 0
- annualHigherGrads: 0

**Files to modify:**
- js/state.js
- js/economy/commerce.js (commercial school licensing)
- js/society/population.js (graduation calculation)
- js/society/satisfaction.js (literacy cap updates)
- js/ui/render_society.js (school panels)
- js/game.js (annual school costs + graduation)

**Do NOT touch:** unlocks.js, policies.js,
any economy/market.js economy/currency.js
economy/labor.js diplomacy/xikou.js

**Definition of Done (Phase 7A-2):**
- Commercial school licensing panel appears when
  bureaucracyUnlocked = true
- Government school capacity input always visible
  after bureaucracyUnlocked
- Higher school panel appears when
  higherSchoolUnlocked = true
- Annual graduates calculated and added to totals
- Literacy caps raised correctly by school count
- 学子下乡 policy visible when
  secondaryGraduates >= 100
- School costs deducted each year-advance
- Tuition income flows to merchantIncomePool
- UI shows school panel in 社会 tab:
  each school type: count / enrolled / annual grads
  literacy caps per class
  下乡 policy controls
- yearLog records graduations and 下乡 deployments
## Phase 7A-3 Scope (Current)

Phase 7A-2 complete. Now implementing 7A-3 only.

**Goal:** Literate graduates form a professional talent
pool. Talent pool is the prerequisite for all future
government institutions (police, courts, tax bureau etc).
Talent divided into three types based on education path.

**Rules:**

Talent pool calculation:
- Total literate population per class:
  literatePopulation = classPopulation * classLiteracy

- Talent pool draws from graduates:
  adminTalent (文官人才):
    source: secondaryGraduates + higherGraduates
    growth: += annualSecondaryGrads * 0.4
            += annualHigherGrads * 0.8
    (not all graduates become talent immediately)
    decay: -= adminTalent * 0.02 per year
    (2% retire/leave each year)

  commerceTalent (商业人才):
    source: primaryGraduates + secondaryGraduates
    growth: += annualPrimaryGrads * 0.2
            += annualSecondaryGrads * 0.3
    decay: -= commerceTalent * 0.02 per year

  techTalent (技术人才):
    source: secondaryGraduates + higherGraduates
    growth: += annualSecondaryGrads * 0.2
            += annualHigherGrads * 0.5
    decay: -= techTalent * 0.02 per year

Talent pool effects:
- adminTalent:
  >= 10: can establish basic government offices
  >= 50: policy execution efficiency += 10%
  >= 100: unlock police system (prerequisite met)
  >= 200: unlock court system (prerequisite met)

- commerceTalent:
  >= 10: moneylender efficiency += 5%
  >= 50: commerceGDP multiplier += 5%
  >= 100: unlock trade bureau (prerequisite met)

- techTalent:
  >= 10: tech research speed += 10%
  >= 50: agricultural efficiency += 3%
  >= 100: unlock engineering bureau (prerequisite met)

Talent deployment:
- Player can assign talent to roles
- Assigned talent is removed from pool
- Unassigned talent contributes passive bonuses only
- If institution needs talent but pool empty:
  institution efficiency drops 50%

Talent attraction:
- High merchantSatisfaction (>70):
  commerceTalent growth += 10%
- High officialSatisfaction (>70):
  adminTalent growth += 10%
- Low farmerSatisfaction (<40):
  all talent growth -= 10%
  (social unrest discourages education)

State additions needed in world{}:
- adminTalent: 0
- commerceTalent: 0
- techTalent: 0
- adminTalentDeployed: 0
- commerceTalentDeployed: 0
- techTalentDeployed: 0

**Files to modify:**
- js/state.js
- js/society/population.js (talent calculation)
- js/society/satisfaction.js (talent effects)
- js/economy/commerce.js (commerce talent bonus)
- js/economy/agriculture.js (tech talent bonus)
- js/tech/research.js (tech talent speed bonus)
- js/ui/render_society.js (talent pool panel)

**Do NOT touch:** unlocks.js, policies.js,
any economy/market.js economy/currency.js
economy/labor.js diplomacy/xikou.js

**Definition of Done (Phase 7A-3):**
- Three talent pools calculated each year
- Talent grows from graduates, decays annually
- Talent effects applied to relevant systems
- Institution unlock prerequisites tracked
- UI shows talent panel in 社会 tab:
  adminTalent / commerceTalent / techTalent
  deployed vs available per type
  unlock status for future institutions
- yearLog records when institution prerequisites met
- yearLog records talent milestones (10/50/100/200)
## Phase 7B-0 Scope (Current)

Phase 7A-3 complete. Now implementing 7B-0 only.

**Goal:** Replace event-driven satisfaction with
economic life quality system. Each class has its own
lifeQuality index driven by income, inequality,
prices, and savings rate.

**Rules:**

Life quality index per class (0-100):
- farmerLifeQuality: 0
- merchantLifeQuality: 0
- officialLifeQuality: 0
- landlordLifeQuality: 0

Each replaces corresponding satisfaction index.
farmerSatisfaction = farmerLifeQuality (and so on).

Basic living cost calculation (per person per year):
- grainCost = 360 jin (fixed)
- saltCost = 15 * saltPrice
- clothCost = 0.3 * clothPrice
- totalLivingCost = grainCost + saltCost + clothCost
  (all in grain equivalent)

Per-class income (per person per year):
- farmerIncomePerHead: existing field
- merchantIncomePerHead: existing field
- officialIncomePerHead:
  = annualWageBill / totalOfficials
  (if totalOfficials = 0: use farmerIncomePerHead)
- landlordIncomePerHead:
  = (farmlandRentRate * farmlandAreaMu +
    landlordSatisfaction * 100) / max(landlordPop, 1)

Dimension 1: Income adequacy (30% weight)
- incomeRatio = classIncomePerHead / totalLivingCost
- incomeRatio < 0.8: lifeQuality -= 20
- incomeRatio 0.8-1.0: lifeQuality -= 10
- incomeRatio 1.0-1.5: no change
- incomeRatio 1.5-2.0: lifeQuality += 10
- incomeRatio > 2.0: lifeQuality += 20

Dimension 2: Wealth inequality (25% weight)
- giniRatio = merchantIncomePerHead /
  max(farmerIncomePerHead, 1)
- giniRatio < 2: lifeQuality += 5 (all classes)
- giniRatio 2-5: no change
- giniRatio 5-10:
  farmerLifeQuality -= 10
  merchantLifeQuality += 0 (no bonus)
- giniRatio > 10:
  farmerLifeQuality -= 20
  merchantLifeQuality += 5
  officialLifeQuality -= 5 (social tension)

Dimension 3: Essential goods prices (25% weight)
- saltAffordability = saltPrice / 4.0
- clothAffordability = clothPrice / 2.0
- saltAffordability > 2.0: all lifeQuality -= 25
- saltAffordability > 1.5: all lifeQuality -= 15
- saltAffordability <= 1.0: all lifeQuality += 5
- clothAffordability > 1.5: all lifeQuality -= 10
- clothAffordability <= 1.0: all lifeQuality += 3
- grainSurplus < 0: all lifeQuality -= 20

Dimension 4: Savings rate (20% weight)
Per class savings calculation:
- classIncome = classIncomePerHead * classPopulation
- classExpenditure = totalLivingCost * classPopulation
- classSavings += classIncome - classExpenditure
  (accumulated, can go negative)
- classSavingsRate = (classIncome - classExpenditure)
  / max(classIncome, 1)

Savings rate effects:
- savingsRate >= 0.10: lifeQuality += 15
- savingsRate 0.05-0.10: lifeQuality += 5
- savingsRate 0.00-0.05: no change
- savingsRate < 0: lifeQuality -= 15

Savings pool effects:
- farmerSavings > totalPopulation * 100:
  farmerLifeQuality += 5
- farmerSavings < 0:
  farmerLifeQuality -= 10

Base lifeQuality before dimensions: 50
All dimension adjustments applied on top of base 50.
lifeQuality floored at 0, capped at 100.

lifeQuality replaces satisfaction:
- farmerSatisfaction = farmerLifeQuality
- merchantSatisfaction = merchantLifeQuality
- officialSatisfaction = officialLifeQuality
- landlordSatisfaction = landlordLifeQuality

State additions needed in world{}:
- farmerLifeQuality: 50
- merchantLifeQuality: 50
- officialLifeQuality: 50
- landlordLifeQuality: 50
- farmerSavings: 0
- merchantSavings: 0
- officialSavings: 0
- landlordSavings: 0
- farmerSavingsRate: 0
- merchantSavingsRate: 0
- officialSavingsRate: 0
- landlordSavingsRate: 0
- totalLivingCost: 0
- giniRatio: 0

**Files to modify:**
- js/state.js
- js/society/satisfaction.js (full rewrite of logic)
- js/economy/market.js (living cost calculation)
- js/ui/render_society.js (life quality panel)

**Do NOT touch:** unlocks.js, policies.js,
any economy/agriculture.js economy/commerce.js
economy/currency.js economy/labor.js
diplomacy/xikou.js tech/research.js

**Definition of Done (Phase 7B-0):**
- lifeQuality calculated each year for all classes
- All four dimensions applied correctly
- Savings pools accumulate/deplete each year
- lifeQuality replaces satisfaction indices
- Existing behavior triggers still use satisfaction
  (now driven by lifeQuality values)
- UI shows life quality panel in 社会 tab:
  per class: lifeQuality / savingsRate / savings pool
  giniRatio display
  living cost breakdown
  price pressure indicators
- yearLog records significant lifeQuality changes
## Phase 7B-1 Scope (Current)

Phase 7B-0 complete. Now implementing 7B-1 only.

**Goal:** Add government institution framework.
Add fire leakage (火耗) system affecting tax revenue.
Add civil servant wage system with all job grades.

**Rules:**

Government institution (政府):
- Unlocks when: adminTalent >= 10
- Once unlocked: cannot be dissolved
- Manages all unestablished institutions by default

Civil servant grades and wages:

seniorOfficials (高级官员):
- playerSets: seniorOfficialCount
- defaultWage: gdpPerCapita * 3.0
- playerAdjustable: yes

midOfficials (中级官员):
- playerSets: midOfficialCount
- defaultWage: gdpPerCapita * 1.5
- playerAdjustable: yes

juniorOfficials (基层官员):
- playerSets: juniorOfficialCount
- defaultWage: gdpPerCapita * 0.8
- playerAdjustable: yes

professionals (专业人员):
- count determined by institution size
- defaultWage: gdpPerCapita * 1.2
- playerAdjustable: yes

sanitationWorkers (挑粪工):
- requires: publicToilets >= 1
- playerSets: sanitationWorkerCount
- defaultWage: gdpPerCapita * 0.3
- playerAdjustable: yes

cleaningWorkers (清洁工):
- requires: roadLength >= 1
- playerSets: cleaningWorkerCount
- defaultWage: gdpPerCapita * 0.35
- playerAdjustable: yes

Annual wage bill:
- totalWageBill = sum of all grades × their wages
- paid in grain/coupon per salaryGrainRatio
- flows to officialIncomePool

GDP per capita calculation:
- gdpPerCapita = (agricultureGDP + commerceGDP +
  constructionGDP) / totalPopulation

Fire leakage (火耗) system:
- baseFireLeakageRate: 0.05 (5%)
- range: 0.02 - 0.30

Factors increasing fire leakage:
- juniorOfficialWage < gdpPerCapita * 0.8: +3%
- officialLifeQuality < 50: +2%
- institution efficiency < 60%: +2%
- taxBureauEstablished = false: +3%
- courtEstablished = false: +2%

Factors decreasing fire leakage:
- taxBureauEstablished AND efficiency > 80%: -3%
- courtEstablished AND efficiency > 80%: -2%
- householdRegistryActive: -2%
- seniorOfficialWage >= gdpPerCapita * 3.0: -1%
- adminTalent > 200: -1%

Fire leakage effects:
- actualTaxRevenue = theoreticalTax *
  (1 - fireLeakageRate)
- leaked amount:
  60% → officialIncomePool
  40% → lost permanently
- fireLeakageRate > 15%:
  farmerLifeQuality -= 10
  yearLog: "火耗严重，民间怨声载道"
- fireLeakageRate > 25%:
  farmerLifeQuality -= 20
  stabilityIndex -= 10
  yearLog: "火耗失控，财政大量流失"

Institution efficiency framework:
- Each institution has efficiency 0-100%
- efficiency = talentAdequacy(40%) *
  paperSupply(30%) * staffing(30%)

talentAdequacy:
- required = institutionSize * 2
- actual = adminTalentDeployed to this institution
- ratio = actual / required
- ratio < 0.3: efficiency *= 0
- ratio 0.3-0.6: efficiency *= 0.5
- ratio 0.6-0.9: efficiency *= 0.8
- ratio >= 0.9: efficiency *= 1.0
- ratio > 1.0: efficiency *= 1.1

paperSupply:
- each institution consumes paperOutput % per year
- government: 10% of paperOutput
- if paperOutput = 0: paperSupply = 0.5
  (managing without paper, reduced efficiency)
- supply ratio = available / required
- floors at 0.3 (can always manage somewhat)

staffing:
- required staff = institutionSize * 5
- actual = juniorOfficialCount + midOfficialCount
- ratio = actual / required, capped at 1.0

State additions needed in world{}:
- governmentEstablished: false
- seniorOfficialCount: 0
- midOfficialCount: 0
- juniorOfficialCount: 0
- professionalCount: 0
- sanitationWorkerCount: 0
- cleaningWorkerCount: 0
- seniorOfficialWage: 0
- midOfficialWage: 0
- juniorOfficialWage: 0
- professionalWage: 0
- sanitationWorkerWage: 0
- cleaningWorkerWage: 0
- totalWageBill: 0
- gdpPerCapita: 0
- fireLeakageRate: 0.05
- actualTaxRevenue: 0
- theoreticalTaxRevenue: 0
- governmentEfficiency: 0
- adminTalentDeployedGov: 0
- taxBureauEstablished: false
- courtEstablished: false

**Files to modify:**
- js/state.js
- js/economy/agriculture.js (tax revenue with leakage)
- js/economy/commerce.js (gdpPerCapita calculation)
- js/society/stability.js (institution efficiency)
- js/society/satisfaction.js (wage bill effects)
- js/game.js (annual wage deduction)
- js/ui/render_society.js (institution + wage panels)

**Do NOT touch:** unlocks.js, policies.js,
economy/market.js economy/currency.js
economy/labor.js diplomacy/xikou.js
tech/research.js

**Definition of Done (Phase 7B-1):**
- Government institution appears when adminTalent >= 10
- All civil servant grades configurable in UI
- Wages adjustable per grade
- totalWageBill calculated and deducted each year
- fireLeakageRate calculated from all factors
- actualTaxRevenue = theoreticalTax * (1-leakage)
- Leaked tax flows correctly to officialIncomePool
- Institution efficiency calculated from 3 dimensions
- UI shows government panel in 社会 tab:
  establishment status
  staff counts and wages per grade
  total wage bill
  fire leakage rate and factors
  institution efficiency breakdown
- yearLog records fire leakage warnings
- yearLog records government establishment
## Phase 7B-2 Scope (Current)

Phase 7B-1 complete. Now implementing 7B-2 only.

**Goal:** Add police bureau as first specialized
government institution. Police affect social stability
through officer-to-population ratio.

**Rules:**

Unlock condition:
- adminTalent >= 100
- governmentEstablished = true

Police bureau setup:
- playerSets: policeOfficerCount
- Each officer drawn from adminTalent pool
  (adminTalentDeployed += policeOfficerCount)
- officerWage: playerAdjustable
  default: gdpPerCapita * 1.2
- Annual cost = policeOfficerCount * officerWage
  flows to officialIncomePool

Police-to-population ratio:
- policeRatio = policeOfficerCount / totalPopulation

Ratio effects:
- policeRatio < 1/1000 (extreme shortage):
  stabilityIndex -= 20
  commerceGDP *= 0.9
  yearLog: "治安崩溃，盗贼横行"

- policeRatio 1/1000 - 1/500 (shortage):
  stabilityIndex -= 10
  yearLog: "治安较差，民间纠纷频发"

- policeRatio 1/500 - 1/200 (adequate):
  no penalty or bonus

- policeRatio 1/200 - 1/100 (good):
  stabilityIndex += 5
  merchantLifeQuality += 5
  commerceGDP *= 1.05
  yearLog: "治安良好，商业繁荣"

- policeRatio < 1/100 (excessive):
  stabilityIndex += 3
  farmerLifeQuality -= 10
  yearLog: "警力过剩，民间压迫感强"

Police efficiency:
- policeEfficiency calculated same as government
  talentAdequacy(40%) * paperSupply(30%) *
  staffing(30%)
- Low efficiency reduces all ratio bonuses by 50%
- policeEfficiency < 30%:
  ratio effects reversed (police cause problems)
  yearLog: "警察系统效率低下，执法混乱"

Police paper consumption:
- consumes paperOutput * 8% per year
- if insufficient: policeEfficiency -= 20%

Admin talent deployment:
- policeOfficerCount drawn from adminTalent
- if adminTalent < policeOfficerCount:
  policeEfficiency *= 0.5
  yearLog: "警力人才不足"

State additions needed in world{}:
- policeEstablished: false
- policeOfficerCount: 0
- officerWage: 0
- policeRatio: 0
- policeEfficiency: 0
- adminTalentDeployedPolice: 0

**Files to modify:**
- js/state.js
- js/society/stability.js (police ratio effects)
- js/society/satisfaction.js (life quality effects)
- js/economy/commerce.js (commerce effects)
- js/game.js (annual police costs)
- js/ui/render_society.js (police bureau panel)

**Do NOT touch:** unlocks.js, policies.js,
economy/market.js economy/currency.js
economy/labor.js diplomacy/xikou.js
tech/research.js economy/agriculture.js

**Definition of Done (Phase 7B-2):**
- Police bureau panel appears when conditions met
- Player sets officer count and wage
- policeRatio calculated each year
- All ratio effects applied correctly
- policeEfficiency calculated from 3 dimensions
- Annual costs deducted and flow to officialIncomePool
- adminTalent correctly depleted by police officers
- UI shows police panel in 社会 tab:
  establishment status / officer count / wage
  police ratio with status label
  efficiency breakdown
  active effects this year
- yearLog records establishment and ratio warnings
## Phase 7B-3 Scope (Current)

Phase 7B-2 complete. Now implementing 7B-3 only.

**Goal:** Add public toilet and road construction.
These are prerequisites for sanitation workers
and health bureau. Roads also affect trade and
reclamation efficiency.

**Rules:**

Public toilets (公共厕所):
- Construction cost: 50,000 grain per toilet
- Minimum order: 1
- Cost flows:
  80% → farmerIncomePool (construction workers)
  20% → merchantIncomePool (materials)
- Built immediately (no waiting period)

Toilet coverage:
- toiletCoverage = publicToilets * 100 /
  totalPopulation
  (each toilet serves 100 people)
- toiletCoverage >= 30%:
  farmerLifeQuality += 3
- toiletCoverage >= 50%:
  farmerLifeQuality += 5
  workerLifeQuality += 3
- toiletCoverage >= 80%:
  all lifeQuality += 3
  yearLog: "公共卫生覆盖良好"
- toiletCoverage < 10% AND population > 2000:
  farmerLifeQuality -= 5
  yearLog: "公共厕所严重不足"

Sanitation worker unlock:
- sanitationWorkerCount adjustable when
  publicToilets >= 1
- Each worker maintains 10 toilets effectively
- workerToToiletRatio = sanitationWorkerCount /
  publicToilets
- workerToToiletRatio < 0.1:
  toiletCoverage effects reduced by 50%
  yearLog: "厕所维护人手不足"

Roads (道路):
- Unit: li (里, ~500 meters)
- Construction cost: 10,000 grain per li
- Minimum order: 1 li
- Cost flows:
  70% → farmerIncomePool (labor)
  30% → merchantIncomePool (materials)
- Built immediately

Road effects:
- tradeEfficiency += roadLength * 0.01
  (each li = +1% trade efficiency, max +30%)
- reclaimEfficiency += roadLength * 0.005
  (each li = +0.5% reclaim efficiency, max +15%)
- Every 10 li: attitudeToPlayer += 1
  (better connectivity impresses Xikou)
  max attitude bonus from roads: +10

Cleaning worker unlock:
- cleaningWorkerCount adjustable when
  roadLength >= 1
- Each worker maintains 5 li effectively
- workerToRoadRatio = cleaningWorkerCount /
  roadLength
- workerToRoadRatio < 0.2:
  road trade efficiency bonus reduced by 30%
  yearLog: "道路维护人手不足"

Health bureau prerequisite tracking:
- healthBureauPrereqMet = (publicToilets >= 50 AND
  sanitationWorkerCount >= 5 AND
  cleaningWorkerCount >= 5)
- When first met:
  yearLog: "卫生局建立条件已满足"

State additions needed in world{}:
- publicToilets: 0
- roadLength: 0
- toiletCoverage: 0
- workerToToiletRatio: 0
- workerToRoadRatio: 0
- healthBureauPrereqMet: false

**Files to modify:**
- js/state.js
- js/economy/agriculture.js (reclaim efficiency bonus)
- js/diplomacy/xikou.js (road attitude bonus)
- js/economy/market.js (trade efficiency bonus)
- js/society/satisfaction.js (coverage life quality)
- js/game.js (construction buttons)
- js/ui/render_world.js (infrastructure panel)

**Do NOT touch:** unlocks.js, policies.js,
economy/currency.js economy/labor.js
economy/commerce.js tech/research.js
society/stability.js

**Definition of Done (Phase 7B-3):**
- Build toilet button in UI with cost preview
- Build road button with li amount input
- Both costs deducted immediately on build
- Cost flows correctly to income pools
- toiletCoverage calculated each year
- Coverage effects applied to lifeQuality
- Road effects applied to trade and reclaim
- Xikou attitude bonus from roads
- healthBureauPrereqMet tracked each year
- sanitationWorker and cleaningWorker counts
  become adjustable when prerequisites met
- UI shows infrastructure panel in 总览 tab:
  toilets: count / coverage % / worker ratio
  roads: length / trade bonus / reclaim bonus
  health bureau prereq status
- yearLog records construction and milestone events
## Phase 7B-4 Scope (Current)

Phase 7B-3 complete. Now implementing 7B-4 only.

**Goal:** Add health bureau as specialized institution.
Requires public infrastructure prerequisites.
Affects population death rate and life quality.

**Rules:**

Unlock condition:
- healthBureauPrereqMet = true
  (publicToilets >= 50, sanitationWorkers >= 5,
  cleaningWorkers >= 5)
- governmentEstablished = true

Health bureau setup:
- playerSets: healthOfficerCount
- Each officer drawn from adminTalent pool
- healthOfficerWage: playerAdjustable
  default: gdpPerCapita * 1.2
- Annual cost = healthOfficerCount * healthOfficerWage
  flows to officialIncomePool

Health bureau efficiency:
- Same 3-dimension framework as other institutions
- Paper consumption: paperOutput * 5% per year

Population health index:
- baseHealthIndex: 50
- healthIndex range: 0-100

Factors affecting healthIndex:

Positive:
- healthBureauEstablished: +10
- healthEfficiency > 80%: +10
- toiletCoverage >= 50%: +10
- toiletCoverage >= 80%: +5 additional
- basicMedicineCompleted (tech): +10
- advancedMedicineCompleted (tech): +10
- grainSurplus > 0: +5
- cleaningWorkerCount >= roadLength * 0.2: +5

Negative:
- toiletCoverage < 10%: -15
- grainSurplus < 0: -10
- saltShortfallRatio > 0.3: -5
- healthEfficiency < 30%: -10
- population > 20000 AND healthIndex < 50: -5
  (crowding effect)

Health index effects:
- healthIndex >= 80:
  populationGrowthRate += 0.005
  farmerLifeQuality += 5
  yearLog: "公共卫生优良，人口健康"
- healthIndex 60-79:
  populationGrowthRate += 0.002
  farmerLifeQuality += 2
- healthIndex 40-59:
  no change (baseline)
- healthIndex 20-39:
  populationGrowthRate -= 0.005
  farmerLifeQuality -= 5
  yearLog: "公共卫生堪忧，疾病风险上升"
- healthIndex < 20:
  populationGrowthRate -= 0.01
  farmerLifeQuality -= 15
  all lifeQuality -= 5
  yearLog: "卫生危机，疾病肆虐"

Disease event trigger:
- If healthIndex < 20 for 3 consecutive years:
  diseaseOutbreak = true
  totalPopulation -= totalPopulation * 0.05
  yearLog: "瘟疫爆发，人口骤减5%"
  diseaseOutbreak resets healthIndex check

State additions needed in world{}:
- healthBureauEstablished: false
- healthOfficerCount: 0
- healthOfficerWage: 0
- healthEfficiency: 0
- healthIndex: 50
- adminTalentDeployedHealth: 0
- consecutiveLowHealthYears: 0
- diseaseOutbreak: false

**Files to modify:**
- js/state.js
- js/society/population.js (health growth effects)
- js/society/satisfaction.js (health life quality)
- js/society/stability.js (health stability effects)
- js/game.js (annual health costs + disease check)
- js/ui/render_society.js (health bureau panel)

**Do NOT touch:** unlocks.js, policies.js,
economy/market.js economy/currency.js
economy/labor.js diplomacy/xikou.js
tech/research.js economy/agriculture.js
economy/commerce.js

**Definition of Done (Phase 7B-4):**
- Health bureau panel appears when prereqs met
- Player sets officer count and wage
- healthIndex calculated each year from all factors
- Population growth rate modified by healthIndex
- Disease outbreak triggers after 3 bad years
- healthEfficiency calculated from 3 dimensions
- Annual costs deducted to officialIncomePool
- UI shows health bureau panel in 社会 tab:
  establishment status
  officer count and wage
  healthIndex with color coding:
    80-100: green, 60-79: blue,
    40-59: grey, 20-39: orange, 0-19: red
  active health factors (positive/negative)
  consecutive low health year counter
- yearLog records health milestones and disease
## Phase 7C: Court + Tax Bureau (Current)

Phase 7B-4 complete. Implementing court and tax
bureau together in one phase.

**COURT SYSTEM (法院):**

Unlock conditions:
- adminTalent >= 200
- governmentEstablished = true
- codifiedLawCompleted = true (律法成文 tech)

Court setup:
- playerSets: judgeCount
- judgeWage: playerAdjustable
  default: gdpPerCapita * 2.0
- Annual cost → officialIncomePool
- Paper consumption: paperOutput * 15% per year

Court efficiency:
- Same 3-dimension framework
- Low efficiency = court backlog

Court effects:
- courtEstablished = true:
  fireLeakageRate -= 2% (already in 7B-1)

- courtEfficiency >= 80%:
  merchantLifeQuality += 8
  fireLeakageRate -= 2% additional
  commerceGDP *= 1.05
  creditRating improved by 1 tier
  yearLog: "法院运作良好，商业纠纷大减"

- courtEfficiency 50-79%:
  merchantLifeQuality += 3
  no fire leakage bonus

- courtEfficiency < 30%:
  merchantLifeQuality -= 10
  farmerLifeQuality -= 5
  yearLog: "法院效率低下，民间积案严重"

Civil dispute system:
- disputeRate = 1.0 - courtEfficiency
  (higher efficiency = fewer unresolved disputes)
- disputeRate > 0.5:
  commerceGDP *= 0.95
  merchantSatisfaction -= 10
  yearLog: "商业纠纷频发，影响市场秩序"

Credit rating (信用评级):
- creditRating: A/B/C/D (default: B)
- playerCanAdjust: true (policy panel)
- courtEfficiency >= 80%: max rating = A
- courtEfficiency 50-79%: max rating = B
- courtEfficiency < 50%: max rating = C
- No court: max rating = D
- Rating affects moneylender interest rates:
  A: borrowing rate = 3% coupon / 2% grain
  B: borrowing rate = 5% coupon / 3% grain
  C: borrowing rate = 8% coupon / 5% grain
  D: cannot borrow

**TAX BUREAU (税务局):**

Unlock conditions:
- adminTalent >= 150
- governmentEstablished = true
- householdRegistryActive = true (户籍制度 policy)

Tax bureau setup:
- playerSets: taxOfficerCount
- taxOfficerWage: playerAdjustable
  default: gdpPerCapita * 1.0
- Annual cost → officialIncomePool
- Paper consumption: paperOutput * 20% per year
  (most paper-intensive institution)

Tax bureau efficiency:
- Same 3-dimension framework
- techTalent deployed here also helps:
  techTalentDeployedTax * 0.5 counts toward
  staffing dimension

Tax bureau effects:
- taxBureauEstablished = true:
  fireLeakageRate -= 3% (already in 7B-1)

- taxBureauEfficiency >= 80%:
  actualTaxRevenue *= 1.10 (10% more tax collected)
  fireLeakageRate -= 2% additional
  yearLog: "税务局运作高效，税收大幅提升"

- taxBureauEfficiency 50-79%:
  actualTaxRevenue *= 1.05
  no additional fire leakage reduction

- taxBureauEfficiency < 30%:
  actualTaxRevenue *= 0.90
  yearLog: "税务局效率低下，大量漏税"

Advanced tax policies (unlocked by tax bureau):
All require taxBureauEstablished = true

1. 商业税 (Commerce Tax):
- commerceTaxRate: 0 (default, playerAdjustable 0-30%)
- revenue = commerceGDP * commerceTaxRate
- revenue → couponTreasury/grainTreasury
- commerceTaxRate > 20%:
  merchantLifeQuality -= 15
  commerceGDP *= 0.9
- flows: 100% → government treasury

2. 钱庄税 (Moneylender Tax):
- Already implemented in 6B-2
- Now officially managed by tax bureau
- taxBureauEfficiency bonus applies

3. 土地税 (Land Tax):
- landTaxRate: 0 (default, playerAdjustable 0-5%)
- revenue = farmlandAreaMu * landTaxRate
- separate from farmlandRentRate
- landTaxRate > 3%:
  farmerLifeQuality -= 10
  landlordLifeQuality -= 15

State additions needed in world{}:
- courtEstablished: false
- judgeCount: 0
- judgeWage: 0
- courtEfficiency: 0
- disputeRate: 0
- adminTalentDeployedCourt: 0
- taxBureauEstablished: false
- taxOfficerCount: 0
- taxOfficerWage: 0
- taxBureauEfficiency: 0
- adminTalentDeployedTax: 0
- techTalentDeployedTax: 0
- commerceTaxRate: 0
- landTaxRate: 0
- commerceTaxRevenue: 0
- landTaxRevenue: 0

**Files to modify:**
- js/state.js
- js/society/stability.js (court + tax efficiency)
- js/society/satisfaction.js (life quality effects)
- js/economy/commerce.js (commerce tax + court)
- js/economy/agriculture.js (land tax)
- js/economy/currency.js (credit rating effects)
- js/game.js (annual costs for both institutions)
- js/ui/render_society.js (court + tax panels)

**Do NOT touch:** unlocks.js, policies.js,
economy/market.js economy/labor.js
diplomacy/xikou.js tech/research.js
ui/render_economy.js ui/render_world.js
ui/render_diplomacy.js ui/render_tech.js

**Definition of Done (Phase 7C):**
- Court panel appears when conditions met
- Tax bureau panel appears when conditions met
- Both institutions have efficiency calculation
- Court affects credit rating and dispute rate
- Tax bureau affects fire leakage and tax revenue
- Commerce tax and land tax adjustable in UI
- Credit rating affects moneylender rates
- Annual costs deducted for both institutions
- UI shows both panels in 社会 tab:
  court: judge count / wage / efficiency /
    dispute rate / credit rating
  tax bureau: officer count / wage / efficiency /
    commerce tax rate / land tax rate /
    total tax revenue breakdown
- yearLog records establishment and efficiency warnings
## Phase 7D: Trade Bureau + Engineering Bureau (Current)

Phase 7C complete. Implementing trade bureau and
engineering bureau together.

**TRADE BUREAU (贸易管理局):**

Unlock conditions:
- commerceTalent >= 100
- governmentEstablished = true
- longDistanceTradeCompleted = true (远途贸易 tech)

Trade bureau setup:
- playerSets: tradeOfficerCount
- tradeOfficerWage: playerAdjustable
  default: gdpPerCapita * 1.3
- Annual cost → officialIncomePool
- Paper consumption: paperOutput * 12% per year

Trade bureau efficiency:
- Same 3-dimension framework
- commerceTalent deployed here counts double
  toward talent dimension

Trade bureau effects:
- tradeBureauEstablished = true:
  tradeEfficiency += 0.10 (base bonus)

- tradeBureauEfficiency >= 80%:
  tradeEfficiency += 0.15 additional
  saltImportQuota max += 20%
  clothImportQuota max += 20%
  attitudeToPlayer += 2 per year
  yearLog: "贸易局运作高效，对外贸易繁荣"

- tradeBureauEfficiency 50-79%:
  tradeEfficiency += 0.05
  no import quota bonus

- tradeBureauEfficiency < 30%:
  tradeEfficiency -= 0.05
  yearLog: "贸易局效率低下，贸易受阻"

New trade policies (requires tradeBureauEstablished):

1. 贸易保护 (Trade Protection):
- protectLocalCloth: boolean (default false)
- If true: cloth import quota capped at 30%
  of local production
- localClothProducers benefit:
  merchantLifeQuality += 5
- Xikou attitude penalty:
  attitudeToPlayer -= 5 per year
  yearLog: "贸易保护政策影响溪口村关系"

2. 贸易补贴 (Trade Subsidy):
- subsidyRate: 0 (playerAdjustable 0-20%)
- Government pays subsidyRate% of import costs
- Cost → grainTreasury/couponTreasury
- Effect: attitudeToPlayer += 3 per year
- merchantLifeQuality += 5

3. 专营权 (Trade Monopoly):
- playerCanGrantMonopoly: boolean
- One merchant family controls specific trade
- Revenue += 20% for that trade type
- Other merchantLifeQuality -= 10
  (monopoly hurts competition)

New trade partners (远途贸易 unlocks):
- After tradeBureauEstablished:
  newTradePartnerUnlocked = true
- New partner: 北方商队 (Northern Traders)
  Available goods: horses, iron, furs
  Payment: grain or coupons
  Attitude not tracked (anonymous traders)
  Each trade: random price variation ±20%

**ENGINEERING BUREAU (工程局):**

Unlock conditions:
- techTalent >= 100
- governmentEstablished = true
- watermillCompleted = true (水车磨坊 tech)

Engineering bureau setup:
- playerSets: engineerCount
- engineerWage: playerAdjustable
  default: gdpPerCapita * 1.5
- Annual cost → officialIncomePool
- Paper consumption: paperOutput * 8% per year

Engineering bureau efficiency:
- Same 3-dimension framework
- techTalent deployed here counts double
  toward talent dimension

Engineering bureau effects:
- engineeringBureauEstablished = true:
  constructionCostReduction += 0.05

- engineeringBureauEfficiency >= 80%:
  constructionCostReduction += 0.10 additional
  reclaimEfficiency += 0.10
  roadConstructionCost *= 0.8
  toiletConstructionCost *= 0.8
  yearLog: "工程局运作高效，建设成本大幅降低"

- engineeringBureauEfficiency 50-79%:
  constructionCostReduction += 0.05
  reclaimEfficiency += 0.05

- engineeringBureauEfficiency < 30%:
  constructionCostReduction = 0
  yearLog: "工程局效率低下，建设无法提速"

Engineering projects (requires engineeringBureauEstablished):

1. 水渠工程 (Irrigation Canal):
- cost: 5,000,000 grain per canal
- builds: irrigationCanalCount += 1
- effect: each canal irrigates 5000 mu
  irrigated farmland: grainYieldPerMu += 50
  max canals: farmlandAreaMu / 5000
- construction time: 2 years
- cost flows:
  70% → farmerIncomePool
  30% → merchantIncomePool

2. 城墙加固 (Wall Reinforcement):
- cost: 8,000,000 grain
- one-time construction
- effect: defenseRating += 0.3
  stabilityIndex += 5
  yearLog: "城墙加固完成，防御力大幅提升"
- cost flows:
  60% → farmerIncomePool
  40% → merchantIncomePool

3. 粮仓扩建 (Granary Expansion):
- cost: 2,000,000 grain per expansion
- effect: grainStorageCapacity += 10,000,000
  (grain treasury cap raised)
- default grainStorageCapacity: 50,000,000
- without expansion: grainTreasury capped
- cost flows:
  80% → farmerIncomePool
  20% → merchantIncomePool

State additions needed in world{}:
- tradeBureauEstablished: false
- tradeOfficerCount: 0
- tradeOfficerWage: 0
- tradeBureauEfficiency: 0
- commerceTalentDeployedTrade: 0
- protectLocalCloth: false
- subsidyRate: 0
- tradeMonopolyGranted: false
- newTradePartnerUnlocked: false
- engineeringBureauEstablished: false
- engineerCount: 0
- engineerWage: 0
- engineeringBureauEfficiency: 0
- techTalentDeployedEngineering: 0
- irrigationCanalCount: 0
- pendingIrrigationCanals: 0
- irrigationCanalYear: 0
- wallReinforced: false
- grainStorageCapacity: 50000000
- grainStorageExpansions: 0

**Files to modify:**
- js/state.js
- js/economy/commerce.js (trade bureau effects)
- js/economy/agriculture.js (engineering effects)
- js/economy/market.js (trade efficiency bonus)
- js/diplomacy/xikou.js (trade policy effects)
- js/society/stability.js (wall + engineering)
- js/game.js (annual costs + canal construction)
- js/ui/render_society.js (bureau panels)
- js/ui/render_economy.js (trade policies)

**Do NOT touch:** unlocks.js, policies.js,
economy/currency.js economy/labor.js
tech/research.js ui/render_world.js
ui/render_diplomacy.js ui/render_tech.js

**Definition of Done (Phase 7D):**
- Trade bureau panel appears when conditions met
- Engineering bureau panel appears when conditions met
- Both efficiency systems working correctly
- Trade policies visible when bureau established
- Northern traders available after unlock
- Engineering projects available when bureau established
- Irrigation canal takes 2 years to complete
- Grain storage capacity enforced as hard cap
- Wall reinforcement one-time construction
- Annual costs deducted for both bureaus
- UI shows both panels in 社会 tab:
  trade bureau: officer count / efficiency /
    trade policies / northern traders
  engineering bureau: engineer count / efficiency /
    active projects / construction cost reduction
- yearLog records all major events
## Bugfix: Reality Correction v1 (Current)

Phase 7D complete. Fixing 8 confirmed logic errors
before continuing new features.

**NO new features. Fix existing logic only.**

---

**BUG 1: Grain coupon double accounting (currency.js)**

Current wrong logic:
- issueGrainCoupons() requires issueAmount <= grainTreasury
- Then does grainTreasury += issueAmount (WRONG)
- And couponCirculating += issueAmount

Correct logic:
- Issuing coupons means farmers hand over grain
- grainTreasury += issueAmount (grain flows IN)
- couponCirculating += issueAmount (coupons flow OUT)
- BUT: grainTreasury must already have capacity
- The grain farmers give up comes FROM farmers,
  not from existing treasury
- Correct: grainTreasury += issueAmount
  (this is correct, farmers trade grain for coupons)
- But backing ratio must use LOCKED grain:
  lockedGrainReserve += issueAmount
  (separate from free grainTreasury)
  backingRatio = lockedGrainReserve / couponCirculating
- Free grainTreasury is NOT backing, it is operational

Add new state field: lockedGrainReserve: 0
Coupon redemption: lockedGrainReserve -= redeemed
backingRatio = lockedGrainReserve / couponCirculating

---

**BUG 2: Satisfaction overwritten by lifeQuality
(agriculture.js + satisfaction.js)**

Current wrong logic:
- agriculture.js calculates satisfaction modifiers
- satisfaction.js then sets:
  world.farmerSatisfaction = world.farmerLifeQuality
  (overwrites all previous modifications)

Correct logic:
- lifeQuality is the BASE (economic foundation)
- satisfaction = lifeQuality + event modifiers
- agriculture.js should NOT set satisfaction directly
- satisfaction.js should be the ONLY place that
  sets final satisfaction values
- Formula:
  farmerSatisfaction = farmerLifeQuality +
    farmerEventModifier (capped 0-100)
- farmerEventModifier resets to 0 each year
  then accumulates event-based changes

Add new state fields:
- farmerEventModifier: 0
- merchantEventModifier: 0
- officialEventModifier: 0
- landlordEventModifier: 0

All event-based satisfaction changes go to
eventModifier fields, not directly to satisfaction.
Final satisfaction calculated once in satisfaction.js.

---

**BUG 3: Paper supply always 100% (all institution files)**

Current wrong logic:
- requiredPaper = paperOutput * share
- supply = paperOutput / requiredPaper = always 1.0
- This means paper is never scarce

Correct logic:
- paperDemand per institution based on staff count:
  government: seniorOfficialCount * 50 +
    midOfficialCount * 30 + juniorOfficialCount * 10
  police: policeOfficerCount * 20
  court: judgeCount * 100 (most paper intensive)
  taxBureau: taxOfficerCount * 80
  tradeBureau: tradeOfficerCount * 40
  engineeringBureau: engineerCount * 30
  healthBureau: healthOfficerCount * 20

- totalPaperDemand = sum of all institution demands
- paperSupplyRatio = paperOutput / totalPaperDemand
  (capped at 1.0)
- If paperOutput = 0: paperSupplyRatio = 0.3
  (managing with no paper at all)
- Each institution gets its share of available paper:
  institutionPaperRatio = institutionDemand /
    totalPaperDemand * paperSupplyRatio

---

**BUG 4: Government borrowing doesn't reduce
lending pool (commerce.js)**

Current wrong logic:
- borrowGovernmentDebt() increases grainTreasury
- lendingPoolSize stays the same
- No crowding out of civilian lending

Correct logic:
- lendingPoolAvailable = lendingPoolSize -
  governmentDebt - civilianLendingAccumulator
- Government can only borrow up to lendingPoolAvailable
- After government borrows:
  lendingPoolAvailable -= borrowAmount
- Civilian auto-lending uses remaining available pool:
  civilianLending = lendingPoolAvailable * 0.3
- This creates real crowding out effect

Add new state field: lendingPoolAvailable: 0

---

**BUG 5: Landlord income uses satisfaction as input
(satisfaction.js)**

Current wrong logic:
landlordIncomePerHead = farmlandRentRate *
  farmlandAreaMu + landlordSatisfaction * 100

Correct logic:
landlordIncomePerHead = (farmlandRentRate *
  farmlandAreaMu) / max(landlordPopulation, 1)
(pure economic calculation, no circular dependency)

---

**BUG 6: Irrigation canal timestamp overwritten
(game.js)**

Current wrong logic:
- All canals share single irrigationCanalYear
- New canal order overwrites previous completion date

Correct logic:
- Replace irrigationCanalYear with array:
  pendingCanals: [] 
  each entry: { startYear, finishYear, muCount }
- Each year-advance: check all pendingCanals
  if finishYear <= world.year:
    farmlandAreaMu += muCount
    remove from pendingCanals
- Remove single irrigationCanalYear field

---

**BUG 7: Population growth floor prevents famine
death (population.js)**

Current wrong logic:
- growthRate = Math.max(0.005, calculatedRate)
- Population always grows at least 0.5%

Correct logic:
- Remove Math.max(0.005, ...) floor
- Allow negative growth:
  grainSurplus < -totalPopulation * 100:
    growthRate -= 0.02 (famine, serious decline)
  grainSurplus < -totalPopulation * 50:
    growthRate -= 0.01 (food stress)
  healthIndex < 20: growthRate -= 0.01
  stabilityIndex < 30: growthRate -= 0.005
- growthRate can go negative (population shrinks)
- Absolute floor: -0.05 (max 5% annual decline)

---

**BUG 8: Graduate accumulation never decays
(population.js)**

Current wrong logic:
- primaryGraduates, secondaryGraduates,
  higherGraduates only increase
- Talent pools: adminTalent *= 0.98 (arbitrary decay)

Correct logic:
- Annual graduate cohort (not cumulative total):
  annualPrimaryGrads: already tracked
  annualSecondaryGrads: already tracked
  annualHigherGrads: already tracked

- Cumulative totals get annual decay:
  primaryGraduates *= 0.97 (3% age out per year)
  secondaryGraduates *= 0.97
  higherGraduates *= 0.97
  then += this year's new graduates

- Talent pools use same decay logic:
  adminTalent *= 0.97 (not 0.98, consistent)
  commerceTalent *= 0.97
  techTalent *= 0.97

- scholarPool = literatePopulation * 0.1
  (derived from living literate population,
  not from cumulative graduates)

---

**Files to modify:**
- js/state.js (new fields)
- js/economy/currency.js (bug 1)
- js/society/satisfaction.js (bug 2, 5)
- js/economy/agriculture.js (bug 2 cleanup)
- js/society/stability.js (bug 3)
- js/economy/commerce.js (bug 4)
- js/game.js (bug 6)
- js/society/population.js (bug 7, 8)

**Do NOT touch:** unlocks.js, policies.js,
any ui/ files, diplomacy/xikou.js,
economy/market.js, economy/labor.js,
tech/research.js

**Definition of Done:**
- backingRatio uses lockedGrainReserve not grainTreasury
- satisfaction = lifeQuality + eventModifier
- Paper demand based on staff count not paperOutput share
- Government borrowing reduces lendingPoolAvailable
- Landlord income has no circular dependency
- Irrigation canals use array not single timestamp
- Population can shrink during famine/crisis
- Graduate pools decay 3% annually
## Bugfix v2: Core Logic Corrections (Current)

Bugfix v1 complete. Now fixing 3 remaining critical
logic errors. No new features. No UI changes.

---

**FIX 1: Grain coupon accounting (currency.js)**

Current problem:
- Issuing coupons increases both grainTreasury
  AND lockedGrainReserve simultaneously
- Two different accounting models mixed together

Correct model (choose ONE, implement consistently):
Use "government issues coupons backed by existing
grain treasury" model:

issueGrainCoupons(amount):
- Check: grainTreasury >= amount (has backing grain)
- grainTreasury -= amount (grain moved to reserve)
- lockedGrainReserve += amount (now backing coupons)
- couponCirculating += amount (coupons enter market)
- couponTotalIssued += amount
- couponTreasury unchanged (this is govt held coupons)

maxIssuable = grainTreasury (free grain only)
backingRatio = lockedGrainReserve / couponCirculating

Coupon redemption (when player redeems):
- couponCirculating -= amount
- lockedGrainReserve -= amount
- grainTreasury += amount (grain returns to free)

This is clean: grain either free or locked, never both.

---

**FIX 2: Paper supply ratio formula (stability.js)**

Current problem:
- institutionPaperPercent = (demand/total) * supplyRatio
- When supply is sufficient, institution gets 50%
  instead of 100% (wrong)

Correct formula:

Step 1: Calculate total paper demand
totalPaperDemand = sum of all institution demands

Step 2: Calculate overall supply ratio
paperSupplyRatio = min(1.0, paperOutput /
  max(totalPaperDemand, 1))

Step 3: Each institution gets same supply ratio
institutionPaperPercent = paperSupplyRatio * 100

Simple rule: if total paper is sufficient for all,
every institution gets 100%. If scarce, everyone
gets proportionally less (paperSupplyRatio < 1).

Example:
- totalDemand = 1000, paperOutput = 1000
- paperSupplyRatio = 1.0
- ALL institutions get 100% paper supply

Example 2:
- totalDemand = 1000, paperOutput = 500
- paperSupplyRatio = 0.5
- ALL institutions get 50% paper supply

---

**FIX 3: Satisfaction unified end-of-year calculation
(game.js + satisfaction.js)**

Current problem:
- Multiple systems write directly to satisfaction
  at different points in year loop
- Police, court, trade policy write lifeQuality/
  satisfaction directly, not through eventModifier
- eventModifier cleared at wrong time

Correct year-end flow:

In game.js nextYear() function, enforce this order:
1. world.year += 1
2. clearEventModifiers() — reset all eventModifiers to 0
3. updateEconomy() — grain, commerce, market prices
4. updateLabor() — labor allocation
5. updatePopulation() — births, deaths
6. updateResearch() — tech progress
7. updateXikou() — diplomacy
8. applyPolicies() — policy effects → eventModifier only
9. applyInstitutionEffects() — police/court/health
   → eventModifier only, NOT lifeQuality directly
10. calculateLifeQuality() — 4 dimensions → lifeQuality
11. calculateClassSatisfaction() — satisfaction =
    lifeQuality + eventModifier (FINAL, called ONCE)
12. checkUnlocks() — check new unlocks
13. updateYearLog() — record events

Rules for all systems:
- Short-term policy shocks → eventModifier
- Long-term economic changes → lifeQuality dimensions
- NO system except calculateClassSatisfaction()
  may write directly to farmerSatisfaction /
  merchantSatisfaction / officialSatisfaction /
  landlordSatisfaction
- NO system except calculateLifeQuality() may write
  directly to farmerLifeQuality / merchantLifeQuality /
  officialLifeQuality / landlordLifeQuality

Refactor these functions to use eventModifier:
- applyPoliceLifeQualityEffects()
- applyCourtTaxLifeQualityEffects()
- applyTradePolicySettings()
- applyBureaucracyPolicies()
- applyStabilityPolicies()

All of the above must write to eventModifier fields
only, not directly to lifeQuality or satisfaction.

**Files to modify:**
- js/economy/currency.js (fix 1)
- js/society/stability.js (fix 2)
- js/game.js (fix 3: enforce year-end order)
- js/society/satisfaction.js (fix 3: final calc only)
- js/economy/commerce.js (fix 3: use eventModifier)
- js/society/stability.js (fix 3: use eventModifier)

**Do NOT touch:** unlocks.js, policies.js,
any ui/ files, diplomacy/xikou.js,
economy/market.js economy/labor.js
economy/agriculture.js tech/research.js
state.js

**Definition of Done (Bugfix v2):**
- Coupon issuance moves grain from free to locked
- backingRatio = lockedGrainReserve / couponCirculating
- Paper supply ratio same for all institutions
- All satisfaction written only in calculateClassSatisfaction
- All lifeQuality written only in calculateLifeQuality
- eventModifier cleared at year start
- Year-end order strictly enforced in nextYear()
- No direct writes to satisfaction/lifeQuality
  anywhere except designated functions
## Bugfix v3: Lending + Education Cohort (Current)

Bugfix v2 complete. Now fixing 2 remaining issues.
Split into two parts, lending first.

---

**PART A: Split civilian lending (commerce.js)**

Current problem:
- civilianLendingAccumulator used for both:
  1. Tracking investment progress toward new shop
  2. Reducing lendingPoolAvailable
- When shop opens, accumulator resets
- This makes lendingPool "refill" after shop opens
- Not realistic: loans don't disappear when shop opens

Correct model:

Two separate variables:
- civilianLoanOutstanding: total unpaid civilian loans
  (reduces lendingPoolAvailable permanently until repaid)
- civilianInvestmentProgress: cumulative investment
  toward next shop (never resets lendingPool)

Civilian lending each year:
- availableForCivilian = lendingPoolAvailable * 0.3
- newCivilianLoan = availableForCivilian
- civilianLoanOutstanding += newCivilianLoan
- civilianInvestmentProgress += newCivilianLoan
- lendingPoolAvailable -= newCivilianLoan

Shop opening:
- When civilianInvestmentProgress >= 50,000,000:
  shopCount += 1
  civilianInvestmentProgress -= 50,000,000
  (progress resets but loan stays outstanding)

Loan repayment (each year):
- annualRepayment = civilianLoanOutstanding * 0.1
  (10% repaid per year automatically)
- civilianLoanOutstanding -= annualRepayment
- lendingPoolAvailable += annualRepayment
  (repaid loans return to pool)

Interest income:
- civilianInterest = civilianLoanOutstanding * 0.08
- 50% → merchantIncomePool
- 50% → couponTreasury

lendingPoolAvailable recalculated each year:
- lendingPoolAvailable = lendingPoolSize
  - governmentDebt
  - civilianLoanOutstanding

State changes:
- REMOVE: civilianLendingAccumulator
- ADD: civilianLoanOutstanding: 0
- ADD: civilianInvestmentProgress: 0

---

**PART B: Education cohort model (population.js)**

Current problem:
- primaryGraduates/secondaryGraduates/higherGraduates
  are cumulative totals
- Secondary eligibility = primaryGraduates * 0.4
  (same graduates re-eligible every year)
- People never age out of eligibility

Correct cohort model:

Each year produces a graduate cohort:
- primaryCohort this year = annualPrimaryGrads
- secondaryCohort this year = annualSecondaryGrads
- higherCohort this year = annualHigherGrads

Eligibility pool (people who CAN enroll):
- secondaryEligiblePool: people who graduated
  primary but haven't enrolled in secondary yet
- higherEligiblePool: people who graduated
  secondary but haven't enrolled in higher yet

Each year:
- secondaryEligiblePool += annualPrimaryGrads
- secondaryEligiblePool -= newSecondaryEnrollment
- secondaryEligiblePool *= 0.95
  (5% age out / give up each year)

- higherEligiblePool += annualSecondaryGrads
- higherEligiblePool -= newHigherEnrollment
- higherEligiblePool *= 0.95

Enrollment capped by eligible pool:
- actualSecondaryEnrollment = min(
    govSecondaryCapacity + commercialSecondaryCapacity,
    secondaryEligiblePool)
- actualHigherEnrollment = min(
    govHigherCapacity,
    higherEligiblePool)

Cumulative totals still tracked but with decay:
- primaryGraduates += annualPrimaryGrads
- primaryGraduates *= 0.97 (already implemented)
- Same for secondary and higher

higherSchoolUnlock check:
- secondaryGraduates >= 2000 AND world.year >= 100
  (unchanged, uses cumulative total)

scholarPool derived from living graduates:
- scholarPool = higherGraduates * 0.4
  (unchanged logic, but now higherGraduates decays
  so pool naturally shrinks without new graduates)

State additions needed in world{}:
- secondaryEligiblePool: 0
- higherEligiblePool: 0
- REMOVE: no fields removed, only additions

**Files to modify:**
- js/economy/commerce.js (Part A)
- js/society/population.js (Part B)
- js/state.js (state field changes)

**Do NOT touch:** unlocks.js, policies.js,
any ui/ files, diplomacy/xikou.js,
economy/market.js economy/labor.js
economy/agriculture.js economy/currency.js
tech/research.js society/satisfaction.js
society/stability.js game.js

**Definition of Done (Bugfix v3):**
- civilianLoanOutstanding separate from
  civilianInvestmentProgress
- Loan repayment returns liquidity to pool
- lendingPoolAvailable correctly reflects
  all outstanding loans
- Shop opening doesn't reset loan outstanding
- secondaryEligiblePool tracks unmatriculated
  primary graduates
- higherEligiblePool tracks unmatriculated
  secondary graduates
- Enrollment capped by eligible pool size
- Eligible pools decay 5% annually
- yearLog records pool sizes and enrollment
## Phase 8F: Save System (Current)

Phase 7D and all bugfixes complete.
Now adding localStorage save system.

**Goal:** Player can save, load, export, and import
game state. Auto-save every year. Reset option.

**Rules:**

Save key: 'brooksTwoSave'

Functions needed in new file js/save.js:

saveGame(state):
- JSON.stringify(state)
- localStorage.setItem('brooksTwoSave', serialized)
- show save confirmation in UI

loadGame():
- const raw = localStorage.getItem('brooksTwoSave')
- if null: return null
- return JSON.parse(raw)

exportSave(state):
- create JSON blob
- trigger download as 'brooks-two-save.json'

importSave(file):
- read uploaded JSON file
- validate it has state.world and state.research
- if valid: load into game state
- if invalid: show error message

resetGame():
- confirm dialog: "确认重置游戏？所有进度将丢失"
- if confirmed: localStorage.removeItem('brooksTwoSave')
- reload page

Auto-save:
- call saveGame(state) at end of every nextYear()
- show "自动保存" indicator briefly in UI

On game load:
- check localStorage for existing save
- if found: show "发现存档，是否继续？" prompt
- yes: loadGame() and restore state
- no: start fresh

UI additions (fixed header area):
- 💾 Save button
- 📂 Load button  
- 📤 Export button
- 📥 Import button (file input)
- 🔄 Reset button (with confirm)
- "自动保存 ✓" indicator (shows briefly after each year)

**New file:** js/save.js
**Files to modify:**
- index.html (import save.js, add save UI buttons)
- js/game.js (call saveGame at end of nextYear)
- js/render.js (add save buttons to header)

**Do NOT touch:** any economy/ society/ diplomacy/
tech/ ui/ files, state.js, unlocks.js, policies.js

**Definition of Done (Phase 8F):**
- Save button works and shows confirmation
- Load button restores previous save
- Export downloads valid JSON file
- Import accepts JSON file and restores state
- Reset clears save and restarts
- Auto-save happens every year-advance
- On page load: detect and offer to restore save
- All buttons visible in header
- 自动保存 indicator appears briefly after save
## Phase 8B: Constants (Current)

Phase 8F complete. Now extracting all magic numbers
into a central constants file.

**Goal:** All hardcoded numbers moved to
js/config/constants.js. No logic changes.

**New file:** js/config/constants.js

Constants to extract:

Population:
- INITIAL_POPULATION: 5000
- INITIAL_LABOR_FORCE: 3000
- INITIAL_CHILDREN: 1000
- INITIAL_ELDERLY: 1000
- BASE_GROWTH_RATE: 0.02
- MIN_GROWTH_RATE: -0.05
- MAX_GROWTH_RATE: 0.05
- LABOR_RATIO: 0.6
- CHILDREN_RATIO: 0.2
- ELDERLY_RATIO: 0.2

Agriculture:
- INITIAL_FARMLAND_MU: 30000
- BASE_GRAIN_YIELD_PER_MU: 500
- MAX_GRAIN_YIELD_PER_MU: 800
- LABOR_PER_MU: 10
- GRAIN_CONSUMPTION_PER_PERSON: 360
- FARMLAND_RECLAIM_COST_PER_MU: 500
- HEMP_RECLAIM_COST_PER_MU: 800
- MULBERRY_RECLAIM_COST_PER_MU: 1500
- MULBERRY_MATURATION_YEARS: 2
- MIN_RECLAIM_MU: 1000
- MIN_FIBER_RECLAIM_MU: 100

Market:
- SALT_BASE_PRICE: 4.0
- CLOTH_BASE_PRICE: 2.0
- SALT_CONSUMPTION_PER_PERSON: 15
- CLOTH_CONSUMPTION_PER_PERSON: 0.3
- SALT_PRICE_MIN: 1.0
- SALT_PRICE_MAX: 10.0
- CLOTH_PRICE_MIN: 0.8
- CLOTH_PRICE_MAX: 5.0

Commerce:
- SHOP_COST: 1500000
- SHOP_GDP_PER_UNIT: 500
- SHOP_LABOR_PER_UNIT: 5
- MERCHANT_POP_INIT_LITERACY: 0.25
- MONEYLENDER_LICENSE_FEE: 5000000
- MONEYLENDER_DEFAULT_TAX: 0.01

Currency:
- COUPON_GRAIN_RATIO: 1.0
- INFLATION_THRESHOLD_LOW: 0.7
- INFLATION_THRESHOLD_MID: 0.4
- INFLATION_RATE_LOW: 0.05
- INFLATION_RATE_MID: 0.15
- INFLATION_RATE_HIGH: 0.30

Society:
- BASE_STABILITY: 80
- STABILITY_MIN: 0
- STABILITY_MAX: 100
- BASE_LIFE_QUALITY: 50
- FARMER_INIT_LITERACY: 0.05
- OFFICIAL_INIT_LITERACY: 0.5
- WORKER_INIT_LITERACY: 0.08
- LANDLORD_INIT_LITERACY: 0.2

Institutions:
- POLICE_RATIO_CRITICAL: 0.001
- POLICE_RATIO_LOW: 0.002
- POLICE_RATIO_GOOD: 0.005
- POLICE_RATIO_HIGH: 0.01
- PUBLIC_TOILET_COST: 50000
- ROAD_COST_PER_LI: 10000
- PEOPLE_PER_TOILET: 100
- HEALTH_BUREAU_TOILET_MIN: 50
- HEALTH_BUREAU_SANITATION_MIN: 5
- HEALTH_BUREAU_CLEANING_MIN: 5

Diplomacy (Xikou):
- XIKOU_INIT_POPULATION: 3000
- XIKOU_INIT_LABOR: 1800
- XIKOU_FARMLAND_MU: 3000
- XIKOU_SALT_OUTPUT: 200000
- XIKOU_MULBERRY_MU: 1200
- XIKOU_HEMP_MU: 800
- ENVOY_COST: 500000
- SALT_TRADE_RATIO: 0.5
- CLOTH_TRADE_RATIO: 0.3

Education:
- PRIMARY_PROGRAM_YEARS: 3
- SECONDARY_PROGRAM_YEARS: 4
- HIGHER_PROGRAM_YEARS: 3
- SCHOOL_LICENSE_FEE: 2000000
- HIGHER_SCHOOL_GRAD_MIN: 2000
- HIGHER_SCHOOL_YEAR_MIN: 100
- GRADUATE_DECAY_RATE: 0.97
- ELIGIBLE_POOL_DECAY: 0.95

Tech costs:
- TECH_BASIC_FARMING: 200000
- TECH_INTENSIVE_FARMING: 500000
- TECH_CROP_ROTATION: 800000
- TECH_IRRIGATION: 1000000
- TECH_FOLK_TRADE: 100000
- TECH_CONTRACT_LAW: 400000
- TECH_WEIGHTS_MEASURES: 300000
- TECH_WRITTEN_RECORDS: 300000
- TECH_PAPERMAKING: 500000
- TECH_CODIFIED_LAW: 400000
- TECH_HERBALISM: 200000
- TECH_BASIC_MEDICINE: 600000
- TECH_MILITIA: 300000
- TECH_WEAPON_FORGING: 500000
- TECH_SELECTIVE_BREEDING: 1200000
- TECH_WATERMILL: 1500000
- TECH_MONEYLENDER: 2000000
- TECH_LONG_DISTANCE_TRADE: 2500000
- TECH_IMPERIAL_EXAM: 3000000
- TECH_ADVANCED_MEDICINE: 2000000
- TECH_FORTIFICATION: 2500000
- TECH_INTELLIGENCE: 1500000

**Implementation rules:**
- Create js/config/constants.js with all above
- Replace hardcoded values in all JS files with
  constant references
- Use UPPER_SNAKE_CASE for all constants
- Group constants by system with comments
- Do NOT change any logic, only replace numbers

**Files to modify:**
- js/config/constants.js (new file)
- js/state.js
- js/economy/agriculture.js
- js/economy/commerce.js
- js/economy/market.js
- js/economy/currency.js
- js/economy/labor.js
- js/society/population.js
- js/society/satisfaction.js
- js/society/stability.js
- js/diplomacy/xikou.js
- js/tech/research.js
- index.html (add script tag for constants.js)

**Do NOT touch:** unlocks.js, policies.js,
any ui/ files, game.js, render.js, save.js

**Definition of Done (Phase 8B):**
- All magic numbers replaced with named constants
- constants.js loads before all other modules
- No logic changes anywhere
- Game runs identically after refactor
- Easy to find and change any number in future
## Phase 8E: 100-Year Stress Test (Current)

Phase 8A/8B/8F complete. Now adding automated
simulation test to catch numeric instability.

**Goal:** Run 100 years of simulation in Node.js
without browser. Detect NaN, negative values,
out-of-range values, and runaway growth.

**New file:** test/simulate100years.js

**Test approach:**
- Import core logic modules (no UI, no render)
- Create initial state via createGameState()
- Run nextYear() 100 times
- After each year, check invariants
- Report any violations with year number

**Invariants to check each year:**

Population:
- world.totalPopulation > 0
- world.totalPopulation < 10000000 (no runaway)
- world.laborForce >= 0
- world.children >= 0
- world.elderly >= 0
- !isNaN(world.totalPopulation)

Grain:
- !isNaN(world.grainTreasury)
- world.grainTreasury >= 0
- world.grainTreasury < 1000000000 (no runaway)
- !isNaN(world.actualGrainOutput)
- world.actualGrainOutput >= 0

Currency:
- !isNaN(world.couponCirculating)
- world.couponCirculating >= 0
- !isNaN(world.lockedGrainReserve)
- world.lockedGrainReserve >= 0
- world.backingRatio >= 0
- !isNaN(world.inflationRate)

Satisfaction / Life Quality:
- world.farmerLifeQuality >= 0
- world.farmerLifeQuality <= 100
- world.merchantLifeQuality >= 0
- world.merchantLifeQuality <= 100
- world.officialLifeQuality >= 0
- world.officialLifeQuality <= 100
- !isNaN(world.farmerLifeQuality)
- !isNaN(world.merchantLifeQuality)

Stability:
- world.stabilityIndex >= 0
- world.stabilityIndex <= 100
- !isNaN(world.stabilityIndex)

Market prices:
- world.saltPrice >= 1.0
- world.saltPrice <= 10.0
- world.clothPrice >= 0.8
- world.clothPrice <= 5.0
- !isNaN(world.saltPrice)
- !isNaN(world.clothPrice)

Literacy:
- world.farmerLiteracy >= 0
- world.farmerLiteracy <= 1.0
- !isNaN(world.farmerLiteracy)

**Test output format:**
- Year X: PASS (all invariants met)
- Year X: FAIL - [field] = [value] ([reason])
- Final summary: X/100 years passed

**Test scenarios:**

Scenario 1: Default (no player actions)
- Just run nextYear() 100 times
- No policies, no buildings, no tech

Scenario 2: Basic development
- Year 1: build bank (set bankBuilt = true)
- Year 3: recruit clerks
- Year 5: research anti-counterfeit
- Year 7: issue grain coupons
- Year 10: build 5 shops
- Then run to year 100

Scenario 3: Stress test (extreme values)
- Set grainTreasury = 0 (famine)
- Set stabilityIndex = 10 (crisis)
- Run 20 years and check survival

**New file:** test/simulate100years.js

This is a Node.js script, not browser code.
It must use require() or dynamic import() to
load game modules.

Since modules use ES module syntax, use:
- type: "module" in a test package.json
- Or convert imports to work with Node

**Also create:** test/package.json
{
  "type": "module",
  "scripts": {
    "test": "node simulate100years.js"
  }
}

**Files to create:**
- test/simulate100years.js
- test/package.json

**Do NOT modify any existing files.**

**Definition of Done (Phase 8E):**
- test/simulate100years.js runs with node
- All 3 scenarios tested
- Clear pass/fail output per year
- Summary at end showing total pass rate
- Any NaN or out-of-range values clearly reported
## Phase 8C: Account Ledger (Current)

Phase 8E complete. Now adding annual account ledger.
Every grain/coupon flow recorded. No logic changes,
only add tracking layer on top of existing flows.

**Goal:** Complete annual income/expense tracking
for government and civilian accounts.
Player can see exactly where every jin came from
and went to each year.

**Rules:**

New state object: state.ledger
Resets to zero at start of each year-advance.

Government ledger (国库账本):
- taxRevenue: 0 (agricultural tax collected)
- rentRevenue: 0 (farmland rent collected)
- commerceTaxRevenue: 0 (commerce tax)
- landTaxRevenue: 0 (land tax)
- moneylenderTaxRevenue: 0 (moneylender tax)
- couponTaxRevenue: 0 (coupon-denominated taxes)
- tradeRevenue: 0 (export/trade income)
- debtBorrowed: 0 (new government borrowing)
- totalIncome: sum of above

- wageBill: 0 (all civil servant wages)
- researchCost: 0 (tech research spending)
- constructionCost: 0 (roads, toilets, buildings)
- educationCost: 0 (government school costs)
- importCost: 0 (salt, cloth, dung imports)
- subsidyCost: 0 (trade subsidies, salt subsidy)
- debtRepayment: 0 (debt paid back)
- debtInterest: 0 (interest on government debt)
- totalExpense: sum of above

- netBalance: totalIncome - totalExpense
  (positive = surplus, negative = deficit)

Civilian ledger (民间账本):
- farmerGrossIncome: 0 (grain留成 + income pool)
- farmerTaxPaid: 0 (tax + rent paid)
- farmerNetIncome: farmerGross - farmerTaxPaid
- farmerConsumption: 0 (salt + cloth spending)
- farmerSavingsChange: 0 (net change in savings)

- merchantGrossIncome: 0 (commerce GDP share)
- merchantTaxPaid: 0 (commerce tax paid)
- merchantNetIncome: merchantGross - merchantTaxPaid
- merchantConsumption: 0
- merchantSavingsChange: 0

- officialGrossIncome: 0 (wages received)
- officialNetIncome: 0 (after personal expenses)
- officialSavingsChange: 0

Flow tracking:
Every existing function that moves grain/coupon
must add to ledger:

updateAgriculture() →
  ledger.taxRevenue += tax collected
  ledger.farmerGrossIncome += farmer留成

updateCommerce() →
  ledger.commerceTaxRevenue += commerce tax
  ledger.merchantGrossIncome += merchant income

updateMarket() →
  ledger.importCost += salt/cloth imports paid
  ledger.farmerConsumption += salt/cloth farmer spending
  ledger.merchantConsumption += merchant spending

updateLabor() / wage payment →
  ledger.wageBill += total wages paid
  ledger.officialGrossIncome += wages received

updateResearch() →
  ledger.researchCost += research spending

construction buttons →
  ledger.constructionCost += building costs

education costs →
  ledger.educationCost += school costs

debt functions →
  ledger.debtBorrowed += new loans
  ledger.debtRepayment += repayments
  ledger.debtInterest += interest paid

All ledger fields updated in real-time as
transactions happen during year-advance.

At year end:
  ledger.totalIncome = sum of income fields
  ledger.totalExpense = sum of expense fields
  ledger.netBalance = totalIncome - totalExpense

Historical ledger:
  ledgerHistory: [] (array of past years)
  At end of each year: push copy of ledger to history
  Keep last 10 years only
  ledgerHistory[0] = most recent completed year

State additions:
- state.ledger = { all fields above, initialized to 0 }
- state.ledgerHistory = []

**Files to modify:**
- js/state.js (add ledger + ledgerHistory)
- js/economy/agriculture.js (track tax + farmer income)
- js/economy/commerce.js (track commerce tax +
  merchant income + debt)
- js/economy/market.js (track import costs +
  consumption)
- js/economy/currency.js (track coupon operations)
- js/society/stability.js (track policy costs)
- js/tech/research.js (track research costs)
- js/game.js (reset ledger yearly, push to history,
  track construction costs)
- js/ui/render_economy.js (add ledger panel)

**Do NOT touch:** unlocks.js, policies.js,
any society/ diplomacy/ files,
ui/render_world.js ui/render_society.js
ui/render_diplomacy.js ui/render_tech.js

**Definition of Done (Phase 8C):**
- ledger resets to 0 at start of each year
- All major transactions recorded in ledger
- totalIncome / totalExpense / netBalance calculated
- ledgerHistory keeps last 10 years
- UI shows ledger panel in 货币 tab:
  Government account:
    Income breakdown (tax/rent/commerce/land/trade)
    Expense breakdown (wages/research/construction/
    education/imports/subsidies/debt)
    Net balance with color (green=surplus, red=deficit)
  Civilian account:
    Farmer: gross/tax/net/consumption/savings change
    Merchant: gross/tax/net/consumption/savings change
    Official: gross/net/savings change
  Last 10 years net balance history (simple list)
- yearLog records surplus/deficit each year
## Phase 8D-1: State Refactor - Population + Calendar (Current)

Phase 8C complete. Now refactoring state.world into
organized sub-objects. Doing in small batches.
Batch 1: population and calendar only.

**Goal:** Extract population and calendar fields from
state.world into state.population and state.calendar.
Update all references across all files.

**New structure:**

state.calendar = {
  year: 1
}

state.population = {
  totalPopulation: 5000,
  laborForce: 3000,
  children: 1000,
  elderly: 1000,
  laborAssignedFarming: 0,
  laborAssignedCommerce: 0,
  laborIdle: 0,
  merchantCount: 0,
  hempLaborRequired: 0,
  mulberryLaborRequired: 0,
  sanitationWorkerCount: 0,
  cleaningWorkerCount: 0,
  farmerLiteracy: 0.05,
  merchantLiteracy: 0,
  officialLiteracy: 0,
  workerLiteracy: 0,
  landlordLiteracy: 0,
  overallLiteracy: 0.05,
  primaryGraduates: 0,
  secondaryGraduates: 0,
  higherGraduates: 0,
  annualPrimaryGrads: 0,
  annualSecondaryGrads: 0,
  annualHigherGrads: 0,
  secondaryEligiblePool: 0,
  higherEligiblePool: 0,
  higherSchoolUnlocked: false,
  adminTalent: 0,
  commerceTalent: 0,
  techTalent: 0,
  adminTalentDeployed: 0,
  commerceTalentDeployed: 0,
  techTalentDeployed: 0,
  scholarPool: 0
}

**Migration rules:**
- state.world.year → state.calendar.year
- state.world.totalPopulation →
  state.population.totalPopulation
- (and so on for all fields listed above)

**Keep state.world for all other fields not listed
above. Do not touch them yet.**

**Backward compatibility:**
Add getter properties to state.world so existing
code that hasn't been updated still works:
Object.defineProperty(state.world, 'year', {
  get: () => state.calendar.year,
  set: (v) => { state.calendar.year = v }
})
(Do this for all migrated fields)

This allows gradual migration without breaking
anything.

**Files to modify:**
- js/state.js (restructure)
- js/society/population.js (update references)
- js/economy/labor.js (update references)
- js/ui/render_world.js (update references)
- js/game.js (update references)

**Do NOT touch:** any other files

**Definition of Done (Phase 8D-1):**
- state.calendar and state.population exist
- All fields correctly moved
- Backward compatibility getters in state.world
- Game runs identically after refactor
- No references to old paths broken
## Phase 8D-2: State Refactor - Agriculture + Land (Current)

Phase 8D-1 complete. Now extracting agriculture
and land fields from state.world.

**New structure:**

state.land = {
  farmlandAreaMu: 30000,
  hempLandMu: 0,
  mulberryLandMu: 0,
  pendingFarmlandMu: 0,
  pendingHempLandMu: 0,
  pendingMulberryLandMu: 0,
  mulberryMaturationYear: 0,
  reclaimedThisYear: 0,
  publicToilets: 0,
  roadLength: 0,
  toiletCoverage: 0,
  irrigationCanalCount: 0,
  pendingCanals: [],
  wallReinforced: false,
  grainStorageCapacity: 50000000,
  grainStorageExpansions: 0
}

state.agriculture = {
  grainYieldPerMu: 500,
  baseGrainYieldPerMu: 500,
  grainTreasury: 15000000,
  actualGrainOutput: 0,
  potentialGrainOutput: 0,
  lostGrainOutput: 0,
  farmEfficiency: 1.0,
  landUtilizationPercent: 100,
  agriculturalTaxRate: 0.7,
  farmlandRentRate: 0,
  grainAnnualDemand: 0,
  grainSurplus: 0,
  fertilizerBonus: 1.0,
  dungCoverage: 0,
  totalDung: 0,
  playerSilkwormDung: 0,
  importedDung: 0,
  dungImportQuota: 0,
  constructionCostReduction: 0,
  buildingFiberReserve: 0,
  structuralBonus: false,
  laborEfficiency: 1.0,
  paperMaterialReserve: 0,
  paperOutput: 0,
  coarseClothOutput: 0,
  fineClothOutput: 0,
  rawSilkOutput: 0,
  totalClothOutput: 0
}

**Migration rules:**
- state.world.farmlandAreaMu → state.land.farmlandAreaMu
- state.world.grainTreasury → state.agriculture.grainTreasury
- (and so on for all fields listed above)

**Keep backward compatibility getters in state.world
for all migrated fields.**

**Files to modify:**
- js/state.js
- js/economy/agriculture.js
- js/economy/labor.js
- js/ui/render_world.js
- js/ui/render_economy.js
- js/game.js

**Do NOT touch:** any other files

**Definition of Done (Phase 8D-2):**
- state.land and state.agriculture exist
- All fields correctly moved
- Backward compatibility getters maintained
- Game runs identically after refactor
## Phase 8D-3: State Refactor - Fiscal + Monetary (Current)

Phase 8D-2 complete. Now extracting fiscal and
monetary fields from state.world.

**New structure:**

state.fiscal = {
  agriculturalTaxRate: 0.7,
  taxGrainRatio: 1.0,
  salaryGrainRatio: 1.0,
  farmlandRentRate: 0,
  landTaxRate: 0,
  commerceTaxRate: 0,
  moneylenderTaxRate: 0.01,
  fireLeakageRate: 0.05,
  actualTaxRevenue: 0,
  theoreticalTaxRevenue: 0,
  gdpPerCapita: 0,
  totalWageBill: 0,
  seniorOfficialWage: 0,
  midOfficialWage: 0,
  juniorOfficialWage: 0,
  professionalWage: 0,
  sanitationWorkerWage: 0,
  cleaningWorkerWage: 0,
  officerWage: 0,
  judgeWage: 0,
  taxOfficerWage: 0,
  tradeOfficerWage: 0,
  engineerWage: 0,
  healthOfficerWage: 0,
  subsidyRate: 0,
  annualRepayment: 0
}

state.monetary = {
  couponTreasury: 0,
  couponCirculating: 0,
  couponTotalIssued: 0,
  lockedGrainReserve: 0,
  backingRatio: 1.0,
  inflationRate: 0,
  supplyRatio: 1.0,
  creditCrisis: false,
  creditCrisisResolved: false,
  creditRating: 'B',
  governmentDebt: 0,
  governmentDebtInterest: 0,
  lendingPoolSize: 0,
  lendingPoolAvailable: 0,
  civilianLoanOutstanding: 0,
  civilianInvestmentProgress: 0,
  moneylenderShops: 0,
  approvedMoneylenders: 0,
  licenseFee: 5000000,
  moneylenderGDP: 0,
  saltPrice: 4.0,
  clothPrice: 2.0,
  saltReserve: 0,
  clothReserve: 0,
  saltAnnualSupply: 0,
  saltAnnualDemand: 0,
  clothAnnualSupply: 0,
  clothAnnualDemand: 0,
  saltImportQuota: 0,
  actualSaltImport: 0,
  saltConsumed: 0,
  saltShortfallRatio: 0,
  officialSaltPrice: 0,
  officialSaltAmount: 0,
  officialSaltSaleUsed: false,
  clothImportQuota: 0,
  localClothRatio: 0,
  blendedClothPrice: 2.0,
  purchasingPower: 100,
  totalLivingCost: 0,
  giniRatio: 0
}

**Migration rules:**
- state.world.agriculturalTaxRate →
  state.fiscal.agriculturalTaxRate
- state.world.couponCirculating →
  state.monetary.couponCirculating
- (and so on for all fields listed above)

**Keep backward compatibility getters in state.world
for all migrated fields.**

**Files to modify:**
- js/state.js
- js/economy/currency.js
- js/economy/market.js
- js/economy/commerce.js
- js/society/stability.js
- js/ui/render_economy.js
- js/game.js

**Do NOT touch:** any other files

**Definition of Done (Phase 8D-3):**
- state.fiscal and state.monetary exist
- All fields correctly moved
- Backward compatibility getters maintained
- Game runs identically after refactor
## Phase 8D-4: State Refactor - Classes + Education
+ Institutions (Current)

Phase 8D-3 complete. Final batch of state refactor.

**New structure:**

state.classes = {
  farmerLifeQuality: 50,
  merchantLifeQuality: 50,
  officialLifeQuality: 50,
  landlordLifeQuality: 50,
  farmerSatisfaction: 50,
  merchantSatisfaction: 50,
  officialSatisfaction: 50,
  landlordSatisfaction: 50,
  farmerEventModifier: 0,
  merchantEventModifier: 0,
  officialEventModifier: 0,
  landlordEventModifier: 0,
  farmerSavings: 0,
  merchantSavings: 0,
  officialSavings: 0,
  landlordSavings: 0,
  farmerSavingsRate: 0,
  merchantSavingsRate: 0,
  officialSavingsRate: 0,
  landlordSavingsRate: 0,
  farmerIncomePerHead: 0,
  merchantIncomePerHead: 0,
  officialIncomePerHead: 0,
  landlordIncomePerHead: 0,
  farmerIncomePool: 0,
  merchantIncomePool: 0,
  officialIncomePool: 0,
  incomeGap: 0,
  stabilityIndex: 80,
  stabilityPenalty: 0,
  efficiencyMultiplier: 1.0
}

state.education = {
  commercialPrimarySchools: 0,
  commercialSecondarySchools: 0,
  govPrimaryCapacity: 0,
  govSecondaryCapacity: 0,
  govHigherCapacity: 0,
  primaryEnrolled: 0,
  secondaryEnrolled: 0,
  higherEnrolled: 0,
  schoolLicenseFee: 2000000,
  studentsDownToVillage: 0,
  adminTalentDeployedGov: 0,
  adminTalentDeployedPolice: 0,
  adminTalentDeployedCourt: 0,
  adminTalentDeployedTax: 0,
  commerceTalentDeployedTrade: 0,
  techTalentDeployedEngineering: 0,
  techTalentDeployedTax: 0
}

state.institutions = {
  governmentEstablished: false,
  seniorOfficialCount: 0,
  midOfficialCount: 0,
  juniorOfficialCount: 0,
  professionalCount: 0,
  governmentEfficiency: 0,
  policeEstablished: false,
  policeOfficerCount: 0,
  policeRatio: 0,
  policeEfficiency: 0,
  healthBureauEstablished: false,
  healthOfficerCount: 0,
  healthEfficiency: 0,
  healthIndex: 50,
  consecutiveLowHealthYears: 0,
  diseaseOutbreak: false,
  courtEstablished: false,
  judgeCount: 0,
  courtEfficiency: 0,
  disputeRate: 0,
  taxBureauEstablished: false,
  taxOfficerCount: 0,
  taxBureauEfficiency: 0,
  tradeBureauEstablished: false,
  tradeOfficerCount: 0,
  tradeBureauEfficiency: 0,
  protectLocalCloth: false,
  tradeMonopolyGranted: false,
  newTradePartnerUnlocked: false,
  engineeringBureauEstablished: false,
  engineerCount: 0,
  engineeringBureauEfficiency: 0,
  irrigationCanalCount: 0,
  healthBureauPrereqMet: false,
  defenseRating: 0,
  bureaucracyUnlocked: false
}

**Migration rules:**
- state.world.farmerLifeQuality →
  state.classes.farmerLifeQuality
- state.world.governmentEstablished →
  state.institutions.governmentEstablished
- state.world.govPrimaryCapacity →
  state.education.govPrimaryCapacity
- (and so on for all fields listed above)

**Keep backward compatibility getters in state.world
for all migrated fields.**

**Files to modify:**
- js/state.js
- js/society/satisfaction.js
- js/society/stability.js
- js/society/population.js
- js/society/stability.js
- js/ui/render_society.js
- js/game.js

**Do NOT touch:** any other files

**Definition of Done (Phase 8D-4):**
- state.classes, state.education and
  state.institutions exist
- All fields correctly moved
- Backward compatibility getters maintained
- Game runs identically after refactor
- state.world now only contains fields not
  yet migrated (xikou, research, ledger, logs)
## Bugfix v4: Units + Price + Police (Current)

Fixing 3 confirmed logic bugs. No new features.

---

**FIX 1: Grain price direction reversed (market.js)**

Current wrong logic:
- supplyRatio < 1 (shortage): price = supplyRatio
  (e.g. ratio=0.3 means price=0.3, CHEAPER when scarce)
- supplyRatio > 2 (surplus): price = 1.2
  (MORE expensive when abundant)
- This is completely backwards

Correct logic:
- Shortage → price rises
- Surplus → price falls

New grain price formula:
if (supplyRatio >= 1.5) grainPrice *= 0.85
  (abundant supply, price falls)
else if (supplyRatio >= 1.0) grainPrice unchanged
  (balanced, stable price)
else if (supplyRatio >= 0.7) grainPrice *= 1.3
  (mild shortage, price rises)
else if (supplyRatio >= 0.4) grainPrice *= 1.8
  (serious shortage, price rises sharply)
else grainPrice *= 2.5
  (severe shortage, price spikes)

Price change capped at 40% per year max.
grainPrice range: 0.5 - 5.0

Also fix salt and cloth price direction if same
bug exists in their formulas.

---

**FIX 2: Grain consumption unit unification
(constants.js + all files)**

Current problem:
- constants.js: GRAIN_CONSUMPTION_PER_PERSON = 360
- market.js: uses totalPopulation * 2 (wrong, = 2jin)
- xikou.js: uses population * 2 (wrong)
- satisfaction.js: uses grainDemandPerPerson = 400

All must use single standard:
GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR = 360

Changes needed:
- constants.js: add GRAIN_COMFORT_RESERVE =
  GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR * 2
  (2 years reserve = comfortable)
- market.js: replace all population * 2 with
  population * CONSTANTS.GRAIN_CONSUMPTION_PER_PERSON
- xikou.js: replace population * 2 with same
- satisfaction.js: replace grainDemandPerPerson = 400
  with CONSTANTS.GRAIN_CONSUMPTION_PER_PERSON
- Any other file using population * 2 for grain
  demand must be updated

---

**FIX 3: Police efficiency sign reversal bug
(stability.js)**

Current wrong logic:
- When policeEfficiency < 30:
  effects.stabilityDelta = -ratioEffects.stabilityDelta
  (negates the effect, turning -20 into +20)
- This means critically inefficient police
  IMPROVES stability, which is wrong

Correct logic:
- Low efficiency should amplify negative effects
  and reduce positive effects, never invert them

New logic:
if (policeEfficiency < 30):
  positiveEffects *= 0.2 (almost no benefit)
  negativeEffects *= 1.5 (worse than no police)
  yearLog: "警察系统效率极低，执法混乱加剧不稳"
else if (policeEfficiency < 50):
  positiveEffects *= 0.6
  negativeEffects *= 1.2

Never negate/invert the sign of any effect.

**Files to modify:**
- js/config/constants.js (fix 2)
- js/economy/market.js (fix 1 + fix 2)
- js/diplomacy/xikou.js (fix 2)
- js/society/satisfaction.js (fix 2)
- js/society/stability.js (fix 3)

**Do NOT touch:** any ui/ files, unlocks.js,
policies.js, game.js, state.js,
any economy/ files except market.js

**Definition of Done (Bugfix v4):**
- Grain shortage causes price to rise
- Grain surplus causes price to fall
- All grain consumption uses 360 jin/person/year
- No more population * 2 for grain demand
- Police low efficiency amplifies negatives
- Police effects never sign-inverted
- yearLog records price changes and police warnings
## Phase 9A: Private Sector + Shop Labor + Unemployment
(Current)

Bugfix v4 complete. Now implementing three related
systems together.

---

**PART A: Private sector asset table**

New state object: state.privateSector
Resets civilian income each year but accumulates
savings.

state.privateSector = {
  farmerGrain: 0,
  farmerCoupons: 0,
  merchantCoupons: 0,
  merchantGoods: 0,
  totalPrivateGrain: 0,
  totalPrivateCoupons: 0
}

Initial values:
- farmerGrain = farmingLaborAllocated *
  (10 * GRAIN_YIELD_PER_MU * (1 - agriculturalTaxRate))
  = 3000 * 1500 = 4,500,000 jin
- farmerCoupons = 0 (before coupon unlock)
- merchantCoupons = 0
- merchantGoods = 0

Annual update:
farmerGrain += farmingLaborAllocated *
  10 * grainYieldPerMu * (1 - agriculturalTaxRate)
farmerGrain -= farmingLaborAllocated *
  GRAIN_CONSUMPTION_PER_PERSON (360)
farmerGrain -= farmerGrain * saltPrice * 15
  (salt spending)
farmerGrain = max(0, farmerGrain)

merchantGoods += commerceGDP * 0.5
  (merchants hold half their GDP as goods)
merchantGoods -= merchantGoods * 0.3
  (goods consumed/sold each year)

Coupon issuance reform:
OLD (wrong):
  grainTreasury -= issueAmount
  lockedGrainReserve += issueAmount
  couponCirculating += issueAmount

NEW (correct):
  Government buys grain from farmers with coupons:
  privateSector.farmerGrain -= issueAmount
  privateSector.farmerCoupons += issueAmount
  state.agriculture.grainTreasury += issueAmount
  state.monetary.lockedGrainReserve += issueAmount
  state.monetary.couponCirculating += issueAmount

  Cannot issue if farmerGrain < issueAmount
  maxIssuable = privateSector.farmerGrain

---

**PART B: Shop labor and operation unification**

Current problem:
- Commerce labor = shopCount * 5
- Operating shops = min(shopCount, merchantCount)
- Idle shops still consume labor

Correct model:
1 operating shop requires:
  1 merchant (manager)
  4 workers (from idle labor pool)

operatingShops = min(
  shopCount,
  merchantCount,
  floor(availableCommerceLabor / 4)
)
commerceLaborDemand = operatingShops * 4
idleShops = shopCount - operatingShops
commerceGDP = operatingShops * SHOP_GDP_PER_UNIT
  * demandSaturation * commerceActivityBonus

availableCommerceLabor = laborForce
  - farmingLaborAllocated
  - hempLaborRequired
  - mulberryLaborRequired
  - institutionWorkers
  - merchantCount
  (merchants are managers, not workers)

---

**PART C: Unemployment system**

Farming labor locked at 10 mu per person:
farmingLaborAllocated = floor(farmlandAreaMu / 10)
Cannot exceed laborForce.

Unemployment calculation:
institutionWorkers = seniorOfficialCount +
  midOfficialCount + juniorOfficialCount +
  policeOfficerCount + judgeCount +
  taxOfficerCount + tradeOfficerCount +
  engineerCount + healthOfficerCount +
  sanitationWorkerCount + cleaningWorkerCount

unemployed = laborForce
  - farmingLaborAllocated
  - commerceLaborDemand
  - merchantCount
  - hempLaborRequired
  - mulberryLaborRequired
  - institutionWorkers
unemployed = max(0, unemployed)

unemploymentRate = unemployed / laborForce

Unemployment effects:
- unemploymentRate < 0.05:
  no effect
- unemploymentRate 0.05-0.15:
  farmerLifeQuality -= 5
  yearLog: "失业率上升，民间压力增大"
- unemploymentRate 0.15-0.30:
  farmerLifeQuality -= 15
  stabilityIndex -= 5
  yearLog: "失业问题严重，社会不稳"
- unemploymentRate > 0.30:
  farmerLifeQuality -= 25
  stabilityIndex -= 15
  yearLog: "大规模失业，社会动荡"

Unemployment relief options (player actions):
- Reclaim farmland: absorbs 1 worker per 10 mu
- Build shops: absorbs 4 workers per shop
- Build roads/toilets: temporary absorption
  roadConstruction absorbs workers proportional
  to road length ordered

State additions:
- state.privateSector (new object)
- world.unemployed: 0
- world.unemploymentRate: 0
- world.institutionWorkers: 0

**Files to modify:**
- js/state.js (add privateSector + new fields)
- js/economy/agriculture.js (farming labor locked)
- js/economy/commerce.js (shop labor unified)
- js/economy/currency.js (coupon issuance reform)
- js/economy/labor.js (unemployment calculation)
- js/society/satisfaction.js (unemployment effects)
- js/ui/render_world.js (unemployment display)
- js/ui/render_economy.js (private sector panel)

**Do NOT touch:** unlocks.js, policies.js,
any society/stability.js society/population.js
diplomacy/xikou.js tech/research.js
ui/render_society.js ui/render_tech.js
ui/render_diplomacy.js

**Definition of Done (Phase 9A):**
- privateSector tracks farmer and merchant assets
- farmerGrain initialized correctly
- Coupon issuance draws from farmerGrain
- Cannot issue more coupons than farmerGrain
- operatingShops limited by merchants AND labor
- Idle shops produce no GDP and use no labor
- unemployed calculated correctly each year
- Unemployment effects applied to lifeQuality
- UI shows private sector panel in 货币 tab:
  farmerGrain / farmerCoupons / merchantGoods
- UI shows unemployment in 总览 tab:
  unemployed count / unemployment rate / status
- yearLog records unemployment warnings
## Phase 9B-1: GDP Recalculation (Current)

Phase 9A complete. Now fixing GDP double-counting.
No new features. Logic correction only.

**Goal:** GDP only counts value-added production.
Transfer payments, taxes, subsidies, imports
do NOT count as GDP.

**Correct GDP formula (production method):**

agricultureGDP:
- grainGDP = actualGrainOutput * grainPrice
- clothGDP = totalClothOutput * blendedClothPrice
- silkGDP = rawSilkOutput * 3.0
  (silk worth 3x cloth price)
- agricultureGDP = grainGDP + clothGDP + silkGDP

commerceGDP:
- = operatingShops * SHOP_GDP_PER_UNIT
  * demandSaturation * commerceActivityBonus
  * (1 + techBonuses.tradeEfficiency)
- moneylenderGDP counted separately:
  moneylenderGDP = moneylenderShops * SHOP_GDP_PER_UNIT
  + civilianLoanOutstanding * 0.08
- totalCommerceGDP = commerceGDP + moneylenderGDP

constructionGDP:
- Only NEW construction counts
- = constructionSpendingThisYear * 0.7
  (70% is labor value-added, 30% is materials)
- constructionSpendingThisYear resets each year
- Includes: farmland reclamation, roads, toilets,
  buildings, canals

governmentGDP:
- = totalWageBill * 0.8
  (government services valued at 80% of wage cost)
- Does NOT include: subsidies, debt, transfers

totalGDP = agricultureGDP + totalCommerceGDP
  + constructionGDP + governmentGDP

NOT counted as GDP:
- Tax revenue (transfer payment)
- Subsidies (transfer payment)
- Import spending (foreign production)
- Debt borrowing (liability)
- Coupon issuance (monetary operation)
- Wage payments to officials (already in governmentGDP)

New state fields in world{}:
- grainGDP: 0
- clothGDP: 0
- constructionGDP: 0
- governmentGDP: 0
- constructionSpendingThisYear: 0
  (resets each year, accumulates during year)

constructionSpendingThisYear accumulates from:
- farmland reclamation cost
- hemp/mulberry reclamation cost
- road construction cost
- toilet construction cost
- canal construction cost
- shop construction cost
- school construction cost

**Files to modify:**
- js/state.js (new fields)
- js/economy/agriculture.js (agricultureGDP)
- js/economy/commerce.js (commerceGDP)
- js/society/stability.js (governmentGDP)
- js/game.js (constructionSpending tracking,
  reset each year)
- js/ui/render_economy.js (GDP breakdown panel)

**Do NOT touch:** unlocks.js, policies.js,
any society/ diplomacy/ ui/render_society.js
ui/render_world.js ui/render_tech.js
ui/render_diplomacy.js

**Definition of Done (Phase 9B-1):**
- agricultureGDP includes grain + cloth + silk
- commerceGDP only counts operating shops
- constructionGDP = 70% of new construction spending
- governmentGDP = 80% of wage bill
- No transfer payments counted as GDP
- constructionSpendingThisYear tracked and reset
- UI shows GDP breakdown in 经济 tab:
  agriculture / commerce / construction / government
  total GDP
- yearLog records GDP components each year
## Phase 9B-2: Population Age Cohort Model (Current)

Phase 9B-1 complete. Now replacing fixed ratio
population with real age cohort model.

**Age groups and grain consumption:**

infantPop (幼儿 0-3): grainDemand = 240/year
childPop (儿童 4-12): grainDemand = 300/year
teenPop (青少年 13-18): grainDemand = 400/year
youthPop (青年 19-25): grainDemand = 400/year
primeAdultPop (壮年 26-40): grainDemand = 400/year
middleAgePop (中年 41-55): grainDemand = 400/year
elderlyPop (老年 55+): grainDemand = 360/year

**Initial population distribution (total 5000):**
- infantPop: 500 (10%)
- childPop: 750 (15%)
- teenPop: 500 (10%)
- youthPop: 750 (15%)
- primeAdultPop: 1250 (25%)
- middleAgePop: 750 (15%)
- elderlyPop: 500 (10%)

**Effective labor force:**
effectiveLaborForce =
  teenPop * 0.5 +
  youthPop * 1.0 +
  primeAdultPop * 1.0 +
  middleAgePop * 0.8

laborForce = floor(effectiveLaborForce)

**Annual cohort transitions:**
Each year, fraction of each group ages up:

infantPop:
  aging = infantPop / 4 (4 year group)
  infantPop -= aging
  childPop += aging

childPop:
  aging = childPop / 9 (9 year group)
  childPop -= aging
  teenPop += aging

teenPop:
  aging = teenPop / 6 (6 year group)
  teenPop -= aging
  youthPop += aging

youthPop:
  aging = youthPop / 7 (7 year group)
  youthPop -= aging
  primeAdultPop += aging

primeAdultPop:
  aging = primeAdultPop / 15 (15 year group)
  primeAdultPop -= aging
  middleAgePop += aging

middleAgePop:
  aging = middleAgePop / 15 (15 year group)
  middleAgePop -= aging
  elderlyPop += aging

**Births:**
fertilityRate = 0.04 (default, 4% of prime women)
births = primeAdultPop * 0.5 * fertilityRate
  (assume 50% female, 4% birth rate)

Fertility modifiers:
- grainSurplus > 0: fertilityRate += 0.005
- grainSurplus < 0: fertilityRate -= 0.01
- healthIndex >= 70: fertilityRate += 0.005
- stabilityIndex < 40: fertilityRate -= 0.01
- farmerLifeQuality > 70: fertilityRate += 0.003
fertilityRate floored at 0.01, capped at 0.08

infantPop += births each year

**Deaths:**
Mortality rates per group:
- infantPop: mortalityRate = 0.05
  (high infant mortality, historical)
- childPop: mortalityRate = 0.01
- teenPop: mortalityRate = 0.005
- youthPop: mortalityRate = 0.008
- primeAdultPop: mortalityRate = 0.01
- middleAgePop: mortalityRate = 0.02
- elderlyPop: mortalityRate = 0.08

Mortality modifiers (apply to all groups):
- healthIndex < 20: all mortalityRates *= 2.0
- healthIndex < 40: all mortalityRates *= 1.5
- grainSurplus < -totalPopulation * 100:
  all mortalityRates *= 1.8 (famine)
- stabilityIndex < 30: mortalityRates *= 1.2

Apply deaths:
each group -= group * mortalityRate

**Total population recalculation:**
totalPopulation = sum of all age groups
children = infantPop + childPop + teenPop
  (for display compatibility)
elderly = elderlyPop
  (for display compatibility)
laborForce = effectiveLaborForce
  (replaces old fixed 60% calculation)

**Total grain demand:**
totalGrainDemand =
  infantPop * 240 +
  childPop * 300 +
  teenPop * 400 +
  youthPop * 400 +
  primeAdultPop * 400 +
  middleAgePop * 400 +
  elderlyPop * 360

grainSurplus = actualGrainOutput - totalGrainDemand

**State additions in world{}:**
- infantPop: 500
- childPop: 750
- teenPop: 500
- youthPop: 750
- primeAdultPop: 1250
- middleAgePop: 750
- elderlyPop: 500
- fertilityRate: 0.04
- totalGrainDemand: 0

Remove old fields (keep for compatibility via getter):
- children (now = infantPop + childPop + teenPop)
- elderly (now = elderlyPop)

**Files to modify:**
- js/state.js (new age group fields)
- js/society/population.js (full cohort model)
- js/economy/agriculture.js (grain demand update)
- js/economy/labor.js (labor from cohort)
- js/ui/render_world.js (age group display)

**Do NOT touch:** unlocks.js, policies.js,
any economy/commerce.js economy/currency.js
economy/market.js society/satisfaction.js
society/stability.js diplomacy/xikou.js
tech/research.js any ui/ except render_world.js

**Definition of Done (Phase 9B-2):**
- All 7 age groups tracked separately
- Annual aging transitions calculated correctly
- Births from prime adult women
- Deaths per group with modifiers
- fertilityRate responds to conditions
- laborForce derived from cohort not fixed ratio
- totalGrainDemand uses per-group consumption
- grainSurplus based on real demand
- UI shows population panel in 总览 tab:
  each age group count
  fertility rate / birth count this year
  death count this year
  effective labor force
  total grain demand
- yearLog records births, deaths, population change
## Phase 9B-3: Labor Economic Choice (Current)

Phase 9B-2 complete. Now replacing fixed priority
labor allocation with wage-driven labor flow.

**Goal:** Labor moves toward higher-paying sectors
each year. Farming has minimum guarantee.
No more hard priority queue.

**Sector wages:**

farmingWage:
- = 10 * grainYieldPerMu * (1 - agriculturalTaxRate)
  * grainPrice
- (10 mu per farmer, after tax, valued at grain price)

commerceWage:
- = (commerceGDP / max(commerceLaborDemand, 1))
- Per worker in commerce sector

institutionWage:
- = averageOfficialWage (from fiscal settings)
- Fixed by player, not market-driven

hempWage:
- = (hempLandMu * 5 * blendedClothPrice)
  / max(hempLaborRequired, 1)
- Per worker in hemp sector

mulberryWage:
- = (mulberryLandMu * 15 * blendedClothPrice)
  / max(mulberryLaborRequired, 1)
- Per worker in mulberry sector

averageWage:
- = (farmingWage + commerceWage) / 2
  (simple average for flow calculation)

**Labor flow rules:**

Step 1: Fixed allocations first (player-controlled)
- institutionWorkers: set by player, deducted first
- merchantCount: set by player, deducted second
- Remaining = availableLabor

Step 2: Minimum farming guarantee
- minFarmingLabor = farmlandAreaMu / 10
  (must have enough to farm all land)
- minFarmingLabor capped at availableLabor

Step 3: Wage-driven flow for remaining labor
- flowSpeed = 0.05 (5% of sector labor moves per year)
- For each non-institution sector:
  wageDiff = sectorWage - averageWage
  laborChange = currentSectorLabor * flowSpeed
    * (wageDiff / max(averageWage, 1))
  laborChange capped at ±10% of sector labor

Step 4: Apply flow with constraints
- farming cannot go below minFarmingLabor
- commerce cannot exceed shopCount * 4
- hemp cannot exceed hempLaborRequired
- mulberry cannot exceed mulberryLaborRequired
- All allocations floored at 0

Step 5: Recalculate unemployment
- unemployed = availableLabor
  - farmingLaborAllocated
  - commerceLaborAllocated
  - hempLaborAllocated
  - mulberryLaborAllocated
- unemployed = max(0, unemployed)

**Initial labor allocation:**
On game start, allocate optimally:
- farmingLaborAllocated = min(farmlandAreaMu/10,
  availableLabor)
- All remaining labor = idle/unemployed

**Wage display:**
Show sector wages in UI so player understands
why labor is flowing where it is.

**State additions in world{}:**
- farmingWage: 0
- commerceWagePerWorker: 0
- hempWage: 0
- mulberryWage: 0
- averageWage: 0
- farmingLaborAllocated: existing field, now
  market-driven not fixed
- commerceLaborAllocated: 0 (rename from
  laborAssignedCommerce)
- hempLaborAllocated: 0
- mulberryLaborAllocated: 0

**Files to modify:**
- js/state.js (new wage fields)
- js/economy/labor.js (full rewrite of allocation)
- js/economy/agriculture.js (use new labor fields)
- js/economy/commerce.js (use new labor fields)
- js/ui/render_world.js (wage display)

**Do NOT touch:** unlocks.js, policies.js,
any society/ diplomacy/ tech/ files
ui/render_economy.js ui/render_society.js
ui/render_tech.js ui/render_diplomacy.js

**Definition of Done (Phase 9B-3):**
- Institution and merchant labor fixed by player
- Farming has minimum guarantee (all land farmed)
- Remaining labor flows toward higher wages
- Flow speed capped at 5% per year
- Sector constraints enforced
- Unemployment calculated from residual
- UI shows labor panel in 总览 tab:
  each sector: labor count / wage per worker
  average wage
  labor flow direction this year
  unemployment count and rate
- yearLog records significant labor shifts
## Bugfix v5: Commerce GDP + Grain Supply Ratio (Current)

Fixing 2 remaining logic bugs. No new features.

---

**FIX 1: Commerce GDP demandSaturation reversed
(commerce.js)**

Current wrong logic:
- demandSaturation > 1 amplifies commerceGDP
- More shops than demand = MORE revenue (wrong)

Correct logic:
- servedDemand = min(operatingShops, maxMarketDemand)
- demandEfficiency = servedDemand / max(operatingShops, 1)
- commerceGDP = operatingShops * SHOP_GDP_PER_UNIT
  * demandEfficiency * commerceActivityBonus
  * tradeMultiplier

Result:
- Shops < demand: full efficiency (demandEfficiency = 1)
- Shops = demand: full efficiency
- Shops > demand: reduced per-shop revenue
- Total GDP cannot grow just by adding more shops
  beyond market capacity

---

**FIX 2: Grain supply ratio still uses population * 2
(agriculture.js + market.js)**

Current wrong logic:
- Some places still use: totalPopulation * 2
- Should use: GRAIN_CONSUMPTION_PER_PERSON * population
  or totalGrainDemand from cohort model

Correct logic:
- Replace ALL instances of population * 2 with:
  world.totalGrainDemand
  (already calculated by cohort model in 9B-2)
- If totalGrainDemand = 0 (fallback):
  use totalPopulation * CONSTANTS.GRAIN_CONSUMPTION_PER_PERSON

Grain price supply ratio:
- comfortReserve = totalGrainDemand * 2
  (2 years of grain = comfortable)
- supplyRatio = grainTreasury / max(comfortReserve, 1)
- grainPrice = getGrainPrice(supplyRatio)

Also check xikou.js for same population * 2 pattern
and fix there too.

**Files to modify:**
- js/economy/commerce.js (fix 1)
- js/economy/agriculture.js (fix 2)
- js/economy/market.js (fix 2)
- js/diplomacy/xikou.js (fix 2)

**Do NOT touch:** unlocks.js, policies.js,
any society/ ui/ tech/ files
economy/currency.js economy/labor.js
state.js game.js

**Definition of Done (Bugfix v5):**
- Commerce GDP decreases per shop when oversaturated
- No more population * 2 anywhere for grain demand
- All grain demand uses totalGrainDemand or
  population * GRAIN_CONSUMPTION_PER_PERSON
- Grain price based on treasury vs comfort reserve
- yearLog records commerce efficiency changes
## Phase 9D: Transfer Ledger Function (Current)

Phase 9C complete. Now adding unified transfer()
function for core asset movements.

**Goal:** Create transfer.js with unified accounting
function. Replace 6-8 core direct field modifications
in economy files with transfer() calls.

**New file: js/economy/transfer.js**

Account mappings:
- 'government.grain' → state.agriculture.grainTreasury
- 'government.coupon' → state.monetary.couponTreasury
- 'monetary.locked' → state.monetary.lockedGrainReserve
- 'monetary.circulating' → state.monetary.couponCirculating
- 'private.farmer.grain' → state.privateSector.farmerGrain
- 'private.farmer.coupon' → state.privateSector.farmerCoupons
- 'private.merchant.coupon' →
  state.privateSector.merchantCoupons

transfer() function signature:
function transfer({ from, to, asset, amount,
  gdpTreatment, reason }, state)

- Deduct amount from 'from' account
- Add amount to 'to' account
- Write to state.ledger based on gdpTreatment:
  'production': counts toward GDP
  'transfer': does not count as GDP
  'none': skip ledger
- Return false if insufficient balance
- Never go negative on any account

Replace these specific locations with transfer():

agriculture.js - tax collection:
transfer({
  from: 'private.farmer.grain',
  to: 'government.grain',
  asset: 'grain',
  amount: taxAmount,
  gdpTreatment: 'transfer',
  reason: 'agricultural_tax'
}, state)

agriculture.js - farmer grain retention:
transfer({
  from: 'private.farmer.grain',
  to: 'private.farmer.grain',
  asset: 'grain',
  amount: retainedGrain,
  gdpTreatment: 'production',
  reason: 'farmer_retention'
}, state)

currency.js - coupon issuance:
transfer({
  from: 'private.farmer.grain',
  to: 'monetary.locked',
  asset: 'grain',
  amount: issueAmount,
  gdpTreatment: 'none',
  reason: 'coupon_backing'
}, state)
transfer({
  from: 'monetary.circulating',
  to: 'private.farmer.coupon',
  asset: 'coupon',
  amount: issueAmount,
  gdpTreatment: 'none',
  reason: 'coupon_issuance'
}, state)

commerce.js - commerce tax:
transfer({
  from: 'private.merchant.coupon',
  to: 'government.coupon',
  asset: 'coupon',
  amount: taxAmount,
  gdpTreatment: 'transfer',
  reason: 'commerce_tax'
}, state)

**Add to index.html:**
Load js/economy/transfer.js BEFORE all other
economy/ files.

**Files to modify:**
- js/economy/transfer.js (new file)
- js/economy/agriculture.js
- js/economy/currency.js
- js/economy/commerce.js
- index.html

**Do NOT touch:** any other files

**Definition of Done (Phase 9D):**
- transfer.js exists with account mapping
- transfer() function handles all account types
- Never allows negative balances
- 5 core transactions use transfer()
- index.html loads transfer.js first
- Game runs identically after change
## Bugfix v6: Salt Consumption + Production + Tax (Current)

Fixing 3 confirmed logic bugs. No new features.

---

**FIX 1: Salt consumption uses wrong base (agriculture.js)**

Current wrong logic:
- saltSpending = privateSector.farmerGrain * saltPrice * 15
- Uses grain STOCK as multiplier (wrong)
- More grain = more salt spending (no relation)

Correct logic:
- farmerSaltDemand = farmingLaborAllocated *
  SALT_CONSUMPTION_PER_PERSON (15 jin/person/year)
- saltAffordable = privateSector.farmerGrain /
  max(saltPrice, 1)
  (how much salt farmer can afford with grain)
- saltConsumed = min(farmerSaltDemand,
  world.saltReserve, saltAffordable)
- saltSpending = saltConsumed * saltPrice
- privateSector.farmerGrain -= saltSpending
- world.saltReserve -= saltConsumed

Same fix for cloth consumption:
- farmerClothDemand = farmingLaborAllocated *
  CLOTH_CONSUMPTION_PER_PERSON (0.3 bolts/year)
- clothAffordable = privateSector.farmerGrain /
  max(world.clothPrice, 1)
- clothConsumed = min(farmerClothDemand,
  world.clothReserve, clothAffordable)
- clothSpending = clothConsumed * world.clothPrice
- privateSector.farmerGrain -= clothSpending
- world.clothReserve -= clothConsumed

---

**FIX 2: farmer_retention uses self-transfer
(agriculture.js + transfer.js)**

Current wrong logic:
- transfer({ from: 'private.farmer.grain',
    to: 'private.farmer.grain', ... })
- Self-transfer does nothing to balance
- Production is not a transfer

Correct logic:
Add new function produce() to transfer.js:

function produce({
  to,        // account receiving new assets
  asset,     // 'grain' / 'cloth' / 'salt' etc
  amount,    // quantity produced
  gdpTreatment, // 'production' / 'none'
  reason     // description
}, state)

- Adds amount to 'to' account
- No 'from' needed (new value created)
- Records in ledger as production
- Updates ledger.constructionSpendingThisYear
  if reason includes 'construction'

Replace farmer_retention with:
produce({
  to: 'private.farmer.grain',
  asset: 'grain',
  amount: retainedGrain,
  gdpTreatment: 'production',
  reason: 'farmer_grain_retention'
}, state)

Also add consume() function to transfer.js:

function consume({
  from,      // account losing assets
  asset,     // asset type
  amount,    // quantity consumed
  reason     // description
}, state)

- Deducts amount from 'from' account
- Records as consumption (not GDP)
- Returns false if insufficient balance

---

**FIX 3: Commerce tax fails silently when
merchant has no coupons (commerce.js)**

Current wrong logic:
- Tax only tries private.merchant.coupon
- If balance insufficient: tax = 0, no consequence

Correct logic:
Tax collection priority order:
1. Try private.merchant.coupon first
2. If insufficient: try private.merchant.grain
   (convert at current grainPrice)
3. If still insufficient: record as tax arrears

Add to state:
- merchantTaxArrears: 0
- taxArrearsAccumulated: 0

Tax arrears effects:
- merchantTaxArrears > 0:
  taxBureauEfficiency -= 10
  merchantLifeQuality -= 5
  yearLog: "商业税收欠缴，税务局压力增加"
- taxArrearsAccumulated > commerceGDP * 0.5:
  merchantSatisfaction -= 10
  courtEfficiency -= 5
  yearLog: "累计欠税严重，影响营商环境"

Arrears repayment:
- Each year: attempt to collect arrears first
  before new tax
- If merchant assets sufficient: clear arrears
- merchantTaxArrears decreases as paid

**Files to modify:**
- js/economy/transfer.js (add produce() + consume())
- js/economy/agriculture.js (fix 1 + fix 2)
- js/economy/commerce.js (fix 3)
- js/state.js (merchantTaxArrears fields)

**Do NOT touch:** unlocks.js, policies.js,
any society/ diplomacy/ tech/ ui/ files
economy/market.js economy/labor.js
economy/currency.js

**Definition of Done (Bugfix v6):**
- Salt consumption based on population not grain stock
- Cloth consumption based on population not grain stock
- farmer_retention uses produce() not self-transfer
- Commerce tax tries coupon then grain then arrears
- Tax arrears tracked and affect efficiency
- Arrears repaid when merchant assets available
- yearLog records consumption and tax events
## Phase 9E: Full Ledger Operations + Softmax Labor (Current)

Bugfix v6 complete. Now expanding ledger to 5
operation types and replacing labor heuristic
with true Softmax algorithm.

---

**PART A: Expand transfer.js to 5 operation types**

Current: only transfer() and produce() and consume()
Add: mint() and burn()

mint({ to, asset, amount, reason }, state):
- Creates new monetary assets (coupons)
- to: 'monetary.circulating' or 'private.farmer.coupon'
- asset: 'coupon' only
- Records as monetary expansion
- Updates couponTotalIssued

burn({ from, asset, amount, reason }, state):
- Destroys monetary assets
- from: 'monetary.circulating'
- asset: 'coupon' only
- Records as monetary contraction
- Updates couponCirculating

Replace coupon issuance in currency.js with:
Step 1: consume({
  from: 'private.farmer.grain',
  asset: 'grain',
  amount: issueAmount,
  reason: 'coupon_backing_purchase'
}, state)
Step 2: produce({
  to: 'monetary.locked',
  asset: 'grain',
  amount: issueAmount,
  gdpTreatment: 'none',
  reason: 'grain_locked_as_reserve'
}, state)
Step 3: mint({
  to: 'private.farmer.coupon',
  asset: 'coupon',
  amount: issueAmount,
  reason: 'coupon_issuance'
}, state)

Replace coupon redemption with:
Step 1: burn({
  from: 'monetary.circulating',
  asset: 'coupon',
  amount: redeemAmount,
  reason: 'coupon_redemption'
}, state)
Step 2: consume({
  from: 'monetary.locked',
  asset: 'grain',
  amount: redeemAmount,
  reason: 'reserve_release'
}, state)
Step 3: produce({
  to: 'private.farmer.grain',
  asset: 'grain',
  amount: redeemAmount,
  gdpTreatment: 'none',
  reason: 'grain_returned_to_farmer'
}, state)

---

**PART B: True Softmax labor allocation (labor.js)**

Replace current heuristic with proper algorithm.

Sector definitions (array):
const sectors = [
  {
    id: 'farming',
    wage: farmingWage,
    risk: grainSurplus < 0 ? 0.3 : 0.0,
    mobilityCost: 0.05,
    min: foodSecurityLaborFloor,
    max: farmingLaborRequired,
    currentLabor: world.farmingLaborAllocated
  },
  {
    id: 'commerce',
    wage: commerceWagePerWorker,
    risk: 0.02,
    mobilityCost: 0.15,
    min: 0,
    max: operatingShops * 4,
    currentLabor: world.commerceLaborAllocated
  },
  {
    id: 'hemp',
    wage: hempWage,
    risk: 0.01,
    mobilityCost: 0.10,
    min: 0,
    max: world.hempLandMu / 10,
    currentLabor: world.hempLaborAllocated
  },
  {
    id: 'mulberry',
    wage: mulberryWage,
    risk: 0.01,
    mobilityCost: 0.12,
    min: 0,
    max: world.mulberryLandMu / 5,
    currentLabor: world.mulberryLaborAllocated
  }
]

Step 1: Calculate utility per sector
utility(s) = s.wage * (1 - s.risk) - s.mobilityCost
  * averageWage

Step 2: Calculate weighted average wage
averageWage = sum(s.wage * s.currentLabor) /
  max(sum(s.currentLabor), 1)
(weighted by current allocation, all sectors)

Step 3: Softmax weights
temperature = max(averageWage * 0.5, 1)
weight(s) = exp(utility(s) / temperature)
totalWeight = sum(all weights)
targetShare(s) = weight(s) / totalWeight

Step 4: Calculate target labor
movableLabor = laborForce - institutionWorkers
  - merchantCount
targetLabor(s) = targetShare(s) * movableLabor

Step 5: Project to constraints
for each sector:
  targetLabor(s) = clamp(targetLabor(s), s.min, s.max)

remaining = movableLabor - sum(clampedTargets)
if remaining > 0:
  farming gets remaining up to its max
  if still remaining: becomes unemployed

Step 6: Apply mobility speed
flowSpeed = 0.08
newLabor(s) = s.currentLabor +
  flowSpeed * (targetLabor(s) - s.currentLabor)
newLabor(s) = clamp(newLabor(s), s.min, s.max)

Step 7: Calculate unemployment
unemployed = movableLabor - sum(newLabor values)
unemployed = max(0, unemployed)
unemploymentRate = unemployed / max(laborForce, 1)

foodSecurityLaborFloor:
= min(farmlandAreaMu / 10, movableLabor)

Helper function:
function softmaxLaborAllocation(sectors,
  movableLabor, temperature):
  returns array of { id, targetLabor }

**Files to modify:**
- js/economy/transfer.js (add mint + burn)
- js/economy/currency.js (use mint/burn/consume/produce)
- js/economy/labor.js (true Softmax algorithm)

**Do NOT touch:** unlocks.js, policies.js,
any society/ diplomacy/ tech/ ui/ files
economy/agriculture.js economy/commerce.js
economy/market.js state.js game.js

**Definition of Done (Phase 9E):**
- mint() creates coupons correctly
- burn() destroys coupons correctly
- Coupon issuance uses mint/consume/produce chain
- Coupon redemption uses burn/consume/produce chain
- Softmax weights calculated from utility
- All sectors defined with min/max/wage/risk
- averageWage weighted by all sector labor
- flowSpeed caps adjustment at 8%/year
- Farming always meets foodSecurityLaborFloor
- Unemployment = residual after all sectors
- yearLog records significant labor shifts
## Bugfix v7: Mint/Burn/Issuance/Redemption (Current)

Fixing 3 related coupon accounting bugs.
No new features. transfer.js + currency.js only.

---

**FIX 1: mint() double-counts couponCirculating**

Current wrong logic:
- When to = 'private.farmer.coupon':
  toRef += amount (farmer coupon increases)
  monetary.couponCirculating += amount (also increases)
  = correct, two different accounts

- When to = 'monetary.circulating':
  toRef += amount (couponCirculating increases)
  monetary.couponCirculating += amount (increases AGAIN)
  = double count, couponCirculating gets +2x

Correct logic:
if (to === 'monetary.circulating') {
  toRef.holder[toRef.key] += safeAmount
  // couponCirculating already updated above, skip
} else {
  toRef.holder[toRef.key] += safeAmount
  monetary.couponCirculating += safeAmount
}
monetary.couponTotalIssued += safeAmount

---

**FIX 2: burn() only supports monetary.circulating,
but redemption needs to burn from private accounts**

Current wrong logic:
- burn() only accepts from = 'monetary.circulating'
- Redemption workaround:
  produce monetary.circulating (creates fake pool)
  burn monetary.circulating (destroys fake pool)
  = conceptually wrong, creates phantom coupons

Correct logic:
- burn() accepts ANY coupon account:
  'private.farmer.coupon'
  'private.merchant.coupon'
  'government.coupon'
  'monetary.circulating'

- When burning from private account:
  privateAccount -= amount
  couponCirculating -= amount (sync total)

- When burning from monetary.circulating:
  couponCirculating -= amount only

- couponTotalIssued unchanged (burned != unissued)

---

**FIX 3: Coupon issuance uses consume+produce
instead of transfer for grain movement**

Current wrong logic:
- consume({ from: 'private.farmer.grain' })
  = grain "consumed" (destroyed)
- produce({ to: 'monetary.locked' })
  = locked grain "produced" (created from nothing)
- Net effect: grain destroyed AND created = wrong

Correct logic:
Grain moves from farmer to locked reserve (transfer):
transfer({
  from: 'private.farmer.grain',
  to: 'monetary.locked',
  asset: 'grain',
  amount: issueAmount,
  gdpTreatment: 'none',
  reason: 'coupon_backing_purchase'
}, state)

Then mint coupons to farmer:
mint({
  to: 'private.farmer.coupon',
  asset: 'coupon',
  amount: issueAmount,
  reason: 'coupon_issuance'
}, state)

---

**FIX 4: Coupon redemption simplified**

Current wrong logic (roundabout):
consume private.farmer.coupon
produce monetary.circulating
burn monetary.circulating
consume monetary.locked
produce private.farmer.grain

Correct clean logic:
Step 1: burn farmer coupons directly
burn({
  from: 'private.farmer.coupon',
  asset: 'coupon',
  amount: redeemAmount,
  reason: 'coupon_redemption'
}, state)

Step 2: transfer locked grain back to farmer
transfer({
  from: 'monetary.locked',
  to: 'private.farmer.grain',
  asset: 'grain',
  amount: redeemAmount,
  gdpTreatment: 'none',
  reason: 'grain_reserve_release'
}, state)

No phantom accounts. No roundabout paths.

**Files to modify:**
- js/economy/transfer.js (fix 1 + fix 2)
- js/economy/currency.js (fix 3 + fix 4)

**Do NOT touch:** any other files whatsoever.

**Definition of Done (Bugfix v7):**
- mint() to monetary.circulating: no double count
- mint() to private account: correctly syncs
  couponCirculating
- burn() works from any coupon account
- Coupon issuance: transfer grain + mint coupon
- Coupon redemption: burn coupon + transfer grain
- No phantom accounts in any flow
- All flows balance: assets in = assets out
