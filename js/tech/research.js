import {
  TECH_BASIC_FARMING, TECH_INTENSIVE_FARMING, TECH_CROP_ROTATION, TECH_IRRIGATION,
  TECH_FOLK_TRADE, TECH_CONTRACT_LAW, TECH_WEIGHTS_MEASURES, TECH_MONEYLENDER, TECH_LONG_DISTANCE_TRADE,
  TECH_WRITTEN_RECORDS, TECH_PAPERMAKING, TECH_CODIFIED_LAW, TECH_HERBALISM, TECH_BASIC_MEDICINE,
  TECH_IMPERIAL_EXAM, TECH_ADVANCED_MEDICINE, TECH_MILITIA, TECH_WEAPON_FORGING, TECH_FORTIFICATION,
  TECH_INTELLIGENCE, TECH_SELECTIVE_BREEDING, TECH_WATERMILL, BASE_STABILITY
} from '../config/constants.js';

export const techTree = [
  {
    id: 'basic_farming',
    name: '基础农耕',
    category: 'agriculture',
    description: '建立基础耕作方法，解锁后续农业强化研究。',
    researchYears: 1,
    cost: { grain: TECH_BASIC_FARMING, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_INTENSIVE_FARMING, cloth: 0, coupon: 0 },
    prerequisites: ['basic_farming'],
    unlocks: [{ type: 'bonus', target: 'grainYieldPerMu', value: 50 }],
    status: 'locked',
  },
  {
    id: 'crop_rotation',
    name: '轮作制度',
    category: 'agriculture',
    description: '通过轮作改善土壤与抗灾能力。',
    researchYears: 3,
    cost: { grain: TECH_CROP_ROTATION, cloth: 0, coupon: 0 },
    prerequisites: ['intensive_farming'],
    unlocks: [
      { type: 'bonus', target: 'grainYieldPerMu', value: 50 },
      { type: 'bonus', target: 'droughtResistance', value: true },
    ],
    status: 'locked',
  },
  {
    id: 'irrigation',
    name: '水利灌溉',
    category: 'agriculture',
    description: '建设灌溉体系，显著提升农业产出潜力。',
    researchYears: 3,
    cost: { grain: TECH_IRRIGATION, cloth: 100000, coupon: 0 },
    prerequisites: ['intensive_farming'],
    unlocks: [{ type: 'bonus', target: 'grainYieldPerMu', value: 75 }],
    status: 'locked',
  },
  {
    id: 'selective_breeding',
    name: '育种改良',
    category: 'agriculture',
    description: '通过系统育种进一步提高亩产并解锁新作物研发。',
    researchYears: 3,
    cost: { grain: TECH_SELECTIVE_BREEDING, cloth: 0, coupon: 0 },
    prerequisites: ['crop_rotation'],
    unlocks: [
      { type: 'bonus', target: 'grainYieldPerMu', value: 50 },
      { type: 'available', target: 'new_crops' },
    ],
    status: 'locked',
  },
  {
    id: 'watermill',
    name: '水车磨坊',
    category: 'agriculture',
    description: '利用水车磨坊提升劳动效率并解锁磨粉加工体系。',
    researchYears: 3,
    cost: { grain: TECH_WATERMILL, cloth: 150000, coupon: 0 },
    prerequisites: ['irrigation'],
    unlocks: [
      { type: 'bonus', target: 'laborEfficiency', value: 0.05 },
      { type: 'system', target: 'flour_processing' },
    ],
    status: 'locked',
  },
  {
    id: 'folk_trade',
    name: '民间贸易',
    category: 'commerce',
    description: '规范民间交易，解锁商业制度技术。',
    researchYears: 1,
    cost: { grain: TECH_FOLK_TRADE, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_CONTRACT_LAW, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_WEIGHTS_MEASURES, cloth: 0, coupon: 0 },
    prerequisites: ['folk_trade'],
    unlocks: [{ type: 'bonus', target: 'tradeEfficiency', value: 0.1 }],
    status: 'locked',
  },
  {
    id: 'moneylender',
    name: '钱庄系统',
    category: 'commerce',
    description: '建立借贷网络，增强商业资本周转能力。',
    researchYears: 3,
    cost: { grain: TECH_MONEYLENDER, cloth: 0, coupon: 0 },
    prerequisites: ['contract_law'],
    unlocks: [
      { type: 'system', target: 'lending_system' },
      { type: 'bonus', target: 'commerceGDP', value: 0.1 },
    ],
    status: 'locked',
  },
  {
    id: 'long_distance_trade',
    name: '远途贸易',
    category: 'commerce',
    description: '发展远程商路并拓展跨区域贸易伙伴。',
    researchYears: 4,
    cost: { grain: TECH_LONG_DISTANCE_TRADE, cloth: 200000, coupon: 0 },
    prerequisites: ['weights_measures'],
    unlocks: [
      { type: 'system', target: 'new_trade_partners' },
      { type: 'bonus', target: 'tradeEfficiency', value: 0.15 },
    ],
    status: 'locked',
  },
  {
    id: 'written_records',
    name: '文字记录',
    category: 'society',
    description: '建立记录制度，促进治理与知识积累。',
    researchYears: 2,
    cost: { grain: TECH_WRITTEN_RECORDS, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_PAPERMAKING, cloth: 50000, coupon: 0 },
    prerequisites: ['written_records'],
    unlocks: [{ type: 'bonus', target: 'bureaucracyUnlocked', value: true }],
    status: 'locked',
  },
  {
    id: 'codified_law',
    name: '律法成文',
    category: 'society',
    description: '以成文法加强秩序与稳定。',
    researchYears: 2,
    cost: { grain: TECH_CODIFIED_LAW, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_HERBALISM, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_BASIC_MEDICINE, cloth: 0, coupon: 0 },
    prerequisites: ['herbalism'],
    unlocks: [{ type: 'bonus', target: 'populationGrowthRate', value: 0.005 }],
    status: 'locked',
  },
  {
    id: 'imperial_exam_proto',
    name: '科举雏形',
    category: 'society',
    description: '搭建官员选拔雏形，提高官僚质量与秩序基础。',
    researchYears: 4,
    cost: { grain: TECH_IMPERIAL_EXAM, cloth: 0, coupon: 0 },
    prerequisites: ['papermaking', 'codified_law'],
    unlocks: [
      { type: 'system', target: 'scholar_class' },
      { type: 'bonus', target: 'officialSatisfaction', value: 15 },
      { type: 'bonus', target: 'stabilityBase', value: 5 },
    ],
    status: 'locked',
  },
  {
    id: 'advanced_medicine',
    name: '高级医学',
    category: 'society',
    description: '提升医疗体系成熟度，进一步促进人口与民生。',
    researchYears: 4,
    cost: { grain: TECH_ADVANCED_MEDICINE, cloth: 100000, coupon: 0 },
    prerequisites: ['basic_medicine'],
    unlocks: [
      { type: 'bonus', target: 'populationGrowthRate', value: 0.005 },
      { type: 'bonus', target: 'farmerSatisfaction', value: 5 },
    ],
    status: 'locked',
  },
  {
    id: 'militia',
    name: '民兵训练',
    category: 'military',
    description: '建立基础军事组织并解锁武备技术。',
    researchYears: 2,
    cost: { grain: TECH_MILITIA, cloth: 0, coupon: 0 },
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
    cost: { grain: TECH_WEAPON_FORGING, cloth: 100000, coupon: 0 },
    prerequisites: ['militia'],
    unlocks: [{ type: 'bonus', target: 'combatPower', value: 0.2 }],
    status: 'locked',
  },
  {
    id: 'fortification',
    name: '城防工事',
    category: 'military',
    description: '构建防御体系，显著提升城市防御能力。',
    researchYears: 3,
    cost: { grain: TECH_FORTIFICATION, cloth: 250000, coupon: 0 },
    prerequisites: ['weapon_forging'],
    unlocks: [
      { type: 'bonus', target: 'defenseRating', value: 0.3 },
      { type: 'system', target: 'defense_system' },
    ],
    status: 'locked',
  },
  {
    id: 'intelligence',
    name: '情报系统',
    category: 'military',
    description: '建立情报网络，提升对外态势掌控能力。',
    researchYears: 3,
    cost: { grain: TECH_INTELLIGENCE, cloth: 0, coupon: 0 },
    prerequisites: ['weapon_forging'],
    unlocks: [
      { type: 'system', target: 'espionage_system' },
      { type: 'bonus', target: 'attitudeToPlayer', value: 5 },
    ],
    status: 'locked',
  },
];

function ensureTechBonusesShape(state) {
  if (!state.techBonuses) {
    state.techBonuses = {};
  }

  state.techBonuses.grainYieldBonus = Number(state.techBonuses.grainYieldBonus ?? 0);
  state.techBonuses.stabilityBase = Number(state.techBonuses.stabilityBase ?? BASE_STABILITY);
  state.techBonuses.populationGrowthBonus = Number(state.techBonuses.populationGrowthBonus ?? 0);
  state.techBonuses.tradeEfficiency = Number(state.techBonuses.tradeEfficiency ?? 0);
  state.techBonuses.combatPower = Number(state.techBonuses.combatPower ?? 0);
  state.techBonuses.bureaucracyUnlocked = Boolean(state.techBonuses.bureaucracyUnlocked ?? false);
  state.techBonuses.merchantSatisfactionBonus = Number(state.techBonuses.merchantSatisfactionBonus ?? 0);
  state.techBonuses.droughtResistance = Boolean(state.techBonuses.droughtResistance ?? false);
  state.techBonuses.defenseRating = Number(state.techBonuses.defenseRating ?? 0);
  state.techBonuses.flourProcessing = Boolean(state.techBonuses.flourProcessing ?? false);
  state.techBonuses.lendingSystem = Boolean(state.techBonuses.lendingSystem ?? false);
  state.techBonuses.newTradePartners = Boolean(state.techBonuses.newTradePartners ?? false);
  state.techBonuses.scholarClass = Boolean(state.techBonuses.scholarClass ?? false);
  state.techBonuses.espionageSystem = Boolean(state.techBonuses.espionageSystem ?? false);
  state.techBonuses.laborEfficiencyBonus = Number(state.techBonuses.laborEfficiencyBonus ?? 0);
  state.techBonuses.commerceGDPMultiplierBonus = Number(state.techBonuses.commerceGDPMultiplierBonus ?? 0);
  state.techBonuses.officialSatisfactionBonus = Number(state.techBonuses.officialSatisfactionBonus ?? 0);
  state.techBonuses.farmerSatisfactionBonus = Number(state.techBonuses.farmerSatisfactionBonus ?? 0);
}

export function initResearch(state) {
  if (!state.research) {
    state.research = {
      currentTech: null,
      yearsRemaining: 0,
      completed: [],
      available: ['basic_farming', 'folk_trade', 'written_records', 'herbalism', 'militia'],
    };
  }

  ensureTechBonusesShape(state);
  if (state.world) {
    state.world.techBonuses = state.techBonuses;
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

  const totalResearchSpend = Math.max(0, (cost.grain ?? 0) + (cost.cloth ?? 0) + (cost.coupon ?? 0));
  if (!state.world.ledger) state.world.ledger = {};
  state.world.ledger.researchCost = Math.max(0, Number(state.world.ledger.researchCost ?? 0)) + totalResearchSpend;
  const merchantShare = totalResearchSpend * 0.6;
  const officialShare = totalResearchSpend - merchantShare;
  state.world.merchantIncomePool = Math.max(0, Number(state.world.merchantIncomePool ?? 0) + merchantShare);
  state.world.officialIncomePool = Math.max(0, Number(state.world.officialIncomePool ?? 0) + officialShare);

  state.research.currentTech = tech.id;
  state.research.yearsRemaining = tech.researchYears;

  tech.status = 'researching';
  state.research.available = getAvailableTechs(state);

  return { success: true, tech, cost };
}

export function applyTechEffect(state, tech) {
  ensureTechBonusesShape(state);

  const appliedEffects = [];

  switch (tech.id) {
    case 'intensive_farming': {
      state.techBonuses.grainYieldBonus += 50;
      appliedEffects.push('亩产+50');
      break;
    }
    case 'crop_rotation': {
      state.techBonuses.grainYieldBonus += 50;
      state.techBonuses.droughtResistance = true;
      appliedEffects.push('亩产+50');
      appliedEffects.push('抗旱能力已启用');
      break;
    }
    case 'irrigation': {
      state.techBonuses.grainYieldBonus += 75;
      const maxBonus = 300;
      state.techBonuses.grainYieldBonus = Math.min(maxBonus, state.techBonuses.grainYieldBonus);
      appliedEffects.push('亩产+75（总亩产上限800）');
      break;
    }
    case 'selective_breeding': {
      state.techBonuses.grainYieldBonus += 50;
      appliedEffects.push('亩产+50');
      break;
    }
    case 'watermill': {
      state.techBonuses.laborEfficiencyBonus += 0.05;
      state.techBonuses.flourProcessing = true;
      appliedEffects.push('劳动力效率+5%');
      appliedEffects.push('磨粉加工体系已解锁');
      break;
    }
    case 'contract_law': {
      state.techBonuses.merchantSatisfactionBonus += 10;
      appliedEffects.push('商人满意度永久+10');
      break;
    }
    case 'weights_measures': {
      state.techBonuses.tradeEfficiency += 0.1;
      appliedEffects.push('对外贸易效率+10%');
      break;
    }
    case 'moneylender': {
      state.techBonuses.lendingSystem = true;
      state.techBonuses.commerceGDPMultiplierBonus += 0.1;
      appliedEffects.push('商业GDP系数+10%');
      appliedEffects.push('借贷系统已解锁');
      break;
    }
    case 'long_distance_trade': {
      state.techBonuses.newTradePartners = true;
      state.techBonuses.tradeEfficiency += 0.15;
      appliedEffects.push('对外贸易效率+15%');
      appliedEffects.push('新贸易伙伴已解锁');
      break;
    }
    case 'codified_law': {
      state.techBonuses.stabilityBase += 10;
      appliedEffects.push('稳定度基础值+10');
      break;
    }
    case 'basic_medicine': {
      state.techBonuses.populationGrowthBonus += 0.005;
      appliedEffects.push('人口增长率+0.5%');
      break;
    }
    case 'imperial_exam_proto': {
      state.techBonuses.scholarClass = true;
      state.techBonuses.officialSatisfactionBonus += 15;
      state.techBonuses.stabilityBase += 5;
      appliedEffects.push('官员满意度+15');
      appliedEffects.push('稳定度基础值+5');
      appliedEffects.push('士人阶层已解锁');
      break;
    }
    case 'advanced_medicine': {
      state.techBonuses.populationGrowthBonus += 0.005;
      state.techBonuses.farmerSatisfactionBonus += 5;
      appliedEffects.push('人口增长率+0.5%');
      appliedEffects.push('农民满意度永久+5');
      break;
    }
    case 'papermaking': {
      state.techBonuses.bureaucracyUnlocked = true;
      appliedEffects.push('官僚体系已解锁（占位）');
      break;
    }
    case 'weapon_forging': {
      state.techBonuses.combatPower += 0.2;
      appliedEffects.push('战斗力+20%（占位）');
      break;
    }
    case 'fortification': {
      state.techBonuses.defenseRating += 0.3;
      appliedEffects.push('防御评级+30%');
      break;
    }
    case 'intelligence': {
      state.techBonuses.espionageSystem = true;
      const xikouRef = state.xikou ?? state.world?.xikou;
      if (xikouRef) {
        xikouRef.attitudeToPlayer = Number(xikouRef.attitudeToPlayer ?? 0) + 5;
      }
      appliedEffects.push('溪口态度+5（一次性）');
      appliedEffects.push('情报系统已解锁');
      break;
    }
    default:
      break;
  }

  (tech.unlocks ?? []).forEach((unlock) => {
    if (unlock.type === 'available') {
      const targetTech = techTree.find((item) => item.id === unlock.target);
      if (targetTech && !(state.research.completed ?? []).includes(targetTech.id)) {
        targetTech.status = 'available';
      }
    }
  });

  return appliedEffects;
}

export function updateResearch(state) {
  if (!state.research.currentTech) {
    state.research.available = getAvailableTechs(state);
    return null;
  }

  const researchSpeedBonus = Math.max(0, Number(state.world?.techTalentResearchSpeedBonus ?? 0));
  const annualProgress = 1 + researchSpeedBonus;
  state.research.yearsRemaining = Math.max(0, (state.research.yearsRemaining ?? 0) - annualProgress);
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
  const appliedEffects = applyTechEffect(state, tech);

  if (Array.isArray(state.yearLog) && appliedEffects.length > 0) {
    state.yearLog.unshift(`Year ${state.world?.year ?? 0}: 技术效果生效 - ${tech.name}：${appliedEffects.join('，')}。`);
  }

  state.research.currentTech = null;
  state.research.yearsRemaining = 0;
  state.research.available = getAvailableTechs(state);

  return { ...tech, appliedEffects };
}
