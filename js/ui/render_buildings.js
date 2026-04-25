import { BUILDING_CATEGORIES } from '../buildings/buildingTypes.js';
import { PRODUCTION_METHODS } from '../buildings/productionMethods.js';
import { calculateBuildingOutput, canConstructBuilding, getBuildingByCategory } from '../buildings/buildingEngine.js';
import { formatDecimal, formatNumber } from './render_world.js';

function getOutputText(outputs = {}) {
  const entries = Object.entries(outputs).filter(([, value]) => (value ?? 0) > 0);
  if (entries.length === 0) return '—';
  return entries.map(([commodity, value]) => `${commodity}: ${formatNumber(Math.round(value))}`).join(' / ');
}

function getMethodOptionsHtml(building) {
  return (building.productionMethods ?? [])
    .map((methodId) => {
      const method = PRODUCTION_METHODS[methodId];
      const selected = methodId === building.method ? 'selected' : '';
      return `<option value="${methodId}" ${selected}>${method?.name ?? methodId}</option>`;
    })
    .join('');
}

function getTrendSymbol(entry) {
  if (!entry) return '→';
  return entry.trend ?? '→';
}

function getMarketPanelHtml(state) {
  const market = state.commodityPrices ?? {};
  const rows = Object.entries(market)
    .map(([commodity, entry]) => {
      const supply = Math.max(0, Number(entry?.supply ?? 0));
      const demand = Math.max(0, Number(entry?.demand ?? 0));
      const shortage = demand > 0 && supply < demand * 0.7;
      const surplus = demand > 0 && supply > demand * 1.5;
      const signal = shortage
        ? '<span style="color:#d9534f; font-weight:700;">短缺</span>'
        : surplus
          ? '<span style="color:#337ab7; font-weight:700;">过剩</span>'
          : '<span class="muted">平衡</span>';
      return `
        <div class="stat-item" style="padding:8px;">
          <div><strong>${commodity}</strong> <span style="font-weight:700;">${getTrendSymbol(entry)}</span></div>
          <div class="muted">供给: ${formatNumber(Math.round(supply))}</div>
          <div class="muted">需求: ${formatNumber(Math.round(demand))}</div>
          <div class="muted">价格: ${formatDecimal(Number(entry?.price ?? entry?.basePrice ?? 0), 2)}</div>
          <div>${signal}</div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="panel" style="margin-bottom: 12px;">
      <h3>商品市场</h3>
      <div class="muted">显示每类商品的供需、价格与趋势（↑/↓/→）。</div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:6px; margin-top:8px;">
        ${rows || '<div class="muted">暂无市场数据</div>'}
      </div>
    </section>
  `;
}

function getBuildingCardHtml(state, building) {
  const check = canConstructBuilding(building.id, state, 1);
  const outputPreview = calculateBuildingOutput(building.id, 1, state);

  return `
    <div class="stat-item stat-item-wide" style="padding:12px; margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
        <div>
          <div><strong>${building.name}</strong> <span class="muted">(${building.id})</span></div>
          <div class="muted">${building.description ?? ''}</div>
          <div class="muted">数量：${formatNumber(Math.floor(building.count ?? 0))} ${building.unit ?? ''}</div>
          <div class="muted">工人需求/单位：${formatDecimal(building.baseWorkers ?? 0, 2)}</div>
          <div class="muted">单位产出预览：${getOutputText(outputPreview.outputs)}</div>
        </div>
        <div style="min-width:280px; display:flex; flex-direction:column; gap:6px;">
          <label class="muted" for="building-method-${building.id}">生产方式</label>
          <select id="building-method-${building.id}" data-action="set-method" data-building-id="${building.id}">
            ${getMethodOptionsHtml(building)}
          </select>

          <label class="muted" for="building-amount-${building.id}">建造数量</label>
          <input id="building-amount-${building.id}" type="number" min="1" step="1" value="1" />
          <button data-action="construct" data-building-id="${building.id}" ${check.canBuild ? '' : 'disabled'}>
            ${check.canBuild ? '建造' : `不可建造：${check.reason}`}
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindBuildingEvents(state, onConstructBuilding, onSetBuildingMethod) {
  document.querySelectorAll('[data-action="construct"]').forEach((button) => {
    button.addEventListener('click', () => {
      const buildingId = button.getAttribute('data-building-id');
      const input = document.getElementById(`building-amount-${buildingId}`);
      const amount = Math.max(1, Math.floor(Number(input?.value ?? 1)));
      onConstructBuilding?.(buildingId, amount);
    });
  });

  document.querySelectorAll('[data-action="set-method"]').forEach((select) => {
    select.addEventListener('change', () => {
      const buildingId = select.getAttribute('data-building-id');
      const methodId = select.value;
      onSetBuildingMethod?.(buildingId, methodId);
    });
  });
}

export function renderBuildingsTab(state, onConstructBuilding, onSetBuildingMethod) {
  const mount = document.getElementById('buildings-tab-content');
  if (!mount) return;

  const blocks = BUILDING_CATEGORIES.map((category) => {
    const buildings = getBuildingByCategory(category.id, state);
    const cards = buildings.map((building) => getBuildingCardHtml(state, building)).join('');
    return `
      <section class="panel" style="margin-bottom: 12px;">
        <h3>${category.name}</h3>
        ${cards}
      </section>
    `;
  }).join('');

  const commodityRows = Object.entries(state.commodities ?? {})
    .map(([key, value]) => `<div class="muted">${key}: ${formatNumber(Math.round(value ?? 0))}</div>`)
    .join('');

  mount.innerHTML = `
    <section class="panel">
      <h2>统一建筑系统</h2>
      <div class="muted">按分类查看全部建筑、生产方式与产出预览。</div>
      <div class="muted">本年建筑产出（commodities）：</div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:6px; margin:8px 0 12px;">${commodityRows}</div>
      ${getMarketPanelHtml(state)}
      ${blocks}
    </section>
  `;

  bindBuildingEvents(state, onConstructBuilding, onSetBuildingMethod);
}
