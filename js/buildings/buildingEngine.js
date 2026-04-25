import { transfer } from '../economy/transfer.js';
import { BUILDING_TYPES, BUILDING_TYPES_BY_ID } from './buildingTypes.js';
import { PRODUCTION_METHODS } from './productionMethods.js';

function getRootState(state) {
  if (state?.world) return state;
  return {
    world: state,
    buildings: state?.buildings ?? state?.__buildings ?? {},
    commodities: state?.commodities ?? state?.__commodities ?? {},
    research: state?.research ?? state?.__research ?? null,
  };
}

function getBuildingState(state, buildingId) {
  const root = getRootState(state);
  const entry = root.buildings?.[buildingId] ?? null;
  if (!entry) return null;
  return {
    ...entry,
    count: Math.max(0, Number(entry.count ?? 0)),
    method: String(entry.method ?? ''),
  };
}

function getActiveMethod(buildingType, buildingState) {
  const fallbackMethodId = buildingType?.productionMethods?.[0] ?? null;
  const methodId = buildingState?.method || fallbackMethodId;
  return PRODUCTION_METHODS[methodId] ?? PRODUCTION_METHODS[fallbackMethodId] ?? null;
}

function getAgriculture(state) {
  return state?.agriculture ?? state?.world?.__agriculture ?? state?.world ?? state;
}

function getMonetary(state) {
  return state?.monetary ?? state?.world?.__monetary ?? state?.world ?? state;
}


const INPUT_OVERRIDES = {
  blacksmith: { iron_ore: 100, charcoal: 50 },
  kiln: { clay: 100, charcoal: 30 },
  paper_mill: { paper_material: 50 },
  medicine_hall: { herbs: 50 },
  barracks: { weapons: 10, grain: 50000 },
};

function getBaseInputs(buildingType) {
  const override = INPUT_OVERRIDES[buildingType?.id];
  return override ? { ...override } : { ...(buildingType?.baseInputs ?? {}) };
}

function canUseBuilding(buildingType, state) {
  if (!buildingType) return false;
  const unlockFlag = buildingType.unlockFlag;
  if (!unlockFlag) return true;
  const root = getRootState(state);
  return Boolean(root.world?.[unlockFlag]);
}

function scaleRecord(record = {}, multiplier = 1, count = 1) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      Math.max(0, Number(value ?? 0)) * Math.max(0, Number(multiplier ?? 1)) * Math.max(0, Number(count ?? 0)),
    ])
  );
}

function computeInputAvailability(requiredInputs, availableCommodities) {
  const inputEntries = Object.entries(requiredInputs ?? {});
  if (inputEntries.length === 0) return 1;

  let ratio = 1;
  for (const [commodity, required] of inputEntries) {
    const req = Math.max(0, Number(required ?? 0));
    if (req <= 0) continue;
    const available = Math.max(0, Number(availableCommodities?.[commodity] ?? 0));
    ratio = Math.min(ratio, available / req);
  }

  return Math.max(0, Math.min(1, ratio));
}

function hasCompletedTech(root, techId) {
  if (!techId) return false;
  if (Array.isArray(root?.research?.completed) && root.research.completed.includes(techId)) return true;
  if (Array.isArray(root?.world?.research?.completed) && root.world.research.completed.includes(techId)) return true;
  return false;
}

function applyProductionMethodEffects(baseMultiplier, methodId, state) {
  const root = getRootState(state);
  const world = root.world ?? {};
  const commodities = root.commodities ?? {};

  let multiplier = Math.max(0, Number(baseMultiplier ?? 1));
  const safeMethodId = String(methodId ?? '');

  if (safeMethodId === 'iron_tools' && Number(commodities.iron_tools ?? 0) > 0) {
    multiplier *= 1.15;
  }

  const irrigationCanalCount = Math.max(
    0,
    Number(world.irrigationCanalCount ?? world.__land?.irrigationCanalCount ?? 0)
  );
  if (safeMethodId === 'irrigation' && irrigationCanalCount > 0) {
    multiplier *= 1.2;
  }

  if (safeMethodId === 'fertilizer' && Number(commodities.silkworm_dung ?? 0) > 0) {
    multiplier *= 1.2;
  }

  if (safeMethodId === 'crop_rotation' && hasCompletedTech(root, 'crop_rotation')) {
    multiplier *= 1.15;
  }

  return multiplier;
}

export function calculateBuildingOutput(building, count, state, availableCommodities = null) {
  const buildingId = typeof building === 'string' ? building : building?.id;
  const buildingType = BUILDING_TYPES_BY_ID[buildingId] ?? null;
  if (!buildingType || !canUseBuilding(buildingType, state)) {
    return { outputs: {}, inputsConsumed: {}, workers: 0, methodId: null, buildingId };
  }

  const buildingState = getBuildingState(state, buildingId) ?? { count: 0, method: buildingType.productionMethods?.[0] };
  const unitCount = Math.max(0, Number(count ?? buildingState.count ?? 0));
  const method = getActiveMethod(buildingType, buildingState);
  const outputMultiplier = applyProductionMethodEffects(
    Number(method?.outputMultiplier ?? 1),
    method?.id,
    state
  );
  const inputMultiplier = Number(method?.inputMultiplier ?? 1);
  const laborMultiplier = Number(method?.laborMultiplier ?? 1);

  const requiredInputs = scaleRecord(getBaseInputs(buildingType), inputMultiplier, unitCount);
  const commodityPool = availableCommodities ?? getRootState(state).commodities ?? {};
  const availabilityRatio = computeInputAvailability(requiredInputs, commodityPool);
  const inputsConsumed = scaleRecord(requiredInputs, availabilityRatio, 1);
  const outputs = scaleRecord(buildingType.baseOutputs ?? {}, outputMultiplier * availabilityRatio, unitCount);

  return {
    buildingId,
    methodId: method?.id ?? null,
    outputs,
    inputsConsumed,
    workers: Math.max(0, Number(buildingType.baseWorkers ?? 0) * unitCount * laborMultiplier),
    availabilityRatio,
  };
}

export function getBuildingByCategory(category, state) {
  const root = getRootState(state);
  return BUILDING_TYPES
    .filter((building) => building.category === category)
    .map((building) => ({
      ...building,
      ...(root.buildings?.[building.id] ?? { count: 0, method: building.productionMethods?.[0] ?? null }),
      active: canUseBuilding(building, state),
    }));
}

export function canConstructBuilding(buildingId, state, amount = 1) {
  const root = getRootState(state);
  const buildingType = BUILDING_TYPES_BY_ID[buildingId] ?? null;
  const unitAmount = Math.max(1, Math.floor(Number(amount ?? 1)));

  if (!buildingType) return { canBuild: false, reason: '未知建筑' };
  if (!canUseBuilding(buildingType, state)) return { canBuild: false, reason: '未解锁' };

  const agriculture = getAgriculture(root);
  const monetary = getMonetary(root);
  const grainCost = Math.max(0, Number(buildingType.constructionCost?.grain ?? 0)) * unitAmount;
  const couponCost = Math.max(0, Number(buildingType.constructionCost?.coupon ?? 0)) * unitAmount;

  if ((agriculture.grainTreasury ?? 0) < grainCost) return { canBuild: false, reason: `粮仓不足（需 ${Math.round(grainCost)}）` };
  if ((monetary.couponTreasury ?? 0) < couponCost) return { canBuild: false, reason: `劵仓不足（需 ${Math.round(couponCost)}）` };

  return { canBuild: true, reason: 'ok', grainCost, couponCost };
}

export function constructBuilding(buildingId, amount, state) {
  const root = getRootState(state);
  const unitAmount = Math.max(1, Math.floor(Number(amount ?? 1)));
  const check = canConstructBuilding(buildingId, root, unitAmount);
  if (!check.canBuild) return { success: false, reason: check.reason };

  if (check.grainCost > 0) {
    const ok = transfer({
      from: 'government.grain',
      to: 'private.farmer.grain',
      asset: 'grain',
      amount: check.grainCost,
      gdpTreatment: 'construction',
      reason: `construct:${buildingId}`,
    }, root);
    if (!ok) return { success: false, reason: '粮食扣除失败' };
  }

  if (check.couponCost > 0) {
    const ok = transfer({
      from: 'government.coupon',
      to: 'private.farmer.coupon',
      asset: 'coupon',
      amount: check.couponCost,
      gdpTreatment: 'construction',
      reason: `construct:${buildingId}`,
    }, root);
    if (!ok) return { success: false, reason: '粮劵扣除失败' };
  }

  root.buildings[buildingId] = root.buildings[buildingId] ?? { count: 0, method: BUILDING_TYPES_BY_ID[buildingId]?.productionMethods?.[0] ?? null };
  root.buildings[buildingId].count = Math.max(0, Number(root.buildings[buildingId].count ?? 0)) + unitAmount;

  const spending = Number(check.grainCost ?? 0) + Number(check.couponCost ?? 0);
  root.world.constructionSpendingThisYear = Math.max(0, Number(root.world.constructionSpendingThisYear ?? 0) + spending);

  return { success: true, grainCost: check.grainCost, couponCost: check.couponCost, newCount: root.buildings[buildingId].count };
}

export function calculateAllBuildingOutputs(state) {
  const root = getRootState(state);
  root.commodities = root.commodities ?? {};
  root.world = root.world ?? {};
  root.world.privateSector = root.world.privateSector ?? {};

  const yearlyOutputs = {};
  const yearlyInputs = {};
  const taxSplit = {};
  let totalWorkers = 0;

  const availablePool = { ...root.commodities };

  for (const buildingType of BUILDING_TYPES) {
    const entry = getBuildingState(root, buildingType.id);
    const count = Math.max(0, Number(entry?.count ?? 0));
    if (count <= 0) continue;

    const result = calculateBuildingOutput(buildingType.id, count, root, availablePool);
    totalWorkers += Number(result.workers ?? 0);

    Object.entries(result.inputsConsumed ?? {}).forEach(([commodity, value]) => {
      const amount = Math.max(0, Number(value ?? 0));
      yearlyInputs[commodity] = Math.max(0, Number(yearlyInputs[commodity] ?? 0) + amount);
      availablePool[commodity] = Math.max(0, Number(availablePool[commodity] ?? 0) - amount);
      root.commodities[commodity] = Math.max(0, Number(root.commodities[commodity] ?? 0) - amount);
    });

    Object.entries(result.outputs ?? {}).forEach(([commodity, value]) => {
      const amount = Math.max(0, Number(value ?? 0));
      if (buildingType.id === 'farmland' && commodity === 'grain') {
        const grainTaxRate = Math.max(0, Math.min(1, Number(root.world.agriculturalTaxRate ?? root.world.__agriculture?.agriculturalTaxRate ?? 0)));
        const govShare = amount * grainTaxRate;
        const farmerShare = Math.max(0, amount - govShare);

        taxSplit.farmland = taxSplit.farmland ?? { govShare: 0, farmerShare: 0, totalOutput: 0, taxRate: grainTaxRate };
        taxSplit.farmland.govShare = Math.max(0, Number(taxSplit.farmland.govShare ?? 0) + govShare);
        taxSplit.farmland.farmerShare = Math.max(0, Number(taxSplit.farmland.farmerShare ?? 0) + farmerShare);
        taxSplit.farmland.totalOutput = Math.max(0, Number(taxSplit.farmland.totalOutput ?? 0) + amount);
        taxSplit.farmland.taxRate = grainTaxRate;

        yearlyOutputs[commodity] = Math.max(0, Number(yearlyOutputs[commodity] ?? 0) + govShare);
        availablePool[commodity] = Math.max(0, Number(availablePool[commodity] ?? 0) + govShare);
        root.commodities[commodity] = Math.max(0, Number(root.commodities[commodity] ?? 0) + govShare);
        return;
      }

      yearlyOutputs[commodity] = Math.max(0, Number(yearlyOutputs[commodity] ?? 0) + amount);
      availablePool[commodity] = Math.max(0, Number(availablePool[commodity] ?? 0) + amount);
      root.commodities[commodity] = Math.max(0, Number(root.commodities[commodity] ?? 0) + amount);
    });
  }

  const farmlandTaxSplit = taxSplit.farmland ?? { govShare: 0, farmerShare: 0, totalOutput: 0, taxRate: 0 };
  root.world.grainTreasury = Math.max(
    0,
    Number(root.world.grainTreasury ?? 0) + Number(farmlandTaxSplit.govShare ?? 0)
  );
  root.world.privateSector.farmerGrain = Math.max(
    0,
    Number(root.world.privateSector.farmerGrain ?? 0) + Number(farmlandTaxSplit.farmerShare ?? 0)
  );
  root.world.farmerRetainedGrain = Math.max(0, Number(root.world.farmerRetainedGrain ?? 0) + Number(farmlandTaxSplit.farmerShare ?? 0));

  root.world.buildingOutputSummary = {
    outputs: yearlyOutputs,
    inputsConsumed: yearlyInputs,
    workers: totalWorkers,
    taxSplit,
  };

  return root.world.buildingOutputSummary;
}
