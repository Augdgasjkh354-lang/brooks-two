import { policies } from './policies.js';
import { hasPrerequisites, getUnlockedSystems } from './unlocks.js';
import { constructionConstants } from './construction.js';
import { getFarmlandTotals, getRequiredFarmLabor } from './agriculture.js';
import { getConstructionLaborDemand } from './labor.js';

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function statItem(label, value) {
  return `
    <div class="stat-item">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

export function renderMacroStats(state) {
  const world = state.world;
  const farmland = getFarmlandTotals(state);

  const el = document.getElementById('macro-stats');
  el.innerHTML = [
    statItem('GDP (Total)', formatNumber(state.economy.gdp.total)),
    statItem('GDP Agriculture', formatNumber(state.economy.gdp.agriculture)),
    statItem('GDP Construction', formatNumber(state.economy.gdp.construction)),
    statItem('GDP Commerce', formatNumber(state.economy.gdp.commerce)),
    statItem('Population', formatNumber(world.totalPopulation)),
    statItem('Labor', formatNumber(world.laborForce)),
    statItem('Employment Rate', formatPercent(state.economy.employmentRate)),
    statItem('Farmland (mu)', formatNumber(farmland.totalFarmland)),
    statItem('Grain Treasury', formatNumber(world.grainTreasury)),
  ].join('');

  const laborBreakdown = document.getElementById('labor-breakdown');
  laborBreakdown.innerHTML = [
    statItem('Agriculture Labor', formatNumber(state.labor.agriculture)),
    statItem('Construction Labor', formatNumber(state.labor.construction)),
    statItem('Commerce Labor', formatNumber(state.labor.commerce)),
    statItem('Idle Labor', formatNumber(state.labor.idle)),
    statItem('Farm Labor Needed', formatNumber(getRequiredFarmLabor(farmland.totalFarmland))),
    statItem('Construction Demand', formatNumber(getConstructionLaborDemand(state))),
  ].join('');
}

export function renderConstructionActions(state) {
  document.getElementById('reclaim-rule').textContent =
    `1000 mu per unit | cost ${formatNumber(constructionConstants.RECLAIM_COST_PER_MU)} grain/mu | labor ${constructionConstants.RECLAIM_LABOR_PER_UNIT} per unit`;

  document.getElementById('shop-rule').textContent =
    `Per shop: build labor ${constructionConstants.SHOP_BUILD_LABOR}, permanent workers 2, GDP ${formatNumber(constructionConstants.SHOP_GDP_PER_YEAR)}/year`;

  document.getElementById('agri-labor-input').value = state.labor.desiredAgriculture;

  document.getElementById('construction-status').innerHTML = `
    <p>Active projects: ${state.construction.projects.length}</p>
    <p>Built shops: ${state.construction.shopsBuilt}</p>
  `;
}

export function renderPolicies(state, onEnactPolicy) {
  const policyList = document.getElementById('policy-list');

  const rows = policies.map((policy) => {
    const alreadyDone = state.policyHistory.includes(policy.id);
    const available = hasPrerequisites(state, policy);

    const requirementsText =
      policy.requires.length === 0
        ? 'Prerequisites: None'
        : `Prerequisites: ${policy.requires.join(', ')}`;

    return `
      <div class="policy-row">
        <h4>${policy.title}${alreadyDone ? '<span class="badge">Enacted</span>' : ''}</h4>
        <div class="policy-meta">${policy.description}</div>
        <div class="policy-meta">${requirementsText}</div>
        <div class="policy-meta">Effect: ${policy.unlocksText}</div>
        <button data-policy-id="${policy.id}" ${alreadyDone || !available ? 'disabled' : ''}>
          ${alreadyDone ? 'Completed' : available ? 'Enact Policy' : 'Locked'}
        </button>
      </div>
    `;
  });

  policyList.innerHTML = rows.join('');
  policyList.querySelectorAll('button[data-policy-id]').forEach((button) => {
    button.addEventListener('click', () => onEnactPolicy(button.dataset.policyId));
  });
}

export function renderTechnologyStatus(state) {
  document.getElementById('technology-list').innerHTML = `
    <li>Bank built: ${state.systems.bankBuilt ? 'Yes' : 'No'}</li>
    <li>Bank clerks recruited: ${state.systems.bankClerksRecruited ? 'Yes' : 'No'}</li>
    <li>Anti-counterfeit researched: ${state.systems.antiCounterfeitResearched ? 'Yes' : 'No'}</li>
    <li>Grain coupons unlocked: ${state.systems.grainCouponsUnlocked ? 'Yes' : 'No'}</li>
  `;
}

export function renderSystems(state) {
  const systemsList = document.getElementById('systems-list');
  systemsList.innerHTML = getUnlockedSystems(state)
    .map((systemName) => `<li>${systemName}</li>`)
    .join('');

  const couponsUnlocked = state.systems.grainCouponsUnlocked;
  document.getElementById('grain-coupon-panel').classList.toggle('hidden', !couponsUnlocked);
  document.getElementById('grain-coupon-locked').classList.toggle('hidden', couponsUnlocked);

  if (couponsUnlocked) {
    document.getElementById('grain-coupon-stats').innerHTML = [
      statItem('Total Issued', formatNumber(state.grainCoupons.totalIssued)),
      statItem('Government Reserves', formatNumber(state.grainCoupons.governmentReserves)),
      statItem('Circulating Coupons', formatNumber(state.grainCoupons.circulating)),
    ].join('');
  }
}

export function renderYearLog(state) {
  const logEl = document.getElementById('year-log');

  if (state.yearLog.length === 0) {
    logEl.innerHTML = '<li>No events yet. Configure labor, enact policies, or advance to next year.</li>';
    return;
  }

  logEl.innerHTML = state.yearLog
    .slice(0, 14)
    .map((line) => `<li>${line}</li>`)
    .join('');
}

export function renderAll(state, onEnactPolicy) {
  renderMacroStats(state);
  renderConstructionActions(state);
  renderPolicies(state, onEnactPolicy);
  renderTechnologyStatus(state);
  renderSystems(state);
  renderYearLog(state);
}
