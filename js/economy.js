function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function calculateLaborAllocation(world) {
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

  return farmEfficiency;
}

export function updateEconomy(world, options = {}) {
  const { collectTax = true } = options;

export function updateEconomy(world) {
  const farmEfficiency = calculateLaborAllocation(world);

  const baseYield = world.baseGrainYieldPerMu ?? world.grainYieldPerMu;
  world.baseGrainYieldPerMu = clamp(baseYield);

  const potentialGrainOutput = clamp(world.farmlandAreaMu * world.baseGrainYieldPerMu);
  const grainOutput = clamp(potentialGrainOutput * farmEfficiency);
  const lostGrainOutput = clamp(potentialGrainOutput - grainOutput);
  const agriculturalTax = clamp(grainOutput * world.agriculturalTaxRate);

  world.grainYieldPerMu = clamp(world.baseGrainYieldPerMu * farmEfficiency);
  world.potentialGrainOutput = potentialGrainOutput;
  world.actualGrainOutput = grainOutput;
  world.lostGrainOutput = lostGrainOutput;
  world.lastAgriculturalTax = agriculturalTax;

  if (collectTax) {
    world.grainTreasury = clamp(world.grainTreasury + agriculturalTax);
    world.lastTaxCollectionYear = world.year;
  }


  if (collectTax) {
    world.grainTreasury = clamp(world.grainTreasury + agriculturalTax);
  }

  world.grainTreasury = clamp(world.grainTreasury + agriculturalTax);
  world.gdpEstimate = clamp(grainOutput * 1.2);

  return {
    grainOutput,
    potentialGrainOutput,
    lostGrainOutput,
    agriculturalTax,
  };
}

export function issueGrainCoupons(state, amount) {
  if (!state.systems.grainCouponsUnlocked) {
    return { success: false, reason: 'Grain coupons are not unlocked yet.' };
  }

  const issueAmount = clamp(amount);
  if (issueAmount <= 0) {
    return { success: false, reason: 'Issue amount must be greater than zero.' };
  }

  state.grainCoupons.totalIssued += issueAmount;
  state.grainCoupons.governmentReserves += issueAmount;

  const releaseToCirculation = clamp(issueAmount * 0.5);
  state.grainCoupons.governmentReserves -= releaseToCirculation;
  state.grainCoupons.circulating += releaseToCirculation;

  return {
    success: true,
    issueAmount,
    releaseToCirculation,
  };
}
