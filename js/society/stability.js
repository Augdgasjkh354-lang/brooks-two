// Society stability module

export const BUREAUCRACY_POLICY_DEFS = {
  householdRegistry: {
    key: 'householdRegistry',
    name: '户籍制度',
    oneTimeCost: 1500000,
    annualMaintenance: 300000,
    description: '税收效率 +10%',
  },
  granaryLedger: {
    key: 'granaryLedger',
    name: '粮仓台账',
    oneTimeCost: 800000,
    annualMaintenance: 0,
    description: '每年粮仓额外留存 3%',
  },
  officialProclamation: {
    key: 'officialProclamation',
    name: '官府布告',
    oneTimeCost: 0,
    annualMaintenance: 600000,
    description: '稳定度惩罚 -15%',
  },
  contractSystem: {
    key: 'contractSystem',
    name: '契约制度',
    oneTimeCost: 2000000,
    annualMaintenance: 0,
    description: '商人满意度永久 +10',
  },
  codifiedLawPolicy: {
    key: 'codifiedLawPolicy',
    name: '律法成文',
    oneTimeCost: 4000000,
    annualMaintenance: 0,
    description: '稳定度基础值 +10',
  },
};



function routeOfficialIncome(world, amount) {
  const safeAmount = Math.max(0, Number(amount ?? 0));
  world.officialIncomePool = Math.max(0, Number(world.officialIncomePool ?? 0) + safeAmount);
  return safeAmount;
}
export function ensureBureaucracyPolicyState(world) {
  if (!world) return;

  world.householdRegistryActive = Boolean(world.householdRegistryActive ?? false);
  world.granaryLedgerActive = Boolean(world.granaryLedgerActive ?? false);
  world.officialProclamationActive = Boolean(world.officialProclamationActive ?? false);
  world.contractSystemActive = Boolean(world.contractSystemActive ?? false);
  world.codifiedLawPolicyActive = Boolean(world.codifiedLawPolicyActive ?? false);

  world.bureaucracyMaintenancePaid = Number(world.bureaucracyMaintenancePaid ?? 0);
  world.bureaucracyMaintenanceMissing = Number(world.bureaucracyMaintenanceMissing ?? 0);
}

export function getBureaucracyEffects(world) {
  ensureBureaucracyPolicyState(world);

  return {
    taxEfficiencyBonus: world.householdRegistryActive ? 0.1 : 0,
    grainRetentionRate: world.granaryLedgerActive ? 0.03 : 0,
    stabilityPenaltyReduction: world.officialProclamationActive ? 0.15 : 0,
    merchantSatisfactionPermanentBonus: world.contractSystemActive ? 10 : 0,
    stabilityBaseBonus: world.codifiedLawPolicyActive ? 10 : 0,
  };
}

export function activateBureaucracyPolicy(world, policyKey) {
  ensureBureaucracyPolicyState(world);

  if (!world?.techBonuses?.bureaucracyUnlocked) {
    return { success: false, reason: '官僚体系未解锁。' };
  }

  const def = BUREAUCRACY_POLICY_DEFS[policyKey];
  if (!def) {
    return { success: false, reason: '政策不存在。' };
  }

  const activeField = `${policyKey}Active`;
  if (world[activeField]) {
    return { success: false, reason: '该政策已生效。' };
  }

  if ((world.grainTreasury ?? 0) < def.oneTimeCost) {
    return { success: false, reason: `粮仓不足（需要${def.oneTimeCost}粮）。` };
  }

  world.grainTreasury = Math.max(0, (world.grainTreasury ?? 0) - def.oneTimeCost);
  routeOfficialIncome(world, def.oneTimeCost);
  world[activeField] = true;

  return {
    success: true,
    policy: def,
    costPaid: def.oneTimeCost,
  };
}

export function applyBureaucracyAnnualMaintenance(world) {
  ensureBureaucracyPolicyState(world);

  const activePolicies = Object.values(BUREAUCRACY_POLICY_DEFS).filter(
    (policy) => world[`${policy.key}Active`]
  );

  const expected = activePolicies.reduce((sum, policy) => sum + policy.annualMaintenance, 0);
  const available = Math.max(0, Number(world.grainTreasury ?? 0));
  const paid = Math.min(available, expected);

  world.grainTreasury = available - paid;
  routeOfficialIncome(world, paid);
  world.bureaucracyMaintenancePaid = paid;
  world.bureaucracyMaintenanceMissing = Math.max(0, expected - paid);

  return {
    expected,
    paid,
    missing: world.bureaucracyMaintenanceMissing,
    activePolicies,
  };
}

export function getStabilityPenaltyFromIncomeGap(incomeGap) {
  if (incomeGap > 2000) {
    return {
      penalty: 30,
      reason: 'Income gap above 2000 (-30)',
    };
  }

  if (incomeGap >= 1000) {
    return {
      penalty: 20,
      reason: 'Income gap 1000-2000 (-20)',
    };
  }

  if (incomeGap >= 500) {
    return {
      penalty: 10,
      reason: 'Income gap 500-1000 (-10)',
    };
  }

  return {
    penalty: 0,
    reason: 'No penalty (income gap below 500)',
  };
}

export function getEfficiencyMultiplier(stabilityIndex) {
  if (stabilityIndex >= 80) return 1.0;
  if (stabilityIndex >= 50) return 0.85;
  return 0.65;
}


export function getStabilityBase(world) {
  const base = Number(world?.techBonuses?.stabilityBase ?? 80);
  const policyBonus = world?.codifiedLawPolicyActive ? 10 : 0;
  return base + policyBonus;
}


function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

export function ensureGovernmentInstitution(world, yearLog = null) {
  if (!world) return false;
  if (!world.governmentEstablished && Number(world.adminTalent ?? 0) >= 10) {
    world.governmentEstablished = true;
    if (Array.isArray(yearLog)) {
      yearLog.unshift(`Year ${world.year}: 政府机构已建立（文官人才达到10）。`);
    }
    return true;
  }
  return false;
}

export function calculateGovernmentEfficiency(world) {
  const institutionSize = Math.max(1, Math.ceil(Number(world.totalPopulation ?? 0) / 2000));
  const requiredTalent = institutionSize * 2;
  const deployedTalent = Math.max(0, Number(world.adminTalentDeployedGov ?? 0));
  const talentRatio = requiredTalent > 0 ? deployedTalent / requiredTalent : 1;
  let talentTierMultiplier = 1.0;
  if (talentRatio < 0.3) talentTierMultiplier = 0;
  else if (talentRatio < 0.6) talentTierMultiplier = 0.5;
  else if (talentRatio < 0.9) talentTierMultiplier = 0.8;
  else if (talentRatio > 1.0) talentTierMultiplier = 1.1;

  const talentAdequacy = clampPercent(Math.min(1.1, talentRatio) * 100 * talentTierMultiplier);

  const paperOutput = Math.max(0, Number(world.paperOutput ?? 0));
  const requiredPaper = paperOutput * 0.1;
  let paperSupply = 50;
  if (paperOutput > 0) {
    const availablePaper = paperOutput * 0.1;
    const ratio = requiredPaper > 0 ? availablePaper / requiredPaper : 1;
    paperSupply = Math.max(30, Math.min(100, ratio * 100));
  }

  const requiredStaff = institutionSize * 5;
  const actualStaff = Math.max(0, Number(world.juniorOfficialCount ?? 0) + Number(world.midOfficialCount ?? 0));
  const staffing = clampPercent(Math.min(1, requiredStaff > 0 ? actualStaff / requiredStaff : 1) * 100);

  const weighted = talentAdequacy * 0.4 + paperSupply * 0.3 + staffing * 0.3;
  const efficiency = clampPercent(weighted);

  world.governmentEfficiencyTalent = talentAdequacy;
  world.governmentEfficiencyPaper = paperSupply;
  world.governmentEfficiencyStaffing = staffing;
  world.governmentEfficiency = efficiency;

  world.professionalCount = Math.max(0, institutionSize * 2);

  return {
    institutionSize,
    requiredTalent,
    deployedTalent,
    talentAdequacy,
    paperSupply,
    staffing,
    efficiency,
  };
}

export function calculateGovernmentWageBill(world) {
  const gdpPerCapita = Math.max(0, Number(world.gdpPerCapita ?? 0));

  const sanitizeCount = Number(world.publicToilets ?? 0) >= 1 ? Math.max(0, Math.floor(Number(world.sanitationWorkerCount ?? 0))) : 0;
  const cleaningCount = Number(world.roadLength ?? 0) >= 1 ? Math.max(0, Math.floor(Number(world.cleaningWorkerCount ?? 0))) : 0;
  world.sanitationWorkerCount = sanitizeCount;
  world.cleaningWorkerCount = cleaningCount;

  const defaults = {
    seniorOfficialWage: gdpPerCapita * 3.0,
    midOfficialWage: gdpPerCapita * 1.5,
    juniorOfficialWage: gdpPerCapita * 0.8,
    professionalWage: gdpPerCapita * 1.2,
    sanitationWorkerWage: gdpPerCapita * 0.3,
    cleaningWorkerWage: gdpPerCapita * 0.35,
  };

  Object.entries(defaults).forEach(([key, value]) => {
    const current = Number(world[key] ?? 0);
    world[key] = current > 0 ? current : value;
  });

  const total =
    Number(world.seniorOfficialCount ?? 0) * Number(world.seniorOfficialWage ?? 0) +
    Number(world.midOfficialCount ?? 0) * Number(world.midOfficialWage ?? 0) +
    Number(world.juniorOfficialCount ?? 0) * Number(world.juniorOfficialWage ?? 0) +
    Number(world.professionalCount ?? 0) * Number(world.professionalWage ?? 0) +
    Number(world.sanitationWorkerCount ?? 0) * Number(world.sanitationWorkerWage ?? 0) +
    Number(world.cleaningWorkerCount ?? 0) * Number(world.cleaningWorkerWage ?? 0);

  world.totalWageBill = Math.max(0, total);
  world.totalSalaryCost = world.totalWageBill;
  world.totalOfficials =
    Number(world.seniorOfficialCount ?? 0) +
    Number(world.midOfficialCount ?? 0) +
    Number(world.juniorOfficialCount ?? 0) +
    Number(world.professionalCount ?? 0) +
    Number(world.sanitationWorkerCount ?? 0) +
    Number(world.cleaningWorkerCount ?? 0);

  return world.totalWageBill;
}

export function calculateFireLeakage(world) {
  let rate = 0.05;
  const factors = [];
  const gdpPerCapita = Math.max(0, Number(world.gdpPerCapita ?? 0));

  if ((world.juniorOfficialWage ?? 0) < gdpPerCapita * 0.8) {
    rate += 0.03;
    factors.push('基层官员工资偏低 +3%');
  }
  if ((world.officialLifeQuality ?? 50) < 50) {
    rate += 0.02;
    factors.push('官员生活质量偏低 +2%');
  }
  if ((world.governmentEfficiency ?? 0) < 60) {
    rate += 0.02;
    factors.push('机构效率低于60% +2%');
  }
  if (!world.taxBureauEstablished) {
    rate += 0.03;
    factors.push('税务机构未设立 +3%');
  }
  if (!world.courtEstablished) {
    rate += 0.02;
    factors.push('司法机构未设立 +2%');
  }

  if (world.taxBureauEstablished && (world.governmentEfficiency ?? 0) > 80) {
    rate -= 0.03;
    factors.push('税务机构高效 -3%');
  }
  if (world.courtEstablished && (world.governmentEfficiency ?? 0) > 80) {
    rate -= 0.02;
    factors.push('司法机构高效 -2%');
  }
  if (world.householdRegistryActive) {
    rate -= 0.02;
    factors.push('户籍制度 -2%');
  }
  if ((world.seniorOfficialWage ?? 0) >= gdpPerCapita * 3.0) {
    rate -= 0.01;
    factors.push('高级官员薪资达标 -1%');
  }
  if ((world.adminTalent ?? 0) > 200) {
    rate -= 0.01;
    factors.push('文官人才充沛 -1%');
  }

  rate = Math.max(0.02, Math.min(0.3, rate));
  world.fireLeakageRate = rate;
  world.fireLeakageFactors = factors.join(' | ') || '基准火耗 5%';
  return { rate, factors };
}
