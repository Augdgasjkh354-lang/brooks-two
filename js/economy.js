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

function getGrainPrice(supplyRatio) {
  if (supplyRatio > 2) return 1.2;
  if (supplyRatio >= 1) return 1.0;
  return Math.max(0, supplyRatio);
}

function getStabilityPenaltyFromIncomeGap(incomeGap) {
  if (incomeGap > 2000) {
    return {
      penalty: 30,
      reason: 'Income gap above 2000 (-30)',
    };
  }

  if (incomeGap >= 1000) {
    return {
      penalty: 20,
      reason: 'Income gap 1000-2000 (-20)',
    };
  }

  if (incomeGap >= 500) {
    return {
      penalty: 10,
      reason: 'Income gap 500-1000 (-10)',
    };
  }

  return {
    penalty: 0,
    reason: 'No penalty (income gap below 500)',
  };
}

function getEfficiencyMultiplier(stabilityIndex) {
  if (stabilityIndex >= 80) return 1.0;
  if (stabilityIndex >= 50) return 0.85;
  return 0.65;
}

export function updateEconomy(world, options = {}) {
  const { collectTax = true } = options;

  const farmEfficiency = calculateLaborAllocation(world);

  const baseYield = world.baseGrainYieldPerMu ?? world.grainYieldPerMu;
  world.baseGrainYieldPerMu = clamp(baseYield);

  const potentialGrainOutput = clamp(world.farmlandAreaMu * world.baseGrainYieldPerMu);
  const preStabilityGrainOutput = clamp(potentialGrainOutput * farmEfficiency);
  const agriculturalTax = clamp(preStabilityGrainOutput * world.agriculturalTaxRate);

  const operatingShops = Math.min(world.shopCount ?? 0, world.merchantCount ?? 0);
  const idleShops = Math.max(0, (world.shopCount ?? 0) - operatingShops);

  const maxMarketDemand = world.totalPopulation > 0 ? world.totalPopulation / 50 : 0;
  const demandSaturation = maxMarketDemand > 0 ? operatingShops / maxMarketDemand : 0;
  const demandEfficiencyRate = demandSaturation > 1 ? 1 / demandSaturation : 1;

  const totalGrainDemand = clamp(operatingShops * 200);
  const availableGrainForCommerce = Math.max(0, world.grainTreasury ?? 0);
  const grainConsumedByCommerce = Math.min(availableGrainForCommerce, totalGrainDemand);
  const grainSupplyEfficiency = totalGrainDemand > 0 ? grainConsumedByCommerce / totalGrainDemand : 1;

  const preStabilityCommerceGDP = clamp(
    operatingShops * 500 * demandEfficiencyRate * grainSupplyEfficiency
  );

  const preStabilityFarmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0
      ? (preStabilityGrainOutput * 0.3) / world.farmingLaborAllocated
      : 0;

  const preStabilityMerchantIncomePerHead =
    (world.merchantCount ?? 0) > 0 ? (preStabilityCommerceGDP * 0.5) / world.merchantCount : 0;

  const preStabilityIncomeGap = preStabilityMerchantIncomePerHead - preStabilityFarmerIncomePerHead;

  const { penalty: stabilityPenalty, reason: stabilityPenaltyReason } =
    getStabilityPenaltyFromIncomeGap(preStabilityIncomeGap);
  const stabilityIndex = Math.max(0, 80 - stabilityPenalty);
  const efficiencyMultiplier = getEfficiencyMultiplier(stabilityIndex);

  const grainOutput = clamp(preStabilityGrainOutput * efficiencyMultiplier);
  const commerceGDP = clamp(preStabilityCommerceGDP * efficiencyMultiplier);
  const lostGrainOutput = clamp(potentialGrainOutput - grainOutput);

  const treasuryAfterCommerce = collectTax
    ? availableGrainForCommerce - grainConsumedByCommerce
    : availableGrainForCommerce;

  const safePopulationDemand = Math.max(1, world.totalPopulation * 2);
  const supplyRatio = treasuryAfterCommerce / safePopulationDemand;
  const grainPrice = getGrainPrice(supplyRatio);

  const agricultureGDP = clamp(grainOutput * grainPrice);

  const constructionGDP = clamp(world.constructionGDP ?? 0);
  const gdpEstimate = clamp(agricultureGDP + commerceGDP + constructionGDP);

  const grainDemandTotal = clamp(world.totalPopulation * (world.grainDemandPerPerson ?? 0));
  const grainBalance = grainOutput - grainDemandTotal;
  const grainPerCapita =
    world.totalPopulation > 0 ? clamp(grainOutput / world.totalPopulation) : 0;
  const grainCoverageRatio =
    grainDemandTotal > 0 ? clampRatio(grainOutput / grainDemandTotal) : 1;

  const farmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0 ? (grainOutput * 0.3) / world.farmingLaborAllocated : 0;

  const merchantIncomePerHead =
    (world.merchantCount ?? 0) > 0 ? (commerceGDP * 0.5) / world.merchantCount : 0;

  const incomeGap = merchantIncomePerHead - farmerIncomePerHead;
  const demandShortfall = demandSaturation < 0.5;

  world.grainYieldPerMu = clamp(world.baseGrainYieldPerMu * farmEfficiency * efficiencyMultiplier);
  world.potentialGrainOutput = potentialGrainOutput;
  world.actualGrainOutput = grainOutput;
  world.lostGrainOutput = lostGrainOutput;

  world.operatingShops = clamp(operatingShops);
  world.idleShops = clamp(idleShops);

  world.totalGrainDemand = totalGrainDemand;
  world.grainPrice = grainPrice;
  world.supplyRatio = supplyRatio;

  world.agricultureGDP = agricultureGDP;
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

  world.stabilityPenalty = stabilityPenalty;
  world.stabilityPenaltyReason = stabilityPenaltyReason;
  world.stabilityIndex = stabilityIndex;
  world.efficiencyMultiplier = efficiencyMultiplier;

  world.maxMarketDemand = maxMarketDemand;
  world.demandSaturation = demandSaturation;
  world.demandShortfall = demandShortfall;

  if (collectTax) {
    world.grainTreasury = clamp(treasuryAfterCommerce + agriculturalTax);
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
