function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export function updateEconomy(world) {
  const grainOutput = clamp(world.farmlandAreaMu * world.grainYieldPerMu);
  const agriculturalTax = clamp(grainOutput * world.agriculturalTaxRate);

  world.grainTreasury = clamp(world.grainTreasury + agriculturalTax);
  world.gdpEstimate = clamp(grainOutput * 1.2);

  return {
    grainOutput,
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
