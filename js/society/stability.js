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
