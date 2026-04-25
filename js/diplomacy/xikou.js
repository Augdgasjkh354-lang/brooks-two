// Diplomacy module: Xikou village and relations
import { clamp, clampRatio } from '../economy/labor.js';
import {
  BASE_GROWTH_RATE, LABOR_RATIO, CHILDREN_RATIO, ELDERLY_RATIO,
  LABOR_PER_MU, XIKOU_SALT_OUTPUT, ENVOY_COST, GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR
} from '../config/constants.js';

export const SEND_ENVOY_COST_GRAIN = ENVOY_COST;


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

export function updateXikouVillageEconomy(world) {
  if (!world || !world.xikou) {
    return;
  }

  const xikou = world.xikou;

  world.saltPrice = getXikouSaltTradePrice(world);
  world.clothPrice = getXikouClothTradePrice(world);
  const growthRate = BASE_GROWTH_RATE;
  const nextPopulation = clamp((xikou.population ?? 0) * (1 + growthRate));

  xikou.population = nextPopulation;
  xikou.laborForce = clamp(nextPopulation * LABOR_RATIO);
  xikou.children = clamp(nextPopulation * CHILDREN_RATIO);
  xikou.elderly = clamp(nextPopulation * ELDERLY_RATIO);

  const saltWorkersRequired = Math.max(0, (xikou.saltMines ?? 0) * 10);
  const saltWorkers = Math.min(xikou.laborForce ?? 0, saltWorkersRequired);

  const laborAfterSalt = Math.max(0, (xikou.laborForce ?? 0) - saltWorkers);

  const farmWorkersRequired = (xikou.farmlandMu ?? 0) / LABOR_PER_MU;
  const farmWorkers = Math.min(laborAfterSalt, farmWorkersRequired);

  const laborAfterFarming = Math.max(0, laborAfterSalt - farmWorkers);
  const mulberryWorkersRequired = (xikou.mulberryLandMu ?? 0) / LABOR_PER_MU;
  const mulberryWorkers = Math.min(laborAfterFarming, mulberryWorkersRequired);

  const idleLabor = Math.max(0, laborAfterFarming - mulberryWorkers);

  const farmEfficiency = farmWorkersRequired > 0 ? clampRatio(farmWorkers / farmWorkersRequired) : 1;

  const tradeEfficiency = Math.max(0, Number(world.techBonuses?.tradeEfficiency ?? 0));
  const tradeMultiplier = 1 + tradeEfficiency;

  const grainOutput = clamp((xikou.farmlandMu ?? 0) * 500 * farmEfficiency);
  const clothOutput = clamp((xikou.mulberryLandMu ?? 0) * 50 * tradeMultiplier);
  const baseSaltOutput =
    saltWorkers >= saltWorkersRequired
      ? XIKOU_SALT_OUTPUT
      : clamp((saltWorkers / Math.max(1, saltWorkersRequired)) * XIKOU_SALT_OUTPUT);
  const saltOutputJin = clamp(baseSaltOutput * tradeMultiplier);

  const annualConsumption = clamp(
    Number(xikou.totalGrainDemand ?? 0) > 0
      ? Number(xikou.totalGrainDemand ?? 0)
      : (xikou.population ?? 0) * GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR
  );
  const nextGrainTreasury = Math.max(0, Math.round((xikou.grainTreasury ?? 0) + grainOutput - annualConsumption));

  xikou.saltMineWorkers = clamp(saltWorkers);
  xikou.farmWorkers = clamp(farmWorkers);
  xikou.mulberryWorkers = clamp(mulberryWorkers);
  xikou.idleLabor = clamp(idleLabor);
  xikou.farmEfficiency = farmEfficiency;
  xikou.grainOutput = grainOutput;
  xikou.clothOutput = clothOutput;
  xikou.saltOutputJin = clamp(saltOutputJin);
  xikou.saltReserve = clamp((xikou.saltReserve ?? 0) + saltOutputJin);
  xikou.grainTreasury = nextGrainTreasury;

  const mulberryLandMu = Math.max(0, Math.floor(xikou.mulberryLandMu ?? 1200));
  const dungOutput = clamp(mulberryLandMu * 600);
  const xikouOwnDemand = Math.max(0, Math.floor((xikou.farmlandMu ?? 0) * 600 * 0.3));
  xikou.silkwormDungOutput = dungOutput;
  xikou.silkwormDungAvailable = Math.max(0, dungOutput - xikouOwnDemand);
}

export function clampAttitude(value) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function updateXikouDiplomacy(world) {
  if (!world || !world.xikou) {
    return [];
  }

  const xikou = world.xikou;

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
  const hasXikou = Boolean(world?.xikou);
  if (!hasXikou) return { success: false, reason: '溪口数据缺失。' };
  if (world.xikou.diplomaticContact) return { success: false, reason: '已建立外交联系。' };
  if ((world.grainTreasury ?? 0) < SEND_ENVOY_COST_GRAIN) {
    return { success: false, reason: `粮仓不足（需要${SEND_ENVOY_COST_GRAIN}粮）。` };
  }
  return { success: true };
}


export function sendEnvoyToXikou(world) {
  if (!world?.xikou) {
    return { success: false, reason: '溪口数据缺失。' };
  }

  const check = canSendEnvoyToXikou(world);
  if (!check.success) {
    return check;
  }

  world.grainTreasury = Math.max(0, Number(world.grainTreasury ?? 0) - SEND_ENVOY_COST_GRAIN);
  world.officialIncomePool = Math.max(0, Number(world.officialIncomePool ?? 0) + SEND_ENVOY_COST_GRAIN);

  world.xikou.diplomaticContact = true;
  world.xikou.attitudeToPlayer = clampAttitude((world.xikou.attitudeToPlayer ?? 0) + 10);
  world.xikou.attitudeDeltaThisYear = 10;
  world.xikou.attitudeFactorsThisYear = ['派遣使者建立外交联系：+10'];

  return {
    success: true,
    cost: SEND_ENVOY_COST_GRAIN,
    officialIncomeRouted: SEND_ENVOY_COST_GRAIN,
  };
}
