// Agriculture module: grain output and food security

import { clamp, clampRatio, calculateLaborAllocation } from './labor.js';
import {
  getEfficiencyMultiplier,
  getStabilityBase,
  getBureaucracyEffects,
  applyBureaucracyAnnualMaintenance,
} from '../society/stability.js';
import {
  calculateClassSatisfaction,
  clampPercentIndex,
  applyLiteracyEffectsToWorld,
} from '../society/satisfaction.js';
import { getCommerceActivityBonus, getMerchantLiteracyMultiplier, calculateGdpPerCapita, applyTradePolicySettings, calculateProductionCommerceGDP } from './commerce.js';
import { getInflationState, issueGrainCoupons } from './currency.js';
import { transfer } from './transfer.js';
import {
  updateXikouVillageEconomy,
  updateXikouDiplomacy,
  clampAttitude,
} from '../diplomacy/xikou.js';
import {
  getGrainPrice,
  calculateCommodityPrice,
  getPurchasingPowerIndex,
  getSaltImportCost,
  executeOfficialSaltSale,
  previewOfficialSaltSale,
  clampBetween,
  getIncomePoolDemandEffects,
  applyRoadMarketEffects,
  getTotalGrainDemand,
  getGrainSupplyRatio,
} from './market.js';
import {
  getStabilityPenaltyFromIncomeGap,
  calculateGovernmentEfficiency,
  calculateFireLeakage,
} from '../society/stability.js';
import {
  FARMLAND_RECLAIM_COST_PER_MU, HEMP_RECLAIM_COST_PER_MU, MULBERRY_RECLAIM_COST_PER_MU,
  MAX_GRAIN_YIELD_PER_MU, COUPON_GRAIN_RATIO, GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR
} from '../config/constants.js';


export const AGRICULTURE_RECLAMATION_COSTS = {
  farmlandPerMu: FARMLAND_RECLAIM_COST_PER_MU,
  hempPerMu: HEMP_RECLAIM_COST_PER_MU,
  mulberryPerMu: MULBERRY_RECLAIM_COST_PER_MU,
};

function ensureLedger(world) {
  if (!world.ledger) world.ledger = {};
  const defaults = [
    'taxRevenue', 'rentRevenue', 'commerceTaxRevenue', 'landTaxRevenue', 'moneylenderTaxRevenue',
    'couponTaxRevenue', 'tradeRevenue', 'debtBorrowed', 'totalIncome', 'wageBill', 'researchCost',
    'constructionCost', 'educationCost', 'importCost', 'subsidyCost', 'debtRepayment', 'debtInterest',
    'totalExpense', 'netBalance', 'farmerGrossIncome', 'farmerTaxPaid', 'farmerNetIncome',
    'farmerConsumption', 'farmerSavingsChange', 'merchantGrossIncome', 'merchantTaxPaid',
    'merchantNetIncome', 'merchantConsumption', 'merchantSavingsChange', 'officialGrossIncome',
    'officialNetIncome', 'officialSavingsChange',
  ];
  defaults.forEach((key) => {
    world.ledger[key] = Math.max(0, Number(world.ledger[key] ?? 0));
  });
  return world.ledger;
}

function getLandState(world) {
  return world.__land ?? world;
}

function getAgricultureState(world) {
  return world.__agriculture ?? world;
}

function getPrivateSectorState(world) {
  return world.__privateSector ?? world.privateSector ?? null;
}

function getPopulationGrainDemand(world) {
  const infantPop = Math.max(0, Number(world.infantPop ?? 0));
  const childPop = Math.max(0, Number(world.childPop ?? 0));
  const teenPop = Math.max(0, Number(world.teenPop ?? 0));
  const youthPop = Math.max(0, Number(world.youthPop ?? 0));
  const primeAdultPop = Math.max(0, Number(world.primeAdultPop ?? 0));
  const middleAgePop = Math.max(0, Number(world.middleAgePop ?? 0));
  const elderlyPop = Math.max(0, Number(world.elderlyPop ?? 0));

  const demandFromCohorts =
    infantPop * 240 +
    childPop * 300 +
    teenPop * 400 +
    youthPop * 400 +
    primeAdultPop * 400 +
    middleAgePop * 400 +
    elderlyPop * 360;

  if (demandFromCohorts > 0) {
    return demandFromCohorts;
  }

  return Math.max(0, Number(world.totalPopulation ?? 0) * 360);
}

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
  const land = getLandState(world);
  const agriculture = getAgricultureState(world);
  const ledger = ensureLedger(world);
  const savingsStart = {
    farmer: Math.max(0, Number(world.farmerSavings ?? 0)),
    merchant: Math.max(0, Number(world.merchantSavings ?? 0)),
    official: Math.max(0, Number(world.officialSavings ?? 0)),
  };
  updateXikouVillageEconomy(world);
  const diplomacyMessages = updateXikouDiplomacy(world);

  const behaviorMessages = [];
  const currentYear = world.year ?? 1;

  const farmerIncomePool = Math.max(0, Number(world.farmerIncomePool ?? 0));
  const merchantIncomePool = Math.max(0, Number(world.merchantIncomePool ?? 0));
  const officialIncomePool = Math.max(0, Number(world.officialIncomePool ?? 0));
  const incomePoolEffects = getIncomePoolDemandEffects(world);
  const bureaucracyEffects = getBureaucracyEffects(world);
  const roadEffects = applyRoadMarketEffects(world);

  const maturedHempLand = Math.max(0, Math.floor(land.pendingHempLandMu ?? 0));
  if (maturedHempLand > 0) {
    land.hempLandMu = clamp((land.hempLandMu ?? 0) + maturedHempLand);
    land.pendingHempLandMu = 0;
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
  land.pendingMulberryLandMu = stillPendingMulberry.reduce(
    (sum, project) => sum + Math.max(0, Math.floor(project?.mu ?? 0)),
    0
  );
  land.mulberryMaturationYear =
    stillPendingMulberry.length > 0
      ? Math.min(...stillPendingMulberry.map((project) => project.maturesOnYear))
      : 0;

  if (maturedMulberryLand > 0) {
    land.mulberryLandMu = clamp((land.mulberryLandMu ?? 0) + maturedMulberryLand);
    world.mulberryMatureLandMu = clamp((world.mulberryMatureLandMu ?? 0) + maturedMulberryLand);
    behaviorMessages.push(`桑田首收：新增成熟桑田${maturedMulberryLand}亩`);
  }

  const { farmEfficiency, hempEfficiency, mulberryEfficiency, unemploymentEffectTier, wageSignals } = calculateLaborAllocation(world);
  world.farmingWage = Math.max(0, Number(wageSignals?.farmingWage ?? world.farmingWage ?? 0));
  world.commerceWagePerWorker = Math.max(0, Number(wageSignals?.commerceWagePerWorker ?? world.commerceWagePerWorker ?? 0));
  world.hempWage = Math.max(0, Number(wageSignals?.hempWage ?? world.hempWage ?? 0));
  world.mulberryWage = Math.max(0, Number(wageSignals?.mulberryWage ?? world.mulberryWage ?? 0));
  world.averageWage = Math.max(0, Number(wageSignals?.averageWage ?? world.averageWage ?? 0));

  const literacyEffects = applyLiteracyEffectsToWorld(world);

  const paperMaterial = clamp((land.hempLandMu ?? 0) * 20);
  const hempStalks = clamp((land.hempLandMu ?? 0) * 200);
  const buildingFiber = clamp((land.hempLandMu ?? 0) * 10);

  const paperMaterialReserveCap = clamp((land.hempLandMu ?? 0) * 100);
  const nextPaperMaterialReserve = clamp(
    Math.min(
      paperMaterialReserveCap,
      Math.max(0, Number(world.paperMaterialReserve ?? 0)) + paperMaterial
    )
  );

  const paperOutput = world.techBonuses?.bureaucracyUnlocked ? clamp(nextPaperMaterialReserve / 50) : 0;

  const nextBuildingFiberReserve = clamp(Math.max(0, Number(world.buildingFiberReserve ?? 0)) + buildingFiber);
  const structuralThreshold = clamp((land.farmlandAreaMu ?? 0) * 5);
  const structuralBonus = structuralThreshold > 0 && nextBuildingFiberReserve >= structuralThreshold;
  const laborEfficiency = structuralBonus ? 1.02 : 1.0;

  let constructionCostReduction = 0;
  if ((land.hempLandMu ?? 0) >= 5000) {
    constructionCostReduction = 0.15;
  } else if ((land.hempLandMu ?? 0) >= 2000) {
    constructionCostReduction = 0.1;
  } else if ((land.hempLandMu ?? 0) >= 500) {
    constructionCostReduction = 0.05;
  }

  const effectiveFarmEfficiency =
    farmEfficiency *
    laborEfficiency *
    (1 + (literacyEffects.farmerEfficiencyBonus ?? 0)) *
    (1 + Math.max(0, Number(world.techTalentAgricultureBonus ?? 0)));
  const effectiveHempEfficiency = hempEfficiency * laborEfficiency;
  const effectiveMulberryEfficiency = mulberryEfficiency * laborEfficiency;

  const baseYield = agriculture.baseGrainYieldPerMu ?? agriculture.grainYieldPerMu;
  agriculture.baseGrainYieldPerMu = clamp(baseYield);

  const techYieldBonus = Math.max(0, Number(world.techBonuses?.grainYieldBonus ?? 0));
  const effectiveYieldPerMu = Math.min(MAX_GRAIN_YIELD_PER_MU, Math.max(0, agriculture.baseGrainYieldPerMu + techYieldBonus));

  const potentialGrainOutput = clamp(land.farmlandAreaMu * effectiveYieldPerMu);
  const preStabilityGrainOutput = clamp(potentialGrainOutput * effectiveFarmEfficiency);
  const agriculturalTax = clamp(
    preStabilityGrainOutput * agriculture.agriculturalTaxRate * (1 + bureaucracyEffects.taxEfficiencyBonus)
  );

  const operatingShops = Math.max(0, Math.floor(world.operatingShops ?? 0));
  const idleShops = Math.max(0, Math.floor(world.idleShops ?? 0));

  const maxMarketDemand = world.totalPopulation > 0 ? world.totalPopulation / 50 : 0;
  const demandSaturation = maxMarketDemand > 0 ? operatingShops / maxMarketDemand : 0;
  const grainAnnualDemand = clamp(
    getTotalGrainDemand({
      ...world,
      totalGrainDemand: Math.max(0, Number(world.totalGrainDemand ?? 0)),
      grainAnnualDemand: Math.max(0, Number(world.grainAnnualDemand ?? 0)),
      totalPopulation: Math.max(0, Number(world.totalPopulation ?? 0)),
    })
  );
  const commerceGrainDemand = clamp(operatingShops * 200);
  const availableGrainForCommerce = Math.max(0, agriculture.grainTreasury ?? 0);
  const grainConsumedByCommerce = Math.min(availableGrainForCommerce, commerceGrainDemand);
  const grainSupplyEfficiency =
    commerceGrainDemand > 0 ? grainConsumedByCommerce / commerceGrainDemand : 1;

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
  const merchantLiteracyMultiplier = getMerchantLiteracyMultiplier(world);

  world.constructionCostReductionBase = constructionCostReduction;
  constructionCostReduction += Math.max(0, Number(world.engineeringConstructionReduction ?? 0));
  world.constructionCostReduction = constructionCostReduction;

  const {
    commerceGDP: productionCommerceGDP,
    moneylenderGDP: baseMoneylenderGDP,
    demandEfficiency,
  } = calculateProductionCommerceGDP(world, {
    operatingShops,
    maxMarketDemand,
    demandSaturation,
    commerceActivityBonus: effectiveCommerceActivityBonus,
    tradeEfficiency: Number(world.techBonuses?.tradeEfficiency ?? 0),
  });

  const preStabilityCommerceGDP = clamp(
    productionCommerceGDP *
      grainSupplyEfficiency *
      laborEfficiency *
      merchantLiteracyMultiplier
  );

  const preStabilityFarmerIncomePerHead =
    (world.farmingLaborAllocated ?? 0) > 0
      ? (preStabilityGrainOutput * (COUPON_GRAIN_RATIO * 0.3) + landDevelopmentFarmerIncomeBoost) / world.farmingLaborAllocated
      : 0;

  const preStabilityMerchantIncomePerHead =
    (world.merchantCount ?? 0) > 0
      ? ((preStabilityCommerceGDP + landDevelopmentCommerceBoost) * 0.5) / world.merchantCount
      : 0;

  const preStabilityIncomeGap = preStabilityMerchantIncomePerHead - preStabilityFarmerIncomePerHead;

  const { penalty: incomeGapPenalty, reason: stabilityPenaltyReason } =
    getStabilityPenaltyFromIncomeGap(preStabilityIncomeGap);
  const rawStabilityPenalty = incomeGapPenalty + inflationStabilityPenalty;
  const literacyStabilityReduction = Math.max(0, literacyEffects.stabilityPenaltyReduction ?? 0);
  const totalStabilityPenaltyReduction = Math.min(0.8, bureaucracyEffects.stabilityPenaltyReduction + literacyStabilityReduction);
  const stabilityPenalty = rawStabilityPenalty * (1 - totalStabilityPenaltyReduction);
  const stabilityBase = getStabilityBase(world);
  const stabilityIndex = Math.max(0, stabilityBase - stabilityPenalty);
  const efficiencyMultiplier = getEfficiencyMultiplier(stabilityIndex);

  const grainOutput = clamp(preStabilityGrainOutput * efficiencyMultiplier);
  const commerceGDP = clamp(preStabilityCommerceGDP * efficiencyMultiplier);

  const treasuryAfterCommerce = collectTax
    ? availableGrainForCommerce - grainConsumedByCommerce
    : availableGrainForCommerce;

  const fallbackDemand = Math.max(0, Number(world.totalPopulation ?? 0)) * GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR;
  const effectiveGrainDemand = grainAnnualDemand > 0 ? grainAnnualDemand : fallbackDemand;
  const supplyRatio = getGrainSupplyRatio(world, treasuryAfterCommerce, effectiveGrainDemand);
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

  const coarseClothOutput = clamp((world.hempLandMu ?? 0) * 5 * effectiveHempEfficiency);
  const rawSilkOutput = clamp((world.mulberryMatureLandMu ?? 0) * 5 * effectiveMulberryEfficiency);
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

  const saltAnnualDemand = Math.max(0, world.totalPopulation * 15 + incomePoolEffects.saltDemandIncrease);
  const clothAnnualDemand = Math.max(0, world.totalPopulation * 0.3 + incomePoolEffects.clothDemandIncrease);

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
    ledger.importCost += Math.max(0, Number(dungImportCostPaid ?? 0));
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
  world.paperMaterial = paperMaterial;
  world.paperMaterialReserve = nextPaperMaterialReserve;
  world.paperOutput = paperOutput;
  world.hempStalks = hempStalks;
  world.constructionCostReduction = constructionCostReduction;
  world.buildingFiber = buildingFiber;
  world.buildingFiberReserve = nextBuildingFiberReserve;
  world.structuralBonus = structuralBonus;
  world.laborEfficiency = laborEfficiency;

  const quotaBonusMultiplier = 1 + Math.max(0, Number(world.tradeQuotaBonus ?? 0));
  const maxSaltImport = Math.max(0, Math.floor((xikou?.saltOutputJin ?? 0) * 0.5 * quotaBonusMultiplier));
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

  const localClothRatio =
    clothAnnualDemand > 0 ? Math.max(0, totalClothOutput / clothAnnualDemand) : 0;

  const privateSector = getPrivateSectorState(world);
  if (privateSector) {
    const annualFarmerIncome =
      Math.max(0, Number(world.farmingLaborAllocated ?? 0)) *
      10 *
      Math.max(0, Number(agriculture.grainYieldPerMu ?? effectiveYieldPerMu)) *
      (1 - Math.max(0, Number(agriculture.agriculturalTaxRate ?? world.agriculturalTaxRate ?? 0)));
    const annualFarmerConsumption =
      Math.max(0, Number(world.farmingLaborAllocated ?? 0)) * 360;
    const retainedGrain = annualFarmerIncome;
    const farmerRetentionApplied = transfer({
      from: 'private.farmer.grain',
      to: 'private.farmer.grain',
      asset: 'grain',
      amount: retainedGrain,
      gdpTreatment: 'production',
      reason: 'farmer_retention'
    }, world);
    const saltSpending = Math.max(0, Number(privateSector.farmerGrain ?? 0)) * Math.max(0, Number(saltPricing.nextPrice ?? world.saltPrice ?? 0)) * 15;

    privateSector.farmerGrain = Math.max(
      0,
      Number(privateSector.farmerGrain ?? 0) + (farmerRetentionApplied ? retainedGrain : 0) - annualFarmerConsumption - saltSpending
    );
    privateSector.merchantGoods = Math.max(
      0,
      Number(privateSector.merchantGoods ?? 0) + commerceGDP * 0.5
    );
    privateSector.merchantGoods = Math.max(0, Number(privateSector.merchantGoods ?? 0) - Number(privateSector.merchantGoods ?? 0) * 0.3);
    privateSector.totalPrivateGrain = Math.max(0, Number(privateSector.farmerGrain ?? 0));
    privateSector.totalPrivateCoupons = Math.max(
      0,
      Number(privateSector.farmerCoupons ?? 0) + Number(privateSector.merchantCoupons ?? 0)
    );
  }

  let adjustedGrainOutput = grainOutput;
  let adjustedCommerceGDP = commerceGDP;
  let additionalStabilityPenalty = 0;
  const demandShortfall = demandSaturation < 0.5;

  if (operatingShops > 0 && demandEfficiency < 1) {
    behaviorMessages.push(
      `商业需求饱和：店铺效率降至${Math.round(demandEfficiency * 100)}%（在营${Math.round(operatingShops)} / 需求上限${Math.round(maxMarketDemand)}）`
    );
  }

  world.grainYieldPerMu = clamp(effectiveYieldPerMu * effectiveFarmEfficiency * efficiencyMultiplier);
  world.potentialGrainOutput = potentialGrainOutput;
  world.actualGrainOutput = grainOutput;

  world.operatingShops = clamp(operatingShops);
  world.idleShops = clamp(idleShops);

  world.totalGrainDemand = grainAnnualDemand;
  world.grainPrice = grainPrice;
  world.supplyRatio = supplyRatio;
  world.saltPrice = saltPricing.nextPrice;
  world.clothPrice = clothPricing.nextPrice;
  world.saltAnnualSupply = clamp(saltAnnualSupply);
  world.saltAnnualDemand = clamp(saltAnnualDemand);
  world.actualSaltImport = clamp(saltImportExecuted);
  world.saltConsumed = clamp(saltConsumed);
  world.saltShortfallRatio = clampBetween(saltShortfallRatio, 0, 1);
  world.saltImportQuota = clamp(Math.max(0, Math.min(desiredSaltImport, maxSaltImport)));
  world.clothAnnualSupply = clamp(clothAnnualSupply);
  world.clothAnnualDemand = clamp(clothAnnualDemand);
  world.totalClothSupply = clamp(totalClothSupply);
  world.localClothRatio = localClothRatio;
  const localClothCap = Math.max(0, Math.floor(totalClothOutput * Math.max(0, Number(world.tradeProtectionQuotaCapRatio ?? 1))));
  const requestedClothQuota = Math.max(0, Math.floor(world.clothImportQuota ?? 0));
  world.clothImportQuota = clamp(Math.min(requestedClothQuota, localClothCap > 0 ? localClothCap : requestedClothQuota));
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
  world.policyExecutionEfficiency = literacyEffects.policyExecutionEfficiency;
  world.stabilityPenaltyLiteracyReduction = literacyEffects.stabilityPenaltyReduction;
  world.textileOutputLiteracyBonus = literacyEffects.textileOutputBonus;
  world.landReclaimEfficiency =
    1 +
    (literacyEffects.landReclaimEfficiencyBonus ?? 0) +
    Math.max(0, Number(roadEffects.reclaimEfficiencyBonus ?? 0)) +
    Math.max(0, Number(world.engineeringReclaimBonus ?? 0));
  world.farmerLiteracyEfficiencyBonus = literacyEffects.farmerEfficiencyBonus;
  world.merchantLiteracyEfficiencyBonus = literacyEffects.merchantGDPMultiplierBonus;
  world.farmerEventModifier = 0;
  world.merchantEventModifier = 0;
  world.officialEventModifier = 0;
  world.landlordEventModifier = 0;

  if (unemploymentEffectTier === 'high') {
    behaviorMessages.push('大规模失业，社会动荡');
  } else if (unemploymentEffectTier === 'medium') {
    behaviorMessages.push('失业问题严重，社会不稳');
  } else if (unemploymentEffectTier === 'low') {
    behaviorMessages.push('失业率上升，民间压力增大');
  }

  calculateClassSatisfaction(world);
  calculateGovernmentEfficiency(world);
  const fireLeakageInfo = calculateFireLeakage(world);
  const paperSatisfactionBonus = Math.min(paperOutput * 0.01, 10);
  const structuralFarmerBonus = structuralBonus ? 3 : 0;

  let farmlandRentPenalty = 0;
  if ((world.farmlandRentRate ?? 0) > 15) {
    farmlandRentPenalty = 25;
  } else if ((world.farmlandRentRate ?? 0) > 10) {
    farmlandRentPenalty = 10;
  }

  world.farmerEventModifier += structuralFarmerBonus + incomePoolEffects.farmerSatisfactionBonus - farmlandRentPenalty;
  const merchantSatisfactionTechBonus = Number(world.techBonuses?.merchantSatisfactionBonus ?? 0);
  const merchantSatisfactionPolicyBonus = bureaucracyEffects.merchantSatisfactionPermanentBonus;
  world.merchantEventModifier +=
    merchantSatisfactionTechBonus + merchantSatisfactionPolicyBonus + incomePoolEffects.merchantSatisfactionBonus;
  world.officialEventModifier += paperSatisfactionBonus + incomePoolEffects.officialSatisfactionBonus;

  const activeBehaviorWarnings = [];
  const publicToilets = Math.max(0, Number(world.publicToilets ?? 0));
  const sanitationWorkers = Math.max(0, Number(world.sanitationWorkerCount ?? 0));
  const workerToToiletRatio = publicToilets > 0 ? sanitationWorkers / publicToilets : 0;
  const toiletCoverage = (world.totalPopulation ?? 0) > 0 ? (publicToilets * 100) / (world.totalPopulation ?? 1) : 0;
  const coverageMultiplier = publicToilets > 0 && workerToToiletRatio < 0.1 ? 0.5 : 1;

  world.toiletCoverage = toiletCoverage;
  world.workerToToiletRatio = workerToToiletRatio;

  if (publicToilets > 0 && workerToToiletRatio < 0.1) {
    behaviorMessages.push('厕所维护人手不足');
  }

  if (toiletCoverage >= 30) {
    world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? 50) + Math.round(3 * coverageMultiplier));
  }
  if (toiletCoverage >= 50) {
    world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? 50) + Math.round(5 * coverageMultiplier));
    world.workerLifeQuality = clampPercentIndex((world.workerLifeQuality ?? 50) + Math.round(3 * coverageMultiplier));
  }
  if (toiletCoverage >= 80) {
    const allBoost = Math.round(3 * coverageMultiplier);
    world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? 50) + allBoost);
    world.merchantLifeQuality = clampPercentIndex((world.merchantLifeQuality ?? 50) + allBoost);
    world.officialLifeQuality = clampPercentIndex((world.officialLifeQuality ?? 50) + allBoost);
    world.landlordLifeQuality = clampPercentIndex((world.landlordLifeQuality ?? 50) + allBoost);
    behaviorMessages.push('公共卫生覆盖良好');
  }
  if (toiletCoverage < 10 && (world.totalPopulation ?? 0) > 2000) {
    world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? 50) - Math.round(5 * coverageMultiplier));
    behaviorMessages.push('公共厕所严重不足');
  }

  const healthPrereqMet =
    publicToilets >= 50 &&
    Math.max(0, Number(world.sanitationWorkerCount ?? 0)) >= 5 &&
    Math.max(0, Number(world.cleaningWorkerCount ?? 0)) >= 5;
  if (healthPrereqMet && !world.healthBureauPrereqAnnounced) {
    behaviorMessages.push('卫生局建立条件已满足');
    world.healthBureauPrereqAnnounced = true;
  }
  world.healthBureauPrereqMet = healthPrereqMet;

  if (roadEffects.maintenanceInsufficient) {
    behaviorMessages.push('道路维护人手不足');
  }
  if (structuralBonus) {
    behaviorMessages.push('麻纤维加固生效：农业结构稳固，劳作效率提升2%');
  }
  if (paperOutput > 0) {
    behaviorMessages.push(`造纸产出${Math.round(paperOutput)}，官员满意度提升${paperSatisfactionBonus.toFixed(1)}`);
  }

  if (saltImportExecuted > 0) {
    ledger.importCost += Math.max(0, Number(saltImportCostPaid ?? 0));
    ledger.farmerConsumption += Math.max(0, Number(saltImportCostPaid ?? 0) * 0.6);
    ledger.merchantConsumption += Math.max(0, Number(saltImportCostPaid ?? 0) * 0.4);
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
    world.farmerEventModifier -= 20;
    world.purchasingPower = clampBetween((world.purchasingPower ?? 100) - 15, 10, 150);
    behaviorMessages.push('盐荒严重，民间怨声载道');
  } else if (world.saltShortfallRatio > 0.1) {
    world.farmerEventModifier -= 10;
    world.purchasingPower = clampBetween((world.purchasingPower ?? 100) - 8, 10, 150);
    behaviorMessages.push('盐供应紧张');
  }

  calculateClassSatisfaction(world);

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
    world.lockedGrainReserve = Math.max(0, (world.lockedGrainReserve ?? 0) - dumpedAmount);

    if (world.grainTreasury < 0) {
      world.grainTreasury = 0;
      world.stabilityIndex = Math.max(0, (world.stabilityIndex ?? 0) - 30);
      world.stabilityPenalty += 30;
      world.stabilityPenaltyReason = `${world.stabilityPenaltyReason}; bank run treasury collapse -30`;
    }

    world.merchantEventModifier -= 20;
    calculateClassSatisfaction(world);

    const postCrisisBacking =
      (world.couponCirculating ?? 0) > 0
        ? Math.max(0, (world.lockedGrainReserve ?? 0) / world.couponCirculating)
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
  const cappedMaxYieldOutput = clamp((world.farmlandAreaMu ?? 0) * effectiveYieldPerMu);
  adjustedGrainOutput = Math.min(adjustedGrainOutput, cappedMaxYieldOutput);

  if ((world.fertilizerBonus ?? 1) > 1) {
    behaviorMessages.push(
      `蚕沙肥覆盖率${Math.round((world.dungCoverage ?? 0) * 100)}%，粮食产出加成${Math.round(((world.fertilizerBonus ?? 1) - 1) * 100)}%`
    );
  }

  const lostGrainOutput = clamp(potentialGrainOutput - adjustedGrainOutput);
  const grainGDP = clamp(adjustedGrainOutput * grainPrice);
  const clothGDP = clamp(totalClothOutput * blendedClothPrice);
  const silkGDP = clamp(rawSilkOutput * 3.0);
  const agricultureGDP = clamp(grainGDP + clothGDP + silkGDP);
  const constructionSpendingThisYear = clamp(world.constructionSpendingThisYear ?? 0);
  const constructionGDP = clamp(constructionSpendingThisYear * 0.7);
  const governmentGDP = clamp((world.totalWageBill ?? 0) * 0.8);

  const grainDemandTotal = grainAnnualDemand;
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
  world.effectiveGrainYieldPerMu = effectiveYieldPerMu;
  world.lostGrainOutput = lostGrainOutput;
  world.grainGDP = grainGDP;
  world.clothGDP = clothGDP;
  world.agricultureGDP = agricultureGDP;
  world.constructionGDP = constructionGDP;
  world.governmentGDP = governmentGDP;

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
  world.landTaxRate = clampBetween(Number(world.landTaxRate ?? 0), 0, 5);

  if (collectTax) {
    const tradePolicyResult = applyTradePolicySettings(world);
    const farmlandRentRate = clampBetween(Number(world.farmlandRentRate ?? 0), 0, 20);
    world.farmlandRentRate = farmlandRentRate;
    const farmlandRentCollected = Math.max(0, Number(world.farmlandAreaMu ?? 0) * farmlandRentRate);
    const landTaxCollected = Math.max(0, Number(world.farmlandAreaMu ?? 0) * Number(world.landTaxRate ?? 0));
    const commerceTaxRate = Math.max(0, Math.min(0.3, Number(world.commerceTaxRate ?? 0)));
    if (commerceTaxRate > 0.2) {
      world.commerceGDP = Math.max(0, Number(world.commerceGDP ?? 0) * 0.9);
      adjustedCommerceGDP = Math.max(0, adjustedCommerceGDP * 0.9);
    }
    const commerceTaxCollected = Math.max(0, Number(world.commerceGDP ?? 0) * commerceTaxRate);
    world.commerceTaxRevenue = commerceTaxCollected;

    const theoreticalTaxRevenue = Math.max(0, agriculturalTax + landTaxCollected + commerceTaxCollected);
    const taxBureauMultiplier = Math.max(0.5, Number(world.taxBureauRevenueMultiplier ?? 1));
    const actualTaxRevenue = theoreticalTaxRevenue * (1 - (world.fireLeakageRate ?? fireLeakageInfo.rate ?? 0.05)) * taxBureauMultiplier;
    const leakedTax = Math.max(0, theoreticalTaxRevenue - actualTaxRevenue);
    const leakedToOfficials = leakedTax * 0.6;

    world.theoreticalTaxRevenue = theoreticalTaxRevenue;
    world.actualTaxRevenue = actualTaxRevenue;

    transfer({
      from: 'private.farmer.grain',
      to: 'government.grain',
      asset: 'grain',
      amount: agriculturalTax,
      gdpTreatment: 'transfer',
      reason: 'agricultural_tax'
    }, world);

    const taxToGrain = actualTaxRevenue * taxGrainRatio;
    const taxToCoupon = actualTaxRevenue - taxToGrain;
    const rentToGrain = farmlandRentCollected * taxGrainRatio;
    const rentToCoupon = farmlandRentCollected - rentToGrain;
    const landTaxToGrain = landTaxCollected * taxGrainRatio;
    const landTaxToCoupon = landTaxCollected - landTaxToGrain;

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

    world.grainTreasury = clamp(treasuryAfterCommerce + taxToGrain + rentToGrain + landTaxToGrain - actualGrainSalary);

    const retainedByLedger = clamp((world.grainTreasury ?? 0) * bureaucracyEffects.grainRetentionRate);
    world.grainTreasury = clamp((world.grainTreasury ?? 0) + retainedByLedger);

    const maintenance = applyBureaucracyAnnualMaintenance(world);

    if (maintenance.expected > 0) {
      behaviorMessages.push(
        `官僚体系年维护支出：应付${maintenance.expected}粮，实付${maintenance.paid}粮${
          maintenance.missing > 0 ? `，短缺${maintenance.missing}粮` : ''
        }`
      );
    }

    world.couponTreasury = clamp(couponTreasuryAfterTax + rentToCoupon + landTaxToCoupon - actualCouponSalary);
    world.officialIncomePool = Math.max(0, Number(world.officialIncomePool ?? 0) + actualCouponSalary + actualGrainSalary + leakedToOfficials);
    world.lastSalaryCost = clamp(totalSalaryCost);
    world.couponSalaryPaymentWarning = couponSalaryPaymentWarning;
    world.lastFarmlandRentCollected = clamp(farmlandRentCollected);
    world.landTaxRevenue = clamp(landTaxCollected);
    world.lastTaxCollectionYear = world.year;
    ledger.taxRevenue += Math.max(0, Number(agriculturalTax ?? 0));
    ledger.commerceTaxRevenue += Math.max(0, Number(commerceTaxCollected ?? 0));
    ledger.landTaxRevenue += Math.max(0, Number(landTaxCollected ?? 0));
    ledger.rentRevenue += Math.max(0, Number(farmlandRentCollected ?? 0));
    ledger.couponTaxRevenue += Math.max(0, Number(taxToCoupon + rentToCoupon + landTaxToCoupon));
    ledger.wageBill += Math.max(0, Number(actualCouponSalary + actualGrainSalary));
    ledger.officialGrossIncome += Math.max(0, Number(actualCouponSalary + actualGrainSalary));
    ledger.subsidyCost += Math.max(0, Number(tradePolicyResult.subsidyCost ?? 0));
    ledger.farmerTaxPaid += Math.max(0, Number(agriculturalTax + farmlandRentCollected + landTaxCollected));
    ledger.merchantTaxPaid += Math.max(0, Number(commerceTaxCollected));

    if ((world.fireLeakageRate ?? 0) > 0.25) {
      world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? world.farmerSatisfaction ?? 50) - 20);
      world.farmerSatisfaction = world.farmerLifeQuality;
      world.stabilityIndex = Math.max(0, (world.stabilityIndex ?? 0) - 10);
      behaviorMessages.push('火耗失控，财政大量流失');
    } else if ((world.fireLeakageRate ?? 0) > 0.15) {
      world.farmerLifeQuality = clampPercentIndex((world.farmerLifeQuality ?? world.farmerSatisfaction ?? 50) - 10);
      world.farmerSatisfaction = world.farmerLifeQuality;
      behaviorMessages.push('火耗严重，民间怨声载道');
    }

    if (farmlandRentCollected > 0) {
      behaviorMessages.push(`地租征收：共${Math.round(farmlandRentCollected)}（粮${Math.round(rentToGrain)} / 粮劵${Math.round(rentToCoupon)}）`);
    }
    if (landTaxCollected > 0) {
      behaviorMessages.push(`土地税征收：共${Math.round(landTaxCollected)}（粮${Math.round(landTaxToGrain)} / 粮劵${Math.round(landTaxToCoupon)}）`);
    }
    if ((tradePolicyResult.subsidyCost ?? 0) > 0) {
      behaviorMessages.push(`贸易补贴支出：${Math.round(tradePolicyResult.subsidyCost)}（补贴率${Math.round((tradePolicyResult.subsidyRate ?? 0) * 100)}%）`);
    }
  } else {
    world.lastFarmlandRentCollected = 0;
    world.theoreticalTaxRevenue = 0;
    world.actualTaxRevenue = 0;
    world.landTaxRevenue = 0;
    world.commerceTaxRevenue = 0;
  }

  const moneylenderGDP = clamp(
    baseMoneylenderGDP * Math.max(0, Number(world.moneylenderEfficiencyBonus ?? 0) + 1)
  );
  world.moneylenderGDP = moneylenderGDP;
  const totalCommerceGDP = clamp(adjustedCommerceGDP + moneylenderGDP);
  world.commerceGDP = totalCommerceGDP;
  const gdpEstimate = clamp(agricultureGDP + totalCommerceGDP + constructionGDP + governmentGDP);
  world.gdpEstimate = gdpEstimate;
  world.gdpPerCapita = calculateGdpPerCapita(world, gdpEstimate);

  const grainStorageCapacity = Math.max(0, Number(world.grainStorageCapacity ?? 50000000));
  if ((world.grainTreasury ?? 0) > grainStorageCapacity) {
    world.grainTreasury = grainStorageCapacity;
    behaviorMessages.push(`粮仓容量上限生效：当前容量${Math.round(grainStorageCapacity)}`);
  }

  world.grainSurplus = clamp((world.actualGrainOutput ?? 0) - (world.grainAnnualDemand ?? 0), -999999999);
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


  if (farmerIncomePool > 0 || merchantIncomePool > 0 || officialIncomePool > 0) {
    behaviorMessages.push(
      `收入池分配：农户${Math.round(farmerIncomePool)} / 商贸${Math.round(merchantIncomePool)} / 官员${Math.round(officialIncomePool)}`
    );
  }

  if (incomePoolEffects.saltDemandIncrease > 0 || incomePoolEffects.clothDemandIncrease > 0) {
    behaviorMessages.push(
      `收入拉动需求：食盐+${incomePoolEffects.saltDemandIncrease.toFixed(2)}，布匹+${incomePoolEffects.clothDemandIncrease.toFixed(2)}`
    );
  }

  const farmerGrossIncome = Math.max(0, Number(adjustedGrainOutput * 0.3 + landDevelopmentFarmerIncomeBoost + farmerIncomePool));
  const merchantGrossIncome = Math.max(0, Number(adjustedCommerceGDP * 0.5 + merchantIncomePool));
  const officialGrossIncome = Math.max(0, Number(world.totalSalaryCost ?? 0) + officialIncomePool);
  ledger.farmerGrossIncome += farmerGrossIncome;
  ledger.merchantGrossIncome += merchantGrossIncome;
  ledger.officialGrossIncome += officialGrossIncome;
  ledger.farmerNetIncome = Math.max(0, ledger.farmerGrossIncome - ledger.farmerTaxPaid);
  ledger.merchantNetIncome = Math.max(0, ledger.merchantGrossIncome - ledger.merchantTaxPaid);
  ledger.officialNetIncome = Math.max(0, ledger.officialGrossIncome);
  ledger.farmerSavingsChange += Math.max(0, Number(world.farmerSavings ?? 0) - savingsStart.farmer);
  ledger.merchantSavingsChange += Math.max(0, Number(world.merchantSavings ?? 0) - savingsStart.merchant);
  ledger.officialSavingsChange += Math.max(0, Number(world.officialSavings ?? 0) - savingsStart.official);

  world.farmerIncomePool = 0;
  world.merchantIncomePool = 0;
  world.officialIncomePool = 0;

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
