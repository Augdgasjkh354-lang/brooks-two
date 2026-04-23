// Society population module

function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function updateLaborAllocation(world) {
  const requiredFarmingLabor = world.farmlandAreaMu / 10;
  const farmingLaborAllocated = Math.min(world.laborForce, requiredFarmingLabor);
  const idleLabor = Math.max(0, world.laborForce - farmingLaborAllocated);
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  world.idleLabor = clamp(idleLabor);
  world.farmEfficiency = farmEfficiency;
  world.landUtilizationPercent = farmEfficiency * 100;

  const baseYield = world.baseGrainYieldPerMu ?? world.grainYieldPerMu;
  world.baseGrainYieldPerMu = baseYield;
  world.grainYieldPerMu = clamp(baseYield * farmEfficiency);
}

function getPopulationGrowthDetails(world) {
  const baseGrowthRate = 0.02;
  const commerceProsperityBonus =
    (world.merchantIncomePerHead ?? 0) > (world.farmerIncomePerHead ?? 0) * 1.5 ? 0.005 : 0;
  const demandShortfallPenalty = world.demandShortfall ? 0.005 : 0;

  const growthRate = Math.max(0.005, baseGrowthRate + commerceProsperityBonus - demandShortfallPenalty);

  return {
    growthRate,
    baseGrowthRate,
    commerceProsperityBonus,
    demandShortfallPenalty,
  };
}

export function updatePopulation(world) {
  const total = world.totalPopulation;
  const growthDetails = getPopulationGrowthDetails(world);

  const nextTotal = clamp(total * (1 + growthDetails.growthRate));
  const nextChildren = clamp(nextTotal * 0.2);
  const nextElderly = clamp(nextTotal * 0.2);
  const nextLaborForce = clamp(nextTotal - nextChildren - nextElderly);

  world.totalPopulation = nextTotal;
  world.children = nextChildren;
  world.elderly = nextElderly;
  world.laborForce = nextLaborForce;

  world.populationGrowthRate = growthDetails.growthRate;
  world.populationGrowthBaseRate = growthDetails.baseGrowthRate;
  world.populationGrowthCommerceBonus = growthDetails.commerceProsperityBonus;
  world.populationGrowthDemandPenalty = growthDetails.demandShortfallPenalty;

  updateLaborAllocation(world);

  return {
    populationDelta: nextTotal - total,
    growthRate: growthDetails.growthRate,
    commerceProsperityBonusApplied: growthDetails.commerceProsperityBonus > 0,
    demandShortfallPenaltyApplied: growthDetails.demandShortfallPenalty > 0,
  };
}
