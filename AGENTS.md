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
