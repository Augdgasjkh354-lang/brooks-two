// Commerce module: commerce, demand saturation, and moneylender system

export const SHOP_BUILD_COST_GRAIN = 1500000;
export const DEFAULT_MONEYLENDER_LICENSE_FEE = 5000000;
export const DEFAULT_SCHOOL_LICENSE_FEE = 2000000;

function clampMoney(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function clampPercent(value, min = 0, max = 1) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}


export function calculateGdpPerCapita(world, gdpOverride = null) {
  const totalPopulation = Math.max(1, Number(world?.totalPopulation ?? 0));
  const sourceGdp =
    gdpOverride == null
      ? Number(world?.agricultureGDP ?? 0) + Number(world?.commerceGDP ?? 0) + Number(world?.constructionGDP ?? 0)
      : Number(gdpOverride ?? 0);
  const safeGdp = Math.max(0, Number.isFinite(sourceGdp) ? sourceGdp : 0);
  const gdpPerCapita = safeGdp / totalPopulation;
  if (world) world.gdpPerCapita = gdpPerCapita;
  return gdpPerCapita;
}

export function routeShopConstructionIncome(world, totalCost) {
  const safeCost = clampMoney(totalCost);
  const farmerShare = safeCost * 0.8;
  const merchantShare = safeCost - farmerShare;

  world.farmerIncomePool = clampMoney(world.farmerIncomePool) + farmerShare;
  world.merchantIncomePool = clampMoney(world.merchantIncomePool) + merchantShare;

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


export function getMerchantLiteracyMultiplier(world) {
  const directBonus = Number(world?.merchantLiteracyEfficiencyBonus ?? 0);
  if (Number.isFinite(directBonus) && directBonus > 0) {
    return 1 + Math.min(0.1, Math.max(0, directBonus));
  }

  const literacy = Math.max(0, Math.min(1, Number(world?.merchantLiteracy ?? 0)));
  const step = Math.floor((literacy * 100) / 10);
  const bonus = Math.min(step * 0.02, 0.1);
  return 1 + bonus;
}

export function isMoneylenderSystemUnlocked(world) {
  return Boolean(world?.techBonuses?.lendingSystem);
}

export function canUseMoneylenderSystem(world) {
  return (
    isMoneylenderSystemUnlocked(world) &&
    Boolean(world?.techBonuses?.bureaucracyUnlocked) &&
    Number(world?.shopCount ?? 0) >= 10
  );
}

export function syncMoneylenderCaps(world) {
  world.licenseFee = Math.max(0, Math.floor(Number(world.licenseFee ?? DEFAULT_MONEYLENDER_LICENSE_FEE)));
  world.moneylenderTaxRate = clampPercent(world.moneylenderTaxRate ?? 0.01, 0, 0.2);

  const maxAllowed = Math.max(0, Math.floor(Number(world.shopCount ?? 0)));
  const approved = Math.max(0, Math.floor(Number(world.approvedMoneylenders ?? 0)));
  world.approvedMoneylenders = Math.min(approved, maxAllowed);
  world.moneylenderShops = world.approvedMoneylenders;
  world.lendingPoolSize = clampMoney(world.moneylenderShops * 10000000);

  return {
    maxAllowed,
    approved: world.approvedMoneylenders,
    lendingPoolSize: world.lendingPoolSize,
  };
}

export function approveMoneylenderLicenses(world, targetApproved) {
  if (!canUseMoneylenderSystem(world)) {
    return { success: false, reason: 'Moneylender system is not available yet.' };
  }

  const capInfo = syncMoneylenderCaps(world);
  const target = Math.max(0, Math.min(capInfo.maxAllowed, Math.floor(Number(targetApproved ?? 0))));
  if (target === world.approvedMoneylenders) {
    return { success: true, added: 0, totalApproved: world.approvedMoneylenders, totalCost: 0 };
  }

  if (target < world.approvedMoneylenders) {
    world.approvedMoneylenders = target;
    world.moneylenderShops = target;
    world.lendingPoolSize = clampMoney(target * 10000000);
    return {
      success: true,
      added: 0,
      removed: true,
      totalApproved: target,
      totalCost: 0,
    };
  }

  const toAdd = target - world.approvedMoneylenders;
  const totalCost = toAdd * clampMoney(world.licenseFee);

  if (world.grainCouponsUnlocked) {
    if (clampMoney(world.couponTreasury) < totalCost) {
      return { success: false, reason: `Not enough coupon treasury (need ${totalCost}).` };
    }
    world.couponTreasury = clampMoney(world.couponTreasury) - totalCost;
  } else {
    if (clampMoney(world.grainTreasury) < totalCost) {
      return { success: false, reason: `Not enough grain treasury (need ${totalCost}).` };
    }
    world.grainTreasury = clampMoney(world.grainTreasury) - totalCost;
  }

  world.approvedMoneylenders = target;
  world.moneylenderShops = target;
  world.lendingPoolSize = clampMoney(target * 10000000);

  return {
    success: true,
    added: toAdd,
    totalApproved: target,
    totalCost,
    paidCurrency: world.grainCouponsUnlocked ? 'coupon' : 'grain',
  };
}

function canLicenseCommercialPrimary(world) {
  return Boolean(world?.techBonuses?.bureaucracyUnlocked);
}

function canLicenseCommercialSecondary(world) {
  return Boolean(world?.techBonuses?.scholarClass);
}

export function approveCommercialSchoolLicenses(world, schoolType, targetCount) {
  const isPrimary = schoolType === 'primary';
  const unlockOk = isPrimary ? canLicenseCommercialPrimary(world) : canLicenseCommercialSecondary(world);
  if (!unlockOk) {
    return { success: false, reason: 'Commercial school type not unlocked yet.' };
  }

  const key = isPrimary ? 'commercialPrimarySchools' : 'commercialSecondarySchools';
  const currentCount = Math.max(0, Math.floor(Number(world[key] ?? 0)));
  const target = Math.max(0, Math.floor(Number(targetCount ?? 0)));
  const fee = Math.max(0, Math.floor(Number(world.schoolLicenseFee ?? DEFAULT_SCHOOL_LICENSE_FEE)));

  if (target <= currentCount) {
    world[key] = target;
    return {
      success: true,
      added: 0,
      removed: target < currentCount,
      totalApproved: target,
      totalCost: 0,
      schoolType,
    };
  }

  const toAdd = target - currentCount;
  const totalCost = toAdd * fee;

  if (world.grainCouponsUnlocked) {
    if (clampMoney(world.couponTreasury) < totalCost) {
      return { success: false, reason: `Not enough coupon treasury (need ${totalCost}).` };
    }
    world.couponTreasury = clampMoney(world.couponTreasury) - totalCost;
  } else {
    if (clampMoney(world.grainTreasury) < totalCost) {
      return { success: false, reason: `Not enough grain treasury (need ${totalCost}).` };
    }
    world.grainTreasury = clampMoney(world.grainTreasury) - totalCost;
  }

  world[key] = target;

  return {
    success: true,
    added: toAdd,
    totalApproved: target,
    totalCost,
    paidCurrency: world.grainCouponsUnlocked ? 'coupon' : 'grain',
    schoolType,
  };
}

export function processCivilianLending(world) {
  syncMoneylenderCaps(world);
  if ((world.moneylenderShops ?? 0) <= 0) {
    world.moneylenderGDP = 0;
    return { civilianLending: 0, civilianInterestIncome: 0, openedShops: 0 };
  }

  const lendingPoolSize = clampMoney(world.lendingPoolSize);
  const civilianLending = lendingPoolSize * 0.3;
  const civilianInterestIncome = civilianLending * 0.08;

  world.civilianLendingAccumulator =
    clampMoney(world.civilianLendingAccumulator) + civilianLending;

  let openedShops = 0;
  while (world.civilianLendingAccumulator >= 50000000) {
    world.civilianLendingAccumulator -= 50000000;
    world.shopCount = Math.max(0, Math.floor(Number(world.shopCount ?? 0)) + 1);
    openedShops += 1;
  }

  return {
    civilianLending,
    civilianInterestIncome,
    openedShops,
  };
}

export function finalizeMoneylenderYear(world, governmentInterestIncome = 0) {
  syncMoneylenderCaps(world);
  const civilian = processCivilianLending(world);

  const totalInterestIncome = clampMoney(civilian.civilianInterestIncome + governmentInterestIncome);
  const baseMoneylenderGDP = clampMoney((world.moneylenderShops ?? 0) * 500);
  const moneylenderEfficiencyBonus = Math.max(0, Number(world.moneylenderEfficiencyBonus ?? 0));
  const moneylenderEfficiencyMultiplier = 1 + moneylenderEfficiencyBonus;
  const preTaxGDP = baseMoneylenderGDP + totalInterestIncome;
  const adjustedPreTaxGDP = preTaxGDP * moneylenderEfficiencyMultiplier;
  const taxRate = clampPercent(world.moneylenderTaxRate ?? 0.01, 0, 0.2);
  const moneylenderTax = adjustedPreTaxGDP * taxRate;

  world.moneylenderGDP = adjustedPreTaxGDP;

  const merchantShare = totalInterestIncome * 0.5;
  const treasuryShare = totalInterestIncome * 0.5 + moneylenderTax;
  world.merchantIncomePool = clampMoney(world.merchantIncomePool) + merchantShare;

  if (world.grainCouponsUnlocked) {
    world.couponTreasury = clampMoney(world.couponTreasury) + treasuryShare;
  } else {
    world.grainTreasury = clampMoney(world.grainTreasury) + treasuryShare;
  }

  return {
    ...civilian,
    totalInterestIncome,
    baseMoneylenderGDP,
    preTaxGDP: adjustedPreTaxGDP,
    moneylenderTax,
    merchantShare,
    treasuryShare,
    moneylenderEfficiencyMultiplier,
  };
}
