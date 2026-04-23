import { formatNumber, formatDecimal, statItem, getPopulationGrowthDisplayDetails } from './render_world.js';

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
  const grainRedistributionDisabled = world.grainRedistributionUsed || (world.grainTreasury ?? 0) < 5000;
  const merchantTaxDisabled = world.merchantTaxUsed || (world.merchantCount ?? 0) <= 0;

  return `
    <div>
      <button id="grain-redistribution-btn" ${grainRedistributionDisabled ? 'disabled' : ''}>
        Grain Redistribution (${world.grainRedistributionUsed ? 'Used this year' : 'Cost: 5000 grain'})
      </button>
      <button id="merchant-tax-btn" ${merchantTaxDisabled ? 'disabled' : ''}>
        Merchant Tax (${world.merchantTaxUsed ? 'Used this year' : '+10 stability, +200 grain per merchant'})
      </button>
    </div>
  `;
}

export function bindStabilityPolicyEvents(onUseGrainRedistribution, onUseMerchantTax) {
  const grainBtn = document.getElementById('grain-redistribution-btn');
  const merchantBtn = document.getElementById('merchant-tax-btn');
  if (grainBtn) grainBtn.addEventListener('click', onUseGrainRedistribution);
  if (merchantBtn) merchantBtn.addEventListener('click', onUseMerchantTax);
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
  bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption);
}
