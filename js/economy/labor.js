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
  const hasCohortData = ['teenPop', 'youthPop', 'primeAdultPop', 'middleAgePop'].every((key) =>
    Number.isFinite(Number(population[key]))
  );

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

function softmax(x) {
  return Math.exp(x);
}

export function softmaxLaborAllocation(sectors, movableLabor, temperature) {
  const safeTemperature = Math.max(1, Number(temperature ?? 1));
  const weights = sectors.map((sector) => {
    const utility = Number(sector.utility ?? 0);
    return { id: sector.id, weight: softmax(utility / safeTemperature) };
  });

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    const equalShare = sectors.length > 0 ? movableLabor / sectors.length : 0;
    return sectors.map((sector) => ({ id: sector.id, targetLabor: equalShare }));
  }

  return weights.map((item) => ({
    id: item.id,
    targetLabor: (item.weight / totalWeight) * movableLabor,
  }));
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
  const movableLabor = Math.max(0, laborForce - fixedAllocatedLabor);

  const requiredFarmingLabor = Math.max(0, Math.floor((land.farmlandAreaMu ?? 0) / LABOR_PER_MU));
  const hempLaborRequired = Math.max(0, Math.floor((land.hempLandMu ?? 0) / LABOR_PER_MU));
  const mulberryLaborRequired = Math.max(0, Math.floor((land.mulberryLandMu ?? 0) / LABOR_PER_MU));
  const foodSecurityLaborFloor = Math.min(requiredFarmingLabor, movableLabor);

  const priorFarming = Math.max(foodSecurityLaborFloor, Number(world.farmingLaborAllocated ?? foodSecurityLaborFloor));
  const priorCommerce = Math.max(0, Number(world.commerceLaborAllocated ?? world.laborAssignedCommerce ?? 0));
  const priorHemp = clampToRange(Number(world.hempLaborAllocated ?? 0), 0, hempLaborRequired);
  const priorMulberry = clampToRange(Number(world.mulberryLaborAllocated ?? 0), 0, mulberryLaborRequired);

  const commerceLaborCapProbe = calculateShopOperationState(
    world,
    Math.max(0, Math.floor(Number(world.shopCount ?? 0)) * 4)
  );
  const commerceLaborDemandCap = Math.max(0, Number(commerceLaborCapProbe.commerceLaborDemand ?? 0));

  const grainPrice = Math.max(0, Number(world.grainPrice ?? 1));
  const grainYieldPerMu = Math.max(0, Number(agriculture.grainYieldPerMu ?? agriculture.baseGrainYieldPerMu ?? 0));
  const agriculturalTaxRate = clampToRange(Number(agriculture.agriculturalTaxRate ?? world.agriculturalTaxRate ?? 0), 0, 1);
  const farmingWage = 10 * grainYieldPerMu * (1 - agriculturalTaxRate) * grainPrice;

  const commerceWagePerWorker =
    commerceLaborDemandCap > 0
      ? Math.max(0, Number(world.commerceGDP ?? 0)) / commerceLaborDemandCap
      : Math.max(0, Number(world.commerceWagePerWorker ?? 0));

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

  const laborForAverage = Math.max(1, priorFarming + priorCommerce + priorHemp + priorMulberry);
  const averageWage =
    (farmingWage * priorFarming +
      commerceWagePerWorker * priorCommerce +
      hempWage * priorHemp +
      mulberryWage * priorMulberry) /
    laborForAverage;

  const institutionWage = calculateAverageOfficialWage(world, institutionWorkers);
  const flowSpeed = 0.08;

  const sectors = [
    {
      id: 'farming',
      wage: farmingWage,
      risk: Number(world.grainSurplus ?? 0) < 0 ? 0.3 : 0.0,
      mobilityCost: 0.05,
      min: foodSecurityLaborFloor,
      max: requiredFarmingLabor,
      currentLabor: priorFarming,
    },
    {
      id: 'commerce',
      wage: commerceWagePerWorker,
      risk: 0.02,
      mobilityCost: 0.15,
      min: 0,
      max: commerceLaborDemandCap,
      currentLabor: priorCommerce,
    },
    {
      id: 'hemp',
      wage: hempWage,
      risk: 0.01,
      mobilityCost: 0.1,
      min: 0,
      max: hempLaborRequired,
      currentLabor: priorHemp,
    },
    {
      id: 'mulberry',
      wage: mulberryWage,
      risk: 0.01,
      mobilityCost: 0.12,
      min: 0,
      max: mulberryLaborRequired,
      currentLabor: priorMulberry,
    },
  ];

  sectors.forEach((sector) => {
    sector.max = Math.max(sector.min, sector.max);
    sector.currentLabor = clampToRange(sector.currentLabor, sector.min, sector.max);
    sector.utility = sector.wage * (1 - sector.risk) - sector.mobilityCost * averageWage;
  });

  const temperature = Math.max(averageWage * 0.5, 1);
  const softTargets = softmaxLaborAllocation(sectors, movableLabor, temperature);

  const targetBySector = {};
  softTargets.forEach((entry) => {
    const sector = sectors.find((s) => s.id === entry.id);
    targetBySector[entry.id] = clampToRange(entry.targetLabor, sector.min, sector.max);
  });

  let allocatedTarget = Object.values(targetBySector).reduce((sum, v) => sum + v, 0);
  let remaining = Math.max(0, movableLabor - allocatedTarget);

  if (remaining > 0) {
    const farmingSector = sectors.find((s) => s.id === 'farming');
    const farmingRoom = Math.max(0, farmingSector.max - targetBySector.farming);
    const farmingBoost = Math.min(remaining, farmingRoom);
    targetBySector.farming += farmingBoost;
    remaining -= farmingBoost;
  }

  const newBySector = {};
  sectors.forEach((sector) => {
    const target = targetBySector[sector.id] ?? sector.currentLabor;
    const next = sector.currentLabor + flowSpeed * (target - sector.currentLabor);
    newBySector[sector.id] = clampToRange(next, sector.min, sector.max);
  });

  const sectorLaborTotal = Object.values(newBySector).reduce((sum, v) => sum + v, 0);
  let unemployed = Math.max(0, movableLabor - sectorLaborTotal);

  const farmingAfterFlow = newBySector.farming ?? 0;
  const farmingNeeded = Math.max(0, foodSecurityLaborFloor - farmingAfterFlow);
  if (farmingNeeded > 0) {
    const moved = Math.min(unemployed, farmingNeeded);
    newBySector.farming = farmingAfterFlow + moved;
    unemployed -= moved;
  }

  let finalFarming = Math.min(clamp(newBySector.farming ?? 0), clamp(laborForce));
  finalFarming = Math.min(finalFarming, laborForce);

  const maxVariableLabor = Math.max(0, laborForce - fixedAllocatedLabor);
  const finalCommerceRaw = clamp(Math.min(newBySector.commerce ?? 0, maxVariableLabor));
  let finalHemp = clamp(newBySector.hemp ?? 0);
  let finalMulberry = clamp(newBySector.mulberry ?? 0);

  const shopOps = calculateShopOperationState(world, finalCommerceRaw);
  let finalCommerce = clamp(Math.min(shopOps.commerceLaborDemand ?? 0, maxVariableLabor));

  let variableLaborUsed = finalFarming + finalCommerce + finalHemp + finalMulberry;
  if (variableLaborUsed > maxVariableLabor) {
    let overflow = variableLaborUsed - maxVariableLabor;

    const trimMulberry = Math.min(finalMulberry, overflow);
    finalMulberry -= trimMulberry;
    overflow -= trimMulberry;

    const trimHemp = Math.min(finalHemp, overflow);
    finalHemp -= trimHemp;
    overflow -= trimHemp;

    const commerceFloor = 0;
    const trimCommerce = Math.min(Math.max(0, finalCommerce - commerceFloor), overflow);
    finalCommerce -= trimCommerce;
    overflow -= trimCommerce;

    const farmingFloor = Math.min(foodSecurityLaborFloor, laborForce);
    const trimFarming = Math.min(Math.max(0, finalFarming - farmingFloor), overflow);
    finalFarming -= trimFarming;
  }

  variableLaborUsed = finalFarming + finalCommerce + finalHemp + finalMulberry;
  const finalUnemployed = Math.max(0, laborForce - fixedAllocatedLabor - variableLaborUsed);
  const unemploymentRate = laborForce > 0 ? finalUnemployed / laborForce : 0;

  const farmEfficiency = requiredFarmingLabor > 0 ? clampRatio(finalFarming / requiredFarmingLabor) : 1;
  const hempEfficiency = hempLaborRequired > 0 ? clampRatio(finalHemp / hempLaborRequired) : 1;
  const mulberryEfficiency = mulberryLaborRequired > 0 ? clampRatio(finalMulberry / mulberryLaborRequired) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = finalFarming;
  population.laborAssignedFarming = world.farmingLaborAllocated;

  population.hempLaborRequired = clamp(hempLaborRequired);
  population.mulberryLaborRequired = clamp(mulberryLaborRequired);
  world.hempLaborRequired = population.hempLaborRequired;
  world.mulberryLaborRequired = population.mulberryLaborRequired;

  world.hempLaborAllocated = finalHemp;
  world.mulberryLaborAllocated = finalMulberry;
  world.commerceLaborAllocated = finalCommerce;
  population.laborAssignedCommerce = finalCommerce;
  population.commerceLaborAllocated = finalCommerce;

  world.operatingShops = clamp(shopOps.operatingShops);
  world.idleShops = clamp(shopOps.idleShops);
  world.commerceLaborDemand = clamp(shopOps.commerceLaborDemand);

  world.institutionWorkers = clamp(institutionWorkers);
  world.unemployed = clamp(finalUnemployed);
  world.unemploymentRate = unemploymentRate;
  population.laborIdle = clamp(finalUnemployed);
  world.idleLabor = population.laborIdle;
  world.laborAssignedCommerce = finalCommerce;

  world.farmingWage = farmingWage;
  world.commerceWagePerWorker = commerceWagePerWorker;
  world.hempWage = hempWage;
  world.mulberryWage = mulberryWage;
  world.averageWage = averageWage;
  world.institutionWage = institutionWage;

  const farmingFlow = (targetBySector.farming ?? 0) - priorFarming;
  const commerceFlow = (targetBySector.commerce ?? 0) - priorCommerce;
  const hempFlow = (targetBySector.hemp ?? 0) - priorHemp;
  const mulberryFlow = (targetBySector.mulberry ?? 0) - priorMulberry;
  world.laborFlowSummary = `农业${farmingFlow >= 0 ? '+' : ''}${farmingFlow.toFixed(1)}，商业${commerceFlow >= 0 ? '+' : ''}${commerceFlow.toFixed(1)}，麻${hempFlow >= 0 ? '+' : ''}${hempFlow.toFixed(1)}，桑${mulberryFlow >= 0 ? '+' : ''}${mulberryFlow.toFixed(1)}`;

  if (Math.abs(farmingFlow) + Math.abs(commerceFlow) + Math.abs(hempFlow) + Math.abs(mulberryFlow) >= 10 && Array.isArray(world.yearLog)) {
    world.yearLog.push(`劳动力流动：${world.laborFlowSummary}`);
  }

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
