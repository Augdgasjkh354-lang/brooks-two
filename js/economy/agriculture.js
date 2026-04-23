// Agriculture module: grain output and food security

import { clamp, calculateLaborAllocation } from './labor.js';
import { getEfficiencyMultiplier } from '../society/stability.js';
import { calculateClassSatisfaction } from '../society/satisfaction.js';
import { getCommerceActivityBonus } from './commerce.js';
import { getInflationState, issueGrainCoupons } from './currency.js';
import { updateXikouVillageEconomy, updateXikouDiplomacy } from '../diplomacy/xikou.js';
import {
  getGrainPrice,
  calculateCommodityPrice,
  getPurchasingPowerIndex,
  getSaltImportCost,
  executeOfficialSaltSale,
  previewOfficialSaltSale,
} from './market.js';
import {
  getStabilityPenaltyFromIncomeGap,
} from '../society/stability.js';

export function getFoodSecurityStatus(grainCoverageRatio) {
  if (grainCoverageRatio >= 1) return 'Secure';
  if (grainCoverageRatio >= 0.85) return 'Strained';
  return 'Shortage';
}

export function getFertilizerBonus(dungCoverage) {
  const coverage = Math.max(0, dungCoverage ?? 0);

  if (coverage <= 0) return 1.0;
  if (coverage < 0.15) return 1.05;
  if (coverage <= 0.4) return 1.12;
  return 1.2;
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

