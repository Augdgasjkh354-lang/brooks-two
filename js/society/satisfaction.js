// Society life quality module

import { calculateLivingCost } from '../economy/market.js';
import {
  STABILITY_MIN, STABILITY_MAX, BASE_LIFE_QUALITY, FARMER_INIT_LITERACY,
  MERCHANT_POP_INIT_LITERACY, OFFICIAL_INIT_LITERACY, WORKER_INIT_LITERACY, LANDLORD_INIT_LITERACY
} from '../config/constants.js';

export function clampPercentIndex(value) {
  return Math.max(STABILITY_MIN, Math.min(STABILITY_MAX, Math.round(value)));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
}

function toNonNegative(value) {
  return Math.max(0, Number(value ?? 0));
}

function applySavingsRateEffect(score, savingsRate) {
  if (savingsRate >= 0.1) return score + 15;
  if (savingsRate >= 0.05) return score + 5;
  if (savingsRate < 0) return score - 15;
  return score;
}


function applyHealthLifeQualityEffects(world, lifeQualityValues, factors) {
  const farmerDelta = Number(world.healthLifeQualityFarmerDelta ?? 0);
  const allDelta = Number(world.healthLifeQualityAllDelta ?? 0);

  if (allDelta !== 0) {
    lifeQualityValues.farmer += allDelta;
    lifeQualityValues.merchant += allDelta;
    lifeQualityValues.official += allDelta;
    lifeQualityValues.landlord += allDelta;
    const text = `公共卫生全阶层影响 ${allDelta > 0 ? '+' : ''}${allDelta}`;
    factors.farmer.push(text);
    factors.merchant.push(text);
    factors.official.push(text);
    factors.landlord.push(text);
  }

  if (farmerDelta !== 0) {
    lifeQualityValues.farmer += farmerDelta;
    factors.farmer.push(`公共卫生农民影响 ${farmerDelta > 0 ? '+' : ''}${farmerDelta}`);
  }
}

function getPopulationByClass(world) {
  return {
    farmer: Math.max(0, Number(world.farmerPopulation ?? 0)),
    merchant: Math.max(0, Number(world.merchantPopulation ?? world.merchantCount ?? 0)),
    official: Math.max(0, Number(world.officialPopulation ?? 0)),
    landlord: Math.max(0, Number(world.landlordPopulation ?? 0)),
  };
}

function getClassIncomePerHead(world) {
  const farmerIncomePerHead = Math.max(0, Number(world.farmerIncomePerHead ?? 0));
  const merchantIncomePerHead = Math.max(0, Number(world.merchantIncomePerHead ?? 0));

  const annualWageBill = Math.max(
    0,
    Number(world.totalWageBill ?? world.annualWageBill ?? world.lastSalaryCost ?? world.totalSalaryCost ?? 0)
  );
  const totalOfficials = Math.max(0, Number(world.totalOfficials ?? world.officialPopulation ?? 0));
  const officialIncomePerHead = totalOfficials > 0 ? annualWageBill / totalOfficials : farmerIncomePerHead;

  const farmlandRentRate = Math.max(0, Number(world.farmlandRentRate ?? 0));
  const farmlandAreaMu = Math.max(0, Number(world.farmlandAreaMu ?? 0));
  const landlordPopulation = Math.max(1, Number(world.landlordPopulation ?? 0));
  const landlordIncomePerHead = (farmlandRentRate * farmlandAreaMu) / landlordPopulation;

  return {
    farmerIncomePerHead,
    merchantIncomePerHead,
    officialIncomePerHead,
    landlordIncomePerHead,
  };
}

export function updateLiteracyCaps(world) {
  const baseCaps = {
    farmer: FARMER_INIT_LITERACY * 3,
    merchant: MERCHANT_POP_INIT_LITERACY + 0.15,
    official: OFFICIAL_INIT_LITERACY + 0.2,
    worker: WORKER_INIT_LITERACY + 0.12,
    landlord: LANDLORD_INIT_LITERACY + 0.15,
  };

  const primarySchoolCount =
    Math.max(0, Number(world.commercialPrimarySchools ?? 0)) +
    (Number(world.govPrimaryCapacity ?? 0) > 0 ? 1 : 0);
  const secondarySchoolCount =
    Math.max(0, Number(world.commercialSecondarySchools ?? 0)) +
    (Number(world.govSecondaryCapacity ?? 0) > 0 ? 1 : 0);
  const higherSchoolCount = Number(world.govHigherCapacity ?? 0) > 0 ? 1 : 0;
  const downVillageGroups = Math.floor(Math.max(0, Number(world.studentsDownToVillage ?? 0)) / 100);

  const caps = {
    farmer: baseCaps.farmer + primarySchoolCount * 0.05 + higherSchoolCount * 0.15 + downVillageGroups * 0.03,
    merchant: baseCaps.merchant + secondarySchoolCount * 0.1 + higherSchoolCount * 0.15,
    official: baseCaps.official + secondarySchoolCount * 0.1 + higherSchoolCount * 0.15,
    worker: baseCaps.worker + primarySchoolCount * 0.03 + higherSchoolCount * 0.15,
    landlord: baseCaps.landlord + secondarySchoolCount * 0.08 + higherSchoolCount * 0.15,
  };

  world.literacyCaps = caps;
  return caps;
}

export function getLiteracyEffects(world) {
  const farmerLiteracy = clampRatio(world.farmerLiteracy ?? 0.05);
  const merchantLiteracy = clampRatio(world.merchantLiteracy ?? 0);
  const officialLiteracy = clampRatio(world.officialLiteracy ?? 0);
  const workerLiteracy = clampRatio(world.workerLiteracy ?? 0);
  const landlordLiteracy = clampRatio(world.landlordLiteracy ?? 0);

  const farmerStep = Math.floor((farmerLiteracy * 100) / 5);
  const merchantStep = Math.floor((merchantLiteracy * 100) / 10);
  const officialStep = Math.floor((officialLiteracy * 100) / 10);
  const workerStep = Math.floor((workerLiteracy * 100) / 10);
  const landlordStep = Math.floor((landlordLiteracy * 100) / 10);

  const farmerEfficiencyBonus = Math.min(farmerStep * 0.01, 0.05);
  const merchantGDPMultiplierBonus = Math.min(merchantStep * 0.02, 0.1);
  const policyExecutionEfficiency = 1 + officialStep * 0.02;
  const stabilityPenaltyReduction = officialStep * 0.02;
  const textileOutputBonus = workerStep * 0.02;
  const landReclaimEfficiencyBonus = landlordStep * 0.01;

  return {
    farmerEfficiencyBonus,
    merchantGDPMultiplierBonus,
    policyExecutionEfficiency,
    stabilityPenaltyReduction,
    textileOutputBonus,
    landReclaimEfficiencyBonus,
  };
}

export function applyLiteracyEffectsToWorld(world) {
  updateLiteracyCaps(world);
  const effects = getLiteracyEffects(world);
  const availableAdminTalent = Math.max(0, Number(world.adminTalent ?? 0) - Number(world.adminTalentDeployed ?? 0));
  const availableCommerceTalent =
    Math.max(0, Number(world.commerceTalent ?? 0) - Number(world.commerceTalentDeployed ?? 0));
  const availableTechTalent = Math.max(0, Number(world.techTalent ?? 0) - Number(world.techTalentDeployed ?? 0));

  const adminPolicyBonus = availableAdminTalent >= 50 ? 0.1 : 0;
  const commerceGdpBonus = availableCommerceTalent >= 50 ? 0.05 : 0;
  const moneylenderEfficiencyBonus = availableCommerceTalent >= 10 ? 0.05 : 0;
  const agricultureTechBonus = availableTechTalent >= 50 ? 0.03 : 0;
  const researchSpeedBonus = availableTechTalent >= 10 ? 0.1 : 0;

  world.policyExecutionEfficiency = effects.policyExecutionEfficiency * (1 + adminPolicyBonus);
  world.stabilityPenaltyLiteracyReduction = effects.stabilityPenaltyReduction;
  world.textileOutputLiteracyBonus = effects.textileOutputBonus;
  world.landReclaimEfficiency = 1 + effects.landReclaimEfficiencyBonus;
  world.farmerLiteracyEfficiencyBonus = effects.farmerEfficiencyBonus;
  world.merchantLiteracyEfficiencyBonus = effects.merchantGDPMultiplierBonus + commerceGdpBonus;
  world.moneylenderEfficiencyBonus = moneylenderEfficiencyBonus;
  world.techTalentAgricultureBonus = agricultureTechBonus;
  world.techTalentResearchSpeedBonus = researchSpeedBonus;

  return effects;
}

export function calculateLifeQuality(world) {
  const previousValues = {
    farmer: Number(world.farmerLifeQuality ?? world.farmerSatisfaction ?? 50),
    merchant: Number(world.merchantLifeQuality ?? world.merchantSatisfaction ?? 50),
    official: Number(world.officialLifeQuality ?? world.officialSatisfaction ?? 50),
    landlord: Number(world.landlordLifeQuality ?? world.landlordSatisfaction ?? 50),
  };

  const cost = calculateLivingCost(world);
  const totalLivingCost = Math.max(1, Number(cost.totalLivingCost ?? 1));
  const classIncome = getClassIncomePerHead(world);
  const classPop = getPopulationByClass(world);

  world.giniRatio = classIncome.merchantIncomePerHead / Math.max(classIncome.farmerIncomePerHead, 1);

  let farmerLifeQuality = BASE_LIFE_QUALITY;
  let merchantLifeQuality = BASE_LIFE_QUALITY;
  let officialLifeQuality = BASE_LIFE_QUALITY;
  let landlordLifeQuality = BASE_LIFE_QUALITY;

  const factors = {
    farmer: [],
    merchant: [],
    official: [],
    landlord: [],
  };

  const applyIncomeDimension = (classKey, incomePerHead) => {
    const ratio = incomePerHead / totalLivingCost;
    if (ratio < 0.8) {
      factors[classKey].push('收入不足（<0.8x生活成本）');
      return -20;
    }
    if (ratio < 1.0) {
      factors[classKey].push('收入偏紧（0.8x-1.0x）');
      return -10;
    }
    if (ratio <= 1.5) {
      factors[classKey].push('收入基本覆盖（1.0x-1.5x）');
      return 0;
    }
    if (ratio <= 2.0) {
      factors[classKey].push('收入充裕（1.5x-2.0x）');
      return 10;
    }
    factors[classKey].push('收入显著充裕（>2.0x）');
    return 20;
  };

  farmerLifeQuality += applyIncomeDimension('farmer', classIncome.farmerIncomePerHead);
  merchantLifeQuality += applyIncomeDimension('merchant', classIncome.merchantIncomePerHead);
  officialLifeQuality += applyIncomeDimension('official', classIncome.officialIncomePerHead);
  landlordLifeQuality += applyIncomeDimension('landlord', classIncome.landlordIncomePerHead);

  if (world.giniRatio < 2) {
    farmerLifeQuality += 5;
    merchantLifeQuality += 5;
    officialLifeQuality += 5;
    landlordLifeQuality += 5;
    factors.farmer.push('贫富差距较低（<2）');
    factors.merchant.push('贫富差距较低（<2）');
    factors.official.push('贫富差距较低（<2）');
    factors.landlord.push('贫富差距较低（<2）');
  } else if (world.giniRatio > 10) {
    farmerLifeQuality -= 20;
    merchantLifeQuality += 5;
    officialLifeQuality -= 5;
    factors.farmer.push('贫富差距极高（>10）');
    factors.merchant.push('贫富差距极高，商人受益');
    factors.official.push('贫富差距极高，社会紧张');
    factors.landlord.push('贫富差距极高');
  } else if (world.giniRatio > 5) {
    farmerLifeQuality -= 10;
    factors.farmer.push('贫富差距偏高（5-10）');
  }

  if (cost.saltAffordability > 2.0) {
    farmerLifeQuality -= 25;
    merchantLifeQuality -= 25;
    officialLifeQuality -= 25;
    landlordLifeQuality -= 25;
  } else if (cost.saltAffordability > 1.5) {
    farmerLifeQuality -= 15;
    merchantLifeQuality -= 15;
    officialLifeQuality -= 15;
    landlordLifeQuality -= 15;
  } else if (cost.saltAffordability <= 1.0) {
    farmerLifeQuality += 5;
    merchantLifeQuality += 5;
    officialLifeQuality += 5;
    landlordLifeQuality += 5;
  }

  if (cost.clothAffordability > 1.5) {
    farmerLifeQuality -= 10;
    merchantLifeQuality -= 10;
    officialLifeQuality -= 10;
    landlordLifeQuality -= 10;
  } else if (cost.clothAffordability <= 1.0) {
    farmerLifeQuality += 3;
    merchantLifeQuality += 3;
    officialLifeQuality += 3;
    landlordLifeQuality += 3;
  }

  if ((world.grainSurplus ?? 0) < 0) {
    farmerLifeQuality -= 20;
    merchantLifeQuality -= 20;
    officialLifeQuality -= 20;
    landlordLifeQuality -= 20;
    factors.farmer.push('粮食赤字');
    factors.merchant.push('粮食赤字');
    factors.official.push('粮食赤字');
    factors.landlord.push('粮食赤字');
  }

  const computeSavings = (classKey, incomePerHead, population, currentSavings) => {
    const classIncomeTotal = incomePerHead * population;
    const classExpenditureTotal = totalLivingCost * population;
    const delta = classIncomeTotal - classExpenditureTotal;
    const nextSavings = Number(currentSavings ?? 0) + delta;
    const savingsRate = delta / Math.max(classIncomeTotal, 1);

    factors[classKey].push(`储蓄率 ${(savingsRate * 100).toFixed(1)}%`);
    return { nextSavings, savingsRate };
  };

  const farmerSavings = computeSavings('farmer', classIncome.farmerIncomePerHead, classPop.farmer, world.farmerSavings);
  const merchantSavings = computeSavings(
    'merchant',
    classIncome.merchantIncomePerHead,
    classPop.merchant,
    world.merchantSavings
  );
  const officialSavings = computeSavings('official', classIncome.officialIncomePerHead, classPop.official, world.officialSavings);
  const landlordSavings = computeSavings('landlord', classIncome.landlordIncomePerHead, classPop.landlord, world.landlordSavings);

  farmerLifeQuality = applySavingsRateEffect(farmerLifeQuality, farmerSavings.savingsRate);
  merchantLifeQuality = applySavingsRateEffect(merchantLifeQuality, merchantSavings.savingsRate);
  officialLifeQuality = applySavingsRateEffect(officialLifeQuality, officialSavings.savingsRate);
  landlordLifeQuality = applySavingsRateEffect(landlordLifeQuality, landlordSavings.savingsRate);

  if (farmerSavings.nextSavings > toNonNegative(world.totalPopulation) * 100) {
    farmerLifeQuality += 5;
    factors.farmer.push('农户储蓄池充足');
  } else if (farmerSavings.nextSavings < 0) {
    farmerLifeQuality -= 10;
    factors.farmer.push('农户储蓄池为负');
  }

  world.farmerSavings = farmerSavings.nextSavings;
  world.merchantSavings = merchantSavings.nextSavings;
  world.officialSavings = officialSavings.nextSavings;
  world.landlordSavings = landlordSavings.nextSavings;

  world.farmerSavingsRate = farmerSavings.savingsRate;
  world.merchantSavingsRate = merchantSavings.savingsRate;
  world.officialSavingsRate = officialSavings.savingsRate;
  world.landlordSavingsRate = landlordSavings.savingsRate;

  const lifeQualityValues = {
    farmer: farmerLifeQuality,
    merchant: merchantLifeQuality,
    official: officialLifeQuality,
    landlord: landlordLifeQuality,
  };

  applyHealthLifeQualityEffects(world, lifeQualityValues, factors);

  world.farmerLifeQuality = clampPercentIndex(lifeQualityValues.farmer);
  world.merchantLifeQuality = clampPercentIndex(lifeQualityValues.merchant);
  world.officialLifeQuality = clampPercentIndex(lifeQualityValues.official);
  world.landlordLifeQuality = clampPercentIndex(lifeQualityValues.landlord);
  world.workerLifeQuality = clampPercentIndex(Number(world.workerLifeQuality ?? world.farmerLifeQuality ?? 50));


  world.lifeQualityFactors = {
    farmer: factors.farmer.join(' | ') || '无显著因素',
    merchant: factors.merchant.join(' | ') || '无显著因素',
    official: factors.official.join(' | ') || '无显著因素',
    landlord: factors.landlord.join(' | ') || '无显著因素',
  };

  const changeNotes = [];
  const changes = {
    farmer: world.farmerLifeQuality - previousValues.farmer,
    merchant: world.merchantLifeQuality - previousValues.merchant,
    official: world.officialLifeQuality - previousValues.official,
    landlord: world.landlordLifeQuality - previousValues.landlord,
  };
  if (Math.abs(changes.farmer) >= 10) changeNotes.push(`农民生活质量${changes.farmer > 0 ? '上升' : '下降'}${Math.abs(changes.farmer)}点`);
  if (Math.abs(changes.merchant) >= 10) changeNotes.push(`商人生活质量${changes.merchant > 0 ? '上升' : '下降'}${Math.abs(changes.merchant)}点`);
  if (Math.abs(changes.official) >= 10) changeNotes.push(`官员生活质量${changes.official > 0 ? '上升' : '下降'}${Math.abs(changes.official)}点`);
  if (Math.abs(changes.landlord) >= 10) changeNotes.push(`地主生活质量${changes.landlord > 0 ? '上升' : '下降'}${Math.abs(changes.landlord)}点`);
  world.lifeQualityChangeNotes = changeNotes;

  return {
    farmerSatisfaction: world.farmerSatisfaction,
    merchantSatisfaction: world.merchantSatisfaction,
    officialSatisfaction: world.officialSatisfaction,
    landlordSatisfaction: world.landlordSatisfaction,
    farmerLifeQuality: world.farmerLifeQuality,
    merchantLifeQuality: world.merchantLifeQuality,
    officialLifeQuality: world.officialLifeQuality,
    landlordLifeQuality: world.landlordLifeQuality,
  };
}

export function calculateClassSatisfaction(world) {
  if (!world) {
    return {
      farmerSatisfaction: 0,
      merchantSatisfaction: 0,
      officialSatisfaction: 0,
      landlordSatisfaction: 0,
    };
  }

  const farmerEventModifier = Number(world.farmerEventModifier ?? 0);
  const merchantEventModifier = Number(world.merchantEventModifier ?? 0);
  const officialEventModifier = Number(world.officialEventModifier ?? 0);
  const landlordEventModifier = Number(world.landlordEventModifier ?? 0);

  world.farmerSatisfaction = clampPercentIndex(Number(world.farmerLifeQuality ?? 50) + farmerEventModifier);
  world.merchantSatisfaction = clampPercentIndex(Number(world.merchantLifeQuality ?? 50) + merchantEventModifier);
  world.officialSatisfaction = clampPercentIndex(Number(world.officialLifeQuality ?? 50) + officialEventModifier);
  world.landlordSatisfaction = clampPercentIndex(Number(world.landlordLifeQuality ?? 50) + landlordEventModifier);

  return {
    farmerSatisfaction: world.farmerSatisfaction,
    merchantSatisfaction: world.merchantSatisfaction,
    officialSatisfaction: world.officialSatisfaction,
    landlordSatisfaction: world.landlordSatisfaction,
  };
}

export function clearEventModifiers(world) {
  if (!world) return;
  world.farmerEventModifier = 0;
  world.merchantEventModifier = 0;
  world.officialEventModifier = 0;
  world.landlordEventModifier = 0;
}


export function applyPoliceLifeQualityEffects(world, policeEffects) {
  if (!world || !policeEffects) return;

  const merchantDelta = Number(policeEffects.merchantLifeQualityDelta ?? 0);
  const farmerDelta = Number(policeEffects.farmerLifeQualityDelta ?? 0);

  if (merchantDelta !== 0) {
    world.merchantEventModifier = Number(world.merchantEventModifier ?? 0) + merchantDelta;
  }

  if (farmerDelta !== 0) {
    world.farmerEventModifier = Number(world.farmerEventModifier ?? 0) + farmerDelta;
  }
}

export function applyCourtTaxLifeQualityEffects(world, courtEffects = null) {
  if (!world) return;

  if (courtEffects) {
    const merchantDelta = Number(courtEffects.merchantLifeQualityDelta ?? 0);
    if (merchantDelta !== 0) {
      world.merchantEventModifier = Number(world.merchantEventModifier ?? 0) + merchantDelta;
    }
  }

  const commerceTaxRate = Math.max(0, Number(world.commerceTaxRate ?? 0));
  if (commerceTaxRate > 0.2) {
    world.merchantEventModifier = Number(world.merchantEventModifier ?? 0) - 15;
  }

  const landTaxRate = Math.max(0, Number(world.landTaxRate ?? 0));
  if (landTaxRate > 3) {
    world.farmerEventModifier = Number(world.farmerEventModifier ?? 0) - 10;
    world.landlordEventModifier = Number(world.landlordEventModifier ?? 0) - 15;
  }
}
