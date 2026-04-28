import { formatNumber, statItem } from './render_world.js';

function getTrendBadge(index) {
  if (index === 0) return '最新';
  if (index < 3) return '近期';
  return '历史';
}

function renderCategoryStats(stats = []) {
  return `
    <div class="tab-grid">
      ${stats.map((item) => statItem(item.label, formatNumber(item.count ?? 0))).join('')}
    </div>
  `;
}

function renderHistory(history = []) {
  if (!history.length) return '<p class="muted">暂无事件记录。</p>';

  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${history.map((entry, index) => `
        <div style="border:1px solid #d6d3d1;border-radius:6px;padding:8px;background:#fff;">
          <div><strong>${entry.title}</strong> <span class="muted">[${entry.categoryLabel}]</span> <span class="muted">${getTrendBadge(index)}</span></div>
          <div class="muted">Year ${formatNumber(entry.year ?? 0)} · ${entry.description ?? ''}</div>
          <div>影响：${entry.effectText ?? '无'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderEventsTab(state) {
  const mount = document.getElementById('events-tab-content');
  if (!mount) return;

  const getter = window?.getEventUiState;
  const uiState = typeof getter === 'function' ? getter() : {};

  mount.innerHTML = `
    <section class="panel">
      <h2>随机事件总览</h2>
      ${statItem('事件库规模', formatNumber(uiState.catalogSize ?? 0))}
      ${statItem('最近事件', uiState.lastEvent ? `${uiState.lastEvent.title}（${uiState.lastEvent.categoryLabel}）` : '无')}
      ${statItem('最近影响', uiState.lastEvent?.effectText ?? '无')}
    </section>

    <section class="panel">
      <h2>分类统计</h2>
      ${renderCategoryStats(uiState.categoryStats ?? [])}
    </section>

    <section class="panel">
      <h2>事件记录（最近20条）</h2>
      ${renderHistory(uiState.history ?? [])}
    </section>
  `;
}
