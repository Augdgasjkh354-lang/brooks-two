function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

function yieldFromAge(age) {
  if (age <= 0) return 0;
  if (age === 1) return 100;
  if (age === 2) return 200;
  return 500;
}

export function getFarmlandTotals(state) {
  const baseLand = state.agriculture.baseFarmlandMu;
  const reclaimedLand = state.agriculture.reclaimedParcels.reduce((sum, parcel) => sum + parcel.areaMu, 0);
  const totalFarmland = baseLand + reclaimedLand;

  return { baseLand, reclaimedLand, totalFarmland };
}

export function getRequiredFarmLabor(totalFarmlandMu) {
  return Math.ceil(totalFarmlandMu / 10);
}

export function runAgricultureYear(state, agricultureLabor) {
  const { baseLand, totalFarmland } = getFarmlandTotals(state);

  if (totalFarmland <= 0) {
    return {
      usedLandMu: 0,
      unusedLandMu: 0,
      requiredLabor: 0,
      grainOutput: 0,
      agriculturalTax: 0,
    };
  }

  const usedLandMu = Math.min(totalFarmland, agricultureLabor * 10);
  const useRatio = totalFarmland === 0 ? 0 : usedLandMu / totalFarmland;

  const basePotential = baseLand * state.world.grainYieldPerMu;
  const reclaimedPotential = state.agriculture.reclaimedParcels.reduce(
    (sum, parcel) => sum + parcel.areaMu * yieldFromAge(parcel.age),
    0
  );

  const totalPotential = basePotential + reclaimedPotential;
  const grainOutput = clamp(totalPotential * useRatio);
  const agriculturalTax = clamp(grainOutput * state.world.agriculturalTaxRate);

  state.world.grainTreasury = clamp(state.world.grainTreasury + agriculturalTax);

  return {
    usedLandMu,
    unusedLandMu: totalFarmland - usedLandMu,
    requiredLabor: getRequiredFarmLabor(totalFarmland),
    grainOutput,
    agriculturalTax,
  };
}

export function ageReclaimedParcels(state) {
  state.agriculture.reclaimedParcels.forEach((parcel) => {
    parcel.age += 1;
  });
}
