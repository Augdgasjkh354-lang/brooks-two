# Policy-Driven Society Simulation (Phase 0)

A browser-based strategy simulation prototype focused on **progressive unlocks**.

The design goal is to avoid preloading all mechanics on day one. New systems appear only when policy, institutions, and infrastructure make them possible.

## What Phase 0 Includes

Phase 0 is intentionally small and proves 3 foundations:

1. The world advances year by year.
2. Policies can unlock systems through prerequisites.
3. The codebase is modular enough for future expansion.

Implemented systems:

- Core agricultural world state (population, labor, land, yield, tax, treasury, GDP estimate)
- Year progression with population/economy updates and narration log
- Generic policy framework with prerequisites + state mutation + unlocked systems
- Full unlock chain:
  1. Build Bank
  2. Recruit Bank Clerks
  3. Research Anti-Counterfeit Technology
  4. Issue Grain Coupons
- Grain coupon panel and issuance stats, visible only after full unlock

## Run Locally

No build step is required.

1. Open `index.html` directly in a browser.
2. Use **Next Year** to advance simulation.
3. Enact available policies in order to unlock grain coupons.
4. After unlock, use issuance controls in the grain coupon panel.

## Current Phase Boundaries

Phase 0 does **not** include advanced systems such as migration, class simulation, diplomacy, combat, maps, networking, cloud saves, or backend services.

## Future Phases (Planned Direction)

Future phases may add:

- More policy trees and institution chains
- Expanded fiscal/monetary mechanics
- Health, education, housing, and infrastructure layers
- Social stability, class behavior, and regional governance

The current architecture is organized to support this without rewriting the core loop.
