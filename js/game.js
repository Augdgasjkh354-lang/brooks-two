import { createGameState } from './state.js';
import { updatePopulation, processEducationYear } from './society/population.js';
import { updateEconomy } from './economy/agriculture.js';
import { issueGrainCoupons, borrowGovernmentDebt, processGovernmentDebtYear } from './economy/currency.js';
import { executeOfficialSaltSale } from './economy/market.js';
import { approveMoneylenderLicenses, finalizeMoneylenderYear, syncMoneylenderCaps, canUseMoneylenderSystem, approveCommercialSchoolLicenses, applyPoliceCommerceEffects } from './economy/commerce.js';
import { applyPolicy } from './unlocks.js';
import { policies } from './policies.js';
import { renderAll } from './render.js';
import { initResearch, startResearch, updateResearch } from './tech/research.js';
import { ensureGovernmentInstitution, ensurePoliceInstitution, calculateGovernmentWageBill, calculatePoliceEffects } from './society/stability.js';
import { applyPoliceLifeQualityEffects } from './society/satisfaction.js';

const state = createGameState();

function getPolicyById(policyId) {
  return policies.find((policy) => policy.id === policyId);
}

function recordEconomySnapshot(econResult, taxCollected) {
  state.economyHistory.unshift({
    year: state.world.year,
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
  const utilization = Math.round(state.world.landUtilizationPercent);

  state.yearLog.unshift(
    `Year ${state.world.year}: Population continued to ${populationDirection}, land utilization reached ${utilization}%, grain output was ${grainOutput}/${potentialGrainOutput} (lost ${lostGrainOutput}), grain treasury ${treasuryDirection} by ${agriculturalTax}, salt import ${state.world.actualSaltImport ?? 0}, salt consumed ${state.world.saltConsumed ?? 0}, shortfall ${Math.round((state.world.saltShortfallRatio ?? 0) * 100)}%.`
  );
}

function updateCreditCrisisResolutionState() {
  const circulating = Math.max(0, state.world.couponCirculating ?? 0);
  if (circulating <= 0) {
    state.world.couponCirculating = 0;
    state.world.backingRatio = 1;
    state.world.creditCrisis = false;
    return true;
  }

  state.world.backingRatio = Math.max(0, (state.world.grainTreasury ?? 0) / circulating);
  if (state.world.backingRatio >= 0.6) {
    state.world.creditCrisis = false;
    return true;
  }

  return false;
}

function resolveByEmergencyRecirculation() {
  if (!state.world.creditCrisis) {
    state.yearLog.unshift(`Year ${state.world.year}: No active credit crisis to resolve.`);
    render();
    return;
  }

  if (state.world.creditCrisisResolved) {
    state.yearLog.unshift(`Year ${state.world.year}: Credit crisis action already used this crisis.`);
    render();
    return;
  }

  if ((state.world.couponTreasury ?? 0) < 10000) {
    state.yearLog.unshift(`Year ${state.world.year}: 紧急回笼 failed - requires 10000 coupon treasury.`);
    render();
    return;
  }

  state.world.couponTreasury -= 10000;
  state.world.couponCirculating = Math.max(0, (state.world.couponCirculating ?? 0) - 10000);
  state.world.creditCrisisResolved = true;

  const resolved = updateCreditCrisisResolutionState();

  state.yearLog.unshift(
    `Year ${state.world.year}: 执行紧急回笼（-10000 coupon treasury, -10000 circulating coupons）${
      resolved ? '，危机已缓解。' : '，危机仍在持续。'
    }`
  );

  render();
}

function resolveByEmergencyRedemption() {
  if (!state.world.creditCrisis) {
    state.yearLog.unshift(`Year ${state.world.year}: No active credit crisis to resolve.`);
    render();
    return;
  }

  if (state.world.creditCrisisResolved) {
    state.yearLog.unshift(`Year ${state.world.year}: Credit crisis action already used this crisis.`);
    render();
    return;
  }

  if ((state.world.grainTreasury ?? 0) < 20000) {
    state.yearLog.unshift(`Year ${state.world.year}: 紧急赎回 failed - requires 20000 grain treasury.`);
    render();
    return;
  }

  state.world.grainTreasury -= 20000;
  state.world.couponCirculating = Math.max(0, (state.world.couponCirculating ?? 0) - 20000);
  state.world.creditCrisisResolved = true;

  const resolved = updateCreditCrisisResolutionState();

  state.yearLog.unshift(
    `Year ${state.world.year}: 执行紧急赎回（-20000 grain treasury, -20000 circulating coupons）${
      resolved ? '，危机已缓解。' : '，危机仍在持续。'
    }`
  );

  render();
}




function applyCommercialSchoolLicense(type, target) {
  const result = approveCommercialSchoolLicenses(state.world, type, target);
  const name = type === 'primary' ? '商办蒙学' : '商办私塾';
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: ${name}牌照设置失败 - ${result.reason}`);
    render();
    return;
  }

  if (result.removed) {
    state.yearLog.unshift(`Year ${state.world.year}: ${name}牌照下调至 ${result.totalApproved} 所。`);
  } else if ((result.added ?? 0) > 0) {
    state.yearLog.unshift(`Year ${state.world.year}: 新增${result.added}所${name}牌照，支付${Math.round(result.totalCost)}${result.paidCurrency === 'coupon' ? '粮劵' : '粮食'}。`);
  } else {
    state.yearLog.unshift(`Year ${state.world.year}: ${name}牌照数量保持 ${result.totalApproved} 所（无变化）。`);
  }

  render();
}

function setStudentsDownToVillage(target) {
  if ((state.world.secondaryGraduates ?? 0) < 100) {
    state.yearLog.unshift(`Year ${state.world.year}: 学子下乡未解锁（需要二级毕业生>=100）。`);
    render();
    return;
  }

  const safeTarget = Math.max(0, Math.floor(Number(target ?? 0)));
  state.world.studentsDownToVillage = safeTarget;
  state.yearLog.unshift(`Year ${state.world.year}: 学子下乡人数设置为 ${safeTarget}。`);
  render();
}

function settleEducationYear() {
  const edu = processEducationYear(state.world);
  const gdpPerCapita = Math.max(1, edu.gdpPerCapita);

  const commercialTuition =
    (edu.commercialPrimaryEnrolled + edu.commercialSecondaryEnrolled) *
    gdpPerCapita * 0.15;
  state.world.merchantIncomePool = (state.world.merchantIncomePool ?? 0) + commercialTuition;

  const govEnrolled =
    Math.max(0, (edu.primaryEnrolled ?? 0) - (edu.commercialPrimaryEnrolled ?? 0)) +
    Math.max(0, (edu.secondaryEnrolled ?? 0) - (edu.commercialSecondaryEnrolled ?? 0)) +
    (edu.higherEnrolled ?? 0);
  const govCost = govEnrolled * gdpPerCapita * 0.2;

  if (state.world.grainCouponsUnlocked) {
    const fromCoupon = Math.min(state.world.couponTreasury ?? 0, govCost);
    state.world.couponTreasury = (state.world.couponTreasury ?? 0) - fromCoupon;
    const remaining = govCost - fromCoupon;
    state.world.grainTreasury = Math.max(0, (state.world.grainTreasury ?? 0) - remaining);
  } else {
    state.world.grainTreasury = Math.max(0, (state.world.grainTreasury ?? 0) - govCost);
  }

  const downStudents = Math.max(0, Math.floor(Number(state.world.studentsDownToVillage ?? 0)));
  const downCost = downStudents * gdpPerCapita * 1.5;
  if (state.world.grainCouponsUnlocked) {
    const fromCoupon = Math.min(state.world.couponTreasury ?? 0, downCost);
    state.world.couponTreasury = (state.world.couponTreasury ?? 0) - fromCoupon;
    const remaining = downCost - fromCoupon;
    state.world.grainTreasury = Math.max(0, (state.world.grainTreasury ?? 0) - remaining);
  } else {
    state.world.grainTreasury = Math.max(0, (state.world.grainTreasury ?? 0) - downCost);
  }
  state.world.farmerIncomePool = (state.world.farmerIncomePool ?? 0) + downCost;

  return { commercialTuition, govCost, downCost, edu };
}

function applyMoneylenderApproval(target) {
  const result = approveMoneylenderLicenses(state.world, target);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: 钱庄许可失败 - ${result.reason}`);
    render();
    return;
  }

  if (result.removed) {
    state.yearLog.unshift(`Year ${state.world.year}: 下调钱庄牌照数量至 ${result.totalApproved} 家。`);
  } else if ((result.added ?? 0) > 0) {
    state.yearLog.unshift(
      `Year ${state.world.year}: 新增${result.added}家钱庄牌照，支付${Math.round(result.totalCost)}${result.paidCurrency === 'coupon' ? '粮劵' : '粮食'}。`
    );
  } else {
    state.yearLog.unshift(`Year ${state.world.year}: 钱庄牌照数量保持 ${result.totalApproved} 家（无变化）。`);
  }

  render();
}

function borrowFromMoneylenderPool(amount) {
  const result = borrowGovernmentDebt(state.world, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: 政府借贷失败 - ${result.reason}`);
    render();
    return;
  }

  state.yearLog.unshift(
    `Year ${state.world.year}: 政府从钱庄借入 ${Math.round(result.amount)}${result.currency === 'coupon' ? '粮劵' : '粮食'}，当前债务 ${Math.round(result.totalDebt)}。`
  );
  render();
}

function syncGovernmentInstitutionSettings() {
  state.world.seniorOfficialCount = Math.max(0, Math.floor(Number(state.world.seniorOfficialCount ?? 0)));
  state.world.midOfficialCount = Math.max(0, Math.floor(Number(state.world.midOfficialCount ?? 0)));
  state.world.juniorOfficialCount = Math.max(0, Math.floor(Number(state.world.juniorOfficialCount ?? 0)));
  state.world.sanitationWorkerCount = Math.max(0, Math.floor(Number(state.world.sanitationWorkerCount ?? 0)));
  state.world.cleaningWorkerCount = Math.max(0, Math.floor(Number(state.world.cleaningWorkerCount ?? 0)));

  state.world.seniorOfficialWage = Math.max(0, Number(state.world.seniorOfficialWage ?? 0));
  state.world.midOfficialWage = Math.max(0, Number(state.world.midOfficialWage ?? 0));
  state.world.juniorOfficialWage = Math.max(0, Number(state.world.juniorOfficialWage ?? 0));
  state.world.professionalWage = Math.max(0, Number(state.world.professionalWage ?? 0));
  state.world.sanitationWorkerWage = Math.max(0, Number(state.world.sanitationWorkerWage ?? 0));
  state.world.cleaningWorkerWage = Math.max(0, Number(state.world.cleaningWorkerWage ?? 0));
}

function syncPoliceInstitutionSettings() {
  state.world.policeOfficerCount = Math.max(0, Math.floor(Number(state.world.policeOfficerCount ?? 0)));
  state.world.officerWage = Math.max(0, Number(state.world.officerWage ?? 0));

  const adminTalent = Math.max(0, Number(state.world.adminTalent ?? 0));
  state.world.adminTalentDeployedPolice = Math.min(adminTalent, state.world.policeOfficerCount);
  const mandatoryDeployed = Number(state.world.adminTalentDeployedGov ?? 0) + Number(state.world.adminTalentDeployedPolice ?? 0);
  const currentDeployed = Math.max(0, Number(state.world.adminTalentDeployed ?? 0));
  state.world.adminTalentDeployed = Math.max(0, Math.min(adminTalent, Math.max(currentDeployed, mandatoryDeployed)));
}

function nextYear() {
  state.world.grainRedistributionUsed = false;
  state.world.merchantTaxUsed = false;
  state.world.saltTradeUsed = false;
  state.world.clothTradeUsed = false;
  state.world.officialSaltSaleUsed = false;
  state.world.hempReclamationUsedThisYear = false;
  state.world.mulberryReclamationUsedThisYear = false;

  state.world.year += 1;
  ensureGovernmentInstitution(state.world, state.yearLog);
  ensurePoliceInstitution(state.world, state.yearLog);
  syncGovernmentInstitutionSettings();
  syncPoliceInstitutionSettings();
  const annualWageBill = calculateGovernmentWageBill(state.world);
  const prePoliceEffects = calculatePoliceEffects(state.world);
  state.world.policeAnnualCost = Math.max(0, Number(prePoliceEffects.annualPoliceCost ?? 0));
  state.world.totalSalaryCost = annualWageBill + state.world.policeAnnualCost;

  const schoolSettlement = settleEducationYear();
  const popResult = updatePopulation(state.world);
  const econResult = updateEconomy(state.world);
  const completedTech = updateResearch(state);

  const policeEffects = calculatePoliceEffects(state.world);
  applyPoliceCommerceEffects(state.world, policeEffects);
  applyPoliceLifeQualityEffects(state.world, policeEffects);
  state.world.stabilityIndex = Math.max(0, Math.min(100, Number(state.world.stabilityIndex ?? 0) + Number(policeEffects.stabilityDelta ?? 0)));
  state.world.policeAnnualCost = Math.max(0, Number(policeEffects.annualPoliceCost ?? 0));

  if (policeEffects.message) {
    state.yearLog.unshift(`Year ${state.world.year}: ${policeEffects.message}`);
  }
  if (policeEffects.paperInsufficient) {
    state.yearLog.unshift(`Year ${state.world.year}: 警务纸张供应不足，效率下降。`);
  }
  if (policeEffects.talentInsufficient) {
    state.yearLog.unshift(`Year ${state.world.year}: 警力人才不足`);
  }

  if ((state.world.landlordSatisfaction ?? 70) < 40) {
    const blockedFarmland = Math.max(0, state.world.pendingFarmlandMu ?? 0);
    if (blockedFarmland > 0) {
      state.world.pendingFarmlandMu = 0;
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

  state.yearLog.unshift(`Year ${state.world.year}: 学校结算：在校生 P/S/H = ${schoolSettlement.edu.primaryEnrolled}/${schoolSettlement.edu.secondaryEnrolled}/${schoolSettlement.edu.higherEnrolled}；毕业生 +${schoolSettlement.edu.annualPrimaryGrads}/+${schoolSettlement.edu.annualSecondaryGrads}/+${schoolSettlement.edu.annualHigherGrads}。`);
  state.yearLog.unshift(`Year ${state.world.year}: 教育财政：官办教育支出 ${Math.round(schoolSettlement.govCost)}，商办学费流入商人收入池 ${Math.round(schoolSettlement.commercialTuition)}，学子下乡支出 ${Math.round(schoolSettlement.downCost)}。`);
  state.yearLog.unshift(`Year ${state.world.year}: 官员薪俸结算：总额 ${Math.round(state.world.totalWageBill ?? 0)}（粮/劵按薪资比例支付）。`);
  state.yearLog.unshift(`Year ${state.world.year}: 警务支出结算：警员${Math.round(state.world.policeOfficerCount ?? 0)}人，年成本 ${Math.round(state.world.policeAnnualCost ?? 0)}。`);

  if (econResult.creditCrisisTriggered) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮劵信用崩塌，市场发生挤兑`);
  }

  (econResult.behaviorMessages ?? []).forEach((message) => {
    state.yearLog.unshift(`Year ${state.world.year}: ${message}`);
  });

  (econResult.diplomacyMessages ?? []).forEach((message) => {
    state.yearLog.unshift(`Year ${state.world.year}: ${message}`);
  });

  if (completedTech) {
    state.yearLog.unshift(`Year ${state.world.year}: 技术研究完成 - ${completedTech.name}。`);
  }

  syncMoneylenderCaps(state.world);
  if (canUseMoneylenderSystem(state.world)) {
    const debtResult = processGovernmentDebtYear(state.world);
    const moneylenderResult = finalizeMoneylenderYear(state.world, debtResult.interestDue);

    state.yearLog.unshift(
      `Year ${state.world.year}: 债务结算：利息${Math.round(debtResult.interestDue)}（${Math.round(
        debtResult.interestRate * 100
      )}%），偿还${Math.round(debtResult.repaymentPaid)}，剩余债务${Math.round(debtResult.remainingDebt)}。`
    );

    if ((moneylenderResult.openedShops ?? 0) > 0) {
      state.yearLog.unshift(
        `Year ${state.world.year}: 民间放贷带动新增商铺 ${moneylenderResult.openedShops} 家。`
      );
    }

    state.yearLog.unshift(
      `Year ${state.world.year}: 钱庄经营：放贷池${Math.round(
        state.world.lendingPoolSize ?? 0
      )}，民间放贷${Math.round(moneylenderResult.civilianLending)}，税收${Math.round(
        moneylenderResult.moneylenderTax
      )}。`
    );

    (debtResult.penaltyMessages ?? []).forEach((msg) => {
      state.yearLog.unshift(`Year ${state.world.year}: ${msg}`);
    });
  }

  render();
}

function startResearchById(techId) {
  const result = startResearch(state, techId);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: 技术研究启动失败 - ${result.reason}`);
    render();
    return;
  }

  state.yearLog.unshift(
    `Year ${state.world.year}: 启动技术研究「${result.tech.name}」，耗费 粮食${result.cost.grain} / 布匹${result.cost.cloth} / 粮劵${result.cost.coupon}，预计${result.tech.researchYears}年完成。`
  );
  render();
}

function openHempLand() {
  const input = document.getElementById('hemp-land-input');
  const mu = Math.floor(Number(input?.value ?? 0));
  const costPerMu = 8;
  const minOrderMu = 100;

  if (mu < minOrderMu) {
    state.yearLog.unshift(`Year ${state.world.year}: 开垦麻田失败 - 最低开垦${minOrderMu}亩。`);
    render();
    return;
  }

  const totalCost = mu * costPerMu;
  if ((state.world.grainTreasury ?? 0) < totalCost) {
    state.yearLog.unshift(`Year ${state.world.year}: 开垦麻田失败 - 粮仓不足（需要${totalCost}粮）。`);
    render();
    return;
  }

  state.world.grainTreasury -= totalCost;
  state.world.pendingHempLandMu = (state.world.pendingHempLandMu ?? 0) + mu;
  state.world.landDevelopmentFarmerIncomeBoost =
    (state.world.landDevelopmentFarmerIncomeBoost ?? 0) + totalCost;
  state.world.farmerSatisfaction = Math.min(100, (state.world.farmerSatisfaction ?? 70) + 2);
  state.world.hempReclamationUsedThisYear = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: 下令开垦麻田${mu}亩（花费${totalCost}粮，次年可投入生产，农民满意度+2）。`
  );
  if (input) input.value = '';
  render();
}

function openMulberryLand() {
  const input = document.getElementById('mulberry-land-input');
  const mu = Math.floor(Number(input?.value ?? 0));
  const costPerMu = 15;
  const minOrderMu = 100;

  if (mu < minOrderMu) {
    state.yearLog.unshift(`Year ${state.world.year}: 开垦桑田失败 - 最低开垦${minOrderMu}亩。`);
    render();
    return;
  }

  const totalCost = mu * costPerMu;
  if ((state.world.grainTreasury ?? 0) < totalCost) {
    state.yearLog.unshift(`Year ${state.world.year}: 开垦桑田失败 - 粮仓不足（需要${totalCost}粮）。`);
    render();
    return;
  }

  const farmerShare = mu * 10;
  const commerceShare = mu * 5;
  const maturesOnYear = (state.world.year ?? 1) + 2;
  const pendingProjects = Array.isArray(state.world.pendingMulberryProjects)
    ? state.world.pendingMulberryProjects
    : [];
  pendingProjects.push({ mu, maturesOnYear });

  state.world.grainTreasury -= totalCost;
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
  state.world.farmerSatisfaction = Math.min(100, (state.world.farmerSatisfaction ?? 70) + 2);
  state.world.merchantSatisfaction = Math.min(100, (state.world.merchantSatisfaction ?? 70) + 1);
  state.world.mulberryReclamationUsedThisYear = true;

  if (state.xikou) {
    state.xikou.attitudeToPlayer = Math.max(
      -100,
      Math.min(100, (state.xikou.attitudeToPlayer ?? 0) + 1)
    );
  }

  state.yearLog.unshift(
    `Year ${state.world.year}: 下令开垦桑田${mu}亩（花费${totalCost}粮；农户收益${farmerShare}，商贸收益${commerceShare}；预计Year ${maturesOnYear}首收，农民满意度+2、商人满意度+1、溪口态度+1）。`
  );
  if (input) input.value = '';
  render();
}

function enactPolicy(policyId) {
  const policy = getPolicyById(policyId);
  if (!policy) return;

  const result = applyPolicy(state, policy);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Policy failed - ${result.reason}`);
  }

  render();
}

function useGrainRedistribution() {
  if (state.world.grainRedistributionUsed) {
    state.yearLog.unshift(`Year ${state.world.year}: Grain Redistribution already used this year.`);
    render();
    return;
  }

  if (state.world.grainTreasury < 5000) {
    state.yearLog.unshift(
      `Year ${state.world.year}: Grain Redistribution failed - requires 5000 grain in treasury.`
    );
    render();
    return;
  }

  const policyEffectMultiplier = state.world.officialPolicyEffectMultiplier ?? 1;
  const stabilityGain = Math.round(15 * policyEffectMultiplier);

  state.world.grainTreasury -= 5000;
  state.world.stabilityIndex = Math.min(100, (state.world.stabilityIndex ?? 0) + stabilityGain);
  state.world.grainRedistributionUsed = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: Grain Redistribution enacted (-5000 grain treasury, +${stabilityGain} stability).`
  );

  render();
}

function useMerchantTax() {
  if (state.world.merchantTaxUsed) {
    state.yearLog.unshift(`Year ${state.world.year}: Merchant Tax already used this year.`);
    render();
    return;
  }

  if ((state.world.merchantCount ?? 0) <= 0) {
    state.yearLog.unshift(`Year ${state.world.year}: Merchant Tax failed - no merchants available.`);
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
  state.world.stabilityIndex = Math.min(100, (state.world.stabilityIndex ?? 0) + stabilityGain);

  const taxGain = Math.round((state.world.merchantCount ?? 0) * treasuryGainPerMerchant);
  state.world.grainTreasury += taxGain;
  state.world.merchantTaxUsed = true;

  state.yearLog.unshift(
    `Year ${state.world.year}: Merchant Tax enacted (merchant income -${Math.round(
      merchantIncomeReduction * 100
    )}%, +${stabilityGain} stability, +${taxGain} grain treasury).`
  );

  render();
}


function sendEnvoyToXikou() {
  const xikou = state.xikou;

  if (!xikou) {
    state.yearLog.unshift(`Year ${state.world.year}: Send Envoy failed - Xikou data unavailable.`);
    render();
    return;
  }

  if (xikou.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.world.year}: 外交联系已建立，无需重复派遣使者。`);
    render();
    return;
  }

  if ((state.world.grainTreasury ?? 0) < 5000) {
    state.yearLog.unshift(`Year ${state.world.year}: 派遣使者失败 - 粮仓不足5000。`);
    render();
    return;
  }

  state.world.grainTreasury -= 5000;
  xikou.diplomaticContact = true;
  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 10));
  xikou.attitudeDeltaThisYear = 10;
  xikou.attitudeFactorsThisYear = ['派遣使者建立外交联系：+10'];

  state.yearLog.unshift(`Year ${state.world.year}: 派遣使者前往溪口村，初步建立外交联系`);
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
    state.yearLog.unshift(`Year ${state.world.year}: 粮盐交易失败 - 尚未建立外交关系。`);
    render();
    return;
  }

  if ((xikou.attitudeToPlayer ?? 0) < -9) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮盐交易失败 - 溪口态度低于中立。`);
    render();
    return;
  }

  if (state.world.saltTradeUsed) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮盐交易失败 - 本年已完成该交易。`);
    render();
    return;
  }

  if (grainAmount < 10000) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮盐交易失败 - 最低交易量为10000粮。`);
    render();
    return;
  }

  if ((state.world.grainTreasury ?? 0) < grainAmount) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮盐交易失败 - 我方粮仓不足。`);
    render();
    return;
  }

  const saltTradeCapByOutput = Math.floor((xikou.saltOutputJin ?? 0) * 0.5);
  const saltAvailable = Math.max(0, Math.min(xikou.saltReserve ?? 0, saltTradeCapByOutput));
  if (saltAvailable <= 0) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮盐交易失败 - 溪口本年无可交易盐。`);
    render();
    return;
  }

  const saltReceived = Math.floor(grainAmount * 0.5);
  if (saltReceived > saltAvailable) {
    state.yearLog.unshift(
      `Year ${state.world.year}: 粮盐交易失败 - 超过本年盐交易上限（最多可换${saltAvailable}斤盐）。`
    );
    render();
    return;
  }

  state.world.grainTreasury -= grainAmount;
  state.world.saltReserve = (state.world.saltReserve ?? 0) + saltReceived;
  xikou.grainTreasury = (xikou.grainTreasury ?? 0) + grainAmount;
  xikou.saltReserve = Math.max(0, (xikou.saltReserve ?? 0) - saltReceived);
  state.world.saltTradeUsed = true;

  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 3));
  const totalAttitudeGain = applyDualTradeBonusIfEligible(3);

  state.yearLog.unshift(
    `Year ${state.world.year}: 与溪口村完成粮盐交易（支付${grainAmount}粮，获得${saltReceived}斤盐，态度+${totalAttitudeGain}）。`
  );
  render();
}

function tradeGrainForCloth() {
  const xikou = state.xikou;
  const grainAmount = Math.floor(Number(document.getElementById('cloth-trade-input')?.value ?? 0));

  if (!xikou?.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮布交易失败 - 尚未建立外交关系。`);
    render();
    return;
  }

  if ((xikou.attitudeToPlayer ?? 0) < -9) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮布交易失败 - 溪口态度低于中立。`);
    render();
    return;
  }

  if (state.world.clothTradeUsed) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮布交易失败 - 本年已完成该交易。`);
    render();
    return;
  }

  if (grainAmount < 5000) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮布交易失败 - 最低交易量为5000粮。`);
    render();
    return;
  }

  if ((state.world.grainTreasury ?? 0) < grainAmount) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮布交易失败 - 我方粮仓不足。`);
    render();
    return;
  }

  const clothAvailable = Math.max(0, Math.floor(xikou.clothOutput ?? 0));
  if (clothAvailable <= 0) {
    state.yearLog.unshift(`Year ${state.world.year}: 粮布交易失败 - 溪口当前无布匹可交易。`);
    render();
    return;
  }

  const clothReceived = Math.floor(grainAmount * 0.3);
  if (clothReceived > clothAvailable) {
    state.yearLog.unshift(
      `Year ${state.world.year}: 粮布交易失败 - 超过本年布匹交易上限（最多可换${clothAvailable}斤布）。`
    );
    render();
    return;
  }

  state.world.grainTreasury -= grainAmount;
  state.world.clothReserve = (state.world.clothReserve ?? 0) + clothReceived;
  xikou.grainTreasury = (xikou.grainTreasury ?? 0) + grainAmount;
  state.world.clothTradeUsed = true;

  xikou.attitudeToPlayer = Math.max(-100, Math.min(100, (xikou.attitudeToPlayer ?? 0) + 2));
  const totalAttitudeGain = applyDualTradeBonusIfEligible(2);

  state.yearLog.unshift(
    `Year ${state.world.year}: 与溪口村完成粮布交易（支付${grainAmount}粮，获得${clothReceived}斤布，态度+${totalAttitudeGain}）。`
  );
  render();
}

function setDungImportQuota() {
  const input = document.getElementById('dung-import-input');
  const quota = Math.max(0, Math.floor(Number(input?.value ?? 0)));
  const xikou = state.xikou;

  if (!xikou?.diplomaticContact) {
    state.yearLog.unshift(`Year ${state.world.year}: 设置蚕沙进口失败 - 尚未建立外交关系。`);
    render();
    return;
  }

  const available = Math.max(0, Math.floor(xikou.silkwormDungAvailable ?? 0));
  if (quota > available) {
    state.yearLog.unshift(`Year ${state.world.year}: 设置蚕沙进口失败 - 超过溪口本年可供上限（${available}斤）。`);
    render();
    return;
  }

  state.world.dungImportQuota = quota;
  const currencyLabel = state.world.grainCouponsUnlocked ? '粮劵' : '粮食';
  const estimatedCost = Math.ceil(quota / 100);
  state.yearLog.unshift(
    `Year ${state.world.year}: 已设置蚕沙进口配额为${quota}斤（预计成本${estimatedCost}${currencyLabel}，次年结算）。`
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
    state.yearLog.unshift(`Year ${state.world.year}: 官府放盐失败 - ${result.reason}`);
    render();
    return;
  }

  const priceText = Number(result.price).toFixed(2);
  const releaseRatioPercent = Math.round((result.releaseRatio ?? 0) * 1000) / 10;
  const subsidyText = Math.round(result.subsidyLoss ?? 0);

  state.yearLog.unshift(
    `Year ${state.world.year}: 官府放盐 ${result.amount}斤（单价${priceText}，收入${result.revenue}${
      result.currency === 'coupon' ? '粮劵' : '粮食'
    }，补贴成本${subsidyText}，投放占年需求${releaseRatioPercent}%）。`
  );

  if (result.farmerMessage) {
    state.yearLog.unshift(`Year ${state.world.year}: ${result.farmerMessage}`);
  }

  render();
}

function issueCouponsFromInput() {
  const input = document.getElementById('coupon-issue-input');
  const amount = Number(input.value);

  const result = issueGrainCoupons(state, amount);
  if (!result.success) {
    state.yearLog.unshift(`Year ${state.world.year}: Coupon issuance failed - ${result.reason}`);
  } else {
    const denominationSummary = result.denominationBreakdown
      .map((item) => `${item.label}×${item.count}`)
      .join(', ');

    state.yearLog.unshift(
      `Year ${state.world.year}: Issued ${result.issueAmount} grain coupons (1:1). Grain treasury +${result.issueAmount}, circulating coupons +${result.issueAmount}. Denominations: ${denominationSummary || 'N/A'}.`
    );
    input.value = '';
  }

  render();
}

function bindEvents() {
  document.getElementById('next-year-btn').addEventListener('click', nextYear);
  document.getElementById('issue-coupon-btn').addEventListener('click', issueCouponsFromInput);

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
    const intKeys = new Set(['seniorOfficialCount', 'midOfficialCount', 'juniorOfficialCount', 'sanitationWorkerCount', 'cleaningWorkerCount', 'adminTalentDeployedGov', 'policeOfficerCount']);
    const wageKeys = new Set(['seniorOfficialWage', 'midOfficialWage', 'juniorOfficialWage', 'professionalWage', 'sanitationWorkerWage', 'cleaningWorkerWage', 'officerWage']);
    const boolKeys = new Set(['taxBureauEstablished', 'courtEstablished']);

    if (intKeys.has(key)) state.world[key] = Math.max(0, Math.floor(value));
    if (wageKeys.has(key)) state.world[key] = Math.max(0, value);
    if (boolKeys.has(key)) state.world[key] = Boolean(event?.detail?.checked);

    if (key === 'adminTalentDeployedGov') {
      state.world.adminTalentDeployedGov = Math.max(0, Math.floor(value));
    }

    syncGovernmentInstitutionSettings();
    syncPoliceInstitutionSettings();
    calculateGovernmentWageBill(state.world);
    const policeEffects = calculatePoliceEffects(state.world);
    state.world.policeAnnualCost = Math.max(0, Number(policeEffects.annualPoliceCost ?? 0));
    render();
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
    startResearchById
  );
}

function init() {
  initResearch(state);
  ensureGovernmentInstitution(state.world, state.yearLog);
  ensurePoliceInstitution(state.world, state.yearLog);
  syncPoliceInstitutionSettings();
  calculateGovernmentWageBill(state.world);
  const policeEffects = calculatePoliceEffects(state.world);
  state.world.policeAnnualCost = Math.max(0, Number(policeEffects.annualPoliceCost ?? 0));
  const econResult = updateEconomy(state.world, { collectTax: false });
  recordEconomySnapshot(econResult, false);
  bindEvents();
  render();
}

init();
