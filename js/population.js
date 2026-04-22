function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export function updatePopulation(world) {
  const total = world.totalPopulation;
  const yearlyGrowthRate = 0.012;

  const nextTotal = clamp(total * (1 + yearlyGrowthRate));
  const nextChildren = clamp(nextTotal * 0.2);
  const nextElderly = clamp(nextTotal * 0.2);
  const nextLaborForce = clamp(nextTotal - nextChildren - nextElderly);

  world.totalPopulation = nextTotal;
  world.children = nextChildren;
  world.elderly = nextElderly;
  world.laborForce = nextLaborForce;

  return {
    populationDelta: nextTotal - total,
  };
}
