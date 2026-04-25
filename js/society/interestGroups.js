const GROUP_IDS = ['farmerGuild', 'merchantGuild', 'bureaucracy', 'military', 'scholars', 'craftsmen'];

const BASE_GROUPS = {
  farmerGuild: {
    name: '农民公会',
    icon: '🌾',
    basedOn: 'farmer',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: { maxTaxRate: 0.6, minGrainPrice: 0.8, maxRentRate: 5, minFoodSecurity: 0.8 },
    currentDemandsMet: 0,
    politicalStance: 'conservative',
    supportedPolicies: ['grain_redistribution', 'reclaim_land', 'lower_tax'],
    opposedPolicies: ['merchant_tax', 'high_rent', 'conscription'],
    unlockCondition: null,
    yearsBelow20: 0,
  },
  merchantGuild: {
    name: '商人行会',
    icon: '💰',
    basedOn: 'merchant',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: { maxCommerceTaxRate: 0.15, minTradeEfficiency: 0.8, maxInflationRate: 0.1, minCreditRating: 'B' },
    currentDemandsMet: 0,
    politicalStance: 'reformist',
    supportedPolicies: ['trade_subsidy', 'contract_law', 'weights_measures', 'lower_commerce_tax'],
    opposedPolicies: ['trade_protection', 'merchant_tax', 'price_control'],
    unlockCondition: { minMerchants: 5 },
    yearsBelow20: 0,
  },
  bureaucracy: {
    name: '官僚集团',
    icon: '📜',
    basedOn: 'official',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: { minOfficialWage: 1.2, minPaperSupply: 0.7, maxFireLeakage: 0.15, minInstitutionCount: 3 },
    currentDemandsMet: 0,
    politicalStance: 'conservative',
    supportedPolicies: ['household_registry', 'codified_law', 'expand_bureaucracy'],
    opposedPolicies: ['reduce_officials', 'anti_corruption', 'civil_service_reform'],
    unlockCondition: { governmentEstablished: true },
    yearsBelow20: 0,
  },
  military: {
    name: '军方',
    icon: '⚔️',
    basedOn: 'soldier',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: { minMilitaryBudget: 0.1, minWeaponsSupply: 0.8, minDefenseRating: 0.3, minBarracksCount: 1 },
    currentDemandsMet: 0,
    politicalStance: 'conservative',
    supportedPolicies: ['conscription', 'weapon_forging', 'fortification', 'expand_military'],
    opposedPolicies: ['disarmament', 'reduce_military_budget'],
    unlockCondition: { tech: 'militia' },
    yearsBelow20: 0,
  },
  scholars: {
    name: '学者阶层',
    icon: '📚',
    basedOn: 'scholar',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: { minLiteracyRate: 0.2, minSchoolCount: 2, minResearchBudget: 0.05, minAdminTalent: 50 },
    currentDemandsMet: 0,
    politicalStance: 'reformist',
    supportedPolicies: ['imperial_exam', 'expand_schools', 'research_funding', 'papermaking'],
    opposedPolicies: ['anti_intellectualism', 'reduce_education'],
    unlockCondition: { secondaryGraduates: 10 },
    yearsBelow20: 0,
  },
  craftsmen: {
    name: '工匠行会',
    icon: '🔨',
    basedOn: 'worker',
    size: 0,
    satisfaction: 50,
    power: 0,
    demands: { minWorkerWage: 0.8, minIronToolsSupply: 10, maxWorkHours: 1.0, minCraftBuildings: 1 },
    currentDemandsMet: 0,
    politicalStance: 'reformist',
    supportedPolicies: ['iron_tools_subsidy', 'craft_guild_rights', 'workshop_expansion'],
    opposedPolicies: ['price_control', 'foreign_goods_import'],
    unlockCondition: { buildings: ['blacksmith', 'kiln'] },
    yearsBelow20: 0,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value ?? 0)));
}

function addYearLog(state, msg) {
  if (!state.logs) state.logs = {};
  if (!Array.isArray(state.logs.yearLog)) state.logs.yearLog = [];
  state.logs.yearLog.unshift(msg);
  if (state.logs.yearLog.length > 200) state.logs.yearLog.length = 200;
  state.yearLog = state.logs.yearLog;
}

function getPopByType(state, type) {
  const pops = Array.isArray(state?.pops) ? state.pops : [];
  return pops.find((pop) => pop.type === type) ?? null;
}

function toLiteracyRatio(value) {
  const n = Number(value ?? 0);
  if (n <= 1) return clamp(n, 0, 1);
  return clamp(n / 100, 0, 1);
}

function compareCreditRating(current = 'C', minimum = 'B') {
  const order = ['D', 'C', 'B', 'A', 'AA', 'AAA'];
  return order.indexOf(String(current).toUpperCase()) >= order.indexOf(String(minimum).toUpperCase());
}

function meetsUnlockCondition(groupId, state) {
  const world = state?.world ?? {};
  const group = state?.interestGroups?.[groupId];
  const unlock = group?.unlockCondition;
  if (!unlock) return true;

  if (unlock.minMerchants != null && Number(world.merchantCount ?? 0) < Number(unlock.minMerchants)) return false;
  if (unlock.governmentEstablished && !Boolean(world.governmentEstablished)) return false;
  if (unlock.tech) {
    const completed = state?.research?.completed ?? [];
    if (!completed.includes(unlock.tech)) return false;
  }
  if (unlock.secondaryGraduates != null && Number(world.secondaryGraduates ?? 0) < Number(unlock.secondaryGraduates)) return false;
  if (Array.isArray(unlock.buildings) && unlock.buildings.length) {
    const hasAny = unlock.buildings.some((id) => Number(state?.buildings?.[id]?.count ?? 0) > 0);
    if (!hasAny) return false;
  }
  return true;
}

function getInstitutionCount(world) {
  const keys = ['governmentEstablished', 'policeEstablished', 'healthBureauEstablished', 'courtEstablished', 'taxBureauEstablished', 'tradeBureauEstablished', 'engineeringBureauEstablished'];
  return keys.reduce((sum, key) => sum + (world[key] ? 1 : 0), 0);
}

function getAveragePopWealth(state) {
  const pops = Array.isArray(state?.pops) ? state.pops : [];
  let totalPeople = 0;
  let wealthWeighted = 0;
  pops.forEach((pop) => {
    const people = Math.max(0, Number(pop.size ?? 0) * 100);
    wealthWeighted += Math.max(0, Number(pop.wealth ?? 0)) * people;
    totalPeople += people;
  });
  return totalPeople > 0 ? wealthWeighted / totalPeople : 1;
}

function getGroupSize(groupId, state) {
  const world = state?.world ?? {};
  if (groupId === 'farmerGuild') return Math.max(0, Number(getPopByType(state, 'farmer')?.size ?? 0) * 100);
  if (groupId === 'merchantGuild') return Math.max(0, Number(getPopByType(state, 'merchant')?.size ?? 0) * 100);
  if (groupId === 'bureaucracy') return Math.max(0, Number(getPopByType(state, 'official')?.size ?? 0) * 100);
  if (groupId === 'military') return Math.max(0, Number(state?.buildings?.barracks?.count ?? 0) * 100);
  if (groupId === 'scholars') return Math.max(0, Number(world.scholarPool ?? 0));
  if (groupId === 'craftsmen') return Math.max(0, Number(getPopByType(state, 'worker')?.size ?? 0) * 100);
  return 0;
}

export function calculateGroupPower(group, state) {
  const averageWealth = Math.max(1, getAveragePopWealth(state));
  const pop = getPopByType(state, group.basedOn);
  const literacy = toLiteracyRatio(pop?.literacy ?? state?.world?.overallLiteracy ?? 0.05);
  const wealth = Math.max(0, Number(pop?.wealth ?? averageWealth));

  const wealthFactorByGroup = {
    farmerGuild: 0.5,
    merchantGuild: wealth / averageWealth,
    bureaucracy: 2.0,
    military: 1.5,
    scholars: 1.5,
    craftsmen: 0.8,
  };

  const wealthFactor = wealthFactorByGroup[group.id] ?? 1;
  const power = Number(group.size ?? 0) * literacy * (Number(group.satisfaction ?? 50) / 50) * wealthFactor;
  return Math.max(0, Math.round(power));
}

export function checkGroupDemands(group, state) {
  const world = state?.world ?? {};
  const fiscal = state?.fiscal ?? world;
  const institutions = state?.institutions ?? world;
  const prices = state?.commodityPrices ?? {};
  const commodities = state?.commodities ?? {};

  if (group.id === 'farmerGuild') {
    const checks = [
      Number(fiscal.agriculturalTaxRate ?? 0) <= Number(group.demands.maxTaxRate ?? 0.6),
      Number(prices.grain?.price ?? 1) >= Number(group.demands.minGrainPrice ?? 0.8),
      Number(fiscal.farmlandRentRate ?? 0) <= Number(group.demands.maxRentRate ?? 5),
      Number(world.foodSecurityIndex ?? 0) >= Number(group.demands.minFoodSecurity ?? 0.8),
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  if (group.id === 'merchantGuild') {
    const checks = [
      Number(fiscal.commerceTaxRate ?? 0) <= Number(group.demands.maxCommerceTaxRate ?? 0.15),
      Number(world.tradeEfficiency ?? 0) >= Number(group.demands.minTradeEfficiency ?? 0.8),
      Number(world.inflationRate ?? 0) <= Number(group.demands.maxInflationRate ?? 0.1),
      compareCreditRating(world.creditRating ?? 'B', group.demands.minCreditRating ?? 'B'),
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  if (group.id === 'bureaucracy') {
    const gdpPerCapita = Math.max(1, Number(fiscal.gdpPerCapita ?? world.gdpPerCapita ?? 1));
    const checks = [
      Number(fiscal.professionalWage ?? world.professionalWage ?? 0) >= gdpPerCapita * Number(group.demands.minOfficialWage ?? 1.2),
      Number(prices.paper?.supply ?? 0) >= Number(prices.paper?.demand ?? 0) * Number(group.demands.minPaperSupply ?? 0.7),
      Number(fiscal.fireLeakageRate ?? world.fireLeakageRate ?? 1) <= Number(group.demands.maxFireLeakage ?? 0.15),
      getInstitutionCount(world) >= Number(group.demands.minInstitutionCount ?? 3),
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  if (group.id === 'military') {
    const gdp = Math.max(1, Number(world.gdpEstimate ?? 1));
    const militarySpend =
      Number(world.policeAnnualCost ?? 0) +
      Number(world.engineeringBureauAnnualCost ?? 0) * 0.2 +
      Number(world.tradeBureauAnnualCost ?? 0) * 0.1;
    const checks = [
      militarySpend / gdp >= Number(group.demands.minMilitaryBudget ?? 0.1),
      Number(prices.weapons?.supply ?? 0) >= Number(prices.weapons?.demand ?? 1) * Number(group.demands.minWeaponsSupply ?? 0.8),
      Number(institutions.defenseRating ?? world.defenseRating ?? 0) >= Number(group.demands.minDefenseRating ?? 0.3),
      Number(state?.buildings?.barracks?.count ?? 0) >= Number(group.demands.minBarracksCount ?? 1),
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  if (group.id === 'scholars') {
    const gdp = Math.max(1, Number(world.gdpEstimate ?? 1));
    const researchBudgetRatio = Number(state?.ledger?.researchCost ?? 0) / gdp;
    const checks = [
      Number(world.overallLiteracy ?? 0) >= Number(group.demands.minLiteracyRate ?? 0.2),
      (Number(state?.buildings?.school_primary?.count ?? 0) + Number(world.govPrimaryCapacity ?? 0) / 100) >= Number(group.demands.minSchoolCount ?? 2),
      researchBudgetRatio >= Number(group.demands.minResearchBudget ?? 0.05),
      Number(world.adminTalent ?? 0) >= Number(group.demands.minAdminTalent ?? 50),
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  if (group.id === 'craftsmen') {
    const avgWage = Math.max(1, Number(world.averageWage ?? 1));
    const workerWage = Math.max(Number(world.hempWage ?? 0), Number(world.mulberryWage ?? 0), Number(world.farmingWage ?? 0), Number(world.averageWage ?? 0));
    const checks = [
      workerWage >= avgWage * Number(group.demands.minWorkerWage ?? 0.8),
      Number(commodities.iron_tools ?? 0) >= Number(group.demands.minIronToolsSupply ?? 10),
      1.0 <= Number(group.demands.maxWorkHours ?? 1.0),
      (Number(state?.buildings?.blacksmith?.count ?? 0) + Number(state?.buildings?.kiln?.count ?? 0)) >= Number(group.demands.minCraftBuildings ?? 1),
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  return 0;
}

export function applyGroupPressure(state) {
  const groups = state?.interestGroups ?? {};
  const world = state?.world ?? {};
  const classes = state?.classes ?? world;
  const institutions = state?.institutions ?? world;

  GROUP_IDS.forEach((id) => {
    const group = groups[id];
    if (!group || !group.unlocked) return;
    if (Number(group.satisfaction ?? 50) >= 40) return;

    if (id === 'farmerGuild') {
      classes.farmerEventModifier = Number(classes.farmerEventModifier ?? 0) - 10;
      addYearLog(state, `Year ${state.calendar.year}: 农民公会不满，农村怨声载道`);
    } else if (id === 'merchantGuild') {
      world.commerceGDP = Math.max(0, Number(world.commerceGDP ?? 0) * 0.95);
      addYearLog(state, `Year ${state.calendar.year}: 商人行会抵制，商业活动受阻`);
    } else if (id === 'bureaucracy') {
      institutions.governmentEfficiency = Math.max(0, Number(institutions.governmentEfficiency ?? 0) * 0.9);
      addYearLog(state, `Year ${state.calendar.year}: 官僚集团消极，行政效率下降`);
    } else if (id === 'military') {
      institutions.defenseRating = Math.max(0, Number(institutions.defenseRating ?? world.defenseRating ?? 0) - 0.1);
      addYearLog(state, `Year ${state.calendar.year}: 军方不满，军心涣散`);
    } else if (id === 'scholars') {
      world.researchSpeedModifier = Math.max(0.1, Number(world.researchSpeedModifier ?? 1) * 0.8);
      addYearLog(state, `Year ${state.calendar.year}: 学者离心，科研进展迟缓`);
    } else if (id === 'craftsmen') {
      world.infrastructureCostMultiplier = Math.max(1, Number(world.infrastructureCostMultiplier ?? 1) * 1.2);
      addYearLog(state, `Year ${state.calendar.year}: 工匠罢工，建设成本上升`);
    }
  });
}

export function getGroupPolicyOptions(state) {
  const groups = state?.interestGroups ?? {};
  const options = [];
  GROUP_IDS.forEach((id) => {
    const group = groups[id];
    if (!group?.unlocked) return;
    if (Number(group.satisfaction ?? 50) < 50) {
      options.push({ id: `appease_${id}`, type: 'appease', groupId: id });
    }
    if (Number(group.satisfaction ?? 50) < 30) {
      options.push({ id: `suppress_${id}`, type: 'suppress', groupId: id });
    }
  });
  return options;
}

export function initInterestGroups(state) {
  if (!state || !state.world) return;

  const current = state.interestGroups ?? {};
  state.interestGroups = {};
  GROUP_IDS.forEach((id) => {
    state.interestGroups[id] = {
      id,
      ...structuredClone(BASE_GROUPS[id]),
      ...(current[id] ?? {}),
    };
  });
  state.world.__interestGroups = state.interestGroups;
}

export function updateInterestGroups(state) {
  initInterestGroups(state);
  const groups = state.interestGroups;

  GROUP_IDS.forEach((id) => {
    const group = groups[id];
    group.unlocked = meetsUnlockCondition(id, state);
    group.size = getGroupSize(id, state);
    if (!group.unlocked) {
      group.power = 0;
      group.currentDemandsMet = 0;
      group.yearsBelow20 = 0;
      return;
    }

    const metRatio = checkGroupDemands(group, state);
    group.currentDemandsMet = clamp(metRatio, 0, 1);

    if (group.currentDemandsMet > 0.8) group.satisfaction = clamp(Number(group.satisfaction ?? 50) + 5, 0, 100);
    else if (group.currentDemandsMet > 0.6) group.satisfaction = clamp(Number(group.satisfaction ?? 50) + 2, 0, 100);
    else if (group.currentDemandsMet < 0.2) group.satisfaction = clamp(Number(group.satisfaction ?? 50) - 10, 0, 100);
    else if (group.currentDemandsMet < 0.4) group.satisfaction = clamp(Number(group.satisfaction ?? 50) - 5, 0, 100);

    if (Number(group.satisfaction ?? 50) < 20) group.yearsBelow20 = Number(group.yearsBelow20 ?? 0) + 1;
    else group.yearsBelow20 = 0;

    group.power = calculateGroupPower(group, state);
  });

  applyGroupPressure(state);

  GROUP_IDS.forEach((id) => {
    const group = groups[id];
    if (!group?.unlocked) return;
    if (Number(group.yearsBelow20 ?? 0) >= 3) {
      const currentStability = Number((state.classes ?? state.world)?.stabilityIndex ?? 80);
      (state.classes ?? state.world).stabilityIndex = Math.max(0, currentStability - 20);
      addYearLog(state, `Year ${state.calendar.year}: [危机] ${group.name} 发动政治运动`);
      group.yearsBelow20 = 0;
    }
  });

  return groups;
}

export function applyInterestGroupPolicy(state, groupId, policyType = 'appease') {
  initInterestGroups(state);
  const group = state.interestGroups?.[groupId];
  if (!group || !group.unlocked) return { success: false, reason: '利益集团未解锁' };

  if (policyType === 'appease') {
    if (groupId === 'farmerGuild') {
      const cost = 2000000;
      if (Number(state.world.grainTreasury ?? 0) < cost) return { success: false, reason: '粮仓不足 2,000,000' };
      state.world.grainTreasury -= cost;
      group.satisfaction = clamp(Number(group.satisfaction ?? 50) + 20, 0, 100);
      return { success: true, message: `${group.name}安抚成功（-2000000粮，满意度+20）` };
    }
    if (groupId === 'merchantGuild') {
      const fiscal = state.fiscal ?? state.world;
      fiscal.commerceTaxRate = Math.max(0, Number(fiscal.commerceTaxRate ?? 0) - 0.05);
      group.satisfaction = clamp(Number(group.satisfaction ?? 50) + 15, 0, 100);
      return { success: true, message: `${group.name}安抚成功（商业税率-5%，满意度+15）` };
    }
    group.satisfaction = clamp(Number(group.satisfaction ?? 50) + 10, 0, 100);
    return { success: true, message: `${group.name}安抚成功（满意度+10）` };
  }

  if (policyType === 'suppress') {
    const classes = state.classes ?? state.world;
    classes.stabilityIndex = Math.max(0, Number(classes.stabilityIndex ?? 80) - 10);
    group.satisfaction = clamp(Number(group.satisfaction ?? 50) + 10, 0, 100);
    return { success: true, message: `镇压${group.name}，稳定度-10，满意度+10` };
  }

  return { success: false, reason: '未知政策' };
}

