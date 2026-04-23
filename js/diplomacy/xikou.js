// Diplomacy module: Xikou village and relations
import { clamp, clampRatio } from '../economy/labor.js';

export const SEND_ENVOY_COST_GRAIN = 500000;

export function updateXikouVillageEconomy(world) {
  if (!world || !world.xikou) {
    return;
  }

  const xikou = world.xikou;
  const growthRate = 0.02;
  const nextPopulation = clamp((xikou.population ?? 0) * (1 + growthRate));

  xikou.population = nextPopulation;
  xikou.laborForce = clamp(nextPopulation * 0.6);
  xikou.children = clamp(nextPopulation * 0.2);
  xikou.elderly = clamp(nextPopulation * 0.2);

  const saltWorkersRequired = Math.max(0, (xikou.saltMines ?? 0) * 10);
  const saltWorkers = Math.min(xikou.laborForce ?? 0, saltWorkersRequired);

  const laborAfterSalt = Math.max(0, (xikou.laborForce ?? 0) - saltWorkers);

  const farmWorkersRequired = (xikou.farmlandMu ?? 0) / 10;
  const farmWorkers = Math.min(laborAfterSalt, farmWorkersRequired);

  const laborAfterFarming = Math.max(0, laborAfterSalt - farmWorkers);
  const mulberryWorkersRequired = (xikou.mulberryLandMu ?? 0) / 10;
  const mulberryWorkers = Math.min(laborAfterFarming, mulberryWorkersRequired);

  const idleLabor = Math.max(0, laborAfterFarming - mulberryWorkers);

  const farmEfficiency = farmWorkersRequired > 0 ? clampRatio(farmWorkers / farmWorkersRequired) : 1;

  const tradeEfficiency = Math.max(0, Number(world.techBonuses?.tradeEfficiency ?? 0));
  const tradeMultiplier = 1 + tradeEfficiency;

  const grainOutput = clamp((xikou.farmlandMu ?? 0) * 500 * farmEfficiency);
  const clothOutput = clamp((xikou.mulberryLandMu ?? 0) * 50 * tradeMultiplier);
  const baseSaltOutput =
    saltWorkers >= saltWorkersRequired
      ? 200000
      : clamp((saltWorkers / Math.max(1, saltWorkersRequired)) * 200000);
  const saltOutputJin = clamp(baseSaltOutput * tradeMultiplier);

  const annualConsumption = clamp((xikou.population ?? 0) * 2);
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
