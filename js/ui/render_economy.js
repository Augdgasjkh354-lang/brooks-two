import { formatNumber, formatDecimal, statItem } from './render_world.js';
import { previewOfficialSaltSale } from '../economy/market.js';
import { getInflationDisplay } from './render_society.js';
import { canUseMoneylenderSystem } from '../economy/commerce.js';


function getFiscal(stateOrWorld) {
  return stateOrWorld?.fiscal ?? stateOrWorld?.__fiscal ?? stateOrWorld;
}

function getMonetary(stateOrWorld) {
  return stateOrWorld?.monetary ?? stateOrWorld?.__monetary ?? stateOrWorld;
}


export function renderCouponDenominationBreakdown(world) {
  const breakdown = world.lastCouponDenominationBreakdown ?? [];
  if (breakdown.length === 0 || (world.lastCouponIssueAmount ?? 0) <= 0) {
    return 'No issuance yet.';
  }
  return breakdown.map((item) => `${item.label} × ${formatNumber(item.count)}`).join(' | ');
}

export function renderRatioValue(value) {
  const grainPercent = Math.round((value ?? 0) * 100);
  const couponPercent = 100 - grainPercent;
  return `Grain ${grainPercent}% / Coupon ${couponPercent}%`;
}

export function getCouponRatioControlsHtml(world) {
  const fiscal = getFiscal(world);
  return `
    <div class="coupon-controls" style="display: block; margin-top: 12px;">
      <label for="tax-grain-ratio-input">Tax Collection Mix</label>
      <input id="tax-grain-ratio-input" type="range" min="0" max="1" step="0.05" value="${fiscal.taxGrainRatio ?? 1}" />
      <div id="tax-grain-ratio-value" class="muted">${renderRatioValue(fiscal.taxGrainRatio ?? 1)}</div>
    </div>
    <div class="coupon-controls" style="display: block; margin-top: 12px;">
      <label for="salary-grain-ratio-input">Official Salary Mix</label>
      <input id="salary-grain-ratio-input" type="range" min="0" max="1" step="0.05" value="${fiscal.salaryGrainRatio ?? 1}" />
      <div id="salary-grain-ratio-value" class="muted">${renderRatioValue(fiscal.salaryGrainRatio ?? 1)}</div>
    </div>
  `;
}

export function bindCouponRatioEvents(state) {
  const taxInput = document.getElementById('tax-grain-ratio-input');
  const taxValue = document.getElementById('tax-grain-ratio-value');
  if (taxInput && taxValue) {
    taxInput.oninput = () => {
      const nextValue = Math.max(0, Math.min(1, Number(taxInput.value)));
      getFiscal(state).taxGrainRatio = nextValue;
      taxValue.textContent = renderRatioValue(nextValue);
    };
  }

  const salaryInput = document.getElementById('salary-grain-ratio-input');
  const salaryValue = document.getElementById('salary-grain-ratio-value');
  if (salaryInput && salaryValue) {
    salaryInput.oninput = () => {
      const nextValue = Math.max(0, Math.min(1, Number(salaryInput.value)));
      getFiscal(state).salaryGrainRatio = nextValue;
      salaryValue.textContent = renderRatioValue(nextValue);
    };
  }
}

export function getSaltImportControlsHtml(world, xikou) {
  const monetary = getMonetary(world);
  const maxQuota = Math.max(0, Math.floor((xikou?.saltOutputJin ?? 0) * 0.5));
  const currentQuota = Math.max(0, Math.floor(monetary.saltImportQuota ?? 0));
  const clampedQuota = Math.min(currentQuota, maxQuota);
  const estimatedCost = Math.round(clampedQuota * (monetary.saltPrice ?? 4));
  const canAfford = world.grainCouponsUnlocked ? (monetary.couponTreasury ?? 0) >= estimatedCost : (world.grainTreasury ?? 0) >= estimatedCost;
  const currencyLabel = world.grainCouponsUnlocked ? 'coupon' : 'grain';

  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div class="muted">年度进口上限（溪口可供一半）：${formatNumber(maxQuota)} 斤</div>
      <input id="salt-import-quota-input" type="number" min="0" step="1000" max="${maxQuota}" value="${clampedQuota}" />
      <div class="muted">预计执行进口：${formatNumber(clampedQuota)} 斤</div>
      <div class="muted">预计成本：${formatNumber(estimatedCost)} ${currencyLabel}</div>
      <div class="muted">${canAfford ? '当前可支付该成本' : '⚠️ 当前资金不足，年度将无法执行该额度进口'}</div>
    </div>
  `;
}

export function bindSaltImportQuotaEvents(state) {
  const quotaInput = document.getElementById('salt-import-quota-input');
  if (!quotaInput) return;
  quotaInput.addEventListener('input', () => {
    const maxQuota = Number(quotaInput.max || 0);
    const nextValue = Math.max(0, Math.floor(Number(quotaInput.value || 0)));
    state.monetary.saltImportQuota = Math.min(nextValue, Math.max(0, maxQuota));
  });
}

export function getOfficialSaltSaleControlsHtml(world) {
  const monetary = getMonetary(world);
  const marketPrice = Number(monetary.saltPrice ?? 0);
  const reserve = Math.max(0, Math.floor(Number(monetary.saltReserve ?? 0)));
  const usedThisYear = !!monetary.officialSaltSaleUsed;
  const defaultPrice = Number(monetary.officialSaltPrice ?? marketPrice);
  const defaultAmount = Math.floor(Number(monetary.officialSaltAmount ?? 1000));
  const preview = previewOfficialSaltSale(world, defaultPrice, defaultAmount);
  const canSell = reserve >= 1000 && !usedThisYear;

  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div class="muted">当前市场盐价：${formatDecimal(marketPrice, 2)}</div>
      <div class="muted">政府可投放盐储备：${formatNumber(reserve)} 斤</div>
      <label for="official-salt-price-input">官府放盐价格（不得高于市场价）</label>
      <input id="official-salt-price-input" type="number" min="0" step="0.1" max="${formatDecimal(marketPrice, 2)}" value="${formatDecimal(preview.cappedPrice, 2)}" />
      <label for="official-salt-amount-input">官府放盐数量（最低1000斤）</label>
      <input id="official-salt-amount-input" type="number" min="1000" step="1000" max="${reserve}" value="${Math.max(1000, Math.min(preview.cappedAmount || 1000, reserve || 1000))}" />
      <div id="official-salt-preview" class="muted">
        预计收入：${formatNumber(Math.round(preview.revenue))} ${world.grainCouponsUnlocked ? 'coupon' : 'grain'} |
        预计补贴成本：${formatNumber(Math.round(preview.subsidyLoss))} |
        投放占年需求：${formatDecimal(preview.releaseRatio * 100, 1)}% |
        预计投放后盐价：${formatDecimal(preview.nextSaltPrice, 2)}
      </div>
      <button id="official-salt-sale-btn" ${canSell ? '' : 'disabled'}>
        ${usedThisYear ? '本年已执行官府放盐' : reserve < 1000 ? '盐储备不足1000，无法投放' : '执行官府放盐'}
      </button>
    </div>
  `;
}

export function bindOfficialSaltSaleEvents(state, onOfficialSaltSale) {
  const priceInput = document.getElementById('official-salt-price-input');
  const amountInput = document.getElementById('official-salt-amount-input');
  const previewEl = document.getElementById('official-salt-preview');
  const button = document.getElementById('official-salt-sale-btn');

  const refreshPreview = () => {
    if (!priceInput || !amountInput || !previewEl) return;
    const monetary = getMonetary(state);
    const marketPrice = Number(monetary.saltPrice ?? 0);
    const reserve = Math.max(0, Math.floor(Number(monetary.saltReserve ?? 0)));
    const inputPrice = Number(priceInput.value ?? 0);
    const inputAmount = Number(amountInput.value ?? 0);
    const preview = previewOfficialSaltSale(state.world, inputPrice, inputAmount);

    if (inputPrice > marketPrice) priceInput.value = String(marketPrice);
    if (inputAmount > reserve) amountInput.value = String(reserve);

    previewEl.textContent = `预计收入：${formatNumber(Math.round(preview.revenue))} ${state.world.grainCouponsUnlocked ? 'coupon' : 'grain'} | 预计补贴成本：${formatNumber(Math.round(preview.subsidyLoss))} | 投放占年需求：${formatDecimal(preview.releaseRatio * 100, 1)}% | 预计投放后盐价：${formatDecimal(preview.nextSaltPrice, 2)}`;
  };

  priceInput?.addEventListener('input', refreshPreview);
  amountInput?.addEventListener('input', refreshPreview);
  if (button && typeof onOfficialSaltSale === 'function') button.addEventListener('click', onOfficialSaltSale);
}

export function getLandDevelopmentControlsHtml(world) {
  const defaultHempMu = 100;
  const defaultMulberryMu = 100;
  const reduction = Math.max(0, Math.min(0.15, Number(world?.constructionCostReduction ?? 0)));
  const hempCostPerMu = 8 * (1 - reduction);
  const mulberryCostPerMu = 15 * (1 - reduction);

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div class="muted">燃料减免：${formatDecimal(reduction * 100, 1)}%（当前预估）</div>
      <div>
        <div><strong>开垦麻田</strong>（最低100亩，基准8粮/亩，次年生效）</div>
        <input id="hemp-land-input" type="number" min="100" step="100" value="${defaultHempMu}" />
        <div class="muted" data-role="hemp-cost">预计成本：${formatNumber(defaultHempMu * hempCostPerMu)} 粮（折后）</div>
        <button id="open-hemp-land-btn">确认开垦麻田</button>
      </div>
      <div>
        <div><strong>开垦桑田</strong>（最低100亩，基准15粮/亩，2年后首收）</div>
        <input id="mulberry-land-input" type="number" min="100" step="100" value="${defaultMulberryMu}" />
        <div class="muted" data-role="mulberry-cost">预计成本：${formatNumber(defaultMulberryMu * mulberryCostPerMu)} 粮（折后）</div>
        <button id="open-mulberry-land-btn">确认开垦桑田</button>
      </div>
    </div>
  `;
}

export function bindLandDevelopmentEvents(world, onOpenHempLand, onOpenMulberryLand) {
  const hempInput = document.getElementById('hemp-land-input');
  const hempButton = document.getElementById('open-hemp-land-btn');
  const mulberryInput = document.getElementById('mulberry-land-input');
  const mulberryButton = document.getElementById('open-mulberry-land-btn');

  const reduction = Math.max(0, Math.min(0.15, Number(world?.constructionCostReduction ?? 0)));
  const hempCostPerMu = 8 * (1 - reduction);
  const mulberryCostPerMu = 15 * (1 - reduction);

  if (hempInput) {
    hempInput.addEventListener('input', () => {
      const costEl = hempInput.parentElement?.querySelector('[data-role="hemp-cost"]');
      const mu = Math.max(0, Math.floor(Number(hempInput.value || 0)));
      if (costEl) costEl.textContent = `预计成本：${formatNumber(mu * hempCostPerMu)} 粮（折后）`;
    });
  }

  if (mulberryInput) {
    mulberryInput.addEventListener('input', () => {
      const costEl = mulberryInput.parentElement?.querySelector('[data-role="mulberry-cost"]');
      const mu = Math.max(0, Math.floor(Number(mulberryInput.value || 0)));
      if (costEl) costEl.textContent = `预计成本：${formatNumber(mu * mulberryCostPerMu)} 粮（折后）`;
    });
  }

  if (hempButton && typeof onOpenHempLand === 'function') hempButton.addEventListener('click', onOpenHempLand);
  if (mulberryButton && typeof onOpenMulberryLand === 'function') mulberryButton.addEventListener('click', onOpenMulberryLand);
}



function getMoneylenderControlsHtml(world) {
  const monetary = getMonetary(world);
  const fiscal = getFiscal(world);
  const enabled = canUseMoneylenderSystem(world);
  const cap = Math.max(0, Number(world.shopCount ?? 0));
  const approved = Math.max(0, Math.min(cap, Number(monetary.approvedMoneylenders ?? 0)));
  const borrowCap = Math.max(0, Math.floor((monetary.lendingPoolSize ?? 0) * 0.5));

  if (!enabled) {
    return `<div class="muted">钱庄系统未启用（需要：钱庄技术 + 造纸术官僚体系 + 商铺≥10）。</div>`;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label for="approved-moneylenders-input">Licensed Moneylenders (max ${formatNumber(cap)})</label>
      <input id="approved-moneylenders-input" type="number" min="0" max="${cap}" step="1" value="${Math.floor(approved)}" />
      <button id="approve-moneylenders-btn">Apply Licenses</button>
      <div class="muted">License fee per shop: ${formatNumber(Math.floor(monetary.licenseFee ?? 5000000))} ${world.grainCouponsUnlocked ? 'coupon' : 'grain'}</div>
      <label for="government-borrow-input">Government Borrow Amount (max per action ${formatNumber(borrowCap)})</label>
      <input id="government-borrow-input" type="number" min="0" step="100000" max="${borrowCap}" value="0" />
      <button id="government-borrow-btn" ${borrowCap <= 0 ? 'disabled' : ''}>Borrow from Lending Pool</button>
      <label for="annual-repayment-input">Annual Debt Repayment</label>
      <input id="annual-repayment-input" type="number" min="0" step="100000" value="${Math.floor(fiscal.annualRepayment ?? 0)}" />
      <div class="muted">Debt currency: ${(monetary.governmentDebtCurrency === 'grain') ? 'grain' : 'coupon'} | Interest due this year: ${formatNumber(Math.round(monetary.governmentDebtInterest ?? 0))}</div>
    </div>
  `;
}

function bindMoneylenderEconomyEvents(state) {
  const approvedInput = document.getElementById('approved-moneylenders-input');
  const approveBtn = document.getElementById('approve-moneylenders-btn');
  const borrowInput = document.getElementById('government-borrow-input');
  const borrowBtn = document.getElementById('government-borrow-btn');
  const repaymentInput = document.getElementById('annual-repayment-input');

  if (repaymentInput) {
    repaymentInput.addEventListener('input', () => {
      const val = Math.max(0, Math.floor(Number(repaymentInput.value || 0)));
      state.fiscal.annualRepayment = val;
    });
  }

  if (approveBtn && approvedInput) {
    approveBtn.addEventListener('click', () => {
      const target = Math.max(0, Math.floor(Number(approvedInput.value || 0)));
      document.dispatchEvent(new CustomEvent('moneylender:approve', { detail: { target } }));
    });
  }

  if (borrowBtn && borrowInput) {
    borrowBtn.addEventListener('click', () => {
      const amount = Math.max(0, Math.floor(Number(borrowInput.value || 0)));
      document.dispatchEvent(new CustomEvent('moneylender:borrow', { detail: { amount } }));
    });
  }
}

function getTradePolicyControlsHtml(world) {
  if (!world.tradeBureauEstablished) {
    return '<div class="muted">需先建立贸易管理局后可调整贸易政策。</div>';
  }

  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <label><input id="trade-protect-local-cloth" type="checkbox" ${world.protectLocalCloth ? 'checked' : ''}/> 启用贸易保护（布匹进口上限=本地产量30%）</label>
      <div class="muted">当前保护上限系数：${formatDecimal((world.tradeProtectionQuotaCapRatio ?? 1) * 100, 1)}%</div>

      <label for="trade-subsidy-rate">贸易补贴率：${formatDecimal((getFiscal(world).subsidyRate ?? 0) * 100, 1)}%</label>
      <input id="trade-subsidy-rate" type="range" min="0" max="0.2" step="0.01" value="${Math.max(0, Math.min(0.2, Number(getFiscal(world).subsidyRate ?? 0)))}" />
      <div id="trade-subsidy-rate-value" class="muted">预计补贴率：${formatDecimal((getFiscal(world).subsidyRate ?? 0) * 100, 1)}%</div>

      <label><input id="trade-monopoly-granted" type="checkbox" ${world.tradeMonopolyGranted ? 'checked' : ''}/> 授予专营权（商业收益+20%，其他商人满意度下降）</label>
      <div class="muted">补贴已支出：${formatNumber(world.tradeSubsidyCost ?? 0)}</div>
    </div>
  `;
}

function bindTradePolicyEvents(state) {
  const protect = document.getElementById('trade-protect-local-cloth');
  const subsidy = document.getElementById('trade-subsidy-rate');
  const subsidyText = document.getElementById('trade-subsidy-rate-value');
  const monopoly = document.getElementById('trade-monopoly-granted');

  protect?.addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('trade:config', { detail: { key: 'protectLocalCloth', checked: protect.checked } }));
  });

  subsidy?.addEventListener('input', () => {
    const next = Math.max(0, Math.min(0.2, Number(subsidy.value ?? 0)));
    if (subsidyText) subsidyText.textContent = `预计补贴率：${formatDecimal(next * 100, 1)}%`;
    document.dispatchEvent(new CustomEvent('trade:config', { detail: { key: 'subsidyRate', value: next } }));
  });

  monopoly?.addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('trade:config', { detail: { key: 'tradeMonopolyGranted', checked: monopoly.checked } }));
  });
}

export function renderEconomyTab(state) {
  const world = state.world;
  const fiscal = getFiscal(state);
  const monetary = getMonetary(state);
  const mount = document.getElementById('economy-tab-content');
  if (!mount) return;

  const demandSaturationPercent = (world.demandSaturation ?? 0) * 100;
  const commerceEfficiencyRate = (world.demandSaturation ?? 0) > 1 ? 1 / (world.demandSaturation ?? 1) : 1;
  const commerceActivityBonus = world.commerceActivityBonus ?? 1;

  mount.innerHTML = `
    <section class="panel"><h2>GDP</h2><div class="tab-grid">
      ${statItem('Agriculture GDP', formatNumber(world.agricultureGDP ?? 0))}
      ${statItem('Commerce GDP', formatNumber(world.commerceGDP ?? 0))}
      ${statItem('Construction GDP', formatNumber(world.constructionGDP ?? 0))}
      ${statItem('GDP Estimate', formatNumber(world.gdpEstimate ?? 0))}
    </div></section>
    <section class="panel"><h2>Commerce</h2><div class="tab-grid">
      ${statItem('Shop Count', formatNumber(world.shopCount ?? 0))}
      ${statItem('Operating / Idle Shops', `${formatNumber(world.operatingShops ?? 0)} / ${formatNumber(world.idleShops ?? 0)}`)}
      ${statItem('Shop Worker Demand', formatNumber(world.commerceLaborDemand ?? 0))}
      ${statItem('Available Commerce Labor', formatNumber(world.availableCommerceLabor ?? 0))}
      ${statItem('Merchant Count', formatNumber(world.merchantCount ?? 0))}
      ${statItem('Demand Saturation', `${formatDecimal(demandSaturationPercent, 1)}%`)}
      ${statItem('Commerce Efficiency Rate', `${formatDecimal(commerceEfficiencyRate * 100, 1)}%`)}
      ${statItem('Commerce Activity Bonus', `${formatDecimal(commerceActivityBonus * 100, 1)}%`)}
      ${statItem('Farmer Income / Head', formatDecimal(world.farmerIncomePerHead ?? 0, 2))}
      ${statItem('Merchant Income / Head', formatDecimal(world.merchantIncomePerHead ?? 0, 2))}
      ${statItem('Income Gap', formatDecimal(world.incomeGap ?? 0, 2))}
      ${statItem('Trade Efficiency', `${formatDecimal((world.tradeEfficiency ?? 0) * 100, 1)}%`)}
      ${statItem('Trade Bureau Bonus', `${formatDecimal((world.tradeBureauTradeBonus ?? 0) * 100, 1)}%`)}
      ${statItem('Trade Partner', world.newTradePartnerUnlocked ? '北方商队已开放' : '未开放')}
    </div></section>
    <section class="panel"><h2>Trade Policies</h2>${getTradePolicyControlsHtml(world)}</section>
    <section class="panel"><h2>Moneylender & Debt</h2><div class="tab-grid">
      ${statItem('Moneylender Shops', formatNumber(monetary.moneylenderShops ?? 0))}
      ${statItem('Lending Pool Size', formatNumber(monetary.lendingPoolSize ?? 0))}
      ${statItem('Moneylender GDP', formatNumber(monetary.moneylenderGDP ?? 0))}
      ${statItem('Government Debt', formatNumber(monetary.governmentDebt ?? 0))}
      ${statItem('Debt Interest Due', formatNumber(monetary.governmentDebtInterest ?? 0))}
      ${statItem('Civilian Lending Accumulator', formatNumber(world.civilianLendingAccumulator ?? 0))}
      ${statItem('Controls', getMoneylenderControlsHtml(world))}
    </div></section>
  `;

  bindMoneylenderEconomyEvents(state);
  bindTradePolicyEvents(state);
}

export function renderAgricultureTab(state, onOpenHempLand, onOpenMulberryLand) {
  const world = state.world;
  const land = state.land ?? world;
  const agriculture = state.agriculture ?? world;
  const mount = document.getElementById('agriculture-tab-content');
  if (!mount) return;

  mount.innerHTML = `
    <section class="panel"><h2>Grain Output</h2><div class="tab-grid">
      ${statItem('Potential Grain Output', formatNumber(agriculture.potentialGrainOutput ?? 0))}
      ${statItem('Actual Grain Output', formatNumber(agriculture.actualGrainOutput ?? 0))}
      ${statItem('Lost Grain Output', formatNumber(agriculture.lostGrainOutput ?? 0))}
      ${statItem('Yield / mu (effective)', formatNumber(agriculture.grainYieldPerMu ?? 0))}
      ${statItem('Farmland Area (mu)', formatNumber(land.farmlandAreaMu ?? 0))}
    </div></section>
    <section class="panel"><h2>Land & Fiber</h2><div class="tab-grid">
      ${statItem('Hemp / Mulberry Land', `${formatNumber(land.hempLandMu ?? 0)} / ${formatNumber(land.mulberryLandMu ?? 0)} 亩`)}
      ${statItem('Pending (Hemp / Mulberry)', `${formatNumber(land.pendingHempLandMu ?? 0)} / ${formatNumber(land.pendingMulberryLandMu ?? 0)} 亩`)}
      ${statItem('Cloth Output (Coarse/Fine)', `${formatNumber(agriculture.coarseClothOutput ?? 0)} / ${formatNumber(agriculture.fineClothOutput ?? 0)}`)}
      ${statItem('Silkworm Dung (Own/Imported/Total)', `${formatNumber(agriculture.playerSilkwormDung ?? 0)} / ${formatNumber(agriculture.importedDung ?? 0)} / ${formatNumber(agriculture.totalDung ?? 0)}`)}
      ${statItem('Dung Coverage', `${formatDecimal((agriculture.dungCoverage ?? 0) * 100, 1)}%`)}
      ${statItem('Fertilizer Bonus', `${formatDecimal(((agriculture.fertilizerBonus ?? 1) - 1) * 100, 1)}%`)}
    </div></section>
    <section class="panel"><h2>Hemp Byproducts</h2><div class="tab-grid">
      ${statItem('Paper Material / Year', `${formatNumber(world.paperMaterial ?? 0)} 斤`)}
      ${statItem('Paper Material Reserve', `${formatNumber(agriculture.paperMaterialReserve ?? 0)} 斤`)}
      ${statItem('Paper Output', formatDecimal(agriculture.paperOutput ?? 0, 1))}
      ${statItem('Hemp Stalk Fuel / Year', `${formatNumber(world.hempStalks ?? 0)} 斤`)}
      ${statItem('Building Fiber / Year', `${formatNumber(world.buildingFiber ?? 0)} 斤`)}
      ${statItem('Building Fiber Reserve', `${formatNumber(agriculture.buildingFiberReserve ?? 0)} 斤`)}
      ${statItem('Construction Cost Reduction', `${formatDecimal((agriculture.constructionCostReduction ?? 0) * 100, 1)}%`)}
      ${statItem('Structural Bonus', agriculture.structuralBonus ? 'Active (+2% labor output)' : 'Inactive')}
      ${statItem('Labor Efficiency', `${formatDecimal((agriculture.laborEfficiency ?? 1) * 100, 1)}%`)}
    </div></section>
    <section class="panel"><h2>Land Reclamation</h2>${getLandDevelopmentControlsHtml(world)}</section>
  `;

  bindLandDevelopmentEvents(world, onOpenHempLand, onOpenMulberryLand);
}

export function renderCurrencyTab(state, onOfficialSaltSale) {
  const world = state.world;
  const agriculture = state.agriculture ?? world;
  const privateSector = state.privateSector ?? world.__privateSector ?? world.privateSector ?? {};
  const mount = document.getElementById('currency-tab-content');
  if (!mount) return;

  const monetary = getMonetary(state);
  const fiscal = getFiscal(state);
  const inflationDisplay = getInflationDisplay(monetary.inflationRate ?? 0);
  const ledger = world.ledger ?? state.ledger ?? {};
  const ledgerHistory = state.ledgerHistory ?? [];
  const netColor = Number(ledger.netBalance ?? 0) >= 0 ? '#1b8a3d' : '#b42318';
  mount.innerHTML = `
    <section class="panel"><h2>Treasury</h2><div class="tab-grid">
      ${statItem('Grain Treasury', formatNumber(agriculture.grainTreasury ?? 0))}
      ${statItem('Coupon Treasury', formatNumber(monetary.couponTreasury ?? 0))}
      ${statItem('Coupon Circulating', formatNumber(monetary.couponCirculating ?? 0))}
      ${statItem('Tax Ratio', renderRatioValue(fiscal.taxGrainRatio ?? 1))}
      ${statItem('Salary Ratio', renderRatioValue(fiscal.salaryGrainRatio ?? 1))}
    </div></section>
    <section class="panel"><h2>Private Sector Assets</h2><div class="tab-grid">
      ${statItem('Farmer Grain', formatNumber(privateSector.farmerGrain ?? 0))}
      ${statItem('Farmer Coupons', formatNumber(privateSector.farmerCoupons ?? 0))}
      ${statItem('Merchant Goods', formatNumber(privateSector.merchantGoods ?? 0))}
      ${statItem('Merchant Coupons', formatNumber(privateSector.merchantCoupons ?? 0))}
      ${statItem('Private Grain Total', formatNumber(privateSector.totalPrivateGrain ?? 0))}
      ${statItem('Private Coupon Total', formatNumber(privateSector.totalPrivateCoupons ?? 0))}
    </div></section>
    <section class="panel"><h2>Inflation</h2><div class="tab-grid">
      ${statItem('Backing Ratio', formatDecimal(monetary.backingRatio ?? 1, 2))}
      ${statItem('Inflation Rate', `<span style="color:${inflationDisplay.color};font-weight:700;">${formatDecimal((monetary.inflationRate ?? 0) * 100, 1)}%</span>`)}
      ${statItem('Credit Crisis', monetary.creditCrisis ? 'Active' : 'None')}
    </div></section>
    <section class="panel"><h2>Salt Policy</h2>
      ${getOfficialSaltSaleControlsHtml(world)}
    </section>
    <section class="panel"><h2>Annual Account Ledger（年度账本）</h2><div class="tab-grid">
      ${statItem('Gov Income: Tax/Rent/Commerce/Land', `${formatNumber(ledger.taxRevenue ?? 0)} / ${formatNumber(ledger.rentRevenue ?? 0)} / ${formatNumber(ledger.commerceTaxRevenue ?? 0)} / ${formatNumber(ledger.landTaxRevenue ?? 0)}`)}
      ${statItem('Gov Income: Moneylender/CouponTax/Trade/Debt', `${formatNumber(ledger.moneylenderTaxRevenue ?? 0)} / ${formatNumber(ledger.couponTaxRevenue ?? 0)} / ${formatNumber(ledger.tradeRevenue ?? 0)} / ${formatNumber(ledger.debtBorrowed ?? 0)}`)}
      ${statItem('Gov Expense: Wage/Research/Construction/Education', `${formatNumber(ledger.wageBill ?? 0)} / ${formatNumber(ledger.researchCost ?? 0)} / ${formatNumber(ledger.constructionCost ?? 0)} / ${formatNumber(ledger.educationCost ?? 0)}`)}
      ${statItem('Gov Expense: Import/Subsidy/Repayment/Interest', `${formatNumber(ledger.importCost ?? 0)} / ${formatNumber(ledger.subsidyCost ?? 0)} / ${formatNumber(ledger.debtRepayment ?? 0)} / ${formatNumber(ledger.debtInterest ?? 0)}`)}
      ${statItem('Gov Total Income', formatNumber(ledger.totalIncome ?? 0))}
      ${statItem('Gov Total Expense', formatNumber(ledger.totalExpense ?? 0))}
      ${statItem('Gov Net Balance', `<span style="color:${netColor};font-weight:700;">${formatNumber(ledger.netBalance ?? 0)}</span>`)}
      ${statItem('Farmer G/T/N/Consume/SaveΔ', `${formatNumber(ledger.farmerGrossIncome ?? 0)} / ${formatNumber(ledger.farmerTaxPaid ?? 0)} / ${formatNumber(ledger.farmerNetIncome ?? 0)} / ${formatNumber(ledger.farmerConsumption ?? 0)} / ${formatNumber(ledger.farmerSavingsChange ?? 0)}`)}
      ${statItem('Merchant G/T/N/Consume/SaveΔ', `${formatNumber(ledger.merchantGrossIncome ?? 0)} / ${formatNumber(ledger.merchantTaxPaid ?? 0)} / ${formatNumber(ledger.merchantNetIncome ?? 0)} / ${formatNumber(ledger.merchantConsumption ?? 0)} / ${formatNumber(ledger.merchantSavingsChange ?? 0)}`)}
      ${statItem('Official Gross/Net/SaveΔ', `${formatNumber(ledger.officialGrossIncome ?? 0)} / ${formatNumber(ledger.officialNetIncome ?? 0)} / ${formatNumber(ledger.officialSavingsChange ?? 0)}`)}
      ${statItem('Last 10y Net Balance', ledgerHistory.length > 0 ? ledgerHistory.map((item) => `Y${item.year}: ${formatNumber(item.netBalance ?? 0)}`).join(' | ') : 'No history yet')}
    </div></section>
  `;

  bindOfficialSaltSaleEvents(state, onOfficialSaltSale);
}
