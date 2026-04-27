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

    if (direction === 'import') yearly.imports += delivered;
    else yearly.exports += delivered;

    if (execution.paymentAsset === 'coupon') yearly.couponPayments += paid;
    else yearly.grainPayments += paid;

    const partner = state.foreignPolities?.[execution.partnerId];
    if (partner?.diplomacy) {
      const trustDelta = Math.max(1, Math.round(delivered / 50000));
      partner.diplomacy.trust = clamp(safeNumber(partner.diplomacy.trust, 30) + trustDelta, 0, 100);
      partner.diplomacy.dependency = clamp(safeNumber(partner.diplomacy.dependency, 0) + (direction === 'import' ? 1 : -1), 0, 100);
    }

    if (commodity === 'salt') {
      state.world.actualSaltImport = Math.max(0, safeNumber(state.world.actualSaltImport, 0)) + delivered;
    } else if (commodity === 'cloth') {
      state.world.clothTradeReceived = Math.max(0, safeNumber(state.world.clothTradeReceived, 0)) + delivered;
    } else if (commodity === 'dung') {
      state.world.importedDung = Math.max(0, safeNumber(state.world.importedDung, 0)) + delivered;
      state.world.totalDung = Math.max(0, safeNumber(state.world.playerSilkwormDung, 0)) + Math.max(0, safeNumber(state.world.importedDung, 0));
    }
  });

  state.tradeEffects.totals.imports = safeNumber(state.tradeEffects.totals.imports, 0) + yearly.imports;
  state.tradeEffects.totals.exports = safeNumber(state.tradeEffects.totals.exports, 0) + yearly.exports;
  state.tradeEffects.totals.grainPayments = safeNumber(state.tradeEffects.totals.grainPayments, 0) + yearly.grainPayments;
  state.tradeEffects.totals.couponPayments = safeNumber(state.tradeEffects.totals.couponPayments, 0) + yearly.couponPayments;
  state.tradeEffects.lastYear = safeNumber(state.calendar?.year, 0);
  state.tradeEffects.lastYearSummary = yearly;

  if ((yearly.imports > 0 || yearly.exports > 0) && Array.isArray(state.logs?.yearLog)) {
    state.logs.yearLog.unshift(
      `Year ${state.calendar?.year ?? '?'}: 贸易结算：进口${Math.round(yearly.imports)}，出口${Math.round(yearly.exports)}，支付粮${Math.round(yearly.grainPayments)}，支付劵${Math.round(yearly.couponPayments)}。`
    );
  }

  return { applied: true, yearly };
}
