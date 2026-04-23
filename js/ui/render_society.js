import { formatNumber, formatDecimal, statItem, getPopulationGrowthDisplayDetails } from './render_world.js';
import { BUREAUCRACY_POLICY_DEFS, activateBureaucracyPolicy } from '../society/stability.js';

const GRAIN_REDISTRIBUTION_COST = 3000000;

export function getStabilityDisplay(stabilityIndex) {
  if (stabilityIndex >= 80) return { label: 'Stable', color: '#1b8a3b' };
  if (stabilityIndex >= 50) return { label: 'Tense', color: '#b28704' };
  return { label: 'Unstable', color: '#b42318' };
}

export function getSatisfactionDisplay(score) {
  if (score >= 70) return { color: '#1b8a3b', label: 'Content' };
  if (score >= 40) return { color: '#b28704', label: 'Uneasy' };
  return { color: '#b42318', label: 'Discontent' };
}

export function getClassSatisfactionFactors(world) {
  const farmerFactors = [];
  if ((world.agriculturalTaxRate ?? 0) > 0.5) farmerFactors.push('High agricultural tax (>50%)');
  if ((world.inflationRate ?? 0) >= 0.15) farmerFactors.push('Inflation at or above 15%');
  if ((world.grainTreasury ?? 0) < (world.totalPopulation ?? 0) * 1) farmerFactors.push('Food insecurity (<1 grain per person in treasury)');
  if ((world.taxGrainRatio ?? 1) < 0.5) farmerFactors.push('Tax mix favors coupons (>50% coupons)');

  const merchantFactors = [];
  if ((world.inflationRate ?? 0) >= 0.15) merchantFactors.push('Inflation at or above 15%');
  if ((world.inflationRate ?? 0) >= 0.3) merchantFactors.push('Additional severe inflation penalty (30%)');
  if ((world.demandSaturation ?? 0) > 1.5) merchantFactors.push('Oversaturated market demand (>150%)');
  if ((world.stabilityIndex ?? 80) < 50) merchantFactors.push('Low social stability (<50)');
  if ((world.commerceActivityBonus ?? 1) > 1.0) merchantFactors.push('Commerce activity bonus active');

  const officialFactors = [];
  if ((world.salaryGrainRatio ?? 1) < 0.5 && (world.inflationRate ?? 0) >= 0.15) officialFactors.push('Low grain salary share (<50%) with inflation >=15%');
  if ((world.salaryGrainRatio ?? 1) < 0.3 && (world.inflationRate ?? 0) >= 0.05) officialFactors.push('Very low grain salary share (<30%) with inflation >=5%');
  if ((world.stabilityIndex ?? 80) < 50) officialFactors.push('Low social stability (<50)');

  const landlordFactors = [];
  if ((world.inflationRate ?? 0) >= 0.15) landlordFactors.push('Inflation at or above 15%');
  if ((world.grainPrice ?? 1) < 0.8) landlordFactors.push('Low grain price (<0.8)');
  if ((world.stabilityIndex ?? 80) < 50) landlordFactors.push('Low social stability (<50)');
  if ((world.farmlandAreaMu ?? 0) > 40000) landlordFactors.push('Large estate bonus (>40,000 mu)');

  return {
    farmer: farmerFactors.length ? farmerFactors.join(' | ') : 'No active factors',
    merchant: merchantFactors.length ? merchantFactors.join(' | ') : 'No active factors',
    official: officialFactors.length ? officialFactors.join(' | ') : 'No active factors',
    landlord: landlordFactors.length ? landlordFactors.join(' | ') : 'No active factors',
  };
}

export function getActiveBehaviorWarnings(world) {
  const warnings = [];
  if ((world.farmerSatisfaction ?? 70) < 40) warnings.push('农民消极怠工，农业产出下降');
  if ((world.merchantSatisfaction ?? 70) < 20) warnings.push('商业市场大规模萎缩');
  else if ((world.merchantSatisfaction ?? 70) < 40) warnings.push('商人拒收粮劵，改用实物交易');
  if ((world.officialSatisfaction ?? 70) < 40) warnings.push('官员消极，政策执行力下降（政策效果 -20%，稳定度额外 -10）');
  if ((world.landlordSatisfaction ?? 70) < 40) warnings.push('地主抵制开荒，土地扩张受阻');
  return warnings;
}

export function getInflationDisplay(inflationRate) {
  if (inflationRate >= 0.3) return { color: '#b42318', label: 'Severe inflation' };
  if (inflationRate >= 0.15) return { color: '#c2410c', label: 'High inflation' };
  if (inflationRate >= 0.05) return { color: '#b28704', label: 'Mild inflation' };
  return { color: '#1b8a3b', label: 'Stable prices' };
}

export function getPurchasingPowerDisplay(purchasingPower) {
  if (purchasingPower >= 80) return { color: '#1b8a3b', label: 'Strong' };
  if (purchasingPower >= 50) return { color: '#b28704', label: 'Stressed' };
  return { color: '#b42318', label: 'Weak' };
}

export function getStabilityPolicyControlsHtml(world) {
  const grainRedistributionDisabled = world.grainRedistributionUsed || (world.grainTreasury ?? 0) < GRAIN_REDISTRIBUTION_COST;
  const merchantTaxDisabled = world.merchantTaxUsed || (world.merchantCount ?? 0) <= 0;

  return `
    <div>
      <button id="grain-redistribution-btn" ${grainRedistributionDisabled ? 'disabled' : ''}>
        Grain Redistribution (${world.grainRedistributionUsed ? 'Used this year' : `Cost: ${formatNumber(GRAIN_REDISTRIBUTION_COST)} grain`})
      </button>
      <button id="merchant-tax-btn" ${merchantTaxDisabled ? 'disabled' : ''}>
        Merchant Tax (${world.merchantTaxUsed ? 'Used this year' : '+10 stability, +200 grain per merchant'})
      </button>
    </div>
  `;
}

function getBureaucracyPolicyControlsHtml(world) {
  if (!world?.techBonuses?.bureaucracyUnlocked) {
    return '<div class="muted">造纸术完成后可启用官僚政策。</div>';
  }

  const rows = Object.values(BUREAUCRACY_POLICY_DEFS).map((policy) => {
    const active = Boolean(world[`${policy.key}Active`]);
    const cannotAfford = (world.grainTreasury ?? 0) < policy.oneTimeCost;
    const disabled = active || cannotAfford;

    return `
      <div class="stat-item" style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px;">
        <div class="stat-label"><strong>${policy.name}</strong></div>
        <div class="stat-value">${policy.description}</div>
        <div class="muted">一次性：${formatNumber(policy.oneTimeCost)} 粮 / 年维护：${formatNumber(policy.annualMaintenance)} 粮</div>
        <button class="bureau-policy-btn" data-policy-key="${policy.key}" ${disabled ? 'disabled' : ''}>
          ${active ? '已生效' : '启用政策'}
        </button>
      </div>
    `;
  });

  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${rows.join('')}
      <div class="muted">本年维护：实付 ${formatNumber(world.bureaucracyMaintenancePaid ?? 0)} / 欠付 ${formatNumber(world.bureaucracyMaintenanceMissing ?? 0)}</div>
    </div>
  `;
}

export function bindStabilityPolicyEvents(onUseGrainRedistribution, onUseMerchantTax) {
  const grainBtn = document.getElementById('grain-redistribution-btn');
  const merchantBtn = document.getElementById('merchant-tax-btn');
  if (grainBtn) grainBtn.addEventListener('click', onUseGrainRedistribution);
  if (merchantBtn) merchantBtn.addEventListener('click', onUseMerchantTax);
}

function bindBureaucracyPolicyEvents(state, rerender) {
  document.querySelectorAll('.bureau-policy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-policy-key');
      if (!key) return;
      const result = activateBureaucracyPolicy(state.world, key);
      if (result.success) {
        state.yearLog.unshift(`Year ${state.world.year}: 启用官僚政策「${result.policy.name}」，支付${formatNumber(result.costPaid)}粮。`);
      } else {
        state.yearLog.unshift(`Year ${state.world.year}: 启用官僚政策失败 - ${result.reason}`);
      }
      rerender();
    });
  });
}

export function getCreditCrisisControlsHtml(world) {
  if (!world.creditCrisis) {
    return '<span style="color: #1b8a3b; font-weight: 700;">No active credit crisis</span>';
  }

  const recirculationDisabled = (world.couponTreasury ?? 0) < 10000 || world.creditCrisisResolved;
  const redemptionDisabled = (world.grainTreasury ?? 0) < 20000 || world.creditCrisisResolved;
  const actionStatus = world.creditCrisisResolved ? 'Action used this crisis' : 'One action can be used per crisis';

  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="background: #fde8e8; color: #b42318; border: 1px solid #f5c2c7; border-radius: 6px; padding: 8px; font-weight: 700;">
        🚨 粮劵信用崩塌，市场发生挤兑
      </div>
      <div class="muted">${actionStatus}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="credit-crisis-recirculation-btn" ${recirculationDisabled ? 'disabled' : ''}>紧急回笼 (Cost: 10000 coupon treasury)</button>
        <button id="credit-crisis-redemption-btn" ${redemptionDisabled ? 'disabled' : ''}>紧急赎回 (Cost: 20000 grain treasury)</button>
      </div>
    </div>
  `;
}

export function bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption) {
  const recirculationBtn = document.getElementById('credit-crisis-recirculation-btn');
  const redemptionBtn = document.getElementById('credit-crisis-redemption-btn');
  if (recirculationBtn) recirculationBtn.addEventListener('click', onEmergencyRecirculation);
  if (redemptionBtn) redemptionBtn.addEventListener('click', onEmergencyRedemption);
}

export function renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption) {
  const world = state.world;
  const mount = document.getElementById('society-tab-content');
  if (!mount) return;

  const stabilityDisplay = getStabilityDisplay(world.stabilityIndex ?? 80);
  const factors = getClassSatisfactionFactors(world);
  const warnings = getActiveBehaviorWarnings(world);
  const growth = getPopulationGrowthDisplayDetails(world);

  const sat = (value) => {
    const d = getSatisfactionDisplay(value ?? 70);
    return `<span style="color:${d.color};font-weight:700;">${formatNumber(value ?? 70)}</span> / 100 (${d.label})`;
  };

  mount.innerHTML = `
    <section class="panel"><h2>Stability</h2><div class="tab-grid">
      ${statItem('Stability Index', `<span style="color:${stabilityDisplay.color};font-weight:700;">${formatNumber(world.stabilityIndex ?? 80)}</span> / 100 (${stabilityDisplay.label})`)}
      ${statItem('Stability Penalty', `-${formatNumber(world.stabilityPenalty ?? 0)}`)}
      ${statItem('Efficiency Multiplier', `${formatDecimal((world.efficiencyMultiplier ?? 1) * 100, 1)}%`)}
      ${statItem('Population Growth Rate', `${formatDecimal(growth.effectiveRate * 100, 2)}%`)}
      ${statItem('Growth Modifiers', growth.modifiersText)}
      ${statItem('Policy Intervention', getStabilityPolicyControlsHtml(world))}
    </div></section>
    <section class="panel"><h2>Bureaucracy Policies</h2>${getBureaucracyPolicyControlsHtml(world)}</section>
    <section class="panel"><h2>Class Satisfaction</h2><div class="tab-grid">
      ${statItem('Farmer Satisfaction', sat(world.farmerSatisfaction))}
      ${statItem('Farmer Factors', factors.farmer)}
      ${statItem('Merchant Satisfaction', sat(world.merchantSatisfaction))}
      ${statItem('Merchant Factors', factors.merchant)}
      ${statItem('Official Satisfaction', sat(world.officialSatisfaction))}
      ${statItem('Official Factors', factors.official)}
      ${statItem('Landlord Satisfaction', sat(world.landlordSatisfaction))}
      ${statItem('Landlord Factors', factors.landlord)}
    </div></section>
    <section class="panel"><h2>Behavior Warnings</h2>${warnings.length ? warnings.map((w) => `<div class="stat-item"><div class="stat-value">⚠️ ${w}</div></div>`).join('') : '<div class="muted">No active behavior warnings</div>'}</section>
    <section class="panel"><h2>Credit Crisis</h2>${getCreditCrisisControlsHtml(world)}</section>
  `;

  bindStabilityPolicyEvents(onUseGrainRedistribution, onUseMerchantTax);
  bindBureaucracyPolicyEvents(state, () => renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption));
  bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption);
}
