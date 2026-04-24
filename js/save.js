const SAVE_KEY = 'brooksTwoSave';

let statusTimer = null;

function setSaveStatus(message, tone = 'info', timeoutMs = 1600) {
  const indicator = document.getElementById('autosave-indicator');
  if (!indicator) return;

  indicator.textContent = message;
  indicator.classList.remove('muted');
  indicator.dataset.tone = tone;

  if (statusTimer) {
    window.clearTimeout(statusTimer);
    statusTimer = null;
  }

  if (timeoutMs > 0) {
    statusTimer = window.setTimeout(() => {
      indicator.textContent = '';
      indicator.classList.add('muted');
      indicator.dataset.tone = '';
      statusTimer = null;
    }, timeoutMs);
  }
}

export function saveGame(state, { auto = false } = {}) {
  const serialized = JSON.stringify(state);
  localStorage.setItem(SAVE_KEY, serialized);
  setSaveStatus(auto ? '自动保存 ✓' : '保存成功 ✓', auto ? 'auto' : 'success');
  return true;
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    setSaveStatus('存档损坏，无法读取', 'error', 2600);
    return null;
  }
}

export function exportSave(state) {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'brooks-two-save.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setSaveStatus('导出成功 ✓', 'success');
}

export function importSave(file) {
  return new Promise((resolve) => {
    if (!file) {
      setSaveStatus('未选择导入文件', 'error', 2600);
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ''));
        if (!parsed || typeof parsed !== 'object' || !parsed.world || !parsed.research) {
          setSaveStatus('导入失败：存档格式无效', 'error', 2600);
          resolve(null);
          return;
        }

        localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
        setSaveStatus('导入成功 ✓', 'success');
        resolve(parsed);
      } catch (error) {
        setSaveStatus('导入失败：JSON 解析错误', 'error', 2600);
        resolve(null);
      }
    };

    reader.onerror = () => {
      setSaveStatus('导入失败：读取文件错误', 'error', 2600);
      resolve(null);
    };

    reader.readAsText(file);
  });
}

export function resetGame() {
  const confirmed = window.confirm('确认重置游戏？所有进度将丢失');
  if (!confirmed) return false;
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
  return true;
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export { SAVE_KEY };
