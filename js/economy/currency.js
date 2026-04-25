// Currency module: coupons, inflation, and government debt
import { clamp } from './labor.js';
import {
  COUPON_GRAIN_RATIO,
  INFLATION_THRESHOLD_LOW,
  INFLATION_THRESHOLD_MID,
  INFLATION_RATE_LOW,
  INFLATION_RATE_MID,
  INFLATION_RATE_HIGH,
} from '../config/constants.js';
import { transfer, mint, burn } from './transfer.js';

function clampMoney(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function clampIndex(value) {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}


function getMonetary(world) {
  return world?.__monetary ?? world?.monetary ?? world;
}

function getFiscal(world) {
  return world?.__fiscal ?? world?.fiscal ?? world;
}

function getPrivateSector(state) {
  return state?.privateSector ?? state?.world?.__privateSector ?? state?.world?.privateSector ?? null;
}

function ensureLedger(world) {
  if (!world) return null;
  if (!world.ledger) world.ledger = {};
  ['debtBorrowed', 'debtRepayment', 'debtInterest'].forEach((field) => {
    world.ledger[field] = Math.max(0, Number(world.ledger[field] ?? 0));
  });
  return world.ledger;
}


function getBorrowingRateByCredit(creditRating = 'B') {
  const rating = String(creditRating || 'B').toUpperCase();
  if (rating === 'A') return { coupon: 0.03, grain: 0.02 };
  if (rating === 'B') return { coupon: 0.05, grain: 0.03 };
  if (rating === 'C') return { coupon: 0.08, grain: 0.05 };
  return { coupon: Infinity, grain: Infinity };
}

export function getInflationState(world) {
  const monetary = getMonetary(world);

  if (!world?.grainCouponsUnlocked || (monetary.couponCirculating ?? 0) <= 0) {
    return {
      backingRatio: COUPON_GRAIN_RATIO,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: COUPON_GRAIN_RATIO,
    };
  }

  const couponCirculating = Math.max(0, monetary.couponCirculating ?? 0);
  const backingRatio =
    couponCirculating > 0 ? Math.max(0, (monetary.lockedGrainReserve ?? 0) / couponCirculating) : COUPON_GRAIN_RATIO;

  if (backingRatio >= COUPON_GRAIN_RATIO) {
    return {
      backingRatio,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: COUPON_GRAIN_RATIO,
    };
  }

  if (backingRatio >= INFLATION_THRESHOLD_LOW) {
    return {
      backingRatio,
      inflationRate: INFLATION_RATE_LOW,
      inflationStabilityPenalty: 5,
      inflationCommercePenaltyMultiplier: COUPON_GRAIN_RATIO,
    };
  }

  if (backingRatio >= INFLATION_THRESHOLD_MID) {
    return {
      backingRatio,
      inflationRate: INFLATION_RATE_MID,
      inflationStabilityPenalty: 15,
      inflationCommercePenaltyMultiplier: 0.9,
    };
  }

  return {
    backingRatio,
    inflationRate: INFLATION_RATE_HIGH,
    inflationStabilityPenalty: 25,
    inflationCommercePenaltyMultiplier: 0.7,
  };
}

export function getCouponDenominationBreakdown(issueAmount) {
  const units = [
    { label: '100斤', value: 10000 },
    { label: '50斤', value: 5000 },
    { label: '20斤', value: 2000 },
    { label: '10斤', value: 1000 },
    { label: '5斤', value: 500 },
    { label: '2斤', value: 200 },
    { label: '1斤', value: 100 },
    { label: '5两', value: 50 },
    { label: '1两', value: 10 },
    { label: '5钱', value: 5 },
    { label: '1钱', value: 1 },
  ];

  let remaining = clamp(issueAmount * 100);
  const breakdown = [];

  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      breakdown.push({
        label: unit.label,
        count,
      });
      remaining -= count * unit.value;
    }
  }

  return breakdown;
}

export function issueGrainCoupons(state, amount) {
  if (!state.systems.grainCouponsUnlocked) {
    return { success: false, reason: 'Grain coupons are not unlocked yet.' };
  }

  const issueAmount = clamp(amount);
  if (issueAmount <= 0) {
    return { success: false, reason: 'Issue amount must be greater than zero.' };
  }

  const privateSector = getPrivateSector(state);
  if (!privateSector) {
    return { success: false, reason: 'Private sector ledger is unavailable.' };
  }

  const maxIssuable = clamp(privateSector.farmerGrain ?? 0);
  if (issueAmount > maxIssuable) {
    return {
      success: false,
      reason: `Issue amount exceeds current farmer grain reserve (${maxIssuable}).`,
    };
  }

  const denominationBreakdown = getCouponDenominationBreakdown(issueAmount);

  const movedGrain = transfer({
    from: 'private.farmer.grain',
    to: 'monetary.locked',
    asset: 'grain',
    amount: issueAmount,
    gdpTreatment: 'none',
    reason: 'coupon_backing_purchase',
  }, state);
  if (!movedGrain) {
    return { success: false, reason: 'Insufficient farmer grain for coupon backing purchase.' };
  }

  const minted = mint({
    to: 'private.farmer.coupon',
    asset: 'coupon',
    amount: issueAmount,
    reason: 'coupon_issuance',
  }, state);

  if (!minted) {
    transfer({
      from: 'monetary.locked',
      to: 'private.farmer.grain',
      asset: 'grain',
      amount: issueAmount,
      gdpTreatment: 'none',
      reason: 'coupon_issue_rollback',
    }, state);
    return { success: false, reason: 'Coupon mint operation failed.' };
  }

  state.world.lastCouponIssueAmount = issueAmount;
  state.world.lastCouponDenominationBreakdown = denominationBreakdown;

  return {
    success: true,
    issueAmount,
    denominationBreakdown,
  };
}

export function redeemGrainCoupons(state, amount) {
  if (!state.systems.grainCouponsUnlocked) {
    return { success: false, reason: 'Grain coupons are not unlocked yet.' };
  }

  const redeemAmount = clamp(amount);
  if (redeemAmount <= 0) {
    return { success: false, reason: 'Redeem amount must be greater than zero.' };
  }

  const monetary = state.monetary ?? state.world;
  const privateSector = getPrivateSector(state);
  if (!privateSector) {
    return { success: false, reason: 'Private sector ledger is unavailable.' };
  }

  const farmerCoupons = clampMoney(privateSector.farmerCoupons ?? 0);
  const lockedReserve = clampMoney(monetary.lockedGrainReserve ?? 0);
  if (redeemAmount > farmerCoupons) {
    return { success: false, reason: `Redeem amount exceeds farmer coupon balance (${farmerCoupons}).` };
  }
  if (redeemAmount > lockedReserve) {
    return { success: false, reason: `Redeem amount exceeds locked reserve (${lockedReserve}).` };
  }

  const burned = burn({
    from: 'private.farmer.coupon',
    asset: 'coupon',
    amount: redeemAmount,
    reason: 'coupon_redemption',
  }, state);
  if (!burned) {
    return { success: false, reason: 'Insufficient farmer coupon balance for redemption.' };
  }

  const released = transfer({
    from: 'monetary.locked',
    to: 'private.farmer.grain',
    asset: 'grain',
    amount: redeemAmount,
    gdpTreatment: 'none',
    reason: 'grain_reserve_release',
  }, state);

  if (!released) {
    mint({
      to: 'private.farmer.coupon',
      asset: 'coupon',
      amount: redeemAmount,
      reason: 'coupon_redemption_rollback',
    }, state);
    return { success: false, reason: 'Insufficient locked grain reserve for redemption.' };
  }

  return {
    success: true,
    redeemAmount,
  };
}

export function borrowGovernmentDebt(world, amount) {
  const ledger = ensureLedger(world);
  const fiscal = getFiscal(world);
  const monetary = getMonetary(world);
  const borrowAmount = Math.floor(clampMoney(amount));
  const lendingPoolSize = clampMoney(monetary.lendingPoolSize ?? 0);
  const currentDebt = clampMoney(monetary.governmentDebt ?? 0);
  const currentCivilianLending = clampMoney(world.civilianLendingAccumulator ?? 0);
  const lendingPoolAvailable = Math.max(0, lendingPoolSize - currentDebt - currentCivilianLending);
  monetary.lendingPoolAvailable = lendingPoolAvailable;

  if (borrowAmount <= 0) {
    return { success: false, reason: 'Borrow amount must be greater than 0.' };
  }
  if (lendingPoolSize <= 0) {
    return { success: false, reason: 'No lending pool available.' };
  }

  const maxSingleBorrow = lendingPoolAvailable * 0.5;
  if (borrowAmount > maxSingleBorrow) {
    return {
      success: false,
      reason: `Borrow exceeds 50% pool cap (max ${Math.floor(maxSingleBorrow)}).`,
    };
  }

  if (currentDebt > lendingPoolSize) {
    return { success: false, reason: 'Cannot borrow while debt is over lending pool size.' };
  }

  const projectedDebt = currentDebt + borrowAmount;
  if (borrowAmount > lendingPoolAvailable) {
    return { success: false, reason: 'Borrow exceeds currently available lending pool.' };
  }

  const debtCurrency = world.grainCouponsUnlocked ? 'coupon' : 'grain';
  const rates = getBorrowingRateByCredit(monetary.creditRating ?? 'B');
  if (!Number.isFinite(rates[debtCurrency])) {
    return { success: false, reason: 'Credit rating D: borrowing is unavailable.' };
  }
  if (debtCurrency === 'coupon') {
    monetary.couponTreasury = clampMoney(monetary.couponTreasury ?? 0) + borrowAmount;
  } else {
    world.grainTreasury = clampMoney(world.grainTreasury ?? 0) + borrowAmount;
  }

  monetary.governmentDebt = projectedDebt;
  world.governmentDebtCurrency = debtCurrency;
  monetary.lendingPoolAvailable = Math.max(0, lendingPoolAvailable - borrowAmount);
  if (ledger) {
    ledger.debtBorrowed += Math.max(0, Number(borrowAmount ?? 0));
  }

  return {
    success: true,
    amount: borrowAmount,
    currency: debtCurrency,
    totalDebt: projectedDebt,
  };
}

export function processGovernmentDebtYear(world) {
  const ledger = ensureLedger(world);
  const fiscal = getFiscal(world);
  const monetary = getMonetary(world);
  const debt = clampMoney(monetary.governmentDebt ?? 0);
  const lendingPoolSize = clampMoney(monetary.lendingPoolSize ?? 0);
  const currency = world.governmentDebtCurrency === 'grain' ? 'grain' : 'coupon';

  if (debt <= 0) {
    monetary.governmentDebt = 0;
    monetary.governmentDebtInterest = 0;
    return {
      interestDue: 0,
      repaymentPaid: 0,
      remainingDebt: 0,
      interestRate: (() => { const r = getBorrowingRateByCredit(monetary.creditRating ?? 'B')[currency]; return Number.isFinite(r) ? r : (currency === 'coupon' ? 0.08 : 0.05); })(),
      penaltyMessages: [],
    };
  }

  const rawRate = getBorrowingRateByCredit(monetary.creditRating ?? 'B')[currency];
  const interestRate = Number.isFinite(rawRate) ? rawRate : (currency === 'coupon' ? 0.08 : 0.05);
  const interestDue = debt * interestRate;
  if (ledger) {
    ledger.debtInterest += Math.max(0, Number(interestDue ?? 0));
  }

  monetary.governmentDebtInterest = interestDue;
  monetary.governmentDebt = debt + interestDue;

  const desiredRepayment = clampMoney(fiscal.annualRepayment ?? 0);
  let repaymentPaid = 0;

  if (desiredRepayment > 0) {
    if (currency === 'coupon') {
      const couponAvailable = clampMoney(monetary.couponTreasury ?? 0);
      repaymentPaid = Math.min(desiredRepayment, couponAvailable, monetary.governmentDebt);
      monetary.couponTreasury = couponAvailable - repaymentPaid;
    } else {
      const grainAvailable = clampMoney(world.grainTreasury ?? 0);
      repaymentPaid = Math.min(desiredRepayment, grainAvailable, monetary.governmentDebt);
      world.grainTreasury = grainAvailable - repaymentPaid;
    }

    monetary.governmentDebt = Math.max(0, monetary.governmentDebt - repaymentPaid);
    if (ledger) {
      ledger.debtRepayment += Math.max(0, Number(repaymentPaid ?? 0));
    }
  }

  const penaltyMessages = [];
  if (lendingPoolSize > 0) {
    const debtRatio = monetary.governmentDebt / lendingPoolSize;
    if (debtRatio > 0.9) {
      world.merchantSatisfaction = clampIndex((world.merchantSatisfaction ?? 70) - 30);
      penaltyMessages.push('债务超过放贷池90%，商人满意度-30');
    } else if (debtRatio > 0.6) {
      world.merchantSatisfaction = clampIndex((world.merchantSatisfaction ?? 70) - 15);
      penaltyMessages.push('债务超过放贷池60%，商人满意度-15');
    } else if (debtRatio > 0.3) {
      world.merchantSatisfaction = clampIndex((world.merchantSatisfaction ?? 70) - 5);
      penaltyMessages.push('债务超过放贷池30%，商人满意度-5');
    }
  }

  if (monetary.governmentDebt > clampMoney(world.grainTreasury ?? 0) * 2) {
    world.merchantSatisfaction = clampIndex((world.merchantSatisfaction ?? 70) - 30);
    monetary.creditCrisis = true;
    penaltyMessages.push('债务超过粮仓2倍，触发信用风险（商人满意度-30）');
  }

  return {
    interestDue,
    repaymentPaid,
    remainingDebt: monetary.governmentDebt,
    interestRate,
    penaltyMessages,
    currency,
  };
}
