// Commerce module: commerce, demand saturation, and moneylender system

import {
  SHOP_COST,
  MONEYLENDER_LICENSE_FEE,
  SCHOOL_LICENSE_FEE,
  MONEYLENDER_DEFAULT_TAX,
  SHOP_GDP_PER_UNIT,
  MERCHANT_POP_INIT_LITERACY,
} from '../config/constants.js';
import { transfer } from './transfer.js';

export const SHOP_BUILD_COST_GRAIN = SHOP_COST;
export const DEFAULT_MONEYLENDER_LICENSE_FEE = MONEYLENDER_LICENSE_FEE;
export const DEFAULT_SCHOOL_LICENSE_FEE = SCHOOL_LICENSE_FEE;
export const SHOP_WORKERS_PER_UNIT = 4;
export const SHOP_MANAGERS_PER_UNIT = 1;

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


function getFiscal(world) {
  return world?.__fiscal ?? world?.fiscal ?? world;
}

function getMonetary(world) {
  return world?.__monetary ?? world?.monetary ?? world;
}

function ensureLedger(world) {
  if (!world) return null;
  if (!world.ledger) world.ledger = {};
  const keys = ['moneylenderTaxRevenue', 'merchantGrossIncome', 'merchantTaxPaid', 'subsidyCost'];
  keys.forEach((key) => {
    world.ledger[key] = Math.max(0, Number(world.ledger[key] ?? 0));
  });
  return world.ledger;
}

export function calculateShopOperationState(world, availableCommerceLabor = 0) {
  const safeShopCount = Math.max(0, Math.floor(Number(world?.shopCount ?? 0)));
  const safeMerchantCount = Math.max(0, Math.floor(Number(world?.merchantCount ?? 0)));
  const fallbackLabor = Number(
    world?.commerceLaborAllocated ??
      world?.laborAssignedCommerce ??
      world?.availableCommerceLabor ??
      0
  );
  const safeAvailableLabor = Math.max(0, Math.floor(Number(availableCommerceLabor ?? fallbackLabor)));

  const laborLimitedShops = Math.floor(safeAvailableLabor / SHOP_WORKERS_PER_UNIT);
  const operatingShops = Math.min(safeShopCount, safeMerchantCount, laborLimitedShops);
  const idleShops = Math.max(0, safeShopCount - operatingShops);
  const commerceLaborDemand = operatingShops * SHOP_WORKERS_PER_UNIT;

  return {
    operatingShops,
    idleShops,
    commerceLaborDemand,
    workerLaborPerShop: SHOP_WORKERS_PER_UNIT,
    managerLaborPerShop: SHOP_MANAGERS_PER_UNIT,
  };
}


export function calculateGdpPerCapita(world, gdpOverride = null) {
  const totalPopulation = Math.max(1, Number(world?.totalPopulation ?? 0));
  const sourceGdp =
    gdpOverride == null
      ? Number(world?.agricultureGDP ?? 0) +
        Number(world?.commerceGDP ?? 0) +
        Number(world?.constructionGDP ?? 0) +
        Number(world?.governmentGDP ?? 0)
      : Number(gdpOverride ?? 0);
  const safeGdp = Math.max(0, Number.isFinite(sourceGdp) ? sourceGdp : 0);
  const gdpPerCapita = safeGdp / totalPopulation;
  if (world) getFiscal(world).gdpPerCapita = gdpPerCapita;
  return gdpPerCapita;
}

export function calculateProductionCommerceGDP(world, options = {}) {
  const operatingShops = Math.max(0, Number(options.operatingShops ?? world?.operatingShops ?? 0));
  const maxMarketDemand = Math.max(0, Number(options.maxMarketDemand ?? world?.maxMarketDemand ?? 0));
  const demandSaturation = Math.max(0, Number(options.demandSaturation ?? world?.demandSaturation ?? 0));
  const commerceActivityBonus = Math.max(0, Number(options.commerceActivityBonus ?? world?.commerceActivityBonus ?? 1));
  const tradeEfficiency =
    Math.max(0, Number(options.tradeEfficiency ?? world?.techBonuses?.tradeEfficiency ?? 0));

  const servedDemand = Math.min(operatingShops, maxMarketDemand > 0 ? maxMarketDemand : operatingShops);
  const demandEfficiency = operatingShops > 0 ? Math.max(0, servedDemand / operatingShops) : 1;
  const tradeMultiplier = 1 + tradeEfficiency;

  const commerceGDP =
    operatingShops *
    SHOP_GDP_PER_UNIT *
    demandEfficiency *
    commerceActivityBonus *
    tradeMultiplier;

  const moneylenderShops = Math.max(0, Number(world?.moneylenderShops ?? 0));
  const civilianLoanOutstanding = Math.max(0, Number(world?.civilianLoanOutstanding ?? 0));
  const moneylenderGDP = moneylenderShops * SHOP_GDP_PER_UNIT + civilianLoanOutstanding * 0.08;

  return {
    commerceGDP: clampMoney(commerceGDP),
    moneylenderGDP: clampMoney(moneylenderGDP),
    totalCommerceGDP: clampMoney(commerceGDP + moneylenderGDP),
    servedDemand: clampMoney(servedDemand),
    demandEfficiency: clampPercent(demandEfficiency, 0, 1),
    demandSaturation,
  };
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
  const circulationRatio = Math.max(0, (getMonetary(world).couponCirculating ?? 0) / totalPopulation);

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
  const bonus = Math.min(step * 0.02, MERCHANT_POP_INIT_LITERACY * 0.4);
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
  const monetary = getMonetary(world);
  const fiscal = getFiscal(world);
  monetary.licenseFee = Math.max(0, Math.floor(Number(monetary.licenseFee ?? DEFAULT_MONEYLENDER_LICENSE_FEE)));
  fiscal.moneylenderTaxRate = clampPercent(fiscal.moneylenderTaxRate ?? MONEYLENDER_DEFAULT_TAX, 0, 0.2);

  const maxAllowed = Math.max(0, Math.floor(Number(world.shopCount ?? 0)));
  const approved = Math.max(0, Math.floor(Number(monetary.approvedMoneylenders ?? 0)));
  monetary.approvedMoneylenders = Math.min(approved, maxAllowed);
  monetary.moneylenderShops = monetary.approvedMoneylenders;
  monetary.lendingPoolSize = clampMoney(monetary.moneylenderShops * 10000000);

  return {
    maxAllowed,
    approved: monetary.approvedMoneylenders,
    lendingPoolSize: monetary.lendingPoolSize,
  };
}

export function approveMoneylenderLicenses(world, targetApproved) {
  if (!canUseMoneylenderSystem(world)) {
    return { success: false, reason: 'Moneylender system is not available yet.' };
  }

  const capInfo = syncMoneylenderCaps(world);
  const target = Math.max(0, Math.min(capInfo.maxAllowed, Math.floor(Number(targetApproved ?? 0))));
  const monetary = getMonetary(world);

  if (target === monetary.approvedMoneylenders) {
    return { success: true, added: 0, totalApproved: monetary.approvedMoneylenders, totalCost: 0 };
  }

  if (target < monetary.approvedMoneylenders) {
    monetary.approvedMoneylenders = target;
    monetary.moneylenderShops = target;
    monetary.lendingPoolSize = clampMoney(target * 10000000);
    return {
      success: true,
      added: 0,
      removed: true,
      totalApproved: target,
      totalCost: 0,
    };
  }

  const toAdd = target - monetary.approvedMoneylenders;
  const totalCost = toAdd * clampMoney(monetary.licenseFee);

  if (world.grainCouponsUnlocked) {
    if (clampMoney(getMonetary(world).couponTreasury) < totalCost) {
      return { success: false, reason: `Not enough coupon treasury (need ${totalCost}).` };
    }
    getMonetary(world).couponTreasury = clampMoney(getMonetary(world).couponTreasury) - totalCost;
  } else {
    if (clampMoney(world.grainTreasury) < totalCost) {
      return { success: false, reason: `Not enough grain treasury (need ${totalCost}).` };
    }
    world.grainTreasury = clampMoney(world.grainTreasury) - totalCost;
  }

  monetary.approvedMoneylenders = target;
  monetary.moneylenderShops = target;
  monetary.lendingPoolSize = clampMoney(target * 10000000);

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
    if (clampMoney(getMonetary(world).couponTreasury) < totalCost) {
      return { success: false, reason: `Not enough coupon treasury (need ${totalCost}).` };
    }
    getMonetary(world).couponTreasury = clampMoney(getMonetary(world).couponTreasury) - totalCost;
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

  const monetary = getMonetary(world);
  const fiscal = getFiscal(world);
  const lendingPoolSize = clampMoney(monetary.lendingPoolSize);
  const governmentDebt = clampMoney(monetary.governmentDebt ?? 0);
  const currentOutstanding = clampMoney(monetary.civilianLoanOutstanding ?? 0);

  monetary.lendingPoolAvailable = Math.max(0, lendingPoolSize - governmentDebt - currentOutstanding);

  if ((monetary.moneylenderShops ?? 0) <= 0) {
    monetary.moneylenderGDP = 0;
    monetary.civilianLoanOutstanding = currentOutstanding;
    monetary.civilianInvestmentProgress = clampMoney(monetary.civilianInvestmentProgress ?? 0);
    world.civilianLendingAccumulator = monetary.civilianLoanOutstanding;
    return { civilianLending: 0, civilianInterestIncome: 0, annualRepayment: 0, openedShops: 0 };
  }

  const civilianLending = monetary.lendingPoolAvailable * 0.3;
  monetary.civilianLoanOutstanding = currentOutstanding + civilianLending;
  monetary.civilianInvestmentProgress = clampMoney(monetary.civilianInvestmentProgress ?? 0) + civilianLending;
  monetary.lendingPoolAvailable = Math.max(0, monetary.lendingPoolAvailable - civilianLending);

  let openedShops = 0;
  while (monetary.civilianInvestmentProgress >= 50000000) {
    monetary.civilianInvestmentProgress -= 50000000;
    world.shopCount = Math.max(0, Math.floor(Number(world.shopCount ?? 0)) + 1);
    openedShops += 1;
  }

  const annualRepayment = monetary.civilianLoanOutstanding * 0.1;
  monetary.civilianLoanOutstanding = Math.max(0, monetary.civilianLoanOutstanding - annualRepayment);
  monetary.lendingPoolAvailable = Math.min(
    lendingPoolSize,
    Math.max(0, monetary.lendingPoolAvailable + annualRepayment)
  );

  const civilianInterestIncome = monetary.civilianLoanOutstanding * 0.08;
  world.civilianLendingAccumulator = monetary.civilianLoanOutstanding;

  return {
    civilianLending,
    civilianInterestIncome,
    annualRepayment,
    openedShops,
  };
}

export function finalizeMoneylenderYear(world, governmentInterestIncome = 0) {
  const ledger = ensureLedger(world);
  syncMoneylenderCaps(world);
  const civilian = processCivilianLending(world);

  const totalInterestIncome = clampMoney(civilian.civilianInterestIncome + governmentInterestIncome);
  const monetary = getMonetary(world);
  const fiscal = getFiscal(world);
  const baseMoneylenderGDP = clampMoney((monetary.moneylenderShops ?? 0) * SHOP_GDP_PER_UNIT);
  const moneylenderEfficiencyBonus = Math.max(0, Number(world.moneylenderEfficiencyBonus ?? 0));
  const moneylenderEfficiencyMultiplier = 1 + moneylenderEfficiencyBonus;
  const preTaxGDP = baseMoneylenderGDP + totalInterestIncome;
  const adjustedPreTaxGDP = preTaxGDP * moneylenderEfficiencyMultiplier;
  const taxRate = clampPercent(fiscal.moneylenderTaxRate ?? MONEYLENDER_DEFAULT_TAX, 0, 0.2);
  const moneylenderTax = adjustedPreTaxGDP * taxRate;

  monetary.moneylenderGDP = adjustedPreTaxGDP;

  const merchantShare = totalInterestIncome * 0.5;
  const treasuryShare = totalInterestIncome * 0.5 + moneylenderTax;
  world.merchantIncomePool = clampMoney(world.merchantIncomePool) + merchantShare;

  if (world.grainCouponsUnlocked) {
    monetary.couponTreasury = clampMoney(monetary.couponTreasury) + treasuryShare;
  } else {
    world.grainTreasury = clampMoney(world.grainTreasury) + treasuryShare;
  }

  if (ledger) {
    ledger.moneylenderTaxRevenue += Math.max(0, Number(moneylenderTax ?? 0));
    ledger.merchantTaxPaid += Math.max(0, Number(moneylenderTax ?? 0));
    ledger.merchantGrossIncome += Math.max(0, Number(merchantShare ?? 0));
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


export function applyPoliceCommerceEffects(world, policeEffects) {
  if (!world || !policeEffects) return;
  const multiplier = Math.max(0, Number(policeEffects.commerceMultiplier ?? 1));
  world.commerceGDP = clampMoney(Number(world.commerceGDP ?? 0) * multiplier);
}

export function applyCourtCommerceEffects(world, courtEffects) {
  if (!world || !courtEffects) return;
  const mult = Math.max(0, Number(courtEffects.commerceMultiplier ?? 1));
  world.commerceGDP = clampMoney(Number(world.commerceGDP ?? 0) * mult);
}

function collectMerchantTaxValue(world, taxValue, reason) {
  const requiredValue = clampMoney(taxValue);
  if (requiredValue <= 0) {
    return {
      paidValue: 0,
      couponPaid: 0,
      grainPaid: 0,
      remainingValue: 0,
    };
  }

  let remainingValue = requiredValue;
  let couponPaid = 0;
  let grainPaid = 0;

  const couponAvailable = clampMoney(world?.privateSector?.merchantCoupons ?? 0);
  const couponToPay = Math.min(remainingValue, couponAvailable);
  if (couponToPay > 0) {
    const ok = transfer({
      from: 'private.merchant.coupon',
      to: 'government.coupon',
      asset: 'coupon',
      amount: couponToPay,
      gdpTreatment: 'transfer',
      reason,
    }, world);
    if (ok) {
      couponPaid = couponToPay;
      remainingValue -= couponToPay;
    }
  }

  if (remainingValue > 0) {
    const grainPrice = Math.max(0.01, Number(world?.grainPrice ?? 1));
    const merchantGrain = clampMoney(world?.privateSector?.merchantGrain ?? 0);
    const grainRequired = remainingValue / grainPrice;
    const grainToPay = Math.min(grainRequired, merchantGrain);

    if (grainToPay > 0) {
      const ok = transfer({
        from: 'private.merchant.grain',
        to: 'government.grain',
        asset: 'grain',
        amount: grainToPay,
        gdpTreatment: 'transfer',
        reason,
      }, world);
      if (ok) {
        grainPaid = grainToPay;
        remainingValue = Math.max(0, remainingValue - grainToPay * grainPrice);
      }
    }
  }

  const paidValue = Math.max(0, requiredValue - remainingValue);
  return {
    paidValue,
    couponPaid,
    grainPaid,
    remainingValue,
  };
}

export function applyCommerceTax(world) {
  if (!world) return { revenue: 0, taxRate: 0 };

  const fiscal = getFiscal(world);
  const taxRate = clampPercent(Number(fiscal.commerceTaxRate ?? 0), 0, 0.3);
  fiscal.commerceTaxRate = taxRate;

  let taxableGdp = Math.max(0, Number(world.commerceGDP ?? 0));
  if (taxRate > 0.2) {
    taxableGdp *= 0.9;
    world.commerceGDP = taxableGdp;
  }

  const previousArrears = clampMoney(Number(world.merchantTaxArrears ?? 0));
  const arrearsCollection = collectMerchantTaxValue(world, previousArrears, 'commerce_tax_arrears');
  const remainingArrears = clampMoney(previousArrears - arrearsCollection.paidValue);

  const taxAmount = taxableGdp * taxRate;
  const currentCollection = collectMerchantTaxValue(world, taxAmount, 'commerce_tax');
  const newArrears = clampMoney(taxAmount - currentCollection.paidValue);

  const outstandingArrears = clampMoney(remainingArrears + newArrears);
  world.merchantTaxArrears = outstandingArrears;
  world.taxArrearsAccumulated = clampMoney(Number(world.taxArrearsAccumulated ?? 0) + newArrears);

  const taxCollected = clampMoney(arrearsCollection.paidValue + currentCollection.paidValue);
  world.commerceTaxRevenue = taxCollected;

  if (outstandingArrears > 0) {
    world.taxBureauEfficiency = Math.max(0, Number(world.taxBureauEfficiency ?? 0) - 10);
    world.merchantLifeQuality = Math.max(0, Number(world.merchantLifeQuality ?? 0) - 5);
    if (Array.isArray(world.yearLog)) {
      world.yearLog.push('商业税收欠缴，税务局压力增加');
    }
  }

  if (Number(world.taxArrearsAccumulated ?? 0) > taxableGdp * 0.5) {
    world.merchantSatisfaction = Math.max(0, Number(world.merchantSatisfaction ?? 0) - 10);
    world.courtEfficiency = Math.max(0, Number(world.courtEfficiency ?? 0) - 5);
    if (Array.isArray(world.yearLog)) {
      world.yearLog.push('累计欠税严重，影响营商环境');
    }
  }

  return {
    revenue: taxCollected,
    taxRate,
    taxableGdp,
    arrearsPaid: arrearsCollection.paidValue,
    currentTaxPaid: currentCollection.paidValue,
    merchantTaxArrears: outstandingArrears,
  };
}

export function applyTradeBureauCommerceEffects(world, tradeEffects) {
  if (!world || !tradeEffects) return;

  let commerce = clampMoney(world.commerceGDP ?? 0);

  if (world.tradeMonopolyGranted) {
    commerce *= 1.2;
  }

  if ((tradeEffects.efficiency ?? 0) < 30) {
    commerce *= 0.95;
  }

  world.commerceGDP = clampMoney(commerce);
}

export function applyTradePolicySettings(world) {
  const ledger = ensureLedger(world);
  if (!world) {
    return {
      subsidyRate: 0,
      subsidyCost: 0,
      clothQuotaCapRatio: 1,
      merchantLifeQualityDelta: 0,
    };
  }

  const fiscal = getFiscal(world);
  const monetary = getMonetary(world);
  const subsidyRate = clampPercent(Number(fiscal.subsidyRate ?? 0), 0, 0.2);
  fiscal.subsidyRate = subsidyRate;

  const protectLocalCloth = Boolean(world.protectLocalCloth);
  world.protectLocalCloth = protectLocalCloth;
  const clothQuotaCapRatio = protectLocalCloth ? 0.3 : 1;
  world.tradeProtectionQuotaCapRatio = clothQuotaCapRatio;

  const subsidyBase = Math.max(0, Number(monetary.actualSaltImport ?? 0) * Number(monetary.saltPrice ?? 0)) +
    Math.max(0, Number(world.previousClothImportReceived ?? 0) * Number(monetary.clothPrice ?? 0));
  const subsidyCost = subsidyBase * subsidyRate;
  world.tradeSubsidyCost = subsidyCost;

  let merchantLifeQualityDelta = 0;
  if (protectLocalCloth) merchantLifeQualityDelta += 5;
  if (subsidyRate > 0) merchantLifeQualityDelta += 5;
  if (world.tradeMonopolyGranted) merchantLifeQualityDelta -= 10;

  if (merchantLifeQualityDelta !== 0) {
    world.merchantEventModifier = Number(world.merchantEventModifier ?? 0) + merchantLifeQualityDelta;
  }

  if (subsidyCost > 0) {
    if (world.grainCouponsUnlocked) {
      const couponAvailable = clampMoney(monetary.couponTreasury ?? 0);
      const fromCoupon = Math.min(couponAvailable, subsidyCost);
      monetary.couponTreasury = couponAvailable - fromCoupon;
      world.grainTreasury = Math.max(0, Number(world.grainTreasury ?? 0) - (subsidyCost - fromCoupon));
    } else {
      world.grainTreasury = Math.max(0, Number(world.grainTreasury ?? 0) - subsidyCost);
    }
  }

  if (ledger) {
    ledger.subsidyCost += Math.max(0, Number(subsidyCost ?? 0));
  }

  return {
    subsidyRate,
    subsidyCost,
    clothQuotaCapRatio,
    merchantLifeQualityDelta,
  };
}
