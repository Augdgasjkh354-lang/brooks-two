# Policy-Driven Society Simulation

A browser-based strategy simulation prototype where systems unlock through policy choices instead of existing from day one.

## Current Build: Phase 1

Phase 1 upgrades the Phase 0 prototype into a constrained economy where labor is scarce and sectors compete.

### Included in Phase 1

- Year progression with demographic updates
- Unified labor allocation:
  - total labor
  - agriculture labor
  - construction labor
  - commerce labor
  - idle labor
- Agriculture constrained by labor (1 labor -> 10 mu)
- Land reclamation system:
  - 1000 mu minimum unit
  - 10,000 grain per mu
  - 1 year duration
  - 100 labor per 1000 mu
  - reclaim cost contributes to construction GDP
  - reclaimed land yield curve (100 -> 200 -> 500)
- Shop construction system:
  - consumes construction labor
  - each shop needs 2 permanent workers
  - shops generate fixed commerce GDP
- GDP breakdown:
  - agriculture GDP
  - construction GDP
  - commerce GDP
- Existing policy unlock chain preserved:
  - Build Bank -> Recruit Bank Clerks -> Research Anti-Counterfeit -> Issue Grain Coupons

## Run Locally

No build tools required.

1. Open `index.html` directly in a browser.
2. Set agriculture labor target and start construction actions.
3. Press **Next Year** to resolve labor competition and yearly outcomes.
4. Enact policies to unlock grain coupons.

## Out of Scope (still not implemented)

No backend, networking, cloud saves, combat, diplomacy, schools, hospitals, stock market, housing simulation, or detailed class simulation.

## Next Direction (future phases)

Future phases can add deeper institutions, fiscal/monetary tools, social systems, and regional governance while reusing the current modular simulation loop.
