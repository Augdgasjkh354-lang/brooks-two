import { createGameState } from './state.js';
import { updatePopulation, processEducationYear } from './society/population.js';
import { updateEconomy } from './economy/agriculture.js';
import { issueGrainCoupons, borrowGovernmentDebt, processGovernmentDebtYear } from './economy/currency.js';
import { executeOfficialSaltSale } from './economy/market.js';
import { approveMoneylenderLicenses, finalizeMoneylenderYear, syncMoneylenderCaps, canUseMoneylenderSystem, approveCommercialSchoolLicenses, applyPoliceCommerceEffects, applyCourtCommerceEffects, applyTradeBureauCommerceEffects } from './economy/commerce.js';
import { applyPolicy } from './unlocks.js';
import { policies } from './policies.js';
import { renderAll } from './render.js';
import { saveGame, loadGame, exportSave, importSave, resetGame, hasSave } from './save.js';
import { initResearch, startResearch, updateResearch } from './tech/research.js';
import { ensureGovernmentInstitution, ensurePoliceInstitution, ensureHealthBureauInstitution, ensureCourtInstitution, ensureTaxBureauInstitution, ensureTradeBureauInstitution, ensureEngineeringBureauInstitution, calculateGovernmentWageBill, calculatePoliceEffects, calculateHealthEffects, calculateCourtEffects, calculateTaxBureauEffects, calculateTradeBureauEffects, calculateEngineeringBureauEffects } from './society/stability.js';
import { applyPoliceLifeQualityEffects, applyCourtTaxLifeQualityEffects, calculateLifeQuality, calculateClassSatisfaction, clearEventModifiers } from './society/satisfaction.js';

const state = createGameState();


function getFiscal(stateObj = state) {
  return stateObj?.fiscal ?? stateObj?.world?.__fiscal ?? stateObj?.world ?? {};
}

function getMonetary(stateObj = state) {
  return stateObj?.monetary ?? stateObj?.world?.__monetary ?? stateObj?.world ?? {};
}

function getClasses(stateObj = state) {
  return stateObj?.classes ?? stateObj?.world?.__classes ?? stateObj?.world ?? {};
}

function getEducation(stateObj = state) {
  return stateObj?.education ?? stateObj?.world?.__education ?? stateObj?.world ?? {};
}

function getInstitutions(stateObj = state) {
  return stateObj?.institutions ?? stateObj?.world?.__institutions ?? stateObj?.world ?? {};
}


const LEDGER_DEFAULTS = {
  taxRevenue: 0, rentRevenue: 0, commerceTaxRevenue: 0, landTaxRevenue: 0, moneylenderTaxRevenue: 0,
  couponTaxRevenue: 0, tradeRevenue: 0, debtBorrowed: 0, totalIncome: 0, wageBill: 0, researchCost: 0,
  constructionCost: 0, educationCost: 0, importCost: 0, subsidyCost: 0, debtRepayment: 0, debtInterest: 0,
  totalExpense: 0, netBalance: 0, farmerGrossIncome: 0, farmerTaxPaid: 0, farmerNetIncome: 0,
  farmerConsumption: 0, farmerSavingsChange: 0, merchantGrossIncome: 0, merchantTaxPaid: 0,
  merchantNetIncome: 0, merchantConsumption: 0, merchantSavingsChange: 0, officialGrossIncome: 0,
  officialNetIncome: 0, officialSavingsChange: 0,
};

function ensureLedgerState() {
  state.ledger = { ...LEDGER_DEFAULTS, ...(state.ledger ?? {}) };
  state.world.ledger = state.ledger;
  if (!Array.isArray(state.ledgerHistory)) state.ledgerHistory = [];
}

function resetLedgerForYear() {
  state.ledger = { ...LEDGER_DEFAULTS };
  state.world.ledger = state.ledger;
}

function finalizeLedgerForYear() {
  ensureLedgerState();
  const incomeFields = ['taxRevenue', 'rentRevenue', 'commerceTaxRevenue', 'landTaxRevenue', 'moneylenderTaxRevenue', 'couponTaxRevenue', 'tradeRevenue', 'debtBorrowed'];
  const expenseFields = ['wageBill', 'researchCost', 'constructionCost', 'educationCost', 'importCost', 'subsidyCost', 'debtRepayment', 'debtInterest'];
  state.ledger.totalIncome = incomeFields.reduce((sum, key) => sum + Math.max(0, Number(state.ledger[key] ?? 0)), 0);
  state.ledger.totalExpense = expenseFields.reduce((sum, key) => sum + Math.max(0, Number(state.ledger[key] ?? 0)), 0);
  state.ledger.netBalance = state.ledger.totalIncome - state.ledger.totalExpense;
  state.ledger.farmerNetIncome = Math.max(0, Number(state.ledger.farmerGrossIncome ?? 0) - Number(state.ledger.farmerTaxPaid ?? 0));
  state.ledger.merchantNetIncome = Math.max(0, Number(state.ledger.merchantGrossIncome ?? 0) - Number(state.ledger.merchantTaxPaid ?? 0));
  state.ledger.officialNetIncome = Math.max(0, Number(state.ledger.officialGrossIncome ?? 0) - Number(state.ledger.officialSavingsChange ?? 0));

  state.ledgerHistory.unshift({ year: state.calendar.year, ...structuredClone(state.ledger) });
  if (state.ledgerHistory.length > 10) state.ledgerHistory.length = 10;

  const balanceLabel = state.ledger.netBalance >= 0 ? '财政盈余' : '财政赤字';
  state.yearLog.unshift(`Year ${state.calendar.year}: 年度账本结算：${balanceLabel} ${Math.round(state.ledger.netBalance)}。`);
}

function addConstructionSpending(amount) {
  const safeAmount = Math.max(0, Number(amount ?? 0));
  state.world.constructionSpendingThisYear =
    Math.max(0, Number(state.world.constructionSpendingThisYear ?? 0)) + safeAmount;
}

ensureLedgerState();

function getPolicyById(policyId) {
  return policies.find((policy) => policy.id === policyId);
}

function recordEconomySnapshot(econResult, taxCollected) {
  state.economyHistory.unshift({
    year: state.calendar.year,
    grainOutput: econResult.grainOutput,
    potentialGrainOutput: econResult.potentialGrainOutput,
    lostGrainOutput: econResult.lostGrainOutput,
    agriculturalTax: econResult.agriculturalTax,
    taxCollected,
  });

  if (state.economyHistory.length > 20) {
    state.economyHistory.length = 20;
  }
}

function logYearSummary({
  populationDelta,
  agriculturalTax,
  grainOutput,
  potentialGrainOutput,
  lostGrainOutput,
}) {
  const populationDirection = populationDelta >= 0 ? 'grow' : 'decline';
  const treasuryDirection = agriculturalTax >= 0 ? 'increased' : 'decreased';
  const utilization = Math.round(state.agriculture.landUtilizationPercent);

  state.yearLog.unshift(
    `Year ${state.calendar.year}: Population continued to ${populationDirection}, land utilization reached ${utilization}%, grain output was ${grainOutput}/${potentialGrainOutput} (lost ${lostGrainOutput}), grain treasury ${treasuryDirection} by ${agriculturalTax}, salt import ${state.world.actualSaltImport ?? 0}, salt consumed ${state.world.saltConsumed ?? 0}, shortfall ${Math.round((state.world.saltShortfallRatio ?? 0) * 100)}%.`
  );
}

function updateCreditCrisisResolutionState() {
  const monetary = getMonetary();
  const circulating = Math.max(0, monetary.couponCirculating ?? 0);
  if (circulating <= 0) {
    monetary.couponCirculating = 0;
    monetary.lockedGrainReserve = 0;
    monetary.backingRatio = 1;
    monetary.creditCrisis = false;
    return true;
  }

  monetary.backingRatio = Math.max(0, (monetary.lockedGrainReserve ?? 0) / circulating);
  if (monetary.backingRatio >= 0.6) {
    monetary.creditCrisis = false;
    return true;
  }

  return false;
}

function resolveByEmergencyRecirculation() {
  const monetary = getMonetary();
  if (!monetary.creditCrisis) {
    state.yearLog.unshift(`Year ${state.calendar.year}: No active credit crisis to resolve.`);
    render();
    return;
  }

  if (monetary.creditCrisisResolved) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Credit crisis action already used this crisis.`);
    render();
    return;
  }

  if ((monetary.couponTreasury ?? 0) < 10000) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 紧急回笼 failed - requires 10000 coupon treasury.`);
    render();
    return;
  }

  monetary.couponTreasury -= 10000;
  monetary.couponCirculating = Math.max(0, (monetary.couponCirculating ?? 0) - 10000);
  monetary.creditCrisisResolved = true;

  const resolved = updateCreditCrisisResolutionState();

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 执行紧急回笼（-10000 coupon treasury, -10000 circulating coupons）${
      resolved ? '，危机已缓解。' : '，危机仍在持续。'
    }`
  );

  render();
}

function resolveByEmergencyRedemption() {
  const monetary = getMonetary();
  if (!monetary.creditCrisis) {
    state.yearLog.unshift(`Year ${state.calendar.year}: No active credit crisis to resolve.`);
    render();
    return;
  }

  if (monetary.creditCrisisResolved) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Credit crisis action already used this crisis.`);
    render();
    return;
  }

  if ((state.agriculture.grainTreasury ?? 0) < 20000) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 紧急赎回 failed - requires 20000 grain treasury.`);
    render();
    return;
  }

  state.agriculture.grainTreasury -= 20000;
  monetary.couponCirculating = Math.max(0, (monetary.couponCirculating ?? 0) - 20000);
  monetary.lockedGrainReserve = Math.max(0, (monetary.lockedGrainReserve ?? 0) - 20000);
  monetary.creditCrisisResolved = true;

  const resolved = updateCreditCrisisResolutionState();

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 执行紧急赎回（-20000 grain treasury, -20000 circulating coupons）${
      resolved ? '，危机已缓解。' : '，危机仍在持续。'
    }`
  );

  render();
}




function applyCommercialSchoolLicense(type, target) {
  const result = approveCommercialSchoolLicenses(state.world, type, target);
  const name = type === 'primary' ? '商办蒙学' : '商办私塾';
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${name}牌照设置失败 - ${result.reason}`);
    render();
    return;
  }

  if (result.removed) {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${name}牌照下调至 ${result.totalApproved} 所。`);
  } else if ((result.added ?? 0) > 0) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 新增${result.added}所${name}牌照，支付${Math.round(result.totalCost)}${result.paidCurrency === 'coupon' ? '粮劵' : '粮食'}。`);
  } else {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${name}牌照数量保持 ${result.totalApproved} 所（无变化）。`);
  }

  render();
}

function setStudentsDownToVillage(target) {
  if ((state.population.secondaryGraduates ?? 0) < 100) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 学子下乡未解锁（需要二级毕业生>=100）。`);
    render();
    return;
  }

  const safeTarget = Math.max(0, Math.floor(Number(target ?? 0)));
  getEducation().studentsDownToVillage = safeTarget;
  state.yearLog.unshift(`Year ${state.calendar.year}: 学子下乡人数设置为 ${safeTarget}。`);
  render();
}

function settleEducationYear() {
  ensureLedgerState();
  const edu = processEducationYear(state.world);
  const gdpPerCapita = Math.max(1, edu.gdpPerCapita);

  const commercialTuition =
    (edu.commercialPrimaryEnrolled + edu.commercialSecondaryEnrolled) *
    gdpPerCapita * 0.15;
  const classes = getClasses();
  classes.merchantIncomePool = (classes.merchantIncomePool ?? 0) + commercialTuition;

  const govEnrolled =
    Math.max(0, (edu.primaryEnrolled ?? 0) - (edu.commercialPrimaryEnrolled ?? 0)) +
    Math.max(0, (edu.secondaryEnrolled ?? 0) - (edu.commercialSecondaryEnrolled ?? 0)) +
    (edu.higherEnrolled ?? 0);
  const govCost = govEnrolled * gdpPerCapita * 0.2;

  const monetary = getMonetary();

  if (state.world.grainCouponsUnlocked) {
    const fromCoupon = Math.min(monetary.couponTreasury ?? 0, govCost);
    monetary.couponTreasury = (monetary.couponTreasury ?? 0) - fromCoupon;
    const remaining = govCost - fromCoupon;
    state.agriculture.grainTreasury = Math.max(0, (state.agriculture.grainTreasury ?? 0) - remaining);
  } else {
    state.agriculture.grainTreasury = Math.max(0, (state.agriculture.grainTreasury ?? 0) - govCost);
  }
  state.ledger.educationCost += Math.max(0, Number(govCost ?? 0));

  const downStudents = Math.max(0, Math.floor(Number(getEducation().studentsDownToVillage ?? 0)));
  const downCost = downStudents * gdpPerCapita * 1.5;
  if (state.world.grainCouponsUnlocked) {
    const fromCoupon = Math.min(monetary.couponTreasury ?? 0, downCost);
    monetary.couponTreasury = (monetary.couponTreasury ?? 0) - fromCoupon;
    const remaining = downCost - fromCoupon;
    state.agriculture.grainTreasury = Math.max(0, (state.agriculture.grainTreasury ?? 0) - remaining);
  } else {
    state.agriculture.grainTreasury = Math.max(0, (state.agriculture.grainTreasury ?? 0) - downCost);
  }
  state.ledger.educationCost += Math.max(0, Number(downCost ?? 0));
  classes.farmerIncomePool = (classes.farmerIncomePool ?? 0) + downCost;

  return { commercialTuition, govCost, downCost, edu };
}

function applyMoneylenderApproval(target) {
  const result = approveMoneylenderLicenses(state.world, target);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 钱庄许可失败 - ${result.reason}`);
    render();
    return;
  }

  if (result.removed) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 下调钱庄牌照数量至 ${result.totalApproved} 家。`);
  } else if ((result.added ?? 0) > 0) {
    state.yearLog.unshift(
      `Year ${state.calendar.year}: 新增${result.added}家钱庄牌照，支付${Math.round(result.totalCost)}${result.paidCurrency === 'coupon' ? '粮劵' : '粮食'}。`
    );
  } else {
    state.yearLog.unshift(`Year ${state.calendar.year}: 钱庄牌照数量保持 ${result.totalApproved} 家（无变化）。`);
  }

  render();
}

function borrowFromMoneylenderPool(amount) {
  const result = borrowGovernmentDebt(state.world, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 政府借贷失败 - ${result.reason}`);
    render();
    return;
  }

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 政府从钱庄借入 ${Math.round(result.amount)}${result.currency === 'coupon' ? '粮劵' : '粮食'}，当前债务 ${Math.round(result.totalDebt)}。`
  );
  render();
}

function syncGovernmentInstitutionSettings() {
  const fiscal = getFiscal();
  const institutions = getInstitutions();
  institutions.seniorOfficialCount = Math.max(0, Math.floor(Number(institutions.seniorOfficialCount ?? 0)));
  institutions.midOfficialCount = Math.max(0, Math.floor(Number(institutions.midOfficialCount ?? 0)));
  institutions.juniorOfficialCount = Math.max(0, Math.floor(Number(institutions.juniorOfficialCount ?? 0)));
  state.population.sanitationWorkerCount = Math.max(0, Math.floor(Number(state.population.sanitationWorkerCount ?? 0)));
  state.population.cleaningWorkerCount = Math.max(0, Math.floor(Number(state.population.cleaningWorkerCount ?? 0)));

  fiscal.seniorOfficialWage = Math.max(0, Number(fiscal.seniorOfficialWage ?? 0));
  fiscal.midOfficialWage = Math.max(0, Number(fiscal.midOfficialWage ?? 0));
  fiscal.juniorOfficialWage = Math.max(0, Number(fiscal.juniorOfficialWage ?? 0));
  fiscal.professionalWage = Math.max(0, Number(fiscal.professionalWage ?? 0));
  fiscal.sanitationWorkerWage = Math.max(0, Number(fiscal.sanitationWorkerWage ?? 0));
  fiscal.cleaningWorkerWage = Math.max(0, Number(fiscal.cleaningWorkerWage ?? 0));
}

function syncPoliceInstitutionSettings() {
  const fiscal = getFiscal();
  state.world.policeOfficerCount = Math.max(0, Math.floor(Number(state.world.policeOfficerCount ?? 0)));
  fiscal.officerWage = Math.max(0, Number(fiscal.officerWage ?? 0));

  const adminTalent = Math.max(0, Number(state.population.adminTalent ?? 0));
  state.world.adminTalentDeployedPolice = Math.min(adminTalent, state.world.policeOfficerCount);
  const mandatoryDeployed =
    Number(getEducation().adminTalentDeployedGov ?? 0) +
    Number(state.world.adminTalentDeployedPolice ?? 0) +
    Number(state.world.adminTalentDeployedCourt ?? 0) +
    Number(state.world.adminTalentDeployedTax ?? 0);
  const currentDeployed = Math.max(0, Number(state.population.adminTalentDeployed ?? 0));
  state.population.adminTalentDeployed = Math.max(0, Math.min(adminTalent, Math.max(currentDeployed, mandatoryDeployed)));
}

function syncHealthInstitutionSettings() {
  const fiscal = getFiscal();
  state.world.healthOfficerCount = Math.max(0, Math.floor(Number(state.world.healthOfficerCount ?? 0)));
  fiscal.healthOfficerWage = Math.max(0, Number(fiscal.healthOfficerWage ?? 0));

  const adminTalent = Math.max(0, Number(state.population.adminTalent ?? 0));
  state.world.adminTalentDeployedHealth = Math.min(adminTalent, state.world.healthOfficerCount);

  const mandatoryDeployed =
    Number(getEducation().adminTalentDeployedGov ?? 0) +
    Number(state.world.adminTalentDeployedPolice ?? 0) +
    Number(state.world.adminTalentDeployedHealth ?? 0) +
    Number(state.world.adminTalentDeployedCourt ?? 0) +
    Number(state.world.adminTalentDeployedTax ?? 0);
  const currentDeployed = Math.max(0, Number(state.population.adminTalentDeployed ?? 0));
  state.population.adminTalentDeployed = Math.max(0, Math.min(adminTalent, Math.max(currentDeployed, mandatoryDeployed)));
}

function syncCourtTaxInstitutionSettings() {
  const fiscal = getFiscal();
  const monetary = getMonetary();
  state.world.judgeCount = Math.max(0, Math.floor(Number(state.world.judgeCount ?? 0)));
  state.world.taxOfficerCount = Math.max(0, Math.floor(Number(state.world.taxOfficerCount ?? 0)));
  state.world.techTalentDeployedTax = Math.max(0, Math.floor(Number(state.world.techTalentDeployedTax ?? 0)));
  fiscal.judgeWage = Math.max(0, Number(fiscal.judgeWage ?? 0));
  fiscal.taxOfficerWage = Math.max(0, Number(fiscal.taxOfficerWage ?? 0));
  fiscal.commerceTaxRate = Math.max(0, Math.min(0.3, Number(fiscal.commerceTaxRate ?? 0)));
  fiscal.landTaxRate = Math.max(0, Math.min(5, Number(fiscal.landTaxRate ?? 0)));
  monetary.creditRating = ['A', 'B', 'C', 'D'].includes(String(monetary.creditRating ?? 'B').toUpperCase())
    ? String(monetary.creditRating).toUpperCase()
    : 'B';
}

function syncTradeEngineeringSettings() {
  const fiscal = getFiscal();
  state.world.tradeOfficerCount = Math.max(0, Math.floor(Number(state.world.tradeOfficerCount ?? 0)));
  fiscal.tradeOfficerWage = Math.max(0, Number(fiscal.tradeOfficerWage ?? 0));
  state.world.engineerCount = Math.max(0, Math.floor(Number(state.world.engineerCount ?? 0)));
  fiscal.engineerWage = Math.max(0, Number(fiscal.engineerWage ?? 0));
  fiscal.subsidyRate = Math.max(0, Math.min(0.2, Number(fiscal.subsidyRate ?? 0)));
  state.world.protectLocalCloth = Boolean(state.world.protectLocalCloth);
  state.world.tradeMonopolyGranted = Boolean(state.world.tradeMonopolyGranted);
}

function runEngineeringProject(type) {
  const w = state.world;
  if (!w.engineeringBureauEstablished) {
    state.yearLog.unshift(`Year ${w.year}: 工程项目失败 - 工程局尚未建立。`);
    render();
    return;
  }

  const costMultiplier = Math.max(0.5, Number(w.infrastructureCostMultiplier ?? 1));

  if (type === 'canal') {
    const cost = Math.round(5000000 * costMultiplier);
    const maxCanals = Math.floor(Math.max(0, Number(w.farmlandAreaMu ?? 0)) / 5000);
    if ((w.irrigationCanalCount ?? 0) + (w.pendingIrrigationCanals ?? 0) >= maxCanals) {
      state.yearLog.unshift(`Year ${w.year}: 水渠工程失败 - 已达到可修建上限。`);
      render();
      return;
    }
    if ((w.grainTreasury ?? 0) < cost) {
      state.yearLog.unshift(`Year ${w.year}: 水渠工程失败 - 粮仓不足（需要${cost}粮）。`);
      render();
      return;
    }
    w.grainTreasury -= cost;
    ensureLedgerState();
    state.ledger.constructionCost += Math.max(0, Number(cost ?? 0));
    addConstructionSpending(cost);
    const finishYear = (w.year ?? 1) + 2;
    w.pendingIrrigationCanals = Math.max(0, Number(w.pendingIrrigationCanals ?? 0)) + 1;
    if (!Array.isArray(w.pendingCanals)) w.pendingCanals = [];
    w.pendingCanals.push({
      startYear: w.year ?? 1,
      finishYear,
      muCount: 1000,
    });
    w.farmerIncomePool = Math.max(0, Number(w.farmerIncomePool ?? 0)) + cost * 0.7;
    w.merchantIncomePool = Math.max(0, Number(w.merchantIncomePool ?? 0)) + cost * 0.3;
    state.yearLog.unshift(`Year ${w.year}: 启动水渠工程（耗资${cost}粮，预计Year ${finishYear}完工）。`);
  } else if (type === 'wall') {
    if (w.wallReinforced) {
      state.yearLog.unshift(`Year ${w.year}: 城墙已加固，无需重复建设。`);
      render();
      return;
    }
    const cost = Math.round(8000000 * costMultiplier);
    if ((w.grainTreasury ?? 0) < cost) {
      state.yearLog.unshift(`Year ${w.year}: 城墙加固失败 - 粮仓不足（需要${cost}粮）。`);
      render();
      return;
    }
    w.grainTreasury -= cost;
    ensureLedgerState();
    state.ledger.constructionCost += Math.max(0, Number(cost ?? 0));
    addConstructionSpending(cost);
    w.wallReinforced = true;
    w.defenseRating = Math.max(0, Number(w.defenseRating ?? 0)) + 0.3;
    w.stabilityIndex = Math.min(100, Number(w.stabilityIndex ?? 0) + 5);
    w.farmerIncomePool = Math.max(0, Number(w.farmerIncomePool ?? 0)) + cost * 0.6;
    w.merchantIncomePool = Math.max(0, Number(w.merchantIncomePool ?? 0)) + cost * 0.4;
    state.yearLog.unshift(`Year ${w.year}: 城墙加固完成，防御力大幅提升。`);
  } else if (type === 'granary') {
    const cost = Math.round(2000000 * costMultiplier);
    if ((w.grainTreasury ?? 0) < cost) {
      state.yearLog.unshift(`Year ${w.year}: 粮仓扩建失败 - 粮仓不足（需要${cost}粮）。`);
      render();
      return;
    }
    w.grainTreasury -= cost;
    ensureLedgerState();
    state.ledger.constructionCost += Math.max(0, Number(cost ?? 0));
    addConstructionSpending(cost);
    w.grainStorageExpansions = Math.max(0, Number(w.grainStorageExpansions ?? 0)) + 1;
    w.grainStorageCapacity = Math.max(0, Number(w.grainStorageCapacity ?? 50000000)) + 10000000;
    w.farmerIncomePool = Math.max(0, Number(w.farmerIncomePool ?? 0)) + cost * 0.8;
    w.merchantIncomePool = Math.max(0, Number(w.merchantIncomePool ?? 0)) + cost * 0.2;
    state.yearLog.unshift(`Year ${w.year}: 粮仓扩建完成，容量提升至${Math.round(w.grainStorageCapacity)}。`);
  }

  render();
}

function nextYear() {
  ensureLedgerState();
  resetLedgerForYear();
  state.world.grainRedistributionUsed = false;
  state.world.merchantTaxUsed = false;
  state.world.saltTradeUsed = false;
  state.world.clothTradeUsed = false;
  state.world.officialSaltSaleUsed = false;
  state.world.hempReclamationUsedThisYear = false;
  state.world.mulberryReclamationUsedThisYear = false;

  state.calendar.year += 1;
  clearEventModifiers(state.world);
  ensureGovernmentInstitution(state.world, state.yearLog);
  ensurePoliceInstitution(state.world, state.yearLog);
  ensureHealthBureauInstitution(state.world, state.yearLog);
  ensureCourtInstitution(state.world, state.yearLog);
  ensureTaxBureauInstitution(state.world, state.yearLog);
  ensureTradeBureauInstitution(state.world, state.yearLog);
  ensureEngineeringBureauInstitution(state.world, state.yearLog);
  syncGovernmentInstitutionSettings();
  syncPoliceInstitutionSettings();
  syncHealthInstitutionSettings();
  syncCourtTaxInstitutionSettings();
  syncTradeEngineeringSettings();
  const annualWageBill = calculateGovernmentWageBill(state.world);
  const prePoliceEffects = calculatePoliceEffects(state.world);
  const preHealthEffects = calculateHealthEffects(state.world);
  const preCourtEffects = calculateCourtEffects(state.world);
  const preTaxBureauEffects = calculateTaxBureauEffects(state.world);
  const preTradeBureauEffects = calculateTradeBureauEffects(state.world);
  const preEngineeringEffects = calculateEngineeringBureauEffects(state.world);
  state.world.policeAnnualCost = Math.max(0, Number(prePoliceEffects.annualPoliceCost ?? 0));
  state.world.healthAnnualCost = Math.max(0, Number(preHealthEffects.annualHealthCost ?? 0));
  state.world.courtAnnualCost = Math.max(0, Number(preCourtEffects.annualCourtCost ?? 0));
  state.world.taxBureauAnnualCost = Math.max(0, Number(preTaxBureauEffects.annualTaxCost ?? 0));
  state.world.tradeBureauAnnualCost = Math.max(0, Number(preTradeBureauEffects.annualTradeCost ?? 0));
  state.world.engineeringBureauAnnualCost = Math.max(0, Number(preEngineeringEffects.annualEngineeringCost ?? 0));
  state.world.totalSalaryCost = annualWageBill + state.world.policeAnnualCost + state.world.healthAnnualCost + state.world.courtAnnualCost + state.world.taxBureauAnnualCost + state.world.tradeBureauAnnualCost + state.world.engineeringBureauAnnualCost;

  const schoolSettlement = settleEducationYear();
  const econResult = updateEconomy(state.world);
  const popResult = updatePopulation(state.world);
  const completedTech = updateResearch(state);

  const policeEffects = calculatePoliceEffects(state.world);
  applyPoliceCommerceEffects(state.world, policeEffects);
  applyPoliceLifeQualityEffects(state.world, policeEffects);
  const classes = getClasses();
  classes.stabilityIndex = Math.max(0, Math.min(100, Number(classes.stabilityIndex ?? 0) + Number(policeEffects.stabilityDelta ?? 0)));
  state.world.policeAnnualCost = Math.max(0, Number(policeEffects.annualPoliceCost ?? 0));

  if (policeEffects.message) {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${policeEffects.message}`);
  }
  const healthEffects = calculateHealthEffects(state.world);
  state.world.healthAnnualCost = Math.max(0, Number(healthEffects.annualHealthCost ?? 0));

  if (healthEffects.lowHealth) {
    state.world.consecutiveLowHealthYears = Math.max(0, Number(state.world.consecutiveLowHealthYears ?? 0)) + 1;
  } else {
    state.world.consecutiveLowHealthYears = 0;
    state.world.diseaseOutbreak = false;
  }

  if (healthEffects.message) {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${healthEffects.message}`);
  }

  const courtEffects = calculateCourtEffects(state.world);
  applyCourtCommerceEffects(state.world, courtEffects);
  applyCourtTaxLifeQualityEffects(state.world, courtEffects);
  state.world.courtAnnualCost = Math.max(0, Number(courtEffects.annualCourtCost ?? 0));

  const taxBureauEffects = calculateTaxBureauEffects(state.world);
  const tradeBureauEffects = calculateTradeBureauEffects(state.world);
  const engineeringBureauEffects = calculateEngineeringBureauEffects(state.world);
  applyTradeBureauCommerceEffects(state.world, tradeBureauEffects);
  state.world.taxBureauAnnualCost = Math.max(0, Number(taxBureauEffects.annualTaxCost ?? 0));
  if (courtEffects.merchantSatisfactionDelta) {
    state.world.merchantEventModifier = Number(state.world.merchantEventModifier ?? 0) + Number(courtEffects.merchantSatisfactionDelta);
  }


  const cap = String(courtEffects.creditRatingCap ?? 'D');
  const rank = { A: 4, B: 3, C: 2, D: 1 };
  const monetary = getMonetary();
  if ((rank[monetary.creditRating] ?? 3) > (rank[cap] ?? 1)) {
    monetary.creditRating = cap;
  }

  if (courtEffects.message) state.yearLog.unshift(`Year ${state.calendar.year}: ${courtEffects.message}`);
  if (taxBureauEffects.message) state.yearLog.unshift(`Year ${state.calendar.year}: ${taxBureauEffects.message}`);
  if (tradeBureauEffects.message) state.yearLog.unshift(`Year ${state.calendar.year}: ${tradeBureauEffects.message}`);
  if (engineeringBureauEffects.message) state.yearLog.unshift(`Year ${state.calendar.year}: ${engineeringBureauEffects.message}`);

  if (Array.isArray(state.land.pendingCanals) && state.land.pendingCanals.length > 0) {
    const completedCanals = [];
    const remainingCanals = [];
    for (const canal of state.land.pendingCanals) {
      if ((canal?.finishYear ?? Number.MAX_SAFE_INTEGER) <= (state.calendar.year ?? 0)) {
        completedCanals.push(canal);
      } else {
        remainingCanals.push(canal);
      }
    }

    if (completedCanals.length > 0) {
      const completed = completedCanals.length;
      const addedMu = completedCanals.reduce((sum, c) => sum + Math.max(0, Number(c?.muCount ?? 0)), 0);
      state.land.irrigationCanalCount = Math.max(0, Number(state.land.irrigationCanalCount ?? 0)) + completed;
      state.land.farmlandAreaMu = Math.max(0, Number(state.land.farmlandAreaMu ?? 0)) + addedMu;
      state.agriculture.baseGrainYieldPerMu = Math.max(0, Number(state.agriculture.baseGrainYieldPerMu ?? 500)) + completed * 50;
      state.yearLog.unshift(`Year ${state.calendar.year}: 水渠工程完工${completed}条，新增耕地${Math.round(addedMu)}亩，灌溉能力提升。`);
    }

    state.land.pendingCanals = remainingCanals;
    state.world.pendingIrrigationCanals = remainingCanals.length;
  }

  if ((state.world.consecutiveLowHealthYears ?? 0) >= 3) {
    const currentPop = Math.max(0, Number(state.population.totalPopulation ?? 0));
    const loss = Math.floor(currentPop * 0.05);
    state.population.totalPopulation = Math.max(0, currentPop - loss);
    state.population.children = Math.floor(state.population.totalPopulation * 0.2);
    state.population.elderly = Math.floor(state.population.totalPopulation * 0.2);
    state.population.laborForce = Math.max(0, state.population.totalPopulation - state.population.children - state.population.elderly);
    state.world.diseaseOutbreak = true;
    state.world.consecutiveLowHealthYears = 0;
    state.yearLog.unshift(`Year ${state.calendar.year}: 瘟疫爆发，人口骤减5%（-${loss}）。`);
  }

  if (policeEffects.paperInsufficient) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 警务纸张供应不足，效率下降。`);
  }
  if (policeEffects.talentInsufficient) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 警力人才不足`);
  }

  if ((state.world.landlordSatisfaction ?? 70) < 40) {
    const blockedFarmland = Math.max(0, state.land.pendingFarmlandMu ?? 0);
    if (blockedFarmland > 0) {
      state.land.pendingFarmlandMu = 0;
      state.world.reclaimedThisYear = 0;
    }
  }

  recordEconomySnapshot(econResult, true);

  logYearSummary({
    populationDelta: popResult.populationDelta,
    agriculturalTax: econResult.agriculturalTax,
    grainOutput: econResult.grainOutput,
    potentialGrainOutput: econResult.potentialGrainOutput,
    lostGrainOutput: econResult.lostGrainOutput,
  });

  state.yearLog.unshift(`Year ${state.calendar.year}: 学校结算：在校生 P/S/H = ${schoolSettlement.edu.primaryEnrolled}/${schoolSettlement.edu.secondaryEnrolled}/${schoolSettlement.edu.higherEnrolled}；毕业生 +${schoolSettlement.edu.annualPrimaryGrads}/+${schoolSettlement.edu.annualSecondaryGrads}/+${schoolSettlement.edu.annualHigherGrads}。`);
  state.yearLog.unshift(`Year ${state.calendar.year}: 教育财政：官办教育支出 ${Math.round(schoolSettlement.govCost)}，商办学费流入商人收入池 ${Math.round(schoolSettlement.commercialTuition)}，学子下乡支出 ${Math.round(schoolSettlement.downCost)}。`);
  state.yearLog.unshift(`Year ${state.calendar.year}: 官员薪俸结算：总额 ${Math.round(getFiscal().totalWageBill ?? 0)}（粮/劵按薪资比例支付）。`);
  state.yearLog.unshift(`Year ${state.calendar.year}: 警务支出结算：警员${Math.round(state.world.policeOfficerCount ?? 0)}人，年成本 ${Math.round(state.world.policeAnnualCost ?? 0)}。`);
  state.yearLog.unshift(`Year ${state.calendar.year}: 卫生支出结算：卫生员${Math.round(state.world.healthOfficerCount ?? 0)}人，年成本 ${Math.round(state.world.healthAnnualCost ?? 0)}，健康指数 ${Math.round(state.world.healthIndex ?? 50)}。`);
  state.yearLog.unshift(`Year ${state.calendar.year}: 贸易局支出结算：贸易官${Math.round(state.world.tradeOfficerCount ?? 0)}人，年成本 ${Math.round(state.world.tradeBureauAnnualCost ?? 0)}。`);
  state.yearLog.unshift(`Year ${state.calendar.year}: 工程局支出结算：工程师${Math.round(state.world.engineerCount ?? 0)}人，年成本 ${Math.round(state.world.engineeringBureauAnnualCost ?? 0)}。`);
  state.yearLog.unshift(
    `Year ${state.calendar.year}: GDP构成：农业${Math.round(state.world.agricultureGDP ?? 0)}（粮${Math.round(state.world.grainGDP ?? 0)}/布${Math.round(state.world.clothGDP ?? 0)}），商业${Math.round(state.world.commerceGDP ?? 0)}，建设${Math.round(state.world.constructionGDP ?? 0)}（当年建设支出${Math.round(state.world.constructionSpendingThisYear ?? 0)}），政府${Math.round(state.world.governmentGDP ?? 0)}，总计${Math.round(state.world.gdpEstimate ?? 0)}。`
  );

  if (econResult.creditCrisisTriggered) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮劵信用崩塌，市场发生挤兑`);
  }

  (econResult.behaviorMessages ?? []).forEach((message) => {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${message}`);
  });

  (econResult.diplomacyMessages ?? []).forEach((message) => {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${message}`);
  });

  if (completedTech) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 技术研究完成 - ${completedTech.name}。`);
  }

  calculateLifeQuality(state.world);
  calculateClassSatisfaction(state.world);

  syncMoneylenderCaps(state.world);
  if (canUseMoneylenderSystem(state.world)) {
    const debtResult = processGovernmentDebtYear(state.world);
    const moneylenderResult = finalizeMoneylenderYear(state.world, debtResult.interestDue);

    state.yearLog.unshift(
      `Year ${state.calendar.year}: 债务结算：利息${Math.round(debtResult.interestDue)}（${Math.round(
        debtResult.interestRate * 100
      )}%），偿还${Math.round(debtResult.repaymentPaid)}，剩余债务${Math.round(debtResult.remainingDebt)}。`
    );

    if ((moneylenderResult.openedShops ?? 0) > 0) {
      state.yearLog.unshift(
        `Year ${state.calendar.year}: 民间放贷带动新增商铺 ${moneylenderResult.openedShops} 家。`
      );
    }

    state.yearLog.unshift(
      `Year ${state.calendar.year}: 钱庄经营：放贷池${Math.round(
        getMonetary().lendingPoolSize ?? 0
      )}，民间放贷${Math.round(moneylenderResult.civilianLending)}，税收${Math.round(
        moneylenderResult.moneylenderTax
      )}。`
    );

    (debtResult.penaltyMessages ?? []).forEach((msg) => {
      state.yearLog.unshift(`Year ${state.calendar.year}: ${msg}`);
    });
  }

  finalizeLedgerForYear();
  state.world.constructionSpendingThisYear = 0;

  saveGame(state, { auto: true });
  render();
}

function startResearchById(techId) {
  const result = startResearch(state, techId);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 技术研究启动失败 - ${result.reason}`);
    render();
    return;
  }

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 启动技术研究「${result.tech.name}」，耗费 粮食${result.cost.grain} / 布匹${result.cost.cloth} / 粮劵${result.cost.coupon}，预计${result.tech.researchYears}年完成。`
  );
  render();
}

function openHempLand() {
  const input = document.getElementById('hemp-land-input');
  const mu = Math.floor(Number(input?.value ?? 0));
  const reduction = Math.max(0, Math.min(0.5, Number(state.world.constructionCostReduction ?? 0)));
  const costPerMu = 8 * (1 - reduction);
  const minOrderMu = 100;

  if (mu < minOrderMu) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 开垦麻田失败 - 最低开垦${minOrderMu}亩。`);
    render();
    return;
  }

  const totalCost = Math.round(mu * costPerMu);
  if ((state.agriculture.grainTreasury ?? 0) < totalCost) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 开垦麻田失败 - 粮仓不足（需要${totalCost}粮）。`);
    render();
    return;
  }

  state.agriculture.grainTreasury -= totalCost;
  ensureLedgerState();
  state.ledger.constructionCost += Math.max(0, Number(totalCost ?? 0));
  addConstructionSpending(totalCost);
  state.world.pendingHempLandMu = (state.world.pendingHempLandMu ?? 0) + mu;
  state.world.landDevelopmentFarmerIncomeBoost =
    (state.world.landDevelopmentFarmerIncomeBoost ?? 0) + totalCost;
  state.world.farmerEventModifier = Number(state.world.farmerEventModifier ?? 0) + 2;
  state.world.hempReclamationUsedThisYear = true;

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 下令开垦麻田${mu}亩（花费${totalCost}粮，次年可投入生产，农民事件修正+2）。`
  );
  if (input) input.value = '';
  render();
}

function openMulberryLand() {
  const input = document.getElementById('mulberry-land-input');
  const mu = Math.floor(Number(input?.value ?? 0));
  const reduction = Math.max(0, Math.min(0.5, Number(state.world.constructionCostReduction ?? 0)));
  const costPerMu = 15 * (1 - reduction);
  const minOrderMu = 100;

  if (mu < minOrderMu) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 开垦桑田失败 - 最低开垦${minOrderMu}亩。`);
    render();
    return;
  }

  const totalCost = Math.round(mu * costPerMu);
  if ((state.agriculture.grainTreasury ?? 0) < totalCost) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 开垦桑田失败 - 粮仓不足（需要${totalCost}粮）。`);
    render();
    return;
  }

  const farmerShare = mu * 10;
  const commerceShare = mu * 5;
  const maturesOnYear = (state.calendar.year ?? 1) + 2;
  const pendingProjects = Array.isArray(state.world.pendingMulberryProjects)
    ? state.world.pendingMulberryProjects
    : [];
  pendingProjects.push({ mu, maturesOnYear });

  state.agriculture.grainTreasury -= totalCost;
  ensureLedgerState();
  state.ledger.constructionCost += Math.max(0, Number(totalCost ?? 0));
  addConstructionSpending(totalCost);
  state.world.pendingMulberryProjects = pendingProjects;
  state.world.pendingMulberryLandMu = (state.world.pendingMulberryLandMu ?? 0) + mu;
  state.world.mulberryMaturationYear =
    state.world.mulberryMaturationYear > 0
      ? Math.min(state.world.mulberryMaturationYear, maturesOnYear)
      : maturesOnYear;
  state.world.landDevelopmentFarmerIncomeBoost =
    (state.world.landDevelopmentFarmerIncomeBoost ?? 0) + farmerShare;
  state.world.landDevelopmentCommerceBoost =
    (state.world.landDevelopmentCommerceBoost ?? 0) + commerceShare;
  state.world.farmerEventModifier = Number(state.world.farmerEventModifier ?? 0) + 2;
  state.world.merchantEventModifier = Number(state.world.merchantEventModifier ?? 0) + 1;
  state.world.mulberryReclamationUsedThisYear = true;

  if (state.xikou) {
    state.xikou.attitudeToPlayer = Math.max(
      -100,
      Math.min(100, (state.xikou.attitudeToPlayer ?? 0) + 1)
    );
  }

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 下令开垦桑田${mu}亩（花费${totalCost}粮；农户收益${farmerShare}，商贸收益${commerceShare}；预计Year ${maturesOnYear}首收，农民事件修正+2、商人事件修正+1、溪口态度+1）。`
  );
  if (input) input.value = '';
  render();
}


function buildPublicToilets() {
  const input = document.getElementById('public-toilet-input');
  const count = Math.max(0, Math.floor(Number(input?.value ?? 0)));
  if (count < 1) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 公厕修建失败 - 最少修建1座。`);
    render();
    return;
  }

  const infraMultiplier = Math.max(0.5, Number(state.world.infrastructureCostMultiplier ?? 1));
  const totalCost = Math.round(count * 50000 * infraMultiplier);
  if ((state.agriculture.grainTreasury ?? 0) < totalCost) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 公厕修建失败 - 粮仓不足（需要${totalCost}粮）。`);
    render();
    return;
  }

  state.agriculture.grainTreasury -= totalCost;
  ensureLedgerState();
  state.ledger.constructionCost += Math.max(0, Number(totalCost ?? 0));
  addConstructionSpending(totalCost);
  state.land.publicToilets = Math.max(0, Number(state.land.publicToilets ?? 0)) + count;
  const classes = getClasses();
  classes.farmerIncomePool = Math.max(0, Number(classes.farmerIncomePool ?? 0)) + totalCost * 0.8;
  classes.merchantIncomePool = Math.max(0, Number(classes.merchantIncomePool ?? 0)) + totalCost * 0.2;

  state.yearLog.unshift(`Year ${state.calendar.year}: 新建公共厕所${count}座（花费${totalCost}粮，农户收入池+${Math.round(totalCost*0.8)}，商人收入池+${Math.round(totalCost*0.2)}）。`);
  if (input) input.value = '';
  render();
}

function buildRoads() {
  const input = document.getElementById('road-length-input');
  const li = Math.max(0, Math.floor(Number(input?.value ?? 0)));
  if (li < 1) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 道路修建失败 - 最少修建1里。`);
    render();
    return;
  }

  const infraMultiplier = Math.max(0.5, Number(state.world.infrastructureCostMultiplier ?? 1));
  const totalCost = Math.round(li * 10000 * infraMultiplier);
  if ((state.agriculture.grainTreasury ?? 0) < totalCost) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 道路修建失败 - 粮仓不足（需要${totalCost}粮）。`);
    render();
    return;
  }

  state.agriculture.grainTreasury -= totalCost;
  ensureLedgerState();
  state.ledger.constructionCost += Math.max(0, Number(totalCost ?? 0));
  addConstructionSpending(totalCost);
  state.land.roadLength = Math.max(0, Number(state.land.roadLength ?? 0)) + li;
  const classes = getClasses();
  classes.farmerIncomePool = Math.max(0, Number(classes.farmerIncomePool ?? 0)) + totalCost * 0.7;
  classes.merchantIncomePool = Math.max(0, Number(classes.merchantIncomePool ?? 0)) + totalCost * 0.3;

  state.yearLog.unshift(`Year ${state.calendar.year}: 新建道路${li}里（花费${totalCost}粮，农户收入池+${Math.round(totalCost*0.7)}，商人收入池+${Math.round(totalCost*0.3)}）。`);
  if (input) input.value = '';
  render();
}

function enactPolicy(policyId) {
  const policy = getPolicyById(policyId);
  if (!policy) return;

  const result = applyPolicy(state, policy);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Policy failed - ${result.reason}`);
  }

  render();
}

function useGrainRedistribution() {
  if (state.world.grainRedistributionUsed) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Grain Redistribution already used this year.`);
    render();
    return;
  }

  if (state.agriculture.grainTreasury < 5000) {
    state.yearLog.unshift(
      `Year ${state.calendar.year}: Grain Redistribution failed - requires 5000 grain in treasury.`
    );
    render();
    return;
  }

  const policyEffectMultiplier = state.world.officialPolicyEffectMultiplier ?? 1;
  const stabilityGain = Math.round(15 * policyEffectMultiplier);

  state.agriculture.grainTreasury -= 5000;
  ensureLedgerState();
  state.ledger.subsidyCost += 5000;
  const classes = getClasses();
  classes.stabilityIndex = Math.min(100, (classes.stabilityIndex ?? 0) + stabilityGain);
  state.world.grainRedistributionUsed = true;

  state.yearLog.unshift(
    `Year ${state.calendar.year}: Grain Redistribution enacted (-5000 grain treasury, +${stabilityGain} stability).`
  );

  render();
}

function useMerchantTax() {
  if (state.world.merchantTaxUsed) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Merchant Tax already used this year.`);
    render();
    return;
  }

  if ((state.population.merchantCount ?? 0) <= 0) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Merchant Tax failed - no merchants available.`);
    render();
    return;
  }

  const policyEffectMultiplier = state.world.officialPolicyEffectMultiplier ?? 1;
  const merchantIncomeReduction = 0.2 * policyEffectMultiplier;
  const stabilityGain = Math.round(10 * policyEffectMultiplier);
  const treasuryGainPerMerchant = 200 * policyEffectMultiplier;

  state.world.merchantIncomePerHead =
    (state.world.merchantIncomePerHead ?? 0) * (1 - merchantIncomeReduction);
  state.world.incomeGap =
    (state.world.merchantIncomePerHead ?? 0) - (state.world.farmerIncomePerHead ?? 0);
  const classes = getClasses();
  classes.stabilityIndex = Math.min(100, (classes.stabilityIndex ?? 0) + stabilityGain);

  const taxGain = Math.round((state.population.merchantCount ?? 0) * treasuryGainPerMerchant);
  state.agriculture.grainTreasury += taxGain;
  ensureLedgerState();
  state.ledger.taxRevenue += Math.max(0, Number(taxGain ?? 0));
  state.world.merchantTaxUsed = true;

  state.yearLog.unshift(
    `Year ${state.calendar.year}: Merchant Tax enacted (merchant income -${Math.round(
      merchantIncomeReduction * 100
    )}%, +${stabilityGain} stability, +${taxGain} grain treasury).`
  );

  render();
}


function sendEnvoyToXikou() {
  const xikou = state.xikou;

  if (!xikou) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Send Envoy failed - Xikou data unavailable.`);
    render();
    return;
  }

  if (xikou.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 外交联系已建立，无需重复派遣使者。`);
    render();
    return;
  }

  if ((state.agriculture.grainTreasury ?? 0) < 5000) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 派遣使者失败 - 粮仓不足5000。`);
    render();
    return;
  }

  state.agriculture.grainTreasury -= 5000;
  xikou.diplomaticContact = true;
  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 10));
  xikou.attitudeDeltaThisYear = 10;
  xikou.attitudeFactorsThisYear = ['派遣使者建立外交联系：+10'];

  state.yearLog.unshift(`Year ${state.calendar.year}: 派遣使者前往溪口村，初步建立外交联系`);
  render();
}

function applyDualTradeBonusIfEligible(baseAttitudeGain) {
  const bothTradesUsed = state.world.saltTradeUsed && state.world.clothTradeUsed;
  if (bothTradesUsed) {
    state.xikou.attitudeToPlayer = Math.max(
      -100,
      Math.min(100, (state.xikou.attitudeToPlayer ?? 0) + 3)
    );
    return baseAttitudeGain + 3;
  }

  return baseAttitudeGain;
}

function tradeGrainForSalt() {
  const xikou = state.xikou;
  const grainAmount = Math.floor(Number(document.getElementById('salt-trade-input')?.value ?? 0));

  if (!xikou?.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮盐交易失败 - 尚未建立外交关系。`);
    render();
    return;
  }

  if ((xikou.attitudeToPlayer ?? 0) < -9) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮盐交易失败 - 溪口态度低于中立。`);
    render();
    return;
  }

  if (state.world.saltTradeUsed) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮盐交易失败 - 本年已完成该交易。`);
    render();
    return;
  }

  if (grainAmount < 10000) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮盐交易失败 - 最低交易量为10000粮。`);
    render();
    return;
  }

  if ((state.agriculture.grainTreasury ?? 0) < grainAmount) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮盐交易失败 - 我方粮仓不足。`);
    render();
    return;
  }

  const saltTradeCapByOutput = Math.floor((xikou.saltOutputJin ?? 0) * 0.5);
  const saltAvailable = Math.max(0, Math.min(xikou.saltReserve ?? 0, saltTradeCapByOutput));
  if (saltAvailable <= 0) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮盐交易失败 - 溪口本年无可交易盐。`);
    render();
    return;
  }

  const saltReceived = Math.floor(grainAmount * 0.5);
  if (saltReceived > saltAvailable) {
    state.yearLog.unshift(
      `Year ${state.calendar.year}: 粮盐交易失败 - 超过本年盐交易上限（最多可换${saltAvailable}斤盐）。`
    );
    render();
    return;
  }

  state.agriculture.grainTreasury -= grainAmount;
  state.world.saltReserve = (state.world.saltReserve ?? 0) + saltReceived;
  xikou.grainTreasury = (xikou.grainTreasury ?? 0) + grainAmount;
  xikou.saltReserve = Math.max(0, (xikou.saltReserve ?? 0) - saltReceived);
  state.world.saltTradeUsed = true;

  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 3));
  const totalAttitudeGain = applyDualTradeBonusIfEligible(3);

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 与溪口村完成粮盐交易（支付${grainAmount}粮，获得${saltReceived}斤盐，态度+${totalAttitudeGain}）。`
  );
  render();
}

function tradeGrainForCloth() {
  const xikou = state.xikou;
  const grainAmount = Math.floor(Number(document.getElementById('cloth-trade-input')?.value ?? 0));

  if (!xikou?.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮布交易失败 - 尚未建立外交关系。`);
    render();
    return;
  }

  if ((xikou.attitudeToPlayer ?? 0) < -9) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮布交易失败 - 溪口态度低于中立。`);
    render();
    return;
  }

  if (state.world.clothTradeUsed) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮布交易失败 - 本年已完成该交易。`);
    render();
    return;
  }

  if (grainAmount < 5000) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮布交易失败 - 最低交易量为5000粮。`);
    render();
    return;
  }

  if ((state.agriculture.grainTreasury ?? 0) < grainAmount) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮布交易失败 - 我方粮仓不足。`);
    render();
    return;
  }

  const clothAvailable = Math.max(0, Math.floor(xikou.clothOutput ?? 0));
  if (clothAvailable <= 0) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 粮布交易失败 - 溪口当前无布匹可交易。`);
    render();
    return;
  }

  const clothReceived = Math.floor(grainAmount * 0.3);
  if (clothReceived > clothAvailable) {
    state.yearLog.unshift(
      `Year ${state.calendar.year}: 粮布交易失败 - 超过本年布匹交易上限（最多可换${clothAvailable}斤布）。`
    );
    render();
    return;
  }

  state.agriculture.grainTreasury -= grainAmount;
  state.world.clothReserve = (state.world.clothReserve ?? 0) + clothReceived;
  xikou.grainTreasury = (xikou.grainTreasury ?? 0) + grainAmount;
  state.world.clothTradeUsed = true;

  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 2));
  const totalAttitudeGain = applyDualTradeBonusIfEligible(2);

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 与溪口村完成粮布交易（支付${grainAmount}粮，获得${clothReceived}斤布，态度+${totalAttitudeGain}）。`
  );
  render();
}

function setDungImportQuota() {
  const input = document.getElementById('dung-import-input');
  const quota = Math.max(0, Math.floor(Number(input?.value ?? 0)));
  const xikou = state.xikou;

  if (!xikou?.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 设置蚕沙进口失败 - 尚未建立外交关系。`);
    render();
    return;
  }

  const available = Math.max(0, Math.floor(xikou.silkwormDungAvailable ?? 0));
  if (quota > available) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 设置蚕沙进口失败 - 超过溪口本年可供上限（${available}斤）。`);
    render();
    return;
  }

  state.world.dungImportQuota = quota;
  const currencyLabel = state.world.grainCouponsUnlocked ? '粮劵' : '粮食';
  const estimatedCost = Math.ceil(quota / 100);
  state.yearLog.unshift(
    `Year ${state.calendar.year}: 已设置蚕沙进口配额为${quota}斤（预计成本${estimatedCost}${currencyLabel}，次年结算）。`
  );
  render();
}

function executeOfficialSaltSaleFromInput() {
  const priceInput = document.getElementById('official-salt-price-input');
  const amountInput = document.getElementById('official-salt-amount-input');
  const price = Number(priceInput?.value ?? 0);
  const amount = Number(amountInput?.value ?? 0);

  const result = executeOfficialSaltSale(state.world, price, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 官府放盐失败 - ${result.reason}`);
    render();
    return;
  }

  const priceText = Number(result.price).toFixed(2);
  const releaseRatioPercent = Math.round((result.releaseRatio ?? 0) * 1000) / 10;
  const subsidyText = Math.round(result.subsidyLoss ?? 0);

  state.yearLog.unshift(
    `Year ${state.calendar.year}: 官府放盐 ${result.amount}斤（单价${priceText}，收入${result.revenue}${
      result.currency === 'coupon' ? '粮劵' : '粮食'
    }，补贴成本${subsidyText}，投放占年需求${releaseRatioPercent}%）。`
  );

  if (result.farmerMessage) {
    state.yearLog.unshift(`Year ${state.calendar.year}: ${result.farmerMessage}`);
  }

  render();
}

function issueCouponsFromInput() {
  const input = document.getElementById('coupon-issue-input');
  const amount = Number(input.value);

  const result = issueGrainCoupons(state, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.calendar.year}: Coupon issuance failed - ${result.reason}`);
  } else {
    const denominationSummary = result.denominationBreakdown
      .map((item) => `${item.label}×${item.count}`)
      .join(', ');

    state.yearLog.unshift(
      `Year ${state.calendar.year}: Issued ${result.issueAmount} grain coupons (1:1). Grain treasury +${result.issueAmount}, circulating coupons +${result.issueAmount}. Denominations: ${denominationSummary || 'N/A'}.`
    );
    input.value = '';
  }

  render();
}


function hydrateStateFromSave(savedState) {
  if (!savedState || typeof savedState !== 'object' || !savedState.world || !savedState.research) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 读取存档失败 - 存档格式无效。`);
    return false;
  }

  const fresh = createGameState();

  state.yearLog = Array.isArray(savedState.yearLog) ? [...savedState.yearLog] : [...fresh.yearLog];
  state.economyHistory = Array.isArray(savedState.economyHistory)
    ? [...savedState.economyHistory]
    : [...fresh.economyHistory];

  state.world = {
    ...fresh.world,
    ...savedState.world,
  };

  state.xikou = {
    ...fresh.xikou,
    ...(savedState.xikou ?? {}),
  };

  state.research = {
    ...fresh.research,
    ...(savedState.research ?? {}),
  };

  if (Array.isArray(savedState.research?.queue)) {
    state.research.queue = [...savedState.research.queue];
  }
  if (Array.isArray(savedState.research?.completed)) {
    state.research.completed = [...savedState.research.completed];
  }

  syncGovernmentInstitutionSettings();
  syncPoliceInstitutionSettings();
  syncHealthInstitutionSettings();
  syncCourtTaxInstitutionSettings();
  syncTradeEngineeringSettings();
  calculateGovernmentWageBill(state.world);

  return true;
}

function handleManualSave() {
  saveGame(state);
}

function handleManualLoad() {
  const saved = loadGame();
  if (!saved) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 未发现可读取存档。`);
    render();
    return;
  }

  const loaded = hydrateStateFromSave(saved);
  if (loaded) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 已载入本地存档。`);
  }
  render();
}

function handleExportSave() {
  exportSave(state);
}

async function handleImportSave(file) {
  const imported = await importSave(file);
  if (!imported) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 导入存档失败。`);
    render();
    return;
  }

  const loaded = hydrateStateFromSave(imported);
  if (loaded) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 已导入并载入外部存档。`);
  }
  render();
}

function handleResetGame() {
  resetGame();
}

function bindEvents() {
  document.getElementById('next-year-btn').addEventListener('click', nextYear);
  document.getElementById('issue-coupon-btn').addEventListener('click', issueCouponsFromInput);
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'build-public-toilet-btn') buildPublicToilets();
    if (target.id === 'build-road-btn') buildRoads();
  });

  document.addEventListener('moneylender:approve', (event) => {
    const target = Number(event?.detail?.target ?? 0);
    applyMoneylenderApproval(target);
  });

  document.addEventListener('moneylender:borrow', (event) => {
    const amount = Number(event?.detail?.amount ?? 0);
    borrowFromMoneylenderPool(amount);
  });

  document.addEventListener('school:commercial-license', (event) => {
    const type = event?.detail?.type === 'secondary' ? 'secondary' : 'primary';
    const target = Number(event?.detail?.target ?? 0);
    applyCommercialSchoolLicense(type, target);
  });

  document.addEventListener('school:students-down', (event) => {
    const target = Number(event?.detail?.target ?? 0);
    setStudentsDownToVillage(target);
  });

  document.addEventListener('government:config', (event) => {
    const key = String(event?.detail?.key ?? '');
    const value = Number(event?.detail?.value ?? 0);
    if (!key) return;
    const intKeys = new Set(['seniorOfficialCount', 'midOfficialCount', 'juniorOfficialCount', 'sanitationWorkerCount', 'cleaningWorkerCount', 'adminTalentDeployedGov', 'policeOfficerCount', 'healthOfficerCount', 'judgeCount', 'taxOfficerCount', 'techTalentDeployedTax', 'tradeOfficerCount', 'engineerCount']);
    const fiscal = getFiscal();
    const monetary = getMonetary();
    const wageKeys = new Set(['seniorOfficialWage', 'midOfficialWage', 'juniorOfficialWage', 'professionalWage', 'sanitationWorkerWage', 'cleaningWorkerWage', 'officerWage', 'healthOfficerWage', 'judgeWage', 'taxOfficerWage', 'tradeOfficerWage', 'engineerWage']);
    const boolKeys = new Set(['taxBureauEstablished', 'courtEstablished', 'tradeBureauEstablished', 'engineeringBureauEstablished']);
    const ratingKeys = new Set(['creditRating']);
    const rateKeys = new Set(['commerceTaxRate', 'landTaxRate']);

    if (intKeys.has(key)) state.world[key] = Math.max(0, Math.floor(value));

    if (key === 'sanitationWorkerCount' && (state.land.publicToilets ?? 0) < 1) {
      state.population.sanitationWorkerCount = 0;
      state.yearLog.unshift(`Year ${state.calendar.year}: 尚未建成公共厕所，无法配置挑粪工。`);
    }
    if (key === 'cleaningWorkerCount' && (state.land.roadLength ?? 0) < 1) {
      state.population.cleaningWorkerCount = 0;
      state.yearLog.unshift(`Year ${state.calendar.year}: 尚未建成道路，无法配置清洁工。`);
    }
    if (wageKeys.has(key)) fiscal[key] = Math.max(0, value);
    if (boolKeys.has(key)) state.world[key] = Boolean(event?.detail?.checked);
    if (ratingKeys.has(key)) monetary[key] = String(event?.detail?.valueText ?? 'B').toUpperCase();
    if (rateKeys.has(key)) fiscal[key] = Number(value ?? 0);

    if (key === 'adminTalentDeployedGov') {
      getEducation().adminTalentDeployedGov = Math.max(0, Math.floor(value));
    }

    syncGovernmentInstitutionSettings();
    syncPoliceInstitutionSettings();
    syncHealthInstitutionSettings();
    syncCourtTaxInstitutionSettings();
    syncTradeEngineeringSettings();
    calculateGovernmentWageBill(state.world);
    const policeEffects = calculatePoliceEffects(state.world);
    const healthEffects = calculateHealthEffects(state.world);
    const courtEffects = calculateCourtEffects(state.world);
    const taxBureauEffects = calculateTaxBureauEffects(state.world);
    const tradeBureauEffects = calculateTradeBureauEffects(state.world);
    const engineeringBureauEffects = calculateEngineeringBureauEffects(state.world);
    state.world.policeAnnualCost = Math.max(0, Number(policeEffects.annualPoliceCost ?? 0));
    state.world.healthAnnualCost = Math.max(0, Number(healthEffects.annualHealthCost ?? 0));
    state.world.courtAnnualCost = Math.max(0, Number(courtEffects.annualCourtCost ?? 0));
    state.world.taxBureauAnnualCost = Math.max(0, Number(taxBureauEffects.annualTaxCost ?? 0));
    state.world.tradeBureauAnnualCost = Math.max(0, Number(tradeBureauEffects.annualTradeCost ?? 0));
    state.world.engineeringBureauAnnualCost = Math.max(0, Number(engineeringBureauEffects.annualEngineeringCost ?? 0));
    render();
  });

  document.addEventListener('trade:config', (event) => {
    const key = String(event?.detail?.key ?? '');
    if (!key) return;
    if (key === 'subsidyRate') getFiscal().subsidyRate = Math.max(0, Math.min(0.2, Number(event?.detail?.value ?? 0)));
    if (key === 'protectLocalCloth') state.world.protectLocalCloth = Boolean(event?.detail?.checked);
    if (key === 'tradeMonopolyGranted') state.world.tradeMonopolyGranted = Boolean(event?.detail?.checked);
    render();
  });

  document.addEventListener('engineering:project', (event) => {
    const type = String(event?.detail?.type ?? '');
    runEngineeringProject(type);
  });
}


function render() {
  renderAll(
    state,
    enactPolicy,
    useGrainRedistribution,
    useMerchantTax,
    resolveByEmergencyRecirculation,
    resolveByEmergencyRedemption,
    sendEnvoyToXikou,
    tradeGrainForSalt,
    tradeGrainForCloth,
    setDungImportQuota,
    executeOfficialSaltSaleFromInput,
    openHempLand,
    openMulberryLand,
    startResearchById,
    handleManualSave,
    handleManualLoad,
    handleExportSave,
    handleImportSave,
    handleResetGame
  );
}

function init() {
  const shouldLoadExistingSave = hasSave() && window.confirm('发现存档，是否继续？');
  if (shouldLoadExistingSave) {
    const saved = loadGame();
    if (saved) {
      hydrateStateFromSave(saved);
    }
  }

  initResearch(state);
  ensureGovernmentInstitution(state.world, state.yearLog);
  ensurePoliceInstitution(state.world, state.yearLog);
  ensureHealthBureauInstitution(state.world, state.yearLog);
  ensureCourtInstitution(state.world, state.yearLog);
  ensureTaxBureauInstitution(state.world, state.yearLog);
  ensureTradeBureauInstitution(state.world, state.yearLog);
  ensureEngineeringBureauInstitution(state.world, state.yearLog);
  syncPoliceInstitutionSettings();
  syncHealthInstitutionSettings();
  syncCourtTaxInstitutionSettings();
  syncTradeEngineeringSettings();
  calculateGovernmentWageBill(state.world);
  const policeEffects = calculatePoliceEffects(state.world);
  const healthEffects = calculateHealthEffects(state.world);
  const courtEffects = calculateCourtEffects(state.world);
  const taxBureauEffects = calculateTaxBureauEffects(state.world);
  const tradeBureauEffects = calculateTradeBureauEffects(state.world);
  const engineeringBureauEffects = calculateEngineeringBureauEffects(state.world);
  state.world.policeAnnualCost = Math.max(0, Number(policeEffects.annualPoliceCost ?? 0));
  state.world.healthAnnualCost = Math.max(0, Number(healthEffects.annualHealthCost ?? 0));
  state.world.courtAnnualCost = Math.max(0, Number(courtEffects.annualCourtCost ?? 0));
  state.world.taxBureauAnnualCost = Math.max(0, Number(taxBureauEffects.annualTaxCost ?? 0));
  state.world.tradeBureauAnnualCost = Math.max(0, Number(tradeBureauEffects.annualTradeCost ?? 0));
  state.world.engineeringBureauAnnualCost = Math.max(0, Number(engineeringBureauEffects.annualEngineeringCost ?? 0));
  const econResult = updateEconomy(state.world, { collectTax: false });
  recordEconomySnapshot(econResult, false);
  bindEvents();
  if (shouldLoadExistingSave) {
    state.yearLog.unshift(`Year ${state.calendar.year}: 已从本地存档恢复游戏。`);
  }
  render();
}

init();
