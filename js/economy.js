import { constructionConstants } from './construction.js';

function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export function updateEconomicBreakdown(state, { grainOutput, laborAllocation }) {
  const staffedShops = Math.floor(laborAllocation.commerceLabor / constructionConstants.SHOP_WORKERS_PER_BUILDING);

  const agricultureGDP = clamp(grainOutput);
  const constructionGDP = clamp(state.economy.pendingConstructionSpending);
  const commerceGDP = clamp(staffedShops * constructionConstants.SHOP_GDP_PER_YEAR);

  const total = agricultureGDP + constructionGDP + commerceGDP;

  state.economy.gdp.agriculture = agricultureGDP;
  state.economy.gdp.construction = constructionGDP;
  state.economy.gdp.commerce = commerceGDP;
  state.economy.gdp.total = total;
  state.world.gdpEstimate = total;

  const employed =
    laborAllocation.agricultureLabor +
    laborAllocation.constructionLabor +
    laborAllocation.commerceLabor;
  state.economy.employmentRate = state.world.laborForce === 0 ? 0 : employed / state.world.laborForce;

  state.economy.pendingConstructionSpending = 0;

  return {
    staffedShops,
    gdp: { ...state.economy.gdp },
  };
}

export function issueGrainCoupons(state, amount) {
  if (!state.systems.grainCouponsUnlocked) {
    return { success: false, reason: 'Grain coupons are not unlocked yet.' };
  }

  const issueAmount = clamp(amount);
  if (issueAmount <= 0) {
    return { success: false, reason: 'Issue amount must be greater than zero.' };
  }

  state.grainCoupons.totalIssued += issueAmount;
  state.grainCoupons.governmentReserves += issueAmount;

  const releaseToCirculation = clamp(issueAmount * 0.5);
  state.grainCoupons.governmentReserves -= releaseToCirculation;
  state.grainCoupons.circulating += releaseToCirculation;

  return {
    success: true,
    issueAmount,
    releaseToCirculation,
  };
}
