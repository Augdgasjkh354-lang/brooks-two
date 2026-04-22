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

function nextYear() {
  state.world.grainRedistributionUsed = false;
  state.world.merchantTaxUsed = false;

  state.world.year += 1;
  const popResult = updatePopulation(state.world);
  const econResult = updateEconomy(state.world);

  recordEconomySnapshot(econResult, true);

  logYearSummary({
    populationDelta: popResult.populationDelta,
    agriculturalTax: econResult.agriculturalTax,
    grainOutput: econResult.grainOutput,
    potentialGrainOutput: econResult.potentialGrainOutput,
    lostGrainOutput: econResult.lostGrainOutput,
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

  state.world.grainTreasury -= 5000;
  state.world.stabilityIndex = Math.min(100, (state.world.stabilityIndex ?? 0) + 15);
  state.world.grainRedistributionUsed = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: Grain Redistribution enacted (-5000 grain treasury, +15 stability).`
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

  state.world.merchantIncomePerHead = (state.world.merchantIncomePerHead ?? 0) * 0.8;
  state.world.incomeGap =
    (state.world.merchantIncomePerHead ?? 0) - (state.world.farmerIncomePerHead ?? 0);
  state.world.stabilityIndex = Math.min(100, (state.world.stabilityIndex ?? 0) + 10);

  const taxGain = (state.world.merchantCount ?? 0) * 200;
  state.world.grainTreasury += taxGain;
  state.world.merchantTaxUsed = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: Merchant Tax enacted (merchant income -20%, +10 stability, +${taxGain} grain treasury).`
  );

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
  renderAll(state, enactPolicy, useGrainRedistribution, useMerchantTax);
}

function init() {
  const econResult = updateEconomy(state.world, { collectTax: false });
  recordEconomySnapshot(econResult, false);
  bindEvents();
  render();
}

init();
