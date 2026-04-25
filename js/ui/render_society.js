import { formatNumber, formatDecimal, statItem, getPopulationGrowthDisplayDetails } from './render_world.js';
import { BUREAUCRACY_POLICY_DEFS, activateBureaucracyPolicy } from '../society/stability.js';
import { canUseMoneylenderSystem } from '../economy/commerce.js';
import { getGroupPolicyOptions } from '../society/interestGroups.js';

const GRAIN_REDISTRIBUTION_COST = 3000000;

function getClasses(world) {
  return world?.__classes ?? world?.classes ?? world;
}

function getEducation(world) {
  return world?.__education ?? world?.education ?? world;
}

export function getStabilityDisplay(stabilityIndex) {
  if (stabilityIndex >= 80) return { label: 'Stable', color: '#1b8a3b' };
  if (stabilityIndex >= 50) return { label: 'Tense', color: '#b28704' };
  return { label: 'Unstable', color: '#b42318' };
}

export function getLifeQualityDisplay(score) {
  if (score >= 70) return { color: '#1b8a3b', label: 'Good' };
  if (score >= 40) return { color: '#b28704', label: 'Pressured' };
  return { color: '#b42318', label: 'Poor' };
}

function getPopDisplayName(type) {
  const map = { farmer: 'Farmer', worker: 'Worker', merchant: 'Merchant', official: 'Official', scholar: 'Scholar' };
  return map[type] ?? type;
}

function getPopPanelHtml(state) {
  const pops = Array.isArray(state.pops) ? state.pops : [];
  if (!pops.length) return '<div class="muted">No pop data.</div>';

  const formatLean = (lean) => ({ conservative: 'Conservative', reformist: 'Reformist', radical: 'Radical' }[lean] ?? lean);
  const rows = pops.map((pop) => `
    <div class="stat-item">
      <div class="stat-label"><strong>${getPopDisplayName(pop.type)}</strong> (${formatNumber(Math.max(0, Number(pop.size ?? 0) * 100))} people)</div>
      <div class="stat-value">
        财富 ${formatDecimal(pop.wealth ?? 0, 2)} / 满意度 ${formatNumber(pop.satisfaction ?? 50)} / 立场 ${formatLean(pop.politicalLeaning)}
      </div>
      <div class="muted">需求满足：粮 ${formatDecimal((pop.needsSatisfied?.grain ?? 0) * 100, 0)}% · 盐 ${formatDecimal((pop.needsSatisfied?.salt ?? 0) * 100, 0)}% · 布 ${formatDecimal((pop.needsSatisfied?.cloth ?? 0) * 100, 0)}% · 药 ${formatDecimal((pop.needsSatisfied?.medicine ?? 0) * 100, 0)}%</div>
    </div>
  `).join('');

  const political = state.world?.popPoliticalDistribution ?? { conservative: 0, reformist: 0, radical: 0 };
  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${rows}
      <div class="stat-item">
        <div class="stat-label"><strong>Political Distribution</strong></div>
        <div class="stat-value">Conservative ${formatNumber(political.conservative ?? 0)} / Reformist ${formatNumber(political.reformist ?? 0)} / Radical ${formatNumber(political.radical ?? 0)}</div>
      </div>
    </div>
  `;
}

function getInterestGroupsPanelHtml(state) {
  const groups = state.interestGroups ?? state.world?.__interestGroups ?? {};
  const options = getGroupPolicyOptions(state);
  const rows = Object.values(groups)
    .filter((group) => group?.unlocked)
    .sort((a, b) => Number(b.power ?? 0) - Number(a.power ?? 0))
    .map((group) => {
      const sat = Number(group.satisfaction ?? 50);
      const color = sat > 60 ? '#1b8a3b' : sat >= 40 ? '#b28704' : '#b42318';
      const metPct = Math.round(Number(group.currentDemandsMet ?? 0) * 100);
      const appeaseEnabled = options.some((opt) => opt.groupId === group.id && opt.type === 'appease');
      const crisisWarn = sat < 20 ? '<div style="color:#b42318;font-weight:700;">⚠ 危机风险：连续 3 年低于 20 将触发政治危机</div>' : '';
      return `
      <div class="stat-item" style="border:1px solid #e5e7eb;border-radius:6px;padding:8px;">
        <div class="stat-label"><strong>${group.icon} ${group.name}</strong></div>
        <div class="stat-value">规模 ${formatNumber(group.size ?? 0)} / 满意度 <span style="color:${color};font-weight:700;">${formatNumber(sat)}</span> / 权力 ${formatNumber(group.power ?? 0)}</div>
        <div class="muted">诉求满足率：${metPct}%</div>
        <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;margin:6px 0;">
          <div style="height:100%;width:${Math.max(0, Math.min(100, metPct))}%;background:${color};"></div>
        </div>
        ${crisisWarn}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
          <button class="interest-group-policy-btn" data-group-id="${group.id}" data-policy-type="appease" ${appeaseEnabled ? '' : 'disabled'}>安抚</button>
        </div>
      </div>`;
    }).join('');

  if (!rows) return '<div class="muted">暂无已解锁利益集团。</div>';
  return `<div style="display:flex;flex-direction:column;gap:8px;">${rows}</div>`;
}

export function getClassLifeQualityFactors(world) {
  const classes = getClasses(world);
  const farmerFactors = [];
  if ((world.agriculturalTaxRate ?? 0) > 0.5) farmerFactors.push('High agricultural tax (>50%)');
  if ((world.inflationRate ?? 0) >= 0.15) farmerFactors.push('Inflation at or above 15%');
  if ((world.grainTreasury ?? 0) < (world.totalPopulation ?? 0) * 1) farmerFactors.push('Food insecurity (<1 grain per person in treasury)');
  if ((world.taxGrainRatio ?? 1) < 0.5) farmerFactors.push('Tax mix favors coupons (>50% coupons)');

  const merchantFactors = [];
  if ((world.inflationRate ?? 0) >= 0.15) merchantFactors.push('Inflation at or above 15%');
  if ((world.inflationRate ?? 0) >= 0.3) merchantFactors.push('Additional severe inflation penalty (30%)');
  if ((world.demandSaturation ?? 0) > 1.5) merchantFactors.push('Oversaturated market demand (>150%)');
  if ((classes.stabilityIndex ?? 80) < 50) merchantFactors.push('Low social stability (<50)');
  if ((world.commerceActivityBonus ?? 1) > 1.0) merchantFactors.push('Commerce activity bonus active');

  const officialFactors = [];
  if ((world.salaryGrainRatio ?? 1) < 0.5 && (world.inflationRate ?? 0) >= 0.15) officialFactors.push('Low grain salary share (<50%) with inflation >=15%');
  if ((world.salaryGrainRatio ?? 1) < 0.3 && (world.inflationRate ?? 0) >= 0.05) officialFactors.push('Very low grain salary share (<30%) with inflation >=5%');
  if ((classes.stabilityIndex ?? 80) < 50) officialFactors.push('Low social stability (<50)');

  const landlordFactors = [];
  if ((world.inflationRate ?? 0) >= 0.15) landlordFactors.push('Inflation at or above 15%');
  if ((world.grainPrice ?? 1) < 0.8) landlordFactors.push('Low grain price (<0.8)');
  if ((classes.stabilityIndex ?? 80) < 50) landlordFactors.push('Low social stability (<50)');
  if ((world.farmlandAreaMu ?? 0) > 40000) landlordFactors.push('Large estate bonus (>40,000 mu)');

  const cached = world.lifeQualityFactors ?? {};
  return {
    farmer: cached.farmer || (farmerFactors.length ? farmerFactors.join(' | ') : 'No active factors'),
    merchant: cached.merchant || (merchantFactors.length ? merchantFactors.join(' | ') : 'No active factors'),
    official: cached.official || (officialFactors.length ? officialFactors.join(' | ') : 'No active factors'),
    landlord: cached.landlord || (landlordFactors.length ? landlordFactors.join(' | ') : 'No active factors'),
  };
}

export function getActiveBehaviorWarnings(world) {
  const classes = getClasses(world);
  const warnings = [];
  if ((classes.farmerSatisfaction ?? 70) < 40) warnings.push('农民消极怠工，农业产出下降');
  if ((classes.merchantSatisfaction ?? 70) < 20) warnings.push('商业市场大规模萎缩');
  else if ((classes.merchantSatisfaction ?? 70) < 40) warnings.push('商人拒收粮劵，改用实物交易');
  if ((classes.officialSatisfaction ?? 70) < 40) warnings.push('官员消极，政策执行力下降（政策效果 -20%，稳定度额外 -10）');
  if (false && (classes.landlordSatisfaction ?? 70) < 40) warnings.push('地主抵制开荒，土地扩张受阻');
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

function getSchoolControlsHtml(world) {
  const education = getEducation(world);
  if (!world?.techBonuses?.bureaucracyUnlocked) {
    return '<div class="muted">需先解锁官僚体系（造纸术）后才能建设学校。</div>';
  }

  const licenseFee = formatNumber(education.schoolLicenseFee ?? 2000000);
  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>商办学校牌照</strong></div>
        <div class="muted">每所牌照费：${licenseFee}（优先使用${world.grainCouponsUnlocked ? '粮劵' : '粮食'}）</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label>商办蒙学数量</label>
          <input id="commercial-primary-target" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(education.commercialPrimarySchools ?? 0)))}" />
          <button id="set-commercial-primary-btn">设置商办蒙学</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label>商办私塾数量</label>
          <input id="commercial-secondary-target" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(education.commercialSecondarySchools ?? 0)))}" />
          <button id="set-commercial-secondary-btn" ${(world.techBonuses?.scholarClass ? '' : 'disabled')}>设置商办私塾</button>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-label"><strong>官办学校容量（每年）</strong></div>
        <div class="muted">年成本/生：人均GDP的20%</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label>官办蒙学容量</label>
          <input id="gov-primary-capacity" type="number" min="0" step="10" value="${Math.max(0, Math.floor(Number(education.govPrimaryCapacity ?? 0)))}" />
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label>官办县学容量</label>
          <input id="gov-secondary-capacity" type="number" min="0" step="10" value="${Math.max(0, Math.floor(Number(education.govSecondaryCapacity ?? 0)))}" ${(world.techBonuses?.scholarClass ? '' : 'disabled')} />
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label>官办书院容量</label>
          <input id="gov-higher-capacity" type="number" min="0" step="10" value="${Math.max(0, Math.floor(Number(education.govHigherCapacity ?? 0)))}" ${(world.higherSchoolUnlocked ? '' : 'disabled')} />
        </div>
      </div>

      ${(world.secondaryGraduates ?? 0) >= 100 ? `
      <div class="stat-item">
        <div class="stat-label"><strong>学子下乡</strong></div>
        <div class="muted">每人年成本：人均GDP的150%；每100人提升农民识字率成长与上限</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <label>下乡人数</label>
          <input id="students-down-input" type="number" min="0" step="10" value="${Math.max(0, Math.floor(Number(education.studentsDownToVillage ?? 0)))}" />
          <button id="set-students-down-btn">设置下乡人数</button>
        </div>
      </div>
      ` : '<div class="muted">学子下乡未解锁（需要累计县学/私塾毕业生 >= 100）</div>'}
    </div>
  `;
}

function bindSchoolEvents(state) {
  const education = state.education ?? state.world.__education ?? state.world;
  const triggerCommercial = (type, inputId) => {
    const input = document.getElementById(inputId);
    const target = Math.max(0, Math.floor(Number(input?.value ?? 0)));
    document.dispatchEvent(new CustomEvent('school:commercial-license', { detail: { type, target } }));
  };

  const primaryBtn = document.getElementById('set-commercial-primary-btn');
  const secondaryBtn = document.getElementById('set-commercial-secondary-btn');
  if (primaryBtn) primaryBtn.addEventListener('click', () => triggerCommercial('primary', 'commercial-primary-target'));
  if (secondaryBtn) secondaryBtn.addEventListener('click', () => triggerCommercial('secondary', 'commercial-secondary-target'));

  const govPrimary = document.getElementById('gov-primary-capacity');
  const govSecondary = document.getElementById('gov-secondary-capacity');
  const govHigher = document.getElementById('gov-higher-capacity');

  if (govPrimary) govPrimary.addEventListener('input', () => { education.govPrimaryCapacity = Math.max(0, Math.floor(Number(govPrimary.value ?? 0))); });
  if (govSecondary) govSecondary.addEventListener('input', () => { education.govSecondaryCapacity = Math.max(0, Math.floor(Number(govSecondary.value ?? 0))); });
  if (govHigher) govHigher.addEventListener('input', () => { education.govHigherCapacity = Math.max(0, Math.floor(Number(govHigher.value ?? 0))); });

  const downBtn = document.getElementById('set-students-down-btn');
  if (downBtn) {
    downBtn.addEventListener('click', () => {
      const input = document.getElementById('students-down-input');
      const target = Math.max(0, Math.floor(Number(input?.value ?? 0)));
      document.dispatchEvent(new CustomEvent('school:students-down', { detail: { target } }));
    });
  }
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

function getMoneylenderPolicyControlsHtml(world) {
  if (!canUseMoneylenderSystem(world)) {
    return '<div class="muted">钱庄政策未开放（需满足解锁条件）。</div>';
  }

  const fee = Math.max(0, Math.floor(Number(world.licenseFee ?? 5000000)));
  const taxRate = Math.max(0, Math.min(0.2, Number(world.moneylenderTaxRate ?? 0.01)));

  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label for="moneylender-license-fee-input">License Fee (per moneylender)</label>
      <input id="moneylender-license-fee-input" type="number" min="0" step="100000" value="${fee}" />
      <div class="muted">许可证费用进入${world.grainCouponsUnlocked ? 'coupon' : 'grain'}财政体系。</div>
      <label for="moneylender-tax-rate-input">Moneylender Tax Rate: ${formatDecimal(taxRate * 100, 1)}%</label>
      <input id="moneylender-tax-rate-input" type="range" min="0" max="0.2" step="0.01" value="${taxRate}" />
      <div id="moneylender-tax-rate-value" class="muted">Current: ${formatDecimal(taxRate * 100, 1)}%</div>
    </div>
  `;
}

function bindMoneylenderPolicyEvents(state) {
  const feeInput = document.getElementById('moneylender-license-fee-input');
  const taxInput = document.getElementById('moneylender-tax-rate-input');
  const taxValue = document.getElementById('moneylender-tax-rate-value');

  if (feeInput) {
    feeInput.addEventListener('input', () => {
      const next = Math.max(0, Math.floor(Number(feeInput.value || 0)));
      state.world.licenseFee = next;
    });
  }

  if (taxInput) {
    taxInput.addEventListener('input', () => {
      const next = Math.max(0, Math.min(0.2, Number(taxInput.value || 0)));
      state.world.moneylenderTaxRate = next;
      if (taxValue) taxValue.textContent = `Current: ${formatDecimal(next * 100, 1)}%`;
    });
  }
}

function getLandRentControlsHtml(world) {
  const rentRate = 0;
  if (false) {
    Math.max(0, Math.min(20, Number(world?.farmlandRentRate ?? 0)));
  }
  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label for="farmland-rent-rate-input">Farmland Rent Rate (${formatDecimal(rentRate, 1)} jin/mu/year)</label>
      <input id="farmland-rent-rate-input" type="range" min="0" max="20" step="1" value="${Math.round(rentRate)}" />
      <div id="farmland-rent-rate-value" class="muted">Current: ${formatDecimal(rentRate, 1)} jin/mu/year</div>
      <div class="muted">Higher rent increases treasury revenue but can reduce farmer satisfaction above 10 jin/mu.</div>
    </div>
  `;
}

function bindLandRentEvents(state) {
  const input = document.getElementById('farmland-rent-rate-input');
  const value = document.getElementById('farmland-rent-rate-value');
  if (!input || !value) return;

  if (false) {
    input.addEventListener('input', () => {
      const next = Math.max(0, Math.min(20, Number(input.value ?? 0)));
      state.world.farmlandRentRate = next;
      value.textContent = `Current: ${formatDecimal(next, 1)} jin/mu/year`;
    });
  }
  state.world.farmlandRentRate = 0;
  value.textContent = 'Current: 0.0 jin/mu/year';
}

function formatLiteracyPercent(value) {
  return `${formatDecimal((Number(value ?? 0) || 0) * 100, 1)}%`;
}

function formatTalent(value) {
  return formatDecimal(Math.max(0, Number(value ?? 0)), 1);
}

function getTalentUnlockText(unlocked) {
  return unlocked ? '<span style="color:#1b8a3b;font-weight:700;">已满足</span>' : '<span style="color:#b42318;font-weight:700;">未满足</span>';
}

function getTalentControlsHtml(world) {
  const adminAvailable = Math.max(0, Number(world.adminTalent ?? 0) - Number(world.adminTalentDeployed ?? 0));
  const commerceAvailable =
    Math.max(0, Number(world.commerceTalent ?? 0) - Number(world.commerceTalentDeployed ?? 0));
  const techAvailable = Math.max(0, Number(world.techTalent ?? 0) - Number(world.techTalentDeployed ?? 0));

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>文官人才部署</strong></div>
        <div class="muted">可用 ${formatTalent(adminAvailable)} / 总量 ${formatTalent(world.adminTalent ?? 0)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button id="admin-talent-deploy-btn" ${adminAvailable <= 0 ? 'disabled' : ''}>部署 +1</button>
          <button id="admin-talent-release-btn" ${(world.adminTalentDeployed ?? 0) <= 0 ? 'disabled' : ''}>撤回 -1</button>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><strong>商业人才部署</strong></div>
        <div class="muted">可用 ${formatTalent(commerceAvailable)} / 总量 ${formatTalent(world.commerceTalent ?? 0)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button id="commerce-talent-deploy-btn" ${commerceAvailable <= 0 ? 'disabled' : ''}>部署 +1</button>
          <button id="commerce-talent-release-btn" ${(world.commerceTalentDeployed ?? 0) <= 0 ? 'disabled' : ''}>撤回 -1</button>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><strong>技术人才部署</strong></div>
        <div class="muted">可用 ${formatTalent(techAvailable)} / 总量 ${formatTalent(world.techTalent ?? 0)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button id="tech-talent-deploy-btn" ${techAvailable <= 0 ? 'disabled' : ''}>部署 +1</button>
          <button id="tech-talent-release-btn" ${(world.techTalentDeployed ?? 0) <= 0 ? 'disabled' : ''}>撤回 -1</button>
        </div>
      </div>
    </div>
  `;
}

function bindTalentEvents(state, rerender) {
  const world = state.world;
  const bindDelta = (id, key, totalKey, delta) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = Math.max(0, Number(world[key] ?? 0));
      const total = Math.max(0, Number(world[totalKey] ?? 0));
      const next = Math.max(0, Math.min(total, current + delta));
      world[key] = next;
      rerender();
    });
  };

  bindDelta('admin-talent-deploy-btn', 'adminTalentDeployed', 'adminTalent', 1);
  bindDelta('admin-talent-release-btn', 'adminTalentDeployed', 'adminTalent', -1);
  bindDelta('commerce-talent-deploy-btn', 'commerceTalentDeployed', 'commerceTalent', 1);
  bindDelta('commerce-talent-release-btn', 'commerceTalentDeployed', 'commerceTalent', -1);
  bindDelta('tech-talent-deploy-btn', 'techTalentDeployed', 'techTalent', 1);
  bindDelta('tech-talent-release-btn', 'techTalentDeployed', 'techTalent', -1);
}

function getLiteracyEffectsSummary(world) {
  const farmerBonus = Math.max(0, Number(world.farmerLiteracyEfficiencyBonus ?? 0));
  const merchantBonus = Math.max(0, Number(world.merchantLiteracyEfficiencyBonus ?? 0));
  const officialEfficiency = Math.max(1, Number(world.policyExecutionEfficiency ?? 1));
  const stabilityReduction = Math.max(0, Number(world.stabilityPenaltyLiteracyReduction ?? 0));
  const textileBonus = Math.max(0, Number(world.textileOutputLiteracyBonus ?? 0));
  const landReclaimEfficiency = Math.max(1, Number(world.landReclaimEfficiency ?? 1));

  return {
    farmer: `农业效率 +${formatDecimal(farmerBonus * 100, 1)}%`,
    merchant: `商业效率 +${formatDecimal(merchantBonus * 100, 1)}%`,
    official: `政策执行效率 ${formatDecimal(officialEfficiency * 100, 1)}% / 稳定惩罚减免 ${formatDecimal(stabilityReduction * 100, 1)}%`,
    worker: `纺织产出 +${formatDecimal(textileBonus * 100, 1)}%`,
    landlord: '地主阶层已禁用',
  };
}


function getGovernmentPanelHtml(world) {
  const established = Boolean(world.governmentEstablished);
  const gdpPc = Number(world.gdpPerCapita ?? 0);
  const govStatus = established ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">未建立（需文官人才≥10）</span>';

  const row = (label, countKey, wageKey, disabled = false) => `
    <div style="display:grid;grid-template-columns:140px 1fr 1fr;gap:8px;align-items:center;">
      <div>${label}</div>
      <input class="gov-config" data-key="${countKey}" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world[countKey] ?? 0)))}" ${disabled ? 'disabled' : ''} />
      <input class="gov-config" data-key="${wageKey}" type="number" min="0" step="1" value="${Math.max(0, Number(world[wageKey] ?? 0)).toFixed(0)}" ${disabled ? 'disabled' : ''} />
    </div>
  `;

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>政府机构状态</strong></div>
        <div class="stat-value">${govStatus}</div>
        <div class="muted">人均GDP：${formatDecimal(gdpPc, 2)} / 政府效率：${formatDecimal(world.governmentEfficiency ?? 0, 1)}%</div>
      </div>

      <div class="stat-item">
        <div class="muted">编制（左）与工资（右）</div>
        ${row('高级官员', 'seniorOfficialCount', 'seniorOfficialWage', !established)}
        ${row('中级官员', 'midOfficialCount', 'midOfficialWage', !established)}
        ${row('基层官员', 'juniorOfficialCount', 'juniorOfficialWage', !established)}
        ${row('专业人员', 'professionalCount', 'professionalWage', true)}
        ${row('挑粪工', 'sanitationWorkerCount', 'sanitationWorkerWage', !established)}
        ${row('清洁工', 'cleaningWorkerCount', 'cleaningWorkerWage', !established)}
        <div class="muted">专业人员数量按机构规模自动决定。</div>
      </div>

      <div class="stat-item" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
        <label>政府部署文官</label>
        <input class="gov-config" data-key="adminTalentDeployedGov" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.adminTalentDeployedGov ?? 0)))}" ${!established ? 'disabled' : ''}/>
        <label><input class="gov-toggle" data-key="taxBureauEstablished" type="checkbox" ${world.taxBureauEstablished ? 'checked' : ''} ${!established ? 'disabled' : ''}/> 税务机构</label>
        <label><input class="gov-toggle" data-key="courtEstablished" type="checkbox" ${world.courtEstablished ? 'checked' : ''} ${!established ? 'disabled' : ''}/> 司法机构</label>
      </div>

      <div class="stat-item">
        <div class="stat-value">年薪俸总额：${formatNumber(world.totalWageBill ?? 0)}</div>
        <div class="muted">火耗率：${formatDecimal((world.fireLeakageRate ?? 0.05) * 100, 1)}% | 理论税收：${formatNumber(world.theoreticalTaxRevenue ?? 0)} | 实征税收：${formatNumber(world.actualTaxRevenue ?? 0)}</div>
        <div class="muted">火耗因素：${world.fireLeakageFactors || '基准火耗 5%'}</div>
        <div class="muted">效率分解：人才${formatDecimal(world.governmentEfficiencyTalent ?? 0, 1)}% / 纸张${formatDecimal(world.governmentEfficiencyPaper ?? 0, 1)}% / 编制${formatDecimal(world.governmentEfficiencyStaffing ?? 0, 1)}%</div>
      </div>
    </div>
  `;
}



function getPoliceRatioLabel(policeRatio) {
  if (policeRatio < 1 / 1000) return '极度短缺';
  if (policeRatio < 1 / 500) return '短缺';
  if (policeRatio < 1 / 200) return '适中';
  if (policeRatio < 1 / 100) return '良好';
  return '过剩';
}

function getPolicePanelHtml(world) {
  const unlocked = Boolean(world.policeEstablished) || (Boolean(world.governmentEstablished) && Number(world.adminTalent ?? 0) >= 100);
  const established = Boolean(world.policeEstablished);

  if (!unlocked) {
    return '<div class="muted">需先满足条件：政府已建立且文官人才≥100。</div>';
  }

  const ratio = Number(world.policeRatio ?? 0);
  const ratioPerThousand = ratio * 1000;
  const status = world.policeStatusLabel || getPoliceRatioLabel(ratio);
  const effects = world.policeEffectsSummary || '无';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>警务机构状态</strong></div>
        <div class="stat-value">${established ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">待建立</span>'}</div>
        <div class="muted">警民比：${formatDecimal(ratioPerThousand, 3)} / 千人（${status}）</div>
      </div>

      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>警员人数</div>
        <input class="gov-config" data-key="policeOfficerCount" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.policeOfficerCount ?? 0)))}" />
        <div class="muted">文官池占用：${formatNumber(world.adminTalentDeployedPolice ?? 0)}</div>

        <div>警员工资</div>
        <input class="gov-config" data-key="officerWage" type="number" min="0" step="1" value="${Math.max(0, Number(world.officerWage ?? 0)).toFixed(0)}" />
        <div class="muted">年成本：${formatNumber(world.policeAnnualCost ?? 0)}</div>
      </div>

      <div class="stat-item">
        <div class="muted">警务效率：${formatDecimal(world.policeEfficiency ?? 0, 1)}%</div>
        <div class="muted">效率分解：人才${formatDecimal(world.policeEfficiencyTalent ?? 0, 1)}% / 纸张${formatDecimal(world.policeEfficiencyPaper ?? 0, 1)}% / 编制${formatDecimal(world.policeEfficiencyStaffing ?? 0, 1)}%</div>
        <div class="muted">本年效果：${effects}</div>
      </div>
    </div>
  `;
}


function getHealthIndexDisplay(index) {
  const value = Number(index ?? 50);
  if (value >= 80) return { label: '优良', color: '#1b8a3b' };
  if (value >= 60) return { label: '良好', color: '#1d4ed8' };
  if (value >= 40) return { label: '基线', color: '#6b7280' };
  if (value >= 20) return { label: '堪忧', color: '#c2410c' };
  return { label: '危机', color: '#b42318' };
}

function getHealthPanelHtml(world) {
  const unlocked = Boolean(world.healthBureauEstablished) ||
    (Boolean(world.governmentEstablished) && Boolean(world.healthBureauPrereqMet));
  const established = Boolean(world.healthBureauEstablished);

  if (!unlocked) {
    return '<div class="muted">需先满足条件：政府已建立，且公共卫生前置条件达成。</div>';
  }

  const healthDisplay = getHealthIndexDisplay(world.healthIndex ?? 50);
  const positiveFactors = Array.isArray(world.healthFactorsPositive) && world.healthFactorsPositive.length
    ? world.healthFactorsPositive.join(' | ')
    : '无';
  const negativeFactors = Array.isArray(world.healthFactorsNegative) && world.healthFactorsNegative.length
    ? world.healthFactorsNegative.join(' | ')
    : '无';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>卫生局状态</strong></div>
        <div class="stat-value">${established ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">待建立</span>'}</div>
        <div class="muted">健康指数：<span style="color:${healthDisplay.color};font-weight:700;">${formatNumber(world.healthIndex ?? 50)}</span> / 100（${healthDisplay.label}）</div>
      </div>

      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>卫生员人数</div>
        <input class="gov-config" data-key="healthOfficerCount" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.healthOfficerCount ?? 0)))}" ${!established ? 'disabled' : ''} />
        <div class="muted">文官池占用：${formatNumber(world.adminTalentDeployedHealth ?? 0)}</div>

        <div>卫生员工资</div>
        <input class="gov-config" data-key="healthOfficerWage" type="number" min="0" step="1" value="${Math.max(0, Number(world.healthOfficerWage ?? 0)).toFixed(0)}" ${!established ? 'disabled' : ''} />
        <div class="muted">年成本：${formatNumber(world.healthAnnualCost ?? 0)}</div>
      </div>

      <div class="stat-item">
        <div class="muted">卫生效率：${formatDecimal(world.healthEfficiency ?? 0, 1)}%</div>
        <div class="muted">效率分解：人才${formatDecimal(world.healthEfficiencyTalent ?? 0, 1)}% / 纸张${formatDecimal(world.healthEfficiencyPaper ?? 0, 1)}% / 编制${formatDecimal(world.healthEfficiencyStaffing ?? 0, 1)}%</div>
        <div class="muted">增长修正：${formatDecimal((world.healthGrowthModifier ?? 0) * 100, 2)}%</div>
        <div class="muted">连续低健康年数：${formatNumber(world.consecutiveLowHealthYears ?? 0)}</div>
      </div>

      <div class="stat-item">
        <div class="muted">正向因素：${positiveFactors}</div>
        <div class="muted">负向因素：${negativeFactors}</div>
        ${(world.diseaseOutbreak ? '<div style="color:#b42318;font-weight:700;">⚠️ 本年发生瘟疫</div>' : '')}
      </div>
    </div>
  `;
}


function getCourtPanelHtml(world) {
  const unlocked = Boolean(world.courtEstablished) || (Boolean(world.governmentEstablished) && Number(world.adminTalent ?? 0) >= 200 && Boolean(world.codifiedLawPolicyActive));
  if (!unlocked) return '<div class="muted">需满足：政府已建立、文官人才≥200、律法成文。</div>';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>法院状态</strong></div>
        <div class="stat-value">${world.courtEstablished ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">待建立</span>'}</div>
        <div class="muted">信用评级：${world.creditRating ?? 'B'} / 纠纷率：${formatDecimal((world.disputeRate ?? 0) * 100, 1)}%</div>
      </div>
      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>法官人数</div>
        <input class="gov-config" data-key="judgeCount" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.judgeCount ?? 0)))}" ${!world.courtEstablished ? 'disabled' : ''} />
        <div class="muted">文官占用：${formatNumber(world.adminTalentDeployedCourt ?? 0)}</div>
        <div>法官工资</div>
        <input class="gov-config" data-key="judgeWage" type="number" min="0" step="1" value="${Math.max(0, Number(world.judgeWage ?? 0)).toFixed(0)}" ${!world.courtEstablished ? 'disabled' : ''} />
        <div class="muted">年成本：${formatNumber(world.courtAnnualCost ?? 0)}</div>
      </div>
      <div class="stat-item">
        <div class="muted">法院效率：${formatDecimal(world.courtEfficiency ?? 0, 1)}%</div>
        <div class="muted">效率分解：人才${formatDecimal(world.courtEfficiencyTalent ?? 0, 1)}% / 纸张${formatDecimal(world.courtEfficiencyPaper ?? 0, 1)}% / 编制${formatDecimal(world.courtEfficiencyStaffing ?? 0, 1)}%</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <label>信用评级</label>
          <select class="gov-config-select" data-key="creditRating">
            ${['A','B','C','D'].map((r)=>`<option value="${r}" ${String(world.creditRating ?? 'B')===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
}

function getTaxBureauPanelHtml(world) {
  const unlocked = Boolean(world.taxBureauEstablished) || (Boolean(world.governmentEstablished) && Number(world.adminTalent ?? 0) >= 150 && Boolean(world.householdRegistryActive));
  if (!unlocked) return '<div class="muted">需满足：政府已建立、文官人才≥150、户籍制度启用。</div>';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>税务局状态</strong></div>
        <div class="stat-value">${world.taxBureauEstablished ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">待建立</span>'}</div>
        <div class="muted">税务效率：${formatDecimal(world.taxBureauEfficiency ?? 0, 1)}% / 税收倍率：${formatDecimal((world.taxBureauRevenueMultiplier ?? 1) * 100, 1)}%</div>
      </div>
      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>税务官人数</div>
        <input class="gov-config" data-key="taxOfficerCount" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.taxOfficerCount ?? 0)))}" ${!world.taxBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">文官占用：${formatNumber(world.adminTalentDeployedTax ?? 0)}</div>
        <div>税务官工资</div>
        <input class="gov-config" data-key="taxOfficerWage" type="number" min="0" step="1" value="${Math.max(0, Number(world.taxOfficerWage ?? 0)).toFixed(0)}" ${!world.taxBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">年成本：${formatNumber(world.taxBureauAnnualCost ?? 0)}</div>
        <div>税务技术人才</div>
        <input class="gov-config" data-key="techTalentDeployedTax" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.techTalentDeployedTax ?? 0)))}" ${!world.taxBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">按50%折算编制效率</div>
      </div>
      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>商业税率(0-30%)</div>
        <input class="gov-config" data-key="commerceTaxRate" type="number" min="0" max="0.3" step="0.01" value="${Number(world.commerceTaxRate ?? 0)}" ${!world.taxBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">本年商业税收：${formatNumber(world.commerceTaxRevenue ?? 0)}</div>
        <div>土地税率(0-5/亩)</div>
        <input class="gov-config" data-key="landTaxRate" type="number" min="0" max="5" step="0.1" value="${Number(world.landTaxRate ?? 0)}" ${!world.taxBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">本年土地税收：${formatNumber(world.landTaxRevenue ?? 0)}</div>
      </div>
    </div>
  `;
}

function getTradeBureauPanelHtml(world) {
  const unlocked =
    Boolean(world.tradeBureauEstablished) ||
    (Boolean(world.governmentEstablished) && Number(world.commerceTalent ?? 0) >= 100 && Boolean(world.techBonuses?.newTradePartners));
  if (!unlocked) return '<div class="muted">需满足：政府已建立、商贸人才≥100、远途贸易已完成。</div>';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>贸易管理局状态</strong></div>
        <div class="stat-value">${world.tradeBureauEstablished ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">待建立</span>'}</div>
        <div class="muted">贸易效率加成：${formatDecimal((world.tradeBureauTradeBonus ?? 0) * 100, 1)}% / 进口配额加成：${formatDecimal((world.tradeQuotaBonus ?? 0) * 100, 1)}%</div>
      </div>
      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>贸易官人数</div>
        <input class="gov-config" data-key="tradeOfficerCount" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.tradeOfficerCount ?? 0)))}" ${!world.tradeBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">商贸人才占用：${formatNumber(world.commerceTalentDeployedTrade ?? 0)}</div>
        <div>贸易官工资</div>
        <input class="gov-config" data-key="tradeOfficerWage" type="number" min="0" step="1" value="${Math.max(0, Number(world.tradeOfficerWage ?? 0)).toFixed(0)}" ${!world.tradeBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">年成本：${formatNumber(world.tradeBureauAnnualCost ?? 0)}</div>
      </div>
      <div class="stat-item">
        <div class="muted">效率：${formatDecimal(world.tradeBureauEfficiency ?? 0, 1)}%</div>
        <div class="muted">效率分解：人才${formatDecimal(world.tradeBureauEfficiencyTalent ?? 0, 1)}% / 纸张${formatDecimal(world.tradeBureauEfficiencyPaper ?? 0, 1)}% / 编制${formatDecimal(world.tradeBureauEfficiencyStaffing ?? 0, 1)}%</div>
        <div class="muted">北方商队：${world.newTradePartnerUnlocked ? '已开放' : '未开放'}</div>
      </div>
    </div>
  `;
}

function getEngineeringBureauPanelHtml(world) {
  const unlocked =
    Boolean(world.engineeringBureauEstablished) ||
    (Boolean(world.governmentEstablished) && Number(world.techTalent ?? 0) >= 100 && Boolean(world.techBonuses?.flourProcessing));
  if (!unlocked) return '<div class="muted">需满足：政府已建立、技术人才≥100、水车磨坊已完成。</div>';

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="stat-item">
        <div class="stat-label"><strong>工程局状态</strong></div>
        <div class="stat-value">${world.engineeringBureauEstablished ? '<span style="color:#1b8a3b;font-weight:700;">已建立</span>' : '<span style="color:#b28704;font-weight:700;">待建立</span>'}</div>
        <div class="muted">建设减免：${formatDecimal((world.engineeringConstructionReduction ?? 0) * 100, 1)}% / 开荒效率加成：${formatDecimal((world.engineeringReclaimBonus ?? 0) * 100, 1)}%</div>
      </div>
      <div class="stat-item" style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;align-items:center;">
        <div>工程师人数</div>
        <input class="gov-config" data-key="engineerCount" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(world.engineerCount ?? 0)))}" ${!world.engineeringBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">技术人才占用：${formatNumber(world.techTalentDeployedEngineering ?? 0)}</div>
        <div>工程师工资</div>
        <input class="gov-config" data-key="engineerWage" type="number" min="0" step="1" value="${Math.max(0, Number(world.engineerWage ?? 0)).toFixed(0)}" ${!world.engineeringBureauEstablished ? 'disabled' : ''}/>
        <div class="muted">年成本：${formatNumber(world.engineeringBureauAnnualCost ?? 0)}</div>
      </div>
      <div class="stat-item">
        <div class="muted">效率：${formatDecimal(world.engineeringBureauEfficiency ?? 0, 1)}%</div>
        <div class="muted">效率分解：人才${formatDecimal(world.engineeringBureauEfficiencyTalent ?? 0, 1)}% / 纸张${formatDecimal(world.engineeringBureauEfficiencyPaper ?? 0, 1)}% / 编制${formatDecimal(world.engineeringBureauEfficiencyStaffing ?? 0, 1)}%</div>
        <div class="muted">工程项目：待竣工水渠 ${formatNumber(world.pendingIrrigationCanals ?? 0)} / 已建水渠 ${formatNumber(world.irrigationCanalCount ?? 0)} / 粮仓容量 ${formatNumber(world.grainStorageCapacity ?? 0)}</div>
      </div>
      <div class="stat-item" style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="build-irrigation-canal-btn" ${!world.engineeringBureauEstablished ? 'disabled' : ''}>修建水渠（5,000,000粮）</button>
        <button id="build-wall-reinforcement-btn" ${!world.engineeringBureauEstablished || world.wallReinforced ? 'disabled' : ''}>城墙加固（8,000,000粮）</button>
        <button id="build-granary-expansion-btn" ${!world.engineeringBureauEstablished ? 'disabled' : ''}>粮仓扩建（2,000,000粮）</button>
      </div>
    </div>
  `;
}

function bindGovernmentPanelEvents() {
  document.querySelectorAll('.gov-config').forEach((el) => {
    el.addEventListener('input', () => {
      document.dispatchEvent(new CustomEvent('government:config', {
        detail: { key: el.getAttribute('data-key'), value: Number(el.value ?? 0) }
      }));
    });
  });

  document.querySelectorAll('.gov-toggle').forEach((el) => {
    el.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('government:config', {
        detail: { key: el.getAttribute('data-key'), checked: el.checked }
      }));
    });
  });

  document.querySelectorAll('.gov-config-select').forEach((el) => {
    el.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('government:config', {
        detail: { key: el.getAttribute('data-key'), valueText: el.value }
      }));
    });
  });
}

function bindInterestGroupEvents() {
  document.querySelectorAll('.interest-group-policy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('interest-group:policy', {
        detail: {
          groupId: btn.getAttribute('data-group-id'),
          policyType: btn.getAttribute('data-policy-type') ?? 'appease',
        },
      }));
    });
  });
}

export function renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption) {
  const world = state.world;
  const classes = state.classes ?? world.__classes ?? world;
  const education = state.education ?? world.__education ?? world;
  const mount = document.getElementById('society-tab-content');
  if (!mount) return;

  const stabilityDisplay = getStabilityDisplay(classes.stabilityIndex ?? 80);
  const factors = getClassLifeQualityFactors(world);
  const warnings = getActiveBehaviorWarnings(world);
  const growth = getPopulationGrowthDisplayDetails(world);
  const literacyEffects = getLiteracyEffectsSummary(world);

  const life = (value) => {
    const d = getLifeQualityDisplay(value ?? 50);
    return `<span style="color:${d.color};font-weight:700;">${formatNumber(value ?? 50)}</span> / 100 (${d.label})`;
  };

  mount.innerHTML = `
    <section class="panel"><h2>Stability</h2><div class="tab-grid">
      ${statItem('Stability Index', `<span style="color:${stabilityDisplay.color};font-weight:700;">${formatNumber(classes.stabilityIndex ?? 80)}</span> / 100 (${stabilityDisplay.label})`)}
      ${statItem('Stability Penalty', `-${formatNumber(classes.stabilityPenalty ?? 0)}`)}
      ${statItem('Efficiency Multiplier', `${formatDecimal((classes.efficiencyMultiplier ?? 1) * 100, 1)}%`)}
      ${statItem('Population Growth Rate', `${formatDecimal(growth.effectiveRate * 100, 2)}%`)}
      ${statItem('Growth Modifiers', growth.modifiersText)}
      ${statItem('Policy Intervention', getStabilityPolicyControlsHtml(world))}
    </div></section>

    <section class="panel"><h2>Literacy</h2><div class="tab-grid">
      ${statItem('Overall Literacy', formatLiteracyPercent(world.overallLiteracy ?? 0.05))}
      ${statItem('Farmer Literacy', `${formatLiteracyPercent(world.farmerLiteracy ?? 0.05)} (${literacyEffects.farmer})`)}
      ${statItem('Merchant Literacy', `${formatLiteracyPercent(world.merchantLiteracy ?? 0)} (${literacyEffects.merchant})`)}
      ${statItem('Official Literacy', `${formatLiteracyPercent(world.officialLiteracy ?? 0)} (${literacyEffects.official})`)}
      ${statItem('Worker Literacy', `${formatLiteracyPercent(world.workerLiteracy ?? 0)} (${literacyEffects.worker})`)}
      ${statItem('Literacy Caps (F/M/O/W)', `${formatLiteracyPercent(world.literacyCaps?.farmer ?? 0.15)} / ${formatLiteracyPercent(world.literacyCaps?.merchant ?? 0.4)} / ${formatLiteracyPercent(world.literacyCaps?.official ?? 0.7)} / ${formatLiteracyPercent(world.literacyCaps?.worker ?? 0.2)}`)}
      ${statItem('Class Population (F/M/O/W)', `${formatNumber(world.farmerPopulation ?? 0)} / ${formatNumber(world.merchantPopulation ?? 0)} / ${formatNumber(world.officialPopulation ?? 0)} / ${formatNumber(world.workerPopulation ?? 0)}`)}
      ${statItem('Graduates (P/S/H)', `${formatNumber(world.primaryGraduates ?? 0)} / ${formatNumber(world.secondaryGraduates ?? 0)} / ${formatNumber(world.higherGraduates ?? 0)}`)}
      ${statItem('Annual Grads (P/S/H)', `${formatNumber(world.annualPrimaryGrads ?? 0)} / ${formatNumber(world.annualSecondaryGrads ?? 0)} / ${formatNumber(world.annualHigherGrads ?? 0)}`)}
      ${statItem('Current Enrollment (P/S/H)', `${formatNumber(education.primaryEnrolled ?? 0)} / ${formatNumber(education.secondaryEnrolled ?? 0)} / ${formatNumber(education.higherEnrolled ?? 0)}`)}
      ${statItem('Higher School Unlock', world.higherSchoolUnlocked ? 'Unlocked' : 'Locked')}
    </div></section>

    <section class="panel"><h2>Pop Overview</h2>${getPopPanelHtml(state)}</section>
    <section class="panel"><h2>Interest Groups</h2>${getInterestGroupsPanelHtml(state)}</section>

    <section class="panel"><h2>Professional Talent Pool</h2><div class="tab-grid">
      ${statItem('Admin Talent (Total / Deployed / Available)', `${formatTalent(world.adminTalent ?? 0)} / ${formatTalent(world.adminTalentDeployed ?? 0)} / ${formatTalent(Math.max(0, (world.adminTalent ?? 0) - (world.adminTalentDeployed ?? 0)))}`)}
      ${statItem('Commerce Talent (Total / Deployed / Available)', `${formatTalent(world.commerceTalent ?? 0)} / ${formatTalent(world.commerceTalentDeployed ?? 0)} / ${formatTalent(Math.max(0, (world.commerceTalent ?? 0) - (world.commerceTalentDeployed ?? 0)))}`)}
      ${statItem('Tech Talent (Total / Deployed / Available)', `${formatTalent(world.techTalent ?? 0)} / ${formatTalent(world.techTalentDeployed ?? 0)} / ${formatTalent(Math.max(0, (world.techTalent ?? 0) - (world.techTalentDeployed ?? 0)))}`)}
      ${statItem('Admin Milestones', `≥10 基础官署 / ≥50 政策执行+10% / ≥100 警务前置 / ≥200 司法前置`)}
      ${statItem('Commerce Milestones', `≥10 钱庄效率+5% / ≥50 商业效率+5% / ≥100 商贸署前置`)}
      ${statItem('Tech Milestones', `≥10 研发速度+10% / ≥50 农业效率+3% / ≥100 工程署前置`)}
      ${statItem('Institution Prereq: Basic Government', getTalentUnlockText(Boolean(world.institutionPrereqBasicGov)))}
      ${statItem('Institution Prereq: Police', getTalentUnlockText(Boolean(world.institutionPrereqPolice)))}
      ${statItem('Institution Prereq: Court', getTalentUnlockText(Boolean(world.institutionPrereqCourt)))}
      ${statItem('Institution Prereq: Trade Bureau', getTalentUnlockText(Boolean(world.institutionPrereqTradeBureau)))}
      ${statItem('Institution Prereq: Engineering Bureau', getTalentUnlockText(Boolean(world.institutionPrereqEngineeringBureau)))}
      ${statItem('Talent Deployment Controls', getTalentControlsHtml(world))}
    </div></section>

    <section class="panel"><h2>Government Institution</h2>${getGovernmentPanelHtml(world)}</section>
    <section class="panel"><h2>Police Bureau</h2>${getPolicePanelHtml(world)}</section>
    <section class="panel"><h2>Health Bureau</h2>${getHealthPanelHtml(world)}</section>
    <section class="panel"><h2>Court</h2>${getCourtPanelHtml(world)}</section>
    <section class="panel"><h2>Tax Bureau</h2>${getTaxBureauPanelHtml(world)}</section>
    <section class="panel"><h2>Trade Bureau</h2>${getTradeBureauPanelHtml(world)}</section>
    <section class="panel"><h2>Engineering Bureau</h2>${getEngineeringBureauPanelHtml(world)}</section>
    <section class="panel"><h2>School System</h2>${getSchoolControlsHtml(world)}</section>
    <section class="panel"><h2>Bureaucracy Policies</h2>${getBureaucracyPolicyControlsHtml(world)}</section>
    <section class="panel"><h2>Land Rent</h2>${getLandRentControlsHtml(world)}</section>
    <section class="panel"><h2>Moneylender Policy</h2>${getMoneylenderPolicyControlsHtml(world)}</section>
    <section class="panel"><h2>Class Life Quality</h2><div class="tab-grid">
      ${statItem('Farmer Life Quality', life(classes.farmerLifeQuality ?? classes.farmerSatisfaction))}
      ${statItem('Farmer Savings Rate', `${formatDecimal((classes.farmerSavingsRate ?? 0) * 100, 2)}%`)}
      ${statItem('Farmer Savings Pool', formatNumber(classes.farmerSavings ?? 0))}
      ${statItem('Farmer Factors', factors.farmer)}

      ${statItem('Merchant Life Quality', life(classes.merchantLifeQuality ?? classes.merchantSatisfaction))}
      ${statItem('Merchant Savings Rate', `${formatDecimal((classes.merchantSavingsRate ?? 0) * 100, 2)}%`)}
      ${statItem('Merchant Savings Pool', formatNumber(classes.merchantSavings ?? 0))}
      ${statItem('Merchant Factors', factors.merchant)}

      ${statItem('Official Life Quality', life(classes.officialLifeQuality ?? classes.officialSatisfaction))}
      ${statItem('Official Savings Rate', `${formatDecimal((classes.officialSavingsRate ?? 0) * 100, 2)}%`)}
      ${statItem('Official Savings Pool', formatNumber(classes.officialSavings ?? 0))}
      ${statItem('Official Factors', factors.official)}

      <!-- landlord panel disabled -->
      ${statItem('Inequality (Gini Ratio proxy)', formatDecimal(world.giniRatio ?? 0, 2))}
      ${statItem('Living Cost (Total)', formatDecimal(world.totalLivingCost ?? 0, 2))}
      ${statItem('Living Cost Breakdown', `Grain 360 + Salt ${formatDecimal((world.saltPrice ?? 4) * 15, 2)} + Cloth ${formatDecimal((world.clothPrice ?? 2) * 0.3, 2)}`)}
      ${statItem('Price Pressure', `Salt affordability ${formatDecimal(world.saltAffordability ?? (world.saltPrice ?? 4) / 4, 2)} / Cloth affordability ${formatDecimal(world.clothAffordability ?? (world.clothPrice ?? 2) / 2, 2)}`)}
    </div></section>
    <section class="panel"><h2>Behavior Warnings</h2>${warnings.length ? warnings.map((w) => `<div class="stat-item"><div class="stat-value">⚠️ ${w}</div></div>`).join('') : '<div class="muted">No active behavior warnings</div>'}</section>
    <section class="panel"><h2>Credit Crisis</h2>${getCreditCrisisControlsHtml(world)}</section>
  `;

  const wrappedGrainRedistribution = () => {
    const beforeUsed = Boolean(state.world.grainRedistributionUsed);
    onUseGrainRedistribution();
    if (!beforeUsed && state.world.grainRedistributionUsed) {
      classes.farmerIncomePool = Math.max(0, Number(classes.farmerIncomePool ?? 0) + GRAIN_REDISTRIBUTION_COST);
    }
  };

  const wrappedMerchantTax = () => {
    onUseMerchantTax();
  };

  bindStabilityPolicyEvents(wrappedGrainRedistribution, wrappedMerchantTax);
  bindBureaucracyPolicyEvents(state, () => renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption));
  bindCreditCrisisEvents(onEmergencyRecirculation, onEmergencyRedemption);
  bindLandRentEvents(state);
  bindMoneylenderPolicyEvents(state);
  bindSchoolEvents(state);
  bindGovernmentPanelEvents();
  bindInterestGroupEvents();
  const canalBtn = document.getElementById('build-irrigation-canal-btn');
  const wallBtn = document.getElementById('build-wall-reinforcement-btn');
  const granaryBtn = document.getElementById('build-granary-expansion-btn');
  canalBtn?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('engineering:project', { detail: { type: 'canal' } })));
  wallBtn?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('engineering:project', { detail: { type: 'wall' } })));
  granaryBtn?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('engineering:project', { detail: { type: 'granary' } })));
  bindTalentEvents(state, () => renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption));
}
