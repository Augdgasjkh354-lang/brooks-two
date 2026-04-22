const RECLAIM_UNIT_MU = 1000;
const RECLAIM_COST_PER_MU = 10000;
const RECLAIM_LABOR_PER_UNIT = 100;

const SHOP_BUILD_COST = 500000;
const SHOP_BUILD_LABOR = 50;

let projectCounter = 0;

function nextProjectId() {
  projectCounter += 1;
  return `p-${projectCounter}`;
}

function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export const constructionConstants = {
  RECLAIM_UNIT_MU,
  RECLAIM_COST_PER_MU,
  RECLAIM_LABOR_PER_UNIT,
  SHOP_BUILD_COST,
  SHOP_BUILD_LABOR,
  SHOP_WORKERS_PER_BUILDING: 2,
  SHOP_GDP_PER_YEAR: 300000,
};

export function startLandReclamation(state, units) {
  const normalizedUnits = clamp(units);
  if (normalizedUnits <= 0) {
    return { success: false, reason: 'Reclamation units must be at least 1.' };
  }

  const areaMu = normalizedUnits * RECLAIM_UNIT_MU;
  const cost = areaMu * RECLAIM_COST_PER_MU;

  if (state.world.grainTreasury < cost) {
    return { success: false, reason: 'Insufficient grain treasury for reclamation.' };
  }

  state.world.grainTreasury -= cost;
  state.economy.pendingConstructionSpending += cost;

  state.construction.projects.push({
    id: nextProjectId(),
    type: 'reclamation',
    areaMu,
    count: 0,
    requiredLaborPerYear: normalizedUnits * RECLAIM_LABOR_PER_UNIT,
    progress: 0,
  });

  return { success: true, areaMu, cost };
}

export function startShopConstruction(state, count) {
  const normalizedCount = clamp(count);
  if (normalizedCount <= 0) {
    return { success: false, reason: 'Shop count must be at least 1.' };
  }

  const totalCost = normalizedCount * SHOP_BUILD_COST;
  if (state.world.grainTreasury < totalCost) {
    return { success: false, reason: 'Insufficient grain treasury for shop construction.' };
  }

  state.world.grainTreasury -= totalCost;
  state.economy.pendingConstructionSpending += totalCost;

  state.construction.projects.push({
    id: nextProjectId(),
    type: 'shop',
    areaMu: 0,
    count: normalizedCount,
    requiredLaborPerYear: normalizedCount * SHOP_BUILD_LABOR,
    progress: 0,
  });

  return { success: true, count: normalizedCount, cost: totalCost };
}

export function processConstructionYear(state, allocatedConstructionLabor) {
  const activeProjects = state.construction.projects;
  const demand = activeProjects.reduce((sum, project) => sum + project.requiredLaborPerYear, 0);
  const progressRatio = demand === 0 ? 0 : Math.min(allocatedConstructionLabor / demand, 1);

  let reclaimedAreaCompleted = 0;
  let shopsCompleted = 0;

  activeProjects.forEach((project) => {
    if (demand === 0) return;
    project.progress += progressRatio;
  });

  const remainingProjects = [];
  activeProjects.forEach((project) => {
    if (project.progress >= 1) {
      if (project.type === 'reclamation') {
        reclaimedAreaCompleted += project.areaMu;
        state.agriculture.reclaimedParcels.push({ areaMu: project.areaMu, age: 0 });
      }

      if (project.type === 'shop') {
        shopsCompleted += project.count;
        state.construction.shopsBuilt += project.count;
      }
    } else {
      remainingProjects.push(project);
    }
  });

  state.construction.projects = remainingProjects;

  return {
    demand,
    allocated: allocatedConstructionLabor,
    progressRatio,
    reclaimedAreaCompleted,
    shopsCompleted,
  };
}
