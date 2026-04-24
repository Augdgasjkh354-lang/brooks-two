// Unified transfer ledger for core asset movements

function clampAmount(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function getWorld(state) {
  if (state?.world) return state.world;
  return state;
}

function getMonetary(state) {
  return state?.monetary ?? state?.world?.__monetary ?? state?.world?.monetary ?? state?.__monetary ?? state?.monetary ?? state;
}

function getAgriculture(state) {
  return state?.agriculture ?? state?.world?.__agriculture ?? state?.world?.agriculture ?? state?.__agriculture ?? state?.agriculture ?? state;
}

function getPrivateSector(state) {
  return state?.privateSector ?? state?.world?.__privateSector ?? state?.world?.privateSector ?? state?.__privateSector ?? state?.privateSector ?? null;
}

function resolveAccount(state, accountId) {
  const world = getWorld(state);
  const monetary = getMonetary(state);
  const agriculture = getAgriculture(state);
  const privateSector = getPrivateSector(state);

  switch (accountId) {
    case 'government.grain':
      return { holder: agriculture ?? world, key: 'grainTreasury' };
    case 'government.coupon':
      return { holder: monetary ?? world, key: 'couponTreasury' };
    case 'monetary.locked':
      return { holder: monetary ?? world, key: 'lockedGrainReserve' };
    case 'monetary.circulating':
      return { holder: monetary ?? world, key: 'couponCirculating' };
    case 'private.farmer.grain':
      return privateSector ? { holder: privateSector, key: 'farmerGrain' } : null;
    case 'private.farmer.coupon':
      return privateSector ? { holder: privateSector, key: 'farmerCoupons' } : null;
    case 'private.merchant.coupon':
      return privateSector ? { holder: privateSector, key: 'merchantCoupons' } : null;
    case 'private.merchant.grain':
      return privateSector ? { holder: privateSector, key: 'merchantGrain' } : null;
    default:
      return null;
  }
}

function refreshPrivateTotals(state) {
  const privateSector = getPrivateSector(state);
  if (!privateSector) return;
  privateSector.totalPrivateGrain = clampAmount(
    Number(privateSector.farmerGrain ?? 0) + Number(privateSector.merchantGrain ?? 0)
  );
  privateSector.totalPrivateCoupons = clampAmount(
    Number(privateSector.farmerCoupons ?? 0) + Number(privateSector.merchantCoupons ?? 0)
  );
}

function writeLedger(state, gdpTreatment, reason, amount, from, to, asset) {
  if (gdpTreatment === 'none') return;
  const world = getWorld(state);
  if (!world.ledger) world.ledger = {};
  if (!Array.isArray(world.ledger.transfers)) world.ledger.transfers = [];
  world.ledger.transfers.push({
    year: Number(world.year ?? 0),
    reason,
    gdpTreatment,
    from,
    to,
    asset,
    amount,
  });
}

export function transfer({ from, to, asset, amount, gdpTreatment = 'none', reason = '' }, state) {
  const safeAmount = clampAmount(amount);
  if (safeAmount <= 0) return true;

  const fromRef = resolveAccount(state, from);
  const toRef = resolveAccount(state, to);
  if (!fromRef || !toRef) return false;

  const fromBalance = clampAmount(fromRef.holder[fromRef.key] ?? 0);
  const toBalance = clampAmount(toRef.holder[toRef.key] ?? 0);

  const isCouponIssuanceMint = reason === 'coupon_issuance' && from === 'monetary.circulating';
  if (!isCouponIssuanceMint && from !== to && fromBalance < safeAmount) {
    return false;
  }

  if (from !== to) {
    if (!isCouponIssuanceMint) {
      fromRef.holder[fromRef.key] = clampAmount(fromBalance - safeAmount);
    }
    toRef.holder[toRef.key] = clampAmount(toBalance + safeAmount);
  }

  refreshPrivateTotals(state);
  writeLedger(state, gdpTreatment, reason, safeAmount, from, to, asset);
  return true;
}


export function produce({ to, asset, amount, gdpTreatment = 'none', reason = '' }, state) {
  const safeAmount = clampAmount(amount);
  if (safeAmount <= 0) return true;

  const toRef = resolveAccount(state, to);
  if (!toRef) return false;

  const toBalance = clampAmount(toRef.holder[toRef.key] ?? 0);
  toRef.holder[toRef.key] = clampAmount(toBalance + safeAmount);

  const world = getWorld(state);
  if (reason.includes('construction')) {
    world.constructionSpendingThisYear = clampAmount(
      Number(world.constructionSpendingThisYear ?? 0) + safeAmount
    );
  }

  refreshPrivateTotals(state);
  writeLedger(state, gdpTreatment, reason, safeAmount, null, to, asset);
  return true;
}

export function consume({ from, asset, amount, reason = '' }, state) {
  const safeAmount = clampAmount(amount);
  if (safeAmount <= 0) return true;

  const fromRef = resolveAccount(state, from);
  if (!fromRef) return false;

  const fromBalance = clampAmount(fromRef.holder[fromRef.key] ?? 0);
  if (fromBalance < safeAmount) return false;

  fromRef.holder[fromRef.key] = clampAmount(fromBalance - safeAmount);

  const world = getWorld(state);
  if (!world.ledger) world.ledger = {};
  if (!Array.isArray(world.ledger.consumption)) world.ledger.consumption = [];
  world.ledger.consumption.push({
    year: Number(world.year ?? 0),
    from,
    asset,
    amount: safeAmount,
    reason,
  });

  refreshPrivateTotals(state);
  return true;
}
