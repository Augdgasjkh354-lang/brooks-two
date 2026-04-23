// Society satisfaction module

export function clampPercentIndex(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

