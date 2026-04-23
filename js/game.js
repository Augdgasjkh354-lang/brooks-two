import { createGameState } from './state.js';
import { updatePopulation } from './population.js';
import { updateEconomy, issueGrainCoupons } from './economy.js';
import { applyPolicy } from './unlocks.js';
import { policies } from './policies.js';
import { renderAll } from './render.js';

const state = createGameState();

function getPolicyById(policyId) {
  return policies.find((policy) => policy.id === policyId);
}

function recordEconomySnapshot(econResult, taxCollected) {
  state.economyHistory.unshift({
    year: state.world.year,
    grainOutput: econResult.grainOutput,
    potentialGrainOutput: econResult.potentialGrainOutput,
    lostGrainOutput: econResult.lostGrainOutput,
    agriculturalTax: econResult.agriculturalTax,
    taxCollected,
  });

  if (state.economyHistory.length > 20) {
    state.economyHistory.length = 20;
  }
}

function logYearSummary({
  populationDelta,
  agriculturalTax,
  grainOutput,
  potentialGrainOutput,
  lostGrainOutput,
}) {
  const populationDirection = populationDelta >= 0 ? 'grow' : 'decline';
  const treasuryDirection = agriculturalTax >= 0 ? 'increased' : 'decreased';
  const utilization = Math.round(state.world.landUtilizationPercent);

  state.yearLog.unshift(
    `Year ${state.world.year}: Population continued to ${populationDirection}, land utilization reached ${utilization}%, grain output was ${grainOutput}/${potentialGrainOutput} (lost ${lostGrainOutput}), and the grain treasury ${treasuryDirection} by ${agriculturalTax}.`
  );
}

function updateCreditCrisisResolutionState() {
  const circulating = Math.max(0, state.world.couponCirculating ?? 0);
  if (circulating <= 0) {
    state.world.couponCirculating = 0;
    state.world.backingRatio = 1;
    state.world.creditCrisis = false;
    return true;
  }

  state.world.backingRatio = Math.max(0, (state.world.grainTreasury ?? 0) / circulating);
  if (state.world.backingRatio >= 0.6) {
    state.world.creditCrisis = false;
    return true;
  }

  return false;
}

function resolveByEmergencyRecirculation() {
  if (!state.world.creditCrisis) {
    state.yearLog.unshift(`Year ${state.world.year}: No active credit crisis to resolve.`);
    render();
    return;
  }

  if (state.world.creditCrisisResolved) {
    state.yearLog.unshift(`Year ${state.world.year}: Credit crisis action already used this crisis.`);
    render();
    return;
  }

  if ((state.world.couponTreasury ?? 0) < 10000) {
    state.yearLog.unshift(`Year ${state.world.year}: 紧急回笼 failed - requires 10000 coupon treasury.`);
    render();
    return;
  }

  state.world.couponTreasury -= 10000;
  state.world.couponCirculating = Math.max(0, (state.world.couponCirculating ?? 0) - 10000);
  state.world.creditCrisisResolved = true;

  const resolved = updateCreditCrisisResolutionState();

  state.yearLog.unshift(
    `Year ${state.world.year}: 执行紧急回笼（-10000 coupon treasury, -10000 circulating coupons）${
      resolved ? '，危机已缓解。' : '，危机仍在持续。'
    }`
  );

  render();
}

function resolveByEmergencyRedemption() {
  if (!state.world.creditCrisis) {
    state.yearLog.unshift(`Year ${state.world.year}: No active credit crisis to resolve.`);
    render();
    return;
  }

  if (state.world.creditCrisisResolved) {
    state.yearLog.unshift(`Year ${state.world.year}: Credit crisis action already used this crisis.`);
    render();
    return;
  }

  if ((state.world.grainTreasury ?? 0) < 20000) {
    state.yearLog.unshift(`Year ${state.world.year}: 紧急赎回 failed - requires 20000 grain treasury.`);
    render();
    return;
  }

  state.world.grainTreasury -= 20000;
  state.world.couponCirculating = Math.max(0, (state.world.couponCirculating ?? 0) - 20000);
  state.world.creditCrisisResolved = true;

  const resolved = updateCreditCrisisResolutionState();

  state.yearLog.unshift(
    `Year ${state.world.year}: 执行紧急赎回（-20000 grain treasury, -20000 circulating coupons）${
      resolved ? '，危机已缓解。' : '，危机仍在持续。'
    }`
  );

  render();
}

function nextYear() {
  state.world.grainRedistributionUsed = false;
  state.world.merchantTaxUsed = false;

  state.world.year += 1;
  const popResult = updatePopulation(state.world);
  const econResult = updateEconomy(state.world);

  if ((state.world.landlordSatisfaction ?? 70) < 40) {
    const blockedFarmland = Math.max(0, state.world.pendingFarmlandMu ?? 0);
    if (blockedFarmland > 0) {
      state.world.pendingFarmlandMu = 0;
      state.world.reclaimedThisYear = 0;
    }
  }

  recordEconomySnapshot(econResult, true);

  logYearSummary({
    populationDelta: popResult.populationDelta,
    agriculturalTax: econResult.agriculturalTax,
    grainOutput: econResult.grainOutput,
    potentialGrainOutput: econResult.potentialGrainOutput,
    lostGrainOutput: econResult.lostGrainOutput,
  });

  if (econResult.creditCrisisTriggered) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮劵信用崩塌，市场发生挤兑`);
  }

  (econResult.behaviorMessages ?? []).forEach((message) => {
    state.yearLog.unshift(`Year ${state.world.year}: ${message}`);
  });

  (econResult.diplomacyMessages ?? []).forEach((message) => {
    state.yearLog.unshift(`Year ${state.world.year}: ${message}`);
  });

  render();
}

function enactPolicy(policyId) {
  const policy = getPolicyById(policyId);
  if (!policy) return;

  const result = applyPolicy(state, policy);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Policy failed - ${result.reason}`);
  }

  render();
}

function useGrainRedistribution() {
  if (state.world.grainRedistributionUsed) {
    state.yearLog.unshift(`Year ${state.world.year}: Grain Redistribution already used this year.`);
    render();
    return;
  }

  if (state.world.grainTreasury < 5000) {
    state.yearLog.unshift(
      `Year ${state.world.year}: Grain Redistribution failed - requires 5000 grain in treasury.`
    );
    render();
    return;
  }

  const policyEffectMultiplier = state.world.officialPolicyEffectMultiplier ?? 1;
  const stabilityGain = Math.round(15 * policyEffectMultiplier);

  state.world.grainTreasury -= 5000;
  state.world.stabilityIndex = Math.min(100, (state.world.stabilityIndex ?? 0) + stabilityGain);
  state.world.grainRedistributionUsed = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: Grain Redistribution enacted (-5000 grain treasury, +${stabilityGain} stability).`
  );

  render();
}

function useMerchantTax() {
  if (state.world.merchantTaxUsed) {
    state.yearLog.unshift(`Year ${state.world.year}: Merchant Tax already used this year.`);
    render();
    return;
  }

  if ((state.world.merchantCount ?? 0) <= 0) {
    state.yearLog.unshift(`Year ${state.world.year}: Merchant Tax failed - no merchants available.`);
    render();
    return;
  }

  const policyEffectMultiplier = state.world.officialPolicyEffectMultiplier ?? 1;
  const merchantIncomeReduction = 0.2 * policyEffectMultiplier;
  const stabilityGain = Math.round(10 * policyEffectMultiplier);
  const treasuryGainPerMerchant = 200 * policyEffectMultiplier;

  state.world.merchantIncomePerHead =
    (state.world.merchantIncomePerHead ?? 0) * (1 - merchantIncomeReduction);
  state.world.incomeGap =
    (state.world.merchantIncomePerHead ?? 0) - (state.world.farmerIncomePerHead ?? 0);
  state.world.stabilityIndex = Math.min(100, (state.world.stabilityIndex ?? 0) + stabilityGain);

  const taxGain = Math.round((state.world.merchantCount ?? 0) * treasuryGainPerMerchant);
  state.world.grainTreasury += taxGain;
  state.world.merchantTaxUsed = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: Merchant Tax enacted (merchant income -${Math.round(
      merchantIncomeReduction * 100
    )}%, +${stabilityGain} stability, +${taxGain} grain treasury).`
  );

  render();
}


function sendEnvoyToXikou() {
  const xikou = state.xikou;

  if (!xikou) {
    state.yearLog.unshift(`Year ${state.world.year}: Send Envoy failed - Xikou data unavailable.`);
    render();
    return;
  }

  if (xikou.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.world.year}: 外交联系已建立，无需重复派遣使者。`);
    render();
    return;
  }

  if ((state.world.grainTreasury ?? 0) < 5000) {
    state.yearLog.unshift(`Year ${state.world.year}: 派遣使者失败 - 粮仓不足5000。`);
    render();
    return;
  }

  state.world.grainTreasury -= 5000;
  xikou.diplomaticContact = true;
  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 10));
  xikou.attitudeDeltaThisYear = 10;
  xikou.attitudeFactorsThisYear = ['派遣使者建立外交联系：+10'];

  state.yearLog.unshift(`Year ${state.world.year}: 派遣使者前往溪口村，初步建立外交联系`);
  render();
}

function issueCouponsFromInput() {
  const input = document.getElementById('coupon-issue-input');
  const amount = Number(input.value);

  const result = issueGrainCoupons(state, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Coupon issuance failed - ${result.reason}`);
  } else {
    const denominationSummary = result.denominationBreakdown
      .map((item) => `${item.label}×${item.count}`)
      .join(', ');

    state.yearLog.unshift(
      `Year ${state.world.year}: Issued ${result.issueAmount} grain coupons (1:1). Grain treasury +${result.issueAmount}, circulating coupons +${result.issueAmount}. Denominations: ${denominationSummary || 'N/A'}.`
    );
    input.value = '';
  }

  render();
}

function bindEvents() {
  document.getElementById('next-year-btn').addEventListener('click', nextYear);
  document.getElementById('issue-coupon-btn').addEventListener('click', issueCouponsFromInput);
}

function render() {
  renderAll(
    state,
    enactPolicy,
    useGrainRedistribution,
    useMerchantTax,
    resolveByEmergencyRecirculation,
    resolveByEmergencyRedemption,
    sendEnvoyToXikou
  );
}

function init() {
  const econResult = updateEconomy(state.world, { collectTax: false });
  recordEconomySnapshot(econResult, false);
  bindEvents();
  render();
}

init();
