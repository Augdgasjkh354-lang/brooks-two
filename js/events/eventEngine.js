import { EVENT_CATEGORIES, EVENT_DEFINITIONS } from './eventDefinitions.js';

const DEFAULT_COOLDOWN_YEARS = 2;

function ensureEventsState(state) {
  if (!state.events || typeof state.events !== 'object') state.events = {};
  if (!Array.isArray(state.events.history)) state.events.history = [];
  if (!state.events.cooldowns || typeof state.events.cooldowns !== 'object') state.events.cooldowns = {};
  if (!state.events.stats || typeof state.events.stats !== 'object') state.events.stats = {};
  if (!state.events.lastEvent) state.events.lastEvent = null;
  if (!Array.isArray(state.events.availableCategories)) {
    state.events.availableCategories = Object.keys(EVENT_CATEGORIES);
  }
}

function weightedPick(items, random = Math.random) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight ?? 0)), 0);
  if (total <= 0) return null;
  let needle = random() * total;
  for (const item of items) {
    needle -= Math.max(0, Number(item.weight ?? 0));
    if (needle <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function addYearLog(state, message) {
  if (!state.logs) state.logs = {};
  if (!Array.isArray(state.logs.yearLog)) state.logs.yearLog = [];
  state.logs.yearLog.unshift(message);
  if (state.logs.yearLog.length > 200) state.logs.yearLog.length = 200;
  state.yearLog = state.logs.yearLog;
}

export function getEligibleEvents(state, year = Number(state?.calendar?.year ?? 1)) {
  ensureEventsState(state);
  return EVENT_DEFINITIONS
    .filter((evt) => {
      if (!evt || typeof evt !== 'object') return false;
      if (typeof evt.condition === 'function' && !evt.condition(state)) return false;
      const cooldownUntil = Number(state.events.cooldowns[evt.id] ?? 0);
      return cooldownUntil < year;
    })
    .map((evt) => ({ ...evt, weight: Math.max(1, Number(evt.baseWeight ?? 1)) }));
}

export function triggerRandomEvent(state, options = {}) {
  ensureEventsState(state);
  const year = Number(state?.calendar?.year ?? 1);
  const eligible = getEligibleEvents(state, year);
  if (!eligible.length) {
    state.events.lastEvent = null;
    return { triggered: false, reason: 'no_eligible_events' };
  }

  const picked = weightedPick(eligible, options.random ?? Math.random);
  if (!picked) {
    state.events.lastEvent = null;
    return { triggered: false, reason: 'weighted_pick_failed' };
  }

  let effectText = '无';
  try {
    effectText = typeof picked.apply === 'function' ? picked.apply(state) ?? '无' : '无';
  } catch (err) {
    effectText = `执行异常: ${err?.message ?? String(err)}`;
  }

  const result = {
    id: picked.id,
    title: picked.title,
    category: picked.category,
    categoryLabel: EVENT_CATEGORIES[picked.category] ?? picked.category,
    description: picked.description,
    effectText,
    year,
  };

  const cooldownYears = Math.max(1, Number(options.cooldownYears ?? DEFAULT_COOLDOWN_YEARS));
  state.events.cooldowns[picked.id] = year + cooldownYears;
  state.events.history.unshift(result);
  if (state.events.history.length > 100) state.events.history.length = 100;
  state.events.lastEvent = result;
  state.events.stats[picked.category] = Math.max(0, Number(state.events.stats[picked.category] ?? 0) + 1);

  addYearLog(state, `Year ${year}: [随机事件/${result.categoryLabel}] ${result.title} - ${result.effectText}`);

  return {
    triggered: true,
    event: result,
  };
}

export function getEventUiState(state) {
  ensureEventsState(state);
  const history = state.events.history.slice(0, 20);
  const categoryStats = Object.keys(EVENT_CATEGORIES).map((key) => ({
    key,
    label: EVENT_CATEGORIES[key],
    count: Number(state.events.stats[key] ?? 0),
  }));

  return {
    categories: EVENT_CATEGORIES,
    history,
    lastEvent: state.events.lastEvent,
    categoryStats,
    catalogSize: EVENT_DEFINITIONS.length,
  };
}
