import { formatNumber, formatDecimal } from './render_world.js';
import { previewOfficialSaltSale } from '../economy/market.js';

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
  const canAfford = world.grainCouponsUnlocked
    ? (world.couponTreasury ?? 0) >= estimatedCost
    : (world.grainTreasury ?? 0) >= estimatedCost;
  const currencyLabel = world.grainCouponsUnlocked ? 'coupon' : 'grain';

  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div class="muted">年度进口上限（溪口可供一半）：${formatNumber(maxQuota)} 斤</div>
      <input
        id="salt-import-quota-input"
        type="number"
        min="0"
        step="1000"
        max="${maxQuota}"
        value="${clampedQuota}"
      />
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
      <input
        id="official-salt-price-input"
        type="number"
        min="0"
        step="0.1"
        max="${formatDecimal(marketPrice, 2)}"
        value="${formatDecimal(preview.cappedPrice, 2)}"
      />
      <label for="official-salt-amount-input">官府放盐数量（最低1000斤）</label>
      <input
        id="official-salt-amount-input"
        type="number"
        min="1000"
        step="1000"
        max="${reserve}"
        value="${Math.max(1000, Math.min(preview.cappedAmount || 1000, reserve || 1000))}"
      />
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

    if (inputPrice > marketPrice) {
      priceInput.value = String(marketPrice);
    }
    if (inputAmount > reserve) {
      amountInput.value = String(reserve);
    }

    previewEl.textContent = `预计收入：${formatNumber(Math.round(preview.revenue))} ${
      state.world.grainCouponsUnlocked ? 'coupon' : 'grain'
    } | 预计补贴成本：${formatNumber(Math.round(preview.subsidyLoss))} | 投放占年需求：${formatDecimal(
      preview.releaseRatio * 100,
      1
    )}% | 预计投放后盐价：${formatDecimal(preview.nextSaltPrice, 2)}`;
  };

  priceInput?.addEventListener('input', refreshPreview);
  amountInput?.addEventListener('input', refreshPreview);

  if (button && typeof onOfficialSaltSale === 'function') {
    button.addEventListener('click', onOfficialSaltSale);
  }
}

export function getLandDevelopmentControlsHtml(world) {
  const hempCostPerMu = 8;
  const mulberryCostPerMu = 15;
  const defaultHempMu = 100;
  const defaultMulberryMu = 100;

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div>
        <div><strong>开垦麻田</strong>（最低100亩，成本8粮/亩，次年生效）</div>
        <input id="hemp-land-input" type="number" min="100" step="100" value="${defaultHempMu}" />
        <div class="muted">预计成本：${formatNumber(defaultHempMu * hempCostPerMu)} 粮</div>
        <button id="open-hemp-land-btn">确认开垦麻田</button>
      </div>
      <div>
        <div><strong>开垦桑田</strong>（最低100亩，成本15粮/亩，2年后首收）</div>
        <input id="mulberry-land-input" type="number" min="100" step="100" value="${defaultMulberryMu}" />
        <div class="muted">预计成本：${formatNumber(defaultMulberryMu * mulberryCostPerMu)} 粮</div>
        <button id="open-mulberry-land-btn">确认开垦桑田</button>
      </div>
    </div>
  `;
}

export function bindLandDevelopmentEvents(onOpenHempLand, onOpenMulberryLand) {
  const hempInput = document.getElementById('hemp-land-input');
  const hempButton = document.getElementById('open-hemp-land-btn');
  const mulberryInput = document.getElementById('mulberry-land-input');
  const mulberryButton = document.getElementById('open-mulberry-land-btn');

  if (hempInput) {
    hempInput.addEventListener('input', () => {
      const costEl = hempInput.parentElement?.querySelector('.muted');
      const mu = Math.max(0, Math.floor(Number(hempInput.value || 0)));
      if (costEl) {
        costEl.textContent = `预计成本：${formatNumber(mu * 8)} 粮`;
      }
    });
  }

  if (mulberryInput) {
    mulberryInput.addEventListener('input', () => {
      const costEl = mulberryInput.parentElement?.querySelector('.muted');
      const mu = Math.max(0, Math.floor(Number(mulberryInput.value || 0)));
      if (costEl) {
        costEl.textContent = `预计成本：${formatNumber(mu * 15)} 粮`;
      }
    });
  }

  if (hempButton && typeof onOpenHempLand === 'function') {
    hempButton.addEventListener('click', onOpenHempLand);
  }
  if (mulberryButton && typeof onOpenMulberryLand === 'function') {
    mulberryButton.addEventListener('click', onOpenMulberryLand);
  }
}

