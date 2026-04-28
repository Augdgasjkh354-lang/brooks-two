import { formatDecimal, formatNumber, statItem } from './render_world.js';
import {
  bindDiplomacyEvents,
  bindDungImportEvents,
  bindTradeEvents,
  getDiplomacyControlsHtml,
  getDungImportControlsHtml,
  getTradeControlsHtml,
  getXikouAttitudeDisplay,
  getXikouVillagePanelHtml,
} from './render_diplomacy.js';

const FACTION_COLORS = {
  player: '#C9A84C',
  neutral: '#6B6B6B',
  friendly: '#2D5A3D',
  hostile: '#8B1A1A',
  allied: '#1A3A5C',
};

const DIPLOMACY_CONTACT_TITLE = '外交联系';


function getXikouState(state) {
  return state?.foreignPolities?.xikou ?? state?.xikou ?? state?.world?.xikou ?? null;
}

let mapRenderHandlers = {
  onSendEnvoy: null,
  onTradeSalt: null,
  onTradeCloth: null,
  onSetDungImportQuota: null,
};

function getFactionById(state, factionId) {
  return state.mapState?.factions?.find((item) => item.id === factionId) ?? null;
}

function getFactionColor(faction, state) {
  if (!faction || !faction.discovered) return FACTION_COLORS.neutral;
  if (faction.id === 'player') return FACTION_COLORS.player;
  if (faction.id === 'xikou') {
    const attitude = state?.foreignPolities?.xikou?.diplomacy?.attitudeToPlayer ?? state?.xikou?.attitudeToPlayer ?? 0;
    if (attitude <= -10) return FACTION_COLORS.hostile;
    if (attitude >= 51) return FACTION_COLORS.allied;
    if (attitude >= 21) return FACTION_COLORS.friendly;
    return FACTION_COLORS.neutral;
  }
  return FACTION_COLORS.neutral;
}

function getFactionRadiusBySize(size) {
  if (size === 'large') return 16;
  if (size === 'medium') return 13;
  return 10;
}

function getRoadLevelByLength(roadLength) {
  if (roadLength >= 30) return 3;
  if (roadLength >= 10) return 2;
  if (roadLength >= 1) return 1;
  return 0;
}

function rerenderMapTab(state) {
  renderMapTab(
    state,
    mapRenderHandlers.onSendEnvoy,
    mapRenderHandlers.onTradeSalt,
    mapRenderHandlers.onTradeCloth,
    mapRenderHandlers.onSetDungImportQuota,
  );
}

export function updateMapDiscovery(state) {
  const mapState = state.mapState;
  if (!mapState?.factions) return;

  const xikou = getXikouState(state);
  const xikouDiscovered = Boolean(xikou?.diplomaticContact ?? xikou?.diplomacy?.diplomaticContact);
  const tradersDiscovered = Boolean(state.institutions?.newTradePartnerUnlocked || state.world?.newTradePartnerUnlocked);

  mapState.factions.forEach((faction) => {
    if (faction.id === 'player') faction.discovered = true;
    if (faction.id === 'xikou') faction.discovered = xikouDiscovered;
    if (faction.id === 'northern_traders') faction.discovered = tradersDiscovered;
  });

  const roadLevel = getRoadLevelByLength(state.world?.roadLength ?? 0);
  mapState.roads = (mapState.roads ?? []).map((road) => ({ ...road, level: roadLevel }));
  mapState.mapRevealed = xikouDiscovered || tradersDiscovered;

  if (mapState.selectedFaction && !getFactionById(state, mapState.selectedFaction)) {
    mapState.selectedFaction = null;
  }
}

export function renderRoads(state) {
  const mapState = state.mapState;
  const roads = mapState?.roads ?? [];

  return roads
    .map((road) => {
      if ((road.level ?? 0) <= 0) return '';
      const fromFaction = getFactionById(state, road.from);
      const toFaction = getFactionById(state, road.to);
      if (!fromFaction || !toFaction) return '';
      if (!fromFaction.discovered || !toFaction.discovered) return '';

      const strokeWidth = road.level === 1 ? 1 : road.level === 2 ? 2 : 3;
      const dash = road.level === 1 ? '4,4' : 'none';
      const stroke = road.level === 3 ? '#6B5A3E' : '#8B7355';
      const opacity = road.level === 1 ? 0.6 : road.level === 2 ? 0.8 : 0.9;
      const filter = road.level === 3 ? 'url(#brushStroke)' : 'none';

      return `<line x1="${fromFaction.x}" y1="${fromFaction.y}" x2="${toFaction.x}" y2="${toFaction.y}" class="map-road" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" opacity="${opacity}" filter="${filter}" />`;
    })
    .join('');
}

export function renderFactionMarker(faction, state) {
  const color = getFactionColor(faction, state);
  const radius = getFactionRadiusBySize(faction.size);
  const discovered = Boolean(faction.discovered);
  const label = discovered ? faction.name : '未知势力';
  const centerText = discovered ? faction.name.slice(0, 1) : '?';
  const clickableClass = faction.id === 'player' || faction.id === 'xikou' || faction.id === 'northern_traders' ? 'is-clickable' : '';

  return `
    <g class="faction-group ${discovered ? 'is-discovered' : 'is-undiscovered'} ${clickableClass}" data-faction-id="${faction.id}">
      ${
        !discovered
          ? `<circle class="faction-fog" cx="${faction.x}" cy="${faction.y}" r="${radius + 10}" filter="url(#fogBlur)"></circle>`
          : ''
      }
      <circle class="faction-marker-ring" cx="${faction.x}" cy="${faction.y}" r="${radius}" stroke="${discovered ? '#2D2419' : '#3E3A35'}"></circle>
      <circle class="faction-marker-fill" cx="${faction.x}" cy="${faction.y}" r="${radius - 3}" fill="${discovered ? color : '#515151'}"></circle>
      <text x="${faction.x}" y="${faction.y + 1}" text-anchor="middle" dominant-baseline="middle" class="faction-marker-text">${centerText}</text>
      <text x="${faction.x}" y="${faction.y + radius + 7}" text-anchor="middle" class="faction-label">${label}</text>
    </g>
  `;
}

function getPlayerPanelHtml(state) {
  const world = state.world;
  const population = state.population;
  const calendar = state.calendar;
  return `
    <h3>城邦概览</h3>
    <div class="tab-grid">
      ${statItem('年份', formatNumber(calendar?.year ?? 1))}
      ${statItem('人口', formatNumber(population?.totalPopulation ?? 0))}
      ${statItem('粮仓', formatNumber(world?.grainTreasury ?? 0))}
      ${statItem('稳定度', formatNumber(world?.stabilityIndex ?? 0))}
      ${statItem('GDP', formatNumber(world?.gdpEstimate ?? 0))}
      ${statItem('通胀', `${formatDecimal((world?.inflationRate ?? 0) * 100, 1)}%`)}
    </div>
  `;
}

function getXikouPanelHtml(state) {
  const world = state.world;
  const xikou = getXikouState(state);
  if (!xikou?.diplomaticContact) {
    return `
      <h3>未知势力</h3>
      <p class="muted">派遣探子可获取更多信息。</p>
      <section class="panel map-inner-panel">
        <h4>初步接触</h4>
        ${getDiplomacyControlsHtml(world, xikou)}
      </section>
    `;
  }

  const attitudeDisplay = getXikouAttitudeDisplay(xikou.attitudeToPlayer ?? 0);
  const attitudeBadge = `<span class="map-attitude-badge" style="color:${attitudeDisplay.color};border-color:${attitudeDisplay.color};">${attitudeDisplay.label}</span>`;

  return `
    <h3>溪口村 ${attitudeBadge}</h3>
    <section class="panel map-inner-panel"><h4>外交状态</h4>${getXikouVillagePanelHtml(state)}</section>
    <section class="panel map-inner-panel"><h4>${DIPLOMACY_CONTACT_TITLE}</h4>${getDiplomacyControlsHtml(world, xikou)}</section>
    <section class="panel map-inner-panel"><h4>贸易操作</h4>${getTradeControlsHtml(world, xikou)}</section>
    <section class="panel map-inner-panel"><h4>蚕沙进口</h4>${getDungImportControlsHtml(world, xikou)}</section>
  `;
}

function getNorthernTradersPanelHtml(state) {
  const discovered = getFactionById(state, 'northern_traders')?.discovered;
  if (!discovered) {
    return `
      <h3>未知势力</h3>
      <p class="muted">该势力仍在迷雾中，需科技突破后显现。</p>
    `;
  }
  return `
    <h3>北方商队</h3>
    <section class="panel map-inner-panel">
      <h4>商队贸易（预留）</h4>
      <p class="muted">未来将开放北方特产贸易、长期商路协议和边贸税制。</p>
    </section>
  `;
}

export function renderFactionPanel(factionId, state) {
  const panelClass = factionId ? 'map-side-panel open' : 'map-side-panel';
  if (!factionId) {
    return `<aside class="${panelClass}"><div class="map-panel-content"><h3>地图</h3><p class="muted">点击势力印记查看详情。</p></div></aside>`;
  }

  let panelHtml = '';
  if (factionId === 'player') panelHtml = getPlayerPanelHtml(state);
  if (factionId === 'xikou') panelHtml = getXikouPanelHtml(state);
  if (factionId === 'northern_traders') panelHtml = getNorthernTradersPanelHtml(state);

  return `
    <aside class="${panelClass}" id="map-side-panel">
      <div class="map-panel-content">
        <button type="button" id="close-map-panel-btn" class="map-panel-close" aria-label="关闭面板">×</button>
        ${panelHtml}
      </div>
    </aside>
  `;
}

function renderMapSvg(state) {
  const factions = state.mapState?.factions ?? [];
  const roads = renderRoads(state);
  const markers = factions.map((faction) => renderFactionMarker(faction, state)).join('');

  return `
    <svg class="ink-map-svg" viewBox="0 0 100 70" preserveAspectRatio="xMidYMid meet" role="img" aria-label="古风地图">
      <defs>
        <radialGradient id="parchmentGradient" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#5D4A35" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#1A1410" stop-opacity="0.75" />
        </radialGradient>
        <filter id="inkNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
          <feBlend in="SourceGraphic" in2="monoNoise" mode="multiply" />
        </filter>
        <filter id="fogBlur"><feGaussianBlur stdDeviation="2.6" /></filter>
        <filter id="brushStroke"><feGaussianBlur stdDeviation="0.35" /></filter>
      </defs>

      <rect x="1" y="1" width="98" height="68" class="map-parchment" filter="url(#inkNoise)"></rect>
      <rect x="2.8" y="2.8" width="94.4" height="64.4" class="map-border"></rect>
      <rect x="4" y="4" width="92" height="62" class="map-border-inner"></rect>
      <rect x="5" y="5" width="90" height="60" fill="url(#parchmentGradient)" opacity="0.7"></rect>

      <polygon points="4,4 6,2 8,4 6,6" class="map-corner-ornament"></polygon>
      <polygon points="96,4 94,2 92,4 94,6" class="map-corner-ornament"></polygon>
      <polygon points="4,66 6,64 8,66 6,68" class="map-corner-ornament"></polygon>
      <polygon points="96,66 94,64 92,66 94,68" class="map-corner-ornament"></polygon>

      <g class="map-roads-layer">${roads}</g>
      <g class="map-factions-layer">${markers}</g>

      <g class="map-compass" transform="translate(89,12)">
        <circle r="5.2" class="compass-ring"></circle>
        <polygon points="0,-4.5 1.1,-1.1 4.5,0 1.1,1.1 0,4.5 -1.1,1.1 -4.5,0 -1.1,-1.1" class="compass-star"></polygon>
      </g>
    </svg>
  `;
}

export function initMapInteractions(state) {
  const mapCanvas = document.querySelector('.ink-map-canvas');
  const sidePanel = document.getElementById('map-side-panel');

  if (!mapCanvas) {
    console.log('[map] .ink-map-canvas not found, skip interaction binding');
    return;
  }

  if (state.mapState?.selectedFaction && !sidePanel) {
    console.log('[map] selected faction exists but panel DOM missing, rerendering map tab');
    rerenderMapTab(state);
    return;
  }

  const clickableMarkers = Array.from(document.querySelectorAll('.faction-group.is-clickable'));
  clickableMarkers.forEach((marker) => {
    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      const factionId = marker.dataset.factionId;
      console.log('[map] faction marker clicked:', factionId);
      if (!factionId) return;

      state.mapState.selectedFaction = factionId;
      marker.classList.add('is-pressed');
      window.setTimeout(() => marker.classList.remove('is-pressed'), 160);
      rerenderMapTab(state);
    });
  });

  const closeMapPanel = () => {
    if (!state.mapState?.selectedFaction) return;
    console.log('[map] closing faction side panel');
    state.mapState.selectedFaction = null;
    rerenderMapTab(state);
  };

  document.getElementById('close-map-panel-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    closeMapPanel();
  });

  mapCanvas.addEventListener('click', (event) => {
    const clickedMarker = event.target.closest('.faction-group.is-clickable');
    if (clickedMarker) return;
    closeMapPanel();
  });
}

export function renderMap(state) {
  const mapState = state.mapState;
  const selectedFaction = mapState?.selectedFaction ?? null;
  const hasOpenPanel = Boolean(selectedFaction);

  const mapClass = hasOpenPanel ? 'ink-map-layout panel-open' : 'ink-map-layout';
  const backdropClass = hasOpenPanel ? 'map-panel-backdrop active' : 'map-panel-backdrop';

  return `
    <section class="panel ink-map-panel">
      <div class="${mapClass}">
        <div class="ink-map-canvas">${renderMapSvg(state)}<div class="${backdropClass}"></div></div>
        ${renderFactionPanel(selectedFaction, state)}
      </div>
    </section>
  `;
}

export function renderMapTab(state, onSendEnvoy, onTradeSalt, onTradeCloth, onSetDungImportQuota) {
  const mount = document.getElementById('map-tab-content');
  if (!mount) {
    console.log('[map] #map-tab-content not found, skip map render');
    return;
  }

  mapRenderHandlers = {
    onSendEnvoy,
    onTradeSalt,
    onTradeCloth,
    onSetDungImportQuota,
  };

  updateMapDiscovery(state);
  mount.innerHTML = renderMap(state);
  initMapInteractions(state);

  bindDiplomacyEvents(onSendEnvoy);
  bindTradeEvents(onTradeSalt, onTradeCloth);
  bindDungImportEvents(onSetDungImportQuota);
}
