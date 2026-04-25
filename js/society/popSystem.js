const POP_SCALE = 100;

const POP_TYPE_ORDER = ['farmer', 'worker', 'merchant', 'official', 'scholar'];

const DEFAULT_POP_NEEDS = {
  farmer: { grain: 360, salt: 15, cloth: 0.3, medicine: 0.05 },
  worker: { grain: 360, salt: 15, cloth: 0.35, medicine: 0.08 },
  merchant: { grain: 320, salt: 18, cloth: 0.45, medicine: 0.08 },
  official: { grain: 300, salt: 20, cloth: 0.5, medicine: 0.1 },
  scholar: { grain: 280, salt: 18, cloth: 0.5, medicine: 0.1 },
};

const DEFAULT_POP_POLITICS = {
  farmer: 'conservative',
  worker: 'reformist',
  merchant: 'conservative',
  official: 'conservative',
  scholar: 'reformist',
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
}

function clampSatisfaction(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value ?? 0))));
}

function getClasses(world) {
  return world?.__classes ?? world?.classes ?? world;
}

function getCommodityAvailability(state, commodityKey) {
  const priceEntry = state?.commodityPrices?.[commodityKey];
  const supply = Math.max(0, Number(priceEntry?.supply ?? 0));
  const demand = Math.max(0, Number(priceEntry?.demand ?? 0));

  if (demand > 0) {
    return clamp01(supply / demand);
  }

  const reserve = Math.max(0, Number(state?.commodities?.[commodityKey] ?? 0));
  return reserve > 0 ? 1 : 0;
}

function getPopIncomePerPerson(state, popType) {
  const world = state?.world ?? {};
  const classes = getClasses(world);

  if (popType === 'farmer') {
    return Math.max(0, Number(classes.farmerIncomePerHead ?? world.farmerIncomePerHead ?? world.farmingWage ?? 0));
  }

  if (popType === 'merchant') {
    return Math.max(0, Number(classes.merchantIncomePerHead ?? world.merchantIncomePerHead ?? world.commerceWagePerWorker ?? 0));
  }

  if (popType === 'official') {
    return Math.max(0, Number(classes.officialIncomePerHead ?? world.officialIncomePerHead ?? world.institutionWage ?? 0));
  }

  if (popType === 'worker') {
    const wageCandidates = [
      Number(world.hempWage ?? 0),
      Number(world.mulberryWage ?? 0),
      Number(world.farmingWage ?? 0),
      Number(world.averageWage ?? 0),
    ].filter((v) => Number.isFinite(v) && v > 0);
    if (!wageCandidates.length) return 0;
    return wageCandidates.reduce((sum, v) => sum + v, 0) / wageCandidates.length;
  }

  if (popType === 'scholar') {
    const official = Math.max(0, Number(classes.officialIncomePerHead ?? world.officialIncomePerHead ?? world.institutionWage ?? 0));
    return official * 1.1;
  }

  return 0;
}

function getWeightedNeedSatisfaction(needsSatisfied = {}) {
  return (
    clamp01(needsSatisfied.grain ?? 0) * 0.4 +
    clamp01(needsSatisfied.salt ?? 0) * 0.2 +
    clamp01(needsSatisfied.cloth ?? 0) * 0.2 +
    clamp01(needsSatisfied.medicine ?? 0) * 0.1 +
    0.1
  );
}

function mapTypeToPopulationSize(world, popType) {
  if (popType === 'farmer') {
    return Math.max(0, Number(world.farmingLaborAllocated ?? world.farmerPopulation ?? 0));
  }
  if (popType === 'worker') {
    return Math.max(0, Number(world.hempLaborAllocated ?? 0)) + Math.max(0, Number(world.mulberryLaborAllocated ?? 0));
  }
  if (popType === 'merchant') {
    return Math.max(0, Number(world.merchantCount ?? world.merchantPopulation ?? 0));
  }
  if (popType === 'official') {
    return Math.max(0, Number(world.institutionWorkers ?? world.officialPopulation ?? 0));
  }
  if (popType === 'scholar') {
    return Math.max(0, Number(world.higherGraduates ?? 0));
  }
  return 0;
}

function buildDefaultPop(id, type, size = 0) {
  return {
    id,
    type,
    size,
    wealth: 0,
    needs: { ...(DEFAULT_POP_NEEDS[type] ?? DEFAULT_POP_NEEDS.farmer) },
    needsSatisfied: { grain: 1, salt: 1, cloth: 1, medicine: 1 },
    politicalLeaning: DEFAULT_POP_POLITICS[type] ?? 'reformist',
    literacy: type === 'farmer' ? 0.05 : 0.1,
    satisfaction: 50,
    income: 0,
    savings: 0,
  };
}

export function ensurePopState(state) {
  if (!state || !state.world) return;

  const existing = Array.isArray(state.pops) ? state.pops : [];
  const popByType = new Map(existing.map((pop) => [pop.type, pop]));

  state.pops = POP_TYPE_ORDER.map((type, index) => {
    const present = popByType.get(type);
    const people = mapTypeToPopulationSize(state.world, type);
    const size = Math.max(0, Math.floor(people / POP_SCALE));

    if (!present) {
      return buildDefaultPop(`pop_${String(index + 1).padStart(3, '0')}`, type, size);
    }

    return {
      ...buildDefaultPop(present.id ?? `pop_${String(index + 1).padStart(3, '0')}`, type, size),
      ...present,
      type,
      size,
      needs: {
        ...(DEFAULT_POP_NEEDS[type] ?? DEFAULT_POP_NEEDS.farmer),
        ...(present.needs ?? {}),
      },
      needsSatisfied: {
        grain: clamp01(present.needsSatisfied?.grain ?? 1),
        salt: clamp01(present.needsSatisfied?.salt ?? 1),
        cloth: clamp01(present.needsSatisfied?.cloth ?? 1),
        medicine: clamp01(present.needsSatisfied?.medicine ?? 1),
      },
      satisfaction: clampSatisfaction(present.satisfaction ?? 50),
      literacy: clamp01(present.literacy ?? (type === 'farmer' ? 0.05 : 0.1)),
      wealth: Math.max(0, Number(present.wealth ?? 0)),
      savings: Number(present.savings ?? 0),
    };
  });

  state.world.__pops = state.pops;
}

export function updatePops(state) {
  ensurePopState(state);
  const world = state?.world ?? {};
  const classes = getClasses(world);
  const prices = state?.commodityPrices ?? {};

  const previousAverageByType = {};
  state.pops.forEach((pop) => {
    previousAverageByType[pop.type] = Number(pop.satisfaction ?? 50);
  });

  let totalWealthWeighted = 0;
  let totalPeople = 0;

  for (const pop of state.pops) {
    const people = Math.max(0, Math.floor(Number(pop.size ?? 0) * POP_SCALE));
    if (people <= 0) {
      pop.income = 0;
      pop.wealth = 0;
      pop.savings = 0;
      pop.needsSatisfied = { grain: 1, salt: 1, cloth: 1, medicine: 1 };
      pop.satisfaction = clampSatisfaction(pop.satisfaction ?? 50);
      continue;
    }

    const incomePerPerson = getPopIncomePerPerson(state, pop.type);
    const totalIncome = incomePerPerson * people;

    const needsSatisfied = {};
    let expensePerPerson = 0;

    Object.entries(pop.needs ?? {}).forEach(([commodity, requiredPerPerson]) => {
      const unitPrice = Math.max(0, Number(prices?.[commodity]?.price ?? 1));
      const required = Math.max(0, Number(requiredPerPerson ?? 0));
      needsSatisfied[commodity] = getCommodityAvailability(state, commodity);
      expensePerPerson += required * unitPrice;
    });

    const totalExpenses = expensePerPerson * people;
    const savingsDelta = totalIncome - totalExpenses;
    pop.savings = Number(pop.savings ?? 0) + savingsDelta;
    pop.income = totalIncome;
    pop.wealth = Math.max(0, pop.savings / Math.max(people, 1));
    pop.needsSatisfied = {
      grain: clamp01(needsSatisfied.grain ?? 1),
      salt: clamp01(needsSatisfied.salt ?? 1),
      cloth: clamp01(needsSatisfied.cloth ?? 1),
      medicine: clamp01(needsSatisfied.medicine ?? 1),
    };

    const weightedNeeds = getWeightedNeedSatisfaction(pop.needsSatisfied);
    const targetSatisfaction = weightedNeeds * 100;
    const current = Number(pop.satisfaction ?? 50);
    pop.satisfaction = clampSatisfaction(current * 0.6 + targetSatisfaction * 0.4);

    totalWealthWeighted += pop.wealth * people;
    totalPeople += people;
  }

  const averageWealth = totalPeople > 0 ? totalWealthWeighted / totalPeople : 0;

  state.pops.forEach((pop) => {
    if (pop.wealth > averageWealth * 2) pop.politicalLeaning = 'conservative';
    else if (pop.wealth < averageWealth * 0.5) pop.politicalLeaning = 'radical';
    else pop.politicalLeaning = 'reformist';
  });

  const classSatisfactionFromPops = {
    farmer: 50,
    merchant: 50,
    official: 50,
  };

  const getTypeSat = (type) => {
    const relevant = state.pops.filter((pop) => pop.type === type);
    const people = relevant.reduce((sum, pop) => sum + Math.max(0, Number(pop.size ?? 0) * POP_SCALE), 0);
    if (people <= 0) return 50;
    const total = relevant.reduce((sum, pop) => sum + Number(pop.satisfaction ?? 50) * Math.max(0, Number(pop.size ?? 0) * POP_SCALE), 0);
    return clampSatisfaction(total / people);
  };

  classSatisfactionFromPops.farmer = getTypeSat('farmer');
  classSatisfactionFromPops.merchant = getTypeSat('merchant');
  classSatisfactionFromPops.official = getTypeSat('official');

  world.farmerLiteracy = clamp01(state.pops.find((p) => p.type === 'farmer')?.literacy ?? world.farmerLiteracy ?? 0.05);
  world.workerLiteracy = clamp01((state.pops.find((p) => p.type === 'worker')?.literacy ?? world.workerLiteracy ?? 0.05));

  world.popClassSatisfaction = classSatisfactionFromPops;
  world.popAverageWealth = averageWealth;
  world.laborForce = state.pops
    .filter((pop) => ['farmer', 'worker', 'merchant', 'official'].includes(pop.type))
    .reduce((sum, pop) => sum + Math.max(0, Number(pop.size ?? 0) * POP_SCALE), 0);

  const political = { conservative: 0, reformist: 0, radical: 0 };
  state.pops.forEach((pop) => {
    political[pop.politicalLeaning] = (political[pop.politicalLeaning] ?? 0) + Math.max(0, Number(pop.size ?? 0));
  });
  world.popPoliticalDistribution = political;

  const notableChanges = [];
  ['farmer', 'merchant', 'official', 'worker'].forEach((type) => {
    const current = Number(state.pops.find((pop) => pop.type === type)?.satisfaction ?? 50);
    const previous = Number(previousAverageByType[type] ?? 50);
    const delta = current - previous;
    if (Math.abs(delta) >= 5) {
      notableChanges.push(`${type}满意度${delta > 0 ? '+' : ''}${Math.round(delta)}`);
    }
  });

  if (notableChanges.length > 0) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Pop系统：${notableChanges.join('，')}。`);
  }

  classes.farmerSatisfaction = classSatisfactionFromPops.farmer;
  classes.merchantSatisfaction = classSatisfactionFromPops.merchant;
  classes.officialSatisfaction = classSatisfactionFromPops.official;

  return {
    averageWealth,
    laborForce: world.laborForce,
    political,
    classSatisfactionFromPops,
  };
}
