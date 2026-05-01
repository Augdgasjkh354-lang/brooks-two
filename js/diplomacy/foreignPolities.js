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
    basePrices: {
      ...defaultPolity.basePrices,
      ...(existingPolity.basePrices ?? {}),
    },
    diplomacy: {
      ...defaultPolity.diplomacy,
      ...(existingPolity.diplomacy ?? {}),
    },
    trade: {
      ...defaultPolity.trade,
      ...(existingPolity.trade ?? {}),
      exportWillingness: {
        ...(defaultPolity.trade?.exportWillingness ?? {}),
        ...(existingPolity.trade?.exportWillingness ?? {}),
      },
      exportRestrictions: {
        ...(defaultPolity.trade?.exportRestrictions ?? {}),
        ...(existingPolity.trade?.exportRestrictions ?? {}),
      },
      minCommodityReserve: {
        ...(defaultPolity.trade?.minCommodityReserve ?? {}),
        ...(existingPolity.trade?.minCommodityReserve ?? {}),
      },
    },
  };
}

function calculatePolityPrice(previousPrice, basePrice, supply, demand, elasticity = 0.5, minPrice = 0.1, maxPrice = 50) {
  const safePrevious = Math.max(minPrice, safeNumber(previousPrice, minPrice));
  const safeBase = Math.max(minPrice, safeNumber(basePrice, safePrevious));
  const safeSupply = Math.max(1, safeNumber(supply, 1));
  const safeDemand = Math.max(0, safeNumber(demand, 0));
  const ratio = safeDemand / safeSupply;
  const targetPrice = safeBase * Math.pow(Math.max(0.1, ratio), clamp(elasticity, 0.1, 1.5));
  const smoothed = safePrevious * 0.7 + targetPrice * 0.3;
  return clamp(smoothed, minPrice, maxPrice);
}

function updatePolityTradePolicy(polity, demandState) {
  polity.trade = polity.trade ?? {};
  polity.trade.exportWillingness = polity.trade.exportWillingness ?? {};
  polity.trade.exportRestrictions = polity.trade.exportRestrictions ?? {};
  polity.trade.minCommodityReserve = polity.trade.minCommodityReserve ?? {};

  const commodities = ['grain', 'salt', 'cloth', 'dung'];
  for (const commodity of commodities) {
    const stock = Math.max(0, safeNumber(polity?.commodities?.[commodity], 0));
    const supply = Math.max(0, safeNumber(demandState?.[commodity]?.supply, 0));
    const demand = Math.max(0, safeNumber(demandState?.[commodity]?.demand, 0));

    const baseReserve = commodity === 'grain' ? 150000 : commodity === 'salt' ? 10000 : commodity === 'cloth' ? 3000 : 500;
    const dynamicReserve = Math.max(baseReserve, demand * 0.4);
    polity.trade.minCommodityReserve[commodity] = Math.round(dynamicReserve);

    const shortageRatio = demand / Math.max(1, supply);
    const reserveCovered = stock > dynamicReserve;

    polity.trade.exportRestrictions[commodity] = shortageRatio > 1.25 || !reserveCovered;

    let willingness = 1;
    if (shortageRatio > 1.1) willingness -= 0.25;
    if (shortageRatio > 1.3) willingness -= 0.25;
    if (!reserveCovered) willingness -= 0.35;

    polity.trade.exportWillingness[commodity] = clamp(willingness, 0.05, 1);
  }
}

function createXikouPolityFromLegacy(legacyXikou = {}) {
  const grainPrice = Math.max(0.1, safeNumber(legacyXikou.grainPrice, 1.0));
  const saltPrice = Math.max(0.1, safeNumber(legacyXikou.saltPrice, 4.0));
  const clothPrice = Math.max(0.1, safeNumber(legacyXikou.clothPrice, 2.0));

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
      grain: grainPrice,
      salt: saltPrice,
      cloth: clothPrice,
    },
    basePrices: {
      grain: grainPrice,
      salt: saltPrice,
      cloth: clothPrice,
    },
    diplomacy: {
      attitudeToPlayer: clamp(safeNumber(legacyXikou.attitudeToPlayer, 0), -100, 100),
      trust: clamp(safeNumber(legacyXikou.trust, 40), 0, 100),
      dependency: clamp(safeNumber(legacyXikou.dependency, 20), 0, 100),
      diplomaticContact: Boolean(legacyXikou.diplomaticContact),
    },
    trade: {
      baseExportWillingness: 0.9,
      exportWillingness: { grain: 0.9, salt: 0.95, cloth: 0.9, dung: 0.95 },
      exportRestrictions: { grain: false, salt: false, cloth: false, dung: false },
      minCommodityReserve: { grain: 150000, salt: 10000, cloth: 3000, dung: 500 },
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

  state.xikou.grainPrice = xikou.prices.grain;
  state.xikou.saltPrice = xikou.prices.salt;
  state.xikou.clothPrice = xikou.prices.cloth;

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
    basePrices: { grain: 1.2, salt: 5, cloth: 3 },
    diplomacy: { attitudeToPlayer: 0, trust: 30, dependency: 0 },
    trade: {
      baseExportWillingness: 0.8,
      exportWillingness: { grain: 0.75, salt: 0.8, cloth: 0.85, dung: 0.6 },
      exportRestrictions: { grain: false, salt: false, cloth: false, dung: false },
      minCommodityReserve: { grain: 60000, salt: 0, cloth: 2500, dung: 100 },
    },
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

  const grainYieldPerMu = Math.max(
    0,
    safeNumber(state?.world?.grainYieldPerMu ?? state?.agriculture?.grainYieldPerMu ?? state?.world?.baseGrainYieldPerMu, 360)
  );

  Object.values(state.foreignPolities).forEach((polity) => {
    if (!polity) return;

    polity.population = Math.round(Math.max(0, safeNumber(polity.population, 0)) * 1.005);
    polity.laborForce = Math.round(polity.population * 0.6);

    const farmlandMu = Math.max(0, safeNumber(polity.production?.farmlandMu, 0));
    const saltMines = Math.max(0, safeNumber(polity.production?.saltMines, 0));
    const mulberryLandMu = Math.max(0, safeNumber(polity.production?.mulberryLandMu, 0));

    const grainOutput = farmlandMu * grainYieldPerMu;
    const saltOutput = saltMines * 200000;
    const clothOutput = mulberryLandMu * 0.3;

    const population = Math.max(0, safeNumber(polity.population, 0));
    const demandState = {
      grain: { supply: grainOutput, demand: population * 360 },
      salt: { supply: saltOutput, demand: population * 15 },
      cloth: { supply: clothOutput, demand: population * 0.3 },
      dung: { supply: 0, demand: population * 0.02 },
    };

    const grainStock = safeNumber(polity.commodities?.grain, 0) + demandState.grain.supply - demandState.grain.demand;
    const saltStock = safeNumber(polity.commodities?.salt, 0) + demandState.salt.supply - demandState.salt.demand;
    const clothStock = safeNumber(polity.commodities?.cloth, 0) + demandState.cloth.supply - demandState.cloth.demand;
    const dungStock = safeNumber(polity.commodities?.dung, 0) + demandState.dung.supply - demandState.dung.demand;

    polity.commodities = polity.commodities ?? {};
    polity.commodities.grain = Math.round(clamp(grainStock, 0, 50000000));
    polity.commodities.salt = Math.round(clamp(saltStock, 0, 10000000));
    polity.commodities.cloth = Math.round(clamp(clothStock, 0, 2000000));
    polity.commodities.dung = Math.round(clamp(dungStock, 0, 2000000));

    polity.prices = polity.prices ?? {};
    polity.basePrices = {
      grain: Math.max(0.1, safeNumber(polity.basePrices?.grain ?? polity.prices?.grain, 1.0)),
      salt: Math.max(0.1, safeNumber(polity.basePrices?.salt ?? polity.prices?.salt, 4.0)),
      cloth: Math.max(0.1, safeNumber(polity.basePrices?.cloth ?? polity.prices?.cloth, 2.0)),
    };

    polity.prices.grain = Number(calculatePolityPrice(
      polity.prices.grain,
      polity.basePrices.grain,
      demandState.grain.supply,
      demandState.grain.demand,
      0.5,
      0.3,
      8
    ).toFixed(2));
    polity.prices.salt = Number(calculatePolityPrice(
      polity.prices.salt,
      polity.basePrices.salt,
      demandState.salt.supply,
      demandState.salt.demand,
      0.7,
      1,
      15
    ).toFixed(2));
    polity.prices.cloth = Number(calculatePolityPrice(
      polity.prices.cloth,
      polity.basePrices.cloth,
      demandState.cloth.supply,
      demandState.cloth.demand,
      0.6,
      0.5,
      12
    ).toFixed(2));

    updatePolityTradePolicy(polity, demandState);
  });

  syncLegacyXikou(state);
}
