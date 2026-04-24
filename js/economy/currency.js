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

function clampMoney(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function clampIndex(value) {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}


function getBorrowingRateByCredit(creditRating = 'B') {
  const rating = String(creditRating || 'B').toUpperCase();
  if (rating === 'A') return { coupon: 0.03, grain: 0.02 };
  if (rating === 'B') return { coupon: 0.05, grain: 0.03 };
  if (rating === 'C') return { coupon: 0.08, grain: 0.05 };
  return { coupon: Infinity, grain: Infinity };
}

export function getInflationState(world) {
  if (!world?.grainCouponsUnlocked || (world.couponCirculating ?? 0) <= 0) {
    return {
      backingRatio: COUPON_GRAIN_RATIO,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: COUPON_GRAIN_RATIO,
    };
  }

  const couponCirculating = Math.max(0, world.couponCirculating ?? 0);
  const backingRatio =
    couponCirculating > 0 ? Math.max(0, (world.lockedGrainReserve ?? 0) / couponCirculating) : COUPON_GRAIN_RATIO;

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

  const maxIssuable = clamp(state.world.grainTreasury ?? 0);
  if (issueAmount > maxIssuable) {
    return {
      success: false,
      reason: `Issue amount exceeds current treasury absorption limit (${maxIssuable}).`,
    };
  }

  const denominationBreakdown = getCouponDenominationBreakdown(issueAmount);

  state.world.grainTreasury = clampMoney(state.world.grainTreasury ?? 0) - issueAmount;
  state.world.lockedGrainReserve = clampMoney(state.world.lockedGrainReserve ?? 0) + issueAmount;
  state.world.couponCirculating = clampMoney(state.world.couponCirculating ?? 0) + issueAmount;
  state.world.couponTotalIssued = clampMoney(state.world.couponTotalIssued ?? 0) + issueAmount;
  state.world.lastCouponIssueAmount = issueAmount;
  state.world.lastCouponDenominationBreakdown = denominationBreakdown;

  return {
    success: true,
    issueAmount,
    denominationBreakdown,
  };
}

export function borrowGovernmentDebt(world, amount) {
  const borrowAmount = Math.floor(clampMoney(amount));
  const lendingPoolSize = clampMoney(world.lendingPoolSize ?? 0);
  const currentDebt = clampMoney(world.governmentDebt ?? 0);
  const currentCivilianLending = clampMoney(world.civilianLendingAccumulator ?? 0);
  const lendingPoolAvailable = Math.max(0, lendingPoolSize - currentDebt - currentCivilianLending);
  world.lendingPoolAvailable = lendingPoolAvailable;

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
  const rates = getBorrowingRateByCredit(world.creditRating ?? 'B');
  if (!Number.isFinite(rates[debtCurrency])) {
    return { success: false, reason: 'Credit rating D: borrowing is unavailable.' };
  }
  if (debtCurrency === 'coupon') {
    world.couponTreasury = clampMoney(world.couponTreasury ?? 0) + borrowAmount;
  } else {
    world.grainTreasury = clampMoney(world.grainTreasury ?? 0) + borrowAmount;
  }

  world.governmentDebt = projectedDebt;
  world.governmentDebtCurrency = debtCurrency;
  world.lendingPoolAvailable = Math.max(0, lendingPoolAvailable - borrowAmount);

  return {
    success: true,
    amount: borrowAmount,
    currency: debtCurrency,
    totalDebt: projectedDebt,
  };
}

export function processGovernmentDebtYear(world) {
  const debt = clampMoney(world.governmentDebt ?? 0);
  const lendingPoolSize = clampMoney(world.lendingPoolSize ?? 0);
  const currency = world.governmentDebtCurrency === 'grain' ? 'grain' : 'coupon';

  if (debt <= 0) {
    world.governmentDebt = 0;
    world.governmentDebtInterest = 0;
    return {
      interestDue: 0,
      repaymentPaid: 0,
      remainingDebt: 0,
      interestRate: (() => { const r = getBorrowingRateByCredit(world.creditRating ?? 'B')[currency]; return Number.isFinite(r) ? r : (currency === 'coupon' ? 0.08 : 0.05); })(),
      penaltyMessages: [],
    };
  }

  const rawRate = getBorrowingRateByCredit(world.creditRating ?? 'B')[currency];
  const interestRate = Number.isFinite(rawRate) ? rawRate : (currency === 'coupon' ? 0.08 : 0.05);
  const interestDue = debt * interestRate;

  world.governmentDebtInterest = interestDue;
  world.governmentDebt = debt + interestDue;

  const desiredRepayment = clampMoney(world.annualRepayment ?? 0);
  let repaymentPaid = 0;

  if (desiredRepayment > 0) {
    if (currency === 'coupon') {
      const couponAvailable = clampMoney(world.couponTreasury ?? 0);
      repaymentPaid = Math.min(desiredRepayment, couponAvailable, world.governmentDebt);
      world.couponTreasury = couponAvailable - repaymentPaid;
    } else {
      const grainAvailable = clampMoney(world.grainTreasury ?? 0);
      repaymentPaid = Math.min(desiredRepayment, grainAvailable, world.governmentDebt);
      world.grainTreasury = grainAvailable - repaymentPaid;
    }

    world.governmentDebt = Math.max(0, world.governmentDebt - repaymentPaid);
  }

  const penaltyMessages = [];
  if (lendingPoolSize > 0) {
    const debtRatio = world.governmentDebt / lendingPoolSize;
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

  if (world.governmentDebt > clampMoney(world.grainTreasury ?? 0) * 2) {
    world.merchantSatisfaction = clampIndex((world.merchantSatisfaction ?? 70) - 30);
    world.creditCrisis = true;
    penaltyMessages.push('债务超过粮仓2倍，触发信用风险（商人满意度-30）');
  }

  return {
    interestDue,
    repaymentPaid,
    remainingDebt: world.governmentDebt,
    interestRate,
    penaltyMessages,
    currency,
  };
}
