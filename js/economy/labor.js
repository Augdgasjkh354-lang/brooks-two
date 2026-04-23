// Labor module: labor allocation and shared clamps

export function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

export function calculateLaborAllocation(world) {
  const requiredFarmingLabor = world.farmlandAreaMu / 10;
  const farmingLaborAllocated = Math.min(world.laborForce, requiredFarmingLabor);

  const remainingAfterFarming = Math.max(0, world.laborForce - farmingLaborAllocated);
  const saltMineLaborRequired = Math.max(0, world.saltMineWorkers ?? 0);
  const saltMineLaborAllocated = Math.min(remainingAfterFarming, saltMineLaborRequired);

  const remainingAfterSalt = Math.max(0, remainingAfterFarming - saltMineLaborAllocated);
  const hempLaborRequired = Math.max(0, (world.hempLandMu ?? 0) / 10);
  const hempLaborAllocated = Math.min(remainingAfterSalt, hempLaborRequired);

  const remainingAfterHemp = Math.max(0, remainingAfterSalt - hempLaborAllocated);
  const mulberryLaborRequired = Math.max(0, (world.mulberryLandMu ?? 0) / 5);
  const mulberryLaborAllocated = Math.min(remainingAfterHemp, mulberryLaborRequired);

  const remainingAfterMulberry = Math.max(0, remainingAfterHemp - mulberryLaborAllocated);
  const commerceLaborDemand = (world.shopCount ?? 0) * 5;
  const laborAssignedCommerce = Math.min(remainingAfterMulberry, commerceLaborDemand);

  const idleLabor = Math.max(0, remainingAfterMulberry - laborAssignedCommerce);
  const farmEfficiency =
    requiredFarmingLabor > 0 ? clampRatio(farmingLaborAllocated / requiredFarmingLabor) : 1;
  const hempEfficiency = hempLaborRequired > 0 ? clampRatio(hempLaborAllocated / hempLaborRequired) : 1;
  const mulberryEfficiency =
    mulberryLaborRequired > 0 ? clampRatio(mulberryLaborAllocated / mulberryLaborRequired) : 1;

  world.farmingLaborRequired = clamp(requiredFarmingLabor);
  world.farmingLaborAllocated = clamp(farmingLaborAllocated);
  world.hempLaborRequired = clamp(hempLaborRequired);
  world.mulberryLaborRequired = clamp(mulberryLaborRequired);
  world.hempLaborAllocated = clamp(hempLaborAllocated);
  world.mulberryLaborAllocated = clamp(mulberryLaborAllocated);
  world.laborAssignedCommerce = clamp(laborAssignedCommerce);
  world.idleLabor = clamp(idleLabor);
  world.farmEfficiency = farmEfficiency;
  world.hempEfficiency = hempEfficiency;
  world.mulberryEfficiency = mulberryEfficiency;
  world.landUtilizationPercent = farmEfficiency * 100;

  return {
    farmEfficiency,
    hempEfficiency,
    mulberryEfficiency,
  };
}

