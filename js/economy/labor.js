// Labor module: labor allocation and shared clamps

import { LABOR_PER_MU } from '../config/constants.js';
import { calculateShopOperationState } from './commerce.js';

export function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function getPopulationState(world) {
  return world.__population ?? world;
}

function getLandState(world) {
  return world.__land ?? world;
}

function getAgricultureState(world) {
  return world.__agriculture ?? world;
}

function getInstitutionsState(world) {
  return world.__institutions ?? world;
}

function getFiscalState(world) {
  return world.__fiscal ?? world;
}

function clampToRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deriveEffectiveLaborForceFromCohorts(population) {
  const hasCohortData = [
    'teenPop',
    'youthPop',
    'primeAdultPop',
    'middleAgePop',
  ].every((key) => Number.isFinite(Number(population[key])));

  if (!hasCohortData) {
    return Math.max(0, Math.floor(Number(population.laborForce ?? 0)));
  }

  const effectiveLaborForce =
    Math.max(0, Number(population.teenPop ?? 0)) * 0.5 +
    Math.max(0, Number(population.youthPop ?? 0)) * 1.0 +
    Math.max(0, Number(population.primeAdultPop ?? 0)) * 1.0 +
    Math.max(0, Number(population.middleAgePop ?? 0)) * 0.8;

  return Math.max(0, Math.floor(effectiveLaborForce));
}

function calculateInstitutionWorkers(world) {
  const institutions = getInstitutionsState(world);
  return Math.max(
    0,
    Number(institutions.seniorOfficialCount ?? 0) +
      Number(institutions.midOfficialCount ?? 0) +
      Number(institutions.juniorOfficialCount ?? 0) +
      Number(institutions.policeOfficerCount ?? 0) +
      Number(institutions.judgeCount ?? 0) +
      Number(institutions.taxOfficerCount ?? 0) +
      Number(institutions.tradeOfficerCount ?? 0) +
      Number(institutions.engineerCount ?? 0) +
      Number(institutions.healthOfficerCount ?? 0) +
      Number(world.sanitationWorkerCount ?? 0) +
      Number(world.cleaningWorkerCount ?? 0)
  );
}

function calculateAverageOfficialWage(world, institutionWorkers) {
  const fiscal = getFiscalState(world);
  const wagePairs = [
    ['seniorOfficialCount', 'seniorOfficialWage'],
    ['midOfficialCount', 'midOfficialWage'],
    ['juniorOfficialCount', 'juniorOfficialWage'],
    ['policeOfficerCount', 'officerWage'],
    ['judgeCount', 'judgeWage'],
    ['taxOfficerCount', 'taxOfficerWage'],
    ['tradeOfficerCount', 'tradeOfficerWage'],
    ['engineerCount', 'engineerWage'],
    ['healthOfficerCount', 'healthOfficerWage'],
    ['sanitationWorkerCount', 'sanitationWorkerWage'],
    ['cleaningWorkerCount', 'cleaningWorkerWage'],
  ];

  let totalWage = 0;
  let totalHeadcount = 0;
  wagePairs.forEach(([countKey, wageKey]) => {
    const count = Math.max(0, Number(world[countKey] ?? 0));
    const wage = Math.max(0, Number(fiscal[wageKey] ?? 0));
    totalWage += count * wage;
    totalHeadcount += count;
  });

  if (totalHeadcount > 0) {
    return totalWage / totalHeadcount;
  }

  return institutionWorkers > 0 ? Math.max(0, Number(fiscal.midOfficialWage ?? 0)) : 0;
}

export function calculateLaborAllocation(world) {
  const land = getLandState(world);
  const agriculture = getAgricultureState(world);
  const population = getPopulationState(world);
  population.laborForce = deriveEffectiveLaborForceFromCohorts(population);
  const laborForce = Math.max(0, Number(population.laborForce ?? 0));
  const institutionWorkers = Math.max(0, Math.floor(calculateInstitutionWorkers(world)));
  const merchantCount = Math.max(0, Math.floor(Number(world.merchantCount ?? 0)));
  const fixedAllocatedLabor = Math.min(laborForce, institutionWorkers + merchantCount);
  const availableLabor = Math.max(0, laborForce - fixedAllocatedLabor);

  const requiredFarmingLabor = Math.max(0, Math.floor((land.farmlandAreaMu ?? 0) / LABOR_PER_MU));
  const hempLaborRequired = Math.max(0, Math.floor((land.hempLandMu ?? 0) / LABOR_PER_MU));
  const mulberryLaborRequired = Math.max(0, Math.floor((land.mulberryLandMu ?? 0) / LABOR_PER_MU));
  const minFarmingLabor = Math.min(availableLabor, requiredFarmingLabor);

  const priorFarming = Math.max(minFarmingLabor, Number(world.farmingLaborAllocated ?? minFarmingLabor));
  const priorCommerce = Math.max(0, Number(world.commerceLaborAllocated ?? world.laborAssignedCommerce ?? 0));
  const priorHemp = clampToRange(Number(world.hempLaborAllocated ?? 0), 0, hempLaborRequired);
  const priorMulberry = clampToRange(Number(world.mulberryLaborAllocated ?? 0), 0, mulberryLaborRequired);
  const priorTotal = Math.max(1, priorFarming + priorCommerce + priorHemp + priorMulberry);
  const scale = Math.min(1, availableLabor / priorTotal);
  const startingFarming = Math.max(minFarmingLabor, priorFarming * scale);
  let remainingLabor = Math.max(0, availableLabor - startingFarming);
  const startingCommerce = Math.min(priorCommerce * scale, remainingLabor);
  remainingLabor -= startingCommerce;
  const startingHemp = Math.min(priorHemp * scale, remainingLabor);
  remainingLabor -= startingHemp;
  const startingMulberry = Math.min(priorMulberry * scale, remainingLabor);
  remainingLabor -= startingMulberry;

  let farmingLaborAllocated = startingFarming;
  let commerceLaborAllocated = startingCommerce;
  let hempLaborAllocated = startingHemp;
  let mulberryLaborAllocated = startingMulberry;

  const initializeFreshAllocation =
    Number(world.year ?? 1) <= 1 &&
    Number(world.commerceLaborAllocated ?? world.laborAssignedCommerce ?? 0) <= 0 &&
    Number(world.hempLaborAllocated ?? 0) <= 0 &&
    Number(world.mulberryLaborAllocated ?? 0) <= 0;

  if (initializeFreshAllocation) {
    farmingLaborAllocated = minFarmingLabor;
    commerceLaborAllocated = 0;
    hempLaborAllocated = 0;
    mulberryLaborAllocated = 0;
  }

  const commerceLaborDemandCap = Math.max(0, Math.floor(Number(world.shopCount ?? 0)) * 4);
  const grainPrice = Math.max(0, Number(world.grainPrice ?? 1));
  const grainYieldPerMu = Math.max(0, Number(agriculture.grainYieldPerMu ?? agriculture.baseGrainYieldPerMu ?? 0));
  const agriculturalTaxRate = clampToRange(Number(agriculture.agriculturalTaxRate ?? world.agriculturalTaxRate ?? 0), 0, 1);
  const farmingWage = 10 * grainYieldPerMu * (1 - agriculturalTaxRate) * grainPrice;
  const commerceLaborDemandForWage = Math.max(
    1,
    Math.floor(Number(world.commerceLaborDemand ?? commerceLaborDemandCap ?? 0))
  );
  const commerceWagePerWorker = Math.max(0, Number(world.commerceGDP ?? 0)) / commerceLaborDemandForWage;
  const hempWage =
    hempLaborRequired > 0
      ? (Math.max(0, Number(land.hempLandMu ?? 0)) * 5 * Math.max(0, Number(world.blendedClothPrice ?? world.clothPrice ?? 0))) /
        hempLaborRequired
      : 0;
  const mulberryWage =
    mulberryLaborRequired > 0
      ? (Math.max(0, Number(land.mulberryLandMu ?? 0)) * 15 * Math.max(0, Number(world.blendedClothPrice ?? world.clothPrice ?? 0))) /
        mulberryLaborRequired
      : 0;
  const averageWage = (farmingWage + commerceWagePerWorker) / 2;
  const institutionWage = calculateAverageOfficialWage(world, institutionWorkers);
  const flowSpeed = 0.05;
  const maxFlowRate = 0.1;

  const sectors = {
    farming: { labor: farmingLaborAllocated, wage: farmingWage, min: minFarmingLabor, max: availableLabor },
    commerce: { labor: commerceLaborAllocated, wage: commerceWagePerWorker, min: 0, max: commerceLaborDemandCap },
    hemp: { labor: hempLaborAllocated, wage: hempWage, min: 0, max: hempLaborRequired },
    mulberry: { labor: mulberryLaborAllocated, wage: mulberryWage, min: 0, max: mulberryLaborRequired },
  };

  Object.values(sectors).forEach((sector) => {
    sector.labor = clampToRange(sector.labor, sector.min, sector.max);
  });

  const wageBase = Math.max(averageWage, 1);
  const requestedDelta = {};
  Object.entries(sectors).forEach(([key, sector]) => {
    const wageDiff = sector.wage - averageWage;
    const rawChange = sector.labor * flowSpeed * (wageDiff / wageBase);
    const maxChange = sector.labor * maxFlowRate;
    requestedDelta[key] = clampToRange(rawChange, -maxChange, maxChange);
  });

  const appliedDelta = { farming: 0, commerce: 0, hemp: 0, mulberry: 0 };
  const positiveEntries = Object.entries(requestedDelta).filter(([, delta]) => delta > 0);
  const negativeLaborPool = Object.entries(requestedDelta)
    .filter(([, delta]) => delta < 0)
    .reduce((sum, [key, delta]) => {
      const sector = sectors[key];
      const maxOut = Math.max(0, sector.labor - sector.min);
      return sum + Math.min(-delta, maxOut);
    }, 0);

  let positiveNeed = positiveEntries.reduce((sum, [, delta]) => sum + delta, 0);
  const positiveScale = positiveNeed > 0 ? Math.min(1, negativeLaborPool / positiveNeed) : 0;

  positiveEntries.forEach(([key, delta]) => {
    const sector = sectors[key];
    const maxIn = Math.max(0, sector.max - sector.labor);
    const scaled = delta * positiveScale;
    const accepted = Math.min(scaled, maxIn);
    appliedDelta[key] = accepted;
  });

  const totalPositiveApplied = Object.values(appliedDelta).reduce((sum, delta) => sum + Math.max(0, delta), 0);
  const negativeEntries = Object.entries(requestedDelta).filter(([, delta]) => delta < 0);
  let remainingNegativeToApply = totalPositiveApplied;
  const totalNegativeCapacity = negativeEntries.reduce((sum, [key]) => {
    const sector = sectors[key];
    return sum + Math.max(0, sector.labor - sector.min);
  }, 0);

  negativeEntries.forEach(([key], index) => {
    const sector = sectors[key];
    const maxOut = Math.max(0, sector.labor - sector.min);
    if (index === negativeEntries.length - 1) {
      const give = Math.min(maxOut, remainingNegativeToApply);
      appliedDelta[key] = -give;
    } else {
      const share = totalNegativeCapacity > 0 ? maxOut / totalNegativeCapacity : 0;
      const give = Math.min(maxOut, remainingNegativeToApply * share);
      appliedDelta[key] = -give;
      remainingNegativeToApply -= give;
    }
  });

  Object.entries(sectors).forEach(([key, sector]) => {
    sector.labor = clampToRange(sector.labor + (appliedDelta[key] ?? 0), sector.min, sector.max);
  });

  const laborUsedBySectors = Object.values(sectors).reduce((sum, sector) => sum + sector.labor, 0);
  const availableSlack = Math.max(0, availableLabor - laborUsedBySectors);
  sectors.farming.labor = clampToRange(sectors.farming.labor + availableSlack, sectors.farming.min, sectors.farming.max);

  const finalCommerceLabor = clamp(sectors.commerce.labor);
  const shopOps = calculateShopOperationState(world, finalCommerceLabor);
  const commerceLaborAllocatedFromShops = shopOps.commerceLaborDemand;

  const farmingLaborFinal = clamp(sectors.farming.labor);
  const hempLaborFinal = clamp(sectors.hemp.labor);
  const mulberryLaborFinal = clamp(sectors.mulberry.labor);
  const allocatedVariableLabor = farmingLaborFinal + commerceLaborAllocatedFromShops + hempLaborFinal + mulberryLaborFinal;
  const unemployed = Math.max(0, laborForce - fixedAllocatedLabor - allocatedVariableLabor);
  const unemploymentRate = population.laborForce > 0 ? unemployed / population.laborForce : 0;
  const idleLabor = unemployed;
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborFinal / requiredFarmingLabor) : 1;
  const hempEfficiency = hempLaborRequired > 0 ? clampRatio(hempLaborFinal / hempLaborRequired) : 1;
  const mulberryEfficiency =
    mulberryLaborRequired > 0 ? clampRatio(mulberryLaborFinal / mulberryLaborRequired) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = farmingLaborFinal;
  population.laborAssignedFarming = world.farmingLaborAllocated;
  population.hempLaborRequired = clamp(hempLaborRequired);
  population.mulberryLaborRequired = clamp(mulberryLaborRequired);
  world.hempLaborRequired = population.hempLaborRequired;
  world.mulberryLaborRequired = population.mulberryLaborRequired;
  world.hempLaborAllocated = hempLaborFinal;
  world.mulberryLaborAllocated = mulberryLaborFinal;
  world.commerceLaborAllocated = commerceLaborAllocatedFromShops;
  population.laborAssignedCommerce = commerceLaborAllocatedFromShops;
  population.commerceLaborAllocated = commerceLaborAllocatedFromShops;
  population.laborIdle = clamp(idleLabor);
  world.laborAssignedCommerce = population.laborAssignedCommerce;
  world.idleLabor = population.laborIdle;
  world.operatingShops = clamp(shopOps.operatingShops);
  world.idleShops = clamp(shopOps.idleShops);
  world.commerceLaborDemand = clamp(shopOps.commerceLaborDemand);
  world.availableCommerceLabor = Math.max(0, clamp(availableLabor - farmingLaborFinal - hempLaborFinal - mulberryLaborFinal));
  world.institutionWorkers = clamp(institutionWorkers);
  world.unemployed = clamp(unemployed);
  world.unemploymentRate = unemploymentRate;
  world.farmingWage = farmingWage;
  world.commerceWagePerWorker = commerceWagePerWorker;
  world.hempWage = hempWage;
  world.mulberryWage = mulberryWage;
  world.averageWage = averageWage;
  world.institutionWage = institutionWage;
  world.laborFlowSummary = `农业${appliedDelta.farming >= 0 ? '+' : ''}${appliedDelta.farming.toFixed(1)}，商业${appliedDelta.commerce >= 0 ? '+' : ''}${appliedDelta.commerce.toFixed(1)}，麻${appliedDelta.hemp >= 0 ? '+' : ''}${appliedDelta.hemp.toFixed(1)}，桑${appliedDelta.mulberry >= 0 ? '+' : ''}${appliedDelta.mulberry.toFixed(1)}`;
  if (unemploymentRate > 0.3) {
    world.unemploymentStatus = '严重失业';
    world.unemploymentEffectTier = 'high';
  } else if (unemploymentRate >= 0.15) {
    world.unemploymentStatus = '失业偏高';
    world.unemploymentEffectTier = 'medium';
  } else if (unemploymentRate >= 0.05) {
    world.unemploymentStatus = '轻度失业';
    world.unemploymentEffectTier = 'low';
  } else {
    world.unemploymentStatus = '正常';
    world.unemploymentEffectTier = 'none';
  }
  agriculture.farmEfficiency = farmEfficiency;
  world.farmEfficiency = agriculture.farmEfficiency;
  world.hempEfficiency = hempEfficiency;
  world.mulberryEfficiency = mulberryEfficiency;
  agriculture.landUtilizationPercent = farmEfficiency * 100;
  world.landUtilizationPercent = agriculture.landUtilizationPercent;

  return {
    farmEfficiency,
    hempEfficiency,
    mulberryEfficiency,
    institutionWorkers,
    unemploymentRate,
    wageSignals: {
      farmingWage,
      commerceWagePerWorker,
      institutionWage,
      hempWage,
      mulberryWage,
      averageWage,
    },
    unemploymentEffectTier: world.unemploymentEffectTier,
  };
}
