import { renderCoreStats, renderPolicies, renderSystems, renderYearLog } from './ui/render_world.js';

export function renderAll(
  state,
  onEnactPolicy,
  onUseGrainRedistribution,
  onUseMerchantTax,
  onEmergencyRecirculation,
  onEmergencyRedemption,
  onSendEnvoy,
  onTradeSalt,
  onTradeCloth,
  onSetDungImportQuota,
  onOfficialSaltSale,
  onOpenHempLand,
  onOpenMulberryLand
) {
  renderCoreStats(
    state,
    onUseGrainRedistribution,
    onUseMerchantTax,
    onEmergencyRecirculation,
    onEmergencyRedemption,
    onSendEnvoy,
    onTradeSalt,
    onTradeCloth,
    onSetDungImportQuota,
    onOfficialSaltSale,
    onOpenHempLand,
    onOpenMulberryLand
  );
  renderPolicies(state, onEnactPolicy);
  renderSystems(state);
  renderYearLog(state);
}
