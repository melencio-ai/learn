const KEY = 'learn-progress-v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeAll(value) { localStorage.setItem(KEY, JSON.stringify(value)); }

export function getProgress(courseSlug) {
  const all = readAll();
  return all[courseSlug] || { completed: [], answers: {}, text: {}, current: null };
}

export function updateProgress(courseSlug, updater) {
  const all = readAll();
  const current = all[courseSlug] || { completed: [], answers: {}, text: {}, current: null };
  all[courseSlug] = updater({ ...current, completed: [...(current.completed || [])], answers: { ...(current.answers || {}) }, text: { ...(current.text || {}) } });
  writeAll(all);
  return all[courseSlug];
}

export function lessonKey(moduleNumber, lessonNumber) { return `${moduleNumber}.${lessonNumber}`; }
export function isComplete(courseSlug, key) { return getProgress(courseSlug).completed.includes(key); }
export function markComplete(courseSlug, key) {
  return updateProgress(courseSlug, (state) => {
    if (!state.completed.includes(key)) state.completed.push(key);
    state.current = key;
    return state;
  });
}
export function saveAnswer(courseSlug, key, value) {
  return updateProgress(courseSlug, (state) => { state.answers[key] = value; return state; });
}
export function saveText(courseSlug, key, value) {
  return updateProgress(courseSlug, (state) => { state.text[key] = value; return state; });
}
export function resetCourse(courseSlug) {
  const all = readAll(); delete all[courseSlug]; writeAll(all);
}
