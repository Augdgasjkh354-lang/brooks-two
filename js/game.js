import { createGameState } from './state.js';
import { updatePopulation } from './population.js';
import { runAgricultureYear, ageReclaimedParcels, getFarmlandTotals } from './agriculture.js';
import { calculateLaborAllocation } from './labor.js';
import { processConstructionYear, startLandReclamation, startShopConstruction } from './construction.js';
import { updateEconomicBreakdown, issueGrainCoupons } from './economy.js';
import { applyPolicy } from './unlocks.js';
import { policies } from './policies.js';
import { renderAll } from './render.js';

const state = createGameState();

function getPolicyById(policyId) {
  return policies.find((policy) => policy.id === policyId);
}

function pushYearNarration(results) {
  const agricultureStress = results.agriculture.unusedLandMu > 0;
  const constructionNote =
    results.construction.reclaimedAreaCompleted > 0 || results.construction.shopsCompleted > 0
      ? `Reclamation added ${results.construction.reclaimedAreaCompleted} mu and ${results.construction.shopsCompleted} shops were completed.`
      : 'Construction projects made limited progress this year.';

  state.yearLog.unshift(
    `Year ${state.world.year}: Grain output was ${results.agriculture.grainOutput}. ${
      agricultureStress ? 'Labor shortages left part of farmland unused.' : 'Farmland was fully staffed.'
    } ${constructionNote}`
  );
}

function nextYear() {
  state.world.year += 1;
  updatePopulation(state.world);

  const laborAllocation = calculateLaborAllocation(state);
  const agriculture = runAgricultureYear(state, laborAllocation.agricultureLabor);
  const construction = processConstructionYear(state, laborAllocation.constructionLabor);
  const economy = updateEconomicBreakdown(state, {
    grainOutput: agriculture.grainOutput,
    laborAllocation,
  });

  ageReclaimedParcels(state);

  const farmlandTotals = getFarmlandTotals(state);
  state.world.farmlandAreaMu = farmlandTotals.totalFarmland;

  pushYearNarration({ agriculture, construction, economy });
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

function startReclamationFromInput() {
  const unitsInput = document.getElementById('reclaim-units-input');
  const units = Number(unitsInput.value);

  const result = startLandReclamation(state, units);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Reclamation failed - ${result.reason}`);
  } else {
    state.yearLog.unshift(
      `Year ${state.world.year}: Approved reclamation of ${result.areaMu} mu (cost ${result.cost}). Labor will be tied up for one year.`
    );
  }

  render();
}

function startShopsFromInput() {
  const countInput = document.getElementById('shop-count-input');
  const count = Number(countInput.value);

  const result = startShopConstruction(state, count);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Shop construction failed - ${result.reason}`);
  } else {
    state.yearLog.unshift(
      `Year ${state.world.year}: Approved construction of ${result.count} shops (cost ${result.cost}).`
    );
  }

  render();
}

function setAgricultureLaborTarget() {
  const input = document.getElementById('agri-labor-input');
  const value = Math.max(0, Math.round(Number(input.value) || 0));
  state.labor.desiredAgriculture = value;
  state.yearLog.unshift(`Year ${state.world.year}: Agriculture labor target set to ${value}.`);
  render();
}

function bindEvents() {
  document.getElementById('next-year-btn').addEventListener('click', nextYear);
  document.getElementById('issue-coupon-btn').addEventListener('click', issueCouponsFromInput);
  document.getElementById('reclaim-land-btn').addEventListener('click', startReclamationFromInput);
  document.getElementById('build-shop-btn').addEventListener('click', startShopsFromInput);
  document.getElementById('set-agri-labor-btn').addEventListener('click', setAgricultureLaborTarget);
}

function render() {
  renderAll(state, enactPolicy);
}

function init() {
  bindEvents();
  render();
}

init();
