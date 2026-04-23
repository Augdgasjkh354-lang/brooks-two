import { techTree } from '../tech/research.js';

function formatCost(cost = {}) {
  const grain = cost.grain ?? 0;
  const cloth = cost.cloth ?? 0;
  const coupon = cost.coupon ?? 0;
  return `粮食 ${grain} / 布匹 ${cloth} / 粮劵 ${coupon}`;
}

function formatUnlocks(unlocks = []) {
  if (!unlocks.length) return '无';
  return unlocks
    .map((unlock) => {
      if (unlock.type === 'available') {
        return `解锁技术：${unlock.target}`;
      }
      if (unlock.type === 'bonus') {
        return `加成 ${unlock.target} ${unlock.value}`;
      }
      return `系统解锁：${unlock.target}`;
    })
    .join('；');
}

export function renderTechPanel(state, onStartResearch) {
  const mount = document.getElementById('tech-tree-content');
  if (!mount) return;

  const research = state.research ?? {
    currentTech: null,
    yearsRemaining: 0,
    completed: [],
    available: [],
  };

  const availableSet = new Set(research.available ?? []);
  const completedSet = new Set(research.completed ?? []);
  const currentTech = techTree.find((tech) => tech.id === research.currentTech) ?? null;

  const availableTechHtml = techTree
    .filter((tech) => availableSet.has(tech.id) && !completedSet.has(tech.id) && tech.id !== research.currentTech)
    .map((tech) => {
      const disabled = !!research.currentTech;
      return `
        <div class="tech-item">
          <div><strong>${tech.name}</strong>（${tech.category}）</div>
          <div>${tech.description}</div>
          <div>研究时长：${tech.researchYears} 年</div>
          <div>消耗：${formatCost(tech.cost)}</div>
          <div>效果：${formatUnlocks(tech.unlocks)}</div>
          <button class="tech-start-btn" data-tech-id="${tech.id}" ${disabled ? 'disabled' : ''}>研究</button>
        </div>
      `;
    })
    .join('');

  const completedTechHtml = (research.completed ?? [])
    .map((techId) => techTree.find((tech) => tech.id === techId))
    .filter(Boolean)
    .map((tech) => `<li>${tech.name}（${tech.id}）</li>`)
    .join('');

  const currentProgressHtml = currentTech
    ? `<div class="tech-item">
         <div><strong>${currentTech.name}</strong>（${currentTech.category}）</div>
         <div>剩余年数：${research.yearsRemaining}</div>
         <div>总时长：${currentTech.researchYears}</div>
         <progress max="${currentTech.researchYears}" value="${Math.max(
           0,
           currentTech.researchYears - (research.yearsRemaining ?? 0)
         )}"></progress>
       </div>`
    : '<div class="tech-item">当前无研究项目</div>';

  mount.innerHTML = `
    <div class="subpanel">
      <h3>当前研究</h3>
      ${currentProgressHtml}
    </div>
    <div class="subpanel">
      <h3>可研究技术</h3>
      ${availableTechHtml || '<div class="tech-item">暂无可研究技术</div>'}
    </div>
    <div class="subpanel">
      <h3>已完成技术</h3>
      <ul>${completedTechHtml || '<li>暂无</li>'}</ul>
    </div>
    <div class="subpanel">
      <h3>技术加成</h3>
      <div>农业产量加成：${((state.techBonuses?.grainYieldBonus ?? 0) * 100).toFixed(1)}%</div>
      <div>贸易效率加成：${((state.techBonuses?.tradeEfficiency ?? 0) * 100).toFixed(1)}%</div>
      <div>抗旱加成：${((state.techBonuses?.droughtResistance ?? 0) * 100).toFixed(1)}%</div>
      <div>战斗力加成：${((state.techBonuses?.combatPower ?? 0) * 100).toFixed(1)}%</div>
    </div>
  `;

  mount.querySelectorAll('.tech-start-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const techId = btn.getAttribute('data-tech-id');
      if (techId) {
        onStartResearch(techId);
      }
    });
  });
}
