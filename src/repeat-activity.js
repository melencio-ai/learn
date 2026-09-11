const STORAGE_KEY = 'learn-progress-v1';

function getLessonContext() {
  const match = window.location.pathname.match(/^\/courses\/([^/]+)\/module\/(\d+)\/lesson\/(\d+)\/?$/);
  if (!match) return null;
  return {
    courseSlug: match[1],
    lessonKey: `${Number(match[2])}.${Number(match[3])}`,
  };
}

function resetCurrentActivity() {
  const context = getLessonContext();
  if (!context) return;

  let allProgress = {};
  try {
    allProgress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    allProgress = {};
  }

  const course = allProgress[context.courseSlug];
  if (course) {
    course.completed = (course.completed || []).filter((key) => key !== context.lessonKey);
    if (course.answers) delete course.answers[context.lessonKey];
    if (course.text) delete course.text[context.lessonKey];
    course.current = context.lessonKey;
    allProgress[context.courseSlug] = course;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  }

  window.location.reload();
}

function addRepeatButton() {
  const panel = document.querySelector('.action-panel--done');
  if (!panel || panel.querySelector('[data-repeat-activity]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button--secondary repeat-activity-button';
  button.dataset.repeatActivity = '';
  button.textContent = '↻ Repeat activity';
  button.addEventListener('click', resetCurrentActivity);
  panel.appendChild(button);
}

const observer = new MutationObserver(addRepeatButton);
observer.observe(document.documentElement, { childList: true, subtree: true });
addRepeatButton();
