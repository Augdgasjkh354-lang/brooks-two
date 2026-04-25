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
