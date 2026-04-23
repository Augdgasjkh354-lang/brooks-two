// Society satisfaction module

export function clampPercentIndex(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
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
  const effects = getLiteracyEffects(world);

  world.policyExecutionEfficiency = effects.policyExecutionEfficiency;
  world.stabilityPenaltyLiteracyReduction = effects.stabilityPenaltyReduction;
  world.textileOutputLiteracyBonus = effects.textileOutputBonus;
  world.landReclaimEfficiency = 1 + effects.landReclaimEfficiencyBonus;
  world.farmerLiteracyEfficiencyBonus = effects.farmerEfficiencyBonus;
  world.merchantLiteracyEfficiencyBonus = effects.merchantGDPMultiplierBonus;

  return effects;
}

export function calculateClassSatisfaction(world) {
  const saltAffordability = (world.saltPrice ?? 4) / 4.0;
  const clothAffordability = (world.clothPrice ?? 2) / 2.0;
  const grainSurplus = world.grainSurplus ?? 0;
  const purchasingPower = world.purchasingPower ?? 100;

  let farmerSatisfaction = 70;
  if ((world.agriculturalTaxRate ?? 0) > 0.5) farmerSatisfaction -= 15;
  if ((world.inflationRate ?? 0) >= 0.15) farmerSatisfaction -= 10;
  if ((world.grainTreasury ?? 0) < (world.totalPopulation ?? 0) * 1) farmerSatisfaction -= 20;
  if ((world.taxGrainRatio ?? 1) < 0.5) farmerSatisfaction -= 10;

  if (saltAffordability > 2.0) {
    farmerSatisfaction -= 25;
  } else if (saltAffordability > 1.5) {
    farmerSatisfaction -= 15;
  }
  if (clothAffordability > 1.5) farmerSatisfaction -= 10;
  if (grainSurplus < 0) farmerSatisfaction -= 20;

  let merchantSatisfaction = 70;
  if ((world.inflationRate ?? 0) >= 0.15) merchantSatisfaction -= 20;
  if ((world.inflationRate ?? 0) >= 0.3) merchantSatisfaction -= 20;
  if ((world.demandSaturation ?? 0) > 1.5) merchantSatisfaction -= 10;
  if ((world.stabilityIndex ?? 80) < 50) merchantSatisfaction -= 15;
  if ((world.commerceActivityBonus ?? 1) > 1.0) merchantSatisfaction += 10;

  if ((world.saltPrice ?? 4) > 5.0) merchantSatisfaction += 10;
  if ((world.clothPrice ?? 2) > 3.0) merchantSatisfaction += 10;
  if (purchasingPower < 50) merchantSatisfaction -= 15;

  let officialSatisfaction = 70;
  if ((world.salaryGrainRatio ?? 1) < 0.5 && (world.inflationRate ?? 0) >= 0.15)
    officialSatisfaction -= 20;
  if ((world.salaryGrainRatio ?? 1) < 0.3 && (world.inflationRate ?? 0) >= 0.05)
    officialSatisfaction -= 15;
  if ((world.stabilityIndex ?? 80) < 50) officialSatisfaction -= 10;

  if (purchasingPower < 50) officialSatisfaction -= 10;
  if (grainSurplus < 0) officialSatisfaction -= 15;

  let landlordSatisfaction = 70;
  if ((world.inflationRate ?? 0) >= 0.15) landlordSatisfaction -= 15;
  if ((world.grainPrice ?? 1) < 0.8) landlordSatisfaction -= 10;
  if ((world.stabilityIndex ?? 80) < 50) landlordSatisfaction -= 10;
  if ((world.farmlandAreaMu ?? 0) > 40000) landlordSatisfaction += 10;

  if (grainSurplus < 0) landlordSatisfaction += 10;
  if (saltAffordability > 2.0) landlordSatisfaction -= 5;

  return {
    farmerSatisfaction: clampPercentIndex(farmerSatisfaction),
    merchantSatisfaction: clampPercentIndex(merchantSatisfaction),
    officialSatisfaction: clampPercentIndex(officialSatisfaction),
    landlordSatisfaction: clampPercentIndex(landlordSatisfaction),
  };
}
