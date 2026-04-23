// Currency module: coupons and inflation
import { clamp } from './labor.js';

export function getInflationState(world) {
  if (!world?.grainCouponsUnlocked || (world.couponCirculating ?? 0) <= 0) {
    return {
      backingRatio: 1.0,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: 1.0,
    };
  }

  const couponCirculating = Math.max(0, world.couponCirculating ?? 0);
  const backingRatio =
    couponCirculating > 0 ? Math.max(0, (world.grainTreasury ?? 0) / couponCirculating) : 1.0;

  if (backingRatio >= 1.0) {
    return {
      backingRatio,
      inflationRate: 0,
      inflationStabilityPenalty: 0,
      inflationCommercePenaltyMultiplier: 1.0,
    };
  }

  if (backingRatio >= 0.7) {
    return {
      backingRatio,
      inflationRate: 0.05,
      inflationStabilityPenalty: 5,
      inflationCommercePenaltyMultiplier: 1.0,
    };
  }

  if (backingRatio >= 0.4) {
    return {
      backingRatio,
      inflationRate: 0.15,
      inflationStabilityPenalty: 15,
      inflationCommercePenaltyMultiplier: 0.9,
    };
  }

  return {
    backingRatio,
    inflationRate: 0.3,
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

  state.world.grainTreasury += issueAmount;
  state.world.couponCirculating += issueAmount;
  state.world.couponTotalIssued += issueAmount;
  state.world.lastCouponIssueAmount = issueAmount;
  state.world.lastCouponDenominationBreakdown = denominationBreakdown;

  return {
    success: true,
    issueAmount,
    denominationBreakdown,
  };
}
