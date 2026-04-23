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

  if (world.taxBureauEstablished && (world.taxBureauEfficiency ?? 0) > 80) {
    rate -= 0.03;
    factors.push('税务机构高效 -3%');
  }
  if (world.courtEstablished && (world.courtEfficiency ?? 0) > 80) {
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


export function ensurePoliceInstitution(world, yearLog = null) {
  if (!world) return false;

  const unlocked = Boolean(world.governmentEstablished) && Number(world.adminTalent ?? 0) >= 100;
  if (unlocked && !world.policeEstablished) {
    world.policeEstablished = true;
    if (Array.isArray(yearLog)) {
      yearLog.unshift(`Year ${world.year}: 警务机构已建立（文官人才达到100）。`);
    }
    return true;
  }

  return false;
}

function getPoliceRatioTier(policeRatio) {
  if (policeRatio < 1 / 1000) {
    return {
      key: 'extreme_shortage',
      label: '警力极度短缺',
      stabilityDelta: -20,
      commerceMultiplier: 0.9,
      merchantLifeQualityDelta: 0,
      farmerLifeQualityDelta: 0,
      message: '治安崩溃，盗贼横行',
    };
  }

  if (policeRatio < 1 / 500) {
    return {
      key: 'shortage',
      label: '警力不足',
      stabilityDelta: -10,
      commerceMultiplier: 1,
      merchantLifeQualityDelta: 0,
      farmerLifeQualityDelta: 0,
      message: '治安较差，民间纠纷频发',
    };
  }

  if (policeRatio < 1 / 200) {
    return {
      key: 'adequate',
      label: '警力适中',
      stabilityDelta: 0,
      commerceMultiplier: 1,
      merchantLifeQualityDelta: 0,
      farmerLifeQualityDelta: 0,
      message: '',
    };
  }

  if (policeRatio < 1 / 100) {
    return {
      key: 'good',
      label: '警力良好',
      stabilityDelta: 5,
      commerceMultiplier: 1.05,
      merchantLifeQualityDelta: 5,
      farmerLifeQualityDelta: 0,
      message: '治安良好，商业繁荣',
    };
  }

  return {
    key: 'excessive',
    label: '警力过剩',
    stabilityDelta: 3,
    commerceMultiplier: 1,
    merchantLifeQualityDelta: 0,
    farmerLifeQualityDelta: -10,
    message: '警力过剩，民间压迫感强',
  };
}

export function calculatePoliceEffects(world) {
  const totalPopulation = Math.max(1, Number(world?.totalPopulation ?? 0));
  if (!world?.policeEstablished) {
    world.policeRatio = 0;
    world.policeEfficiency = 0;
    world.policeEfficiencyTalent = 0;
    world.policeEfficiencyPaper = 0;
    world.policeEfficiencyStaffing = 0;
    world.policePaperInsufficient = false;
    world.policeStatusLabel = '未建立';
    world.policeEffectsSummary = '警务机构未建立';
    world.adminTalentDeployedPolice = 0;
    return {
      established: false,
      policeRatio: 0,
      policeRatioTier: 'inactive',
      policeRatioLabel: '未建立',
      stabilityDelta: 0,
      commerceMultiplier: 1,
      merchantLifeQualityDelta: 0,
      farmerLifeQualityDelta: 0,
      message: '',
      efficiency: 0,
      paperInsufficient: false,
      talentInsufficient: false,
      annualPoliceCost: 0,
    };
  }
  const adminTalent = Math.max(0, Number(world?.adminTalent ?? 0));
  const officerCount = Math.max(0, Math.floor(Number(world?.policeOfficerCount ?? 0)));
  world.policeOfficerCount = officerCount;

  const policeRatio = officerCount / totalPopulation;
  world.policeRatio = policeRatio;

  const gdpPerCapita = Math.max(0, Number(world?.gdpPerCapita ?? 0));
  const currentWage = Number(world?.officerWage ?? 0);
  world.officerWage = currentWage > 0 ? currentWage : gdpPerCapita * 1.2;
  world.adminTalentDeployedPolice = officerCount;

  const institutionSize = Math.max(1, Math.ceil(totalPopulation / 2000));
  const requiredTalent = institutionSize * 2;
  const deployedTalent = Math.max(0, Math.min(officerCount, adminTalent));
  const talentRatio = requiredTalent > 0 ? deployedTalent / requiredTalent : 1;

  let talentTierMultiplier = 1.0;
  if (talentRatio < 0.3) talentTierMultiplier = 0;
  else if (talentRatio < 0.6) talentTierMultiplier = 0.5;
  else if (talentRatio < 0.9) talentTierMultiplier = 0.8;
  else if (talentRatio > 1.0) talentTierMultiplier = 1.1;

  const talentAdequacy = clampPercent(Math.min(1.1, talentRatio) * 100 * talentTierMultiplier);

  const paperOutput = Math.max(0, Number(world?.paperOutput ?? 0));
  const policePaperDemand = paperOutput * 0.08;
  const paperSupply = paperOutput > 0 ? 100 : 50;

  const requiredStaff = institutionSize * 5;
  const staffingRatio = requiredStaff > 0 ? officerCount / requiredStaff : 1;
  const staffing = clampPercent(Math.min(1, staffingRatio) * 100);

  let efficiency = clampPercent(talentAdequacy * 0.4 + paperSupply * 0.3 + staffing * 0.3);
  let paperInsufficient = false;

  if (policePaperDemand <= 0) {
    paperInsufficient = true;
    efficiency = clampPercent(efficiency - 20);
  }

  const availableTalentForPolice = adminTalent >= officerCount;
  if (!availableTalentForPolice && officerCount > 0) {
    efficiency = clampPercent(efficiency * 0.5);
  }

  world.policeEfficiencyTalent = talentAdequacy;
  world.policeEfficiencyPaper = paperSupply;
  world.policeEfficiencyStaffing = staffing;
  world.policeEfficiency = efficiency;
  world.policePaperInsufficient = paperInsufficient;

  let ratioEffects = getPoliceRatioTier(policeRatio);

  const efficiencyScale = efficiency < 60 ? 0.5 : 1;
  if (efficiency < 30) {
    ratioEffects = {
      ...ratioEffects,
      stabilityDelta: -ratioEffects.stabilityDelta,
      commerceMultiplier: ratioEffects.commerceMultiplier === 1 ? 1 : 1 - (ratioEffects.commerceMultiplier - 1),
      merchantLifeQualityDelta: -ratioEffects.merchantLifeQualityDelta,
      farmerLifeQualityDelta: -ratioEffects.farmerLifeQualityDelta,
      message: '警察系统效率低下，执法混乱',
      label: `${ratioEffects.label}（反转）`,
    };
  } else if (efficiency < 60) {
    ratioEffects = {
      ...ratioEffects,
      stabilityDelta: ratioEffects.stabilityDelta * efficiencyScale,
      commerceMultiplier: 1 + (ratioEffects.commerceMultiplier - 1) * efficiencyScale,
      merchantLifeQualityDelta: ratioEffects.merchantLifeQualityDelta * efficiencyScale,
      farmerLifeQualityDelta: ratioEffects.farmerLifeQualityDelta * efficiencyScale,
    };
  }

  const ratioLine = `警民比 ${(policeRatio * 1000).toFixed(2)}/千人（${ratioEffects.label}）`;
  const effLine = `效率 ${efficiency.toFixed(1)}%`;
  world.policeStatusLabel = ratioEffects.label;
  world.policeEffectsSummary = `${ratioLine}，${effLine}`;

  return {
    established: Boolean(world.policeEstablished),
    policeRatio,
    policeRatioTier: ratioEffects.key,
    policeRatioLabel: ratioEffects.label,
    stabilityDelta: ratioEffects.stabilityDelta,
    commerceMultiplier: ratioEffects.commerceMultiplier,
    merchantLifeQualityDelta: ratioEffects.merchantLifeQualityDelta,
    farmerLifeQualityDelta: ratioEffects.farmerLifeQualityDelta,
    message: ratioEffects.message,
    efficiency,
    paperInsufficient,
    talentInsufficient: !availableTalentForPolice && officerCount > 0,
    annualPoliceCost: officerCount * Math.max(0, Number(world.officerWage ?? 0)),
  };
}


function calculateInstitutionEfficiency({ institutionSize, deployedTalent, paperOutput, paperShare, staffCount, staffTalentBonus = 0 }) {
  const requiredTalent = institutionSize * 2;
  const talentRatio = requiredTalent > 0 ? deployedTalent / requiredTalent : 1;

  let talentTierMultiplier = 1.0;
  if (talentRatio < 0.3) talentTierMultiplier = 0;
  else if (talentRatio < 0.6) talentTierMultiplier = 0.5;
  else if (talentRatio < 0.9) talentTierMultiplier = 0.8;
  else if (talentRatio > 1.0) talentTierMultiplier = 1.1;

  const talentAdequacy = clampPercent(Math.min(1.1, talentRatio) * 100 * talentTierMultiplier);
  const requiredPaper = Math.max(0, paperOutput * paperShare);
  let paperSupply = 50;
  if (paperOutput > 0) {
    const ratio = requiredPaper > 0 ? (paperOutput * paperShare) / requiredPaper : 1;
    paperSupply = Math.max(30, Math.min(100, ratio * 100));
  }

  const requiredStaff = institutionSize * 5;
  const staffingRaw = requiredStaff > 0 ? (staffCount + staffTalentBonus) / requiredStaff : 1;
  const staffing = clampPercent(Math.min(1, staffingRaw) * 100);

  return {
    talentAdequacy,
    paperSupply,
    staffing,
    efficiency: clampPercent(talentAdequacy * 0.4 + paperSupply * 0.3 + staffing * 0.3),
  };
}

export function ensureCourtInstitution(world, yearLog = null) {
  if (!world) return false;
  const unlocked = Boolean(world.governmentEstablished) && Number(world.adminTalent ?? 0) >= 200 && Boolean(world.codifiedLawPolicyActive);
  if (unlocked && !world.courtEstablished) {
    world.courtEstablished = true;
    if (Array.isArray(yearLog)) yearLog.unshift(`Year ${world.year}: 法院已建立（文官人才达到200且律法成文已实施）。`);
    return true;
  }
  return false;
}

export function ensureTaxBureauInstitution(world, yearLog = null) {
  if (!world) return false;
  const unlocked = Boolean(world.governmentEstablished) && Number(world.adminTalent ?? 0) >= 150 && Boolean(world.householdRegistryActive);
  if (unlocked && !world.taxBureauEstablished) {
    world.taxBureauEstablished = true;
    if (Array.isArray(yearLog)) yearLog.unshift(`Year ${world.year}: 税务局已建立（文官人才达到150且户籍制度已启用）。`);
    return true;
  }
  return false;
}

export function calculateCourtEffects(world) {
  if (!world?.courtEstablished) {
    world.courtEfficiency = 0;
    world.disputeRate = 1;
    world.adminTalentDeployedCourt = 0;
    return { established: false, efficiency: 0, disputeRate: 1, commerceMultiplier: 1, merchantLifeQualityDelta: 0, merchantSatisfactionDelta: 0, fireLeakageDelta: 0, creditRatingCap: 'D', annualCourtCost: 0, message: '' };
  }
  const totalPopulation = Math.max(1, Number(world.totalPopulation ?? 0));
  world.judgeCount = Math.max(0, Math.floor(Number(world.judgeCount ?? 0)));
  const adminTalent = Math.max(0, Number(world.adminTalent ?? 0));
  world.adminTalentDeployedCourt = Math.min(world.judgeCount, adminTalent);

  const gdpPc = Math.max(0, Number(world.gdpPerCapita ?? 0));
  if ((world.judgeWage ?? 0) <= 0) world.judgeWage = gdpPc * 2.0;

  const institutionSize = Math.max(1, Math.ceil(totalPopulation / 2000));
  const eff = calculateInstitutionEfficiency({
    institutionSize,
    deployedTalent: world.adminTalentDeployedCourt,
    paperOutput: Math.max(0, Number(world.paperOutput ?? 0)),
    paperShare: 0.15,
    staffCount: world.judgeCount,
  });

  world.courtEfficiencyTalent = eff.talentAdequacy;
  world.courtEfficiencyPaper = eff.paperSupply;
  world.courtEfficiencyStaffing = eff.staffing;
  world.courtEfficiency = eff.efficiency;
  world.disputeRate = Math.max(0, 1 - eff.efficiency / 100);

  let commerceMultiplier = 1;
  let merchantLifeQualityDelta = 0;
  let merchantSatisfactionDelta = 0;
  let fireLeakageDelta = 0;
  let creditRatingCap = 'C';
  let message = '';

  if (eff.efficiency >= 80) {
    merchantLifeQualityDelta = 8;
    commerceMultiplier *= 1.05;
    fireLeakageDelta = -0.02;
    creditRatingCap = 'A';
    message = '法院运作良好，商业纠纷大减';
  } else if (eff.efficiency >= 50) {
    merchantLifeQualityDelta = 3;
    creditRatingCap = 'B';
  } else if (eff.efficiency < 30) {
    merchantLifeQualityDelta = -10;
    message = '法院效率低下，民间积案严重';
  }

  if (world.disputeRate > 0.5) {
    commerceMultiplier *= 0.95;
    merchantSatisfactionDelta -= 10;
    message = message ? `${message}；商业纠纷频发，影响市场秩序` : '商业纠纷频发，影响市场秩序';
  }

  const annualCourtCost = world.judgeCount * Math.max(0, Number(world.judgeWage ?? 0));
  return { established: true, efficiency: eff.efficiency, disputeRate: world.disputeRate, commerceMultiplier, merchantLifeQualityDelta, merchantSatisfactionDelta, fireLeakageDelta, creditRatingCap, annualCourtCost, message };
}

export function calculateTaxBureauEffects(world) {
  if (!world?.taxBureauEstablished) {
    world.taxBureauEfficiency = 0;
    world.adminTalentDeployedTax = 0;
    world.taxBureauRevenueMultiplier = 1;
    return { established: false, efficiency: 0, revenueMultiplier: 1, fireLeakageDelta: 0, annualTaxCost: 0, message: '' };
  }

  const totalPopulation = Math.max(1, Number(world.totalPopulation ?? 0));
  world.taxOfficerCount = Math.max(0, Math.floor(Number(world.taxOfficerCount ?? 0)));
  const adminTalent = Math.max(0, Number(world.adminTalent ?? 0));
  world.adminTalentDeployedTax = Math.min(world.taxOfficerCount, adminTalent);

  const gdpPc = Math.max(0, Number(world.gdpPerCapita ?? 0));
  if ((world.taxOfficerWage ?? 0) <= 0) world.taxOfficerWage = gdpPc * 1.0;

  const institutionSize = Math.max(1, Math.ceil(totalPopulation / 2000));
  const eff = calculateInstitutionEfficiency({
    institutionSize,
    deployedTalent: world.adminTalentDeployedTax,
    paperOutput: Math.max(0, Number(world.paperOutput ?? 0)),
    paperShare: 0.2,
    staffCount: world.taxOfficerCount,
    staffTalentBonus: Math.max(0, Number(world.techTalentDeployedTax ?? 0)) * 0.5,
  });

  world.taxBureauEfficiencyTalent = eff.talentAdequacy;
  world.taxBureauEfficiencyPaper = eff.paperSupply;
  world.taxBureauEfficiencyStaffing = eff.staffing;
  world.taxBureauEfficiency = eff.efficiency;

  let revenueMultiplier = 1;
  let fireLeakageDelta = 0;
  let message = '';
  if (eff.efficiency >= 80) {
    revenueMultiplier = 1.10;
    fireLeakageDelta = -0.02;
    message = '税务局运作高效，税收大幅提升';
  } else if (eff.efficiency >= 50) {
    revenueMultiplier = 1.05;
  } else if (eff.efficiency < 30) {
    revenueMultiplier = 0.90;
    message = '税务局效率低下，大量漏税';
  }

  world.taxBureauRevenueMultiplier = revenueMultiplier;
  const annualTaxCost = world.taxOfficerCount * Math.max(0, Number(world.taxOfficerWage ?? 0));
  return { established: true, efficiency: eff.efficiency, revenueMultiplier, fireLeakageDelta, annualTaxCost, message };
}

export function ensureHealthBureauInstitution(world, yearLog = null) {
  if (!world) return false;

  const unlocked =
    Boolean(world.governmentEstablished) &&
    Boolean(world.healthBureauPrereqMet);

  if (unlocked && !world.healthBureauEstablished) {
    world.healthBureauEstablished = true;
    if (Array.isArray(yearLog)) {
      yearLog.unshift(`Year ${world.year}: 卫生局已建立（公共卫生前置条件已满足）。`);
    }
    return true;
  }

  return false;
}

function hasTechCompleted(world, techId) {
  if (world?.techBonuses?.[techId]) return true;

  const completed = world?.research?.completed;
  if (!Array.isArray(completed)) return false;
  return completed.some((item) => item?.id === techId || item === techId);
}

function getHealthIndexColorLabel(index) {
  if (index >= 80) return '优良';
  if (index >= 60) return '良好';
  if (index >= 40) return '基线';
  if (index >= 20) return '堪忧';
  return '危机';
}

export function calculateHealthEffects(world) {
  if (!world) {
    return {
      healthIndex: 50,
      growthModifier: 0,
      farmerLifeQualityDelta: 0,
      allLifeQualityDelta: 0,
      message: '',
      lowHealth: false,
      efficiency: 0,
      annualHealthCost: 0,
      factorsPositive: [],
      factorsNegative: [],
    };
  }

  const totalPopulation = Math.max(1, Number(world.totalPopulation ?? 0));
  const adminTalent = Math.max(0, Number(world.adminTalent ?? 0));

  world.healthOfficerCount = Math.max(0, Math.floor(Number(world.healthOfficerCount ?? 0)));
  world.adminTalentDeployedHealth = Math.min(world.healthOfficerCount, adminTalent);

  const gdpPerCapita = Math.max(0, Number(world.gdpPerCapita ?? 0));
  if ((world.healthOfficerWage ?? 0) <= 0) {
    world.healthOfficerWage = gdpPerCapita * 1.2;
  }

  const institutionSize = Math.max(1, Math.ceil(totalPopulation / 2000));
  const requiredTalent = institutionSize * 2;
  const deployedTalent = Math.max(0, world.adminTalentDeployedHealth);
  const talentRatio = requiredTalent > 0 ? deployedTalent / requiredTalent : 1;

  let talentTierMultiplier = 1.0;
  if (talentRatio < 0.3) talentTierMultiplier = 0;
  else if (talentRatio < 0.6) talentTierMultiplier = 0.5;
  else if (talentRatio < 0.9) talentTierMultiplier = 0.8;
  else if (talentRatio > 1.0) talentTierMultiplier = 1.1;

  const talentAdequacy = clampPercent(Math.min(1.1, talentRatio) * 100 * talentTierMultiplier);

  const paperOutput = Math.max(0, Number(world.paperOutput ?? 0));
  const requiredPaper = paperOutput * 0.05;
  let paperSupply = 50;
  if (paperOutput > 0) {
    const availablePaper = paperOutput * 0.05;
    const ratio = requiredPaper > 0 ? availablePaper / requiredPaper : 1;
    paperSupply = Math.max(30, Math.min(100, ratio * 100));
  }

  const requiredStaff = institutionSize * 5;
  const staffingRatio = requiredStaff > 0 ? world.healthOfficerCount / requiredStaff : 1;
  const staffing = clampPercent(Math.min(1, staffingRatio) * 100);

  const healthEfficiency = clampPercent(talentAdequacy * 0.4 + paperSupply * 0.3 + staffing * 0.3);

  world.healthEfficiencyTalent = talentAdequacy;
  world.healthEfficiencyPaper = paperSupply;
  world.healthEfficiencyStaffing = staffing;
  world.healthEfficiency = world.healthBureauEstablished ? healthEfficiency : 0;

  let healthIndex = 50;
  const factorsPositive = [];
  const factorsNegative = [];

  if (world.healthBureauEstablished) {
    healthIndex += 10;
    factorsPositive.push('卫生局已建立 +10');
  }

  if ((world.healthEfficiency ?? 0) > 80) {
    healthIndex += 10;
    factorsPositive.push('卫生局效率高于80% +10');
  }

  if ((world.toiletCoverage ?? 0) >= 50) {
    healthIndex += 10;
    factorsPositive.push('公厕覆盖≥50% +10');
  }

  if ((world.toiletCoverage ?? 0) >= 80) {
    healthIndex += 5;
    factorsPositive.push('公厕覆盖≥80% +5');
  }

  if (hasTechCompleted(world, 'basic_medicine') || hasTechCompleted(world, 'basicMedicineCompleted')) {
    healthIndex += 10;
    factorsPositive.push('基础医术已完成 +10');
  }

  if (hasTechCompleted(world, 'advanced_medicine') || hasTechCompleted(world, 'advancedMedicineCompleted')) {
    healthIndex += 10;
    factorsPositive.push('进阶医术已完成 +10');
  }

  if ((world.grainSurplus ?? 0) > 0) {
    healthIndex += 5;
    factorsPositive.push('粮食结余为正 +5');
  }

  if (Number(world.cleaningWorkerCount ?? 0) >= Number(world.roadLength ?? 0) * 0.2) {
    healthIndex += 5;
    factorsPositive.push('道路清洁工配置达标 +5');
  }

  if ((world.toiletCoverage ?? 0) < 10) {
    healthIndex -= 15;
    factorsNegative.push('公厕覆盖<10% -15');
  }

  if ((world.grainSurplus ?? 0) < 0) {
    healthIndex -= 10;
    factorsNegative.push('粮食结余为负 -10');
  }

  if ((world.saltShortfallRatio ?? 0) > 0.3) {
    healthIndex -= 5;
    factorsNegative.push('食盐短缺率>30% -5');
  }

  if ((world.healthEfficiency ?? 0) < 30) {
    healthIndex -= 10;
    factorsNegative.push('卫生局效率<30% -10');
  }

  if (totalPopulation > 20000 && healthIndex < 50) {
    healthIndex -= 5;
    factorsNegative.push('人口拥挤效应 -5');
  }

  healthIndex = clampPercent(healthIndex);

  let growthModifier = 0;
  let farmerLifeQualityDelta = 0;
  let allLifeQualityDelta = 0;
  let message = '';

  if (healthIndex >= 80) {
    growthModifier = 0.005;
    farmerLifeQualityDelta = 5;
    message = '公共卫生优良，人口健康';
  } else if (healthIndex >= 60) {
    growthModifier = 0.002;
    farmerLifeQualityDelta = 2;
  } else if (healthIndex >= 40) {
    growthModifier = 0;
  } else if (healthIndex >= 20) {
    growthModifier = -0.005;
    farmerLifeQualityDelta = -5;
    message = '公共卫生堪忧，疾病风险上升';
  } else {
    growthModifier = -0.01;
    farmerLifeQualityDelta = -15;
    allLifeQualityDelta = -5;
    message = '卫生危机，疾病肆虐';
  }

  const lowHealth = healthIndex < 20;

  world.healthIndex = healthIndex;
  world.healthStatusLabel = getHealthIndexColorLabel(healthIndex);
  world.healthFactorsPositive = factorsPositive;
  world.healthFactorsNegative = factorsNegative;
  world.healthGrowthModifier = growthModifier;
  world.healthLifeQualityFarmerDelta = farmerLifeQualityDelta;
  world.healthLifeQualityAllDelta = allLifeQualityDelta;
  world.healthAnnualCost = world.healthOfficerCount * Math.max(0, Number(world.healthOfficerWage ?? 0));

  return {
    healthIndex,
    growthModifier,
    farmerLifeQualityDelta,
    allLifeQualityDelta,
    message,
    lowHealth,
    efficiency: world.healthEfficiency,
    annualHealthCost: world.healthAnnualCost,
    factorsPositive,
    factorsNegative,
  };
}
