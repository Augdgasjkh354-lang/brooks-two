import {
  renderHeaderStats,
  renderCoreStats,
  renderPolicies,
  renderSystems,
  renderYearLog,
} from './ui/render_world.js';
import { renderEconomyTab, renderAgricultureTab, renderCurrencyTab } from './ui/render_economy.js';
import { renderSocietyTab } from './ui/render_society.js';
import { renderDiplomacyTab } from './ui/render_diplomacy.js';
import { renderTechPanel } from './ui/render_tech.js';

let tabsBound = false;

function bindTabNavigation() {
  if (tabsBound) return;
  tabsBound = true;

  const buttons = Array.from(document.querySelectorAll('.tab-btn'));
  const views = Array.from(document.querySelectorAll('.tab-view'));

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;
      buttons.forEach((btn) => btn.classList.toggle('active', btn === button));
      views.forEach((view) => {
        view.classList.toggle('active', view.dataset.tabContent === target);
      });
    });
  });
}

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
  bindTabNavigation();

  renderHeaderStats(state);
  renderCoreStats(state);
  renderPolicies(state, onEnactPolicy);
  renderYearLog(state);
  renderEconomyTab(state);
  renderAgricultureTab(state, onOpenHempLand, onOpenMulberryLand);
  renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption);
  renderDiplomacyTab(state, onSendEnvoy, onTradeSalt, onTradeCloth, onSetDungImportQuota);
  renderSystems(state);
  renderCurrencyTab(state, onOfficialSaltSale);
  renderTechPanel(state, onStartResearch);
}
