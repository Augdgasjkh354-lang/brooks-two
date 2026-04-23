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
