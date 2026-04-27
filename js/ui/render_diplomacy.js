import { formatNumber, statItem } from './render_world.js';

const DIPLOMACY_CONTACT_ESTABLISHED_TEXT = '外交联系已建立';

function getTradeContractsForUi() {
  const getter = window?.getTradeContractUiState;
  if (typeof getter === 'function') {
    const data = getter();
    if (Array.isArray(data)) return data;
  }
  return [];
}

function getRiskLabel(risk) {
  if (risk === 'low') return '低';
  if (risk === 'medium') return '中';
  return '高';
}

function getForeignPolity(state, id) {
  return state?.foreignPolities?.[id] ?? null;
}

function getXikouState(state) {
  return getForeignPolity(state, 'xikou') ?? state?.xikou ?? state?.world?.xikou ?? null;
}

function getNorthernTradersState(state) {
  return getForeignPolity(state, 'northernTraders') ?? null;
}

function getSouthernTribeState(state) {
  return getForeignPolity(state, 'southernTribe') ?? null;
}

function getSaltLakeTownState(state) {
  return getForeignPolity(state, 'saltLakeTown') ?? null;
}

function hasEnvoyContact(state, polityId) {
  return Boolean(state?.diplomacy?.envoysSent?.[polityId]);
}

function getDiplomaticContact(xikou) {
  if (!xikou) return false;
  if (typeof xikou.diplomaticContact === 'boolean') return xikou.diplomaticContact;
  if (typeof xikou?.diplomacy?.diplomaticContact === 'boolean') return xikou.diplomacy.diplomaticContact;
  return Number(xikou?.diplomacy?.attitudeToPlayer ?? 0) > -100;
}

function getAttitudeToPlayer(xikou) {
  if (!xikou) return 0;
  if (Number.isFinite(Number(xikou.attitudeToPlayer))) return Number(xikou.attitudeToPlayer);
  return Number(xikou?.diplomacy?.attitudeToPlayer ?? 0);
}

export function getXikouAttitudeLabel(attitudeToPlayer) {
  if (attitudeToPlayer <= -50) return '敌对';
  if (attitudeToPlayer <= -10) return '警惕';
  if (attitudeToPlayer <= 20) return '中立';
  if (attitudeToPlayer <= 50) return '友好';
  return '依附';
}

export function getXikouAttitudeDisplay(attitudeToPlayer) {
  if (attitudeToPlayer <= -50) return { label: '敌对', color: '#b42318' };
  if (attitudeToPlayer <= -10) return { label: '警惕', color: '#c2410c' };
  if (attitudeToPlayer <= 20) return { label: '中立', color: '#6b7280' };
  if (attitudeToPlayer <= 50) return { label: '友好', color: '#1b8a3b' };
  return { label: '依附', color: '#2563eb' };
}

export function getDiplomacyControlsHtml(world, xikou) {
  if (!xikou) return '外交数据不可用';
  if (getDiplomaticContact(xikou)) return `<span style="color: #1b8a3b; font-weight: 700;">${DIPLOMACY_CONTACT_ESTABLISHED_TEXT}</span>`;

  const envoyDisabled = (world.grainTreasury ?? 0) < 5000;
  return `<button id="send-envoy-btn" ${envoyDisabled ? 'disabled' : ''}>派遣使者 (Cost: 5000 grain)</button>`;
}

export function bindDiplomacyEvents(onSendEnvoy) {
  const envoyBtn = document.getElementById('send-envoy-btn');
  if (envoyBtn && typeof onSendEnvoy === 'function') envoyBtn.addEventListener('click', onSendEnvoy);
}

export function getTradeControlsHtml(world, xikou, state) {
  if (!xikou || !getDiplomaticContact(xikou)) return '<span class="muted">需先建立外交关系</span>';
  if (getAttitudeToPlayer(xikou) < -9) return '<span style="color: #c2410c; font-weight: 700;">态度不足（需中立或以上）</span>';

  const contracts = getTradeContractsForUi().filter((item) => item.partnerId === 'xikou' && item.active);
  const listHtml = contracts.length
    ? `<div style="display:flex;flex-direction:column;gap:8px;">
        ${contracts.map((contract) => `
          <div style="padding:8px;border:1px solid #d1d5db;border-radius:6px;">
            <div><strong>${contract.commodity}</strong> | ${contract.direction === 'export' ? '出口' : '进口'} ${formatNumber(contract.amountPerYear)}/年 | ${contract.priceMode === 'fixed' ? `固定价${contract.fixedPrice}` : '市场价'} | 剩余${formatNumber(contract.yearsRemaining)}年 | 风险:${getRiskLabel(contract.risk)}</div>
            <div class="muted">最近执行：Year ${contract.lastExecutedYear ?? '-'}，交付 ${formatNumber(contract.lastDeliveredAmount ?? 0)}，结算 ${formatNumber(contract.lastPaymentAmount ?? 0)}${contract.paymentAsset === 'coupon' ? '粮劵' : '粮食'}</div>
            <button class="cancel-contract-btn" data-contract-id="${contract.id}">Cancel</button>
          </div>
        `).join('')}
      </div>`
    : '<div class="muted">暂无有效贸易合约</div>';

  const summary = state?.tradeEffects?.lastYearSummary ?? {};
  const commodityFlows = Object.entries(summary.commodityFlows ?? {})
    .map(([commodity, amount]) => `${commodity}:${formatNumber(amount)}`)
    .join(' / ');

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div><strong>长期贸易合约</strong></div>
      ${listHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="sign-salt-contract-btn">Sign Salt Import Contract</button>
        <button id="sign-cloth-contract-btn">Sign Cloth Import Contract</button>
        <button id="sign-dung-contract-btn">Sign Dung Import Contract</button>
      </div>
      <div class="muted">上年贸易：进口${formatNumber(summary.imports ?? 0)} / 出口${formatNumber(summary.exports ?? 0)} / 支付粮${formatNumber(summary.grainPayments ?? 0)} / 支付劵${formatNumber(summary.couponPayments ?? 0)}${commodityFlows ? ` / 流量 ${commodityFlows}` : ''}</div>
    </div>
  `;
}

export function bindTradeEvents(onTradeSalt, onTradeCloth) {
  const signSaltBtn = document.getElementById('sign-salt-contract-btn');
  if (signSaltBtn && typeof onTradeSalt === 'function') signSaltBtn.addEventListener('click', onTradeSalt);

  const signClothBtn = document.getElementById('sign-cloth-contract-btn');
  if (signClothBtn && typeof onTradeCloth === 'function') signClothBtn.addEventListener('click', onTradeCloth);

  const cancelButtons = Array.from(document.querySelectorAll('.cancel-contract-btn'));
  cancelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const contractId = String(button?.dataset?.contractId ?? '').trim();
      if (!contractId) return;
      document.dispatchEvent(new CustomEvent('trade:cancel-contract', { detail: { contractId } }));
    });
  });
}

export function getDungImportControlsHtml(world, xikou) {
  if (!getDiplomaticContact(xikou)) return '<span class="muted">需先建立外交关系</span>';
  return '<span class="muted">蚕沙进口已并入贸易合约面板。</span>';
}

export function bindDungImportEvents(onSetDungImportQuota) {
  const button = document.getElementById('sign-dung-contract-btn');
  if (button && typeof onSetDungImportQuota === 'function') button.addEventListener('click', onSetDungImportQuota);
}

export function getXikouVillagePanelHtml(state) {
  const xikou = getXikouState(state);
  if (!xikou) return 'Xikou Village data unavailable';

  const contactBadge = getDiplomaticContact(xikou)
    ? '<span style="color: #1b8a3b; font-weight: 700;">已建立外交关系</span>'
    : '<span style="color: #b28704; font-weight: 700;">未建立外交关系</span>';

  const attitude = getAttitudeToPlayer(xikou);
  const attitudeDisplay = getXikouAttitudeDisplay(attitude);
  const attitudeText = `<span style="color: ${attitudeDisplay.color}; font-weight: 700;">${attitudeDisplay.label}</span> (${formatNumber(attitude)})`;

  const attitudeFactors = Array.isArray(xikou.attitudeFactorsThisYear)
    ? xikou.attitudeFactorsThisYear.join(' | ')
    : '未建立外交关系，态度变化未生效';

  const grainStock = xikou.commodities?.grain ?? xikou.grainTreasury ?? 0;
  const saltStock = xikou.commodities?.salt ?? xikou.saltReserve ?? 0;
  const clothStock = xikou.commodities?.cloth ?? xikou.clothReserve ?? 0;

  return [
    `状态：${contactBadge}`,
    `人口：${formatNumber(xikou.population ?? 0)}`,
    `劳动力：${formatNumber(xikou.laborForce ?? 0)}`,
    `粮食储备：${formatNumber(grainStock)}`,
    `可用盐库存：${formatNumber(saltStock)} 斤`,
    `可用布匹库存：${formatNumber(clothStock)}`,
    `稳定度：${formatNumber(xikou.stabilityIndex ?? 0)}`,
    `对我方态度：${attitudeText}`,
    `年度态度变化：${formatNumber(xikou.attitudeDeltaThisYear ?? 0)}`,
    `态度影响因素：${attitudeFactors}`,
  ].join('<br/>');
}

export function getNorthernTradersPanelHtml(state) {
  const polity = getNorthernTradersState(state);
  if (!polity) return 'Northern Traders data unavailable';

  return [
    `人口：${formatNumber(polity.population ?? 0)}`,
    `劳动力：${formatNumber(polity.laborForce ?? 0)}`,
    `粮食：${formatNumber(polity.commodities?.grain ?? 0)}`,
    `食盐：${formatNumber(polity.commodities?.salt ?? 0)}`,
    `布匹：${formatNumber(polity.commodities?.cloth ?? 0)}`,
    `对我方态度：${formatNumber(polity.diplomacy?.attitudeToPlayer ?? 0)}`,
    `信任度：${formatNumber(polity.diplomacy?.trust ?? 0)}`,
  ].join('<br/>');
}

function getFogPanelHtml() {
  return '<div class="muted">未探明势力</div>';
}

function getSouthernTribePanelHtml(state) {
  if (!hasEnvoyContact(state, 'southernTribe')) return getFogPanelHtml();

  const polity = getSouthernTribeState(state);
  if (!polity) return 'Southern Tribe data unavailable';

  const attitude = Number(polity.diplomacy?.attitudeToPlayer ?? 0);
  const hostileWarning = attitude <= -20
    ? '<span style="color:#b42318;font-weight:700;">警告：初始态度敌对</span>'
    : '<span style="color:#6b7280;">外交态势平稳</span>';

  return [
    `人口：${formatNumber(polity.population ?? 0)}`,
    `劳动力：${formatNumber(polity.laborForce ?? 0)}`,
    `粮食：${formatNumber(polity.commodities?.grain ?? 0)}`,
    `布匹：${formatNumber(polity.commodities?.cloth ?? 0)}`,
    `草药：${formatNumber(polity.commodities?.herb ?? 0)}`,
    `对我方态度：${formatNumber(attitude)}`,
    `信任度：${formatNumber(polity.diplomacy?.trust ?? 0)}`,
    hostileWarning,
  ].join('<br/>');
}

function getSaltLakeTownPanelHtml(state) {
  if (!hasEnvoyContact(state, 'saltLakeTown')) return getFogPanelHtml();

  const polity = getSaltLakeTownState(state);
  if (!polity) return 'Salt Lake Town data unavailable';

  return [
    `人口：${formatNumber(polity.population ?? 0)}`,
    `劳动力：${formatNumber(polity.laborForce ?? 0)}`,
    `粮食：${formatNumber(polity.commodities?.grain ?? 0)}`,
    `食盐：${formatNumber(polity.commodities?.salt ?? 0)}`,
    `布匹：${formatNumber(polity.commodities?.cloth ?? 0)}`,
    `对我方态度：${formatNumber(polity.diplomacy?.attitudeToPlayer ?? 0)}`,
    `信任度：${formatNumber(polity.diplomacy?.trust ?? 0)}`,
    '<span style="color:#1d4ed8;">可贸易资源：盐</span>',
  ].join('<br/>');
}

export function renderDiplomacyTab(state, onSendEnvoy, onTradeSalt, onTradeCloth, onSetDungImportQuota) {
  const mount = document.getElementById('diplomacy-tab-content');
  if (!mount) return;

  const world = state.world;
  const xikou = getXikouState(state);

  mount.innerHTML = `
    <section class="panel"><h2>Xikou Village</h2>
      ${statItem('Village Overview', getXikouVillagePanelHtml(state))}
      ${statItem('Attitude Label', getXikouAttitudeLabel(getAttitudeToPlayer(xikou)))}
    </section>
    <section class="panel"><h2>Diplomatic Contact</h2>${getDiplomacyControlsHtml(world, xikou)}</section>
    <section class="panel"><h2>Trade</h2>${getTradeControlsHtml(world, xikou, state)}</section>
    <section class="panel"><h2>Northern Traders</h2>${statItem('Overview', getNorthernTradersPanelHtml(state))}</section>
    <section class="panel"><h2>Southern Tribe</h2>${statItem('Overview', getSouthernTribePanelHtml(state))}</section>
    <section class="panel"><h2>Salt Lake Town</h2>${statItem('Overview', getSaltLakeTownPanelHtml(state))}</section>
  `;

  bindDiplomacyEvents(onSendEnvoy);
  bindTradeEvents(onTradeSalt, onTradeCloth);
  bindDungImportEvents(onSetDungImportQuota);
}
