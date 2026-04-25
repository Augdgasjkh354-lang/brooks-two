const COMMODITY_PRICE_DEFAULTS = {
  grain: { price: 1.0, basePrice: 1.0, minPrice: 0.3, maxPrice: 5.0, elasticity: 0.5 },
  salt: { price: 4.0, basePrice: 4.0, minPrice: 1.0, maxPrice: 12.0, elasticity: 0.8 },
  cloth: { price: 2.0, basePrice: 2.0, minPrice: 0.5, maxPrice: 8.0, elasticity: 0.6 },
  silk: { price: 10.0, basePrice: 10.0, minPrice: 3.0, maxPrice: 30.0, elasticity: 0.4 },
  paper: { price: 3.0, basePrice: 3.0, minPrice: 1.0, maxPrice: 10.0, elasticity: 0.7 },
  iron_tools: { price: 8.0, basePrice: 8.0, minPrice: 2.0, maxPrice: 20.0, elasticity: 0.6 },
  weapons: { price: 15.0, basePrice: 15.0, minPrice: 5.0, maxPrice: 40.0, elasticity: 0.3 },
  ceramics: { price: 5.0, basePrice: 5.0, minPrice: 1.0, maxPrice: 15.0, elasticity: 0.5 },
  lumber: { price: 2.0, basePrice: 2.0, minPrice: 0.5, maxPrice: 8.0, elasticity: 0.6 },
  charcoal: { price: 1.5, basePrice: 1.5, minPrice: 0.3, maxPrice: 5.0, elasticity: 0.7 },
  medicine: { price: 6.0, basePrice: 6.0, minPrice: 2.0, maxPrice: 20.0, elasticity: 0.4 },
  tea: { price: 5.0, basePrice: 5.0, minPrice: 1.0, maxPrice: 15.0, elasticity: 0.5 },
  bricks: { price: 0.5, basePrice: 0.5, minPrice: 0.1, maxPrice: 2.0, elasticity: 0.8 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ensureCommodityPriceState(state) {
  state.commodityPrices = state.commodityPrices ?? {};
  state.commodities = state.commodities ?? {};
  state.buildings = state.buildings ?? {};

  Object.entries(COMMODITY_PRICE_DEFAULTS).forEach(([commodity, defaults]) => {
    const existing = state.commodityPrices[commodity] ?? {};
    state.commodityPrices[commodity] = {
      ...defaults,
      ...existing,
      supply: Math.max(0, Number(existing.supply ?? 0)),
      demand: Math.max(0, Number(existing.demand ?? 0)),
      price: Math.max(0, Number(existing.price ?? defaults.price)),
      lastPrice: Math.max(0, Number(existing.lastPrice ?? existing.price ?? defaults.price)),
      trend: existing.trend ?? '→',
    };
  });
}

function getBuildingCount(state, buildingId) {
  return Math.max(0, Number(state.buildings?.[buildingId]?.count ?? 0));
}

function getPopulationDemand(state) {
  const totalPopulation = Math.max(0, Number(state.population?.totalPopulation ?? state.world?.totalPopulation ?? 0));
  const healthIndex = Math.max(0, Number(state.world?.healthIndex ?? 50));
  const sicknessRatio = healthIndex >= 70 ? 0.08 : healthIndex >= 50 ? 0.12 : 0.2;

  return {
    grain: totalPopulation * 360,
    salt: totalPopulation * 15,
    cloth: totalPopulation * 0.3,
    medicine: totalPopulation * 0.1 * sicknessRatio,
  };
}

function calculateSupply(state) {
  const outputs = state.world?.buildingOutputSummary?.outputs ?? {};
  const supply = Object.fromEntries(Object.keys(COMMODITY_PRICE_DEFAULTS).map((k) => [k, 0]));

  Object.keys(supply).forEach((commodity) => {
    supply[commodity] = Math.max(0, Number(outputs[commodity] ?? 0));
  });

  supply.salt += Math.max(0, Number(state.world?.actualSaltImport ?? 0));
  supply.cloth += Math.max(0, Number(state.world?.clothTradeReceived ?? 0));

  return supply;
}


function addYearLog(state, msg) {
  if (!state.logs) state.logs = {};
  if (!Array.isArray(state.logs.yearLog)) state.logs.yearLog = [];
  state.logs.yearLog.unshift(msg);
  if (state.logs.yearLog.length > 200) state.logs.yearLog.length = 200;
  state.yearLog = state.logs.yearLog;
}

function calculateDemand(state) {
  const demand = Object.fromEntries(Object.keys(COMMODITY_PRICE_DEFAULTS).map((k) => [k, 0]));
  const populationDemand = getPopulationDemand(state);
  Object.entries(populationDemand).forEach(([commodity, amount]) => {
    demand[commodity] = Math.max(0, Number(demand[commodity] ?? 0) + Number(amount ?? 0));
  });

  const blacksmithCount = getBuildingCount(state, 'blacksmith');
  demand.charcoal += blacksmithCount * 50;

  const kilnCount = getBuildingCount(state, 'kiln');
  demand.charcoal += kilnCount * 30;

  const paperMillCount = getBuildingCount(state, 'paper_mill');
  demand.paper += paperMillCount * 0;

  const medicineHallCount = getBuildingCount(state, 'medicine_hall');
  demand.medicine += medicineHallCount * 0;

  const barracksCount = getBuildingCount(state, 'barracks');
  demand.weapons += barracksCount * 10;
  demand.grain += barracksCount * 50000;

  const institutionWorkers = Math.max(0, Number(state.world?.institutionWorkers ?? 0));
  demand.paper += institutionWorkers * 20;

  const policeCount = Math.max(0, Number(state.world?.policeOfficerCount ?? 0));
  demand.weapons += policeCount * 2;

  return demand;
}

function applyCommodityEffects(state, supply, demand) {
  const world = state.world;

  if (Number(supply.paper ?? 0) > 0) {
    world.policyExecutionEfficiency = Math.max(1, Number(world.policyExecutionEfficiency ?? 1)) * 1.05;
  }

  if (Number(supply.medicine ?? 0) > 0) {
    world.healthIndex = Math.min(100, Math.max(0, Number(world.healthIndex ?? 50) + 5));
  }

  if (Number(supply.lumber ?? 0) > 0) {
    world.constructionCostReduction = Math.max(
      Number(world.constructionCostReduction ?? 0),
      Math.min(0.5, Number(world.constructionCostReduction ?? 0) + 0.03)
    );
  }

  world.ironToolsMethodEnabled = Number(state.commodities?.iron_tools ?? 0) > 0 || Number(supply.iron_tools ?? 0) > 0;

  if (Number(supply.paper ?? 0) < Number(demand.paper ?? 0) * 0.5 && Number(demand.paper ?? 0) > 0) {
    world.policyExecutionEfficiency = Math.max(0.1, Number(world.policyExecutionEfficiency ?? 1) * 0.8);
    addYearLog(state, `Year ${state.calendar.year}: 纸张短缺，官府效率下降`);
  }

  if (Number(supply.iron_tools ?? 0) < Number(demand.iron_tools ?? 0) * 0.5 && Number(demand.iron_tools ?? 0) > 0) {
    world.farmingCommodityShortageMultiplier = 0.9;
    addYearLog(state, `Year ${state.calendar.year}: 铁器短缺，农业生产受影响`);
  } else {
    world.farmingCommodityShortageMultiplier = 1;
  }

  if (Number(supply.medicine ?? 0) < Number(demand.medicine ?? 0) * 0.5 && Number(demand.medicine ?? 0) > 0) {
    world.healthIndex = Math.max(0, Number(world.healthIndex ?? 50) - 10);
    addYearLog(state, `Year ${state.calendar.year}: 药材短缺，公共卫生恶化`);
  }

  if (Number(supply.lumber ?? 0) < Number(demand.lumber ?? 0) * 0.5 && Number(demand.lumber ?? 0) > 0) {
    world.constructionCostReduction = 0;
    addYearLog(state, `Year ${state.calendar.year}: 木材短缺，建设成本上升`);
  }

  const barracksCount = getBuildingCount(state, 'barracks');
  if (barracksCount > 0 && Number(supply.weapons ?? 0) < Number(demand.weapons ?? 0) * 0.5 && Number(demand.weapons ?? 0) > 0) {
    world.militaryPowerMultiplier = 0.7;
    addYearLog(state, `Year ${state.calendar.year}: 武器短缺，军事力量削弱`);
  } else {
    world.militaryPowerMultiplier = 1;
  }
}

export function settleCommodityMarket(state) {
  if (!state?.world) {
    console.error('settleCommodityMarket skipped: missing state.world');
    return null;
  }

  try {
    ensureCommodityPriceState(state);
    state.commodities = state.commodities ?? {};
    state.logs = state.logs ?? {};
    state.logs.yearLog = Array.isArray(state.logs.yearLog) ? state.logs.yearLog : (Array.isArray(state.yearLog) ? state.yearLog : []);
    state.yearLog = state.logs.yearLog;

    const supply = calculateSupply(state);
    const demand = calculateDemand(state);
    const priceChanges = [];

    Object.entries(state.commodityPrices).forEach(([commodity, entry]) => {
      const previousPrice = Math.max(0.0001, Number(entry.price ?? entry.basePrice ?? 1));
      const commoditySupply = Math.max(0, Number(supply[commodity] ?? 0));
      const commodityDemand = Math.max(0, Number(demand[commodity] ?? 0));
      const demandRatio = commodityDemand / Math.max(commoditySupply, 1);
      const targetPrice = Math.max(
        0.0001,
        Number(entry.basePrice ?? 1) * Math.pow(Math.max(demandRatio, 0.0001), Number(entry.elasticity ?? 0.5))
      );
      let nextPrice = lerp(previousPrice, targetPrice, 0.3);
      nextPrice = clamp(nextPrice, Number(entry.minPrice ?? 0.1), Number(entry.maxPrice ?? 999999));

      if (commodity === 'grain') {
        const totalPopulation = Math.max(0, Number(state.population?.totalPopulation ?? state.world?.totalPopulation ?? 0));
        if (Number(supply.grain ?? 0) > totalPopulation * 720) {
          nextPrice = clamp(nextPrice * 0.8, Number(entry.minPrice ?? 0.1), Number(entry.maxPrice ?? 999999));
        }
      }

      if (commodity === 'silk' && Number(supply.silk ?? 0) > 10000) {
        nextPrice = clamp(nextPrice * 0.9, Number(entry.minPrice ?? 0.1), Number(entry.maxPrice ?? 999999));
        state.world.merchantLifeQuality = Math.min(100, Math.max(0, Number(state.world.merchantLifeQuality ?? 50) + 3));
      }

      const trend = nextPrice > previousPrice * 1.01 ? '↑' : nextPrice < previousPrice * 0.99 ? '↓' : '→';

      state.commodityPrices[commodity] = {
        ...entry,
        lastPrice: previousPrice,
        price: nextPrice,
        supply: commoditySupply,
        demand: commodityDemand,
        trend,
      };

      const netFlow = commoditySupply - commodityDemand;
      state.commodityPrices[commodity].netFlow = netFlow;

      if (Math.abs(nextPrice - previousPrice) >= 0.05) {
        priceChanges.push(`${commodity}${previousPrice.toFixed(2)}→${nextPrice.toFixed(2)}`);
      }
    });

    applyCommodityEffects(state, supply, demand);

    state.world.saltPrice = Number(state.commodityPrices.salt?.price ?? state.world.saltPrice ?? 4);
    state.world.clothPrice = Number(state.commodityPrices.cloth?.price ?? state.world.clothPrice ?? 2);
    state.world.marketSaltInventory = Math.max(0, Number(state.commodities.salt ?? state.world.marketSaltInventory ?? 0));
    state.world.marketClothInventory = Math.max(0, Number(state.commodities.cloth ?? state.world.marketClothInventory ?? 0));
    state.world.marketGrainInventory = Math.max(0, Number(state.commodities.grain ?? state.world.marketGrainInventory ?? 0));
    state.world.rawSilkOutput = Math.max(0, Number(state.commodities.silk ?? state.world.rawSilkOutput ?? 0));

    const summary = {
      supply,
      demand,
      prices: state.commodityPrices,
      priceChanges,
    };

    state.__yearPipeline = state.__yearPipeline ?? {};
    state.__yearPipeline.commodityMarketResult = summary;

    if (priceChanges.length > 0) {
      addYearLog(state, `Year ${state.calendar.year}: 商品市场结算：${priceChanges.slice(0, 6).join('，')}。`);
    }

    return summary;
  } catch (error) {
    console.error('settleCommodityMarket failed:', {
      year: state.calendar?.year,
      hasWorld: Boolean(state.world),
      hasBuildings: Boolean(state.buildings),
      hasCommodities: Boolean(state.commodities),
      hasCommodityPrices: Boolean(state.commodityPrices),
      buildingKeys: Object.keys(state.buildings ?? {}),
      commodityKeys: Object.keys(state.commodities ?? {}),
      commodityPriceKeys: Object.keys(state.commodityPrices ?? {}),
    }, error);
    throw error;
  }
}

export { COMMODITY_PRICE_DEFAULTS };
