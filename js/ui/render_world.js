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
  const calendar = state.calendar ?? world;
  const population = state.population ?? world;
  const agriculture = state.agriculture ?? world;
  const mount = document.getElementById('header-stats');
  if (!mount) return;

  const purchasingPowerDisplay = getPurchasingPowerDisplay(world.purchasingPower ?? 100);
  mount.innerHTML = [
    `Year ${formatNumber(calendar.year)}`,
    `Population ${formatNumber(population.totalPopulation)}`,
    `Grain ${formatNumber(agriculture.grainTreasury)}`,
    `Stability ${formatNumber(world.stabilityIndex ?? 80)}`,
    `Purchasing ${formatDecimal(world.purchasingPower ?? 100, 1)} (${purchasingPowerDisplay.label})`,
  ].join(' ｜ ');
}

export function renderCoreStats(state) {
  const world = state.world;
  const calendar = state.calendar ?? world;
  const population = state.population ?? world;
  const land = state.land ?? world;
  const agriculture = state.agriculture ?? world;
  const el = document.getElementById('core-stats');
  if (!el) return;

  el.innerHTML = [
    statItem('Year', calendar.year),
    statItem('Total Population', formatNumber(population.totalPopulation)),
    statItem('Total Labor', formatNumber(population.laborForce)),
    statItem(
      'Farming Labor',
      `${formatNumber(world.farmingLaborAllocated ?? 0)} / ${formatNumber(world.farmingLaborRequired ?? 0)}`
    ),
    statItem('Commerce Labor', formatNumber(population.laborAssignedCommerce ?? 0)),
    statItem('Merchants', formatNumber(population.merchantCount ?? 0)),
    statItem('Idle Labor', formatNumber(world.idleLabor ?? 0)),
    statItem('Unemployed', formatNumber(world.unemployed ?? 0)),
    statItem('Unemployment Rate', `${formatDecimal((world.unemploymentRate ?? 0) * 100, 1)}%`),
    statItem('Unemployment Status', world.unemploymentStatus ?? '正常'),
    statItem('Institution Workers', formatNumber(world.institutionWorkers ?? 0)),
    statItem('Land Utilization', `${Math.round(agriculture.landUtilizationPercent ?? 0)}%`),
    statItem('Children', formatNumber(population.children)),
    statItem('Elderly', formatNumber(population.elderly)),
    statItem('Infant 0-3', formatNumber(population.infantPop ?? 0)),
    statItem('Child 4-12', formatNumber(population.childPop ?? 0)),
    statItem('Teen 13-18', formatNumber(population.teenPop ?? 0)),
    statItem('Youth 19-25', formatNumber(population.youthPop ?? 0)),
    statItem('Prime Adult 26-40', formatNumber(population.primeAdultPop ?? 0)),
    statItem('Middle Age 41-55', formatNumber(population.middleAgePop ?? 0)),
    statItem('Elderly 55+', formatNumber(population.elderlyPop ?? 0)),
    statItem('Fertility Rate', `${formatDecimal((population.fertilityRate ?? 0.04) * 100, 2)}%`),
    statItem('Births This Year', formatNumber(population.birthsThisYear ?? 0)),
    statItem('Deaths This Year', formatNumber(population.deathsThisYear ?? 0)),
    statItem('Effective Labor Force', formatNumber(population.laborForce ?? 0)),
    statItem('Total Grain Demand', formatNumber(world.totalGrainDemand ?? world.grainAnnualDemand ?? 0)),
    statItem('Farmland (mu)', formatNumber(land.farmlandAreaMu)),
    statItem('Income Pool - Farmer', formatNumber(world.farmerIncomePool ?? 0)),
    statItem('Income Pool - Merchant', formatNumber(world.merchantIncomePool ?? 0)),
    statItem('Income Pool - Official', formatNumber(world.officialIncomePool ?? 0)),
    statItem('Farmland Rent Rate', `${formatDecimal(world.farmlandRentRate ?? 0, 1)} jin/mu`),
    statItem('Rent Collected (Last Year)', formatNumber(world.lastFarmlandRentCollected ?? 0)),
    `<div class="stat-item stat-item-wide">
      <div class="stat-label">Infrastructure</div>
      <div class="stat-value">
        公厕 ${formatNumber(world.publicToilets ?? 0)} 座 ｜ 覆盖率 ${formatDecimal(world.toiletCoverage ?? 0, 1)}% ｜ 厕工比 ${(world.workerToToiletRatio ?? 0).toFixed(2)}
        <br/>道路 ${formatDecimal(world.roadLength ?? 0, 0)} 里 ｜ 贸易加成 ${(Math.max(0, Number(world.tradeEfficiency ?? 0)) * 100).toFixed(1)}% ｜ 开垦加成 ${(Math.max(0, Number(world.reclaimEfficiency ?? 0)) * 100).toFixed(1)}% ｜ 路工比 ${(world.workerToRoadRatio ?? 0).toFixed(2)}
        <br/>卫生局前置：${world.healthBureauPrereqMet ? '已满足' : '未满足'}
        <br/>
        <label>新建公厕（座）<input id="public-toilet-input" type="number" min="1" step="1" value="1" /></label>
        <button id="build-public-toilet-btn" ${(agriculture.grainTreasury ?? 0) < 50000 ? 'disabled' : ''}>建造公厕（50000粮/座）</button>
        <label style="margin-left:8px;">新建道路（里）<input id="road-length-input" type="number" min="1" step="1" value="1" /></label>
        <button id="build-road-btn" ${(agriculture.grainTreasury ?? 0) < 10000 ? 'disabled' : ''}>修建道路（10000粮/里）</button>
      </div>
    </div>`,
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
