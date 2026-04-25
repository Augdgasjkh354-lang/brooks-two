// Society population module

import {
  BASE_GROWTH_RATE, MIN_GROWTH_RATE, LABOR_PER_MU, MERCHANT_POP_INIT_LITERACY, OFFICIAL_INIT_LITERACY, WORKER_INIT_LITERACY, LANDLORD_INIT_LITERACY,
  HIGHER_SCHOOL_GRAD_MIN, HIGHER_SCHOOL_YEAR_MIN, GRADUATE_DECAY_RATE, ELIGIBLE_POOL_DECAY,
  PRIMARY_PROGRAM_YEARS, SECONDARY_PROGRAM_YEARS, HIGHER_PROGRAM_YEARS
} from '../config/constants.js';

function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function clampLiteracy(value, cap) {
  return Math.max(0, Math.min(cap, value));
}

function getPopulationState(world) {
  return world.__population ?? world;
}

function getCalendarState(world) {
  return world.__calendar ?? world;
}

function getClassesState(world) {
  return world.__classes ?? world;
}

function getEducationState(world) {
  return world.__education ?? world;
}

function getInstitutionState(world) {
  return world.__institutions ?? world;
}

function updateLaborAllocation(world) {
  const population = getPopulationState(world);
  const requiredFarmingLabor = world.farmlandAreaMu / LABOR_PER_MU;
  const farmingLaborAllocated = Math.min(population.laborForce, requiredFarmingLabor);
  const idleLabor = Math.max(0, population.laborForce - farmingLaborAllocated);
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  population.laborAssignedFarming = world.farmingLaborAllocated;
  population.laborIdle = clamp(idleLabor);
  world.idleLabor = population.laborIdle;
  world.farmEfficiency = farmEfficiency;
  world.landUtilizationPercent = farmEfficiency * 100;

  const baseYield = world.baseGrainYieldPerMu ?? world.grainYieldPerMu;
  world.baseGrainYieldPerMu = baseYield;
  world.grainYieldPerMu = clamp(baseYield * farmEfficiency);
}

function getPopulationGrowthDetails(world) {
  const population = getPopulationState(world);
  const classes = getClassesState(world);
  const institutions = getInstitutionState(world);
  const baseGrowthRate = BASE_GROWTH_RATE;
  const commerceProsperityBonus =
    (classes.merchantIncomePerHead ?? 0) > (classes.farmerIncomePerHead ?? 0) * 1.5 ? 0.005 : 0;
  const demandShortfallPenalty = world.demandShortfall ? 0.005 : 0;

  const techGrowthBonus = Number(world.techBonuses?.populationGrowthBonus ?? 0);
  const healthGrowthModifier = Number(world.healthGrowthModifier ?? 0);
  const grainSurplus = Number(world.grainSurplus ?? 0);
  const totalPopulation = Math.max(1, Number(population.totalPopulation ?? 1));
  const famineSeverePenalty = grainSurplus < -totalPopulation * 100 ? 0.02 : 0;
  const famineStressPenalty = !famineSeverePenalty && grainSurplus < -totalPopulation * 50 ? 0.01 : 0;
  const healthCrisisPenalty = Number(institutions.healthIndex ?? 50) < 20 ? 0.01 : 0;
  const stabilityCrisisPenalty = Number(classes.stabilityIndex ?? 80) < 30 ? 0.005 : 0;

  const calculatedRate =
    baseGrowthRate +
    techGrowthBonus +
    commerceProsperityBonus -
    demandShortfallPenalty +
    healthGrowthModifier -
    famineSeverePenalty -
    famineStressPenalty -
    healthCrisisPenalty -
    stabilityCrisisPenalty;
  const growthRate = Math.max(MIN_GROWTH_RATE, calculatedRate);

  return {
    growthRate,
    baseGrowthRate,
    commerceProsperityBonus,
    demandShortfallPenalty,
    techGrowthBonus,
    healthGrowthModifier,
    famineSeverePenalty,
    famineStressPenalty,
    healthCrisisPenalty,
    stabilityCrisisPenalty,
  };
}

function ensureClassLiteracyActivation(world) {
  const population = getPopulationState(world);
  const flags = world.literacyClassFlags ?? {
    merchantActive: false,
    officialActive: false,
    workerActive: false,
    landlordActive: false,
  };
  world.literacyClassFlags = flags;

  const messages = [];

  if (!flags.merchantActive && (world.shopCount ?? 0) > 0) {
    flags.merchantActive = true;
    population.merchantLiteracy = Math.max(population.merchantLiteracy ?? 0, MERCHANT_POP_INIT_LITERACY);
    messages.push('商人阶层出现，识字率基准设为25%');
  }

  if (!flags.officialActive && world.techBonuses?.bureaucracyUnlocked) {
    flags.officialActive = true;
    population.officialLiteracy = Math.max(population.officialLiteracy ?? 0, OFFICIAL_INIT_LITERACY);
    messages.push('官员阶层出现，识字率基准设为50%');
  }

  if (!flags.workerActive && ((world.hempLandMu ?? 0) > 0 || (world.mulberryLandMu ?? 0) > 0)) {
    flags.workerActive = true;
    population.workerLiteracy = Math.max(population.workerLiteracy ?? 0, WORKER_INIT_LITERACY);
    messages.push('工人阶层出现，识字率基准设为8%');
  }

  // LANDLORD DISABLED - pending land reform
  if (false && !flags.landlordActive && (world.farmlandRentRate ?? 0) > 0) {
    flags.landlordActive = true;
    population.landlordLiteracy = Math.max(population.landlordLiteracy ?? 0, LANDLORD_INIT_LITERACY);
    messages.push('地主阶层出现，识字率基准设为20%');
  }
  flags.landlordActive = false;

  return messages;
}

function updateClassPopulationShares(world) {
  const population = getPopulationState(world);
  const farmerPopulation = Math.max(0, clamp(world.farmingLaborAllocated ?? 0));
  const merchantPopulation = Math.max(0, clamp(population.merchantCount ?? 0));
  const officialPopulation = Math.max(0, clamp(population.scholarPool ?? 0));
  const workerPopulation = Math.max(
    0,
    clamp((population.hempLaborRequired ?? 0) + (population.mulberryLaborRequired ?? 0))
  );
  // LANDLORD DISABLED - pending land reform
  let landlordPopulation = 0;
  if (false) {
    landlordPopulation = Math.max(0, clamp((world.farmlandRentRate ?? 0) > 0 ? population.totalPopulation * 0.02 : 0));
  }

  world.farmerPopulation = farmerPopulation;
  world.merchantPopulation = merchantPopulation;
  world.officialPopulation = officialPopulation;
  world.workerPopulation = workerPopulation;
  world.landlordPopulation = landlordPopulation;
}

function getLiteracyCaps(world) {
  const defaults = {
    farmer: 0.15,
    merchant: 0.4,
    official: 0.7,
    worker: 0.2,
    landlord: 0.35,
  };

  return {
    ...defaults,
    ...(world.literacyCaps ?? {}),
  };
}

function applyLiteracyGrowth(world) {
  const population = getPopulationState(world);
  const education = getEducationState(world);
  const flags = world.literacyClassFlags ?? {};
  const caps = getLiteracyCaps(world);
  const scholarBonus = world.techBonuses?.scholarClass ? 0.005 : 0;
  const baseGrowth = 0.001;

  const totalPrimarySchools =
    Math.max(0, Number(education.commercialPrimarySchools ?? 0)) +
    (Number(education.govPrimaryCapacity ?? 0) > 0 ? 1 : 0);
  const totalSecondarySchools =
    Math.max(0, Number(education.commercialSecondarySchools ?? 0)) +
    (Number(education.govSecondaryCapacity ?? 0) > 0 ? 1 : 0);
  const totalHigherSchools = Number(education.govHigherCapacity ?? 0) > 0 ? 1 : 0;
  const downVillageBoost = (Math.floor(Math.max(0, Number(education.studentsDownToVillage ?? 0)) / 100)) * 0.01;

  let farmerGrowth = baseGrowth + scholarBonus;
  if (world.techBonuses?.bureaucracyUnlocked) farmerGrowth += 0.003;
  if ((world.grainSurplus ?? 0) > 0) farmerGrowth += 0.001;
  if (totalPrimarySchools > 0) farmerGrowth += 0.005;
  if (totalHigherSchools > 0) farmerGrowth += 0.015;
  farmerGrowth += downVillageBoost;

  let merchantGrowth = baseGrowth + scholarBonus;
  if ((world.commerceGDP ?? 0) > 1000000) merchantGrowth += 0.002;
  if ((world.moneylenderShops ?? 0) > 0) merchantGrowth += 0.001;
  if (totalSecondarySchools > 0) merchantGrowth += 0.008;
  if (totalHigherSchools > 0) merchantGrowth += 0.015;

  let officialGrowth = baseGrowth + scholarBonus;
  if (totalSecondarySchools > 0) officialGrowth += 0.01;
  if (totalHigherSchools > 0) officialGrowth += 0.015;

  let workerGrowth = baseGrowth + scholarBonus;
  if (totalHigherSchools > 0) workerGrowth += 0.015;

  let landlordGrowth = baseGrowth + scholarBonus;
  if (totalHigherSchools > 0) landlordGrowth += 0.015;

  population.farmerLiteracy = clampLiteracy((population.farmerLiteracy ?? 0.05) + farmerGrowth, caps.farmer);

  if (flags.merchantActive) {
    population.merchantLiteracy = clampLiteracy((population.merchantLiteracy ?? 0) + merchantGrowth, caps.merchant);
  }

  if (flags.officialActive) {
    population.officialLiteracy = clampLiteracy((population.officialLiteracy ?? 0) + officialGrowth, caps.official);
  }

  if (flags.workerActive) {
    population.workerLiteracy = clampLiteracy((population.workerLiteracy ?? 0) + workerGrowth, caps.worker);
  }

  if (false && flags.landlordActive) {
    population.landlordLiteracy = clampLiteracy((population.landlordLiteracy ?? 0) + landlordGrowth, caps.landlord);
  }
  population.landlordLiteracy = 0;
}

function updateOverallLiteracy(world) {
  const population = getPopulationState(world);
  const classes = [
    { pop: world.farmerPopulation ?? 0, literacy: population.farmerLiteracy ?? 0 },
    {
      pop: world.literacyClassFlags?.merchantActive ? world.merchantPopulation ?? 0 : 0,
      literacy: population.merchantLiteracy ?? 0,
    },
    {
      pop: world.literacyClassFlags?.officialActive ? world.officialPopulation ?? 0 : 0,
      literacy: population.officialLiteracy ?? 0,
    },
    {
      pop: world.literacyClassFlags?.workerActive ? world.workerPopulation ?? 0 : 0,
      literacy: population.workerLiteracy ?? 0,
    },
    {
      pop: world.literacyClassFlags?.landlordActive ? world.landlordPopulation ?? 0 : 0,
      literacy: population.landlordLiteracy ?? 0,
    },
  ];

  const totalTrackedPop = classes.reduce((sum, cls) => sum + Math.max(0, cls.pop), 0);
  if (totalTrackedPop <= 0) {
    population.overallLiteracy = population.farmerLiteracy ?? 0.05;
    return;
  }

  const weightedLiteracy = classes.reduce(
    (sum, cls) => sum + Math.max(0, cls.pop) * Math.max(0, cls.literacy),
    0
  );

  population.overallLiteracy = weightedLiteracy / totalTrackedPop;
}

function updateHigherSchoolUnlock(world) {
  const population = getPopulationState(world);
  const calendar = getCalendarState(world);
  const alreadyUnlocked = Boolean(population.higherSchoolUnlocked);
  const shouldUnlock =
    (population.secondaryGraduates ?? 0) >= HIGHER_SCHOOL_GRAD_MIN &&
    (calendar.year ?? 0) >= HIGHER_SCHOOL_YEAR_MIN;

  population.higherSchoolUnlocked = alreadyUnlocked || shouldUnlock;
  return !alreadyUnlocked && population.higherSchoolUnlocked;
}

function clampTalent(value) {
  return Math.max(0, Number(value ?? 0));
}

function updateTalentPools(world) {
  const population = getPopulationState(world);
  const classes = getClassesState(world);
  const annualPrimaryGrads = Math.max(0, Number(population.annualPrimaryGrads ?? 0));
  const annualSecondaryGrads = Math.max(0, Number(population.annualSecondaryGrads ?? 0));
  const annualHigherGrads = Math.max(0, Number(population.annualHigherGrads ?? 0));

  const adminGrowthBase = annualSecondaryGrads * 0.4 + annualHigherGrads * 0.8;
  const commerceGrowthBase = annualPrimaryGrads * 0.2 + annualSecondaryGrads * 0.3;
  const techGrowthBase = annualSecondaryGrads * 0.2 + annualHigherGrads * 0.5;

  const merchantGrowthBoost = (classes.merchantSatisfaction ?? 70) > 70 ? 0.1 : 0;
  const officialGrowthBoost = (classes.officialSatisfaction ?? 70) > 70 ? 0.1 : 0;
  const socialUnrestPenalty = (classes.farmerSatisfaction ?? 70) < 40 ? 0.1 : 0;

  const adminGrowthMultiplier = Math.max(0, (1 + officialGrowthBoost) * (1 - socialUnrestPenalty));
  const commerceGrowthMultiplier = Math.max(0, (1 + merchantGrowthBoost) * (1 - socialUnrestPenalty));
  const techGrowthMultiplier = Math.max(0, 1 - socialUnrestPenalty);

  const adminGrowth = adminGrowthBase * adminGrowthMultiplier;
  const commerceGrowth = commerceGrowthBase * commerceGrowthMultiplier;
  const techGrowth = techGrowthBase * techGrowthMultiplier;

  const adminAfterDecay = clampTalent((population.adminTalent ?? 0) * GRADUATE_DECAY_RATE);
  const commerceAfterDecay = clampTalent((population.commerceTalent ?? 0) * GRADUATE_DECAY_RATE);
  const techAfterDecay = clampTalent((population.techTalent ?? 0) * GRADUATE_DECAY_RATE);

  population.adminTalent = adminAfterDecay + adminGrowth;
  population.commerceTalent = commerceAfterDecay + commerceGrowth;
  population.techTalent = techAfterDecay + techGrowth;

  population.adminTalentDeployed = Math.min(clampTalent(population.adminTalentDeployed ?? 0), population.adminTalent);
  population.commerceTalentDeployed = Math.min(clampTalent(population.commerceTalentDeployed ?? 0), population.commerceTalent);
  population.techTalentDeployed = Math.min(clampTalent(population.techTalentDeployed ?? 0), population.techTalent);

  world.institutionPrereqBasicGov = population.adminTalent >= 10;
  world.institutionPrereqPolice = population.adminTalent >= 100;
  world.institutionPrereqCourt = population.adminTalent >= 200;
  world.institutionPrereqTradeBureau = population.commerceTalent >= 100;
  world.institutionPrereqEngineeringBureau = population.techTalent >= 100;
}

export function processEducationYear(world) {
  const population = getPopulationState(world);
  const education = getEducationState(world);
  const totalPopulation = Math.max(1, Number(population.totalPopulation ?? 1));
  const childrenPool = Math.max(0, Math.floor(Number(population.children ?? 0) * 0.6));
  const gdpPerCapita = Math.max(1, Number(world.gdpEstimate ?? 0) / totalPopulation);

  const commercialPrimaryCapacity = Math.max(0, Math.floor(Number(education.commercialPrimarySchools ?? 0) * 50));
  const commercialSecondaryCapacity = Math.max(0, Math.floor(Number(education.commercialSecondarySchools ?? 0) * 30));
  const governmentPrimaryCapacity = Math.max(0, Math.floor(Number(education.govPrimaryCapacity ?? 0)));
  const governmentSecondaryCapacity = Math.max(0, Math.floor(Number(education.govSecondaryCapacity ?? 0)));
  const governmentHigherCapacity = Math.max(0, Math.floor(Number(education.govHigherCapacity ?? 0)));

  const wealthyChildrenPool = Math.floor(childrenPool * 0.15);
  const primaryEnrolled = Math.min(childrenPool, commercialPrimaryCapacity + governmentPrimaryCapacity);
  const annualPrimaryGrads = Math.floor(primaryEnrolled / PRIMARY_PROGRAM_YEARS);

  const currentSecondaryEligiblePool = Math.max(0, Number(population.secondaryEligiblePool ?? 0));
  const currentHigherEligiblePool = Math.max(0, Number(population.higherEligiblePool ?? 0));

  const secondaryCapacity = commercialSecondaryCapacity + governmentSecondaryCapacity;
  const secondaryPoolBeforeEnrollment = currentSecondaryEligiblePool + annualPrimaryGrads;
  const secondaryEnrolled = Math.min(secondaryCapacity, Math.floor(secondaryPoolBeforeEnrollment));
  const annualSecondaryGrads = Math.floor(secondaryEnrolled / SECONDARY_PROGRAM_YEARS);

  const higherCapacity = governmentHigherCapacity;
  const higherPoolBeforeEnrollment = currentHigherEligiblePool + annualSecondaryGrads;
  const higherEnrolled = population.higherSchoolUnlocked
    ? Math.min(higherCapacity, Math.floor(higherPoolBeforeEnrollment))
    : 0;
  const annualHigherGrads = Math.floor(higherEnrolled / HIGHER_PROGRAM_YEARS);

  const secondaryEligiblePool = Math.max(
    0,
    (secondaryPoolBeforeEnrollment - secondaryEnrolled) * ELIGIBLE_POOL_DECAY
  );
  const higherEligiblePool = Math.max(
    0,
    (higherPoolBeforeEnrollment - higherEnrolled) * ELIGIBLE_POOL_DECAY
  );

  const commercialPrimaryEnrolled = Math.min(wealthyChildrenPool, Math.min(primaryEnrolled, commercialPrimaryCapacity));
  const commercialSecondaryEnrolled = Math.min(
    Math.max(0, Math.floor(secondaryEnrolled * 0.3)),
    Math.min(secondaryEnrolled, commercialSecondaryCapacity)
  );

  education.primaryEnrolled = primaryEnrolled;
  education.secondaryEnrolled = secondaryEnrolled;
  education.higherEnrolled = higherEnrolled;
  population.annualPrimaryGrads = annualPrimaryGrads;
  population.annualSecondaryGrads = annualSecondaryGrads;
  population.annualHigherGrads = annualHigherGrads;
  population.secondaryEligiblePool = Math.max(0, Math.floor(secondaryEligiblePool));
  population.higherEligiblePool = Math.max(0, Math.floor(higherEligiblePool));

  const decayedPrimary = Math.max(0, Math.floor(Number(population.primaryGraduates ?? 0) * GRADUATE_DECAY_RATE));
  const decayedSecondary = Math.max(0, Math.floor(Number(population.secondaryGraduates ?? 0) * GRADUATE_DECAY_RATE));
  const decayedHigher = Math.max(0, Math.floor(Number(population.higherGraduates ?? 0) * GRADUATE_DECAY_RATE));
  population.primaryGraduates = Math.max(0, Math.floor(decayedPrimary + annualPrimaryGrads));
  population.secondaryGraduates = Math.max(0, Math.floor(decayedSecondary + annualSecondaryGrads));
  population.higherGraduates = Math.max(0, Math.floor(decayedHigher + annualHigherGrads));

  const literatePopulation = Math.max(0, Math.floor(totalPopulation * Math.max(0, Number(population.overallLiteracy ?? 0))));
  population.scholarPool = Math.max(0, Math.floor(literatePopulation * 0.1));

  return {
    gdpPerCapita,
    primaryEnrolled,
    secondaryEnrolled,
    higherEnrolled,
    commercialPrimaryEnrolled,
    commercialSecondaryEnrolled,
    annualPrimaryGrads,
    annualSecondaryGrads,
    annualHigherGrads,
    secondaryEligiblePool: population.secondaryEligiblePool,
    higherEligiblePool: population.higherEligiblePool,
  };
}

export function updatePopulation(world) {
  const population = getPopulationState(world);

  const previousTotalPopulation = Math.max(0, Number(population.totalPopulation ?? 0));

  let infantPop = Math.max(0, Number(population.infantPop ?? 0));
  let childPop = Math.max(0, Number(population.childPop ?? 0));
  let teenPop = Math.max(0, Number(population.teenPop ?? 0));
  let youthPop = Math.max(0, Number(population.youthPop ?? 0));
  let primeAdultPop = Math.max(0, Number(population.primeAdultPop ?? 0));
  let middleAgePop = Math.max(0, Number(population.middleAgePop ?? 0));
  let elderlyPop = Math.max(0, Number(population.elderlyPop ?? 0));

  // Annual cohort aging transitions.
  const infantToChild = infantPop / 4;
  const childToTeen = childPop / 9;
  const teenToYouth = teenPop / 6;
  const youthToPrime = youthPop / 7;
  const primeToMiddle = primeAdultPop / 15;
  const middleToElderly = middleAgePop / 15;

  infantPop = infantPop - infantToChild;
  childPop = childPop + infantToChild - childToTeen;
  teenPop = teenPop + childToTeen - teenToYouth;
  youthPop = youthPop + teenToYouth - youthToPrime;
  primeAdultPop = primeAdultPop + youthToPrime - primeToMiddle;
  middleAgePop = middleAgePop + primeToMiddle - middleToElderly;
  elderlyPop = elderlyPop + middleToElderly;

  // Fertility rate and births from prime-age women.
  let fertilityRate = 0.04;
  const grainSurplus = Number(world.grainSurplus ?? 0);
  const healthIndex = Number(world.healthIndex ?? 50);
  const stabilityIndex = Number(world.stabilityIndex ?? 80);
  const farmerLifeQuality = Number(world.farmerLifeQuality ?? 50);

  if (grainSurplus > 0) fertilityRate += 0.005;
  if (grainSurplus < 0) fertilityRate -= 0.01;
  if (healthIndex >= 70) fertilityRate += 0.005;
  if (stabilityIndex < 40) fertilityRate -= 0.01;
  if (farmerLifeQuality > 70) fertilityRate += 0.003;

  fertilityRate = Math.max(0.01, Math.min(0.08, fertilityRate));
  const births = primeAdultPop * 0.5 * fertilityRate;
  infantPop += births;

  // Mortality with global modifiers.
  let mortalityMultiplier = 1;
  if (healthIndex < 20) {
    mortalityMultiplier *= 2.0;
  } else if (healthIndex < 40) {
    mortalityMultiplier *= 1.5;
  }

  const stagedTotalPopulation =
    infantPop + childPop + teenPop + youthPop + primeAdultPop + middleAgePop + elderlyPop;
  if (grainSurplus < -stagedTotalPopulation * 100) {
    mortalityMultiplier *= 1.8;
  }
  if (stabilityIndex < 30) {
    mortalityMultiplier *= 1.2;
  }

  const mortalityRates = {
    infant: 0.05 * mortalityMultiplier,
    child: 0.01 * mortalityMultiplier,
    teen: 0.005 * mortalityMultiplier,
    youth: 0.008 * mortalityMultiplier,
    prime: 0.01 * mortalityMultiplier,
    middle: 0.02 * mortalityMultiplier,
    elderly: 0.08 * mortalityMultiplier,
  };

  const infantDeaths = infantPop * mortalityRates.infant;
  const childDeaths = childPop * mortalityRates.child;
  const teenDeaths = teenPop * mortalityRates.teen;
  const youthDeaths = youthPop * mortalityRates.youth;
  const primeDeaths = primeAdultPop * mortalityRates.prime;
  const middleDeaths = middleAgePop * mortalityRates.middle;
  const elderlyDeaths = elderlyPop * mortalityRates.elderly;

  infantPop = Math.max(0, infantPop - infantDeaths);
  childPop = Math.max(0, childPop - childDeaths);
  teenPop = Math.max(0, teenPop - teenDeaths);
  youthPop = Math.max(0, youthPop - youthDeaths);
  primeAdultPop = Math.max(0, primeAdultPop - primeDeaths);
  middleAgePop = Math.max(0, middleAgePop - middleDeaths);
  elderlyPop = Math.max(0, elderlyPop - elderlyDeaths);

  population.infantPop = clamp(infantPop);
  population.childPop = clamp(childPop);
  population.teenPop = clamp(teenPop);
  population.youthPop = clamp(youthPop);
  population.primeAdultPop = clamp(primeAdultPop);
  population.middleAgePop = clamp(middleAgePop);
  population.elderlyPop = clamp(elderlyPop);

  const totalPopulation =
    population.infantPop +
    population.childPop +
    population.teenPop +
    population.youthPop +
    population.primeAdultPop +
    population.middleAgePop +
    population.elderlyPop;

  const effectiveLaborForce =
    population.teenPop * 0.5 +
    population.youthPop * 1.0 +
    population.primeAdultPop * 1.0 +
    population.middleAgePop * 0.8;

  const children = population.infantPop + population.childPop + population.teenPop;
  const elderly = population.elderlyPop;

  population.totalPopulation = clamp(totalPopulation);
  population.laborForce = Math.max(0, Math.floor(effectiveLaborForce));
  population.children = clamp(children);
  population.elderly = clamp(elderly);
  population.fertilityRate = fertilityRate;
  population.birthsThisYear = clamp(births);
  population.deathsThisYear = clamp(
    infantDeaths + childDeaths + teenDeaths + youthDeaths + primeDeaths + middleDeaths + elderlyDeaths
  );

  const totalGrainDemand =
    population.infantPop * 240 +
    population.childPop * 300 +
    population.teenPop * 400 +
    population.youthPop * 400 +
    population.primeAdultPop * 400 +
    population.middleAgePop * 400 +
    population.elderlyPop * 360;

  world.totalGrainDemand = clamp(totalGrainDemand);
  world.populationGrowthRate =
    previousTotalPopulation > 0
      ? (population.totalPopulation - previousTotalPopulation) / previousTotalPopulation
      : BASE_GROWTH_RATE;

  const literacyAppearanceLogs = ensureClassLiteracyActivation(world);
  updateClassPopulationShares(world);
  applyLiteracyGrowth(world);
  updateOverallLiteracy(world);
  const higherSchoolUnlockedThisYear = updateHigherSchoolUnlock(world);
  updateTalentPools(world);

  return {
    populationDelta: population.totalPopulation - previousTotalPopulation,
    growthRate: world.populationGrowthRate,
    commerceProsperityBonusApplied: false,
    demandShortfallPenaltyApplied: false,
    births: population.birthsThisYear,
    deaths: population.deathsThisYear,
    literacyAppearanceLogs,
    higherSchoolUnlockedThisYear,
  };
}

