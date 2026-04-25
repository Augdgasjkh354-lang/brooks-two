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
