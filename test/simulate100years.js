import { SHOP_GDP_PER_UNIT } from '../js/config/constants.js';
import { createGameState } from '../js/state.js';
import { updateEconomy } from '../js/economy/agriculture.js';
import { issueGrainCoupons, redeemGrainCoupons } from '../js/economy/currency.js';
import { updatePopulation } from '../js/society/population.js';
import { clearEventModifiers } from '../js/society/satisfaction.js';

const NEW_INVARIANTS = {
  couponMint: 'Coupon mint correctness',
  couponBurn: 'Coupon burn/redemption correctness',
  laborConservation: 'Labor conservation',
  commerceOversaturation: 'Commerce oversaturation reduces efficiency',
  grainPriceDirection: 'Grain price direction',
  privateSectorGrain: 'Private sector grain conservation',
};

const ALL_NEW_INVARIANT_NAMES = Object.values(NEW_INVARIANTS);

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNonNegative(value) {
  return Math.max(0, asNumber(value));
}

function closeWithinTolerance(actual, expected, tolerance = 0.01) {
  const scale = Math.max(1, Math.abs(expected));
  return Math.abs(actual - expected) <= scale * tolerance;
}

function createInvariantTracker() {
  const status = {};
  ALL_NEW_INVARIANT_NAMES.forEach((name) => {
    status[name] = true;
  });
  return {
    names: ALL_NEW_INVARIANT_NAMES,
    status,
    violations: [],
  };
}

function logInvariantFail(tracker, invariantName, expected, actual, year) {
  tracker.status[invariantName] = false;
  tracker.violations.push({ invariantName, expected, actual, year });

  console.log(`INVARIANT FAIL - ${invariantName}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual: ${actual}`);
  console.log(`  Year: ${year}`);
}

function checkBasicInvariants(world, year) {
  const failures = [];

  function assert(condition, field, value, reason) {
    if (!condition) {
      failures.push(`Year ${year}: FAIL - ${field} = ${value} (${reason})`);
    }
  }

  assert(world.totalPopulation > 0, 'world.totalPopulation', world.totalPopulation, 'must be > 0');
  assert(world.totalPopulation < 10000000, 'world.totalPopulation', world.totalPopulation, 'must be < 10000000');
  assert(world.laborForce >= 0, 'world.laborForce', world.laborForce, 'must be >= 0');
  assert(world.children >= 0, 'world.children', world.children, 'must be >= 0');
  assert(world.elderly >= 0, 'world.elderly', world.elderly, 'must be >= 0');

  assert(world.grainTreasury >= 0, 'world.grainTreasury', world.grainTreasury, 'must be >= 0');
  assert(world.actualGrainOutput >= 0, 'world.actualGrainOutput', world.actualGrainOutput, 'must be >= 0');

  assert(world.couponCirculating >= 0, 'world.couponCirculating', world.couponCirculating, 'must be >= 0');
  assert(world.lockedGrainReserve >= 0, 'world.lockedGrainReserve', world.lockedGrainReserve, 'must be >= 0');

  assert(world.stabilityIndex >= 0 && world.stabilityIndex <= 100, 'world.stabilityIndex', world.stabilityIndex, 'must be in [0,100]');
  assert(world.saltPrice >= 1 && world.saltPrice <= 10, 'world.saltPrice', world.saltPrice, 'must be in [1,10]');
  assert(world.clothPrice >= 0.8 && world.clothPrice <= 5, 'world.clothPrice', world.clothPrice, 'must be in [0.8,5]');

  Object.entries(world).forEach(([key, value]) => {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      failures.push(`Year ${year}: FAIL - world.${key} = ${value} (must be finite)`);
    }
  });

  if (failures.length > 0) {
    failures.forEach((f) => console.log(f));
    return false;
  }

  console.log(`Year ${year}: PASS (basic checks)`);
  return true;
}

function checkLaborConservation(world, tracker, year) {
  const laborForce = clampNonNegative(world.laborForce);
  const allocatedTotal =
    clampNonNegative(world.farmingLaborAllocated) +
    clampNonNegative(world.commerceLaborAllocated) +
    clampNonNegative(world.hempLaborAllocated) +
    clampNonNegative(world.mulberryLaborAllocated) +
    clampNonNegative(world.institutionWorkers) +
    clampNonNegative(world.merchantCount) +
    clampNonNegative(world.unemployed);

  const notExceed = allocatedTotal <= laborForce + 1e-6;
  const nearFullAccounting = allocatedTotal >= laborForce * 0.99;

  if (!notExceed || !nearFullAccounting) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.laborConservation,
      'allocated labor must be <= laborForce and >= 99% of laborForce',
      `allocated=${allocatedTotal.toFixed(2)}, laborForce=${laborForce.toFixed(2)}`,
      year
    );
  }
}

function checkCommerceOversaturation(world, tracker, year) {
  const operatingShops = clampNonNegative(world.operatingShops);
  const maxMarketDemand = clampNonNegative(world.maxMarketDemand);

  if (operatingShops <= maxMarketDemand || operatingShops <= 0) {
    return;
  }

  const demandEfficiency = maxMarketDemand / operatingShops;
  const gdpPerShop = clampNonNegative(world.commerceGDP) / operatingShops;

  if (!(demandEfficiency < 1 && gdpPerShop < SHOP_GDP_PER_UNIT)) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.commerceOversaturation,
      `when operatingShops(${operatingShops.toFixed(2)}) > maxMarketDemand(${maxMarketDemand.toFixed(2)}), demandEfficiency < 1 and GDP/shop < ${SHOP_GDP_PER_UNIT}`,
      `demandEfficiency=${demandEfficiency.toFixed(4)}, gdpPerShop=${gdpPerShop.toFixed(2)}`,
      year
    );
  }
}

function checkGrainPriceDirection(world, tracker, year, previousWorld) {
  if (!previousWorld) {
    return;
  }

  const previousPrice = clampNonNegative(previousWorld.grainPrice || 1);
  const currentPrice = clampNonNegative(world.grainPrice || 1);
  const totalDemand = clampNonNegative(world.totalGrainDemand);
  const grainSurplus = asNumber(world.grainSurplus);
  const grainTreasury = clampNonNegative(world.grainTreasury);

  const seriousShortage = grainSurplus < -totalDemand * 0.2;
  const largeSurplus = grainTreasury > totalDemand * 3 && totalDemand > 0;

  if (seriousShortage && !(currentPrice > previousPrice)) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.grainPriceDirection,
      'serious shortage must increase grainPrice vs previous year',
      `grainSurplus=${grainSurplus.toFixed(2)}, totalDemand=${totalDemand.toFixed(2)}, previousPrice=${previousPrice.toFixed(4)}, currentPrice=${currentPrice.toFixed(4)}`,
      year
    );
  }

  if (largeSurplus && !(currentPrice <= previousPrice)) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.grainPriceDirection,
      'large surplus must lower or keep grainPrice vs previous year',
      `grainTreasury=${grainTreasury.toFixed(2)}, totalDemand=${totalDemand.toFixed(2)}, previousPrice=${previousPrice.toFixed(4)}, currentPrice=${currentPrice.toFixed(4)}`,
      year
    );
  }
}

function checkPrivateSectorGrainConservation(state, tracker, year, context) {
  const world = state.world;
  const privateSector = state.privateSector;

  if (!privateSector || !context) {
    return;
  }

  const startFarmerGrain = clampNonNegative(context.startFarmerGrain);
  const endFarmerGrain = clampNonNegative(privateSector.farmerGrain);

  const retention = Math.max(0, 1 - clampNonNegative(world.agriculturalTaxRate));
  const grainProduced = clampNonNegative(world.actualGrainOutput) * retention;
  const grainTaxed = clampNonNegative(world.actualGrainOutput) * clampNonNegative(world.agriculturalTaxRate);

  const estimatedFarmerSaltDemand = clampNonNegative(world.farmingLaborAllocated) * 15;
  const estimatedFarmerClothDemand = clampNonNegative(world.farmingLaborAllocated) * 0.3;
  const saltSpending = estimatedFarmerSaltDemand * clampNonNegative(world.saltPrice);
  const clothSpending = estimatedFarmerClothDemand * clampNonNegative(world.clothPrice);

  const couponIssuance = Math.max(0, clampNonNegative(privateSector.farmerCoupons) - clampNonNegative(context.startFarmerCoupons));

  const expectedEndFarmerGrain =
    startFarmerGrain +
    grainProduced -
    grainTaxed -
    saltSpending -
    clothSpending -
    couponIssuance;

  if (!closeWithinTolerance(endFarmerGrain, expectedEndFarmerGrain, 0.01)) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.privateSectorGrain,
      'startFarmerGrain + grainProduced - grainTaxed - saltSpending - clothSpending - couponIssuance ≈ endFarmerGrain (±1%)',
      `start=${startFarmerGrain.toFixed(2)}, produced=${grainProduced.toFixed(2)}, taxed=${grainTaxed.toFixed(2)}, saltSpend=${saltSpending.toFixed(2)}, clothSpend=${clothSpending.toFixed(2)}, issuance=${couponIssuance.toFixed(2)}, expectedEnd=${expectedEndFarmerGrain.toFixed(2)}, actualEnd=${endFarmerGrain.toFixed(2)}`,
      year
    );
  }
}

function checkYearInvariants(state, tracker, context) {
  const world = state.world;
  const year = world.year;

  const basicPass = checkBasicInvariants(world, year);

  checkLaborConservation(world, tracker, year);
  checkCommerceOversaturation(world, tracker, year);
  checkGrainPriceDirection(world, tracker, year, context?.previousWorld ?? null);
  checkPrivateSectorGrainConservation(state, tracker, year, context);

  return basicPass;
}

function snapshotWorldForComparisons(state) {
  const world = state.world;
  const privateSector = state.privateSector;

  return {
    previousWorld: {
      grainPrice: world.grainPrice,
      grainSurplus: world.grainSurplus,
      totalGrainDemand: world.totalGrainDemand,
      grainTreasury: world.grainTreasury,
    },
    startFarmerGrain: privateSector?.farmerGrain ?? 0,
    startFarmerCoupons: privateSector?.farmerCoupons ?? 0,
  };
}

function checkCouponMintInvariant(state, tracker, year, amount, pre, result) {
  if (!result?.success) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.couponMint,
      `issueGrainCoupons(${amount}) must succeed and update all coupon/grain balances correctly`,
      `operation failed: ${result?.reason ?? 'unknown reason'}`,
      year
    );
    return;
  }

  const world = state.world;
  const privateSector = state.privateSector;

  const actual = {
    farmerCouponsDelta: clampNonNegative(privateSector.farmerCoupons) - clampNonNegative(pre.farmerCoupons),
    couponCirculatingDelta: clampNonNegative(world.couponCirculating) - clampNonNegative(pre.couponCirculating),
    couponTotalIssuedDelta: clampNonNegative(world.couponTotalIssued) - clampNonNegative(pre.couponTotalIssued),
    lockedGrainReserveDelta: clampNonNegative(world.lockedGrainReserve) - clampNonNegative(pre.lockedGrainReserve),
    farmerGrainDelta: clampNonNegative(privateSector.farmerGrain) - clampNonNegative(pre.farmerGrain),
    grainTreasuryDelta: clampNonNegative(world.grainTreasury) - clampNonNegative(pre.grainTreasury),
  };

  const ok =
    actual.farmerCouponsDelta === amount &&
    actual.couponCirculatingDelta === amount &&
    actual.couponTotalIssuedDelta === amount &&
    actual.lockedGrainReserveDelta === amount &&
    actual.farmerGrainDelta === -amount &&
    actual.grainTreasuryDelta === 0;

  if (!ok) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.couponMint,
      'farmerCoupons +amount, couponCirculating +amount, couponTotalIssued +amount, lockedGrainReserve +amount, farmerGrain -amount, grainTreasury unchanged',
      JSON.stringify(actual),
      year
    );
  }
}

function checkCouponBurnInvariant(state, tracker, year, amount, pre, result) {
  if (!result?.success) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.couponBurn,
      `redeemGrainCoupons(${amount}) must succeed and update coupon/grain balances correctly`,
      `operation failed: ${result?.reason ?? 'unknown reason'}`,
      year
    );
    return;
  }

  const world = state.world;
  const privateSector = state.privateSector;

  const actual = {
    farmerCouponsDelta: clampNonNegative(privateSector.farmerCoupons) - clampNonNegative(pre.farmerCoupons),
    couponCirculatingDelta: clampNonNegative(world.couponCirculating) - clampNonNegative(pre.couponCirculating),
    lockedGrainReserveDelta: clampNonNegative(world.lockedGrainReserve) - clampNonNegative(pre.lockedGrainReserve),
    farmerGrainDelta: clampNonNegative(privateSector.farmerGrain) - clampNonNegative(pre.farmerGrain),
  };

  const ok =
    actual.farmerCouponsDelta === -amount &&
    actual.couponCirculatingDelta === -amount &&
    actual.lockedGrainReserveDelta === -amount &&
    actual.farmerGrainDelta === amount;

  if (!ok) {
    logInvariantFail(
      tracker,
      NEW_INVARIANTS.couponBurn,
      'farmerCoupons -amount, couponCirculating -amount, lockedGrainReserve -amount, farmerGrain +amount',
      JSON.stringify(actual),
      year
    );
  }
}

function advanceOneYear(state) {
  const world = state.world;
  world.year += 1;
  clearEventModifiers(world);
  updateEconomy(world);
  updatePopulation(world);
}

function runScenario(name, setup, years, onYear = null) {
  const state = createGameState();
  if (typeof setup === 'function') {
    setup(state);
  }

  const tracker = createInvariantTracker();
  let passedYears = 0;

  console.log(`\n=== ${name} ===`);

  for (let i = 1; i <= years; i += 1) {
    if (typeof onYear === 'function') {
      onYear({ i, state, tracker });
    }

    const context = snapshotWorldForComparisons(state);
    advanceOneYear(state);

    if (checkYearInvariants(state, tracker, context)) {
      passedYears += 1;
    }
  }

  console.log(`${passedYears}/${years} years passed basic checks`);
  return {
    passedYears,
    totalYears: years,
    tracker,
  };
}

function main() {
  const results = [];

  results.push(runScenario('Scenario 1: Default (no player actions)', null, 100));

  results.push(
    runScenario(
      'Scenario 2: Basic development',
      (state) => {
        state.systems.bankBuilt = false;
        state.systems.grainCouponsUnlocked = false;
        state.systems.anticounterfeitResearched = false;
      },
      100,
      ({ i, state }) => {
        const world = state.world;
        if (i === 1) state.systems.bankBuilt = true;
        if (i === 3) world.clerkCount = Math.max(1, asNumber(world.clerkCount));
        if (i === 5) state.systems.anticounterfeitResearched = true;
        if (i === 7) {
          state.systems.grainCouponsUnlocked = true;
          world.grainCouponsUnlocked = true;
          issueGrainCoupons(state, 1000);
        }
        if (i === 10) world.shopCount = Math.max(0, asNumber(world.shopCount)) + 5;
      }
    )
  );

  results.push(
    runScenario(
      'Scenario 3: Stress test (extreme values)',
      (state) => {
        state.world.grainTreasury = 0;
        state.world.stabilityIndex = 10;
      },
      20
    )
  );

  results.push(
    runScenario(
      'Scenario 4: Coupon stress test',
      (state) => {
        state.systems.bankBuilt = true;
        state.systems.anticounterfeitResearched = true;
        state.systems.grainCouponsUnlocked = true;
        state.world.grainCouponsUnlocked = true;
      },
      20,
      ({ i, state, tracker }) => {
        const world = state.world;
        const privateSector = state.privateSector;

        if (i === 5) {
          const amount = 100000;
          const pre = {
            farmerCoupons: privateSector.farmerCoupons,
            couponCirculating: world.couponCirculating,
            couponTotalIssued: world.couponTotalIssued,
            lockedGrainReserve: world.lockedGrainReserve,
            farmerGrain: privateSector.farmerGrain,
            grainTreasury: world.grainTreasury,
          };
          const result = issueGrainCoupons(state, amount);
          checkCouponMintInvariant(state, tracker, world.year, amount, pre, result);
        }

        if (i === 6) {
          const amount = 50000;
          const pre = {
            farmerCoupons: privateSector.farmerCoupons,
            couponCirculating: world.couponCirculating,
            lockedGrainReserve: world.lockedGrainReserve,
            farmerGrain: privateSector.farmerGrain,
          };
          const result = redeemGrainCoupons(state, amount);
          checkCouponBurnInvariant(state, tracker, world.year, amount, pre, result);
        }
      }
    )
  );

  results.push(
    runScenario(
      'Scenario 5: Commerce saturation test',
      (state) => {
        const world = state.world;
        world.totalPopulation = 500;
        world.children = 50;
        world.elderly = 50;
        world.laborForce = 400;
        world.farmlandAreaMu = 0;
        world.shopCount = 100;
        world.merchantCount = 100;
      },
      10,
      ({ i, state, tracker }) => {
        if (i !== 1) return;
        const world = state.world;

        world.totalPopulation = 500;
        world.children = 50;
        world.elderly = 50;
        world.laborForce = 400;
        world.farmlandAreaMu = 0;
        world.shopCount = 100;
        world.merchantCount = 100;

        if (world.maxMarketDemand > 0 && world.operatingShops > world.maxMarketDemand) {
          const efficiency = world.maxMarketDemand / world.operatingShops;
          const gdpPerShop = clampNonNegative(world.commerceGDP) / clampNonNegative(world.operatingShops);
          if (!(efficiency < 1 && gdpPerShop < SHOP_GDP_PER_UNIT)) {
            logInvariantFail(
              tracker,
              NEW_INVARIANTS.commerceOversaturation,
              'scenario setup should produce efficiency < 1 and GDP/shop < SHOP_GDP_PER_UNIT',
              `efficiency=${efficiency.toFixed(4)}, gdpPerShop=${gdpPerShop.toFixed(2)}`,
              world.year
            );
          }
        }
      }
    )
  );

  results.push(
    runScenario(
      'Scenario 6: Grain price direction test',
      (state) => {
        state.world.grainTreasury = 0;
      },
      6,
      ({ i, state, tracker }) => {
        const world = state.world;
        if (i === 1 || i === 2 || i === 3) {
          world.grainTreasury = 0;
        }
        if (i === 4) {
          const demand = Math.max(1, clampNonNegative(world.totalGrainDemand));
          world.grainTreasury = demand * 5;
        }
      }
    )
  );

  let totalPassed = 0;
  let totalYears = 0;
  const combinedStatus = {};
  ALL_NEW_INVARIANT_NAMES.forEach((name) => {
    combinedStatus[name] = true;
  });
  let totalViolations = 0;

  results.forEach((result) => {
    totalPassed += result.passedYears;
    totalYears += result.totalYears;

    ALL_NEW_INVARIANT_NAMES.forEach((name) => {
      if (!result.tracker.status[name]) {
        combinedStatus[name] = false;
      }
    });

    totalViolations += result.tracker.violations.length;
  });

  const neverViolatedCount = ALL_NEW_INVARIANT_NAMES.filter((name) => combinedStatus[name]).length;

  console.log('\n=== Final summary ===');
  console.log(`${totalPassed}/${totalYears} years passed basic checks`);
  console.log(`${neverViolatedCount}/6 invariants never violated`);
  console.log(`${totalViolations} specific violations found`);

  if (totalPassed !== totalYears || neverViolatedCount !== 6 || totalViolations > 0) {
    process.exitCode = 1;
  }
}

main();
