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

function logYearSummary({ populationDelta, agriculturalTax }) {
  const populationDirection = populationDelta >= 0 ? 'grow' : 'decline';
  const treasuryDirection = agriculturalTax >= 0 ? 'increased' : 'decreased';

  state.yearLog.unshift(
    `Year ${state.world.year}: Population continued to ${populationDirection}, and the grain treasury ${treasuryDirection}.`
  );
}

function nextYear() {
  state.world.year += 1;
  const popResult = updatePopulation(state.world);
  const econResult = updateEconomy(state.world);

  logYearSummary({
    populationDelta: popResult.populationDelta,
    agriculturalTax: econResult.agriculturalTax,
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
  bindEvents();
  render();
}

init();
