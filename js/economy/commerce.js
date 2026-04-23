// Commerce module: commerce and demand saturation

export const SHOP_BUILD_COST_GRAIN = 1500000;

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
