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
    laborAssignedCommerce: 0,
    idleLabor: 0,
    merchantCount: 0,
    farmEfficiency: 1,
    landUtilizationPercent: 100,

    shopCount: 0,
    operatingShops: 0,
    idleShops: 0,

    potentialGrainOutput: 15000000,
    actualGrainOutput: 15000000,
    lostGrainOutput: 0,

    grainDemandPerPerson: 400,
    grainDemandTotal: 0,
    grainBalance: 0,
    grainPerCapita: 0,
    grainCoverageRatio: 0,
    foodSecurityStatus: 'Unknown',
    foodSecurityIndex: 0,

    agriculturalTaxRate: 0.7,
    lastAgriculturalTax: 0,
    lastTaxCollectionYear: 0,
    grainTreasury: 15000000,

    agricultureGDP: 0,
    commerceGDP: 0,
    constructionGDP: 0,
    gdpEstimate: 18000000,

    farmerIncomePerHead: 0,
    merchantIncomePerHead: 0,
    incomeGap: 0,

    maxMarketDemand: 0,
    demandSaturation: 0,
    demandShortfall: false,
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
  economyHistory: [],
};

export function createGameState() {
  return structuredClone(initialState);
}
