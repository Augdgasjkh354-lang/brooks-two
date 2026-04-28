// Diplomacy module: Xikou village and relations
import { clamp, clampRatio } from '../economy/labor.js';
import {
  BASE_GROWTH_RATE, LABOR_RATIO, CHILDREN_RATIO, ELDERLY_RATIO,
  LABOR_PER_MU, XIKOU_SALT_OUTPUT, ENVOY_COST, GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR
} from '../config/constants.js';

export const SEND_ENVOY_COST_GRAIN = ENVOY_COST;

// Phase 11A: manual one-time import actions are removed in favor of yearly trade contracts.

function getXikou(world) {
  return world?.__foreignPolities?.xikou ?? world?.foreignPolities?.xikou ?? world?.xikou ?? null;
}

function getCommodityPrice(world, commodity, fallbackPrice) {
  const marketPrice = Number(world?.commodityPrices?.[commodity]?.price ?? NaN);
  if (Number.isFinite(marketPrice) && marketPrice > 0) return marketPrice;
  return Math.max(0.1, Number(fallbackPrice ?? 1));
}

export function getXikouSaltTradePrice(world) {
  return getCommodityPrice(world, 'salt', world?.saltPrice ?? 4);
}

export function getXikouClothTradePrice(world) {
  return getCommodityPrice(world, 'cloth', world?.clothPrice ?? 2);
}

export function updateXikouVillageEconomy() {
  // Phase 12A: retired. Foreign polity economy is updated by updateForeignPolities().
}

export function clampAttitude(value) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function updateXikouDiplomacy(world) {
  const xikou = getXikou(world);
  if (!world || !xikou) {
    return [];
  }

  world.saltPrice = getXikouSaltTradePrice(world);
  world.clothPrice = getXikouClothTradePrice(world);
  const factors = [];
  let delta = 0;

  if (!xikou.diplomaticContact) {
    xikou.attitudeDeltaThisYear = 0;
    xikou.attitudeFactorsThisYear = ['未建立外交关系，态度变化未生效'];
    return [];
  }

  if ((world.grainTreasury ?? 0) > 500000) {
    delta += 2;
    factors.push('我方粮仓充足（>500000）：+2');
  }

  if ((world.stabilityIndex ?? 80) < 50) {
    delta -= 3;
    factors.push('我方稳定度偏低（<50）：-3');
  }

  if ((world.inflationRate ?? 0) >= 0.15) {
    delta -= 5;
    factors.push('我方通胀较高（>=15%）：-5');
  }

  if (world.creditCrisis) {
    delta -= 10;
    factors.push('我方发生信用危机：-10');
  }

  if ((xikou.grainTreasury ?? 0) < 100000) {
    delta += 5;
    factors.push('溪口村粮储紧张（<100000）：+5');
  }

  if (world.tradeBureauEstablished && (world.tradeBureauEfficiency ?? 0) >= 80) {
    delta += 2;
    factors.push('贸易局高效运作：+2');
  }

  if (world.protectLocalCloth) {
    delta -= 5;
    factors.push('贸易保护政策：-5');
  }

  if ((world.subsidyRate ?? 0) > 0) {
    delta += 3;
    factors.push(`贸易补贴（${Math.round((world.subsidyRate ?? 0) * 100)}%）：+3`);
  }

  const roadAttitudeBonus = Math.min(10, Math.floor(Math.max(0, Number(world.roadLength ?? 0)) / 10));
  if (roadAttitudeBonus > 0) {
    delta += roadAttitudeBonus;
    factors.push(`道路互通加成（${Math.floor(Math.max(0, Number(world.roadLength ?? 0)))}里）：+${roadAttitudeBonus}`);
  }
  world.roadAttitudeBonus = roadAttitudeBonus;

  if (factors.length === 0) {
    factors.push('无年度态度修正因素');
  }

  const previous = xikou.attitudeToPlayer ?? 0;
  const next = clampAttitude(previous + delta);
  xikou.attitudeToPlayer = next;
  xikou.attitudeDeltaThisYear = delta;
  xikou.attitudeFactorsThisYear = factors;

  if (delta === 0) {
    return [];
  }

  const direction = delta > 0 ? '上升' : '下降';
  const absoluteDelta = Math.abs(delta);
  return [
    `溪口村对我方态度${direction}${absoluteDelta}点（${factors.join('；')}）`,
  ];
}

export function canSendEnvoyToXikou(world) {
  const hasXikou = Boolean(getXikou(world));
  if (!hasXikou) return { success: false, reason: '溪口数据缺失。' };
  if (getXikou(world)?.diplomaticContact || getXikou(world)?.diplomacy?.diplomaticContact) return { success: false, reason: '已建立外交联系。' };
  if ((world.grainTreasury ?? 0) < SEND_ENVOY_COST_GRAIN) {
    return { success: false, reason: `粮仓不足（需要${SEND_ENVOY_COST_GRAIN}粮）。` };
  }
  return { success: true };
}

export function markEnvoySent(state, polityId) {
  if (!state || !polityId) return;
  state.diplomacy = state.diplomacy ?? {};
  state.diplomacy.envoysSent = state.diplomacy.envoysSent ?? {};
  state.diplomacy.envoysSent[polityId] = true;
}

export function sendEnvoyToPolity(state, polityId) {
  const world = state?.world;
  if (!world || !polityId) {
    return { success: false, reason: '外交数据缺失。' };
  }

  if ((world.grainTreasury ?? 0) < SEND_ENVOY_COST_GRAIN) {
    return { success: false, reason: `粮仓不足（需要${SEND_ENVOY_COST_GRAIN}粮）。` };
  }

  world.grainTreasury = Math.max(0, Number(world.grainTreasury ?? 0) - SEND_ENVOY_COST_GRAIN);
  world.officialIncomePool = Math.max(0, Number(world.officialIncomePool ?? 0) + SEND_ENVOY_COST_GRAIN);
  markEnvoySent(state, polityId);

  return {
    success: true,
    polityId,
    cost: SEND_ENVOY_COST_GRAIN,
    officialIncomeRouted: SEND_ENVOY_COST_GRAIN,
  };
}

export function sendEnvoyToXikou(world, state = null) {
  const xikou = getXikou(world);
  if (!xikou) {
    return { success: false, reason: '溪口数据缺失。' };
  }

  const check = canSendEnvoyToXikou(world);
  if (!check.success) {
    return check;
  }

  world.grainTreasury = Math.max(0, Number(world.grainTreasury ?? 0) - SEND_ENVOY_COST_GRAIN);
  world.officialIncomePool = Math.max(0, Number(world.officialIncomePool ?? 0) + SEND_ENVOY_COST_GRAIN);

  if (!xikou.diplomacy) xikou.diplomacy = {};
  xikou.diplomacy.diplomaticContact = true;
  xikou.diplomacy.attitudeToPlayer = clampAttitude((xikou.diplomacy.attitudeToPlayer ?? xikou.attitudeToPlayer ?? 0) + 10);
  xikou.attitudeDeltaThisYear = 10;
  xikou.attitudeFactorsThisYear = ['派遣使者建立外交联系：+10'];

  if (state) {
    markEnvoySent(state, 'xikou');
  }

  return {
    success: true,
    cost: SEND_ENVOY_COST_GRAIN,
    officialIncomeRouted: SEND_ENVOY_COST_GRAIN,
  };
}
