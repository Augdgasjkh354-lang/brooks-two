import { policies } from './policies.js';
import { hasPrerequisites, getUnlockedSystems } from './unlocks.js';

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatDecimal(num, digits = 2) {
  return Number(num ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}


function getPopulationGrowthDisplayDetails(world) {
  const baseRate = 0.02;
  const commerceBonus =
    (world.merchantIncomePerHead ?? 0) > (world.farmerIncomePerHead ?? 0) * 1.5 ? 0.005 : 0;
  const demandPenalty = world.demandShortfall ? 0.005 : 0;
  const effectiveRate = Math.max(0.005, baseRate + commerceBonus - demandPenalty);

  const modifiers = [];
  if (commerceBonus > 0) {
    modifiers.push('Commerce prosperity bonus +0.5%');
  }
  if (demandPenalty > 0) {
    modifiers.push('Demand shortfall penalty -0.5%');
  }
  if (modifiers.length === 0) {
    modifiers.push('Base growth only');
  }

  return {
    effectiveRate,
    modifiersText: modifiers.join(' | '),
  };
}


function getStabilityDisplay(stabilityIndex) {
  if (stabilityIndex >= 80) {
    return {
      label: 'Stable',
      color: '#1b8a3b',
    };
  }

  if (stabilityIndex >= 50) {
    return {
      label: 'Tense',
      color: '#b28704',
    };
  }

  return {
    label: 'Unstable',
    color: '#b42318',
  };
}

function statItem(label, value) {
  return `
    <div class="stat-item">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

export function renderCoreStats(state) {
  const world = state.world;
  const el = document.getElementById('core-stats');

  const taxCollectionText =
    (world.lastTaxCollectionYear ?? 0) > 0
      ? `${formatNumber(world.lastAgriculturalTax ?? 0)} (Year ${world.lastTaxCollectionYear})`
      : `${formatNumber(world.lastAgriculturalTax ?? 0)} (not collected yet)`;

  const latestSnapshot = state.economyHistory?.[0];
  const taxModeText = latestSnapshot
    ? latestSnapshot.taxCollected
      ? `Collected in Year ${latestSnapshot.year}`
      : `Projected only in Year ${latestSnapshot.year}`
    : 'No yearly snapshot yet';

  const demandSaturationPercent = (world.demandSaturation ?? 0) * 100;
  const commerceEfficiencyRate =
    (world.demandSaturation ?? 0) > 1 ? 1 / (world.demandSaturation ?? 1) : 1;
  const demandWarning =
    (world.demandSaturation ?? 0) > 1
      ? `<div class="stat-item"><div class="stat-label">Demand Warning</div><div class="stat-value">⚠️ Shops exceed population demand ceiling</div></div>`
      : '';
  const demandShortfallWarning =
    world.demandShortfall
      ? `<div class="stat-item"><div class="stat-label">Demand Shortfall</div><div class="stat-value">⚠️ Low market satisfaction suppresses yearly population growth (2.0% → 1.5%)</div></div>`
      : '';

  const growthDetails = getPopulationGrowthDisplayDetails(world);
  const stabilityDisplay = getStabilityDisplay(world.stabilityIndex ?? 80);
  const stabilityValueHtml = `<span style="color: ${stabilityDisplay.color}; font-weight: 700;">${formatNumber(
    world.stabilityIndex ?? 80
  )}</span> / 100 (${stabilityDisplay.label})`;

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
    statItem('Yield / mu (effective)', formatNumber(world.grainYieldPerMu)),
    statItem('Potential Grain Output', formatNumber(world.potentialGrainOutput ?? 0)),
    statItem('Actual Grain Output', formatNumber(world.actualGrainOutput ?? 0)),
    statItem('Lost Grain Output', formatNumber(world.lostGrainOutput ?? 0)),
    statItem('Shop Count', formatNumber(world.shopCount ?? 0)),
    statItem(
      'Operating / Idle Shops',
      `${formatNumber(world.operatingShops ?? 0)} / ${formatNumber(world.idleShops ?? 0)}`
    ),
    statItem('Max Market Demand (shops)', formatDecimal(world.maxMarketDemand ?? 0, 1)),
    statItem('Demand Saturation', `${formatDecimal(demandSaturationPercent, 1)}%`),
    statItem('Commerce Efficiency Rate', `${formatDecimal(commerceEfficiencyRate * 100, 1)}%`),
    demandWarning,
    demandShortfallWarning,
    statItem('Grain Consumed by Commerce', formatNumber(world.totalGrainDemand ?? 0)),
    statItem('Grain Price', formatDecimal(world.grainPrice ?? 1, 2)),
    statItem('Grain Supply Ratio', formatDecimal(world.supplyRatio ?? 0, 2)),
    statItem('Grain Demand / person', formatNumber(world.grainDemandPerPerson ?? 0)),
    statItem('Total Grain Demand', formatNumber(world.grainDemandTotal ?? 0)),
    statItem('Grain Balance', formatNumber(world.grainBalance ?? 0)),
    statItem('Grain per Capita', formatNumber(world.grainPerCapita ?? 0)),
    statItem('Grain Coverage', `${Math.round((world.grainCoverageRatio ?? 0) * 100)}%`),
    statItem('Food Security', world.foodSecurityStatus ?? 'Unknown'),
    statItem('Food Security Index', `${Math.round(world.foodSecurityIndex ?? 0)} / 100`),
    statItem('Farmer Income / Head', formatDecimal(world.farmerIncomePerHead ?? 0, 2)),
    statItem('Merchant Income / Head', formatDecimal(world.merchantIncomePerHead ?? 0, 2)),
    statItem('Income Gap', formatDecimal(world.incomeGap ?? 0, 2)),
    statItem('Stability Index', stabilityValueHtml),
    statItem('Stability Penalty', `-${formatNumber(world.stabilityPenalty ?? 0)}`),
    statItem('Stability Penalty Reason', world.stabilityPenaltyReason ?? 'No penalty (income gap below 500)'),
    statItem('Population Growth Rate', `${formatDecimal(growthDetails.effectiveRate * 100, 2)}%`),
    statItem('Growth Modifiers', growthDetails.modifiersText),
    statItem('Projected Agri Tax', formatNumber(world.lastAgriculturalTax ?? 0)),
    statItem('Last Tax Collection', taxCollectionText),
    statItem('Tax Snapshot Mode', taxModeText),
    statItem('Agricultural Tax Rate', `${Math.round(world.agriculturalTaxRate * 100)}%`),
    statItem('Grain Treasury', formatNumber(world.grainTreasury)),
    statItem('Agriculture GDP', formatNumber(world.agricultureGDP ?? 0)),
    statItem('Commerce GDP', formatNumber(world.commerceGDP ?? 0)),
    statItem('Construction GDP', formatNumber(world.constructionGDP ?? 0)),
    statItem('GDP Estimate', formatNumber(world.gdpEstimate ?? 0)),
  ].join('');
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
    logEl.innerHTML = '<li>No events yet. Enact policies or advance to next year.</li>';
    return;
  }

  logEl.innerHTML = state.yearLog
    .slice(0, 12)
    .map((line) => `<li>${line}</li>`)
    .join('');
}

export function renderAll(state, onEnactPolicy) {
  renderCoreStats(state);
  renderPolicies(state, onEnactPolicy);
  renderSystems(state);
  renderYearLog(state);
}
