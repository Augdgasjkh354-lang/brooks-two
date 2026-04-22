# AGENTS.md - Working Rules

## Project Goal
Build a long-horizon, policy-driven society simulation where systems unlock progressively and the economy is constrained by finite labor.

## Repo Layout
- `index.html`, `style.css`: UI structure and presentation
- `js/state.js`: canonical game state
- `js/population.js`: demographic updates
- `js/agriculture.js`: labor-constrained farming + reclaimed land yield curve
- `js/labor.js`: labor demand and allocation resolution
- `js/construction.js`: reclamation/shop projects and completion processing
- `js/economy.js`: GDP breakdown and coupon issuance
- `js/unlocks.js`, `js/policies.js`: unlock framework and policy definitions
- `js/render.js`: UI rendering
- `js/game.js`: game loop and event wiring

## Phase 1 Scope
Implement only:
- labor allocation constraints
- labor-dependent agriculture
- land reclamation
- basic shop construction
- GDP split (agriculture/construction/commerce)
- UI for macro stats + actions + log
- preserve Phase 0 unlock chain behavior

## Architectural Rules
- Plain HTML/CSS/JavaScript only
- Keep modules focused and composable
- Keep unlock logic generic and gated
- App must run by opening `index.html`

## Important Do-Not Rules
Do not add backend, frameworks, combat, diplomacy, class simulation, or unrelated feature trees in this phase.

## Definition of Done
- Labor allocation works and is visible
- Agriculture output reflects labor shortages
- Reclamation uses labor + grain and adds land over time
- Shops use labor and produce commerce GDP
- GDP breakdown is shown by sector
- Grain coupon system remains locked until policy chain completion
