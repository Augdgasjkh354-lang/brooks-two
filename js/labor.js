function clamp(value, min = 0) {
  return Math.max(min, Math.round(value));
}

export function getConstructionLaborDemand(state) {
  return state.construction.projects.reduce((sum, project) => sum + project.requiredLaborPerYear, 0);
}

export function calculateLaborAllocation(state) {
  const totalLabor = state.world.laborForce;
  const commerceDemand = state.construction.shopsBuilt * 2;
  const constructionDemand = getConstructionLaborDemand(state);
  const desiredAgriculture = clamp(state.labor.desiredAgriculture);

  let remainingLabor = totalLabor;

  const commerceLabor = Math.min(remainingLabor, commerceDemand);
  remainingLabor -= commerceLabor;

  const constructionLabor = Math.min(remainingLabor, constructionDemand);
  remainingLabor -= constructionLabor;

  const agricultureLabor = Math.min(remainingLabor, desiredAgriculture);
  remainingLabor -= agricultureLabor;

  const idleLabor = Math.max(remainingLabor, 0);

  state.labor.total = totalLabor;
  state.labor.commerce = commerceLabor;
  state.labor.construction = constructionLabor;
  state.labor.agriculture = agricultureLabor;
  state.labor.idle = idleLabor;

  return {
    totalLabor,
    commerceDemand,
    constructionDemand,
    desiredAgriculture,
    agricultureLabor,
    constructionLabor,
    commerceLabor,
    idleLabor,
  };
}
