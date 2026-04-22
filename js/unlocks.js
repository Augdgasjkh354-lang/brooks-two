export function hasPrerequisites(state, policy) {
  return policy.requires.every((requirement) => state.systems[requirement]);
}

export function applyPolicy(state, policy) {
  if (state.policyHistory.includes(policy.id)) {
    return { success: false, reason: 'Policy already enacted.' };
  }

  if (!hasPrerequisites(state, policy)) {
    return { success: false, reason: 'Prerequisites not met.' };
  }

  policy.apply(state);
  state.policyHistory.push(policy.id);

  return { success: true };
}

export function getUnlockedSystems(state) {
  const systems = ['Agriculture (Base System)'];

  if (state.systems.bankBuilt) systems.push('Bank Institution');
  if (state.systems.bankClerksRecruited) systems.push('Bank Workforce');
  if (state.systems.antiCounterfeitResearched) systems.push('Anti-Counterfeit Bureau');
  if (state.systems.grainCouponsUnlocked) systems.push('Grain Coupon Issuance');

  return systems;
}
