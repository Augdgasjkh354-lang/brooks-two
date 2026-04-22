export const initialState = {
  world: {
    year: 1,
    totalPopulation: 5000,
    laborForce: 3000,
    children: 1000,
    elderly: 1000,
    farmlandAreaMu: 30000,
    baseGrainYieldPerMu: 500,
    grainYieldPerMu: 500,
    farmingLaborRequired: 3000,
    farmingLaborAllocated: 3000,
    idleLabor: 0,
    farmEfficiency: 1,
    landUtilizationPercent: 100,
    potentialGrainOutput: 15000000,
    actualGrainOutput: 15000000,
    lostGrainOutput: 0,
    agriculturalTaxRate: 0.7,
    grainTreasury: 15000000,
    gdpEstimate: 18000000,
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
