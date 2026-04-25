// Society life quality module

import { calculateLivingCost } from '../economy/market.js';
import {
  STABILITY_MIN, STABILITY_MAX, BASE_LIFE_QUALITY, FARMER_INIT_LITERACY,
  MERCHANT_POP_INIT_LITERACY, OFFICIAL_INIT_LITERACY, WORKER_INIT_LITERACY, LANDLORD_INIT_LITERACY,
  GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR
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

function getClasses(world) {
  return world?.__classes ?? world?.classes ?? world;
}

function getEducation(world) {
  return world?.__education ?? world?.education ?? world;
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
  // LANDLORD DISABLED - pending land reform
  let landlordIncomePerHead = 0;
  if (false) {
    landlordIncomePerHead = (farmlandRentRate * farmlandAreaMu) / landlordPopulation;
  }

  return {
    farmerIncomePerHead,
    merchantIncomePerHead,
    officialIncomePerHead,
    landlordIncomePerHead,
  };
}

export function updateLiteracyCaps(world) {
  const education = getEducation(world);
  const baseCaps = {
    farmer: FARMER_INIT_LITERACY * 3,
    merchant: MERCHANT_POP_INIT_LITERACY + 0.15,
    official: OFFICIAL_INIT_LITERACY + 0.2,
    worker: WORKER_INIT_LITERACY + 0.12,
    landlord: LANDLORD_INIT_LITERACY + 0.15,
  };

  const primarySchoolCount =
    Math.max(0, Number(education.commercialPrimarySchools ?? 0)) +
    (Number(education.govPrimaryCapacity ?? 0) > 0 ? 1 : 0);
  const secondarySchoolCount =
    Math.max(0, Number(education.commercialSecondarySchools ?? 0)) +
    (Number(education.govSecondaryCapacity ?? 0) > 0 ? 1 : 0);
  const higherSchoolCount = Number(education.govHigherCapacity ?? 0) > 0 ? 1 : 0;
  const downVillageGroups = Math.floor(Math.max(0, Number(education.studentsDownToVillage ?? 0)) / 100);

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
  const classes = getClasses(world);
  const previousValues = {
    farmer: Number(classes.farmerLifeQuality ?? classes.farmerSatisfaction ?? 50),
    merchant: Number(classes.merchantLifeQuality ?? classes.merchantSatisfaction ?? 50),
    official: Number(classes.officialLifeQuality ?? classes.officialSatisfaction ?? 50),
    landlord: Number(classes.landlordLifeQuality ?? classes.landlordSatisfaction ?? 50),
  };

  const cost = calculateLivingCost(world);
  world.grainDemandPerPerson = GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR;
  const totalLivingCost = Math.max(1, Number(cost.totalLivingCost ?? 1));
  const classIncome = getClassIncomePerHead(world);
  const classPop = getPopulationByClass(world);

  world.giniRatio = classIncome.merchantIncomePerHead / Math.max(classIncome.farmerIncomePerHead, 1);

  let farmerLifeQuality = BASE_LIFE_QUALITY;
  let merchantLifeQuality = BASE_LIFE_QUALITY;
  let officialLifeQuality = BASE_LIFE_QUALITY;
  // LANDLORD DISABLED - pending land reform
  let landlordLifeQuality = 0;

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
  if (false) {
    landlordLifeQuality += applyIncomeDimension('landlord', classIncome.landlordIncomePerHead);
  }

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

  const unemploymentRate = Math.max(0, Number(world.unemploymentRate ?? 0));
  if (unemploymentRate > 0.3) {
    farmerLifeQuality -= 25;
    world.stabilityIndex = Math.max(0, Number(world.stabilityIndex ?? 0) - 15);
    factors.farmer.push('大规模失业（>30%）');
  } else if (unemploymentRate >= 0.15) {
    farmerLifeQuality -= 15;
    world.stabilityIndex = Math.max(0, Number(world.stabilityIndex ?? 0) - 5);
    factors.farmer.push('失业问题严重（15%-30%）');
  } else if (unemploymentRate >= 0.05) {
    farmerLifeQuality -= 5;
    factors.farmer.push('失业率上升（5%-15%）');
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

  const farmerSavings = computeSavings('farmer', classIncome.farmerIncomePerHead, classPop.farmer, classes.farmerSavings);
  const merchantSavings = computeSavings(
    'merchant',
    classIncome.merchantIncomePerHead,
    classPop.merchant,
    classes.merchantSavings
  );
  const officialSavings = computeSavings('official', classIncome.officialIncomePerHead, classPop.official, classes.officialSavings);
  let landlordSavings = { nextSavings: 0, savingsRate: 0 };
  if (false) {
    landlordSavings = computeSavings('landlord', classIncome.landlordIncomePerHead, classPop.landlord, classes.landlordSavings);
  }

  farmerLifeQuality = applySavingsRateEffect(farmerLifeQuality, farmerSavings.savingsRate);
  merchantLifeQuality = applySavingsRateEffect(merchantLifeQuality, merchantSavings.savingsRate);
  officialLifeQuality = applySavingsRateEffect(officialLifeQuality, officialSavings.savingsRate);
  if (false) {
    landlordLifeQuality = applySavingsRateEffect(landlordLifeQuality, landlordSavings.savingsRate);
  }

  if (farmerSavings.nextSavings > toNonNegative(world.totalPopulation) * 100) {
    farmerLifeQuality += 5;
    factors.farmer.push('农户储蓄池充足');
  } else if (farmerSavings.nextSavings < 0) {
    farmerLifeQuality -= 10;
    factors.farmer.push('农户储蓄池为负');
  }

  classes.farmerSavings = farmerSavings.nextSavings;
  classes.merchantSavings = merchantSavings.nextSavings;
  classes.officialSavings = officialSavings.nextSavings;
  classes.landlordSavings = landlordSavings.nextSavings;

  classes.farmerSavingsRate = farmerSavings.savingsRate;
  classes.merchantSavingsRate = merchantSavings.savingsRate;
  classes.officialSavingsRate = officialSavings.savingsRate;
  classes.landlordSavingsRate = landlordSavings.savingsRate;

  const lifeQualityValues = {
    farmer: farmerLifeQuality,
    merchant: merchantLifeQuality,
    official: officialLifeQuality,
    landlord: landlordLifeQuality,
  };

  applyHealthLifeQualityEffects(world, lifeQualityValues, factors);

  classes.farmerLifeQuality = clampPercentIndex(lifeQualityValues.farmer);
  classes.merchantLifeQuality = clampPercentIndex(lifeQualityValues.merchant);
  classes.officialLifeQuality = clampPercentIndex(lifeQualityValues.official);
  classes.landlordLifeQuality = 0;
  if (false) {
    classes.landlordLifeQuality = clampPercentIndex(lifeQualityValues.landlord);
  }
  world.workerLifeQuality = clampPercentIndex(Number(world.workerLifeQuality ?? classes.farmerLifeQuality ?? 50));


  world.lifeQualityFactors = {
    farmer: factors.farmer.join(' | ') || '无显著因素',
    merchant: factors.merchant.join(' | ') || '无显著因素',
    official: factors.official.join(' | ') || '无显著因素',
    landlord: factors.landlord.join(' | ') || '无显著因素',
  };

  const changeNotes = [];
  const changes = {
    farmer: classes.farmerLifeQuality - previousValues.farmer,
    merchant: classes.merchantLifeQuality - previousValues.merchant,
    official: classes.officialLifeQuality - previousValues.official,
    landlord: classes.landlordLifeQuality - previousValues.landlord,
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
  const classes = getClasses(world);
  if (!world) {
    return {
      farmerSatisfaction: 0,
      merchantSatisfaction: 0,
      officialSatisfaction: 0,
      landlordSatisfaction: 0,
    };
  }

  const farmerEventModifier = Number(classes.farmerEventModifier ?? 0);
  const merchantEventModifier = Number(classes.merchantEventModifier ?? 0);
  const officialEventModifier = Number(classes.officialEventModifier ?? 0);
  // LANDLORD DISABLED - pending land reform
  const landlordEventModifier = 0;

  const popSatisfaction = world.popClassSatisfaction ?? {};
  const farmerBase = Number(popSatisfaction.farmer ?? classes.farmerLifeQuality ?? 50);
  const merchantBase = Number(popSatisfaction.merchant ?? classes.merchantLifeQuality ?? 50);
  const officialBase = Number(popSatisfaction.official ?? classes.officialLifeQuality ?? 50);

  classes.farmerSatisfaction = clampPercentIndex(farmerBase + farmerEventModifier);
  classes.merchantSatisfaction = clampPercentIndex(merchantBase + merchantEventModifier);
  classes.officialSatisfaction = clampPercentIndex(officialBase + officialEventModifier);
  classes.landlordSatisfaction = 0;
  if (false) {
    classes.landlordSatisfaction = clampPercentIndex(Number(classes.landlordLifeQuality ?? 50) + landlordEventModifier);
  }

  return {
    farmerSatisfaction: classes.farmerSatisfaction,
    merchantSatisfaction: classes.merchantSatisfaction,
    officialSatisfaction: classes.officialSatisfaction,
    landlordSatisfaction: classes.landlordSatisfaction,
  };
}

export function clearEventModifiers(world) {
  const classes = getClasses(world);
  if (!world) return;
  classes.farmerEventModifier = 0;
  classes.merchantEventModifier = 0;
  classes.officialEventModifier = 0;
  classes.landlordEventModifier = 0; // LANDLORD DISABLED - pending land reform
}


export function applyPoliceLifeQualityEffects(world, policeEffects) {
  if (!world || !policeEffects) return;

  const merchantDelta = Number(policeEffects.merchantLifeQualityDelta ?? 0);
  const farmerDelta = Number(policeEffects.farmerLifeQualityDelta ?? 0);

  if (merchantDelta !== 0) {
    const classes = getClasses(world);
    classes.merchantEventModifier = Number(classes.merchantEventModifier ?? 0) + merchantDelta;
  }

  if (farmerDelta !== 0) {
    const classes = getClasses(world);
    classes.farmerEventModifier = Number(classes.farmerEventModifier ?? 0) + farmerDelta;
  }
}

export function applyCourtTaxLifeQualityEffects(world, courtEffects = null) {
  if (!world) return;

  if (courtEffects) {
    const classes = getClasses(world);
    const merchantDelta = Number(courtEffects.merchantLifeQualityDelta ?? 0);
    if (merchantDelta !== 0) {
      classes.merchantEventModifier = Number(classes.merchantEventModifier ?? 0) + merchantDelta;
    }
  }

  const commerceTaxRate = Math.max(0, Number(world.commerceTaxRate ?? 0));
  if (commerceTaxRate > 0.2) {
    const classes = getClasses(world);
    classes.merchantEventModifier = Number(classes.merchantEventModifier ?? 0) - 15;
  }

  const landTaxRate = Math.max(0, Number(world.landTaxRate ?? 0));
  if (landTaxRate > 3) {
    const classes = getClasses(world);
    classes.farmerEventModifier = Number(classes.farmerEventModifier ?? 0) - 10;
    if (false) {
      classes.landlordEventModifier = Number(classes.landlordEventModifier ?? 0) - 15;
    }
  }
}
