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
  const saltMineLaborRequired = Math.max(0, world.saltMineWorkers ?? 0);
  const saltMineLaborAllocated = Math.min(remainingAfterFarming, saltMineLaborRequired);

  const remainingAfterSalt = Math.max(0, remainingAfterFarming - saltMineLaborAllocated);
  const hempLaborRequired = Math.max(0, (world.hempLandMu ?? 0) / 10);
  const hempLaborAllocated = Math.min(remainingAfterSalt, hempLaborRequired);

  const remainingAfterHemp = Math.max(0, remainingAfterSalt - hempLaborAllocated);
  const mulberryLaborRequired = Math.max(0, (world.mulberryLandMu ?? 0) / 5);
  const mulberryLaborAllocated = Math.min(remainingAfterHemp, mulberryLaborRequired);

  const remainingAfterMulberry = Math.max(0, remainingAfterHemp - mulberryLaborAllocated);
  const commerceLaborDemand = (world.shopCount ?? 0) * 5;
  const laborAssignedCommerce = Math.min(remainingAfterMulberry, commerceLaborDemand);

  const idleLabor = Math.max(0, remainingAfterMulberry - laborAssignedCommerce);
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;
  const hempEfficiency = hempLaborRequired > 0 ? clampRatio(hempLaborAllocated / hempLaborRequired) : 1;
  const mulberryEfficiency =
    mulberryLaborRequired > 0 ? clampRatio(mulberryLaborAllocated / mulberryLaborRequired) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  world.hempLaborRequired = clamp(hempLaborRequired);
  world.mulberryLaborRequired = clamp(mulberryLaborRequired);
  world.hempLaborAllocated = clamp(hempLaborAllocated);
  world.mulberryLaborAllocated = clamp(mulberryLaborAllocated);
  world.laborAssignedCommerce = clamp(laborAssignedCommerce);
  world.idleLabor = clamp(idleLabor);
  world.farmEfficiency = farmEfficiency;
  world.hempEfficiency = hempEfficiency;
  world.mulberryEfficiency = mulberryEfficiency;
  world.landUtilizationPercent = farmEfficiency * 100;

  return {
    farmEfficiency,
    hempEfficiency,
    mulberryEfficiency,
  };
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

function getCommodityPriceMultiplier(supplyDemandRatio) {
  if (supplyDemandRatio >= 1.5) return 0.85;
  if (supplyDemandRatio >= 1.0) return 1.0;
  if (supplyDemandRatio >= 0.7) return 1.2;
  if (supplyDemandRatio >= 0.4) return 1.5;
  return 2.0;
}

function calculateCommodityPrice({
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

function getPurchasingPowerIndex(world, saltPrice, clothPrice, grainPrice) {
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

function getCommerceActivityBonus(world) {
  if (!world?.grainCouponsUnlocked) return { circulationRatio: 0, commerceActivityBonus: 1.0 };

  const totalPopulation = Math.max(1, world.totalPopulation ?? 0);
  const circulationRatio = Math.max(0, (world.couponCirculating ?? 0) / totalPopulation);

  if (circulationRatio >= 2.0) {
    return { circulationRatio, commerceActivityBonus: 1.2 };
  }
  if (circulationRatio >= 1.0) {
    return { circulationRatio, commerceActivityBonus: 1.0 };
  }
  if (circulationRatio >= 0.5) {
    return { circulationRatio, commerceActivityBonus: 0.85 };
  }

  return { circulationRatio, commerceActivityBonus: 0.7 };
}

function getInflationState(world) {
  if (!world?.grainCouponsUnlocked || (world.couponCirculating ?? 0) <= 0) {
    return {
      backingRatio: 1.0,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: 1.0,
    };
  }

  const couponCirculating = Math.max(0, world.couponCirculating ?? 0);
  const backingRatio =
    couponCirculating > 0 ? Math.max(0, (world.grainTreasury ?? 0) / couponCirculating) : 1.0;

  if (backingRatio >= 1.0) {
    return {
      backingRatio,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: 1.0,
    };
  }

  if (backingRatio >= 0.7) {
    return {
      backingRatio,
      inflationRate: 0.05,
      inflationStabilityPenalty: 5,
      inflationCommercePenaltyMultiplier: 1.0,
    };
  }

  if (backingRatio >= 0.4) {
    return {
      backingRatio,
      inflationRate: 0.15,
      inflationStabilityPenalty: 15,
      inflationCommercePenaltyMultiplier: 0.9,
    };
  }

  return {
    backingRatio,
    inflationRate: 0.3,
    inflationStabilityPenalty: 25,
    inflationCommercePenaltyMultiplier: 0.7,
  };
}

function clampPercentIndex(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
function getFertilizerBonus(dungCoverage) {
  const coverage = Math.max(0, dungCoverage ?? 0);

  if (coverage <= 0) return 1.0;
  if (coverage < 0.15) return 1.05;
  if (coverage <= 0.4) return 1.12;
  return 1.2;
}


function clampBetween(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSaltImportCost(world, importAmount, saltPrice) {
  return Math.max(0, Math.round(importAmount * Math.max(0, saltPrice)));
}

function clampCommodityPrice(value, minPrice, maxPrice) {
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

  let farmerSatisfactionGain = 0;
  let farmerMessage = '';
  if (preview.cappedPrice <= marketPrice * 0.7) {
    farmerSatisfactionGain = 15;
    farmerMessage = '官府平价放盐，民心稳定';
  } else if (preview.cappedPrice <= marketPrice * 0.9) {
    farmerSatisfactionGain = 8;
    farmerMessage = '官府适量投放食盐';
  }

  if (farmerSatisfactionGain > 0) {
    world.farmerSatisfaction = clampPercentIndex((world.farmerSatisfaction ?? 70) + farmerSatisfactionGain);
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
    farmerSatisfactionGain,
    farmerMessage,
    currency: world.grainCouponsUnlocked ? 'coupon' : 'grain',
  };
}

function calculateClassSatisfaction(world) {
  const saltAffordability = (world.saltPrice ?? 4) / 4.0;
  const clothAffordability = (world.clothPrice ?? 2) / 2.0;
  const grainSurplus = world.grainSurplus ?? 0;
  const purchasingPower = world.purchasingPower ?? 100;

  let farmerSatisfaction = 70;
  if ((world.agriculturalTaxRate ?? 0) > 0.5) farmerSatisfaction -= 15;
  if ((world.inflationRate ?? 0) >= 0.15) farmerSatisfaction -= 10;
  if ((world.grainTreasury ?? 0) < (world.totalPopulation ?? 0) * 1) farmerSatisfaction -= 20;
  if ((world.taxGrainRatio ?? 1) < 0.5) farmerSatisfaction -= 10;

  if (saltAffordability > 2.0) {
    farmerSatisfaction -= 25;
  } else if (saltAffordability > 1.5) {
    farmerSatisfaction -= 15;
  }
  if (clothAffordability > 1.5) farmerSatisfaction -= 10;
  if (grainSurplus < 0) farmerSatisfaction -= 20;

  let merchantSatisfaction = 70;
  if ((world.inflationRate ?? 0) >= 0.15) merchantSatisfaction -= 20;
  if ((world.inflationRate ?? 0) >= 0.3) merchantSatisfaction -= 20;
  if ((world.demandSaturation ?? 0) > 1.5) merchantSatisfaction -= 10;
  if ((world.stabilityIndex ?? 80) < 50) merchantSatisfaction -= 15;
  if ((world.commerceActivityBonus ?? 1) > 1.0) merchantSatisfaction += 10;

  if ((world.saltPrice ?? 4) > 5.0) merchantSatisfaction += 10;
  if ((world.clothPrice ?? 2) > 3.0) merchantSatisfaction += 10;
  if (purchasingPower < 50) merchantSatisfaction -= 15;

  let officialSatisfaction = 70;
  if ((world.salaryGrainRatio ?? 1) < 0.5 && (world.inflationRate ?? 0) >= 0.15)
    officialSatisfaction -= 20;
  if ((world.salaryGrainRatio ?? 1) < 0.3 && (world.inflationRate ?? 0) >= 0.05)
    officialSatisfaction -= 15;
  if ((world.stabilityIndex ?? 80) < 50) officialSatisfaction -= 10;

  if (purchasingPower < 50) officialSatisfaction -= 10;
  if (grainSurplus < 0) officialSatisfaction -= 15;

  let landlordSatisfaction = 70;
  if ((world.inflationRate ?? 0) >= 0.15) landlordSatisfaction -= 15;
  if ((world.grainPrice ?? 1) < 0.8) landlordSatisfaction -= 10;
  if ((world.stabilityIndex ?? 80) < 50) landlordSatisfaction -= 10;
  if ((world.farmlandAreaMu ?? 0) > 40000) landlordSatisfaction += 10;

  if (grainSurplus < 0) landlordSatisfaction += 10;
  if (saltAffordability > 2.0) landlordSatisfaction -= 5;

  return {
    farmerSatisfaction: clampPercentIndex(farmerSatisfaction),
    merchantSatisfaction: clampPercentIndex(merchantSatisfaction),
    officialSatisfaction: clampPercentIndex(officialSatisfaction),
    landlordSatisfaction: clampPercentIndex(landlordSatisfaction),
  };
}


function updateXikouVillageEconomy(world) {
  if (!world || !world.xikou) {
    return;
  }

  const xikou = world.xikou;
  const growthRate = 0.02;
  const nextPopulation = clamp((xikou.population ?? 0) * (1 + growthRate));

  xikou.population = nextPopulation;
  xikou.laborForce = clamp(nextPopulation * 0.6);
  xikou.children = clamp(nextPopulation * 0.2);
  xikou.elderly = clamp(nextPopulation * 0.2);

  const saltWorkersRequired = Math.max(0, (xikou.saltMines ?? 0) * 10);
  const saltWorkers = Math.min(xikou.laborForce ?? 0, saltWorkersRequired);

  const laborAfterSalt = Math.max(0, (xikou.laborForce ?? 0) - saltWorkers);

  const farmWorkersRequired = (xikou.farmlandMu ?? 0) / 10;
  const farmWorkers = Math.min(laborAfterSalt, farmWorkersRequired);

  const laborAfterFarming = Math.max(0, laborAfterSalt - farmWorkers);
  const mulberryWorkersRequired = (xikou.mulberryLandMu ?? 0) / 10;
  const mulberryWorkers = Math.min(laborAfterFarming, mulberryWorkersRequired);

  const idleLabor = Math.max(0, laborAfterFarming - mulberryWorkers);

  const farmEfficiency = farmWorkersRequired > 0 ? clampRatio(farmWorkers / farmWorkersRequired) : 1;

  const grainOutput = clamp((xikou.farmlandMu ?? 0) * 500 * farmEfficiency);
  const clothOutput = clamp((xikou.mulberryLandMu ?? 0) * 50);
  const saltOutputJin = saltWorkers >= saltWorkersRequired ? 200000 : clamp((saltWorkers / Math.max(1, saltWorkersRequired)) * 200000);

  const annualConsumption = clamp((xikou.population ?? 0) * 2);
  const nextGrainTreasury = Math.max(0, Math.round((xikou.grainTreasury ?? 0) + grainOutput - annualConsumption));

  xikou.saltMineWorkers = clamp(saltWorkers);
  xikou.farmWorkers = clamp(farmWorkers);
  xikou.mulberryWorkers = clamp(mulberryWorkers);
  xikou.idleLabor = clamp(idleLabor);
  xikou.farmEfficiency = farmEfficiency;
  xikou.grainOutput = grainOutput;
  xikou.clothOutput = clothOutput;
  xikou.saltOutputJin = clamp(saltOutputJin);
  xikou.saltReserve = clamp((xikou.saltReserve ?? 0) + saltOutputJin);
  xikou.grainTreasury = nextGrainTreasury;

  const mulberryLandMu = Math.max(0, Math.floor(xikou.mulberryLandMu ?? 1200));
  const dungOutput = clamp(mulberryLandMu * 600);
  const xikouOwnDemand = Math.max(0, Math.floor((xikou.farmlandMu ?? 0) * 600 * 0.3));
  xikou.silkwormDungOutput = dungOutput;
  xikou.silkwormDungAvailable = Math.max(0, dungOutput - xikouOwnDemand);
}


function clampAttitude(value) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

function updateXikouDiplomacy(world) {
  if (!world || !world.xikou) {
    return [];
  }

  const xikou = world.xikou;
  const factors = [];
  let delta = 0;

  if (!xikou.diplomaticContact) {
    xikou.attitudeDeltaThisYear = 0;
    xikou.attitudeFactorsThisYear = ['未建立外交关系，态度变化未生效'];
    return [];
  }

  if ((world.grainTreasury ?? 0) > 500000) {
    delta += 2;
    factors.push('我方粮仓充足（>500000）：+2');
  }

  if ((world.stabilityIndex ?? 80) < 50) {
    delta -= 3;
    factors.push('我方稳定度偏低（<50）：-3');
  }

  if ((world.inflationRate ?? 0) >= 0.15) {
    delta -= 5;
    factors.push('我方通胀较高（>=15%）：-5');
  }

  if (world.creditCrisis) {
    delta -= 10;
    factors.push('我方发生信用危机：-10');
  }

  if ((xikou.grainTreasury ?? 0) < 100000) {
    delta += 5;
    factors.push('溪口村粮储紧张（<100000）：+5');
  }

  if (factors.length === 0) {
    factors.push('无年度态度修正因素');
  }

  const previous = xikou.attitudeToPlayer ?? 0;
  const next = clampAttitude(previous + delta);
  xikou.attitudeToPlayer = next;
  xikou.attitudeDeltaThisYear = delta;
  xikou.attitudeFactorsThisYear = factors;

  if (delta === 0) {
    return [];
  }

  const direction = delta > 0 ? '上升' : '下降';
  const absoluteDelta = Math.abs(delta);
  return [
    `溪口村对我方态度${direction}${absoluteDelta}点（${factors.join('；')}）`,
  ];
}

function getCouponDenominationBreakdown(issueAmount) {
  const units = [
    { label: '100斤', value: 10000 },
    { label: '50斤', value: 5000 },
    { label: '20斤', value: 2000 },
    { label: '10斤', value: 1000 },
    { label: '5斤', value: 500 },
    { label: '2斤', value: 200 },
    { label: '1斤', value: 100 },
    { label: '5两', value: 50 },
    { label: '1两', value: 10 },
    { label: '5钱', value: 5 },
    { label: '1钱', value: 1 },
  ];

  let remaining = clamp(issueAmount * 100);
  const breakdown = [];

  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      breakdown.push({
        label: unit.label,
        count,
      });
      remaining -= count * unit.value;
    }
  }

  return breakdown;
}

export function updateEconomy(world, options = {}) {
  const { collectTax = true } = options;
  updateXikouVillageEconomy(world);
  const diplomacyMessages = updateXikouDiplomacy(world);

  const behaviorMessages = [];
  const currentYear = world.year ?? 1;

  const maturedHempLand = Math.max(0, Math.floor(world.pendingHempLandMu ?? 0));
  if (maturedHempLand > 0) {
    world.hempLandMu = clamp((world.hempLandMu ?? 0) + maturedHempLand);
    world.pendingHempLandMu = 0;
    behaviorMessages.push(`麻田开垦完成：新增${maturedHempLand}亩麻田`);
  }

  const pendingMulberry = Array.isArray(world.pendingMulberryProjects)
    ? world.pendingMulberryProjects
    : [];
  let maturedMulberryLand = 0;
  const stillPendingMulberry = [];
  for (const project of pendingMulberry) {
    if ((project?.maturesOnYear ?? Number.MAX_SAFE_INTEGER) <= currentYear) {
      maturedMulberryLand += Math.max(0, Math.floor(project?.mu ?? 0));
    } else {
      stillPendingMulberry.push(project);
    }
  }
  world.pendingMulberryProjects = stillPendingMulberry;
  world.pendingMulberryLandMu = stillPendingMulberry.reduce(
    (sum, project) => sum + Math.max(0, Math.floor(project?.mu ?? 0)),
    0
  );
  world.mulberryMaturationYear =
    stillPendingMulberry.length > 0
      ? Math.min(...stillPendingMulberry.map((project) => project.maturesOnYear))
      : 0;

  if (maturedMulberryLand > 0) {
    world.mulberryLandMu = clamp((world.mulberryLandMu ?? 0) + maturedMulberryLand);
    world.mulberryMatureLandMu = clamp((world.mulberryMatureLandMu ?? 0) + maturedMulberryLand);
    behaviorMessages.push(`桑田首收：新增成熟桑田${maturedMulberryLand}亩`);
  }

  const { farmEfficiency, hempEfficiency, mulberryEfficiency } = calculateLaborAllocation(world);

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
  const grainSupplyEfficiency =
    totalGrainDemand > 0 ? grainConsumedByCommerce / totalGrainDemand : 1;

  const { circulationRatio, commerceActivityBonus } = getCommerceActivityBonus(world);
  const {
    backingRatio,
    inflationRate,
    inflationStabilityPenalty,
    inflationCommercePenaltyMultiplier,
  } = getInflationState(world);

  const effectiveCommerceActivityBonus = commerceActivityBonus * inflationCommercePenaltyMultiplier;

  const landDevelopmentFarmerIncomeBoost = Math.max(0, Number(world.landDevelopmentFarmerIncomeBoost ?? 0));
  const landDevelopmentCommerceBoost = Math.max(0, Number(world.landDevelopmentCommerceBoost ?? 0));
  const preStabilityCommerceGDP = clamp(
    operatingShops * 500 * demandEfficiencyRate * grainSupplyEfficiency * effectiveCommerceActivityBonus +
      landDevelopmentCommerceBoost
  );

  const preStabilityFarmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0
      ? (preStabilityGrainOutput * 0.3 + landDevelopmentFarmerIncomeBoost) / world.farmingLaborAllocated
      : 0;

  const preStabilityMerchantIncomePerHead =
    (world.merchantCount ?? 0) > 0
      ? ((preStabilityCommerceGDP + landDevelopmentCommerceBoost) * 0.5) / world.merchantCount
      : 0;

  const preStabilityIncomeGap = preStabilityMerchantIncomePerHead - preStabilityFarmerIncomePerHead;

  const { penalty: incomeGapPenalty, reason: stabilityPenaltyReason } =
    getStabilityPenaltyFromIncomeGap(preStabilityIncomeGap);
  const stabilityPenalty = incomeGapPenalty + inflationStabilityPenalty;
  const stabilityIndex = Math.max(0, 80 - stabilityPenalty);
  const efficiencyMultiplier = getEfficiencyMultiplier(stabilityIndex);

  const grainOutput = clamp(preStabilityGrainOutput * efficiencyMultiplier);
  const commerceGDP = clamp(preStabilityCommerceGDP * efficiencyMultiplier);

  const treasuryAfterCommerce = collectTax
    ? availableGrainForCommerce - grainConsumedByCommerce
    : availableGrainForCommerce;

  const safePopulationDemand = Math.max(1, world.totalPopulation * 2);
  const supplyRatio = treasuryAfterCommerce / safePopulationDemand;
  const grainPrice = getGrainPrice(supplyRatio);

  const previousSaltReserveSnapshot = Math.max(
    0,
    Number(world.previousSaltReserveForMarket ?? world.saltReserve ?? 0)
  );
  const previousClothReserveSnapshot = Math.max(
    0,
    Number(world.previousClothReserveForMarket ?? world.clothReserve ?? 0)
  );

  const clothReserveAtYearStart = Math.max(0, Number(world.clothReserve ?? 0));
  const clothTradeReceived = Math.max(0, clothReserveAtYearStart - previousClothReserveSnapshot);

  const coarseClothOutput = clamp((world.hempLandMu ?? 0) * 5 * hempEfficiency);
  const rawSilkOutput = clamp((world.mulberryMatureLandMu ?? 0) * 5 * mulberryEfficiency);
  const fineClothOutput = clamp(rawSilkOutput * 3);
  const totalClothOutput = clamp(coarseClothOutput + fineClothOutput);
  const totalClothSupply = clamp(totalClothOutput + clothTradeReceived);

  const blendedClothPrice =
    totalClothOutput > 0
      ? (coarseClothOutput * 2.0 + fineClothOutput * 6.0) / totalClothOutput
      : Math.max(0.8, Number(world.clothPrice ?? 2.0));

  world.coarseClothOutput = coarseClothOutput;
  world.rawSilkOutput = rawSilkOutput;
  world.fineClothOutput = fineClothOutput;
  world.clothTradeReceived = clamp(clothTradeReceived);
  world.totalClothSupply = totalClothSupply;
  world.blendedClothPrice = blendedClothPrice;
  world.clothReserve = clamp(clothReserveAtYearStart + totalClothOutput);

  const saltReserveBeforeImport = Math.max(0, Number(world.saltReserve ?? 0));
  const clothReserve = Math.max(0, Number(world.clothReserve ?? 0));
  const clothAnnualSupply = totalClothSupply;

  const saltAnnualDemand = Math.max(0, world.totalPopulation * 15);
  const clothAnnualDemand = Math.max(0, world.totalPopulation * 0.3);

  const xikou = world.xikou;

  const playerSilkwormDung = clamp((world.mulberryMatureLandMu ?? 0) * 600);
  const dungImportQuota = Math.max(0, Math.floor(world.dungImportQuota ?? 0));
  const maxDungImport = Math.max(0, Math.floor(xikou?.silkwormDungAvailable ?? 0));
  const requestedDungImport = Math.min(dungImportQuota, maxDungImport);
  const dungImportCost = Math.ceil(requestedDungImport / 100);

  let importedDung = 0;
  let dungImportCostPaid = 0;
  let dungImportCurrency = 'grain';

  if (requestedDungImport > 0 && xikou?.diplomaticContact) {
    if (world.grainCouponsUnlocked) {
      const availableCoupons = Math.max(0, Math.floor(world.couponTreasury ?? 0));
      if (availableCoupons >= dungImportCost) {
        world.couponTreasury = availableCoupons - dungImportCost;
        importedDung = requestedDungImport;
        dungImportCostPaid = dungImportCost;
        dungImportCurrency = 'coupon';
      }
    } else {
      const availableGrain = Math.max(0, Math.floor(world.grainTreasury ?? 0));
      if (availableGrain >= dungImportCost) {
        world.grainTreasury = availableGrain - dungImportCost;
        importedDung = requestedDungImport;
        dungImportCostPaid = dungImportCost;
        dungImportCurrency = 'grain';
      }
    }
  }

  if (importedDung > 0) {
    if (xikou) {
      xikou.attitudeToPlayer = clampAttitude((xikou.attitudeToPlayer ?? 0) + 1);
    }
    behaviorMessages.push(
      `蚕沙进口执行：进口${clamp(importedDung)}斤，支付${clamp(dungImportCostPaid)}${
        dungImportCurrency === 'coupon' ? '粮劵' : '粮食'
      }`
    );
  } else if (requestedDungImport > 0) {
    behaviorMessages.push('蚕沙进口执行失败：未建立外交联系或储备不足');
  }

  const totalDung = clamp(playerSilkwormDung + importedDung);
  const dungCoverageRaw =
    (world.farmlandAreaMu ?? 0) > 0 ? totalDung / ((world.farmlandAreaMu ?? 0) * 600) : 0;
  const dungCoverage = clampRatio(dungCoverageRaw);
  const fertilizerBonus = getFertilizerBonus(dungCoverage);

  world.playerSilkwormDung = playerSilkwormDung;
  world.importedDung = importedDung;
  world.totalDung = totalDung;
  world.dungCoverage = dungCoverage;
  world.fertilizerBonus = fertilizerBonus;
  world.dungImportQuota = dungImportQuota;

  const maxSaltImport = Math.max(0, Math.floor((xikou?.saltOutputJin ?? 0) * 0.5));
  const desiredSaltImport = Math.max(0, Math.floor(world.saltImportQuota ?? 0));
  const actualSaltImport = Math.min(desiredSaltImport, maxSaltImport);
  const plannedSaltImportCost = getSaltImportCost(world, actualSaltImport, world.saltPrice ?? 4);

  let saltImportExecuted = 0;
  let saltImportCostPaid = 0;
  let saltImportCurrency = 'grain';

  if (actualSaltImport > 0 && xikou?.diplomaticContact) {
    if (world.grainCouponsUnlocked) {
      const availableCoupons = Math.max(0, Math.floor(world.couponTreasury ?? 0));
      if (availableCoupons >= plannedSaltImportCost) {
        world.couponTreasury = availableCoupons - plannedSaltImportCost;
        saltImportExecuted = actualSaltImport;
        saltImportCostPaid = plannedSaltImportCost;
        saltImportCurrency = 'coupon';
      }
    } else {
      const availableGrain = Math.max(0, Math.floor(world.grainTreasury ?? 0));
      if (availableGrain >= plannedSaltImportCost) {
        world.grainTreasury = availableGrain - plannedSaltImportCost;
        saltImportExecuted = actualSaltImport;
        saltImportCostPaid = plannedSaltImportCost;
        saltImportCurrency = 'grain';
      }
    }
  }

  const saltReserveBeforeConsumption = saltReserveBeforeImport + saltImportExecuted;
  const saltConsumed = Math.min(saltAnnualDemand, saltReserveBeforeConsumption);
  const saltReserve = Math.max(0, saltReserveBeforeConsumption - saltConsumed);
  const saltShortfallRatio =
    saltAnnualDemand > 0 ? 1 - saltConsumed / saltAnnualDemand : 0;

  const saltAnnualSupply = Math.max(0, saltReserveBeforeConsumption - previousSaltReserveSnapshot);

  const saltPricing = calculateCommodityPrice({
    previousPrice: Math.max(0.1, Number(world.saltPrice ?? 4.0)),
    basePrice: 4.0,
    minPrice: 1.0,
    maxPrice: 10.0,
    annualSupply: saltAnnualSupply,
    annualDemand: saltAnnualDemand,
    reserve: saltReserve,
  });

  const clothPricing = calculateCommodityPrice({
    previousPrice: Math.max(0.1, Number(world.clothPrice ?? 2.0)),
    basePrice: blendedClothPrice,
    minPrice: 0.8,
    maxPrice: 5.0,
    annualSupply: clothAnnualSupply,
    annualDemand: clothAnnualDemand,
    reserve: clothReserve,
  });

  const grainAnnualDemand = Math.max(0, world.totalPopulation * 360);
  const localClothRatio =
    clothAnnualDemand > 0 ? Math.max(0, totalClothOutput / clothAnnualDemand) : 0;

  let adjustedGrainOutput = grainOutput;
  let adjustedCommerceGDP = commerceGDP;
  let additionalStabilityPenalty = 0;
  const demandShortfall = demandSaturation < 0.5;

  world.grainYieldPerMu = clamp(world.baseGrainYieldPerMu * farmEfficiency * efficiencyMultiplier);
  world.potentialGrainOutput = potentialGrainOutput;
  world.actualGrainOutput = grainOutput;

  world.operatingShops = clamp(operatingShops);
  world.idleShops = clamp(idleShops);

  world.totalGrainDemand = totalGrainDemand;
  world.grainPrice = grainPrice;
  world.supplyRatio = supplyRatio;
  world.saltPrice = saltPricing.nextPrice;
  world.clothPrice = clothPricing.nextPrice;
  world.saltAnnualSupply = clamp(saltAnnualSupply);
  world.saltAnnualDemand = clamp(saltAnnualDemand);
  world.actualSaltImport = clamp(saltImportExecuted);
  world.saltConsumed = clamp(saltConsumed);
  world.saltShortfallRatio = clampBetween(saltShortfallRatio, 0, 1);
  world.saltImportQuota = clamp(Math.max(0, desiredSaltImport));
  world.clothAnnualSupply = clamp(clothAnnualSupply);
  world.clothAnnualDemand = clamp(clothAnnualDemand);
  world.totalClothSupply = clamp(totalClothSupply);
  world.localClothRatio = localClothRatio;
  world.clothImportQuota = clamp(Math.max(0, Math.floor(world.clothImportQuota ?? 0)));
  world.blendedClothPrice = blendedClothPrice;
  world.grainAnnualDemand = clamp(grainAnnualDemand);
  world.circulationRatio = circulationRatio;
  world.commerceActivityBonus = effectiveCommerceActivityBonus;
  world.backingRatio = backingRatio;
  world.inflationRate = inflationRate;

  world.lastAgriculturalTax = agriculturalTax;

  world.stabilityPenalty = stabilityPenalty;
  world.stabilityPenaltyReason =
    inflationStabilityPenalty > 0
      ? `${stabilityPenaltyReason}; inflation penalty -${inflationStabilityPenalty}`
      : stabilityPenaltyReason;
  world.stabilityIndex = stabilityIndex;
  world.efficiencyMultiplier = efficiencyMultiplier;

  world.maxMarketDemand = maxMarketDemand;
  world.demandSaturation = demandSaturation;
  world.demandShortfall = demandShortfall;

  const satisfaction = calculateClassSatisfaction(world);
  world.farmerSatisfaction = satisfaction.farmerSatisfaction;
  world.merchantSatisfaction = satisfaction.merchantSatisfaction;
  world.officialSatisfaction = satisfaction.officialSatisfaction;
  world.landlordSatisfaction = satisfaction.landlordSatisfaction;

  const activeBehaviorWarnings = [];

  if (saltImportExecuted > 0) {
    if (xikou) {
      xikou.grainTreasury = clamp((xikou.grainTreasury ?? 0) + saltImportCostPaid);
      xikou.attitudeToPlayer = clampAttitude((xikou.attitudeToPlayer ?? 0) + 1);
    }
    behaviorMessages.push(
      `盐进口执行：进口${clamp(saltImportExecuted)}斤，支付${clamp(
        saltImportCostPaid
      )}${saltImportCurrency === 'coupon' ? '粮劵' : '粮食'}`
    );
  } else if (actualSaltImport > 0 && xikou?.diplomaticContact) {
    behaviorMessages.push('盐进口执行失败：储备不足，未能支付进口成本');
  }

  const previousClothImportReceived = Math.max(0, Number(world.previousClothImportReceived ?? 0));
  const clothImportsReduced = clothTradeReceived < previousClothImportReceived;
  world.clothImportReductionPenaltyApplied = false;

  if (clothImportsReduced && localClothRatio < 0.5 && xikou?.diplomaticContact) {
    xikou.attitudeToPlayer = clampAttitude((xikou.attitudeToPlayer ?? 0) - 5);
    world.clothImportReductionPenaltyApplied = true;
    behaviorMessages.push('溪口村对进口减少表示不满');
  }

  if (!world.localClothMilestone50Reached && localClothRatio >= 0.5) {
    world.localClothMilestone50Reached = true;
    behaviorMessages.push('本地布匹自给率达到50%里程碑');
  }

  if (!world.localClothMilestone80Reached && localClothRatio >= 0.8) {
    world.localClothMilestone80Reached = true;
    behaviorMessages.push('本地布匹自给率达到80%里程碑');
  }

  if (world.saltShortfallRatio > 0.3) {
    world.farmerSatisfaction = clampPercentIndex((world.farmerSatisfaction ?? 70) - 20);
    world.purchasingPower = clampBetween((world.purchasingPower ?? 100) - 15, 10, 150);
    behaviorMessages.push('盐荒严重，民间怨声载道');
  } else if (world.saltShortfallRatio > 0.1) {
    world.farmerSatisfaction = clampPercentIndex((world.farmerSatisfaction ?? 70) - 10);
    world.purchasingPower = clampBetween((world.purchasingPower ?? 100) - 8, 10, 150);
    behaviorMessages.push('盐供应紧张');
  }

  if (world.farmerSatisfaction < 40) {
    adjustedGrainOutput = clamp(adjustedGrainOutput * 0.8);
    activeBehaviorWarnings.push('⚠️ 农民消极怠工：农业产出降低 20%');
    behaviorMessages.push('农民消极怠工，农业产出下降');
  }

  if (world.merchantSatisfaction < 20) {
    adjustedCommerceGDP = clamp(adjustedCommerceGDP * 0.5);
    activeBehaviorWarnings.push('⚠️ 商业市场大规模萎缩：商业产出降低 50%');
    behaviorMessages.push('商业市场大规模萎缩');
  } else if (world.merchantSatisfaction < 40) {
    adjustedCommerceGDP = clamp(adjustedCommerceGDP * 0.7);
    activeBehaviorWarnings.push('⚠️ 商人拒收粮劵：商业产出降低 30%');
    behaviorMessages.push('商人拒收粮劵，改用实物交易');
  }

  if (world.officialSatisfaction < 40) {
    additionalStabilityPenalty = 10;
    activeBehaviorWarnings.push('⚠️ 官员消极：政策效果降低 20%，稳定度额外 -10');
    behaviorMessages.push('官员消极，政策执行力下降');
  }

  if (world.landlordSatisfaction < 40) {
    activeBehaviorWarnings.push('⚠️ 地主抵制开荒：土地扩张受阻');
    behaviorMessages.push('地主抵制开荒，土地扩张受阻');
  }

  world.officialPolicyEffectMultiplier = world.officialSatisfaction < 40 ? 0.8 : 1.0;
  world.activeBehaviorWarnings = activeBehaviorWarnings;
  world.behaviorMessages = behaviorMessages;

  if (additionalStabilityPenalty > 0) {
    world.stabilityPenalty += additionalStabilityPenalty;
    world.stabilityIndex = Math.max(0, (world.stabilityIndex ?? 0) - additionalStabilityPenalty);
    world.stabilityPenaltyReason = `${world.stabilityPenaltyReason}; official compliance penalty -${additionalStabilityPenalty}`;
  }

  let creditCrisisTriggered = false;
  const crisisTriggerConditionsMet =
    world.grainCouponsUnlocked &&
    (world.backingRatio ?? 1) < 0.4 &&
    (world.merchantSatisfaction ?? 70) < 40 &&
    (world.inflationRate ?? 0) >= 0.3;

  if (crisisTriggerConditionsMet && !world.creditCrisis) {
    world.creditCrisis = true;
    world.creditCrisisResolved = false;

    const previousCirculating = Math.max(0, world.couponCirculating ?? 0);
    const dumpedAmount = clamp(previousCirculating * 0.7);
    world.couponCirculating = Math.max(0, previousCirculating - dumpedAmount);
    world.grainTreasury = (world.grainTreasury ?? 0) - dumpedAmount;

    if (world.grainTreasury < 0) {
      world.grainTreasury = 0;
      world.stabilityIndex = Math.max(0, (world.stabilityIndex ?? 0) - 30);
      world.stabilityPenalty += 30;
      world.stabilityPenaltyReason = `${world.stabilityPenaltyReason}; bank run treasury collapse -30`;
    }

    world.merchantSatisfaction = clampPercentIndex((world.merchantSatisfaction ?? 0) - 20);

    const postCrisisBacking =
      (world.couponCirculating ?? 0) > 0
        ? Math.max(0, (world.grainTreasury ?? 0) / world.couponCirculating)
        : 1;
    world.backingRatio = postCrisisBacking;
    creditCrisisTriggered = true;
  }

  if (world.creditCrisis && (world.couponCirculating ?? 0) <= 0) {
    world.creditCrisis = false;
    world.creditCrisisResolved = true;
    world.backingRatio = 1;
  }

  adjustedGrainOutput = clamp(adjustedGrainOutput * (world.fertilizerBonus ?? 1));
  const cappedMaxYieldOutput = clamp((world.farmlandAreaMu ?? 0) * 600);
  adjustedGrainOutput = Math.min(adjustedGrainOutput, cappedMaxYieldOutput);

  if ((world.fertilizerBonus ?? 1) > 1) {
    behaviorMessages.push(
      `蚕沙肥覆盖率${Math.round((world.dungCoverage ?? 0) * 100)}%，粮食产出加成${Math.round(((world.fertilizerBonus ?? 1) - 1) * 100)}%`
    );
  }

  const lostGrainOutput = clamp(potentialGrainOutput - adjustedGrainOutput);
  const agricultureGDP = clamp(adjustedGrainOutput * grainPrice);
  const constructionGDP = clamp(world.constructionGDP ?? 0);
  const gdpEstimate = clamp(agricultureGDP + adjustedCommerceGDP + constructionGDP);

  const grainDemandTotal = clamp(world.totalPopulation * (world.grainDemandPerPerson ?? 0));
  const grainBalance = adjustedGrainOutput - grainDemandTotal;
  const grainPerCapita =
    world.totalPopulation > 0 ? clamp(adjustedGrainOutput / world.totalPopulation) : 0;
  const grainCoverageRatio =
    grainDemandTotal > 0 ? clampRatio(adjustedGrainOutput / grainDemandTotal) : 1;

  const farmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0
      ? (adjustedGrainOutput * 0.3 + landDevelopmentFarmerIncomeBoost) / world.farmingLaborAllocated
      : 0;

  const merchantIncomePerHead =
    (world.merchantCount ?? 0) > 0 ? (adjustedCommerceGDP * 0.5) / world.merchantCount : 0;

  const incomeGap = merchantIncomePerHead - farmerIncomePerHead;

  world.actualGrainOutput = adjustedGrainOutput;
  world.grainYieldPerMu =
    (world.farmlandAreaMu ?? 0) > 0 ? clamp(adjustedGrainOutput / world.farmlandAreaMu) : 0;
  world.lostGrainOutput = lostGrainOutput;
  world.agricultureGDP = agricultureGDP;
  world.commerceGDP = clamp(adjustedCommerceGDP);
  world.gdpEstimate = gdpEstimate;

  world.grainDemandTotal = grainDemandTotal;
  world.grainBalance = grainBalance;
  world.grainPerCapita = grainPerCapita;
  world.grainCoverageRatio = grainCoverageRatio;
  world.foodSecurityStatus = getFoodSecurityStatus(grainCoverageRatio);
  world.foodSecurityIndex = Math.round(grainCoverageRatio * 100);
  world.farmerIncomePerHead = farmerIncomePerHead;
  world.merchantIncomePerHead = merchantIncomePerHead;
  world.incomeGap = incomeGap;

  const taxGrainRatio = clampRatio(world.taxGrainRatio ?? 1);
  const salaryGrainRatio = clampRatio(world.salaryGrainRatio ?? 1);
  world.taxGrainRatio = taxGrainRatio;
  world.salaryGrainRatio = salaryGrainRatio;

  if (collectTax) {
    const taxToGrain = agriculturalTax * taxGrainRatio;
    const taxToCoupon = agriculturalTax - taxToGrain;

    const totalSalaryCost = Math.max(0, Number(world.totalSalaryCost ?? 0));
    const desiredCouponSalary = totalSalaryCost * (1 - salaryGrainRatio);
    const desiredGrainSalary = totalSalaryCost - desiredCouponSalary;

    const couponTreasuryAfterTax = Math.max(0, Number(world.couponTreasury ?? 0)) + taxToCoupon;

    let actualCouponSalary = desiredCouponSalary;
    let actualGrainSalary = desiredGrainSalary;
    let couponSalaryPaymentWarning = false;

    if (desiredCouponSalary > couponTreasuryAfterTax) {
      couponSalaryPaymentWarning = true;
      actualCouponSalary = 0;
      actualGrainSalary = totalSalaryCost;
    }

    world.grainTreasury = clamp(treasuryAfterCommerce + taxToGrain - actualGrainSalary);
    world.couponTreasury = clamp(couponTreasuryAfterTax - actualCouponSalary);
    world.lastSalaryCost = clamp(totalSalaryCost);
    world.couponSalaryPaymentWarning = couponSalaryPaymentWarning;
    world.lastTaxCollectionYear = world.year;
  }

  world.grainSurplus = clamp((world.grainTreasury ?? 0) - (world.grainAnnualDemand ?? 0), -999999999);
  const severeShortageThreshold = (world.totalPopulation ?? 0) * -100;
  if (world.grainSurplus < severeShortageThreshold) {
    world.stabilityIndex = Math.max(0, (world.stabilityIndex ?? 0) - 10);
    world.stabilityPenalty = (world.stabilityPenalty ?? 0) + 10;
    world.stabilityPenaltyReason = `${world.stabilityPenaltyReason}; severe grain shortage -10`;
  }

  world.purchasingPower = getPurchasingPowerIndex(
    world,
    world.saltPrice ?? 4,
    world.clothPrice ?? 2,
    world.grainPrice ?? 1
  );
  if (world.saltShortfallRatio > 0.3) {
    world.purchasingPower = clampBetween((world.purchasingPower ?? 100) - 15, 10, 150);
  } else if (world.saltShortfallRatio > 0.1) {
    world.purchasingPower = clampBetween((world.purchasingPower ?? 100) - 8, 10, 150);
  }
  world.saltReserve = clamp(saltReserve);
  world.previousSaltReserveForMarket = saltReserve;
  world.previousClothReserveForMarket = clothReserve;
  world.previousClothImportReceived = clamp(clothTradeReceived);
  world.landDevelopmentFarmerIncomeBoost = 0;
  world.landDevelopmentCommerceBoost = 0;
  world.hempReclamationUsedThisYear = false;
  world.mulberryReclamationUsedThisYear = false;

  return {
    grainOutput: adjustedGrainOutput,
    potentialGrainOutput,
    lostGrainOutput,
    agriculturalTax,
    grainDemandTotal,
    grainBalance,
    grainCoverageRatio,
    behaviorMessages,
    diplomacyMessages,
    creditCrisisTriggered,
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

  const maxIssuable = clamp(state.world.grainTreasury ?? 0);
  if (issueAmount > maxIssuable) {
    return {
      success: false,
      reason: `Issue amount exceeds current treasury absorption limit (${maxIssuable}).`,
    };
  }

  const denominationBreakdown = getCouponDenominationBreakdown(issueAmount);

  state.world.grainTreasury += issueAmount;
  state.world.couponCirculating += issueAmount;
  state.world.couponTotalIssued += issueAmount;
  state.world.lastCouponIssueAmount = issueAmount;
  state.world.lastCouponDenominationBreakdown = denominationBreakdown;

  return {
    success: true,
    issueAmount,
    denominationBreakdown,
  };
}
