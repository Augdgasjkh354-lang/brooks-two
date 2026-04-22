function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function calculateLaborAllocation(world) {
  const requiredFarmingLabor = world.farmlandAreaMu / 10;
  const farmingLaborAllocated = Math.min(world.laborForce, requiredFarmingLabor);

  const remainingAfterFarming = Math.max(0, world.laborForce - farmingLaborAllocated);
  const commerceLaborDemand = (world.shopCount ?? 0) * 5;
  const laborAssignedCommerce = Math.min(remainingAfterFarming, commerceLaborDemand);

  const idleLabor = Math.max(0, remainingAfterFarming - laborAssignedCommerce);
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  world.laborAssignedCommerce = clamp(laborAssignedCommerce);
  world.idleLabor = clamp(idleLabor);
  world.farmEfficiency = farmEfficiency;
  world.landUtilizationPercent = farmEfficiency * 100;

  return farmEfficiency;
}

function getFoodSecurityStatus(grainCoverageRatio) {
  if (grainCoverageRatio >= 1) return 'Secure';
  if (grainCoverageRatio >= 0.85) return 'Strained';
  return 'Shortage';
}

export function updateEconomy(world, options = {}) {
  const { collectTax = true } = options;

  const farmEfficiency = calculateLaborAllocation(world);

  const baseYield = world.baseGrainYieldPerMu ?? world.grainYieldPerMu;
  world.baseGrainYieldPerMu = clamp(baseYield);

  const potentialGrainOutput = clamp(world.farmlandAreaMu * world.baseGrainYieldPerMu);
  const grainOutput = clamp(potentialGrainOutput * farmEfficiency);
  const lostGrainOutput = clamp(potentialGrainOutput - grainOutput);
  const agriculturalTax = clamp(grainOutput * world.agriculturalTaxRate);

  const operatingShops = Math.min(world.shopCount ?? 0, world.merchantCount ?? 0);
  const idleShops = Math.max(0, (world.shopCount ?? 0) - operatingShops);

  const agricultureGDP = grainOutput;

  const maxMarketDemand = world.totalPopulation > 0 ? world.totalPopulation / 50 : 0;
  const demandSaturation = maxMarketDemand > 0 ? operatingShops / maxMarketDemand : 0;
  const efficiencyRate = demandSaturation > 1 ? 1 / demandSaturation : 1;
  const commerceGDP = clamp(operatingShops * 500 * efficiencyRate);

  const constructionGDP = clamp(world.constructionGDP ?? 0);
  const gdpEstimate = clamp(agricultureGDP + commerceGDP + constructionGDP);

  const grainDemandTotal = clamp(world.totalPopulation * (world.grainDemandPerPerson ?? 0));
  const grainBalance = grainOutput - grainDemandTotal;
  const grainPerCapita =
    world.totalPopulation > 0 ? clamp(grainOutput / world.totalPopulation) : 0;
  const grainCoverageRatio =
    grainDemandTotal > 0 ? clampRatio(grainOutput / grainDemandTotal) : 1;

  const farmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0
      ? (grainOutput * 0.3) / world.farmingLaborAllocated
      : 0;

  const merchantIncomePerHead =
    (world.merchantCount ?? 0) > 0 ? (commerceGDP * 0.5) / world.merchantCount : 0;

  const incomeGap = merchantIncomePerHead - farmerIncomePerHead;
  const demandShortfall = demandSaturation < 0.5;

  world.grainYieldPerMu = clamp(world.baseGrainYieldPerMu * farmEfficiency);
  world.potentialGrainOutput = potentialGrainOutput;
  world.actualGrainOutput = grainOutput;
  world.lostGrainOutput = lostGrainOutput;

  world.operatingShops = clamp(operatingShops);
  world.idleShops = clamp(idleShops);

  world.agricultureGDP = clamp(agricultureGDP);
  world.commerceGDP = clamp(commerceGDP);
  world.gdpEstimate = gdpEstimate;

  world.grainDemandTotal = grainDemandTotal;
  world.grainBalance = grainBalance;
  world.grainPerCapita = grainPerCapita;
  world.grainCoverageRatio = grainCoverageRatio;
  world.foodSecurityStatus = getFoodSecurityStatus(grainCoverageRatio);
  world.foodSecurityIndex = Math.round(grainCoverageRatio * 100);
  world.lastAgriculturalTax = agriculturalTax;

  world.farmerIncomePerHead = farmerIncomePerHead;
  world.merchantIncomePerHead = merchantIncomePerHead;
  world.incomeGap = incomeGap;

  world.maxMarketDemand = maxMarketDemand;
  world.demandSaturation = demandSaturation;
  world.demandShortfall = demandShortfall;

  if (collectTax) {
    world.grainTreasury = clamp(world.grainTreasury + agriculturalTax);
    world.lastTaxCollectionYear = world.year;
  }

  return {
    grainOutput,
    potentialGrainOutput,
    lostGrainOutput,
    agriculturalTax,
    grainDemandTotal,
    grainBalance,
    grainCoverageRatio,
  };
}

export function issueGrainCoupons(state, amount) {
  if (!state.systems.grainCouponsUnlocked) {
    return { success: false, reason: 'Grain coupons are not unlocked yet.' };
  }

  const issueAmount = clamp(amount);
  if (issueAmount <= 0) {
    return { success: false, reason: 'Issue amount must be greater than zero.' };
  }

  state.grainCoupons.totalIssued += issueAmount;
  state.grainCoupons.governmentReserves += issueAmount;

  const releaseToCirculation = clamp(issueAmount * 0.5);
  state.grainCoupons.governmentReserves -= releaseToCirculation;
  state.grainCoupons.circulating += releaseToCirculation;

  return {
    success: true,
    issueAmount,
    releaseToCirculation,
  };
}
