// Society population module

function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function clampLiteracy(value, cap) {
  return Math.max(0, Math.min(cap, value));
}

function updateLaborAllocation(world) {
  const requiredFarmingLabor = world.farmlandAreaMu / 10;
  const farmingLaborAllocated = Math.min(world.laborForce, requiredFarmingLabor);
  const idleLabor = Math.max(0, world.laborForce - farmingLaborAllocated);
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  world.idleLabor = clamp(idleLabor);
  world.farmEfficiency = farmEfficiency;
  world.landUtilizationPercent = farmEfficiency * 100;

  const baseYield = world.baseGrainYieldPerMu ?? world.grainYieldPerMu;
  world.baseGrainYieldPerMu = baseYield;
  world.grainYieldPerMu = clamp(baseYield * farmEfficiency);
}

function getPopulationGrowthDetails(world) {
  const baseGrowthRate = 0.02;
  const commerceProsperityBonus =
    (world.merchantIncomePerHead ?? 0) > (world.farmerIncomePerHead ?? 0) * 1.5 ? 0.005 : 0;
  const demandShortfallPenalty = world.demandShortfall ? 0.005 : 0;

  const techGrowthBonus = Number(world.techBonuses?.populationGrowthBonus ?? 0);
  const healthGrowthModifier = Number(world.healthGrowthModifier ?? 0);
  const grainSurplus = Number(world.grainSurplus ?? 0);
  const totalPopulation = Math.max(1, Number(world.totalPopulation ?? 1));
  const famineSeverePenalty = grainSurplus < -totalPopulation * 100 ? 0.02 : 0;
  const famineStressPenalty = !famineSeverePenalty && grainSurplus < -totalPopulation * 50 ? 0.01 : 0;
  const healthCrisisPenalty = Number(world.healthIndex ?? 50) < 20 ? 0.01 : 0;
  const stabilityCrisisPenalty = Number(world.stabilityIndex ?? 80) < 30 ? 0.005 : 0;

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
  const growthRate = Math.max(-0.05, calculatedRate);

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
    world.merchantLiteracy = Math.max(world.merchantLiteracy ?? 0, 0.25);
    messages.push('商人阶层出现，识字率基准设为25%');
  }

  if (!flags.officialActive && world.techBonuses?.bureaucracyUnlocked) {
    flags.officialActive = true;
    world.officialLiteracy = Math.max(world.officialLiteracy ?? 0, 0.5);
    messages.push('官员阶层出现，识字率基准设为50%');
  }

  if (!flags.workerActive && ((world.hempLandMu ?? 0) > 0 || (world.mulberryLandMu ?? 0) > 0)) {
    flags.workerActive = true;
    world.workerLiteracy = Math.max(world.workerLiteracy ?? 0, 0.08);
    messages.push('工人阶层出现，识字率基准设为8%');
  }

  if (!flags.landlordActive && (world.farmlandRentRate ?? 0) > 0) {
    flags.landlordActive = true;
    world.landlordLiteracy = Math.max(world.landlordLiteracy ?? 0, 0.2);
    messages.push('地主阶层出现，识字率基准设为20%');
  }

  return messages;
}

function updateClassPopulationShares(world) {
  const farmerPopulation = Math.max(0, clamp(world.farmingLaborAllocated ?? 0));
  const merchantPopulation = Math.max(0, clamp(world.merchantCount ?? 0));
  const officialPopulation = Math.max(0, clamp(world.scholarPool ?? 0));
  const workerPopulation = Math.max(
    0,
    clamp((world.hempLaborRequired ?? 0) + (world.mulberryLaborRequired ?? 0))
  );
  const landlordPopulation = Math.max(0, clamp((world.farmlandRentRate ?? 0) > 0 ? world.totalPopulation * 0.02 : 0));

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
  const flags = world.literacyClassFlags ?? {};
  const caps = getLiteracyCaps(world);
  const scholarBonus = world.techBonuses?.scholarClass ? 0.005 : 0;
  const baseGrowth = 0.001;

  const totalPrimarySchools =
    Math.max(0, Number(world.commercialPrimarySchools ?? 0)) +
    (Number(world.govPrimaryCapacity ?? 0) > 0 ? 1 : 0);
  const totalSecondarySchools =
    Math.max(0, Number(world.commercialSecondarySchools ?? 0)) +
    (Number(world.govSecondaryCapacity ?? 0) > 0 ? 1 : 0);
  const totalHigherSchools = Number(world.govHigherCapacity ?? 0) > 0 ? 1 : 0;
  const downVillageBoost = (Math.floor(Math.max(0, Number(world.studentsDownToVillage ?? 0)) / 100)) * 0.01;

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

  world.farmerLiteracy = clampLiteracy((world.farmerLiteracy ?? 0.05) + farmerGrowth, caps.farmer);

  if (flags.merchantActive) {
    world.merchantLiteracy = clampLiteracy((world.merchantLiteracy ?? 0) + merchantGrowth, caps.merchant);
  }

  if (flags.officialActive) {
    world.officialLiteracy = clampLiteracy((world.officialLiteracy ?? 0) + officialGrowth, caps.official);
  }

  if (flags.workerActive) {
    world.workerLiteracy = clampLiteracy((world.workerLiteracy ?? 0) + workerGrowth, caps.worker);
  }

  if (flags.landlordActive) {
    world.landlordLiteracy = clampLiteracy((world.landlordLiteracy ?? 0) + landlordGrowth, caps.landlord);
  }
}

function updateOverallLiteracy(world) {
  const classes = [
    { pop: world.farmerPopulation ?? 0, literacy: world.farmerLiteracy ?? 0 },
    {
      pop: world.literacyClassFlags?.merchantActive ? world.merchantPopulation ?? 0 : 0,
      literacy: world.merchantLiteracy ?? 0,
    },
    {
      pop: world.literacyClassFlags?.officialActive ? world.officialPopulation ?? 0 : 0,
      literacy: world.officialLiteracy ?? 0,
    },
    {
      pop: world.literacyClassFlags?.workerActive ? world.workerPopulation ?? 0 : 0,
      literacy: world.workerLiteracy ?? 0,
    },
    {
      pop: world.literacyClassFlags?.landlordActive ? world.landlordPopulation ?? 0 : 0,
      literacy: world.landlordLiteracy ?? 0,
    },
  ];

  const totalTrackedPop = classes.reduce((sum, cls) => sum + Math.max(0, cls.pop), 0);
  if (totalTrackedPop <= 0) {
    world.overallLiteracy = world.farmerLiteracy ?? 0.05;
    return;
  }

  const weightedLiteracy = classes.reduce(
    (sum, cls) => sum + Math.max(0, cls.pop) * Math.max(0, cls.literacy),
    0
  );

  world.overallLiteracy = weightedLiteracy / totalTrackedPop;
}

function updateHigherSchoolUnlock(world) {
  const alreadyUnlocked = Boolean(world.higherSchoolUnlocked);
  const shouldUnlock =
    (world.secondaryGraduates ?? 0) >= 2000 &&
    (world.year ?? 0) >= 100;

  world.higherSchoolUnlocked = alreadyUnlocked || shouldUnlock;
  return !alreadyUnlocked && world.higherSchoolUnlocked;
}

function clampTalent(value) {
  return Math.max(0, Number(value ?? 0));
}

function updateTalentPools(world) {
  const annualPrimaryGrads = Math.max(0, Number(world.annualPrimaryGrads ?? 0));
  const annualSecondaryGrads = Math.max(0, Number(world.annualSecondaryGrads ?? 0));
  const annualHigherGrads = Math.max(0, Number(world.annualHigherGrads ?? 0));

  const adminGrowthBase = annualSecondaryGrads * 0.4 + annualHigherGrads * 0.8;
  const commerceGrowthBase = annualPrimaryGrads * 0.2 + annualSecondaryGrads * 0.3;
  const techGrowthBase = annualSecondaryGrads * 0.2 + annualHigherGrads * 0.5;

  const merchantGrowthBoost = (world.merchantSatisfaction ?? 70) > 70 ? 0.1 : 0;
  const officialGrowthBoost = (world.officialSatisfaction ?? 70) > 70 ? 0.1 : 0;
  const socialUnrestPenalty = (world.farmerSatisfaction ?? 70) < 40 ? 0.1 : 0;

  const adminGrowthMultiplier = Math.max(0, (1 + officialGrowthBoost) * (1 - socialUnrestPenalty));
  const commerceGrowthMultiplier = Math.max(0, (1 + merchantGrowthBoost) * (1 - socialUnrestPenalty));
  const techGrowthMultiplier = Math.max(0, 1 - socialUnrestPenalty);

  const adminGrowth = adminGrowthBase * adminGrowthMultiplier;
  const commerceGrowth = commerceGrowthBase * commerceGrowthMultiplier;
  const techGrowth = techGrowthBase * techGrowthMultiplier;

  const adminAfterDecay = clampTalent((world.adminTalent ?? 0) * 0.97);
  const commerceAfterDecay = clampTalent((world.commerceTalent ?? 0) * 0.97);
  const techAfterDecay = clampTalent((world.techTalent ?? 0) * 0.97);

  world.adminTalent = adminAfterDecay + adminGrowth;
  world.commerceTalent = commerceAfterDecay + commerceGrowth;
  world.techTalent = techAfterDecay + techGrowth;

  world.adminTalentDeployed = Math.min(clampTalent(world.adminTalentDeployed ?? 0), world.adminTalent);
  world.commerceTalentDeployed = Math.min(clampTalent(world.commerceTalentDeployed ?? 0), world.commerceTalent);
  world.techTalentDeployed = Math.min(clampTalent(world.techTalentDeployed ?? 0), world.techTalent);

  world.institutionPrereqBasicGov = world.adminTalent >= 10;
  world.institutionPrereqPolice = world.adminTalent >= 100;
  world.institutionPrereqCourt = world.adminTalent >= 200;
  world.institutionPrereqTradeBureau = world.commerceTalent >= 100;
  world.institutionPrereqEngineeringBureau = world.techTalent >= 100;
}

export function processEducationYear(world) {
  const totalPopulation = Math.max(1, Number(world.totalPopulation ?? 1));
  const childrenPool = Math.max(0, Math.floor(Number(world.children ?? 0) * 0.6));
  const gdpPerCapita = Math.max(1, Number(world.gdpEstimate ?? 0) / totalPopulation);

  const commercialPrimaryCapacity = Math.max(0, Math.floor(Number(world.commercialPrimarySchools ?? 0) * 50));
  const commercialSecondaryCapacity = Math.max(0, Math.floor(Number(world.commercialSecondarySchools ?? 0) * 30));
  const governmentPrimaryCapacity = Math.max(0, Math.floor(Number(world.govPrimaryCapacity ?? 0)));
  const governmentSecondaryCapacity = Math.max(0, Math.floor(Number(world.govSecondaryCapacity ?? 0)));
  const governmentHigherCapacity = Math.max(0, Math.floor(Number(world.govHigherCapacity ?? 0)));

  const wealthyChildrenPool = Math.floor(childrenPool * 0.15);
  const primaryEnrolled = Math.min(childrenPool, commercialPrimaryCapacity + governmentPrimaryCapacity);
  const secondaryEligiblePool = Math.max(0, Math.floor((world.primaryGraduates ?? 0) * 0.4));
  const secondaryEnrolled = Math.min(
    secondaryEligiblePool,
    commercialSecondaryCapacity + governmentSecondaryCapacity
  );
  const higherEligiblePool = Math.max(0, Math.floor((world.secondaryGraduates ?? 0) * 0.3));
  const higherEnrolled = world.higherSchoolUnlocked
    ? Math.min(higherEligiblePool, governmentHigherCapacity)
    : 0;

  const commercialPrimaryEnrolled = Math.min(wealthyChildrenPool, Math.min(primaryEnrolled, commercialPrimaryCapacity));
  const commercialSecondaryEnrolled = Math.min(Math.max(0, Math.floor(secondaryEligiblePool * 0.3)), Math.min(secondaryEnrolled, commercialSecondaryCapacity));

  const annualPrimaryGrads = Math.floor(primaryEnrolled / 3);
  const annualSecondaryGrads = Math.floor(secondaryEnrolled / 4);
  const annualHigherGrads = Math.floor(higherEnrolled / 3);

  world.primaryEnrolled = primaryEnrolled;
  world.secondaryEnrolled = secondaryEnrolled;
  world.higherEnrolled = higherEnrolled;
  world.annualPrimaryGrads = annualPrimaryGrads;
  world.annualSecondaryGrads = annualSecondaryGrads;
  world.annualHigherGrads = annualHigherGrads;

  const decayedPrimary = Math.max(0, Math.floor(Number(world.primaryGraduates ?? 0) * 0.97));
  const decayedSecondary = Math.max(0, Math.floor(Number(world.secondaryGraduates ?? 0) * 0.97));
  const decayedHigher = Math.max(0, Math.floor(Number(world.higherGraduates ?? 0) * 0.97));
  world.primaryGraduates = Math.max(0, Math.floor(decayedPrimary + annualPrimaryGrads));
  world.secondaryGraduates = Math.max(0, Math.floor(decayedSecondary + annualSecondaryGrads));
  world.higherGraduates = Math.max(0, Math.floor(decayedHigher + annualHigherGrads));

  const literatePopulation = Math.max(0, Math.floor(totalPopulation * Math.max(0, Number(world.overallLiteracy ?? 0))));
  world.scholarPool = Math.max(0, Math.floor(literatePopulation * 0.1));

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
  };
}

export function updatePopulation(world) {
  const total = world.totalPopulation;
  const growthDetails = getPopulationGrowthDetails(world);

  const nextTotal = clamp(total * (1 + growthDetails.growthRate));
  const nextChildren = clamp(nextTotal * 0.2);
  const nextElderly = clamp(nextTotal * 0.2);
  const nextLaborForce = clamp(nextTotal - nextChildren - nextElderly);

  world.totalPopulation = nextTotal;
  world.children = nextChildren;
  world.elderly = nextElderly;
  world.laborForce = nextLaborForce;

  world.populationGrowthRate = growthDetails.growthRate;
  world.populationGrowthBaseRate = growthDetails.baseGrowthRate;
  world.populationGrowthCommerceBonus = growthDetails.commerceProsperityBonus;
  world.populationGrowthDemandPenalty = growthDetails.demandShortfallPenalty;
  world.populationGrowthTechBonus = growthDetails.techGrowthBonus;
  world.populationGrowthHealthModifier = growthDetails.healthGrowthModifier;
  world.populationGrowthFamineSeverePenalty = growthDetails.famineSeverePenalty;
  world.populationGrowthFamineStressPenalty = growthDetails.famineStressPenalty;
  world.populationGrowthHealthCrisisPenalty = growthDetails.healthCrisisPenalty;
  world.populationGrowthStabilityCrisisPenalty = growthDetails.stabilityCrisisPenalty;

  updateLaborAllocation(world);

  const literacyAppearanceLogs = ensureClassLiteracyActivation(world);
  updateClassPopulationShares(world);
  applyLiteracyGrowth(world);
  updateOverallLiteracy(world);
  const higherSchoolUnlockedThisYear = updateHigherSchoolUnlock(world);
  updateTalentPools(world);

  return {
    populationDelta: nextTotal - total,
    growthRate: growthDetails.growthRate,
    commerceProsperityBonusApplied: growthDetails.commerceProsperityBonus > 0,
    demandShortfallPenaltyApplied: growthDetails.demandShortfallPenalty > 0,
    literacyAppearanceLogs,
    higherSchoolUnlockedThisYear,
  };
}
