function getMonetaryState(state) {
  return state?.monetary ?? state?.world ?? {};
}

function getContractPrice(state, contract) {
  if (contract.priceMode === 'fixed') {
    return Math.max(0, Number(contract.fixedPrice ?? 0));
  }

  const marketPrice = Number(state?.commodityPrices?.[contract.commodity]?.price ?? 0);
  const basePrice = Number(contract.fixedPrice ?? marketPrice ?? 0);
  const multiplier = Math.max(0, Number(contract.priceMultiplier ?? 1));
  const rawPrice = Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : basePrice;
  return Math.max(0, rawPrice * multiplier);
}

function normalizeCommodityKey(commodity) {
  if (commodity === 'silkworm_dung') return 'dung';
  return String(commodity ?? '').trim();
}

function getPartnerCommodityStock(partner, commodity) {
  if (!partner) return 0;
  const key = normalizeCommodityKey(commodity);
  return Math.max(0, Number(partner?.commodities?.[key] ?? 0));
}

function deductPartnerCommodityStock(partner, commodity, amount) {
  if (!partner) return;
  const safeAmount = Math.max(0, Number(amount ?? 0));
  const key = normalizeCommodityKey(commodity);
  partner.commodities = partner.commodities ?? {};
  partner.commodities[key] = Math.max(0, Number(partner.commodities[key] ?? 0) - safeAmount);
}

function addPartnerCommodityStock(partner, commodity, amount) {
  if (!partner) return;
  const safeAmount = Math.max(0, Number(amount ?? 0));
  const key = normalizeCommodityKey(commodity);
  partner.commodities = partner.commodities ?? {};
  partner.commodities[key] = Math.max(0, Number(partner.commodities[key] ?? 0) + safeAmount);
}

function creditPartnerCouponTreasury(partner, amount) {
  if (!partner) return;
  const safeAmount = Math.max(0, Number(amount ?? 0));
  partner.monetary = partner.monetary ?? {};
  partner.monetary.couponTreasury = Math.max(0, Number(partner.monetary.couponTreasury ?? 0) + safeAmount);
}

function normalizeTradeBureauEfficiency(rawValue) {
  const value = Math.max(0, Number(rawValue ?? 0));
  if (value > 1) return Math.min(1, value / 100);
  return Math.min(1, value);
}

function getRoadLevelForPartner(state, partnerId) {
  const roads = Array.isArray(state?.mapState?.roads) ? state.mapState.roads : [];
  const route = roads.find((item) =>
    (item?.from === 'player' && item?.to === partnerId) ||
    (item?.from === partnerId && item?.to === 'player')
  );
  return Math.max(0, Number(route?.level ?? 0));
}

function getDefaultBaseCapacity(partnerId) {
  if (partnerId === 'xikou') return 80000;
  if (partnerId === 'northernTraders') return 60000;
  return 50000;
}

function ensureRoute(state, partnerId) {
  if (!state) return null;
  state.tradeRoutes = state.tradeRoutes ?? {};

  if (!state.tradeRoutes[partnerId]) {
    state.tradeRoutes[partnerId] = {
      partnerId,
      name: `${partnerId} 商路`,
      baseCapacity: getDefaultBaseCapacity(partnerId),
      roadLevel: 0,
      tradeBureauEfficiency: 0,
      annualCapacity: getDefaultBaseCapacity(partnerId),
      usedCapacity: 0,
      remainingCapacity: getDefaultBaseCapacity(partnerId),
      lastUpdatedYear: 0,
    };
  }

  return state.tradeRoutes[partnerId];
}

function computeAnnualCapacity(route, roadLevel, bureauEfficiency) {
  const baseCapacity = Math.max(0, Number(route?.baseCapacity ?? 0));
  const roadMultiplier = 1 + roadLevel * 0.25;
  const bureauMultiplier = 1 + bureauEfficiency * 0.5;
  return Math.max(0, Math.floor(baseCapacity * roadMultiplier * bureauMultiplier));
}

export function updateTradeRouteCapacities(state) {
  if (!state) return {};

  state.tradeRoutes = state.tradeRoutes ?? {};
  const partnerIds = new Set([
    ...Object.keys(state.foreignPolities ?? {}),
    ...Object.keys(state.tradeRoutes ?? {}),
    ...(Array.isArray(state.tradeContracts) ? state.tradeContracts.map((c) => String(c?.partnerId ?? '').trim()).filter(Boolean) : []),
  ]);

  for (const partnerId of partnerIds) {
    const route = ensureRoute(state, partnerId);
    if (!route) continue;

    const roadLevel = getRoadLevelForPartner(state, partnerId);
    const tradeBureauEfficiency = normalizeTradeBureauEfficiency(
      state?.world?.tradeBureauEfficiency ?? state?.world?.tradeEfficiency ?? 0
    );

    route.roadLevel = roadLevel;
    route.tradeBureauEfficiency = tradeBureauEfficiency;
    route.annualCapacity = computeAnnualCapacity(route, roadLevel, tradeBureauEfficiency);
    route.usedCapacity = 0;
    route.remainingCapacity = route.annualCapacity;
    route.lastUpdatedYear = Number(state?.calendar?.year ?? 0);
  }

  return state.tradeRoutes;
}

function reserveTradeRouteCapacity(state, partnerId, requestedAmount) {
  const route = ensureRoute(state, partnerId);
  if (!route) return { granted: 0, remaining: 0, route: null };

  const amount = Math.max(0, Math.floor(Number(requestedAmount ?? 0)));
  const remaining = Math.max(0, Number(route.remainingCapacity ?? route.annualCapacity ?? 0));
  const granted = Math.min(amount, remaining);

  route.usedCapacity = Math.max(0, Number(route.usedCapacity ?? 0) + granted);
  route.remainingCapacity = Math.max(0, Number(route.annualCapacity ?? 0) - route.usedCapacity);

  return { granted, remaining: route.remainingCapacity, route };
}

export function createTradeContract(state, params = {}) {
  if (!state) return { success: false, reason: 'state missing' };

  state.tradeContracts = Array.isArray(state.tradeContracts) ? state.tradeContracts : [];

  const commodity = String(params.commodity ?? '').trim();
  const direction = params.direction === 'export' ? 'export' : 'import';
  const amountPerYear = Math.max(0, Number(params.amountPerYear ?? 0));
  const durationYears = Math.max(1, Math.floor(Number(params.durationYears ?? 1)));
  const paymentAsset = params.paymentAsset === 'coupon' ? 'coupon' : 'grain';

  if (!commodity) return { success: false, reason: 'commodity is required' };
  if (amountPerYear <= 0) return { success: false, reason: 'amountPerYear must be > 0' };

  const contract = {
    id: params.id ?? `contract_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    partnerId: params.partnerId ?? 'xikou',
    commodity,
    direction,
    amountPerYear,
    priceMode: params.priceMode === 'market' ? 'market' : 'fixed',
    fixedPrice: Math.max(0, Number(params.fixedPrice ?? 0)),
    priceMultiplier: Math.max(0, Number(params.priceMultiplier ?? 1)),
    durationYears,
    yearsRemaining: Math.max(0, Math.floor(Number(params.yearsRemaining ?? durationYears))),
    paymentAsset,
    active: params.active !== false,
    minAttitudeRequired: Math.max(-100, Math.min(100, Number(params.minAttitudeRequired ?? -10))),
    reliability: Math.max(0, Math.min(1, Number(params.reliability ?? 1))),
    breachPenalty: {
      attitude: Number(params?.breachPenalty?.attitude ?? -5),
      compensation: Math.max(0, Number(params?.breachPenalty?.compensation ?? 0)),
    },
    lastExecutedYear: null,
    lastDeliveredAmount: 0,
    lastPaymentAmount: 0,
    lastCapacityUsed: 0,
  };

  state.tradeContracts.push(contract);
  ensureRoute(state, contract.partnerId);
  return { success: true, contract };
}

export function cancelTradeContract(state, contractId) {
  if (!state || !Array.isArray(state.tradeContracts)) {
    return { success: false, reason: 'tradeContracts not initialized' };
  }

  const contract = state.tradeContracts.find((item) => item.id === contractId);
  if (!contract) return { success: false, reason: 'contract not found' };

  contract.active = false;
  return { success: true, contract };
}

export function getContractFulfillmentRisk(state, contractId) {
  const contract = state?.tradeContracts?.find((item) => item.id === contractId);
  if (!contract) return 'high';

  const partner = state?.foreignPolities?.[contract.partnerId ?? 'xikou'];
  const route = ensureRoute(state, contract.partnerId ?? 'xikou');
  const attitude = Number(partner?.diplomacy?.attitudeToPlayer ?? -100);
  const reliability = Math.max(0, Math.min(1, Number(contract.reliability ?? 0)));
  const partnerStock = getPartnerCommodityStock(partner, contract.commodity);
  const routeCoverage = Math.max(0, Number(route?.annualCapacity ?? 0)) / Math.max(1, Number(contract.amountPerYear ?? 1));

  if (attitude < Number(contract.minAttitudeRequired ?? -10)) return 'high';
  if (routeCoverage < 0.5) return 'high';
  if (reliability < 0.75 || partnerStock < Number(contract.amountPerYear ?? 0) * 0.5) return 'high';
  if (routeCoverage < 1 || reliability < 0.9 || partnerStock < Number(contract.amountPerYear ?? 0)) return 'medium';
  return 'low';
}

export function processTradeContracts(state) {
  if (!state) return { processed: 0, fulfilled: 0, failed: 0, logs: [], executions: [] };

  state.tradeContracts = Array.isArray(state.tradeContracts) ? state.tradeContracts : [];
  state.commodities = state.commodities ?? {};

  const currentYear = Number(state?.calendar?.year ?? 0);
  if (!state.tradeRoutes || Object.values(state.tradeRoutes).some((route) => Number(route?.lastUpdatedYear ?? 0) !== currentYear)) {
    updateTradeRouteCapacities(state);
  }

  const monetary = getMonetaryState(state);
  const logs = [];
  const executions = [];

  let processed = 0;
  let fulfilled = 0;
  let failed = 0;

  for (const contract of state.tradeContracts) {
    if (!contract?.active) continue;
    if ((contract.yearsRemaining ?? 0) <= 0) {
      contract.active = false;
      continue;
    }

    processed += 1;

    const partner = state?.foreignPolities?.[contract.partnerId ?? 'xikou'];
    const attitude = Number(partner?.diplomacy?.attitudeToPlayer ?? -100);
    if (attitude < Number(contract.minAttitudeRequired ?? -10)) {
      failed += 1;
      logs.push(`贸易合约未执行（${contract.commodity}）：对方态度不足。`);
      executions.push({
        contractId: contract.id,
        partnerId: contract.partnerId,
        commodity: contract.commodity,
        direction: contract.direction,
        success: false,
        reason: 'attitude',
        deliveredAmount: 0,
        totalPayment: 0,
        paymentAsset: contract.paymentAsset,
        capacityUsed: 0,
      });
      continue;
    }

    if (!partner) {
      failed += 1;
      logs.push(`贸易合约未执行（${contract.commodity}）：贸易对象不存在。`);
      executions.push({
        contractId: contract.id,
        partnerId: contract.partnerId,
        commodity: contract.commodity,
        direction: contract.direction,
        success: false,
        reason: 'partner_missing',
        deliveredAmount: 0,
        totalPayment: 0,
        paymentAsset: contract.paymentAsset,
        capacityUsed: 0,
      });
      continue;
    }

    const partnerStock = getPartnerCommodityStock(partner, contract.commodity);
    const playerStock = Math.max(0, Number(state.commodities?.[contract.commodity] ?? 0));
    const stockCap = contract.direction === 'export' ? playerStock : partnerStock;
    const requestedAmount = Math.floor(
      Math.max(0, Math.min(Number(contract.amountPerYear ?? 0), stockCap)) *
      Math.max(0, Math.min(1, Number(contract.reliability ?? 1)))
    );

    const routeGrant = reserveTradeRouteCapacity(state, contract.partnerId, requestedAmount);
    const deliverAmount = routeGrant.granted;
    const route = routeGrant.route;

    if (deliverAmount <= 0) {
      failed += 1;
      logs.push(`贸易合约未执行（${contract.commodity}）：商路运力不足。`);
      executions.push({
        contractId: contract.id,
        partnerId: contract.partnerId,
        commodity: contract.commodity,
        direction: contract.direction,
        success: false,
        reason: 'route_capacity',
        deliveredAmount: 0,
        totalPayment: 0,
        paymentAsset: contract.paymentAsset,
        capacityUsed: 0,
      });
      continue;
    }

    const unitPrice = getContractPrice(state, contract);
    const totalPayment = Math.max(0, Math.round(deliverAmount * unitPrice));

    if (contract.direction === 'import') {
      if (contract.paymentAsset === 'coupon') {
        const couponTreasury = Math.max(0, Number(monetary.couponTreasury ?? 0));
        if (couponTreasury < totalPayment) {
          failed += 1;
          logs.push(`贸易合约未执行（${contract.commodity}）：粮劵不足。`);
          executions.push({
            contractId: contract.id,
            partnerId: contract.partnerId,
            commodity: contract.commodity,
            direction: contract.direction,
            success: false,
            reason: 'coupon',
            deliveredAmount: 0,
            totalPayment,
            paymentAsset: contract.paymentAsset,
            capacityUsed: 0,
          });
          continue;
        }
        monetary.couponTreasury = couponTreasury - totalPayment;
        creditPartnerCouponTreasury(partner, totalPayment);
      } else {
        const grainTreasury = Math.max(0, Number(state.world?.grainTreasury ?? state.agriculture?.grainTreasury ?? 0));
        if (grainTreasury < totalPayment) {
          failed += 1;
          logs.push(`贸易合约未执行（${contract.commodity}）：粮仓不足。`);
          executions.push({
            contractId: contract.id,
            partnerId: contract.partnerId,
            commodity: contract.commodity,
            direction: contract.direction,
            success: false,
            reason: 'grain',
            deliveredAmount: 0,
            totalPayment,
            paymentAsset: contract.paymentAsset,
            capacityUsed: 0,
          });
          continue;
        }
        state.world.grainTreasury = grainTreasury - totalPayment;
        if (state.agriculture) state.agriculture.grainTreasury = state.world.grainTreasury;
      }

      state.commodities[contract.commodity] = Math.max(0, Number(state.commodities[contract.commodity] ?? 0) + deliverAmount);
      deductPartnerCommodityStock(partner, contract.commodity, deliverAmount);
      partner.commodities = partner.commodities ?? {};
      partner.commodities.grain = Math.max(0, Number(partner.commodities.grain ?? 0) + (contract.paymentAsset === 'grain' ? totalPayment : 0));
      fulfilled += 1;
      logs.push(`贸易合约执行：进口${contract.commodity} ${deliverAmount}，支付${totalPayment}${contract.paymentAsset === 'coupon' ? '粮劵' : '粮食'}，占用商路运力${deliverAmount}/${Math.round(route?.annualCapacity ?? 0)}。`);
    } else {
      const available = Math.max(0, Number(state.commodities?.[contract.commodity] ?? 0));
      const exportAmount = Math.min(deliverAmount, available);
      if (exportAmount <= 0) {
        failed += 1;
        logs.push(`贸易合约未执行（${contract.commodity}）：本地库存不足。`);
        executions.push({
          contractId: contract.id,
          partnerId: contract.partnerId,
          commodity: contract.commodity,
          direction: contract.direction,
          success: false,
          reason: 'inventory',
          deliveredAmount: 0,
          totalPayment: 0,
          paymentAsset: contract.paymentAsset,
          capacityUsed: 0,
        });
        continue;
      }

      const actualPayment = Math.max(0, Math.round(exportAmount * unitPrice));

      state.commodities[contract.commodity] = Math.max(0, available - exportAmount);
      addPartnerCommodityStock(partner, contract.commodity, exportAmount);

      if (contract.paymentAsset === 'coupon') {
        monetary.couponTreasury = Math.max(0, Number(monetary.couponTreasury ?? 0) + actualPayment);
      } else {
        state.world.grainTreasury = Math.max(0, Number(state.world.grainTreasury ?? 0) + actualPayment);
        if (state.agriculture) state.agriculture.grainTreasury = state.world.grainTreasury;
      }

      contract.lastExecutedYear = state.calendar?.year ?? null;
      contract.lastDeliveredAmount = exportAmount;
      contract.lastPaymentAmount = actualPayment;
      contract.lastCapacityUsed = exportAmount;

      executions.push({
        contractId: contract.id,
        partnerId: contract.partnerId,
        commodity: contract.commodity,
        direction: contract.direction,
        success: true,
        deliveredAmount: exportAmount,
        unitPrice,
        totalPayment: actualPayment,
        paymentAsset: contract.paymentAsset,
        capacityUsed: exportAmount,
        routeAnnualCapacity: Math.round(route?.annualCapacity ?? 0),
        routeRemainingCapacity: Math.round(route?.remainingCapacity ?? 0),
      });

      contract.yearsRemaining = Math.max(0, Number(contract.yearsRemaining ?? 0) - 1);
      if (contract.yearsRemaining <= 0) {
        contract.active = false;
        logs.push(`贸易合约到期：${contract.commodity}（${contract.id}）。`);
      }

      fulfilled += 1;
      logs.push(`贸易合约执行：出口${contract.commodity} ${exportAmount}，收入${actualPayment}${contract.paymentAsset === 'coupon' ? '粮劵' : '粮食'}，占用商路运力${exportAmount}/${Math.round(route?.annualCapacity ?? 0)}。`);
      continue;
    }

    contract.lastExecutedYear = state.calendar?.year ?? null;
    contract.lastDeliveredAmount = deliverAmount;
    contract.lastPaymentAmount = totalPayment;
    contract.lastCapacityUsed = deliverAmount;

    executions.push({
      contractId: contract.id,
      partnerId: contract.partnerId,
      commodity: contract.commodity,
      direction: contract.direction,
      success: true,
      deliveredAmount: deliverAmount,
      unitPrice,
      totalPayment,
      paymentAsset: contract.paymentAsset,
      capacityUsed: deliverAmount,
      routeAnnualCapacity: Math.round(route?.annualCapacity ?? 0),
      routeRemainingCapacity: Math.round(route?.remainingCapacity ?? 0),
    });

    contract.yearsRemaining = Math.max(0, Number(contract.yearsRemaining ?? 0) - 1);
    if (contract.yearsRemaining <= 0) {
      contract.active = false;
      logs.push(`贸易合约到期：${contract.commodity}（${contract.id}）。`);
    }
  }

  logs.forEach((msg) => {
    if (Array.isArray(state?.logs?.yearLog)) state.logs.yearLog.unshift(`Year ${state.calendar?.year ?? '?'}: ${msg}`);
    else if (Array.isArray(state?.yearLog)) state.yearLog.unshift(`Year ${state.calendar?.year ?? '?'}: ${msg}`);
  });

  return { processed, fulfilled, failed, logs, executions, tradeRoutes: state.tradeRoutes ?? {} };
}
