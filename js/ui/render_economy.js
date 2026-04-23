import { formatNumber, formatDecimal, statItem } from './render_world.js';
import { previewOfficialSaltSale } from '../economy/market.js';
import { getInflationDisplay } from './render_society.js';

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
  return `
    <div class="coupon-controls" style="display: block; margin-top: 12px;">
      <label for="tax-grain-ratio-input">Tax Collection Mix</label>
      <input id="tax-grain-ratio-input" type="range" min="0" max="1" step="0.05" value="${world.taxGrainRatio ?? 1}" />
      <div id="tax-grain-ratio-value" class="muted">${renderRatioValue(world.taxGrainRatio ?? 1)}</div>
    </div>
    <div class="coupon-controls" style="display: block; margin-top: 12px;">
      <label for="salary-grain-ratio-input">Official Salary Mix</label>
      <input id="salary-grain-ratio-input" type="range" min="0" max="1" step="0.05" value="${world.salaryGrainRatio ?? 1}" />
      <div id="salary-grain-ratio-value" class="muted">${renderRatioValue(world.salaryGrainRatio ?? 1)}</div>
    </div>
  `;
}

export function bindCouponRatioEvents(state) {
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

export function getSaltImportControlsHtml(world, xikou) {
  const maxQuota = Math.max(0, Math.floor((xikou?.saltOutputJin ?? 0) * 0.5));
  const currentQuota = Math.max(0, Math.floor(world.saltImportQuota ?? 0));
  const clampedQuota = Math.min(currentQuota, maxQuota);
  const estimatedCost = Math.round(clampedQuota * (world.saltPrice ?? 4));
  const canAfford = world.grainCouponsUnlocked ? (world.couponTreasury ?? 0) >= estimatedCost : (world.grainTreasury ?? 0) >= estimatedCost;
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
    state.world.saltImportQuota = Math.min(nextValue, Math.max(0, maxQuota));
  });
}

export function getOfficialSaltSaleControlsHtml(world) {
  const marketPrice = Number(world.saltPrice ?? 0);
  const reserve = Math.max(0, Math.floor(Number(world.saltReserve ?? 0)));
  const usedThisYear = !!world.officialSaltSaleUsed;
  const defaultPrice = Number(world.officialSaltPrice ?? marketPrice);
  const defaultAmount = Math.floor(Number(world.officialSaltAmount ?? 1000));
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
    const marketPrice = Number(state.world.saltPrice ?? 0);
    const reserve = Math.max(0, Math.floor(Number(state.world.saltReserve ?? 0)));
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

export function renderEconomyTab(state) {
  const world = state.world;
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
      ${statItem('Merchant Count', formatNumber(world.merchantCount ?? 0))}
      ${statItem('Demand Saturation', `${formatDecimal(demandSaturationPercent, 1)}%`)}
      ${statItem('Commerce Efficiency Rate', `${formatDecimal(commerceEfficiencyRate * 100, 1)}%`)}
      ${statItem('Commerce Activity Bonus', `${formatDecimal(commerceActivityBonus * 100, 1)}%`)}
      ${statItem('Farmer Income / Head', formatDecimal(world.farmerIncomePerHead ?? 0, 2))}
      ${statItem('Merchant Income / Head', formatDecimal(world.merchantIncomePerHead ?? 0, 2))}
      ${statItem('Income Gap', formatDecimal(world.incomeGap ?? 0, 2))}
    </div></section>
  `;
}

export function renderAgricultureTab(state, onOpenHempLand, onOpenMulberryLand) {
  const world = state.world;
  const mount = document.getElementById('agriculture-tab-content');
  if (!mount) return;

  mount.innerHTML = `
    <section class="panel"><h2>Grain Output</h2><div class="tab-grid">
      ${statItem('Potential Grain Output', formatNumber(world.potentialGrainOutput ?? 0))}
      ${statItem('Actual Grain Output', formatNumber(world.actualGrainOutput ?? 0))}
      ${statItem('Lost Grain Output', formatNumber(world.lostGrainOutput ?? 0))}
      ${statItem('Yield / mu (effective)', formatNumber(world.grainYieldPerMu ?? 0))}
      ${statItem('Farmland Area (mu)', formatNumber(world.farmlandAreaMu ?? 0))}
    </div></section>
    <section class="panel"><h2>Land & Fiber</h2><div class="tab-grid">
      ${statItem('Hemp / Mulberry Land', `${formatNumber(world.hempLandMu ?? 0)} / ${formatNumber(world.mulberryLandMu ?? 0)} 亩`)}
      ${statItem('Pending (Hemp / Mulberry)', `${formatNumber(world.pendingHempLandMu ?? 0)} / ${formatNumber(world.pendingMulberryLandMu ?? 0)} 亩`)}
      ${statItem('Cloth Output (Coarse/Fine)', `${formatNumber(world.coarseClothOutput ?? 0)} / ${formatNumber(world.fineClothOutput ?? 0)}`)}
      ${statItem('Silkworm Dung (Own/Imported/Total)', `${formatNumber(world.playerSilkwormDung ?? 0)} / ${formatNumber(world.importedDung ?? 0)} / ${formatNumber(world.totalDung ?? 0)}`)}
      ${statItem('Dung Coverage', `${formatDecimal((world.dungCoverage ?? 0) * 100, 1)}%`)}
      ${statItem('Fertilizer Bonus', `${formatDecimal(((world.fertilizerBonus ?? 1) - 1) * 100, 1)}%`)}
    </div></section>
    <section class="panel"><h2>Hemp Byproducts</h2><div class="tab-grid">
      ${statItem('Paper Material / Year', `${formatNumber(world.paperMaterial ?? 0)} 斤`)}
      ${statItem('Paper Material Reserve', `${formatNumber(world.paperMaterialReserve ?? 0)} 斤`)}
      ${statItem('Paper Output', formatDecimal(world.paperOutput ?? 0, 1))}
      ${statItem('Hemp Stalk Fuel / Year', `${formatNumber(world.hempStalks ?? 0)} 斤`)}
      ${statItem('Building Fiber / Year', `${formatNumber(world.buildingFiber ?? 0)} 斤`)}
      ${statItem('Building Fiber Reserve', `${formatNumber(world.buildingFiberReserve ?? 0)} 斤`)}
      ${statItem('Construction Cost Reduction', `${formatDecimal((world.constructionCostReduction ?? 0) * 100, 1)}%`)}
      ${statItem('Structural Bonus', world.structuralBonus ? 'Active (+2% labor output)' : 'Inactive')}
      ${statItem('Labor Efficiency', `${formatDecimal((world.laborEfficiency ?? 1) * 100, 1)}%`)}
    </div></section>
    <section class="panel"><h2>Land Reclamation</h2>${getLandDevelopmentControlsHtml(world)}</section>
  `;

  bindLandDevelopmentEvents(world, onOpenHempLand, onOpenMulberryLand);
}

export function renderCurrencyTab(state, onOfficialSaltSale) {
  const world = state.world;
  const mount = document.getElementById('currency-tab-content');
  if (!mount) return;

  const inflationDisplay = getInflationDisplay(world.inflationRate ?? 0);
  mount.innerHTML = `
    <section class="panel"><h2>Treasury</h2><div class="tab-grid">
      ${statItem('Grain Treasury', formatNumber(world.grainTreasury ?? 0))}
      ${statItem('Coupon Treasury', formatNumber(world.couponTreasury ?? 0))}
      ${statItem('Coupon Circulating', formatNumber(world.couponCirculating ?? 0))}
      ${statItem('Tax Ratio', renderRatioValue(world.taxGrainRatio ?? 1))}
      ${statItem('Salary Ratio', renderRatioValue(world.salaryGrainRatio ?? 1))}
    </div></section>
    <section class="panel"><h2>Inflation</h2><div class="tab-grid">
      ${statItem('Backing Ratio', formatDecimal(world.backingRatio ?? 1, 2))}
      ${statItem('Inflation Rate', `<span style="color:${inflationDisplay.color};font-weight:700;">${formatDecimal((world.inflationRate ?? 0) * 100, 1)}%</span>`)}
      ${statItem('Credit Crisis', world.creditCrisis ? 'Active' : 'None')}
    </div></section>
    <section class="panel"><h2>Salt Policy</h2>
      ${getOfficialSaltSaleControlsHtml(world)}
    </section>
  `;

  bindOfficialSaltSaleEvents(state, onOfficialSaltSale);
}
