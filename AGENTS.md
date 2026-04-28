# AGENTS.md

## Project Overview
Brooks-Two is a long-horizon, policy-driven society simulation.
The game runs as a modular yearly pipeline in plain browser JavaScript.
Core systems include population, economy, stability, diplomacy, technology, and buildings.
Systems are progressively unlocked through gameplay rather than preloaded.
Current work is focused on the unified building-system migration.

## Current Tech Stack Rules
- Plain HTML/CSS/JavaScript only (no framework, no backend).
- Run locally by opening `index.html` directly.
- Keep modules small, composable, and data-driven.
- Prefer declarative configuration over hardcoded branching for building logic.

## File Structure
- `index.html`, `style.css`: app shell and styling.
- `js/state.js`: canonical world state initialization.
- `js/game.js`: yearly simulation pipeline and orchestration.
- `js/render.js` + `js/ui/*`: tab/page rendering and UI panels.
- `js/economy/*`, `js/society/*`, `js/diplomacy/*`, `js/tech/*`: domain systems.
- `js/buildings/*`: unified building definitions, production methods, and engine.
- `docs/`: architecture and phase history docs.

## Do-Not-Touch Rules
- Do not modify files outside the active phase scope.
- For Phase 10D specifically, do **not** modify existing economy/society/diplomacy/tech files.
- Preserve backward compatibility with existing simulation behavior during migration.

## Current Active Phase (Phase 10D)
**Name:** Unified Building System.

**Goal:** Introduce a unified, data-driven building model with `buildingTypes`, `productionMethods`, and a `buildingEngine`, while keeping existing systems functional during transition.

**Files to create:**
- `js/buildings/buildingTypes.js`
- `js/buildings/productionMethods.js`
- `js/buildings/buildingEngine.js`
- `js/ui/render_buildings.js`

**Files to modify:**
- `js/state.js`
- `js/game.js`
- `js/render.js`
- `index.html`

**Do NOT touch (Phase 10D):**
- Existing economy/society/diplomacy/tech files.

**Definition of Done (Phase 10D):**
- Building data files and engine exist and are wired.
- `state.buildings` and `state.commodities` are initialized.
- Year pipeline calls building output calculation.
- New 建筑 tab displays buildings, methods, outputs, and construction controls.
- Existing game logic remains stable during incremental migration.
## Current Phase: 10E - Building Engine Migration

**Goal:** Migrate existing production logic to use
unified building engine. Buildings drive economy
instead of hardcoded calculations.

**Migration targets:**

1. Farmland (agriculture.js → buildingEngine.js)
Current: grainOutput = farmlandAreaMu * grainYieldPerMu
  * farmEfficiency
New: read from state.buildings.farmland
  count = state.buildings.farmland.count
  method = state.buildings.farmland.method
  output = buildingEngine.calculateBuildingOutput(
    'farmland', count, state)
  grain goes to state.commodities.grain
  then tax split: government gets taxRate%
  farmer keeps retentionRate%

2. Hemp field (agriculture.js → buildingEngine.js)
Current: coarseClothOutput = hempLandMu * 5
New: read from state.buildings.hemp_field
  outputs go to state.commodities.cloth
  byproducts go to state.commodities.paper_material
  and state.commodities.hemp_stalk

3. Mulberry field (agriculture.js → buildingEngine.js)
Current: fineClothOutput = mulberryLandMu * 15
New: read from state.buildings.mulberry_field
  outputs go to state.commodities.silk
  byproducts go to state.commodities.silkworm_dung

4. Shop (commerce.js → buildingEngine.js)
Current: commerceGDP = operatingShops * SHOP_GDP_PER_UNIT
New: read from state.buildings.shop
  output = buildingEngine.calculateBuildingOutput(
    'shop', count, state)
  result feeds into commerceGDP calculation

5. Commodity consumption each year:
- grain consumed by population:
  state.commodities.grain -= totalGrainDemand
- salt consumed:
  state.commodities.salt -= totalSaltDemand
- cloth consumed:
  state.commodities.cloth -= totalClothDemand

6. Sync existing state fields from commodities:
After building engine runs:
  world.grainTreasury = state.commodities.grain
    (government share after tax)
  world.saltReserve = state.commodities.salt
  world.clothReserve = state.commodities.cloth
  world.rawSilkOutput = state.commodities.silk

**Production method effects:**
Apply in calculateBuildingOutput():
- iron_tools: output *= 1.15
  requires state.commodities.iron_tools > 0
- irrigation: output *= 1.20
  requires irrigationCanalCount > 0
- fertilizer: output *= 1.20
  requires state.commodities.silkworm_dung > 0
- crop_rotation: output *= 1.15
  requires tech completed

**New buildings now functional:**
- paper_mill: consumes paper_material,
  produces paper → state.commodities.paper
- lumber_yard: produces lumber + charcoal
- medicine_hall: consumes herbs,
  produces medicine → affects healthIndex

**Commodity effects:**
- paper > 0: officialEfficiency += 5%
- medicine > 0: healthIndex += 5
- lumber > 0: constructionCostReduction += 3%
- iron_tools > 0: enables iron_tools method

**Files to modify:**
- js/buildings/buildingEngine.js
- js/economy/agriculture.js
- js/economy/commerce.js
- js/game.js (produceGoods pipeline phase)
- js/state.js (sync commodity fields)

**Do NOT touch:** any society/ diplomacy/
tech/ ui/ files, economy/market.js,
economy/currency.js, economy/labor.js

**Definition of Done (Phase 10E):**
- Farmland output calculated by buildingEngine
- Hemp/mulberry output from buildingEngine
- Shop GDP reads from buildingEngine
- state.commodities updated each year
- Existing state fields synced from commodities
- Production methods apply correct multipliers
- New buildings (paper_mill, lumber_yard,
  medicine_hall) produce outputs
- Commodity effects applied to game systems
- Game runs identically for existing logic
- yearLog records commodity production
## Current Phase: 10F - Commodity Market System

**Goal:** Make commodities real. Every commodity
has supply, demand, price, and flows between
buildings, population, and trade.

**Commodity price system:**

Each commodity in state.commodities gets:
state.commodityPrices = {
  grain: { price: 1.0, supply: 0, demand: 0,
    basePrice: 1.0, minPrice: 0.3, maxPrice: 5.0,
    elasticity: 0.5 },
  salt: { price: 4.0, supply: 0, demand: 0,
    basePrice: 4.0, minPrice: 1.0, maxPrice: 12.0,
    elasticity: 0.8 },
  cloth: { price: 2.0, supply: 0, demand: 0,
    basePrice: 2.0, minPrice: 0.5, maxPrice: 8.0,
    elasticity: 0.6 },
  silk: { price: 10.0, supply: 0, demand: 0,
    basePrice: 10.0, minPrice: 3.0, maxPrice: 30.0,
    elasticity: 0.4 },
  paper: { price: 3.0, supply: 0, demand: 0,
    basePrice: 3.0, minPrice: 1.0, maxPrice: 10.0,
    elasticity: 0.7 },
  iron_tools: { price: 8.0, supply: 0, demand: 0,
    basePrice: 8.0, minPrice: 2.0, maxPrice: 20.0,
    elasticity: 0.6 },
  weapons: { price: 15.0, supply: 0, demand: 0,
    basePrice: 15.0, minPrice: 5.0, maxPrice: 40.0,
    elasticity: 0.3 },
  ceramics: { price: 5.0, supply: 0, demand: 0,
    basePrice: 5.0, minPrice: 1.0, maxPrice: 15.0,
    elasticity: 0.5 },
  lumber: { price: 2.0, supply: 0, demand: 0,
    basePrice: 2.0, minPrice: 0.5, maxPrice: 8.0,
    elasticity: 0.6 },
  charcoal: { price: 1.5, supply: 0, demand: 0,
    basePrice: 1.5, minPrice: 0.3, maxPrice: 5.0,
    elasticity: 0.7 },
  medicine: { price: 6.0, supply: 0, demand: 0,
    basePrice: 6.0, minPrice: 2.0, maxPrice: 20.0,
    elasticity: 0.4 },
  tea: { price: 5.0, supply: 0, demand: 0,
    basePrice: 5.0, minPrice: 1.0, maxPrice: 15.0,
    elasticity: 0.5 },
  bricks: { price: 0.5, supply: 0, demand: 0,
    basePrice: 0.5, minPrice: 0.1, maxPrice: 2.0,
    elasticity: 0.8 }
}

**Price calculation (supply/demand elasticity):**
targetPrice = basePrice *
  Math.pow(demand / max(supply, 1), elasticity)
newPrice = lerp(previousPrice, targetPrice, 0.3)
  (30% adjustment per year, smooth changes)
newPrice = clamp(newPrice, minPrice, maxPrice)

**Annual supply calculation:**
Each commodity supply comes from building outputs:
- grain: farmland output (government share)
- salt: salt_field output + xikou imports
- cloth: hemp_field output + xikou imports
- silk: mulberry_field output
- paper: paper_mill output
- iron_tools: blacksmith output
- weapons: blacksmith output
- ceramics: kiln output
- bricks: kiln output
- lumber: lumber_yard output
- charcoal: lumber_yard output
- medicine: medicine_hall output
- tea: tea_garden output

**Annual demand calculation:**

Population basic needs (per person per year):
- grain: 360 jin (already implemented)
- salt: 15 jin
- cloth: 0.3 bolts
- medicine: 0.1 units (sick people need medicine)

Building input demands:
- blacksmith needs: iron_ore(100) + charcoal(50)
  per unit per year
- kiln needs: clay(100) + charcoal(30) per unit
- paper_mill needs: paper_material(50) per unit
- medicine_hall needs: herbs(50) per unit
- barracks needs: weapons(10) + grain(50000)
  per unit per year

Government demands:
- paper: institutionWorkers * 20 per year
- weapons: policeOfficerCount * 2 per year

**Commodity shortage effects:**
- paper shortage (supply < demand * 0.5):
  all institution efficiency -= 20%
  yearLog: "纸张短缺，官府效率下降"
- iron_tools shortage:
  farming output multiplier -= 10%
  yearLog: "铁器短缺，农业生产受影响"
- medicine shortage:
  healthIndex -= 10
  yearLog: "药材短缺，公共卫生恶化"
- lumber shortage:
  constructionCostReduction = 0
  yearLog: "木材短缺，建设成本上升"
- weapons shortage (if barracks exists):
  military_power -= 30%
  yearLog: "武器短缺，军事力量削弱"

**Commodity surplus effects:**
- grain surplus > population * 720:
  grain price drops significantly
  grainPrice *= 0.8
- silk surplus > 10000:
  silk price drops
  merchantLifeQuality += 3 (good for trade)

**Trade commodities with Xikou:**
Existing salt/cloth trade now uses
commodity prices instead of fixed ratios:
- salt trade price = commodityPrices.salt.price
- cloth trade price = commodityPrices.cloth.price
- Both update dynamically each year

**New render section in 建筑 tab:**
Commodity market panel showing:
- Each commodity: supply / demand / price / trend
- Price trend: ↑ ↓ → based on last year comparison
- Shortage warning (red) when supply < demand * 0.7
- Surplus indicator (blue) when supply > demand * 1.5

**Pipeline integration:**
Add new phase after settleMarket:
{ name: 'settleCommodityMarket',
  fn: settleCommodityMarket }

settleCommodityMarket(state):
1. Calculate all commodity supplies from buildings
2. Calculate all commodity demands from
   population + buildings + government
3. Update prices via elasticity formula
4. Apply shortage/surplus effects
5. Update state.commodityPrices

**Files to create:**
- js/economy/commodityMarket.js
  (supply/demand/price calculations)

**Files to modify:**
- js/state.js (add commodityPrices)
- js/game.js (add settleCommodityMarket phase)
- js/buildings/buildingEngine.js
  (buildings consume commodity inputs)
- js/diplomacy/xikou.js
  (use commodity prices for trade)
- js/ui/render_buildings.js
  (add commodity market panel)

**Do NOT touch:** any society/ tech/
economy/agriculture.js economy/commerce.js
economy/currency.js economy/labor.js
economy/market.js ui/render_society.js
ui/render_world.js ui/render_economy.js

**Definition of Done (Phase 10F):**
- state.commodityPrices initialized for all goods
- Supply calculated from building outputs each year
- Demand calculated from population + buildings
- Prices update via elasticity formula
- Shortage effects applied to relevant systems
- Commodity market panel in 建筑 tab
- Xikou trade uses dynamic commodity prices
- yearLog records price changes and shortages
- Price trend indicators (↑↓→) in UI
## Current Phase: 10G - Pop System

**Goal:** Upgrade population from simple counts
to real Pop units with profession, wealth,
needs, and political leaning.

**Pop definition:**
Each Pop represents ~100 people of same type.

state.pops = [
  {
    id: 'pop_001',
    type: 'farmer',
    size: 30,        // number of pops (x100 people)
    wealth: 500,     // grain equivalent per pop
    needs: {
      grain: 360,
      salt: 15,
      cloth: 0.3,
      medicine: 0.05
    },
    needsSatisfied: {
      grain: 1.0,    // 0-1, how well needs met
      salt: 0.8,
      cloth: 0.6,
      medicine: 0.3
    },
    politicalLeaning: 'conservative',
      // conservative/reformist/radical
    literacy: 0.05,
    satisfaction: 50,
    income: 1500,    // grain per person per year
    savings: 0
  }
]

**Pop types:**
- farmer: works farmland, produces grain
- worker: works hemp/mulberry/industry
- merchant: operates shops, trades
- official: runs government institutions
- soldier: (future) military
- scholar: educated, produces knowledge

**Pop creation rules:**
- Pops created from population cohorts
- farmer pops = farmingLaborAllocated / 100
- worker pops = (hempLabor + mulberryLabor) / 100
- merchant pops = merchantCount / 100
- official pops = institutionWorkers / 100

**Pop needs satisfaction:**
Each year for each pop:
- Check commodity market supply vs demand
- needsSatisfied = min(1.0,
    commodityAvailable / needRequired)
- If needsSatisfied < 0.5: satisfaction drops
- If needsSatisfied > 0.9: satisfaction rises

**Pop wealth changes:**
Each year:
- income = sector wage * pop size * 100
- expenses = needs * commodity prices * pop size
- savings += income - expenses
- wealth = savings / (pop size * 100)

**Pop satisfaction from needs:**
overallSatisfaction = weighted average of:
  grain satisfaction * 0.4
  salt satisfaction * 0.2
  cloth satisfaction * 0.2
  medicine satisfaction * 0.1
  other needs * 0.1

**Pop political leaning:**
- wealth > averageWealth * 2: conservative
  (protect status quo)
- wealth < averageWealth * 0.5: radical
  (want change)
- otherwise: reformist

**Pop growth:**
- farmer pops grow with farmland expansion
- worker pops grow with industrial buildings
- merchant pops grow with shop construction
- official pops set by player (institution staff)

**Effects on existing systems:**
- farmerSatisfaction = average farmer pop satisfaction
- merchantSatisfaction = average merchant pop satisfaction
- officialSatisfaction = average official pop satisfaction
- farmerLiteracy = average farmer pop literacy
- Total laborForce = sum of all working pop sizes * 100

**New UI section in 社会 tab:**
Pop overview panel:
- List all pop types with count
- Each pop: size / wealth / satisfaction / needs met
- Political leaning distribution bar
- Needs satisfaction breakdown

**Files to create:**
- js/society/popSystem.js

**Files to modify:**
- js/state.js (add state.pops)
- js/game.js (add updatePops to pipeline)
- js/society/satisfaction.js
  (read from pop satisfaction)
- js/ui/render_society.js (add pop panel)

**Do NOT touch:** any economy/ buildings/
diplomacy/ tech/ ui/render_world.js
ui/render_economy.js ui/render_buildings.js

**Definition of Done (Phase 10G):**
- state.pops initialized from population
- Each pop has type/size/wealth/needs/satisfaction
- Needs satisfaction calculated from commodities
- Pop satisfaction feeds into class satisfaction
- Political leaning calculated from wealth
- Pop panel visible in 社会 tab
- yearLog records pop satisfaction changes
- Pop sizes update with labor allocation changes
## Current Phase: 10H - De-duplicate Authority

Stop all feature work. Fix 3 critical
authority conflicts between old and new systems.

FIX 1: Farmland double production
In buildingEngine.js calculateAllBuildingOutputs():
Skip farmland building entirely for now:
if (building.id === 'farmland') continue;
Farmland production stays in agriculture.js only.
Remove any world.grainTreasury writes from
buildingEngine.js

FIX 2: Commodity market overwrites treasury
In commodityMarket.js, remove these lines:
state.world.grainTreasury = state.commodities.grain
state.world.saltReserve = state.commodities.salt
state.world.clothReserve = state.commodities.cloth
Replace with display-only fields:
state.world.marketGrainInventory = state.commodities.grain
state.world.marketSaltInventory = state.commodities.salt
state.world.marketClothInventory = state.commodities.cloth
Commodity market NEVER writes to treasury fields.

FIX 3: Pop system overwrites laborForce
In popSystem.js, remove:
world.laborForce = ...
Replace with:
world.popLaborForceEstimate = totalPopLabor
Real laborForce only comes from population.js

FIX 4: Commodity market stops modifying inventory
In commodityMarket.js settleCommodityMarket():
Do NOT execute: state.commodities[c] = inventory + netFlow
Instead only update prices:
state.commodityPrices[c].supply = supply
state.commodityPrices[c].demand = demand
state.commodityPrices[c].netFlow = netFlow
Price calculation still runs normally.
Inventory changes will come from proper
produce/consume calls in future phases.

FIX 5: YearLog length limit
Add helper function to game.js:
function addYearLog(state, msg) {
  if (!state.logs) state.logs = {}
  if (!state.logs.yearLog) state.logs.yearLog = []
  state.logs.yearLog.unshift(msg)
  if (state.logs.yearLog.length > 200)
    state.logs.yearLog.length = 200
}
Replace all direct yearLog.unshift() calls
in commodityMarket.js and popSystem.js
with addYearLog(state, msg)

Authority table (document in comments):
- Population/laborForce: population.js ONLY
- Pop satisfaction: popSystem.js ONLY  
- Commodity prices: commodityMarket.js ONLY
- Commodity inventory: commodities object
  (not overwritten by treasury or vice versa)
- Government grain: world.grainTreasury
  (never overwritten by commodities)
- Production: agriculture.js (farmland)
  buildingEngine.js (other buildings)

Files to modify:
- js/buildings/buildingEngine.js (fix 1)
- js/economy/commodityMarket.js (fix 2 + fix 4 + fix 5)
- js/society/popSystem.js (fix 3 + fix 5)
- js/game.js (fix 5 helper function)

Do NOT touch any other files.

Definition of Done (Phase 10H):
- Grain produced exactly once per year
- world.grainTreasury never overwritten by commodities
- world.laborForce only written by population.js
- Commodity market only updates prices not inventory
- yearLog capped at 200 entries
- Next Year button works correctly
- No NaN in grain/population displays
## Current Phase: 10I - Interest Groups System

**Goal:** Add 6 interest groups that represent
organized political forces. Each group has
demands, satisfaction, and political power.
Low satisfaction triggers political pressure.

**6 Interest Groups:**

state.interestGroups = {
  farmerGuild: {
    name: '农民公会',
    icon: '🌾',
    basedOn: 'farmer',     // which pop type
    size: 0,               // calculated from pop
    satisfaction: 50,      // 0-100
    power: 0,              // political influence
    demands: {
      maxTaxRate: 0.6,     // want tax below 60%
      minGrainPrice: 0.8,  // want grain price stable
      maxRentRate: 5,      // want low rent
      minFoodSecurity: 0.8 // want grain surplus
    },
    currentDemandsMet: 0,  // 0-1 ratio
    politicalStance: 'conservative',
    supportedPolicies: ['grain_redistribution',
      'reclaim_land', 'lower_tax'],
    opposedPolicies: ['merchant_tax', 'high_rent',
      'conscription'],
    unlockCondition: null  // always exists
  },

  merchantGuild: {
    name: '商人行会',
    icon: '💰',
    basedOn: 'merchant',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: {
      maxCommerceTaxRate: 0.15,
      minTradeEfficiency: 0.8,
      maxInflationRate: 0.1,
      minCreditRating: 'B'
    },
    currentDemandsMet: 0,
    politicalStance: 'reformist',
    supportedPolicies: ['trade_subsidy',
      'contract_law', 'weights_measures',
      'lower_commerce_tax'],
    opposedPolicies: ['trade_protection',
      'merchant_tax', 'price_control'],
    unlockCondition: { minMerchants: 5 }
  },

  bureaucracy: {
    name: '官僚集团',
    icon: '📜',
    basedOn: 'official',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: {
      minOfficialWage: 1.2,  // want wage > 1.2x GDP
      minPaperSupply: 0.7,
      maxFireLeakage: 0.15,
      minInstitutionCount: 3
    },
    currentDemandsMet: 0,
    politicalStance: 'conservative',
    supportedPolicies: ['household_registry',
      'codified_law', 'expand_bureaucracy'],
    opposedPolicies: ['reduce_officials',
      'anti_corruption', 'civil_service_reform'],
    unlockCondition: { governmentEstablished: true }
  },

  military: {
    name: '军方',
    icon: '⚔️',
    basedOn: 'soldier',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: {
      minMilitaryBudget: 0.1,  // want 10% of GDP
      minWeaponsSupply: 0.8,
      minDefenseRating: 0.3,
      minBarracksCount: 1
    },
    currentDemandsMet: 0,
    politicalStance: 'conservative',
    supportedPolicies: ['conscription',
      'weapon_forging', 'fortification',
      'expand_military'],
    opposedPolicies: ['disarmament',
      'reduce_military_budget'],
    unlockCondition: { tech: 'militia' }
  },

  scholars: {
    name: '学者阶层',
    icon: '📚',
    basedOn: 'scholar',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: {
      minLiteracyRate: 0.2,
      minSchoolCount: 2,
      minResearchBudget: 0.05,
      minAdminTalent: 50
    },
    currentDemandsMet: 0,
    politicalStance: 'reformist',
    supportedPolicies: ['imperial_exam',
      'expand_schools', 'research_funding',
      'papermaking'],
    opposedPolicies: ['anti_intellectualism',
      'reduce_education'],
    unlockCondition: { secondaryGraduates: 10 }
  },

  craftsmen: {
    name: '工匠行会',
    icon: '🔨',
    basedOn: 'worker',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: {
      minWorkerWage: 0.8,    // want wage > 0.8x avg
      minIronToolsSupply: 10,
      maxWorkHours: 1.0,     // no overwork
      minCraftBuildings: 1   // want blacksmith/kiln
    },
    currentDemandsMet: 0,
    politicalStance: 'reformist',
    supportedPolicies: ['iron_tools_subsidy',
      'craft_guild_rights', 'workshop_expansion'],
    opposedPolicies: ['price_control',
      'foreign_goods_import'],
    unlockCondition: {
      buildings: ['blacksmith', 'kiln']
    }
  }
}

**Interest group size calculation:**
farmerGuild.size = farmerPop.size * 100
merchantGuild.size = merchantPop.size * 100
bureaucracy.size = officialPop.size * 100
military.size = state.buildings.barracks.count * 100
scholars.size = scholarPool
craftsmen.size = workerPop.size * 100

**Political power calculation:**
power = size * (literacy / 100) *
  (satisfaction / 50) * wealthFactor

wealthFactor:
- merchant: wealth / averageWealth
- farmer: 0.5 (low political power base)
- official: 2.0 (high structural power)
- military: 1.5 (armed)
- scholar: 1.5 (educated)
- craftsmen: 0.8

**Demands satisfaction calculation:**
Each year check if demands are met:
- For each demand condition: met(1) or not(0)
- currentDemandsMet = sum(met) / total demands
- satisfaction changes:
  currentDemandsMet > 0.8: satisfaction += 5
  currentDemandsMet > 0.6: satisfaction += 2
  currentDemandsMet < 0.4: satisfaction -= 5
  currentDemandsMet < 0.2: satisfaction -= 10
- satisfaction capped 0-100

**Political pressure effects:**
When group satisfaction < 40:
- farmerGuild: farmerEventModifier -= 10
  yearLog: "农民公会不满，农村怨声载道"
- merchantGuild: commerceGDP *= 0.95
  yearLog: "商人行会抵制，商业活动受阻"
- bureaucracy: all institution efficiency -= 10%
  yearLog: "官僚集团消极，行政效率下降"
- military: defenseRating -= 0.1
  yearLog: "军方不满，军心涣散"
- scholars: techResearchSpeed -= 20%
  yearLog: "学者离心，科研进展迟缓"
- craftsmen: building construction cost += 20%
  yearLog: "工匠罢工，建设成本上升"

When group satisfaction < 20 for 3+ years:
- Political crisis triggered
- stabilityIndex -= 20
- yearLog: "[危机] XXX 发动政治运动"

**Player policy responses:**
New policy options per group:

Appease farmerGuild:
- Cost: 2,000,000 grain
- Effect: farmerGuild.satisfaction += 20
- Cooldown: 5 years

Appease merchantGuild:
- Cost: reduce commerceTaxRate by 5% for 3 years
- Effect: merchantGuild.satisfaction += 15

Suppress dissent:
- Available when any group satisfaction < 30
- Cost: stabilityIndex -= 10
- Effect: group.satisfaction += 10
- Risk: if used 3+ times same group:
  satisfaction -= 20 (backfire)

**New file: js/society/interestGroups.js**
Contains:
- initInterestGroups(state)
- updateInterestGroups(state)
- calculateGroupPower(group, state)
- checkGroupDemands(group, state)
- applyGroupPressure(state)
- getGroupPolicyOptions(state)

**Pipeline integration:**
Add after updateSatisfaction phase:
{ name: 'updateInterestGroups',
  fn: updateInterestGroups }

**New UI section in 社会 tab:**
Interest groups panel:
- Each group: name / size / satisfaction / power
- Demands met percentage bar
- Color: green(>60) / yellow(40-60) / red(<40)
- Appease button when satisfaction < 50
- Crisis warning when satisfaction < 20

**Files to create:**
- js/society/interestGroups.js

**Files to modify:**
- js/state.js (add interestGroups)
- js/game.js (add to pipeline)
- js/ui/render_society.js (add groups panel)
- index.html (add script tag)

**Do NOT touch:** any economy/ buildings/
diplomacy/ tech/ ui/render_world.js
ui/render_economy.js ui/render_buildings.js
ui/render_map.js

**Definition of Done (Phase 10I):**
- 6 interest groups initialized
- Groups unlock based on conditions
- Demands checked each year
- Satisfaction changes from demand satisfaction
- Political pressure applied when unhappy
- Crisis triggers after 3 years < 20 satisfaction
- Appease policy options work
- UI shows all groups with status
- yearLog records group pressure events
## Current Phase: Bugfix — Next Year + Grain Treasury + Labor Cap

### Problems
1. bindEvents() calls renderAll(state) — missing callbacks cause silent render failure.
2. advanceYear() writes to gameState.world.* but UI reads gameState.agriculture.*.
3. grainTreasury resets to 0 after year advance.
4. farmingLaborAllocated exceeds totalLaborForce.

### Fix 1 — bindEvents() in game.js
Replace Next Year button handler:
  btn.addEventListener('click', () => {
    try {
      advanceYear(state);
      render();
      saveGame(state);
    } catch (err) {
      console.error('Next Year failed:', err);
      alert('Next Year failed: ' + (err?.message ?? String(err)));
    }
  });

### Fix 2 — end of advanceYear() in game.js
Add sync block:
  gameState.agriculture.grainTreasury        = gameState.world.grainTreasury;
  gameState.agriculture.actualGrainOutput    = gameState.world.actualGrainOutput;
  gameState.agriculture.potentialGrainOutput = gameState.world.potentialGrainOutput;
  gameState.agriculture.lostGrainOutput      = gameState.world.lostGrainOutput;

### Fix 3 — grainTreasury audit
- agriculture.js: use += not =
- commodityMarket.js: must not write to grainTreasury
- state.js: initial value must be 15000000

### Fix 4 — labor.js
After computing farmingLaborAllocated:
  farmingLaborAllocated = Math.min(farmingLaborAllocated, laborForce);
All sector allocations must sum to <= laborForce.

### Acceptance criteria
- Next Year updates all panels visibly
- grainTreasury non-zero after year 1
- farmingLaborAllocated <= totalLaborForce
- npm test passes
## Current Phase: Phase 11A — Trade Contracts

### Goal
Replace manual annual imports with long-term trade contracts that auto-execute each year.

### New file: js/diplomacy/tradeContracts.js
Implement:
- createTradeContract(state, params) — add contract to state.tradeContracts
- cancelTradeContract(state, contractId) — set active=false
- processTradeContracts(state) — called each year in pipeline, executes all active contracts
- getContractFulfillmentRisk(state, contractId) — returns 'low'/'medium'/'high'

Contract object shape:
{
  id: string,
  partnerId: string,
  commodity: string,
  direction: 'import'|'export',
  amountPerYear: number,
  priceMode: 'fixed'|'market',
  fixedPrice: number,
  priceMultiplier: number,
  durationYears: number,
  yearsRemaining: number,
  paymentAsset: 'grain'|'coupon',
  active: boolean,
  minAttitudeRequired: number,
  reliability: number,
  breachPenalty: { attitude: number, compensation: number }
}

processTradeContracts logic:
- Skip if active=false or yearsRemaining<=0
- Skip if partner attitude < minAttitudeRequired
- deliverAmount = min(amountPerYear, partnerCommodityStock) * reliability
- Deduct payment from player treasury
- Transfer commodity to player
- Deduct commodity from partner stock
- Add payment to partner grain treasury
- yearsRemaining -= 1
- If yearsRemaining == 0, set active=false

### Modify: js/state.js
Add to initial state:
  tradeContracts: []

### Modify: js/game.js
In advanceYear() pipeline, after updateDiplomacy, add:
  processTradeContracts(gameState);

### Modify: js/diplomacy/xikou.js
Remove or disable the old one-time manual import logic for salt/cloth/dung.
Keep updateXikouVillageEconomy() unchanged.

### Modify: js/ui/render_diplomacy.js
In the Xikou diplomacy panel, replace manual import buttons with:
- List of active contracts (commodity, amount/year, price, years remaining, risk)
- Button: "Sign Salt Import Contract" (50000/yr, fixed price 4, 5 years)
- Button: "Sign Cloth Import Contract" (10000/yr, fixed price 2, 5 years)
- Button: "Sign Dung Import Contract" (5000/yr, fixed price 1, 5 years)
- Button: "Cancel" next to each active contract

### Modify: index.html
Add script tag for js/diplomacy/tradeContracts.js before game.js.

### Acceptance criteria
- Contracts auto-execute each year without player input
- Player grain/coupon decreases by correct payment amount
- Player commodity stock increases by correct delivery amount
- Xikou stock decreases accordingly
- Contract expires after durationYears
- If Xikou stock insufficient, partial delivery occurs
- npm test passes
## Current Phase: Phase 11B — Generic Foreign Polity Engine

### Goal
Abstract world.xikou into a generic foreignPolities system.
All external entities share one data model and one update function.

### New file: js/diplomacy/foreignPolities.js
Implement:
- initForeignPolities(state) — populate state.foreignPolities with xikou and northernTraders
- updateForeignPolities(state) — called each year, runs economy update for all polities
- getForeignPolity(state, id) — returns polity object by id

Generic polity object shape:
{
  id: string,
  name: string,
  type: 'village'|'traders'|'tribe'|'town'|'city',
  population: number,
  laborForce: number,
  commodities: { grain: number, salt: number, cloth: number, dung: number },
  production: { farmlandMu: number, saltMines: number, mulberryLandMu: number },
  prices: { grain: number, salt: number, cloth: number },
  diplomacy: { attitudeToPlayer: number, trust: number, dependency: number }
}

updateForeignPolities logic (per polity):
- Grow population 0.5%/year
- Update laborForce = population * 0.6
- Produce grain from farmlandMu (same formula as player: farmlandMu / 10 * 360)
- Produce salt from saltMines (200000 per mine per year)
- Produce cloth from mulberryLandMu (mulberryLandMu * 0.3)
- Cap all commodity stocks at reasonable maximums to prevent overflow

### Modify: js/state.js
- Add foreignPolities: {} to initial state
- Keep world.xikou as-is for backward compatibility (do not remove)
- Add foreignPolities.xikou mirroring current world.xikou values
- Add foreignPolities.northernTraders with initial values:
    population: 500, laborForce: 300,
    commodities: { grain: 100000, salt: 0, cloth: 5000, dung: 0 },
    production: { farmlandMu: 0, saltMines: 0, mulberryLandMu: 0 },
    prices: { grain: 1.2, salt: 5, cloth: 3 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 }

### Modify: js/game.js
In advanceYear() pipeline, replace updateXikouVillageEconomy(gameState) with:
  updateForeignPolities(gameState);
Keep updateXikouVillageEconomy import in case it is still needed internally.

### Modify: js/diplomacy/tradeContracts.js
Update processTradeContracts to read partner stock from:
  state.foreignPolities[contract.partnerId].commodities[contract.commodity]
instead of world.xikou directly.

### Modify: js/ui/render_diplomacy.js
- Xikou panel: read data from state.foreignPolities.xikou
- Add a Northern Traders panel showing: population, commodities, attitude, trust
- Northern Traders panel is display-only for now (no trade buttons yet)

### Modify: index.html
Add script tag for js/diplomacy/foreignPolities.js before game.js.

### Acceptance criteria
- updateForeignPolities runs each year for all polities
- Xikou production numbers unchanged from Phase 11A behavior
- northernTraders appears on diplomacy tab (display only)
- tradeContracts still execute correctly reading from foreignPolities
- world.xikou still exists (no broken references)
- npm test passes
## Current Phase: Phase 11C — Bilateral Dependency & Trade Disruption

### Goal
Make trade contracts create real strategic dependencies.
Supply disruptions cascade into price spikes, satisfaction drops, and diplomatic consequences.

### Modify: js/diplomacy/tradeContracts.js
Add to processTradeContracts logic:

Breach detection:
- If deliverAmount < amountPerYear * 0.5, count as breach
- On breach: partner diplomacy.attitudeToPlayer += breachPenalty.attitude
- On breach: log event to state.yearLog

Payment failure detection:
- If player cannot afford payment (grain/coupon insufficient):
  - deliverAmount = 0
  - partner diplomacy.attitudeToPlayer -= 15
  - partner diplomacy.trust -= 10
  - log payment failure to state.yearLog

Dependency tracking:
- After processing all contracts, compute for each commodity:
  importDependency[commodity] = totalImportedThisYear[commodity] / totalConsumedThisYear[commodity]
- Store in state.tradeState.importDependency

Add new functions:
- getTradeRisk(state) — returns object with commodity risk levels
  - dependency > 0.5 and single supplier: 'critical'
  - dependency > 0.3: 'high'
  - dependency > 0.1: 'medium'
  - else: 'low'

### New file: js/economy/tradeEffects.js
Implement:
- applyTradeDisruption(state, commodity, shortfallAmount)
  - Increases commodity market price by shortfall ratio
  - If salt shortfall > 30%: farmerSatisfaction -= 15, merchantSatisfaction -= 10
  - If cloth shortfall > 30%: farmerSatisfaction -= 10
  - Log disruption event to state.yearLog

- applyTradeDependencyEffects(state)
  - Called each year after processTradeContracts
  - For each commodity where importDependency > 0.5:
    - stabilityIndex -= 5 per year
    - Log warning to state.yearLog

### Modify: js/state.js
Add to initial state:
  tradeState: {
    importDependency: { salt: 0, cloth: 0, dung: 0, grain: 0 },
    lastYearImports: { salt: 0, cloth: 0, dung: 0, grain: 0 },
    disruptions: []
  }

### Modify: js/game.js
In advanceYear() pipeline, after processTradeContracts:
  applyTradeDependencyEffects(gameState);

### Modify: js/ui/render_diplomacy.js
Add trade risk panel showing:
- Per commodity: dependency ratio, risk level, active contracts count
- Warning highlight if risk is 'critical' or 'high'
- Recent disruption events from state.tradeState.disruptions (last 3)

### Modify: index.html
Add script tag for js/economy/tradeEffects.js before game.js.

### Acceptance criteria
- Payment failure triggers attitude penalty and yearLog entry
- Partial delivery triggers breach logic
- importDependency computed correctly each year
- Salt shortfall > 30% reduces farmerSatisfaction
- High dependency reduces stabilityIndex
- Trade risk panel visible in diplomacy tab
- npm test passes
## Current Phase: Phase 11D — New Polities: Southern Tribe & Salt Lake Town

### Goal
Add two new foreign polities to foreignPolities system.
Both are resource-type Level 1 entities (no complex economy).

### Modify: js/diplomacy/foreignPolities.js
Add to initForeignPolities():

foreignPolities.southernTribe:
{
  id: 'southernTribe',
  name: '南部部落',
  type: 'tribe',
  population: 2000,
  laborForce: 1200,
  commodities: { grain: 200000, salt: 0, cloth: 3000, dung: 0, herb: 50000 },
  production: { farmlandMu: 2000, saltMines: 0, mulberryLandMu: 0, herbFields: 500 },
  prices: { grain: 1, cloth: 2, herb: 3 },
  diplomacy: { attitudeToPlayer: -20, trust: 20, dependency: 0 }
}

foreignPolities.saltLakeTown:
{
  id: 'saltLakeTown',
  name: '盐湖镇',
  type: 'town',
  population: 4000,
  laborForce: 2400,
  commodities: { grain: 300000, salt: 800000, cloth: 5000, dung: 0 },
  production: { farmlandMu: 4000, saltMines: 5, mulberryLandMu: 0 },
  prices: { grain: 1, salt: 3, cloth: 2.5 },
  diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 }
}

Update updateForeignPolities() to handle:
- herbFields production: herbFields * 200 herb per year
- Add herb to commodity production loop

### Modify: js/state.js
Add herb to tradeState tracking:
  importDependency: { salt: 0, cloth: 0, dung: 0, grain: 0, herb: 0 }
  lastYearImports: { salt: 0, cloth: 0, dung: 0, grain: 0, herb: 0 }

### Modify: js/ui/render_diplomacy.js
Add panels for southernTribe and saltLakeTown showing:
- population, laborForce, commodities, attitude, trust
- southernTribe: starts hostile (attitude -20), show warning
- saltLakeTown: neutral, show available trade goods (salt)
- Both panels display-only for now (no contract buttons yet)
- Panels only visible after player has sent envoy (unlocked via diplomacy)
- Before envoy: show fog panel "未探明势力"

### Modify: js/diplomacy/xikou.js
Add sendEnvoy logic stub:
- state.diplomacy.envoysSent = state.diplomacy.envoysSent || {}
- envoysSent[polityId] = true unlocks full panel for that polity

### Modify: js/state.js
Add to initial state:
  diplomacy: {
    envoysSent: { xikou: true, northernTraders: false, southernTribe: false, saltLakeTown: false }
  }

### Acceptance criteria
- southernTribe and saltLakeTown appear in diplomacy tab (fogged until envoy sent)
- Both polities produce resources each year via updateForeignPolities
- herb commodity tracked in tradeState
- Sending envoy to southernTribe or saltLakeTown reveals full panel
- npm test passes
## Current Phase: Phase 11E — New Polities: Copper Mountain City & River Port

### Goal
Add two economic-type Level 2 polities with more complex production and trade potential.

### Modify: js/diplomacy/foreignPolities.js
Add to initForeignPolities():

foreignPolities.copperMountainCity:
{
  id: 'copperMountainCity',
  name: '铜山城',
  type: 'city',
  population: 8000,
  laborForce: 4800,
  commodities: { grain: 500000, salt: 0, cloth: 8000, dung: 0, iron: 200000, copper: 300000 },
  production: { farmlandMu: 6000, saltMines: 0, mulberryLandMu: 0, ironMines: 3, copperMines: 5 },
  prices: { grain: 1.2, cloth: 2.5, iron: 6, copper: 8 },
  diplomacy: { attitudeToPlayer: 0, trust: 40, dependency: 0 },
  gdp: 2000000,
  militaryStrength: 500
}

foreignPolities.riverPort:
{
  id: 'riverPort',
  name: '河口商港',
  type: 'city',
  population: 10000,
  laborForce: 6000,
  commodities: { grain: 800000, salt: 100000, cloth: 50000, dung: 0, iron: 50000, silk: 30000 },
  production: { farmlandMu: 5000, saltMines: 1, mulberryLandMu: 2000, ironMines: 1, copperMines: 0 },
  prices: { grain: 1.1, salt: 4, cloth: 2, iron: 5, silk: 15 },
  diplomacy: { attitudeToPlayer: 10, trust: 50, dependency: 0 },
  gdp: 5000000,
  militaryStrength: 800
}

Update updateForeignPolities() to handle:
- ironMines production: ironMines * 100000 iron per year
- copperMines production: copperMines * 80000 copper per year
- silk production: mulberryLandMu * 0.1 silk per year
- GDP update: gdp = sum of all commodity stocks * average price * 0.01

### Modify: js/state.js
Add iron, copper, silk to tradeState tracking:
  importDependency: { salt: 0, cloth: 0, dung: 0, grain: 0, herb: 0, iron: 0, copper: 0, silk: 0 }
  lastYearImports: { salt: 0, cloth: 0, dung: 0, grain: 0, herb: 0, iron: 0, copper: 0, silk: 0 }

Add to diplomacy.envoysSent:
  copperMountainCity: false
  riverPort: false

### Modify: js/ui/render_diplomacy.js
Add panels for copperMountainCity and riverPort:
- Show population, gdp, militaryStrength, commodities, attitude, trust
- riverPort: highlight as major trading hub, show silk and iron availability
- copperMountainCity: highlight iron and copper as key exports
- Both fogged until envoy sent
- Add "Sign Contract" buttons for iron, copper, silk imports
  (reuse existing createTradeContract logic from Phase 11A)

### Modify: js/economy/tradeEffects.js
Add iron and copper to disruption logic:
- If iron shortfall > 30%: merchantSatisfaction -= 10, buildingProductionPenalty += 20%
- buildingProductionPenalty stored in state.tradeState.buildingProductionPenalty

### Modify: js/state.js
Add to tradeState:
  buildingProductionPenalty: 0

### Acceptance criteria
- copperMountainCity and riverPort appear fogged in diplomacy tab
- Both produce iron/copper/silk each year
- Envoy reveals full panel and contract buttons
- Iron shortfall applies building production penalty
- All 5 polities (xikou, northernTraders, southernTribe, saltLakeTown, copperMountainCity, riverPort) update each year
- npm test passes
## Current Phase: Phase 11F — Foreign Polity Domestic Demand & Dynamic Prices

### Goal
Foreign polities consume their own resources each year and update prices based on
supply/demand. They are no longer just resource stockpiles.

### Modify: js/diplomacy/foreignPolities.js

Add domesticDemand calculation per polity:
  grain demand = polity.population * 360
  salt demand  = polity.population * 15
  cloth demand = polity.population * 0.3
  herb demand  = polity.population * 0.05
  iron demand  = (polity.militaryStrength || 0) * 0.02
  copper demand = (polity.industryLevel || 1) * 500
  silk demand  = polity.population * 0.01

Store in polity.domesticDemand = { grain, salt, cloth, herb, iron, copper, silk }

Update updateForeignPolities() loop — after production, apply domestic consumption:
  for each commodity:
    polity.commodities[commodity] = Math.max(0,
      polity.commodities[commodity] + production[commodity] - domesticDemand[commodity]
    )

Add updateForeignPrices(polity):
  for each commodity:
    supply = polity.commodities[commodity]
    demand = polity.domesticDemand[commodity]
    if supply <= 0: supply = 1
    elasticity = 0.5
    targetPrice = polity.prices[commodity] * Math.pow(demand / supply, elasticity)
    targetPrice = Math.max(basePriceFloor[commodity], Math.min(basePriceCap[commodity], targetPrice))
    polity.prices[commodity] = lerp(polity.prices[commodity], targetPrice, 0.3)

Base price floors and caps:
  grain: floor 0.5, cap 5
  salt:  floor 2,   cap 20
  cloth: floor 1,   cap 10
  herb:  floor 1,   cap 15
  iron:  floor 3,   cap 30
  copper:floor 4,   cap 40
  silk:  floor 5,   cap 60

Add updateForeignStress(polity):
  shortages = 0
  for each commodity where domesticDemand > 0:
    if polity.commodities[commodity] < domesticDemand[commodity] * 0.5:
      shortages += 1
  polity.economicStress = Math.min(100, shortages * 20)

  Diplomatic effect:
  if polity.economicStress > 60:
    polity.diplomacy.attitudeToPlayer += 2 (if player exports food to them)
  if grain shortage:
    polity.diplomacy.trust -= 1

Store polity.economicStress in state.

### Modify: js/state.js
Add industryLevel to copperMountainCity and riverPort initial data:
  copperMountainCity.industryLevel = 3
  riverPort.industryLevel = 2
  (others default to 1)

### Modify: js/ui/render_diplomacy.js
In each polity panel, add economy section showing:
- domesticDemand per commodity
- current stock vs demand ratio (green if >1, yellow if 0.5-1, red if <0.5)
- economicStress value
- current prices for key commodities

### Acceptance criteria
- Each polity consumes resources annually
- Stockpiles no longer grow unbounded
- Prices update based on supply/demand each year
- economicStress computed and visible in diplomacy panel
- Grain shortage reduces polity trust over time
- npm test passes
## Current Phase: Phase 11G — Trade Contract Risk Model

### Goal
Contract fulfillment is no longer binary. Each contract has a fulfillment rate
based on partner stock, trust, attitude, and economic stress.

### Modify: js/diplomacy/tradeContracts.js

Add calculateFulfillmentRate(state, contract):
  polity = state.foreignPolities[contract.partnerId]
  
  stockRatio = polity.commodities[contract.commodity] / contract.amountPerYear
  stockMultiplier = Math.min(1, stockRatio)

  trustMultiplier = polity.diplomacy.trust / 100

  attitudeMultiplier = polity.diplomacy.attitudeToPlayer < 0
    ? Math.max(0.3, 1 + polity.diplomacy.attitudeToPlayer / 100)
    : 1

  stressMultiplier = Math.max(0.2, 1 - polity.economicStress / 200)

  fulfillmentRate = stockMultiplier * trustMultiplier * attitudeMultiplier * stressMultiplier
  fulfillmentRate = Math.max(0, Math.min(1, fulfillmentRate))

  return fulfillmentRate

Update processTradeContracts():
  Replace fixed reliability multiplier with calculateFulfillmentRate()
  delivered = contract.amountPerYear * fulfillmentRate
  shortfall = contract.amountPerYear - delivered

  Store on contract:
    contract.lastFulfillmentRate = fulfillmentRate
    contract.lastDelivered = delivered
    contract.lastShortfall = shortfall

  If fulfillmentRate < 0.5:
    count as breach
    apply breachPenalty
    log to state.yearLog

  If fulfillmentRate < 0.8:
    log warning to state.yearLog

Add getContractFulfillmentRisk(state, contractId):
  rate = contract.lastFulfillmentRate
  if rate >= 0.9: return 'low'
  if rate >= 0.7: return 'medium'
  if rate >= 0.5: return 'high'
  return 'critical'

### Modify: js/state.js
Add to each contract shape (tradeContracts array):
  lastFulfillmentRate: 1,
  lastDelivered: 0,
  lastShortfall: 0

### Modify: js/ui/render_diplomacy.js
In contract list display, show per contract:
- Fulfillment rate last year (%)
- Amount delivered vs requested
- Risk level (color coded: green/yellow/orange/red)
- Shortfall amount if any

### Acceptance criteria
- Fulfillment rate computed from stock, trust, attitude, stress
- Partial delivery triggers shortfall and disruption effects
- Breach logged when fulfillmentRate < 0.5
- Contract panel shows fulfillment rate and risk level
- npm test passes
## Current Phase: Phase 11H — Trade Route Capacity

### Phase goal
Add trade route objects that cap how much can be delivered per contract per year.
Road level, trade bureau efficiency, and security all affect capacity.
Without this, signed contracts can deliver unlimited goods regardless of infrastructure.

### New data: state.tradeRoutes
Add to js/state.js initial state:
  tradeRoutes: {
    xikou:              { roadLevel: 1, capacity: 100000, security: 0.9 },
    northernTraders:    { roadLevel: 1, capacity: 80000,  security: 0.7 },
    southernTribe:      { roadLevel: 0, capacity: 40000,  security: 0.5 },
    saltLakeTown:       { roadLevel: 1, capacity: 120000, security: 0.8 },
    copperMountainCity: { roadLevel: 1, capacity: 100000, security: 0.75 },
    riverPort:          { roadLevel: 2, capacity: 200000, security: 0.85 }
  }

roadLevel: 0=dirt path, 1=maintained road, 2=paved road
capacity: max total goods deliverable per year across all contracts with this partner
security: multiplier on actual delivery (bandit risk etc.)

### Modify: js/diplomacy/tradeContracts.js

Update calculateFulfillmentRate(state, contract):
  Add transportMultiplier:
    route = state.tradeRoutes[contract.partnerId]
    if no route: transportMultiplier = 0.5
    else:
      usedCapacity = sum of amountPerYear for all active contracts with same partnerId
      capacityRatio = Math.min(1, route.capacity / Math.max(1, usedCapacity))
      transportMultiplier = capacityRatio * route.security

  Multiply into final fulfillmentRate:
    fulfillmentRate = stockMultiplier * trustMultiplier * attitudeMultiplier
                    * stressMultiplier * transportMultiplier
    fulfillmentRate = Math.max(0, Math.min(1, fulfillmentRate))

Add updateTradeRouteCapacity(state):
  Called once per year in advanceYear() after processTradeContracts.
  For each route:
    base = roadLevel * 50000 + 50000
    bureauBonus = institutions.tradeBureau active ? tradeBureauEfficiency * 500 : 0
    route.capacity = base + bureauBonus

### Modify: js/game.js
In advanceYear() pipeline, after processTradeContracts:
  updateTradeRouteCapacity(gameState);

### Modify: js/ui/render_diplomacy.js
In each polity panel, add trade route section showing:
  - Road level (dirt/maintained/paved)
  - Annual capacity (total goods/year)
  - Current usage (sum of active contract volumes)
  - Security rating (%)
  - Warning if usage > 80% of capacity

### Acceptance criteria
- state.tradeRoutes exists with all 6 partners
- Contracts with same partner share capacity pool
- High contract volume reduces fulfillmentRate via capacityRatio
- Trade bureau improves capacity each year
- Route info visible in diplomacy panel
- npm test passes
## Current Phase: Phase 12A — ForeignPolities Authority Migration + Random Events Framework

### Part 1: ForeignPolities Authority Migration

#### Problem
state.world.xikou and state.foreignPolities.xikou both exist.
This causes double-source bugs where trade contracts write to foreignPolities.xikou
but UI/map reads world.xikou, and updateXikouVillageEconomy() writes world.xikou again.

#### Goal
Make foreignPolities.xikou the single authoritative source.
world.xikou becomes a read-only compatibility alias that mirrors foreignPolities.xikou.
updateXikouVillageEconomy() is replaced by the generic updateForeignPolities() loop.

#### Modify: js/state.js
- Keep world.xikou as shallow alias: world.xikou = foreignPolities.xikou (by reference)
- Remove all duplicate field definitions in world.xikou
- Remove these old one-time trade fields from world:
    saltTradeUsed, clothTradeUsed, saltImportQuota, clothImportQuota,
    actualSaltImport, clothTradeReceived, dungImportQuota
- Add to state: oneTimeTrades: [] for any remaining manual trades (future use)

#### Modify: js/diplomacy/xikou.js
- Remove updateXikouVillageEconomy() economy update logic entirely
- Keep only: sendEnvoy(), getXikouAttitudeLabel(), getXikouDiplomacyOptions()
- All economy updates now handled by updateForeignPolities() in foreignPolities.js

#### Modify: js/game.js
- Remove import of updateXikouVillageEconomy
- Confirm pipeline order is exactly:
    1. resetAnnualFlags
    2. ageCohorts
    3. allocateLabor
    4. updateForeignPolities        ← foreign production first
    5. produceGoods                 ← domestic production
    6. settleMarket
    7. processTradeContracts        ← execute contracts after both sides produced
    8. applyTradeEffects            ← cascading effects
    9. updateTradeRouteCapacities
    10. collectTaxes
    11. payWages
    12. updateMoney
    13. processPendingConstruction
    14. updateInstitutions
    15. updateEducation
    16. updateResearch
    17. updateDiplomacy
    18. updateSatisfaction
    19. updateInterestGroups
    20. triggerEvents
    21. finalizeLedger
    22. checkUnlocks
    23. updateYearLog
- After advanceYear(), sync alias: gameState.world.xikou = gameState.foreignPolities.xikou

#### Modify: js/ui/render_map.js and js/ui/render_diplomacy.js
- Replace all reads of state.world.xikou.* with state.foreignPolities.xikou.*

---

### Part 2: Random Events Framework

#### Goal
Add a random events system with 20 starter events.
Each year, 1-3 events may fire based on conditions.
Events modify state and appear in yearLog and a new Events tab.

#### New file: js/events/eventDefinitions.js
Define array EVENTS of 20 events. Each event shape:
{
  id: string,
  name: string,
  category: 'agriculture'|'economy'|'society'|'diplomacy'|'disaster',
  description: string,
  condition: (state) => boolean,
  probability: number,          // 0.0 - 1.0, checked if condition passes
  effect: (state) => void,      // directly mutates state
  cooldownYears: 0,             // years before this event can fire again
  repeatable: boolean
}

Include these 20 events:

Agriculture (5):
1. drought: condition: rainfall < 0.6, prob 0.3
   effect: actualGrainOutput *= 0.6, farmerSatisfaction -= 20
2. bumper_harvest: condition: rainfall > 0.8 and farmingLabor adequate, prob 0.25
   effect: actualGrainOutput *= 1.3, farmerSatisfaction += 10
3. locust_plague: condition: year % 7 == 0, prob 0.2
   effect: actualGrainOutput *= 0.4, grainTreasury -= 500000
4. irrigation_breakthrough: condition: waterIrrigationUnlocked and techPoints > 500, prob 0.1
   effect: farmlandYield += 0.1 permanently
5. seed_shortage: condition: grainTreasury < 1000000, prob 0.4
   effect: actualGrainOutput *= 0.8

Economy (5):
6. merchant_boom: condition: commerceTalent > 100, prob 0.2
   effect: merchantSatisfaction += 15, couponCirculating *= 1.1
7. counterfeit_coins: condition: inflationRate > 15, prob 0.3
   effect: backingRatio -= 0.05, merchantSatisfaction -= 10
8. trade_route_bandits: condition: any route.security < 0.7, prob 0.35
   effect: random active contract fulfillmentRate -= 0.2 this year
9. salt_price_spike: condition: saltImportDependency > 0.5, prob 0.25
   effect: commodityPrices.salt *= 1.5, farmerSatisfaction -= 10
10. market_panic: condition: inflationRate > 25 and merchantSatisfaction < 40, prob 0.3
    effect: couponCirculating *= 0.85 (hoarding), merchantSatisfaction -= 20

Society (4):
11. epidemic: condition: sanitationLevel < 30, prob 0.2
    effect: population -= population * 0.03, farmerSatisfaction -= 15
12. baby_boom: condition: farmerSatisfaction > 70 and grainTreasury > 5000000, prob 0.15
    effect: birthRate += 0.01 for 3 years
13. scholar_exodus: condition: scholarSatisfaction < 30, prob 0.3
    effect: adminTalent -= 50, techTalent -= 30
14. peasant_uprising: condition: stabilityIndex < 25 and farmerSatisfaction < 20, prob 0.5
    effect: stabilityIndex -= 20, grainTreasury -= 200000

Diplomacy (3):
15. xikou_gift: condition: xikou attitude > 60, prob 0.2
    effect: foreignPolities.xikou.commodities.salt += 50000
16. northern_traders_arrive: condition: northernTradersEnvoy sent, prob 0.3
    effect: foreignPolities.northernTraders.diplomacy.attitudeToPlayer += 10
17. border_dispute: condition: any polity attitude < -30, prob 0.25
    effect: that polity attitude -= 15, tradeRoute.security -= 0.1

Disaster (3):
18. flood: condition: rainfall > 0.9, prob 0.2
    effect: farmlandMu -= 1000, grainTreasury -= 300000, stabilityIndex -= 10
19. fire_in_granary: condition: true, prob 0.05
    effect: grainTreasury -= grainTreasury * 0.1
20. earthquake: condition: true, prob 0.02
    effect: random building damaged, stabilityIndex -= 15, population -= 200

#### New file: js/events/eventEngine.js
Implement:
- initEventState(state): add to state:
    eventState: {
      activeEvents: [],
      eventHistory: [],
      eventCooldowns: {},
      rainfall: 0.7
    }
- updateRainfall(state): rainfall = clamp(rainfall + random(-0.2, 0.2), 0.3, 1.0)
- triggerEvents(state):
    updateRainfall(state)
    fired = []
    for each event in EVENTS:
      if cooldown active: skip
      if not event.condition(state): skip
      if Math.random() > event.probability: skip
      event.effect(state)
      fired.push(event)
      set cooldown
      log to state.yearLog and state.eventState.eventHistory
    return fired

#### Modify: js/game.js
- Import triggerEvents from js/events/eventEngine.js
- Replace existing triggerEvents() stub with new import
- Pipeline step 20 already says triggerEvents — confirm it calls the new function

#### Modify: js/state.js
- Call initEventState during state initialization
- Add rainfall: 0.7 to world or eventState

#### New file: js/ui/render_events.js
Render an Events tab showing:
- This year's fired events (name, category, description, effect summary)
- Event history last 10 years (year, event name, category)
- Current rainfall indicator

#### Modify: index.html
- Add script tags for:
    js/events/eventDefinitions.js
    js/events/eventEngine.js
    js/ui/render_events.js
- Add Events tab to navigation

### Acceptance criteria
- world.xikou is alias of foreignPolities.xikou, no double writes
- updateXikouVillageEconomy no longer called
- Pipeline order matches the 23-step sequence above
- At least 1 event fires in first 10 years of simulation
- Events appear in yearLog and Events tab
- Drought reduces grain output
- Peasant uprising only fires when conditions met
- npm test passes
## Current Phase: Phase 12B — Trade System Bug Fixes

### Bug 1: Foreign polities never consume grain
In js/diplomacy/foreignPolities.js, updateForeignPolities() adds production
but never subtracts domestic consumption. Stocks grow unbounded.

Fix in updateForeignPolities() per polity:
  const grainDemand = polity.population * 360;
  const grainBalance = grainOutput - grainDemand;
  polity.commodities.grain = Math.round(
    Math.max(0, Math.min(50000000,
      (polity.commodities.grain || 0) + grainBalance
    ))
  );
  polity.foodSecurityRatio = polity.commodities.grain / Math.max(1, grainDemand);
  if (polity.foodSecurityRatio < 0.5) {
    polity.diplomacy.attitudeToPlayer += 2;
    polity.exportRestrictions = true;
  } else {
    polity.exportRestrictions = false;
  }

Apply same consumption pattern to salt, cloth, herb, iron, copper, silk
using domesticDemand values already computed in Phase 11F.

### Bug 2: Export contracts check wrong stock
In js/diplomacy/tradeContracts.js, processTradeContracts() uses partner
stock as supply limit for both import and export. Export should use player stock.

Fix:
  let supplyLimit;
  if (contract.direction === 'import') {
    supplyLimit = getPartnerCommodityStock(partner, contract.commodity);
  } else {
    supplyLimit = Math.max(0, Number(state.commodities?.[contract.commodity] ?? 0));
  }
  const requestedAmount = Math.floor(
    Math.min(contract.amountPerYear, supplyLimit) *
    Math.min(1, Math.max(0, contract.reliability || 1))
  );

Also skip export if polity.exportRestrictions === true (food security crisis).

### Bug 3: Export payment calculated on planned amount not actual delivery
In processTradeContracts(), payment must use actual delivered amount:
  const exportAmount = Math.min(deliverAmount, available);
  const totalPayment = Math.round(exportAmount * unitPrice);
  // NOT deliverAmount * unitPrice

### Bug 4: Coupon payment disappears — partner never receives it
In processTradeContracts(), when paymentAsset === 'coupon':
  Add to partner financial assets:
    partner.finance = partner.finance || { couponBalance: 0, grainIncome: 0 };
    partner.finance.couponBalance += totalPayment;
  When paymentAsset === 'grain':
    partner.commodities.grain += totalPayment;

### Modify these files only:
- js/diplomacy/foreignPolities.js
- js/diplomacy/tradeContracts.js

### Acceptance criteria
- Foreign polity grain stocks decrease each year when population > farmland capacity
- foodSecurityRatio computed and stored on each polity
- Export contracts deduct from player stock not partner stock
- Payment amount matches actual delivery not planned amount
- Coupon payments recorded in partner.finance.couponBalance
- npm test passes
## Current Phase: Phase 12C — Trade System Polish

### Bug 1: getContractFulfillmentRisk() uses wrong stock for export
In js/diplomacy/tradeContracts.js, risk assessment always checks partner stock.
Export risk should check player stock instead.

Fix:
  const stockForRisk =
    contract.direction === 'export'
      ? Math.max(0, Number(state.commodities?.[contract.commodity] ?? 0))
      : getPartnerCommodityStock(partner, contract.commodity);
Replace all uses of partnerStock in risk calculation with stockForRisk.

### Feature 1: Foreign polity dynamic prices
In js/diplomacy/foreignPolities.js, add updateForeignPrices(polity) called
at end of each polity update:

  function updateForeignPrices(polity) {
    const floors = { grain:0.5, salt:2, cloth:1, herb:1, iron:3, copper:4, silk:5 };
    const caps   = { grain:5,   salt:20,cloth:10,herb:15,iron:30,copper:40,silk:60 };
    for (const commodity of ['grain','salt','cloth','herb','iron','copper','silk']) {
      const stock  = polity.commodities[commodity] ?? 0;
      const demand = polity.domesticDemand?.[commodity] ?? 1;
      const base   = polity.prices[commodity] ?? 1;
      const pressure = demand / Math.max(1, stock);
      const target = base * Math.pow(pressure, 0.3);
      polity.prices[commodity] = Math.max(floors[commodity] ?? 0.5,
                                 Math.min(caps[commodity]   ?? 50, target));
    }
  }

### Feature 2: Foreign polity export willingness & financial behavior
In js/diplomacy/foreignPolities.js, add to each polity update:

  polity.finance = polity.finance || { couponTreasury:0, grainIncome:0, tradeIncome:0 };

  Export restrictions:
    polity.exportRestrictions = polity.exportRestrictions || {};
    polity.exportRestrictions.grain = polity.foodSecurityRatio < 0.5;
    polity.exportRestrictions.salt  = (polity.commodities.salt ?? 0) <
                                      (polity.domesticDemand?.salt ?? 0) * 1.2;

  Export willingness (affects fulfillmentRate bonus):
    polity.exportWillingness = polity.exportWillingness || {};
    for each commodity:
      surplus = stock - domesticDemand
      polity.exportWillingness[commodity] = surplus > 0
        ? Math.min(1.2, 1 + surplus / Math.max(1, domesticDemand) * 0.3)
        : Math.max(0.2, stock / Math.max(1, domesticDemand));

  In processTradeContracts(), multiply fulfillmentRate by:
    partner.exportWillingness?.[contract.commodity] ?? 1
  Skip commodity if partner.exportRestrictions?.[contract.commodity] === true.

### Fix 2: Confirm pipeline order
In js/game.js, confirm YEAR_PIPELINE contains these steps in this order:
  updateForeignPolities
  produceGoods
  settleMarket
  updateTradeRouteCapacities
  processTradeContracts
  applyTradeEffects
  collectTaxes
  payWages
  updateMoney
  processPendingConstruction
  updateInstitutions
  updateEducation
  updateResearch
  updateDiplomacy
  updateSatisfaction
  updateInterestGroups
  triggerEvents
  finalizeLedger
  checkUnlocks
  updateYearLog
If any step is missing or out of order, fix it.

### Modify these files only:
- js/diplomacy/tradeContracts.js
- js/diplomacy/foreignPolities.js
- js/game.js

### Acceptance criteria
- Export risk uses player stock not partner stock
- Foreign polity prices update each year based on supply/demand
- Polity refuses to export grain when foodSecurityRatio < 0.5
- Polity with surplus commodity has exportWillingness > 1
- Pipeline order matches the list above
- npm test passes
## Current Phase: Phase 12D — Foreign Economy & Contract Price Fixes

### Bug 1: Foreign polity grain output formula is wrong
In js/diplomacy/foreignPolities.js, current formula:
  grainOutput = (farmlandMu / 10) * 360
produces ~108000 jin for 3000 mu, but population needs 720000 jin/year.
This causes permanent food shortage and blocks all exports.

Fix:
  const grainYieldPerMu = polity.production?.grainYieldPerMu ?? 500;
  const grainOutput = farmlandMu * grainYieldPerMu;

Add grainYieldPerMu to each polity's production object in js/state.js:
  xikou:              grainYieldPerMu: 500
  northernTraders:    grainYieldPerMu: 0   (no farmland)
  southernTribe:      grainYieldPerMu: 400
  saltLakeTown:       grainYieldPerMu: 480
  copperMountainCity: grainYieldPerMu: 460
  riverPort:          grainYieldPerMu: 520

### Bug 2: Foreign polity price formula compounds on previousPrice
In js/diplomacy/foreignPolities.js, calculatePolityPrice() currently does:
  targetPrice = previousPrice * Math.pow(ratio, elasticity)
This causes runaway price drift over many years.

Fix — always anchor to basePrice:
  function calculatePolityPrice(basePrice, previousPrice, supply, demand, elasticity, minPrice, maxPrice) {
    const ratio = Math.max(0.1, demand / Math.max(1, supply));
    const target = basePrice * Math.pow(ratio, elasticity);
    return Math.max(minPrice, Math.min(maxPrice, previousPrice * 0.7 + target * 0.3));
  }

Each polity needs a basePrices object (copy of initial prices, never mutated):
  polity.basePrices = polity.basePrices || { ...polity.prices };
Pass polity.basePrices[commodity] as basePrice argument.

### Bug 3: Market-price contracts use domestic price instead of partner price
In js/diplomacy/tradeContracts.js, getContractPrice() uses:
  state.commodityPrices?.[contract.commodity]?.price
for all contracts regardless of direction.

Fix:
  function getContractPrice(state, contract, partner) {
    if (contract.priceMode === 'fixed') return contract.fixedPrice;
    const key = contract.commodity;
    const partnerPrice  = Number(partner?.prices?.[key] ?? 0);
    const domesticPrice = Number(state?.commodityPrices?.[key]?.price ?? 0);
    const referencePrice = contract.direction === 'import'
      ? (partnerPrice  || domesticPrice)
      : (domesticPrice || partnerPrice);
    return Math.max(0, referencePrice * (contract.priceMultiplier ?? 1));
  }

### Modify these files only:
- js/diplomacy/foreignPolities.js
- js/diplomacy/tradeContracts.js
- js/state.js

### Acceptance criteria
- Xikou grain output ~1500000 jin/year (3000 mu * 500)
- Xikou foodSecurityRatio stays above 0.5 under normal conditions
- Foreign polity prices stay within floor/cap bounds after 50 simulated years
- Import contract price reflects partner price not domestic price
- npm test passes
