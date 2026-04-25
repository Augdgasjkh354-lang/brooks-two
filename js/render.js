import {
  renderHeaderStats,
  renderCoreStats,
  renderPolicies,
  renderSystems,
  renderYearLog,
} from './ui/render_world.js';
import { renderEconomyTab, renderAgricultureTab, renderCurrencyTab } from './ui/render_economy.js';
import { renderSocietyTab } from './ui/render_society.js';
import { renderMapTab } from './ui/render_map.js';
import { renderTechPanel } from './ui/render_tech.js';
import { renderBuildingsTab } from './ui/render_buildings.js';

let tabsBound = false;
let saveControlsBound = false;

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

function bindSaveControls(onSave, onLoad, onExport, onImport, onReset) {
  if (saveControlsBound) return;
  saveControlsBound = true;

  document.getElementById('save-btn')?.addEventListener('click', () => onSave?.());
  document.getElementById('load-btn')?.addEventListener('click', () => onLoad?.());
  document.getElementById('export-btn')?.addEventListener('click', () => onExport?.());
  document.getElementById('reset-btn')?.addEventListener('click', () => onReset?.());

  const importInput = document.getElementById('import-input');
  importInput?.addEventListener('change', (event) => {
    const file = event?.target?.files?.[0] ?? null;
    onImport?.(file);
    event.target.value = '';
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
  onStartResearch,
  onConstructBuilding,
  onSetBuildingMethod,
  onSave,
  onLoad,
  onExport,
  onImport,
  onReset
) {
  bindTabNavigation();
  bindSaveControls(onSave, onLoad, onExport, onImport, onReset);

  renderHeaderStats(state);
  renderCoreStats(state);
  renderPolicies(state, onEnactPolicy);
  renderYearLog(state);
  renderEconomyTab(state);
  renderAgricultureTab(state, onOpenHempLand, onOpenMulberryLand);
  renderBuildingsTab(state, onConstructBuilding, onSetBuildingMethod);
  renderSocietyTab(state, onUseGrainRedistribution, onUseMerchantTax, onEmergencyRecirculation, onEmergencyRedemption);
  renderMapTab(state, onSendEnvoy, onTradeSalt, onTradeCloth, onSetDungImportQuota);
  renderSystems(state);
  renderCurrencyTab(state, onOfficialSaltSale);
  renderTechPanel(state, onStartResearch);
}
