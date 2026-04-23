// Market module: prices, purchasing power, living-cost helpers, salt market

function clamp(value, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.max(min, Math.min(max, Number(value ?? 0)));
}

function clampPercentIndex(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value ?? 0))));
}

export function getGrainPrice(supplyRatio) {
  if (supplyRatio > 2) return 1.2;
  if (supplyRatio >= 1) return 1.0;
  return Math.max(0, supplyRatio);
}

export function getCommodityPriceMultiplier(supplyDemandRatio) {
  if (supplyDemandRatio >= 1.5) return 0.85;
  if (supplyDemandRatio >= 1.0) return 1.0;
  if (supplyDemandRatio >= 0.7) return 1.2;
  if (supplyDemandRatio >= 0.4) return 1.5;
  return 2.0;
}

export function calculateCommodityPrice({
  previousPrice,
  basePrice,
  minPrice,
  maxPrice,
  annualSupply,
  annualDemand,
  reserve,
}) {
  const safeDemand = Math.max(1, annualDemand);
  const supplyDemandRatio = (Math.max(0, annualSupply) + Math.max(0, reserve) * 0.1) / safeDemand;
  const rawPrice = basePrice * getCommodityPriceMultiplier(supplyDemandRatio);
  const lowerYearlyBound = previousPrice * 0.7;
  const upperYearlyBound = previousPrice * 1.3;
  const yearlyCappedPrice = Math.max(lowerYearlyBound, Math.min(upperYearlyBound, rawPrice));
  const boundedPrice = Math.max(minPrice, Math.min(maxPrice, yearlyCappedPrice));

  return {
    supplyDemandRatio,
    nextPrice: boundedPrice,
  };
}

export function calculateLivingCost(world) {
  const saltPrice = Math.max(0, Number(world?.saltPrice ?? 4));
  const clothPrice = Math.max(0, Number(world?.clothPrice ?? 2));
  const grainCost = 360;
  const saltCost = 15 * saltPrice;
  const clothCost = 0.3 * clothPrice;
  const totalLivingCost = grainCost + saltCost + clothCost;

  const saltAffordability = saltPrice / 4.0;
  const clothAffordability = clothPrice / 2.0;

  world.totalLivingCost = totalLivingCost;
  world.saltAffordability = saltAffordability;
  world.clothAffordability = clothAffordability;

  return {
    grainCost,
    saltCost,
    clothCost,
    totalLivingCost,
    saltAffordability,
    clothAffordability,
  };
}

export function getPurchasingPowerIndex(world, saltPrice, clothPrice, grainPrice) {
  const saltAffordability = saltPrice / 4.0;
  const clothAffordability = clothPrice / 2.0;

  let denominator = saltAffordability * 0.6 + clothAffordability * 0.4;
  if (world.grainCouponsUnlocked) {
    const grainAffordability = Math.max(0.1, grainPrice / 1.0);
    denominator = saltAffordability * 0.3 + clothAffordability * 0.2 + grainAffordability * 0.5;
  }

  const purchasingPower = denominator > 0 ? 100 / denominator : 150;
  return Math.max(10, Math.min(150, purchasingPower));
}

export function clampBetween(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getSaltImportCost(world, importAmount, saltPrice) {
  return Math.max(0, Math.round(importAmount * Math.max(0, saltPrice)));
}

export function clampCommodityPrice(value, minPrice, maxPrice) {
  return Math.max(minPrice, Math.min(maxPrice, value));
}

export function previewOfficialSaltSale(world, officialSaltPrice, officialSaltAmount) {
  const marketSaltPrice = Math.max(0, Number(world?.saltPrice ?? 0));
  const availableReserve = Math.max(0, Math.floor(Number(world?.saltReserve ?? 0)));
  const annualDemand = Math.max(1, Number(world?.saltAnnualDemand ?? 0));

  const amount = Math.max(0, Math.floor(Number(officialSaltAmount ?? 0)));
  const cappedAmount = Math.min(amount, availableReserve);

  const requestedPrice = Math.max(0, Number(officialSaltPrice ?? 0));
  const cappedPrice = Math.min(requestedPrice, marketSaltPrice);

  const revenue = cappedAmount * cappedPrice;
  const subsidyLoss = cappedAmount * Math.max(0, marketSaltPrice - cappedPrice);
  const releaseRatio = cappedAmount / annualDemand;

  let nextSaltPrice = marketSaltPrice;
  if (releaseRatio >= 0.3) {
    nextSaltPrice = clampCommodityPrice(marketSaltPrice * 0.85, 1.0, 10.0);
  } else if (releaseRatio >= 0.1) {
    nextSaltPrice = clampCommodityPrice(marketSaltPrice * 0.95, 1.0, 10.0);
  }

  return {
    marketSaltPrice,
    cappedPrice,
    cappedAmount,
    revenue,
    subsidyLoss,
    releaseRatio,
    nextSaltPrice,
  };
}

export function executeOfficialSaltSale(world, officialSaltPrice, officialSaltAmount) {
  if (world.officialSaltSaleUsed) {
    return { success: false, reason: 'Official salt sale already used this year.' };
  }

  const amount = Math.floor(Number(officialSaltAmount));
  if (!Number.isFinite(amount) || amount < 1000) {
    return { success: false, reason: 'Official salt release must be at least 1000 jin.' };
  }

  if (amount > (world.saltReserve ?? 0)) {
    return { success: false, reason: 'Official salt release cannot exceed current reserve.' };
  }

  const price = Number(officialSaltPrice);
  if (!Number.isFinite(price) || price < 0) {
    return { success: false, reason: 'Official salt price must be a valid non-negative number.' };
  }

  const marketPrice = Math.max(0, Number(world.saltPrice ?? 0));
  if (price > marketPrice) {
    return { success: false, reason: 'Official salt price cannot be above current market salt price.' };
  }

  const preview = previewOfficialSaltSale(world, price, amount);
  const revenue = Math.round(preview.revenue);
  const subsidyLoss = Math.round(preview.subsidyLoss);

  world.saltReserve = Math.max(0, Math.floor((world.saltReserve ?? 0) - preview.cappedAmount));
  world.officialSaltAmount = Math.floor(preview.cappedAmount);
  world.officialSaltPrice = preview.cappedPrice;
  world.saltPrice = preview.nextSaltPrice;

  if (world.grainCouponsUnlocked) {
    world.couponTreasury = clamp((world.couponTreasury ?? 0) + revenue);
  } else {
    world.grainTreasury = clamp((world.grainTreasury ?? 0) + revenue);
  }

  let farmerLifeQualityGain = 0;
  let farmerMessage = '';
  if (preview.cappedPrice <= marketPrice * 0.7) {
    farmerLifeQualityGain = 15;
    farmerMessage = '官府平价放盐，民心稳定';
  } else if (preview.cappedPrice <= marketPrice * 0.9) {
    farmerLifeQualityGain = 8;
    farmerMessage = '官府适量投放食盐';
  }

  if (farmerLifeQualityGain > 0) {
    world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? world.farmerSatisfaction ?? 50) + farmerLifeQualityGain);
    world.farmerSatisfaction = world.farmerLifeQuality;
  }

  world.officialSaltSaleUsed = true;

  return {
    success: true,
    amount: preview.cappedAmount,
    price: preview.cappedPrice,
    revenue,
    subsidyLoss,
    releaseRatio: preview.releaseRatio,
    nextSaltPrice: preview.nextSaltPrice,
    farmerLifeQualityGain,
    farmerMessage,
    currency: world.grainCouponsUnlocked ? 'coupon' : 'grain',
  };
}


export function applyRoadMarketEffects(world) {
  const roadLength = Math.max(0, Number(world?.roadLength ?? 0));
  const cleaningWorkers = Math.max(0, Number(world?.cleaningWorkerCount ?? 0));

  const baseTradeBonus = Math.min(0.3, roadLength * 0.01);
  const workerToRoadRatio = roadLength > 0 ? cleaningWorkers / roadLength : 1;
  const maintenancePenalty = roadLength > 0 && workerToRoadRatio < 0.2 ? 0.7 : 1;

  const effectiveTradeBonus = baseTradeBonus * maintenancePenalty;
  const reclaimEfficiencyBonus = Math.min(0.15, roadLength * 0.005);
  const bureauTradeBonus = Math.max(0, Number(world?.tradeBureauTradeBonus ?? 0));
  const totalTradeBonus = effectiveTradeBonus + bureauTradeBonus;

  world.workerToRoadRatio = roadLength > 0 ? workerToRoadRatio : 0;
  world.tradeEfficiency = totalTradeBonus;
  world.reclaimEfficiency = reclaimEfficiencyBonus;

  return {
    roadLength,
    baseTradeBonus,
    effectiveTradeBonus,
    bureauTradeBonus,
    totalTradeBonus,
    reclaimEfficiencyBonus,
    workerToRoadRatio: world.workerToRoadRatio,
    maintenanceInsufficient: roadLength > 0 && workerToRoadRatio < 0.2,
  };
}

export function getIncomePoolDemandEffects(world) {
  const farmerIncomePool = Math.max(0, Number(world?.farmerIncomePool ?? 0));
  const merchantIncomePool = Math.max(0, Number(world?.merchantIncomePool ?? 0));
  const officialIncomePool = Math.max(0, Number(world?.officialIncomePool ?? 0));

  return {
    farmerSatisfactionBonus: Math.min(farmerIncomePool / 1000000, 10),
    merchantSatisfactionBonus: Math.min(merchantIncomePool / 1000000, 8),
    officialSatisfactionBonus: Math.min(officialIncomePool / 500000, 10),
    saltDemandIncrease: farmerIncomePool / 500000,
    clothDemandIncrease:
      farmerIncomePool / 2000000 + merchantIncomePool / 1500000 + officialIncomePool / 2000000,
  };
}
