export const initialState = {
  world: {
    year: 1,
    totalPopulation: 5000,
    laborForce: 3000,
    children: 1000,
    elderly: 1000,
    farmlandAreaMu: 30000,
    grainYieldPerMu: 500,
    agriculturalTaxRate: 0.7,
    grainTreasury: 15000000,
    gdpEstimate: 0,
  },
  grainCoupons: {
    totalIssued: 0,
    governmentReserves: 0,
    circulating: 0,
  },
  systems: {
    bankBuilt: false,
    bankClerksRecruited: false,
    antiCounterfeitResearched: false,
    grainCouponsUnlocked: false,
  },
  policyHistory: [],
  yearLog: [],
};

export function createGameState() {
  return structuredClone(initialState);
}
