function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function createXikouFromLegacyXikou(legacyXikou = {}) {
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
      herb: Math.max(0, safeNumber(legacyXikou.herbStock, 0)),
    },
    production: {
      farmlandMu: Math.max(0, safeNumber(legacyXikou.farmlandMu, 3000)),
      saltMines: Math.max(0, safeNumber(legacyXikou.saltMines, 2)),
      mulberryLandMu: Math.max(0, safeNumber(legacyXikou.mulberryLandMu, 1200)),
      herbFields: Math.max(0, safeNumber(legacyXikou.herbFields, 0)),
    },
    prices: {
      grain: Math.max(0.1, safeNumber(legacyXikou.grainPrice, 1.0)),
      salt: Math.max(0.1, safeNumber(legacyXikou.saltPrice, 4.0)),
      cloth: Math.max(0.1, safeNumber(legacyXikou.clothPrice, 2.0)),
      herb: Math.max(0.1, safeNumber(legacyXikou.herbPrice, 3.0)),
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
  const polity = state?.foreignPolities?.xikou;
  if (!polity) return;

  state.xikou = state.xikou ?? {};
  state.world = state.world ?? {};

  state.xikou.population = polity.population;
  state.xikou.laborForce = polity.laborForce;
  state.xikou.farmlandMu = polity.production.farmlandMu;
  state.xikou.saltMines = polity.production.saltMines;
  state.xikou.mulberryLandMu = polity.production.mulberryLandMu;

  state.xikou.grainTreasury = polity.commodities.grain;
  state.xikou.saltReserve = polity.commodities.salt;
  state.xikou.clothReserve = polity.commodities.cloth;
  state.xikou.silkwormDungAvailable = polity.commodities.dung;

  state.xikou.attitudeToPlayer = polity.diplomacy.attitudeToPlayer;
  state.xikou.trust = polity.diplomacy.trust;
  state.xikou.dependency = polity.diplomacy.dependency;
  state.xikou.diplomaticContact = Boolean(polity.diplomacy.diplomaticContact);

  state.world.xikou = state.xikou;
}

export function initForeignPolities(state) {
  if (!state) return;

  state.foreignPolities = state.foreignPolities ?? {};

  const legacyXikou = state.xikou ?? state.world?.xikou ?? state.foreignPolities.xikou ?? {};
  const defaultXikou = createXikouFromLegacyXikou(legacyXikou);
  state.foreignPolities.xikou = {
    ...defaultXikou,
    ...(state.foreignPolities.xikou ?? {}),
    commodities: {
      ...defaultXikou.commodities,
      ...(state.foreignPolities.xikou?.commodities ?? {}),
    },
    production: {
      ...defaultXikou.production,
      ...(state.foreignPolities.xikou?.production ?? {}),
    },
    prices: {
      ...defaultXikou.prices,
      ...(state.foreignPolities.xikou?.prices ?? {}),
    },
    diplomacy: {
      ...defaultXikou.diplomacy,
      ...(state.foreignPolities.xikou?.diplomacy ?? {}),
    },
  };

  state.foreignPolities.northernTraders = {
    id: 'northernTraders',
    name: '北方商队',
    type: 'traders',
    population: 500,
    laborForce: 300,
    commodities: { grain: 100000, salt: 0, cloth: 5000, dung: 0, herb: 0 },
    production: { farmlandMu: 0, saltMines: 0, mulberryLandMu: 0, herbFields: 0 },
    prices: { grain: 1.2, salt: 5, cloth: 3, herb: 4 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 },
    ...(state.foreignPolities.northernTraders ?? {}),
    commodities: {
      grain: 100000,
      salt: 0,
      cloth: 5000,
      dung: 0,
      herb: 0,
      ...(state.foreignPolities.northernTraders?.commodities ?? {}),
    },
    production: {
      farmlandMu: 0,
      saltMines: 0,
      mulberryLandMu: 0,
      herbFields: 0,
      ...(state.foreignPolities.northernTraders?.production ?? {}),
    },
    prices: {
      grain: 1.2,
      salt: 5,
      cloth: 3,
      herb: 4,
      ...(state.foreignPolities.northernTraders?.prices ?? {}),
    },
    diplomacy: {
      attitudeToPlayer: 0,
      trust: 30,
      dependency: 0,
      ...(state.foreignPolities.northernTraders?.diplomacy ?? {}),
    },
  };

  state.foreignPolities.southernTribe = {
    id: 'southernTribe',
    name: '南部部落',
    type: 'tribe',
    population: 2000,
    laborForce: 1200,
    commodities: { grain: 200000, salt: 0, cloth: 3000, dung: 0, herb: 50000 },
    production: { farmlandMu: 2000, saltMines: 0, mulberryLandMu: 0, herbFields: 500 },
    prices: { grain: 1, salt: 6, cloth: 2, herb: 3 },
    diplomacy: { attitudeToPlayer: -20, trust: 20, dependency: 0 },
    ...(state.foreignPolities.southernTribe ?? {}),
    commodities: {
      grain: 200000,
      salt: 0,
      cloth: 3000,
      dung: 0,
      herb: 50000,
      ...(state.foreignPolities.southernTribe?.commodities ?? {}),
    },
    production: {
      farmlandMu: 2000,
      saltMines: 0,
      mulberryLandMu: 0,
      herbFields: 500,
      ...(state.foreignPolities.southernTribe?.production ?? {}),
    },
    prices: {
      grain: 1,
      salt: 6,
      cloth: 2,
      herb: 3,
      ...(state.foreignPolities.southernTribe?.prices ?? {}),
    },
    diplomacy: {
      attitudeToPlayer: -20,
      trust: 20,
      dependency: 0,
      ...(state.foreignPolities.southernTribe?.diplomacy ?? {}),
    },
  };

  state.foreignPolities.saltLakeTown = {
    id: 'saltLakeTown',
    name: '盐湖镇',
    type: 'town',
    population: 4000,
    laborForce: 2400,
    commodities: { grain: 300000, salt: 800000, cloth: 5000, dung: 0, herb: 0 },
    production: { farmlandMu: 4000, saltMines: 5, mulberryLandMu: 0, herbFields: 0 },
    prices: { grain: 1, salt: 3, cloth: 2.5, herb: 4 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 },
    ...(state.foreignPolities.saltLakeTown ?? {}),
    commodities: {
      grain: 300000,
      salt: 800000,
      cloth: 5000,
      dung: 0,
      herb: 0,
      ...(state.foreignPolities.saltLakeTown?.commodities ?? {}),
    },
    production: {
      farmlandMu: 4000,
      saltMines: 5,
      mulberryLandMu: 0,
      herbFields: 0,
      ...(state.foreignPolities.saltLakeTown?.production ?? {}),
    },
    prices: {
      grain: 1,
      salt: 3,
      cloth: 2.5,
      herb: 4,
      ...(state.foreignPolities.saltLakeTown?.prices ?? {}),
    },
    diplomacy: {
      attitudeToPlayer: 0,
      trust: 30,
      dependency: 0,
      ...(state.foreignPolities.saltLakeTown?.diplomacy ?? {}),
    },
  };

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

    const population = Math.max(0, safeNumber(polity.population, 0));
    polity.population = Math.round(population * 1.005);
    polity.laborForce = Math.round(polity.population * 0.6);

    polity.commodities = polity.commodities ?? {};
    polity.production = polity.production ?? {};

    const farmlandMu = Math.max(0, safeNumber(polity.production.farmlandMu, 0));
    const saltMines = Math.max(0, safeNumber(polity.production.saltMines, 0));
    const mulberryLandMu = Math.max(0, safeNumber(polity.production.mulberryLandMu, 0));
    const herbFields = Math.max(0, safeNumber(polity.production.herbFields, 0));

    const grainOutput = (farmlandMu / 10) * 360;
    const saltOutput = saltMines * 200000;
    const clothOutput = mulberryLandMu * 0.3;
    const herbOutput = herbFields * 200;

    polity.commodities.grain = Math.round(clamp(safeNumber(polity.commodities.grain, 0) + grainOutput, 0, 50000000));
    polity.commodities.salt = Math.round(clamp(safeNumber(polity.commodities.salt, 0) + saltOutput, 0, 10000000));
    polity.commodities.cloth = Math.round(clamp(safeNumber(polity.commodities.cloth, 0) + clothOutput, 0, 2000000));
    polity.commodities.dung = Math.round(clamp(safeNumber(polity.commodities.dung, 0), 0, 2000000));
    polity.commodities.herb = Math.round(clamp(safeNumber(polity.commodities.herb, 0) + herbOutput, 0, 5000000));
  });

  syncLegacyXikou(state);
}
