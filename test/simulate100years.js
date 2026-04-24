import { createGameState } from '../js/state.js';
import { updateEconomy } from '../js/economy/agriculture.js';
import { updatePopulation } from '../js/society/population.js';
import { clearEventModifiers } from '../js/society/satisfaction.js';
import { issueGrainCoupons } from '../js/economy/currency.js';

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function checkInvariant(violations, year, field, value, condition, reason) {
  if (!condition) {
    violations.push(`Year ${year}: FAIL - ${field} = ${value} (${reason})`);
  }
}

function checkYearInvariants(world, year) {
  const violations = [];

  // Population
  checkInvariant(violations, year, 'world.totalPopulation', world.totalPopulation, world.totalPopulation > 0, 'must be > 0');
  checkInvariant(violations, year, 'world.totalPopulation', world.totalPopulation, world.totalPopulation < 10000000, 'must be < 10000000');
  checkInvariant(violations, year, 'world.laborForce', world.laborForce, world.laborForce >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.children', world.children, world.children >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.elderly', world.elderly, world.elderly >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.totalPopulation', world.totalPopulation, !Number.isNaN(world.totalPopulation), 'must not be NaN');

  // Grain
  checkInvariant(violations, year, 'world.grainTreasury', world.grainTreasury, !Number.isNaN(world.grainTreasury), 'must not be NaN');
  checkInvariant(violations, year, 'world.grainTreasury', world.grainTreasury, world.grainTreasury >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.grainTreasury', world.grainTreasury, world.grainTreasury < 1000000000, 'must be < 1000000000');
  checkInvariant(violations, year, 'world.actualGrainOutput', world.actualGrainOutput, !Number.isNaN(world.actualGrainOutput), 'must not be NaN');
  checkInvariant(violations, year, 'world.actualGrainOutput', world.actualGrainOutput, world.actualGrainOutput >= 0, 'must be >= 0');

  // Currency
  checkInvariant(violations, year, 'world.couponCirculating', world.couponCirculating, !Number.isNaN(world.couponCirculating), 'must not be NaN');
  checkInvariant(violations, year, 'world.couponCirculating', world.couponCirculating, world.couponCirculating >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.lockedGrainReserve', world.lockedGrainReserve, !Number.isNaN(world.lockedGrainReserve), 'must not be NaN');
  checkInvariant(violations, year, 'world.lockedGrainReserve', world.lockedGrainReserve, world.lockedGrainReserve >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.backingRatio', world.backingRatio, world.backingRatio >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.inflationRate', world.inflationRate, !Number.isNaN(world.inflationRate), 'must not be NaN');

  // Satisfaction / Life Quality
  checkInvariant(violations, year, 'world.farmerLifeQuality', world.farmerLifeQuality, world.farmerLifeQuality >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.farmerLifeQuality', world.farmerLifeQuality, world.farmerLifeQuality <= 100, 'must be <= 100');
  checkInvariant(violations, year, 'world.merchantLifeQuality', world.merchantLifeQuality, world.merchantLifeQuality >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.merchantLifeQuality', world.merchantLifeQuality, world.merchantLifeQuality <= 100, 'must be <= 100');
  checkInvariant(violations, year, 'world.officialLifeQuality', world.officialLifeQuality, world.officialLifeQuality <= 100, 'must be <= 100');
  checkInvariant(violations, year, 'world.officialLifeQuality', world.officialLifeQuality, world.officialLifeQuality >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.farmerLifeQuality', world.farmerLifeQuality, !Number.isNaN(world.farmerLifeQuality), 'must not be NaN');
  checkInvariant(violations, year, 'world.merchantLifeQuality', world.merchantLifeQuality, !Number.isNaN(world.merchantLifeQuality), 'must not be NaN');

  // Stability
  checkInvariant(violations, year, 'world.stabilityIndex', world.stabilityIndex, world.stabilityIndex >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.stabilityIndex', world.stabilityIndex, world.stabilityIndex <= 100, 'must be <= 100');
  checkInvariant(violations, year, 'world.stabilityIndex', world.stabilityIndex, !Number.isNaN(world.stabilityIndex), 'must not be NaN');

  // Market prices
  checkInvariant(violations, year, 'world.saltPrice', world.saltPrice, world.saltPrice >= 1.0, 'must be >= 1.0');
  checkInvariant(violations, year, 'world.saltPrice', world.saltPrice, world.saltPrice <= 10.0, 'must be <= 10.0');
  checkInvariant(violations, year, 'world.clothPrice', world.clothPrice, world.clothPrice >= 0.8, 'must be >= 0.8');
  checkInvariant(violations, year, 'world.clothPrice', world.clothPrice, world.clothPrice <= 5.0, 'must be <= 5.0');
  checkInvariant(violations, year, 'world.saltPrice', world.saltPrice, !Number.isNaN(world.saltPrice), 'must not be NaN');
  checkInvariant(violations, year, 'world.clothPrice', world.clothPrice, !Number.isNaN(world.clothPrice), 'must not be NaN');

  // Literacy
  checkInvariant(violations, year, 'world.farmerLiteracy', world.farmerLiteracy, world.farmerLiteracy >= 0, 'must be >= 0');
  checkInvariant(violations, year, 'world.farmerLiteracy', world.farmerLiteracy, world.farmerLiteracy <= 1.0, 'must be <= 1.0');
  checkInvariant(violations, year, 'world.farmerLiteracy', world.farmerLiteracy, !Number.isNaN(world.farmerLiteracy), 'must not be NaN');

  // Extra global numeric sanity
  Object.entries(world).forEach(([key, value]) => {
    if (typeof value === 'number' && !isFiniteNumber(value)) {
      violations.push(`Year ${year}: FAIL - world.${key} = ${value} (must be finite)`);
    }
  });

  if (violations.length === 0) {
    console.log(`Year ${year}: PASS (all invariants met)`);
    return true;
  }

  violations.forEach((line) => console.log(line));
  return false;
}

function advanceOneYear(state) {
  const world = state.world;
  world.year += 1;
  clearEventModifiers(world);
  updateEconomy(world);
  updatePopulation(world);
}

function runScenario(name, setup, years) {
  const state = createGameState();
  const world = state.world;

  if (typeof setup === 'function') {
    setup(state);
  }

  let passedYears = 0;
  console.log(`\n=== ${name} ===`);

  for (let i = 1; i <= years; i += 1) {
    // Scenario-specific timed actions for basic development
    if (name === 'Scenario 2: Basic development') {
      if (i === 1) {
        state.systems.bankBuilt = true;
      }
      if (i === 3) {
        world.clerkCount = Math.max(1, Number(world.clerkCount ?? 0));
      }
      if (i === 5) {
        state.systems.anticounterfeitResearched = true;
      }
      if (i === 7) {
        state.systems.grainCouponsUnlocked = true;
        world.grainCouponsUnlocked = true;
        issueGrainCoupons(state, 1000);
      }
      if (i === 10) {
        world.shopCount = Math.max(0, Number(world.shopCount ?? 0)) + 5;
      }
    }

    advanceOneYear(state);

    if (checkYearInvariants(world, world.year)) {
      passedYears += 1;
    }
  }

  console.log(`Final summary: ${passedYears}/${years} years passed`);
  return { passedYears, totalYears: years };
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
      100
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

  const totalPassed = results.reduce((sum, r) => sum + r.passedYears, 0);
  const totalYears = results.reduce((sum, r) => sum + r.totalYears, 0);
  console.log(`\nOverall summary: ${totalPassed}/${totalYears} years passed`);

  if (totalPassed !== totalYears) {
    process.exitCode = 1;
  }
}

main();
