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
    `Year ${state.world.year}: Population continued to ${populationDirection}, land utilization reached ${utilization}%, grain output was ${grainOutput}/${potentialGrainOutput} (lost ${lostGrainOutput}), and the grain treasury ${treasuryDirection}.`
  );
}

function nextYear() {
  state.world.year += 1;
  const popResult = updatePopulation(state.world);
  const econResult = updateEconomy(state.world);

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

function issueCouponsFromInput() {
  const input = document.getElementById('coupon-issue-input');
  const amount = Number(input.value);

  const result = issueGrainCoupons(state, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Coupon issuance failed - ${result.reason}`);
  } else {
    state.yearLog.unshift(
      `Year ${state.world.year}: Issued ${result.issueAmount} grain coupons; ${result.releaseToCirculation} entered circulation.`
    );
  }

  render();
}

function bindEvents() {
  document.getElementById('next-year-btn').addEventListener('click', nextYear);
  document.getElementById('issue-coupon-btn').addEventListener('click', issueCouponsFromInput);
}

function render() {
  renderAll(state, enactPolicy);
}

function init() {
  updateEconomy(state.world, { collectTax: false });
  bindEvents();
  render();
}

init();
