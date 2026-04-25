import { formatNumber, statItem } from './render_world.js';

const DIPLOMACY_CONTACT_ESTABLISHED_TEXT = '外交联系已建立';

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
  if (xikou.diplomaticContact) return `<span style="color: #1b8a3b; font-weight: 700;">${DIPLOMACY_CONTACT_ESTABLISHED_TEXT}</span>`;

  const envoyDisabled = (world.grainTreasury ?? 0) < 5000;
  return `<button id="send-envoy-btn" ${envoyDisabled ? 'disabled' : ''}>派遣使者 (Cost: 5000 grain)</button>`;
}

export function bindDiplomacyEvents(onSendEnvoy) {
  const envoyBtn = document.getElementById('send-envoy-btn');
  if (envoyBtn && typeof onSendEnvoy === 'function') envoyBtn.addEventListener('click', onSendEnvoy);
}

export function getTradeControlsHtml(world, xikou) {
  if (!xikou || !xikou.diplomaticContact) return '<span class="muted">需先建立外交关系</span>';
  if ((xikou.attitudeToPlayer ?? 0) < -9) return '<span style="color: #c2410c; font-weight: 700;">态度不足（需中立或以上）</span>';

  const saltTradeCapByOutput = Math.floor((xikou.saltOutputJin ?? 0) * 0.5);
  const saltAvailable = Math.max(0, Math.min(xikou.saltReserve ?? 0, saltTradeCapByOutput));
  const maxSaltTradeGrain = saltAvailable > 0 ? Math.floor(saltAvailable / 0.5) : 0;
  const saltDisabled = world.saltTradeUsed || saltAvailable <= 0 || (world.grainTreasury ?? 0) < 10000;

  const clothAvailable = Math.max(0, xikou.clothOutput ?? 0);
  const maxClothTradeGrain = clothAvailable > 0 ? Math.floor(clothAvailable / 0.3) : 0;
  const clothDisabled = world.clothTradeUsed || clothAvailable <= 0 || (world.grainTreasury ?? 0) < 5000;

  return `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div>
        <div><strong>粮食换盐</strong>（2粮:1盐，最低10000粮）</div>
        <div class="muted">可交易盐：${formatNumber(saltAvailable)} 斤（本年上限）</div>
        <div class="muted">最大可输入粮食：${formatNumber(maxSaltTradeGrain)}</div>
        <input id="salt-trade-input" type="number" min="10000" step="1000" placeholder="输入粮食数量" />
        <button id="trade-salt-btn" ${saltDisabled ? 'disabled' : ''}>${world.saltTradeUsed ? '本年已交易' : '确认粮盐交易'}</button>
      </div>
      <div>
        <div><strong>粮食换布匹</strong>（10粮:3布，最低5000粮）</div>
        <div class="muted">可交易布匹：${formatNumber(clothAvailable)} 斤</div>
        <div class="muted">最大可输入粮食：${formatNumber(maxClothTradeGrain)}</div>
        <input id="cloth-trade-input" type="number" min="5000" step="500" placeholder="输入粮食数量" />
        <button id="trade-cloth-btn" ${clothDisabled ? 'disabled' : ''}>${world.clothTradeUsed ? '本年已交易' : '确认粮布交易'}</button>
      </div>
    </div>
  `;
}

export function bindTradeEvents(onTradeSalt, onTradeCloth) {
  const tradeSaltBtn = document.getElementById('trade-salt-btn');
  if (tradeSaltBtn && typeof onTradeSalt === 'function') tradeSaltBtn.addEventListener('click', onTradeSalt);

  const tradeClothBtn = document.getElementById('trade-cloth-btn');
  if (tradeClothBtn && typeof onTradeCloth === 'function') tradeClothBtn.addEventListener('click', onTradeCloth);
}

export function getDungImportControlsHtml(world, xikou) {
  if (!xikou?.diplomaticContact) return '<span class="muted">需先建立外交关系</span>';

  const availableDung = Math.max(0, Math.floor(xikou.silkwormDungAvailable ?? 0));
  const defaultQuota = Math.max(0, Math.floor(world.dungImportQuota ?? 0));
  const minValue = availableDung > 0 ? 1000 : 0;
  const disabled = availableDung <= 0;
  const currencyLabel = world.grainCouponsUnlocked ? '粮劵' : '粮食';
  const estimatedCost = Math.ceil(defaultQuota / 100);

  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div><strong>蚕沙进口</strong>（100斤蚕沙 = 1${currencyLabel}）</div>
      <div class="muted">溪口本年可供：${formatNumber(availableDung)} 斤</div>
      <input id="dung-import-input" type="number" min="${minValue}" step="1000" value="${defaultQuota}" ${disabled ? 'disabled' : ''}/>
      <div class="muted">当前配额预估成本：${formatNumber(estimatedCost)}${currencyLabel}</div>
      <button id="set-dung-import-btn" ${disabled ? 'disabled' : ''}>设置蚕沙进口配额（次年结算）</button>
    </div>
  `;
}

export function bindDungImportEvents(onSetDungImportQuota) {
  const button = document.getElementById('set-dung-import-btn');
  if (button && typeof onSetDungImportQuota === 'function') button.addEventListener('click', onSetDungImportQuota);
}

export function getXikouVillagePanelHtml(state) {
  const xikou = state.xikou ?? state.world?.xikou;
  if (!xikou) return 'Xikou Village data unavailable';

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
    `可用盐库存：${formatNumber(xikou.saltReserve ?? 0)} 斤`,
    `布匹产量：${formatNumber(xikou.clothOutput ?? 0)} 斤/年`,
    `稳定度：${formatNumber(xikou.stabilityIndex ?? 0)}`,
    `对我方态度：${attitudeText}`,
    `年度态度变化：${formatNumber(xikou.attitudeDeltaThisYear ?? 0)}`,
    `态度影响因素：${attitudeFactors}`,
  ].join('<br/>');
}

export function renderDiplomacyTab(state, onSendEnvoy, onTradeSalt, onTradeCloth, onSetDungImportQuota) {
  const mount = document.getElementById('diplomacy-tab-content');
  if (!mount) return;

  const world = state.world;
  const xikou = state.xikou;

  mount.innerHTML = `
    <section class="panel"><h2>Xikou Village</h2>
      ${statItem('Village Overview', getXikouVillagePanelHtml(state))}
      ${statItem('Attitude Label', getXikouAttitudeLabel(xikou?.attitudeToPlayer ?? 0))}
    </section>
    <section class="panel"><h2>Diplomatic Contact</h2>${getDiplomacyControlsHtml(world, xikou)}</section>
    <section class="panel"><h2>Trade</h2>${getTradeControlsHtml(world, xikou)}</section>
    <section class="panel"><h2>Silkworm Dung Import</h2>${getDungImportControlsHtml(world, xikou)}</section>
  `;

  bindDiplomacyEvents(onSendEnvoy);
  bindTradeEvents(onTradeSalt, onTradeCloth);
  bindDungImportEvents(onSetDungImportQuota);
}
