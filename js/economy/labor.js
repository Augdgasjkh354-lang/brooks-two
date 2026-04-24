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

export function calculateLaborAllocation(world) {
  const land = getLandState(world);
  const agriculture = getAgricultureState(world);
  const population = getPopulationState(world);
  const requiredFarmingLabor = Math.floor((land.farmlandAreaMu ?? 0) / LABOR_PER_MU);
  const farmingLaborAllocated = Math.min(population.laborForce, requiredFarmingLabor);

  const remainingAfterFarming = Math.max(0, population.laborForce - farmingLaborAllocated);
  const saltMineLaborRequired = Math.max(0, world.saltMineWorkers ?? 0);
  const saltMineLaborAllocated = Math.min(remainingAfterFarming, saltMineLaborRequired);

  const remainingAfterSalt = Math.max(0, remainingAfterFarming - saltMineLaborAllocated);
  const hempLaborRequired = Math.max(0, Math.floor((land.hempLandMu ?? 0) / LABOR_PER_MU));
  const hempLaborAllocated = Math.min(remainingAfterSalt, hempLaborRequired);

  const remainingAfterHemp = Math.max(0, remainingAfterSalt - hempLaborAllocated);
  const mulberryLaborRequired = Math.max(0, Math.floor((land.mulberryLandMu ?? 0) / LABOR_PER_MU));
  const mulberryLaborAllocated = Math.min(remainingAfterHemp, mulberryLaborRequired);

  const institutionWorkers = Math.max(0, Math.floor(calculateInstitutionWorkers(world)));
  const availableCommerceLabor = Math.max(
    0,
    Math.floor(
      population.laborForce -
        farmingLaborAllocated -
        hempLaborRequired -
        mulberryLaborRequired -
        institutionWorkers -
        (world.merchantCount ?? 0)
    )
  );
  const shopOps = calculateShopOperationState(world, availableCommerceLabor);
  const laborAssignedCommerce = shopOps.commerceLaborDemand;

  const unemployed = Math.max(
    0,
    population.laborForce -
      farmingLaborAllocated -
      laborAssignedCommerce -
      (world.merchantCount ?? 0) -
      hempLaborRequired -
      mulberryLaborRequired -
      institutionWorkers
  );
  const unemploymentRate = population.laborForce > 0 ? unemployed / population.laborForce : 0;
  const idleLabor = unemployed;
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;
  const hempEfficiency = hempLaborRequired > 0 ? clampRatio(hempLaborAllocated / hempLaborRequired) : 1;
  const mulberryEfficiency =
    mulberryLaborRequired > 0 ? clampRatio(mulberryLaborAllocated / mulberryLaborRequired) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  population.laborAssignedFarming = world.farmingLaborAllocated;
  population.hempLaborRequired = clamp(hempLaborRequired);
  population.mulberryLaborRequired = clamp(mulberryLaborRequired);
  world.hempLaborRequired = population.hempLaborRequired;
  world.mulberryLaborRequired = population.mulberryLaborRequired;
  world.hempLaborAllocated = clamp(hempLaborAllocated);
  world.mulberryLaborAllocated = clamp(mulberryLaborAllocated);
  population.laborAssignedCommerce = clamp(laborAssignedCommerce);
  population.laborIdle = clamp(idleLabor);
  world.laborAssignedCommerce = population.laborAssignedCommerce;
  world.idleLabor = population.laborIdle;
  world.operatingShops = clamp(shopOps.operatingShops);
  world.idleShops = clamp(shopOps.idleShops);
  world.commerceLaborDemand = clamp(shopOps.commerceLaborDemand);
  world.availableCommerceLabor = clamp(availableCommerceLabor);
  world.institutionWorkers = clamp(institutionWorkers);
  world.unemployed = clamp(unemployed);
  world.unemploymentRate = unemploymentRate;
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
    unemploymentEffectTier: world.unemploymentEffectTier,
  };
}
