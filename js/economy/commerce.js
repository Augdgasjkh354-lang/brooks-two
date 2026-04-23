// Commerce module: commerce and demand saturation

export const SHOP_BUILD_COST_GRAIN = 1500000;

export function routeShopConstructionIncome(world, totalCost) {
  const safeCost = Math.max(0, Number(totalCost ?? 0));
  const farmerShare = safeCost * 0.8;
  const merchantShare = safeCost - farmerShare;

  world.farmerIncomePool = Math.max(0, Number(world.farmerIncomePool ?? 0) + farmerShare);
  world.merchantIncomePool = Math.max(0, Number(world.merchantIncomePool ?? 0) + merchantShare);

  return {
    farmerShare,
    merchantShare,
    totalCost: safeCost,
  };
}

export function getCommerceActivityBonus(world) {
  if (!world?.grainCouponsUnlocked) return { circulationRatio: 0, commerceActivityBonus: 1.0 };

  const totalPopulation = Math.max(1, world.totalPopulation ?? 0);
  const circulationRatio = Math.max(0, (world.couponCirculating ?? 0) / totalPopulation);

  if (circulationRatio >= 2.0) {
    return { circulationRatio, commerceActivityBonus: 1.2 };
  }
  if (circulationRatio >= 1.0) {
    return { circulationRatio, commerceActivityBonus: 1.0 };
  }
  if (circulationRatio >= 0.5) {
    return { circulationRatio, commerceActivityBonus: 0.85 };
  }

  return { circulationRatio, commerceActivityBonus: 0.7 };
}
