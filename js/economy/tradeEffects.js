function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeCommodity(commodity) {
  if (commodity === 'silkworm_dung') return 'dung';
  return String(commodity ?? '').trim();
}

function pushYearLog(state, message) {
  if (!state?.logs) state.logs = {};
  if (!Array.isArray(state.logs.yearLog)) state.logs.yearLog = [];
  state.logs.yearLog.unshift(message);
  if (state.logs.yearLog.length > 200) state.logs.yearLog.length = 200;
}

function ensureTradeState(state) {
  state.tradeState = state.tradeState ?? {};
  state.tradeState.importDependency = {
    salt: 0,
    cloth: 0,
    dung: 0,
    grain: 0,
    herb: 0,
    iron: 0,
    copper: 0,
    silk: 0,
    ...(state.tradeState.importDependency ?? {}),
  };
  state.tradeState.lastYearImports = {
    salt: 0,
    cloth: 0,
    dung: 0,
    grain: 0,
    herb: 0,
    iron: 0,
    copper: 0,
    silk: 0,
    ...(state.tradeState.lastYearImports ?? {}),
  };
  if (!Array.isArray(state.tradeState.disruptions)) state.tradeState.disruptions = [];
  state.tradeState.buildingProductionPenalty = safeNumber(state.tradeState.buildingProductionPenalty, 0);
}

function recordDisruption(state, disruption) {
  ensureTradeState(state);
  state.tradeState.disruptions.unshift(disruption);
  if (state.tradeState.disruptions.length > 20) state.tradeState.disruptions.length = 20;
}

export function applyTradeDisruption(state, commodity, shortfallAmount) {
  if (!state) return { applied: false, reason: 'state missing' };

  const key = normalizeCommodity(commodity);
  const shortfall = Math.max(0, safeNumber(shortfallAmount, 0));
  const demand = Math.max(1, safeNumber(state?.commodityPrices?.[key]?.demand, 0));
  const ratio = shortfall / demand;

  ensureTradeState(state);

  const priceState = state.commodityPrices?.[key];
  if (priceState) {
    const currentPrice = Math.max(0, safeNumber(priceState.price, priceState.basePrice ?? 1));
    const boosted = currentPrice * (1 + ratio);
    priceState.price = clamp(
      boosted,
      safeNumber(priceState.minPrice, 0),
      safeNumber(priceState.maxPrice, Math.max(boosted, currentPrice))
    );
  }

  if (ratio > 0.3) {
    if (key === 'salt') {
      state.classes = state.classes ?? {};
      state.classes.farmerSatisfaction = clamp(safeNumber(state.classes.farmerSatisfaction, 50) - 15, 0, 100);
      state.classes.merchantSatisfaction = clamp(safeNumber(state.classes.merchantSatisfaction, 50) - 10, 0, 100);
    }

    if (key === 'cloth') {
      state.classes = state.classes ?? {};
      state.classes.farmerSatisfaction = clamp(safeNumber(state.classes.farmerSatisfaction, 50) - 10, 0, 100);
    }

    if (key === 'iron') {
      state.classes = state.classes ?? {};
      state.classes.merchantSatisfaction = clamp(safeNumber(state.classes.merchantSatisfaction, 50) - 10, 0, 100);
      state.tradeState.buildingProductionPenalty = clamp(
        safeNumber(state.tradeState.buildingProductionPenalty, 0) + 20,
        0,
        100
      );
    }

    if (key === 'copper') {
      state.tradeState.buildingProductionPenalty = clamp(
        safeNumber(state.tradeState.buildingProductionPenalty, 0) + 20,
        0,
        100
      );
    }
  }

  const disruption = {
    year: safeNumber(state.calendar?.year, 0),
    commodity: key,
    shortfall,
    shortfallRatio: ratio,
    message: `Year ${safeNumber(state.calendar?.year, '?')}: ${key} 贸易短缺 ${Math.round(ratio * 100)}%。`,
  };

  recordDisruption(state, disruption);
  pushYearLog(state, disruption.message);

  return { applied: true, disruption };
}

export function applyTradeDependencyEffects(state) {
  if (!state) return { applied: false, reason: 'state missing' };

  ensureTradeState(state);
  state.classes = state.classes ?? {};

  const dependencies = state.tradeState.importDependency;
  const highRiskCommodities = Object.entries(dependencies)
    .filter(([, ratio]) => safeNumber(ratio, 0) > 0.5)
    .map(([commodity]) => commodity);

  if (highRiskCommodities.length > 0) {
    const penalty = highRiskCommodities.length * 5;
    state.classes.stabilityIndex = clamp(safeNumber(state.classes.stabilityIndex, 50) - penalty, 0, 100);
    pushYearLog(
      state,
      `Year ${safeNumber(state.calendar?.year, '?')}: 贸易依赖过高（${highRiskCommodities.join('、')}），稳定度 -${penalty}。`
    );
  }

  return { applied: true, highRiskCommodities };
}

function ensureTradeEffectsState(state) {
  state.tradeEffects = state.tradeEffects ?? {};
  state.tradeEffects.lastYear = safeNumber(state.tradeEffects.lastYear, 0);
  state.tradeEffects.totals = {
    imports: safeNumber(state.tradeEffects?.totals?.imports, 0),
    exports: safeNumber(state.tradeEffects?.totals?.exports, 0),
    grainPayments: safeNumber(state.tradeEffects?.totals?.grainPayments, 0),
    couponPayments: safeNumber(state.tradeEffects?.totals?.couponPayments, 0),
    ...state.tradeEffects.totals,
  };
  state.tradeEffects.lastYearSummary = state.tradeEffects.lastYearSummary ?? {
    imports: 0,
    exports: 0,
    grainPayments: 0,
    couponPayments: 0,
    commodityFlows: {},
  };
}

export function applyTradeEffects(state, contractResult = {}) {
  if (!state) return { applied: false, reason: 'state missing' };
  ensureTradeState(state);
  ensureTradeEffectsState(state);

  const executions = Array.isArray(contractResult.executions) ? contractResult.executions : [];
  const yearly = {
    imports: 0,
    exports: 0,
    grainPayments: 0,
    couponPayments: 0,
    commodityFlows: {},
  };

  executions.forEach((execution) => {
    if (!execution?.success) return;

    const commodity = normalizeCommodity(execution.commodity);
    const delivered = Math.max(0, safeNumber(execution.deliveredAmount, 0));
    const paid = Math.max(0, safeNumber(execution.totalPayment, 0));
    const direction = execution.direction === 'export' ? 'export' : 'import';

    yearly.commodityFlows[commodity] = Math.max(0, safeNumber(yearly.commodityFlows[commodity], 0)) + delivered;

    if (direction === 'import') {
      yearly.imports += delivered;
      state.tradeState.lastYearImports[commodity] = Math.max(0, safeNumber(state.tradeState.lastYearImports[commodity], 0)) + delivered;
    } else {
      yearly.exports += delivered;
    }

    if (execution.paymentAsset === 'coupon') yearly.couponPayments += paid;
    else yearly.grainPayments += paid;
  });

  state.tradeEffects.totals.imports = safeNumber(state.tradeEffects.totals.imports, 0) + yearly.imports;
  state.tradeEffects.totals.exports = safeNumber(state.tradeEffects.totals.exports, 0) + yearly.exports;
  state.tradeEffects.totals.grainPayments = safeNumber(state.tradeEffects.totals.grainPayments, 0) + yearly.grainPayments;
  state.tradeEffects.totals.couponPayments = safeNumber(state.tradeEffects.totals.couponPayments, 0) + yearly.couponPayments;
  state.tradeEffects.lastYear = safeNumber(state.calendar?.year, 0);
  state.tradeEffects.lastYearSummary = yearly;

  if (yearly.imports > 0 || yearly.exports > 0) {
    pushYearLog(
      state,
      `Year ${state.calendar?.year ?? '?'}: 贸易结算：进口${Math.round(yearly.imports)}，出口${Math.round(yearly.exports)}，支付粮${Math.round(yearly.grainPayments)}，支付劵${Math.round(yearly.couponPayments)}。`
    );
  }

  return { applied: true, yearly };
}
