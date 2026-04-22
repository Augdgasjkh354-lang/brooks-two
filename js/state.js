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
  labor: {
    total: 3000,
    agriculture: 3000,
    construction: 0,
    commerce: 0,
    idle: 0,
    desiredAgriculture: 3000,
  },
  economy: {
    gdp: {
      agriculture: 0,
      construction: 0,
      commerce: 0,
      total: 0,
    },
    pendingConstructionSpending: 0,
    employmentRate: 0,
  },
  agriculture: {
    baseFarmlandMu: 30000,
    reclaimedParcels: [],
  },
  construction: {
    shopsBuilt: 0,
    projects: [],
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
