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

function getSatisfactionDisplay(score) {
  if (score >= 70) {
    return { color: '#1b8a3b', label: 'Content' };
  }

  if (score >= 40) {
    return { color: '#b28704', label: 'Uneasy' };
  }

  return { color: '#b42318', label: 'Discontent' };
}

function getClassSatisfactionFactors(world) {
  const farmerFactors = [];
  if ((world.agriculturalTaxRate ?? 0) > 0.5) farmerFactors.push('High agricultural tax (>50%)');
  if ((world.inflationRate ?? 0) >= 0.15) farmerFactors.push('Inflation at or above 15%');
  if ((world.grainTreasury ?? 0) < (world.totalPopulation ?? 0) * 1)
    farmerFactors.push('Food insecurity (<1 grain per person in treasury)');
  if ((world.taxGrainRatio ?? 1) < 0.5) farmerFactors.push('Tax mix favors coupons (>50% coupons)');

  const merchantFactors = [];
  if ((world.inflationRate ?? 0) >= 0.15) merchantFactors.push('Inflation at or above 15%');
  if ((world.inflationRate ?? 0) >= 0.3)
    merchantFactors.push('Additional severe inflation penalty (30%)');
  if ((world.demandSaturation ?? 0) > 1.5)
    merchantFactors.push('Oversaturated market demand (>150%)');
  if ((world.stabilityIndex ?? 80) < 50) merchantFactors.push('Low social stability (<50)');
  if ((world.commerceActivityBonus ?? 1) > 1.0) merchantFactors.push('Commerce activity bonus active');

  const officialFactors = [];
  if ((world.salaryGrainRatio ?? 1) < 0.5 && (world.inflationRate ?? 0) >= 0.15) {
    officialFactors.push('Low grain salary share (<50%) with inflation >=15%');
  }
  if ((world.salaryGrainRatio ?? 1) < 0.3 && (world.inflationRate ?? 0) >= 0.05) {
    officialFactors.push('Very low grain salary share (<30%) with inflation >=5%');
  }
  if ((world.stabilityIndex ?? 80) < 50) officialFactors.push('Low social stability (<50)');

  const landlordFactors = [];
  if ((world.inflationRate ?? 0) >= 0.15) landlordFactors.push('Inflation at or above 15%');
  if ((world.grainPrice ?? 1) < 0.8) landlordFactors.push('Low grain price (<0.8)');
  if ((world.stabilityIndex ?? 80) < 50) landlordFactors.push('Low social stability (<50)');
  if ((world.farmlandAreaMu ?? 0) > 40000) landlordFactors.push('Large estate bonus (>40,000 mu)');

  return {
    farmer: farmerFactors.length > 0 ? farmerFactors.join(' | ') : 'No active factors',
    merchant: merchantFactors.length > 0 ? merchantFactors.join(' | ') : 'No active factors',
    official: officialFactors.length > 0 ? officialFactors.join(' | ') : 'No active factors',
    landlord: landlordFactors.length > 0 ? landlordFactors.join(' | ') : 'No active factors',
  };
}

function getActiveBehaviorWarnings(world) {
  const warnings = [];

  if ((world.farmerSatisfaction ?? 70) < 40) {
    warnings.push('农民消极怠工，农业产出下降');
  }

  if ((world.merchantSatisfaction ?? 70) < 20) {
    warnings.push('商业市场大规模萎缩');
  } else if ((world.merchantSatisfaction ?? 70) < 40) {
    warnings.push('商人拒收粮劵，改用实物交易');
  }

  if ((world.officialSatisfaction ?? 70) < 40) {
    warnings.push('官员消极，政策执行力下降（政策效果 -20%，稳定度额外 -10）');
  }

  if ((world.landlordSatisfaction ?? 70) < 40) {
    warnings.push('地主抵制开荒，土地扩张受阻');
  }

  return warnings;
}

function getInflationDisplay(inflationRate) {
  if (inflationRate >= 0.3) {
    return {
      color: '#b42318',
      label: 'Severe inflation',
    };
  }

  if (inflationRate >= 0.15) {
    return {
      color: '#c2410c',
      label: 'High inflation',
    };
  }

  if (inflationRate >= 0.05) {
    return {
      color: '#b28704',
      label: 'Mild inflation',
    };
  }

  return {
    color: '#1b8a3b',
    label: 'Stable prices',
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

function getXikouAttitudeLabel(attitudeToPlayer) {
  if (attitudeToPlayer <= -50) return '敌对';
  if (attitudeToPlayer <= -10) return '警惕';
  if (attitudeToPlayer <= 20) return '中立';
  if (attitudeToPlayer <= 50) return '友好';
  return '依附';
}

function getXikouAttitudeDisplay(attitudeToPlayer) {
  if (attitudeToPlayer <= -50) return { label: '敌对', color: '#b42318' };
  if (attitudeToPlayer <= -10) return { label: '警惕', color: '#c2410c' };
  if (attitudeToPlayer <= 20) return { label: '中立', color: '#6b7280' };
  if (attitudeToPlayer <= 50) return { label: '友好', color: '#1b8a3b' };
  return { label: '依附', color: '#2563eb' };
}

function getDiplomacyControlsHtml(world, xikou) {
  if (!xikou) {
    return '外交数据不可用';
  }

  if (xikou.diplomaticContact) {
    return '<span style="color: #1b8a3b; font-weight: 700;">外交联系已建立</span>';
  }

  const envoyDisabled = (world.grainTreasury ?? 0) < 5000;
  return `
    <button id="send-envoy-btn" ${envoyDisabled ? 'disabled' : ''}>
      派遣使者 (Cost: 5000 grain)
    </button>
  `;
}

function bindDiplomacyEvents(onSendEnvoy) {
  const envoyBtn = document.getElementById('send-envoy-btn');
  if (envoyBtn && typeof onSendEnvoy === 'function') {
    envoyBtn.addEventListener('click', onSendEnvoy);
  }
}

function getXikouVillagePanelHtml(state) {
  const xikou = state.xikou ?? state.world?.xikou;
  if (!xikou) {
    return 'Xikou Village data unavailable';
  }

  const contactStatus = xikou.diplomaticContact ? '已建立外交关系' : '未建立外交关系';
  const contactBadge = xikou.diplomaticContact
    ? '<span style="color: #1b8a3b; font-weight: 700;">已建立外交关系</span>'
    : '<span style="color: #b28704; font-weight: 700;">未建立外交关系</span>';

  const attitude = xikou.attitudeToPlayer ?? 0;
  const attitudeDisplay = getXikouAttitudeDisplay(attitude);
  const attitudeText = `<span style="color: ${attitudeDisplay.color}; font-weight: 700;">${attitudeDisplay.label}</span> (${formatNumber(attitude)})`;

  const attitudeFactors = Array.isArray(xikou.attitudeFactorsThisYear)
    ? xikou.attitudeFactorsThisYear.join(' | ')
    : '未建立外交关系，态度变化未生效';

  return [
    `状态：${contactBadge}`,
    `人口：${formatNumber(xikou.population ?? 0)}`,
    `劳动力：${formatNumber(xikou.laborForce ?? 0)}`,
    `粮食储备：${formatNumber(xikou.grainTreasury ?? 0)}`,
    `盐产量：${formatNumber(xikou.saltOutputJin ?? 0)} 斤/年`,
    `布匹产量：${formatNumber(xikou.clothOutput ?? 0)} 斤/年`,
    `稳定度：${formatNumber(xikou.stabilityIndex ?? 0)}`,
    `对我方态度：${attitudeText}`,
    `年度态度变化：${formatNumber(xikou.attitudeDeltaThisYear ?? 0)}`,
    `态度影响因素：${attitudeFactors}`,
    `外交：${contactStatus}`,
  ].join('<br/>');
}

function getStabilityPolicyControlsHtml(world) {
  const grainRedistributionDisabled =
    world.grainRedistributionUsed || (world.grainTreasury ?? 0) < 5000;
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

function bindStabilityPolicyEvents(onUseGrainRedistribution, onUseMerchantTax) {
  const grainBtn = document.getElementById('grain-redistribution-btn');
  const merchantBtn = document.getElementById('merchant-tax-btn');

  if (grainBtn) {
    grainBtn.addEventListener('click', onUseGrainRedistribution);
  }

  if (merchantBtn) {
    merchantBtn.addEventListener('click', onUseMerchantTax);
  }
}

function getCreditCrisisControlsHtml(world) {
  if (!world.creditCrisis) {
    return '<span style="color: #1b8a3b; font-weight: 700;">No active credit crisis</span>';
  }

  const recirculationDisabled = (world.couponTreasury ?? 0) < 10000 || world.creditCrisisResolved;
  const redemptionDisabled = (world.grainTreasury ?? 0) < 20000 || world.creditCrisisResolved;
  const actionStatus = world.creditCrisisResolved
    ? 'Action used this crisis'
    : 'One action can be used per crisis';

  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="background: #fde8e8; color: #b42318; border: 1px solid #f5c2c7; border-radius: 6px; padding: 8px; font-weight: 700;">
        🚨 粮劵信用崩塌，市场发生挤兑
      </div>
      <div class="muted">${actionStatus}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="credit-crisis-recirculation-btn" ${recirculationDisabled ? 'disabled' : ''}>
          紧急回笼 (Cost: 10000 coupon treasury)
        </button>
        <button id="credit-crisis-redemption-btn" ${redemptionDisabled ? 'disabled' : ''}>
          紧急赎回 (Cost: 20000 grain treasury)
        </button>
      </div>
    </div>
  `;
}

function bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption) {
  const recirculationBtn = document.getElementById('credit-crisis-recirculation-btn');
  const redemptionBtn = document.getElementById('credit-crisis-redemption-btn');

  if (recirculationBtn) {
    recirculationBtn.addEventListener('click', onEmergencyRecirculation);
  }

  if (redemptionBtn) {
    redemptionBtn.addEventListener('click', onEmergencyRedemption);
  }
}

function renderCouponDenominationBreakdown(world) {
  const breakdown = world.lastCouponDenominationBreakdown ?? [];
  if (breakdown.length === 0 || (world.lastCouponIssueAmount ?? 0) <= 0) {
    return 'No issuance yet.';
  }

  return breakdown.map((item) => `${item.label} × ${formatNumber(item.count)}`).join(' | ');
}

function renderRatioValue(value) {
  const grainPercent = Math.round((value ?? 0) * 100);
  const couponPercent = 100 - grainPercent;
  return `Grain ${grainPercent}% / Coupon ${couponPercent}%`;
}

function getCouponRatioControlsHtml(world) {
  return `
    <div class="coupon-controls" style="display: block; margin-top: 12px;">
      <label for="tax-grain-ratio-input">Tax Collection Mix</label>
      <input
        id="tax-grain-ratio-input"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value="${world.taxGrainRatio ?? 1}"
      />
      <div id="tax-grain-ratio-value" class="muted">${renderRatioValue(world.taxGrainRatio ?? 1)}</div>
    </div>

    <div class="coupon-controls" style="display: block; margin-top: 12px;">
      <label for="salary-grain-ratio-input">Official Salary Mix</label>
      <input
        id="salary-grain-ratio-input"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value="${world.salaryGrainRatio ?? 1}"
      />
      <div id="salary-grain-ratio-value" class="muted">${renderRatioValue(world.salaryGrainRatio ?? 1)}</div>
    </div>
  `;
}

function bindCouponRatioEvents(state) {
  const taxInput = document.getElementById('tax-grain-ratio-input');
  const taxValue = document.getElementById('tax-grain-ratio-value');

  if (taxInput && taxValue) {
    taxInput.oninput = () => {
      const nextValue = Math.max(0, Math.min(1, Number(taxInput.value)));
      state.world.taxGrainRatio = nextValue;
      taxValue.textContent = renderRatioValue(nextValue);
    };
  }

  const salaryInput = document.getElementById('salary-grain-ratio-input');
  const salaryValue = document.getElementById('salary-grain-ratio-value');

  if (salaryInput && salaryValue) {
    salaryInput.oninput = () => {
      const nextValue = Math.max(0, Math.min(1, Number(salaryInput.value)));
      state.world.salaryGrainRatio = nextValue;
      salaryValue.textContent = renderRatioValue(nextValue);
    };
  }
}

export function renderCoreStats(
  state,
  onUseGrainRedistribution,
  onUseMerchantTax,
  onEmergencyRecirculation,
  onEmergencyRedemption,
  onSendEnvoy
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

  el.innerHTML = [
    statItem('Year', world.year),
    statItem('溪口村', getXikouVillagePanelHtml(state)),
    statItem('溪口外交操作', getDiplomacyControlsHtml(world, state.xikou)),
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
    statItem('Coupon Circulation Ratio', formatDecimal(world.circulationRatio ?? 0, 2)),
    statItem('Commerce Activity Bonus', `${formatDecimal(commerceActivityBonus * 100, 1)}%`),
    statItem('Commerce Activity Impact', commerceActivityImpactText),
    demandWarning,
    demandShortfallWarning,
    statItem('Grain Consumed by Commerce', formatNumber(world.totalGrainDemand ?? 0)),
    statItem('Grain Price', formatDecimal(world.grainPrice ?? 1, 2)),
    statItem('Grain Supply Ratio', formatDecimal(world.supplyRatio ?? 0, 2)),
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
    statItem('Coupon Treasury (Gov Held)', formatNumber(world.couponTreasury ?? 0)),
    statItem('Agriculture GDP', formatNumber(world.agricultureGDP ?? 0)),
    statItem('Commerce GDP', formatNumber(world.commerceGDP ?? 0)),
    statItem('Construction GDP', formatNumber(world.constructionGDP ?? 0)),
    statItem('GDP Estimate', formatNumber(world.gdpEstimate ?? 0)),
  ].join('');

  bindStabilityPolicyEvents(onUseGrainRedistribution, onUseMerchantTax);
  bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption);
  bindDiplomacyEvents(onSendEnvoy);
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

export function renderAll(
  state,
  onEnactPolicy,
  onUseGrainRedistribution,
  onUseMerchantTax,
  onEmergencyRecirculation,
  onEmergencyRedemption,
  onSendEnvoy
) {
  renderCoreStats(
    state,
    onUseGrainRedistribution,
    onUseMerchantTax,
    onEmergencyRecirculation,
    onEmergencyRedemption,
    onSendEnvoy
  );
  renderPolicies(state, onEnactPolicy);
  renderSystems(state);
  renderYearLog(state);
}
