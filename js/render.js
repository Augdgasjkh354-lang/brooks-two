import { renderCoreStats, renderPolicies, renderSystems, renderYearLog } from './ui/render_world.js';
import { renderTechPanel } from './ui/render_tech.js';

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
  onOpenMulberryLand,
  onStartResearch
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
  renderTechPanel(state, onStartResearch);
  renderYearLog(state);
}
