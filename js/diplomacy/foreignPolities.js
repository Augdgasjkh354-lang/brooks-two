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
      iron: Math.max(0, safeNumber(legacyXikou.ironStock, 0)),
      copper: Math.max(0, safeNumber(legacyXikou.copperStock, 0)),
      silk: Math.max(0, safeNumber(legacyXikou.rawSilkOutput, 0)),
    },
    production: {
      farmlandMu: Math.max(0, safeNumber(legacyXikou.farmlandMu, 3000)),
      saltMines: Math.max(0, safeNumber(legacyXikou.saltMines, 2)),
      mulberryLandMu: Math.max(0, safeNumber(legacyXikou.mulberryLandMu, 1200)),
      herbFields: Math.max(0, safeNumber(legacyXikou.herbFields, 0)),
      ironMines: Math.max(0, safeNumber(legacyXikou.ironMines, 0)),
      copperMines: Math.max(0, safeNumber(legacyXikou.copperMines, 0)),
    },
    prices: {
      grain: Math.max(0.1, safeNumber(legacyXikou.grainPrice, 1.0)),
      salt: Math.max(0.1, safeNumber(legacyXikou.saltPrice, 4.0)),
      cloth: Math.max(0.1, safeNumber(legacyXikou.clothPrice, 2.0)),
      herb: Math.max(0.1, safeNumber(legacyXikou.herbPrice, 3.0)),
      iron: Math.max(0.1, safeNumber(legacyXikou.ironPrice, 6.0)),
      copper: Math.max(0.1, safeNumber(legacyXikou.copperPrice, 8.0)),
      silk: Math.max(0.1, safeNumber(legacyXikou.silkPrice, 15.0)),
    },
    diplomacy: {
      attitudeToPlayer: clamp(safeNumber(legacyXikou.attitudeToPlayer, 0), -100, 100),
      trust: clamp(safeNumber(legacyXikou.trust, 40), 0, 100),
      dependency: clamp(safeNumber(legacyXikou.dependency, 20), 0, 100),
      diplomaticContact: Boolean(legacyXikou.diplomaticContact),
    },
    gdp: Math.max(0, safeNumber(legacyXikou.gdp, 0)),
    militaryStrength: Math.max(0, safeNumber(legacyXikou.militaryStrength, 0)),
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

export function initForeignPolities(state) {
  if (!state) return;

  state.foreignPolities = state.foreignPolities ?? {};

  const legacyXikou = state.xikou ?? state.world?.xikou ?? state.foreignPolities.xikou ?? {};
  const defaultXikou = createXikouFromLegacyXikou(legacyXikou);
  state.foreignPolities.xikou = mergePolity(defaultXikou, state.foreignPolities.xikou);

  state.foreignPolities.northernTraders = mergePolity({
    id: 'northernTraders',
    name: '北方商队',
    type: 'traders',
    population: 500,
    laborForce: 300,
    commodities: { grain: 100000, salt: 0, cloth: 5000, dung: 0, herb: 0, iron: 0, copper: 0, silk: 0 },
    production: { farmlandMu: 0, saltMines: 0, mulberryLandMu: 0, herbFields: 0, ironMines: 0, copperMines: 0 },
    prices: { grain: 1.2, salt: 5, cloth: 3, herb: 4, iron: 6, copper: 8, silk: 15 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 },
    gdp: 0,
    militaryStrength: 0,
  }, state.foreignPolities.northernTraders);

  state.foreignPolities.southernTribe = mergePolity({
    id: 'southernTribe',
    name: '南部部落',
    type: 'tribe',
    population: 2000,
    laborForce: 1200,
    commodities: { grain: 200000, salt: 0, cloth: 3000, dung: 0, herb: 50000, iron: 0, copper: 0, silk: 0 },
    production: { farmlandMu: 2000, saltMines: 0, mulberryLandMu: 0, herbFields: 500, ironMines: 0, copperMines: 0 },
    prices: { grain: 1, salt: 6, cloth: 2, herb: 3, iron: 7, copper: 9, silk: 16 },
    diplomacy: { attitudeToPlayer: -20, trust: 20, dependency: 0 },
    gdp: 0,
    militaryStrength: 200,
  }, state.foreignPolities.southernTribe);

  state.foreignPolities.saltLakeTown = mergePolity({
    id: 'saltLakeTown',
    name: '盐湖镇',
    type: 'town',
    population: 4000,
    laborForce: 2400,
    commodities: { grain: 300000, salt: 800000, cloth: 5000, dung: 0, herb: 0, iron: 0, copper: 0, silk: 0 },
    production: { farmlandMu: 4000, saltMines: 5, mulberryLandMu: 0, herbFields: 0, ironMines: 0, copperMines: 0 },
    prices: { grain: 1, salt: 3, cloth: 2.5, herb: 4, iron: 6, copper: 8, silk: 15 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 },
    gdp: 0,
    militaryStrength: 250,
  }, state.foreignPolities.saltLakeTown);

  state.foreignPolities.copperMountainCity = mergePolity({
    id: 'copperMountainCity',
    name: '铜山城',
    type: 'city',
    population: 8000,
    laborForce: 4800,
    commodities: { grain: 500000, salt: 0, cloth: 8000, dung: 0, herb: 0, iron: 200000, copper: 300000, silk: 0 },
    production: { farmlandMu: 6000, saltMines: 0, mulberryLandMu: 0, herbFields: 0, ironMines: 3, copperMines: 5 },
    prices: { grain: 1.2, salt: 5, cloth: 2.5, herb: 4, iron: 6, copper: 8, silk: 16 },
    diplomacy: { attitudeToPlayer: 0, trust: 40, dependency: 0 },
    gdp: 2000000,
    militaryStrength: 500,
  }, state.foreignPolities.copperMountainCity);

  state.foreignPolities.riverPort = mergePolity({
    id: 'riverPort',
    name: '河口商港',
    type: 'city',
    population: 10000,
    laborForce: 6000,
    commodities: { grain: 800000, salt: 100000, cloth: 50000, dung: 0, herb: 0, iron: 50000, copper: 0, silk: 30000 },
    production: { farmlandMu: 5000, saltMines: 1, mulberryLandMu: 2000, herbFields: 0, ironMines: 1, copperMines: 0 },
    prices: { grain: 1.1, salt: 4, cloth: 2, herb: 4, iron: 5, copper: 8, silk: 15 },
    diplomacy: { attitudeToPlayer: 10, trust: 50, dependency: 0 },
    gdp: 5000000,
    militaryStrength: 800,
  }, state.foreignPolities.riverPort);

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
    polity.prices = polity.prices ?? {};

    const farmlandMu = Math.max(0, safeNumber(polity.production.farmlandMu, 0));
    const saltMines = Math.max(0, safeNumber(polity.production.saltMines, 0));
    const mulberryLandMu = Math.max(0, safeNumber(polity.production.mulberryLandMu, 0));
    const herbFields = Math.max(0, safeNumber(polity.production.herbFields, 0));
    const ironMines = Math.max(0, safeNumber(polity.production.ironMines, 0));
    const copperMines = Math.max(0, safeNumber(polity.production.copperMines, 0));

    const grainOutput = (farmlandMu / 10) * 360;
    const saltOutput = saltMines * 200000;
    const clothOutput = mulberryLandMu * 0.3;
    const silkOutput = mulberryLandMu * 0.1;
    const herbOutput = herbFields * 200;
    const ironOutput = ironMines * 100000;
    const copperOutput = copperMines * 80000;

    polity.commodities.grain = Math.round(clamp(safeNumber(polity.commodities.grain, 0) + grainOutput, 0, 50000000));
    polity.commodities.salt = Math.round(clamp(safeNumber(polity.commodities.salt, 0) + saltOutput, 0, 10000000));
    polity.commodities.cloth = Math.round(clamp(safeNumber(polity.commodities.cloth, 0) + clothOutput, 0, 2000000));
    polity.commodities.dung = Math.round(clamp(safeNumber(polity.commodities.dung, 0), 0, 2000000));
    polity.commodities.herb = Math.round(clamp(safeNumber(polity.commodities.herb, 0) + herbOutput, 0, 5000000));
    polity.commodities.iron = Math.round(clamp(safeNumber(polity.commodities.iron, 0) + ironOutput, 0, 20000000));
    polity.commodities.copper = Math.round(clamp(safeNumber(polity.commodities.copper, 0) + copperOutput, 0, 20000000));
    polity.commodities.silk = Math.round(clamp(safeNumber(polity.commodities.silk, 0) + silkOutput, 0, 2000000));

    const priceValues = Object.values(polity.prices).map((v) => Math.max(0.1, safeNumber(v, 1)));
    const avgPrice = priceValues.length > 0
      ? priceValues.reduce((sum, v) => sum + v, 0) / priceValues.length
      : 1;

    const stockValue = Object.values(polity.commodities).reduce(
      (sum, amount) => sum + Math.max(0, safeNumber(amount, 0)),
      0
    );

    polity.gdp = Math.round(stockValue * avgPrice * 0.01);
    polity.militaryStrength = Math.max(0, Math.round(safeNumber(polity.militaryStrength, 0)));
  });

  syncLegacyXikou(state);
}
