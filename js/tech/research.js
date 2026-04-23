export const techTree = [
  {
    id: 'basic_farming',
    name: '基础农耕',
    category: 'agriculture',
    description: '建立基础耕作方法，解锁后续农业强化研究。',
    researchYears: 1,
    cost: { grain: 2000, cloth: 0, coupon: 0 },
    prerequisites: [],
    unlocks: [{ type: 'available', target: 'intensive_farming' }],
    status: 'available',
  },
  {
    id: 'intensive_farming',
    name: '精耕细作',
    category: 'agriculture',
    description: '改进耕作管理，提升单位亩产潜力。',
    researchYears: 2,
    cost: { grain: 5000, cloth: 0, coupon: 0 },
    prerequisites: ['basic_farming'],
    unlocks: [{ type: 'bonus', target: 'grainYieldPerMu', value: 0.1 }],
    status: 'locked',
  },
  {
    id: 'crop_rotation',
    name: '轮作制度',
    category: 'agriculture',
    description: '通过轮作改善土壤与抗灾能力。',
    researchYears: 3,
    cost: { grain: 8000, cloth: 0, coupon: 0 },
    prerequisites: ['intensive_farming'],
    unlocks: [
      { type: 'bonus', target: 'grainYieldPerMu', value: 0.1 },
      { type: 'bonus', target: 'droughtResistance', value: 0.2 },
    ],
    status: 'locked',
  },
  {
    id: 'irrigation',
    name: '水利灌溉',
    category: 'agriculture',
    description: '建设灌溉体系，显著提升农业产出潜力。',
    researchYears: 3,
    cost: { grain: 10000, cloth: 100, coupon: 0 },
    prerequisites: ['intensive_farming'],
    unlocks: [{ type: 'bonus', target: 'grainYieldPerMu', value: 0.15 }],
    status: 'locked',
  },
  {
    id: 'folk_trade',
    name: '民间贸易',
    category: 'commerce',
    description: '规范民间交易，解锁商业制度技术。',
    researchYears: 1,
    cost: { grain: 1000, cloth: 0, coupon: 0 },
    prerequisites: [],
    unlocks: [
      { type: 'available', target: 'contract_law' },
      { type: 'available', target: 'weights_measures' },
    ],
    status: 'available',
  },
  {
    id: 'contract_law',
    name: '契约法',
    category: 'commerce',
    description: '以契约稳定交易秩序。',
    researchYears: 2,
    cost: { grain: 4000, cloth: 0, coupon: 0 },
    prerequisites: ['folk_trade'],
    unlocks: [{ type: 'bonus', target: 'merchantSatisfaction', value: 10 }],
    status: 'locked',
  },
  {
    id: 'weights_measures',
    name: '度量衡统一',
    category: 'commerce',
    description: '统一衡量标准，提升贸易效率。',
    researchYears: 1,
    cost: { grain: 3000, cloth: 0, coupon: 0 },
    prerequisites: ['folk_trade'],
    unlocks: [{ type: 'bonus', target: 'tradeEfficiency', value: 0.1 }],
    status: 'locked',
  },
  {
    id: 'written_records',
    name: '文字记录',
    category: 'society',
    description: '建立记录制度，促进治理与知识积累。',
    researchYears: 2,
    cost: { grain: 3000, cloth: 0, coupon: 0 },
    prerequisites: [],
    unlocks: [
      { type: 'available', target: 'papermaking' },
      { type: 'available', target: 'codified_law' },
    ],
    status: 'available',
  },
  {
    id: 'papermaking',
    name: '造纸术',
    category: 'society',
    description: '提升行政文书效率与知识传播能力。',
    researchYears: 2,
    cost: { grain: 5000, cloth: 50, coupon: 0 },
    prerequisites: ['written_records'],
    unlocks: [{ type: 'system', target: 'bureaucracy_system' }],
    status: 'locked',
  },
  {
    id: 'codified_law',
    name: '律法成文',
    category: 'society',
    description: '以成文法加强秩序与稳定。',
    researchYears: 2,
    cost: { grain: 4000, cloth: 0, coupon: 0 },
    prerequisites: ['written_records'],
    unlocks: [{ type: 'bonus', target: 'stabilityIndex', value: 10 }],
    status: 'locked',
  },
  {
    id: 'herbalism',
    name: '草药知识',
    category: 'society',
    description: '系统化草药经验，解锁医学基础。',
    researchYears: 2,
    cost: { grain: 2000, cloth: 0, coupon: 0 },
    prerequisites: [],
    unlocks: [{ type: 'available', target: 'basic_medicine' }],
    status: 'available',
  },
  {
    id: 'basic_medicine',
    name: '初级医学',
    category: 'society',
    description: '提升基础健康水平与人口增长潜力。',
    researchYears: 3,
    cost: { grain: 6000, cloth: 0, coupon: 0 },
    prerequisites: ['herbalism'],
    unlocks: [{ type: 'bonus', target: 'populationGrowthRate', value: 0.005 }],
    status: 'locked',
  },
  {
    id: 'militia',
    name: '民兵训练',
    category: 'military',
    description: '建立基础军事组织并解锁武备技术。',
    researchYears: 2,
    cost: { grain: 3000, cloth: 0, coupon: 0 },
    prerequisites: [],
    unlocks: [
      { type: 'system', target: 'military_system' },
      { type: 'available', target: 'weapon_forging' },
    ],
    status: 'available',
  },
  {
    id: 'weapon_forging',
    name: '武器锻造',
    category: 'military',
    description: '改进兵器制造并提升战斗力。',
    researchYears: 2,
    cost: { grain: 5000, cloth: 100, coupon: 0 },
    prerequisites: ['militia'],
    unlocks: [{ type: 'bonus', target: 'combatPower', value: 0.2 }],
    status: 'locked',
  },
];

export function initResearch(state) {
  if (!state.research) {
    state.research = {
      currentTech: null,
      yearsRemaining: 0,
      completed: [],
      available: ['basic_farming', 'folk_trade', 'written_records', 'herbalism', 'militia'],
    };
  }

  if (!state.techBonuses) {
    state.techBonuses = {
      grainYieldBonus: 0,
      tradeEfficiency: 0,
      droughtResistance: 0,
      combatPower: 0,
    };
  }

  const completedSet = new Set(state.research.completed ?? []);
  const availableSet = new Set(state.research.available ?? []);
  const currentTechId = state.research.currentTech ?? null;

  techTree.forEach((tech) => {
    if (completedSet.has(tech.id)) {
      tech.status = 'completed';
      return;
    }
    if (tech.id === currentTechId) {
      tech.status = 'researching';
      return;
    }
    tech.status = availableSet.has(tech.id) ? 'available' : 'locked';
  });

  state.research.available = getAvailableTechs(state);
}

export function getAvailableTechs(state) {
  const completedSet = new Set(state.research.completed ?? []);
  const currentTechId = state.research.currentTech ?? null;

  return techTree
    .filter((tech) => {
      if (completedSet.has(tech.id)) return false;
      if (tech.id === currentTechId) return false;
      const prereqs = tech.prerequisites ?? [];
      return prereqs.every((prereqId) => completedSet.has(prereqId));
    })
    .map((tech) => tech.id);
}

export function canStartResearch(state, techId) {
  if (state.research.currentTech) {
    return { success: false, reason: '已有正在研究的技术。' };
  }

  const tech = techTree.find((item) => item.id === techId);
  if (!tech) {
    return { success: false, reason: '目标技术不存在。' };
  }

  if ((state.research.completed ?? []).includes(techId)) {
    return { success: false, reason: '该技术已完成。' };
  }

  const prereqs = tech.prerequisites ?? [];
  const completedSet = new Set(state.research.completed ?? []);
  const prereqOk = prereqs.every((prereqId) => completedSet.has(prereqId));
  if (!prereqOk) {
    return { success: false, reason: '前置技术未完成。' };
  }

  const cost = { grain: 0, cloth: 0, coupon: 0, ...(tech.cost ?? {}) };
  if ((state.world.grainTreasury ?? 0) < cost.grain) {
    return { success: false, reason: '粮仓不足。' };
  }
  if ((state.world.clothReserve ?? 0) < cost.cloth) {
    return { success: false, reason: '布匹储备不足。' };
  }
  if ((state.world.couponTreasury ?? 0) < cost.coupon) {
    return { success: false, reason: '粮劵国库不足。' };
  }

  return { success: true, tech };
}

export function startResearch(state, techId) {
  const check = canStartResearch(state, techId);
  if (!check.success) return check;

  const tech = check.tech;
  const cost = { grain: 0, cloth: 0, coupon: 0, ...(tech.cost ?? {}) };

  state.world.grainTreasury -= cost.grain;
  state.world.clothReserve -= cost.cloth;
  state.world.couponTreasury -= cost.coupon;

  state.research.currentTech = tech.id;
  state.research.yearsRemaining = tech.researchYears;

  tech.status = 'researching';
  state.research.available = getAvailableTechs(state);

  return { success: true, tech, cost };
}

export function applyTechEffect(state, tech) {
  (tech.unlocks ?? []).forEach((unlock) => {
    if (unlock.type === 'available') {
      const targetTech = techTree.find((item) => item.id === unlock.target);
      if (targetTech && !(state.research.completed ?? []).includes(targetTech.id)) {
        targetTech.status = 'available';
      }
      return;
    }

    if (unlock.type !== 'bonus') {
      return;
    }

    if (unlock.target === 'grainYieldPerMu') {
      state.techBonuses.grainYieldBonus += unlock.value ?? 0;
    } else if (unlock.target === 'tradeEfficiency') {
      state.techBonuses.tradeEfficiency += unlock.value ?? 0;
    } else if (unlock.target === 'droughtResistance') {
      state.techBonuses.droughtResistance += unlock.value ?? 0;
    } else if (unlock.target === 'combatPower') {
      state.techBonuses.combatPower += unlock.value ?? 0;
    }
  });
}

export function updateResearch(state) {
  if (!state.research.currentTech) {
    state.research.available = getAvailableTechs(state);
    return null;
  }

  state.research.yearsRemaining = Math.max(0, (state.research.yearsRemaining ?? 0) - 1);
  if (state.research.yearsRemaining > 0) {
    return null;
  }

  const completedTechId = state.research.currentTech;
  const tech = techTree.find((item) => item.id === completedTechId);
  if (!tech) {
    state.research.currentTech = null;
    state.research.available = getAvailableTechs(state);
    return null;
  }

  tech.status = 'completed';
  state.research.completed = [...(state.research.completed ?? []), tech.id];
  applyTechEffect(state, tech);

  state.research.currentTech = null;
  state.research.yearsRemaining = 0;
  state.research.available = getAvailableTechs(state);

  return tech;
}
