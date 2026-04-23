import { policies } from '../policies.js';
import { hasPrerequisites, getUnlockedSystems } from '../unlocks.js';
import { previewOfficialSaltSale } from '../economy/market.js';
import {
  getStabilityDisplay,
  getSatisfactionDisplay,
  getClassSatisfactionFactors,
  getActiveBehaviorWarnings,
  getInflationDisplay,
  getPurchasingPowerDisplay,
  getStabilityPolicyControlsHtml,
  bindStabilityPolicyEvents,
  getCreditCrisisControlsHtml,
  bindCreditCrisisEvents,
} from './render_society.js';
import {
  getXikouAttitudeLabel,
  getXikouAttitudeDisplay,
  getDiplomacyControlsHtml,
  bindDiplomacyEvents,
  getTradeControlsHtml,
  bindTradeEvents,
  getDungImportControlsHtml,
  bindDungImportEvents,
  getXikouVillagePanelHtml,
} from './render_diplomacy.js';
import {
  renderCouponDenominationBreakdown,
  renderRatioValue,
  getCouponRatioControlsHtml,
  bindCouponRatioEvents,
  getSaltImportControlsHtml,
  bindSaltImportQuotaEvents,
  getOfficialSaltSaleControlsHtml,
  bindOfficialSaltSaleEvents,
  getLandDevelopmentControlsHtml,
  bindLandDevelopmentEvents,
} from './render_economy.js';

export function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

export function formatDecimal(num, digits = 2) {
  return Number(num ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function getPopulationGrowthDisplayDetails(world) {
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

export function statItem(label, value) {
  return `
    <div class="stat-item">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

export function renderCoreStats(
  state,
  onUseGrainRedistribution,
  onUseMerchantTax,
  onEmergencyRecirculation,
  onEmergencyRedemption,
  onSendEnvoy,
  onTradeSalt,
  onTradeCloth,
  onSetDungImportQuota,
  onOfficialSaltSale,
  onOpenHempLand,
  onOpenMulberryLand
) {
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
  const commerceActivityBonus = world.commerceActivityBonus ?? 1;
  const commerceActivityDelta = (commerceActivityBonus - 1) * 100;
  const commerceActivityImpactText =
    commerceActivityDelta === 0
      ? 'No coupon-circulation impact'
      : commerceActivityDelta > 0
        ? `+${formatDecimal(commerceActivityDelta, 1)}% commerce boost from coupons`
        : `${formatDecimal(commerceActivityDelta, 1)}% commerce penalty from low circulation or inflation`;
  const demandWarning =
    (world.demandSaturation ?? 0) > 1
      ? '<div class="stat-item"><div class="stat-label">Demand Warning</div><div class="stat-value">⚠️ Shops exceed population demand ceiling</div></div>'
      : '';
  const demandShortfallWarning =
    world.demandShortfall
      ? '<div class="stat-item"><div class="stat-label">Demand Shortfall</div><div class="stat-value">⚠️ Low market satisfaction suppresses yearly population growth (2.0% → 1.5%)</div></div>'
      : '';

  const growthDetails = getPopulationGrowthDisplayDetails(world);
  const stabilityDisplay = getStabilityDisplay(world.stabilityIndex ?? 80);
  const stabilityValueHtml = `<span style="color: ${stabilityDisplay.color}; font-weight: 700;">${formatNumber(
    world.stabilityIndex ?? 80
  )}</span> / 100 (${stabilityDisplay.label})`;

  const inflationRate = world.inflationRate ?? 0;
  const inflationDisplay = getInflationDisplay(inflationRate);
  const inflationRateHtml = `<span style="color: ${inflationDisplay.color}; font-weight: 700;">${formatDecimal(
    inflationRate * 100,
    1
  )}%</span> (${inflationDisplay.label})`;
  const inflationWarningText =
    inflationRate > 0
      ? '⚠️ Inflation is reducing economic stability and may suppress commerce efficiency.'
      : 'No inflation warning';

  const efficiencyMultiplier = world.efficiencyMultiplier ?? 1;
  const outputLossPercent = Math.max(0, 1 - efficiencyMultiplier) * 100;
  const efficiencyLossText =
    efficiencyMultiplier < 1
      ? `⚠️ Estimated output loss ${formatDecimal(outputLossPercent, 1)}% due to low stability`
      : 'No stability-related output loss';

  const salaryWarningText = world.couponSalaryPaymentWarning
    ? '⚠️ Coupon treasury was insufficient for configured coupon salary payment. Salary paid fully in grain this year.'
    : 'No salary payment warning';

  const classFactors = getClassSatisfactionFactors(world);
  const farmerSatisfactionDisplay = getSatisfactionDisplay(world.farmerSatisfaction ?? 70);
  const merchantSatisfactionDisplay = getSatisfactionDisplay(world.merchantSatisfaction ?? 70);
  const officialSatisfactionDisplay = getSatisfactionDisplay(world.officialSatisfaction ?? 70);
  const landlordSatisfactionDisplay = getSatisfactionDisplay(world.landlordSatisfaction ?? 70);

  const farmerSatisfactionHtml = `<span style="color: ${farmerSatisfactionDisplay.color}; font-weight: 700;">${formatNumber(
    world.farmerSatisfaction ?? 70
  )}</span> / 100 (${farmerSatisfactionDisplay.label})`;
  const merchantSatisfactionHtml = `<span style="color: ${merchantSatisfactionDisplay.color}; font-weight: 700;">${formatNumber(
    world.merchantSatisfaction ?? 70
  )}</span> / 100 (${merchantSatisfactionDisplay.label})`;
  const officialSatisfactionHtml = `<span style="color: ${officialSatisfactionDisplay.color}; font-weight: 700;">${formatNumber(
    world.officialSatisfaction ?? 70
  )}</span> / 100 (${officialSatisfactionDisplay.label})`;
  const landlordSatisfactionHtml = `<span style="color: ${landlordSatisfactionDisplay.color}; font-weight: 700;">${formatNumber(
    world.landlordSatisfaction ?? 70
  )}</span> / 100 (${landlordSatisfactionDisplay.label})`;
  const behaviorWarnings = getActiveBehaviorWarnings(world);
  const behaviorWarningsText =
    behaviorWarnings.length > 0 ? behaviorWarnings.join(' | ') : 'No active behavior warnings';

  const commodityGrainPriceText = world.grainCouponsUnlocked
    ? formatDecimal(world.grainPrice ?? 1, 2)
    : 'N/A (locked before grain coupons)';

  const grainSurplus = world.grainSurplus ?? 0;
  const grainSurplusText =
    grainSurplus >= 0 ? formatNumber(grainSurplus) : `<span style="color: #b42318; font-weight: 700;">${formatNumber(grainSurplus)}</span>`;
  const famineRiskText =
    grainSurplus < 0
      ? '⚠️ Famine risk: treasury is below annual grain demand'
      : 'No famine risk warning';

  const purchasingPowerDisplay = getPurchasingPowerDisplay(world.purchasingPower ?? 100);
  const purchasingPowerText = `<span style="color: ${purchasingPowerDisplay.color}; font-weight: 700;">${formatDecimal(
    world.purchasingPower ?? 100,
    1
  )}</span> / 150 (${purchasingPowerDisplay.label})`;
  const saltShortfallRatio = world.saltShortfallRatio ?? 0;
  const saltShortfallWarning =
    saltShortfallRatio > 0.1
      ? `⚠️ 盐供应短缺：缺口比例 ${formatDecimal(saltShortfallRatio * 100, 1)}%`
      : '盐供应充足';
  const localClothRatio = world.localClothRatio ?? 0;
  const localClothRatioText = `${formatDecimal(localClothRatio * 100, 1)}%`;
  const clothImportAttitudeText =
    world.clothImportReductionPenaltyApplied
      ? '⚠️ 本年在自给率不足50%时减少布匹进口，溪口态度 -5'
      : localClothRatio >= 0.8
        ? '自给率≥80%，可将布匹进口降至0而无态度惩罚'
        : localClothRatio >= 0.5
          ? '自给率≥50%，减少布匹进口不会触发额外态度变化'
          : '自给率<50%，若减少布匹进口将触发溪口态度惩罚';

  el.innerHTML = [
    statItem('Year', world.year),
    statItem('溪口村', getXikouVillagePanelHtml(state)),
    statItem('溪口外交操作', getDiplomacyControlsHtml(world, state.xikou)),
    statItem('溪口贸易操作', getTradeControlsHtml(world, state.xikou)),
    statItem('蚕沙进口操作', getDungImportControlsHtml(world, state.xikou)),
    statItem('Credit Crisis Status', world.creditCrisis ? 'Active' : 'None'),
    statItem('Credit Crisis Controls', getCreditCrisisControlsHtml(world)),
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
    statItem(
      '纤维用地（麻/桑）',
      `${formatNumber(world.hempLandMu ?? 0)} / ${formatNumber(world.mulberryLandMu ?? 0)} 亩`
    ),
    statItem(
      '待转化用地（麻/桑）',
      `${formatNumber(world.pendingHempLandMu ?? 0)} / ${formatNumber(world.pendingMulberryLandMu ?? 0)} 亩`
    ),
    statItem(
      '桑田最早成熟年份',
      (world.mulberryMaturationYear ?? 0) > 0 ? `Year ${world.mulberryMaturationYear}` : '无待成熟桑田'
    ),
    statItem(
      '纤维产业用工（麻/桑）',
      `${formatNumber(world.hempLaborAllocated ?? 0)} / ${formatNumber(
        world.hempLaborRequired ?? 0
      )} | ${formatNumber(world.mulberryLaborAllocated ?? 0)} / ${formatNumber(
        world.mulberryLaborRequired ?? 0
      )}`
    ),
    statItem(
      '布匹年产量（粗布/细布/生丝）',
      `${formatNumber(world.coarseClothOutput ?? 0)} / ${formatNumber(
        world.fineClothOutput ?? 0
      )} / ${formatNumber(world.rawSilkOutput ?? 0)}`
    ),
    statItem('土地开垦操作', getLandDevelopmentControlsHtml(world)),
    statItem('Yield / mu (effective)', formatNumber(world.grainYieldPerMu)),
    statItem('Potential Grain Output', formatNumber(world.potentialGrainOutput ?? 0)),
    statItem('Actual Grain Output', formatNumber(world.actualGrainOutput ?? 0)),
    statItem('Lost Grain Output', formatNumber(world.lostGrainOutput ?? 0)),
    statItem(
      '蚕沙肥（自有/进口/总量）',
      `${formatNumber(world.playerSilkwormDung ?? 0)} / ${formatNumber(world.importedDung ?? 0)} / ${formatNumber(world.totalDung ?? 0)} 斤`
    ),
    statItem('蚕沙覆盖率', `${formatDecimal((world.dungCoverage ?? 0) * 100, 1)}%`),
    statItem('蚕沙增产加成', `${formatDecimal(((world.fertilizerBonus ?? 1) - 1) * 100, 1)}%`),
    statItem('当前亩产上限', `${formatNumber(Math.round((world.baseGrainYieldPerMu ?? 500) * (world.fertilizerBonus ?? 1)))} 斤/亩`),
    statItem('Shop Count', formatNumber(world.shopCount ?? 0)),
    statItem(
      'Operating / Idle Shops',
      `${formatNumber(world.operatingShops ?? 0)} / ${formatNumber(world.idleShops ?? 0)}`
    ),
    statItem('Max Market Demand (shops)', formatDecimal(world.maxMarketDemand ?? 0, 1)),
    statItem('Demand Saturation', `${formatDecimal(demandSaturationPercent, 1)}%`),
    statItem('Commerce Efficiency Rate', `${formatDecimal(commerceEfficiencyRate * 100, 1)}%`),
    statItem('Coupon Circulation Ratio', formatDecimal(world.circulationRatio ?? 0, 2)),
    statItem('Commerce Activity Bonus', `${formatDecimal(commerceActivityBonus * 100, 1)}%`),
    statItem('Commerce Activity Impact', commerceActivityImpactText),
    demandWarning,
    demandShortfallWarning,
    statItem('Grain Consumed by Commerce', formatNumber(world.totalGrainDemand ?? 0)),
    statItem('Grain Price', commodityGrainPriceText),
    statItem('Grain Supply Ratio', formatDecimal(world.supplyRatio ?? 0, 2)),
    statItem('Commodity Market - Grain Price', commodityGrainPriceText),
    statItem('Commodity Market - Grain Annual Demand', formatNumber(world.grainAnnualDemand ?? 0)),
    statItem('Commodity Market - Grain Surplus', grainSurplusText),
    statItem('Commodity Market - Famine Risk', famineRiskText),
    statItem(
      'Commodity Market - Salt',
      `Price ${formatDecimal(world.saltPrice ?? 4, 2)} | Supply ${formatNumber(
        world.saltAnnualSupply ?? 0
      )} | Demand ${formatNumber(world.saltAnnualDemand ?? 0)} | Reserve ${formatNumber(
        world.saltReserve ?? 0
      )}`
    ),
    statItem('Salt Import Quota', getSaltImportControlsHtml(world, state.xikou)),
    statItem('Official Salt Sale', getOfficialSaltSaleControlsHtml(world)),
    statItem(
      'Salt Supply Status',
      `Demand ${formatNumber(world.saltAnnualDemand ?? 0)} | Imported ${formatNumber(
        world.actualSaltImport ?? 0
      )} | Consumed ${formatNumber(world.saltConsumed ?? 0)} | Reserve ${formatNumber(
        world.saltReserve ?? 0
      )} | Shortfall ${formatDecimal((world.saltShortfallRatio ?? 0) * 100, 1)}%`
    ),
    statItem('Salt Shortfall Warning', saltShortfallWarning),
    statItem(
      'Commodity Market - Cloth',
      `Market Price ${formatDecimal(world.clothPrice ?? 2, 2)} | Blended Base ${formatDecimal(
        world.blendedClothPrice ?? 2,
        2
      )} | Demand ${formatNumber(world.clothAnnualDemand ?? 0)} | Reserve ${formatNumber(
        world.clothReserve ?? 0
      )}`
    ),
    statItem(
      'Cloth Supply Breakdown',
      `Local Coarse ${formatNumber(world.coarseClothOutput ?? 0)} | Local Fine ${formatNumber(
        world.fineClothOutput ?? 0
      )} | Imported ${formatNumber(world.clothTradeReceived ?? 0)} | Total ${formatNumber(
        world.totalClothSupply ?? 0
      )}`
    ),
    statItem('Local Cloth Self-Sufficiency', localClothRatioText),
    statItem('Cloth Import Substitution Status', clothImportAttitudeText),
    statItem('Purchasing Power Index', purchasingPowerText),
    statItem('Coupon Backing Ratio', formatDecimal(world.backingRatio ?? 1, 2)),
    statItem('Inflation Rate', inflationRateHtml),
    statItem('Inflation Warning', inflationWarningText),
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
    statItem(
      'Stability Penalty Reason',
      world.stabilityPenaltyReason ?? 'No penalty (income gap below 500)'
    ),
    statItem('Stability Efficiency Multiplier', `${formatDecimal(efficiencyMultiplier * 100, 1)}%`),
    statItem('Stability Output Loss', efficiencyLossText),
    statItem('Stability Policies', getStabilityPolicyControlsHtml(world)),
    statItem('Population Growth Rate', `${formatDecimal(growthDetails.effectiveRate * 100, 2)}%`),
    statItem('Growth Modifiers', growthDetails.modifiersText),
    statItem('Farmer Satisfaction', farmerSatisfactionHtml),
    statItem('Farmer Factors', classFactors.farmer),
    statItem('Merchant Satisfaction', merchantSatisfactionHtml),
    statItem('Merchant Factors', classFactors.merchant),
    statItem('Official Satisfaction', officialSatisfactionHtml),
    statItem('Official Factors', classFactors.official),
    statItem('Landlord Satisfaction', landlordSatisfactionHtml),
    statItem('Landlord Factors', classFactors.landlord),
    statItem('Class Behavior Warnings', behaviorWarningsText),
    statItem('Projected Agri Tax', formatNumber(world.lastAgriculturalTax ?? 0)),
    statItem('Last Tax Collection', taxCollectionText),
    statItem('Tax Snapshot Mode', taxModeText),
    statItem('Agricultural Tax Rate', `${Math.round(world.agriculturalTaxRate * 100)}%`),
    statItem('Tax Ratio (Grain/Coupon)', renderRatioValue(world.taxGrainRatio ?? 1)),
    statItem('Salary Ratio (Grain/Coupon)', renderRatioValue(world.salaryGrainRatio ?? 1)),
    statItem('Last Salary Cost', formatNumber(world.lastSalaryCost ?? 0)),
    statItem('Salary Payment Warning', salaryWarningText),
    statItem('Grain Treasury', formatNumber(world.grainTreasury)),
    statItem('Salt Reserve', formatNumber(world.saltReserve ?? 0)),
    statItem('Cloth Reserve', formatNumber(world.clothReserve ?? 0)),
    statItem('Coupon Treasury (Gov Held)', formatNumber(world.couponTreasury ?? 0)),
    statItem('Agriculture GDP', formatNumber(world.agricultureGDP ?? 0)),
    statItem('Commerce GDP', formatNumber(world.commerceGDP ?? 0)),
    statItem('Construction GDP', formatNumber(world.constructionGDP ?? 0)),
    statItem('GDP Estimate', formatNumber(world.gdpEstimate ?? 0)),
  ].join('');

  bindStabilityPolicyEvents(onUseGrainRedistribution, onUseMerchantTax);
  bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption);
  bindDiplomacyEvents(onSendEnvoy);
  bindTradeEvents(onTradeSalt, onTradeCloth);
  bindDungImportEvents(onSetDungImportQuota);
  bindSaltImportQuotaEvents(state);
  bindOfficialSaltSaleEvents(state, onOfficialSaltSale);
  bindLandDevelopmentEvents(onOpenHempLand, onOpenMulberryLand);
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
  state.world.grainCouponsUnlocked = couponsUnlocked;
  document.getElementById('grain-coupon-panel').classList.toggle('hidden', !couponsUnlocked);
  document.getElementById('grain-coupon-locked').classList.toggle('hidden', couponsUnlocked);

  if (couponsUnlocked) {
    const inflationRate = state.world.inflationRate ?? 0;
    const inflationDisplay = getInflationDisplay(inflationRate);
    const inflationText = `<span style="color: ${inflationDisplay.color}; font-weight: 700;">${formatDecimal(
      inflationRate * 100,
      1
    )}%</span> (${inflationDisplay.label})`;

    document.getElementById('grain-coupon-stats').innerHTML = [
      statItem('Total Issued', formatNumber(state.world.couponTotalIssued ?? 0)),
      statItem('Government Held', formatNumber(state.world.couponTreasury ?? 0)),
      statItem('Circulating Coupons', formatNumber(state.world.couponCirculating ?? 0)),
      statItem('Last Issue Amount', formatNumber(state.world.lastCouponIssueAmount ?? 0)),
      statItem('Suggested Denominations', renderCouponDenominationBreakdown(state.world)),
      statItem('Tax Ratio', renderRatioValue(state.world.taxGrainRatio ?? 1)),
      statItem('Salary Ratio', renderRatioValue(state.world.salaryGrainRatio ?? 1)),
      statItem('Backing Ratio', formatDecimal(state.world.backingRatio ?? 1, 2)),
      statItem('Inflation', inflationText),
      statItem(
        'Inflation Warning',
        inflationRate > 0 ? '⚠️ Inflation penalties are active.' : 'No inflation warning'
      ),
      getCouponRatioControlsHtml(state.world),
    ].join('');

    bindCouponRatioEvents(state);
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

