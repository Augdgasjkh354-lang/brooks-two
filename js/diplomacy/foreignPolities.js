function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function mergePolity(defaultPolity, existingPolity = {}) {
  return {
    ...defaultPolity,
    ...existingPolity,
    commodities: {
      ...defaultPolity.commodities,
      ...(existingPolity.commodities ?? {}),
    },
    production: {
      ...defaultPolity.production,
      ...(existingPolity.production ?? {}),
    },
    prices: {
      ...defaultPolity.prices,
      ...(existingPolity.prices ?? {}),
    },
    diplomacy: {
      ...defaultPolity.diplomacy,
      ...(existingPolity.diplomacy ?? {}),
    },
  };
}

function createXikouPolityFromLegacy(legacyXikou = {}) {
  return {
    id: 'xikou',
    name: '溪口村',
    type: 'village',
    population: Math.max(0, safeNumber(legacyXikou.population, 2000)),
    laborForce: Math.max(0, safeNumber(legacyXikou.laborForce, 1200)),
    commodities: {
      grain: Math.max(0, safeNumber(legacyXikou.grainTreasury, 500000)),
      salt: Math.max(0, safeNumber(legacyXikou.saltReserve, 0)),
      cloth: Math.max(0, safeNumber(legacyXikou.clothReserve ?? legacyXikou.clothOutput, 0)),
      dung: Math.max(0, safeNumber(legacyXikou.silkwormDungAvailable, 0)),
    },
    production: {
      farmlandMu: Math.max(0, safeNumber(legacyXikou.farmlandMu, 3000)),
      saltMines: Math.max(0, safeNumber(legacyXikou.saltMines, 2)),
      mulberryLandMu: Math.max(0, safeNumber(legacyXikou.mulberryLandMu, 1200)),
    },
    prices: {
      grain: Math.max(0.1, safeNumber(legacyXikou.grainPrice, 1.0)),
      salt: Math.max(0.1, safeNumber(legacyXikou.saltPrice, 4.0)),
      cloth: Math.max(0.1, safeNumber(legacyXikou.clothPrice, 2.0)),
    },
    diplomacy: {
      attitudeToPlayer: clamp(safeNumber(legacyXikou.attitudeToPlayer, 0), -100, 100),
      trust: clamp(safeNumber(legacyXikou.trust, 40), 0, 100),
      dependency: clamp(safeNumber(legacyXikou.dependency, 20), 0, 100),
      diplomaticContact: Boolean(legacyXikou.diplomaticContact),
    },
  };
}

function syncLegacyXikou(state) {
  const xikou = state?.foreignPolities?.xikou;
  if (!xikou) return;

  state.xikou = state.xikou ?? {};
  state.world = state.world ?? {};

  state.xikou.population = xikou.population;
  state.xikou.laborForce = xikou.laborForce;
  state.xikou.farmlandMu = xikou.production.farmlandMu;
  state.xikou.saltMines = xikou.production.saltMines;
  state.xikou.mulberryLandMu = xikou.production.mulberryLandMu;

  state.xikou.grainTreasury = xikou.commodities.grain;
  state.xikou.saltReserve = xikou.commodities.salt;
  state.xikou.clothReserve = xikou.commodities.cloth;
  state.xikou.silkwormDungAvailable = xikou.commodities.dung;

  state.xikou.attitudeToPlayer = xikou.diplomacy.attitudeToPlayer;
  state.xikou.trust = xikou.diplomacy.trust;
  state.xikou.dependency = xikou.diplomacy.dependency;
  state.xikou.diplomaticContact = Boolean(xikou.diplomacy.diplomaticContact);

  state.world.xikou = state.xikou;
}

export function initForeignPolities(state) {
  if (!state) return;

  state.foreignPolities = state.foreignPolities ?? {};

  const legacyXikou = state.xikou ?? state.world?.xikou ?? state.foreignPolities.xikou ?? {};
  const defaultXikou = createXikouPolityFromLegacy(legacyXikou);
  state.foreignPolities.xikou = mergePolity(defaultXikou, state.foreignPolities.xikou);

  state.foreignPolities.northernTraders = mergePolity({
    id: 'northernTraders',
    name: '北方商队',
    type: 'traders',
    population: 500,
    laborForce: 300,
    commodities: { grain: 100000, salt: 0, cloth: 5000, dung: 0 },
    production: { farmlandMu: 0, saltMines: 0, mulberryLandMu: 0 },
    prices: { grain: 1.2, salt: 5, cloth: 3 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 },
  }, state.foreignPolities.northernTraders);

  syncLegacyXikou(state);
}

export function getForeignPolity(state, id) {
  if (!state || !id) return null;
  return state.foreignPolities?.[id] ?? null;
}

export function updateForeignPolities(state) {
  if (!state) return;

  initForeignPolities(state);

  Object.values(state.foreignPolities).forEach((polity) => {
    if (!polity) return;

    polity.population = Math.round(Math.max(0, safeNumber(polity.population, 0)) * 1.005);
    polity.laborForce = Math.round(polity.population * 0.6);

    const farmlandMu = Math.max(0, safeNumber(polity.production?.farmlandMu, 0));
    const saltMines = Math.max(0, safeNumber(polity.production?.saltMines, 0));
    const mulberryLandMu = Math.max(0, safeNumber(polity.production?.mulberryLandMu, 0));

    const grainOutput = (farmlandMu / 10) * 360;
    const saltOutput = saltMines * 200000;
    const clothOutput = mulberryLandMu * 0.3;

    const grainStock = safeNumber(polity.commodities?.grain, 0) + grainOutput;
    const saltStock = safeNumber(polity.commodities?.salt, 0) + saltOutput;
    const clothStock = safeNumber(polity.commodities?.cloth, 0) + clothOutput;
    const dungStock = safeNumber(polity.commodities?.dung, 0);

    polity.commodities = polity.commodities ?? {};
    polity.commodities.grain = Math.round(clamp(grainStock, 0, 50000000));
    polity.commodities.salt = Math.round(clamp(saltStock, 0, 10000000));
    polity.commodities.cloth = Math.round(clamp(clothStock, 0, 2000000));
    polity.commodities.dung = Math.round(clamp(dungStock, 0, 2000000));
  });

  syncLegacyXikou(state);
}
