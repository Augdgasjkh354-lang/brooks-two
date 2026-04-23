import { policies } from '../policies.js';
import { hasPrerequisites, getUnlockedSystems } from '../unlocks.js';
import { renderCouponDenominationBreakdown, renderRatioValue, getCouponRatioControlsHtml, bindCouponRatioEvents } from './render_economy.js';
import { getInflationDisplay, getPurchasingPowerDisplay } from './render_society.js';

export function formatNumber(num) {
  return new Intl.NumberFormat().format(num ?? 0);
}

export function formatDecimal(num, digits = 2) {
  return Number(num ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function statItem(label, value) {
  return `
    <div class="stat-item">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

export function getPopulationGrowthDisplayDetails(world) {
  const baseRate = 0.02;
  const commerceBonus =
    (world.merchantIncomePerHead ?? 0) > (world.farmerIncomePerHead ?? 0) * 1.5 ? 0.005 : 0;
  const demandPenalty = world.demandShortfall ? 0.005 : 0;
  const effectiveRate = Math.max(0.005, baseRate + commerceBonus - demandPenalty);

  const modifiers = [];
  if (commerceBonus > 0) modifiers.push('Commerce prosperity bonus +0.5%');
  if (demandPenalty > 0) modifiers.push('Demand shortfall penalty -0.5%');
  if (modifiers.length === 0) modifiers.push('Base growth only');

  return {
    effectiveRate,
    modifiersText: modifiers.join(' | '),
  };
}

export function renderHeaderStats(state) {
  const world = state.world;
  const mount = document.getElementById('header-stats');
  if (!mount) return;

  const purchasingPowerDisplay = getPurchasingPowerDisplay(world.purchasingPower ?? 100);
  mount.innerHTML = [
    `Year ${formatNumber(world.year)}`,
    `Population ${formatNumber(world.totalPopulation)}`,
    `Grain ${formatNumber(world.grainTreasury)}`,
    `Stability ${formatNumber(world.stabilityIndex ?? 80)}`,
    `Purchasing ${formatDecimal(world.purchasingPower ?? 100, 1)} (${purchasingPowerDisplay.label})`,
  ].join(' ｜ ');
}

export function renderCoreStats(state) {
  const world = state.world;
  const el = document.getElementById('core-stats');
  if (!el) return;

  el.innerHTML = [
    statItem('Year', world.year),
    statItem('Total Population', formatNumber(world.totalPopulation)),
    statItem('Total Labor', formatNumber(world.laborForce)),
    statItem(
      'Farming Labor',
      `${formatNumber(world.farmingLaborAllocated ?? 0)} / ${formatNumber(world.farmingLaborRequired ?? 0)}`
    ),
    statItem('Commerce Labor', formatNumber(world.laborAssignedCommerce ?? 0)),
    statItem('Merchants', formatNumber(world.merchantCount ?? 0)),
    statItem('Idle Labor', formatNumber(world.idleLabor ?? 0)),
    statItem('Land Utilization', `${Math.round(world.landUtilizationPercent ?? 0)}%`),
    statItem('Children', formatNumber(world.children)),
    statItem('Elderly', formatNumber(world.elderly)),
    statItem('Farmland (mu)', formatNumber(world.farmlandAreaMu)),
  ].join('');
}

export function renderPolicies(state, onEnactPolicy) {
  const policyList = document.getElementById('policy-list');
  if (!policyList) return;

  const rows = policies.map((policy) => {
    const alreadyDone = state.policyHistory.includes(policy.id);
    const available = hasPrerequisites(state, policy);
    const requirementsText =
      policy.requires.length === 0 ? 'Prerequisites: None' : `Prerequisites: ${policy.requires.join(', ')}`;

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

export function renderSystems(state) {
  const systemsList = document.getElementById('systems-list');
  if (!systemsList) return;

  systemsList.innerHTML = getUnlockedSystems(state)
    .map((systemName) => `<li>${systemName}</li>`)
    .join('');

  const couponsUnlocked = state.systems.grainCouponsUnlocked;
  state.world.grainCouponsUnlocked = couponsUnlocked;
  document.getElementById('grain-coupon-panel')?.classList.toggle('hidden', !couponsUnlocked);
  document.getElementById('grain-coupon-locked')?.classList.toggle('hidden', couponsUnlocked);

  if (couponsUnlocked) {
    const inflationRate = state.world.inflationRate ?? 0;
    const inflationDisplay = getInflationDisplay(inflationRate);
    const inflationText = `<span style="color: ${inflationDisplay.color}; font-weight: 700;">${formatDecimal(
      inflationRate * 100,
      1
    )}%</span> (${inflationDisplay.label})`;

    const stats = document.getElementById('grain-coupon-stats');
    if (stats) {
      stats.innerHTML = [
        statItem('Total Issued', formatNumber(state.world.couponTotalIssued ?? 0)),
        statItem('Government Held', formatNumber(state.world.couponTreasury ?? 0)),
        statItem('Circulating Coupons', formatNumber(state.world.couponCirculating ?? 0)),
        statItem('Last Issue Amount', formatNumber(state.world.lastCouponIssueAmount ?? 0)),
        statItem('Suggested Denominations', renderCouponDenominationBreakdown(state.world)),
        statItem('Tax Ratio', renderRatioValue(state.world.taxGrainRatio ?? 1)),
        statItem('Salary Ratio', renderRatioValue(state.world.salaryGrainRatio ?? 1)),
        statItem('Backing Ratio', formatDecimal(state.world.backingRatio ?? 1, 2)),
        statItem('Inflation', inflationText),
        statItem('Inflation Warning', inflationRate > 0 ? '⚠️ Inflation penalties are active.' : 'No inflation warning'),
        getCouponRatioControlsHtml(state.world),
      ].join('');
    }

    bindCouponRatioEvents(state);
  }
}

export function renderYearLog(state) {
  const logEl = document.getElementById('year-log');
  if (!logEl) return;

  if (state.yearLog.length === 0) {
    logEl.innerHTML = '<li>No events yet. Enact policies or advance to next year.</li>';
    return;
  }

  logEl.innerHTML = state.yearLog
    .slice(0, 10)
    .map((line) => `<li>${line}</li>`)
    .join('');
}
