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
  const backingRatio = couponCirculating > 0 ? Math.max(0, (world.grainTreasury ?? 0) / couponCirculating) : 1.0;

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

function calculateClassSatisfaction(world) {
  let farmerSatisfaction = 70;
  if ((world.agriculturalTaxRate ?? 0) > 0.5) farmerSatisfaction -= 15;
  if ((world.inflationRate ?? 0) >= 0.15) farmerSatisfaction -= 10;
  if ((world.grainTreasury ?? 0) < (world.totalPopulation ?? 0) * 1) farmerSatisfaction -= 20;
  if ((world.taxGrainRatio ?? 1) < 0.5) farmerSatisfaction -= 10;

  let merchantSatisfaction = 70;
  if ((world.inflationRate ?? 0) >= 0.15) merchantSatisfaction -= 20;
  if ((world.inflationRate ?? 0) >= 0.3) merchantSatisfaction -= 20;
  if ((world.demandSaturation ?? 0) > 1.5) merchantSatisfaction -= 10;
  if ((world.stabilityIndex ?? 80) < 50) merchantSatisfaction -= 15;
  if ((world.commerceActivityBonus ?? 1) > 1.0) merchantSatisfaction += 10;

  let officialSatisfaction = 70;
  if ((world.salaryGrainRatio ?? 1) < 0.5 && (world.inflationRate ?? 0) >= 0.15) officialSatisfaction -= 20;
  if ((world.salaryGrainRatio ?? 1) < 0.3 && (world.inflationRate ?? 0) >= 0.05) officialSatisfaction -= 15;
  if ((world.stabilityIndex ?? 80) < 50) officialSatisfaction -= 10;

  let landlordSatisfaction = 70;
  if ((world.inflationRate ?? 0) >= 0.15) landlordSatisfaction -= 15;
  if ((world.grainPrice ?? 1) < 0.8) landlordSatisfaction -= 10;
  if ((world.stabilityIndex ?? 80) < 50) landlordSatisfaction -= 10;
  if ((world.farmlandAreaMu ?? 0) > 40000) landlordSatisfaction += 10;

  return {
    farmerSatisfaction: clampPercentIndex(farmerSatisfaction),
    merchantSatisfaction: clampPercentIndex(merchantSatisfaction),
    officialSatisfaction: clampPercentIndex(officialSatisfaction),
    landlordSatisfaction: clampPercentIndex(landlordSatisfaction),
  };
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

  const { circulationRatio, commerceActivityBonus } = getCommerceActivityBonus(world);
  const {
    backingRatio,
    inflationRate,
    inflationStabilityPenalty,
    inflationCommercePenaltyMultiplier,
  } = getInflationState(world);

  const effectiveCommerceActivityBonus = commerceActivityBonus * inflationCommercePenaltyMultiplier;

  const preStabilityCommerceGDP = clamp(
    operatingShops * 500 * demandEfficiencyRate * grainSupplyEfficiency * effectiveCommerceActivityBonus
  );

  const preStabilityFarmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0
      ? (preStabilityGrainOutput * 0.3) / world.farmingLaborAllocated
      : 0;

  const preStabilityMerchantIncomePerHead =
    (world.merchantCount ?? 0) > 0 ? (preStabilityCommerceGDP * 0.5) / world.merchantCount : 0;

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
  const behaviorMessages = [];

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
      ? (adjustedGrainOutput * 0.3) / world.farmingLaborAllocated
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

  return {
    grainOutput: adjustedGrainOutput,
    potentialGrainOutput,
    lostGrainOutput,
    agriculturalTax,
    grainDemandTotal,
    grainBalance,
    grainCoverageRatio,
    behaviorMessages,
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
