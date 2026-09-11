import './styles/app.css';
import { getCourse, loadCourses } from './course-loader.js';
import { courseUrl, initRouter, lessonUrl, moduleUrl, navigate, parseRoute } from './router.js';
import { getProgress, isComplete, lessonKey, markComplete, resetCourse, saveAnswer, saveText } from './progress.js';

const root = document.querySelector('#app');
let cleanup = null;

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function textBlock(value = '') {
  return String(value).split(/\n\n+/).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
}
function shell(content, options = {}) {
  return `<div class="app-shell ${options.compact ? 'app-shell--compact' : ''}">
    <header class="topbar">
      <a class="brand" href="/" data-nav><span class="brand-mark">L</span><span>Learn</span></a>
      <span class="topbar-note">Hands-on HighLevel workshops</span>
    </header>
    <main class="main-content">${content}</main>
  </div>`;
}
function flattenLessons(course) {
  return course.modules.flatMap((module) => module.lessons.map((lesson, index) => ({ module, lesson, lessonNumber: index + 1, key: lessonKey(module.number, index + 1), url: lessonUrl(course.slug, module.number, index + 1) })));
}
function progressPercent(course) {
  const state = getProgress(course.slug);
  return course.lessonCount ? Math.round((state.completed.length / course.lessonCount) * 100) : 0;
}
function firstIncompleteUrl(course) {
  const state = getProgress(course.slug);
  const flat = flattenLessons(course);
  return flat.find((item) => !state.completed.includes(item.key))?.url || flat[0]?.url || courseUrl(course.slug);
}

function renderHome() {
  const courses = loadCourses();
  document.title = 'Learn — HighLevel Workshops';
  root.innerHTML = shell(`
    <section class="hero"><span class="eyebrow">Interactive learning</span><h1>Learn it. Do it. Keep moving.</h1><p>Practical HighLevel training built around real actions, quick checks, and working outcomes.</p></section>
    <section class="catalog">
      <div class="section-heading"><div><span class="eyebrow">Course library</span><h2>Start a workshop</h2></div><span class="section-count">${courses.length} courses</span></div>
      <div class="course-grid">${courses.map((course) => {
        const percent = progressPercent(course);
        return `<a class="course-card" href="${courseUrl(course.slug)}" data-nav>
          <div class="course-card__top"><span class="course-number">${escapeHtml(course.catalogNumber)}</span><span class="course-level">${escapeHtml(course.level || 'Course')}</span></div>
          <div><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.outcome || '')}</p></div>
          <div class="course-card__progress"><span style="width:${percent}%"></span></div>
          <div class="course-card__meta"><span>${course.modules.length} modules</span><span>${course.lessonCount} lessons</span><strong>${percent}%</strong><span class="course-card__arrow">→</span></div>
        </a>`;
      }).join('')}</div>
    </section>`);
}

function renderCourse(route) {
  const course = getCourse(route.courseSlug); if (!course) return renderNotFound();
  document.title = `${course.title} — Learn`;
  const percent = progressPercent(course);
  const modules = course.modules.map((module) => {
    const complete = module.lessons.filter((_, i) => isComplete(course.slug, lessonKey(module.number, i + 1))).length;
    return `<a class="module-row" href="${moduleUrl(course.slug, module.number)}" data-nav>
      <span class="module-index">${String(module.number).padStart(2, '0')}</span>
      <span class="module-copy"><strong>${escapeHtml(module.title)}</strong><small>${complete}/${module.lessons.length} lessons completed</small></span>
      <span class="module-mini-progress"><span style="width:${module.lessons.length ? Math.round(complete/module.lessons.length*100) : 0}%"></span></span><span class="module-arrow">→</span>
    </a>`;
  }).join('');
  root.innerHTML = shell(`
    <div class="breadcrumb"><a href="/" data-nav>Courses</a><span>/</span><span>${escapeHtml(course.catalogNumber)}</span></div>
    <section class="course-hero"><div class="course-hero__copy"><span class="eyebrow">${escapeHtml(course.level || 'Course')}</span><h1>${escapeHtml(course.title)}</h1><p>${escapeHtml(course.outcome || '')}</p>
      <div class="hero-actions"><a class="button button--primary" href="${firstIncompleteUrl(course)}" data-nav>${percent ? 'Continue course' : 'Start course'} <span>→</span></a><span class="course-summary">${course.modules.length} modules · ${course.lessonCount} lessons · ${percent}% complete</span></div>
    </div><div class="course-hero__number">${escapeHtml(course.catalogNumber)}</div></section>
    <section class="module-list"><div class="section-heading"><div><span class="eyebrow">Course outline</span><h2>Modules</h2></div><button class="text-button" data-reset>Reset progress</button></div><div class="module-stack">${modules}</div></section>`, { compact: false });
  root.querySelector('[data-reset]')?.addEventListener('click', () => { if (confirm('Reset your saved progress for this course?')) { resetCourse(course.slug); renderCourse(route); } });
}

function renderModule(route) {
  const course = getCourse(route.courseSlug); const module = course?.modules.find((m) => m.number === route.moduleNumber); if (!course || !module) return renderNotFound();
  document.title = `${module.title} — ${course.title}`;
  const practice = module.practical || module.build;
  root.innerHTML = shell(`
    <div class="breadcrumb"><a href="/" data-nav>Courses</a><span>/</span><a href="${courseUrl(course.slug)}" data-nav>${escapeHtml(course.catalogNumber)}</a><span>/</span><span>Module ${module.number}</span></div>
    <section class="module-hero"><span class="eyebrow">Module ${module.number} of ${course.modules.length}</span><h1>${escapeHtml(module.title)}</h1>${module.objective ? `<p class="module-objective">${escapeHtml(module.objective)}</p>` : ''}${practice ? `<div class="practice-callout"><span>${course.slug === 'marketplace-app-development' ? 'Build milestone' : 'Practical target'}</span><strong>${escapeHtml(practice)}</strong></div>` : ''}</section>
    <section class="lesson-list">${module.lessons.map((lesson, index) => {
      const done = isComplete(course.slug, lessonKey(module.number, index + 1));
      return `<a class="lesson-row ${done ? 'is-complete' : ''}" href="${lessonUrl(course.slug, module.number, index + 1)}" data-nav><span class="lesson-dot">${done ? '✓' : index + 1}</span><span class="lesson-title"><small>${escapeHtml(lesson.type)}</small>${escapeHtml(lesson.title)}</span><span>→</span></a>`;
    }).join('')}</section>`, { compact: true });
}

function renderDiagram(diagram) {
  if (!diagram?.flow?.length) return '';
  return `<div class="flow-diagram" aria-label="Process diagram">${diagram.flow.map((item, index) => `<div class="flow-node"><span>${escapeHtml(item)}</span></div>${index < diagram.flow.length - 1 ? '<div class="flow-arrow" aria-hidden="true">→</div>' : ''}`).join('')}</div>${diagram.caption ? `<p class="diagram-caption">${escapeHtml(diagram.caption)}</p>` : ''}`;
}

function renderAction(course, module, lesson, route, done) {
  const action = lesson.required_action || lesson.quiz;
  if (!action) return '';
  const type = action.type || (lesson.quiz ? 'multiple_choice' : 'confirmation');
  const key = lessonKey(module.number, route.lessonNumber);
  const state = getProgress(course.slug);
  if (done) return `<section class="action-panel action-panel--done"><span class="action-label">Completed</span><h2>Nice. You did the work.</h2><p>You can continue, or repeat the activity before moving on.</p></section>`;
  const instructions = (action.instructions || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  let control = '';
  if (type === 'confirmation') control = `<button class="button button--primary" data-complete>${escapeHtml(action.button || action.label || 'I completed this')}</button>`;
  if (type === 'checklist') control = `<div class="action-checklist">${(action.items || action.instructions || []).map((item, i) => `<label><input type="checkbox" data-check="${i}"><span>${escapeHtml(item)}</span></label>`).join('')}</div><button class="button button--primary" data-complete disabled>${escapeHtml(action.button || 'All done')}</button>`;
  if (type === 'text_input') control = `<label class="field"><span>${escapeHtml(action.prompt || 'Your answer')}</span><input data-text-input value="${escapeHtml(state.text[key] || '')}" placeholder="${escapeHtml(action.placeholder || 'Type your answer…')}"></label><button class="button button--primary" data-complete ${state.text[key]?.trim() ? '' : 'disabled'}>${escapeHtml(action.button || 'Save and continue')}</button>`;
  if (type === 'multiple_choice') control = `<div class="choices">${(action.options || []).map((option, i) => `<button class="choice ${state.answers[key] === i ? 'is-selected' : ''}" data-choice="${i}"><span>${String.fromCharCode(65+i)}</span>${escapeHtml(option)}</button>`).join('')}</div><div class="feedback" data-feedback aria-live="polite"></div>`;
  return `<section class="action-panel"><span class="action-label">Required action</span><h2>${escapeHtml(action.title || 'Now do it')}</h2>${action.description ? `<p>${escapeHtml(action.description)}</p>` : ''}${instructions && type !== 'checklist' ? `<ol class="action-steps">${instructions}</ol>` : ''}${control}${action.help ? `<details class="trouble"><summary>Need help?</summary><p>${escapeHtml(action.help)}</p></details>` : ''}</section>`;
}

function renderBuildTracker(course, currentModule) {
  if (course.slug !== 'marketplace-app-development') return '';
  return `<aside class="build-tracker"><span class="action-label">Your Marketplace App</span>${course.modules.map((m) => `<div class="build-step ${m.number < currentModule.number ? 'is-done' : m.number === currentModule.number ? 'is-current' : ''}"><span>${m.number < currentModule.number ? '✓' : m.number}</span><p><strong>${escapeHtml(m.title)}</strong>${m.build ? `<small>${escapeHtml(m.build)}</small>` : ''}</p></div>`).join('')}</aside>`;
}

function outlineMarkup(course, module, route) {
  return `<div class="drawer-backdrop" data-close-drawer></div><aside class="outline-drawer" aria-label="Course outline"><div class="drawer-head"><div><span class="eyebrow">Course outline</span><strong>${escapeHtml(course.title)}</strong></div><button class="icon-button" data-close-drawer aria-label="Close outline">×</button></div><div class="drawer-body">${course.modules.map((m) => `<section class="drawer-module"><h3>Module ${m.number} · ${escapeHtml(m.title)}</h3>${m.lessons.map((lesson, i) => { const active = m.number === module.number && i + 1 === route.lessonNumber; const done = isComplete(course.slug, lessonKey(m.number, i+1)); return `<a class="drawer-lesson ${active ? 'is-active' : ''}" href="${lessonUrl(course.slug, m.number, i+1)}" data-nav><span>${done ? '✓' : i+1}</span><p>${escapeHtml(lesson.title)}</p></a>`; }).join('')}</section>`).join('')}</div></aside>`;
}

function renderLesson(route) {
  const course = getCourse(route.courseSlug); const module = course?.modules.find((m) => m.number === route.moduleNumber); const lesson = module?.lessons[route.lessonNumber - 1]; if (!course || !module || !lesson) return renderNotFound();
  document.title = `${lesson.title} — ${course.title}`;
  const flat = flattenLessons(course); const currentIndex = flat.findIndex((x) => x.module.number === module.number && x.lessonNumber === route.lessonNumber); const previous = currentIndex > 0 ? flat[currentIndex - 1] : null; const next = currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null;
  const key = lessonKey(module.number, route.lessonNumber); const done = isComplete(course.slug, key); const percent = Math.round((getProgress(course.slug).completed.length / flat.length) * 100); const presenterMode = new URLSearchParams(location.search).get('mode') === 'presenter'; const action = lesson.required_action || lesson.quiz;
  const canContinue = presenterMode || !action || done;
  const bodyClass = lesson.diagram ? 'lesson-body lesson-body--diagram' : 'lesson-body';
  root.innerHTML = `<div class="lesson-shell ${presenterMode ? 'lesson-shell--presenter' : ''}">
    <header class="lesson-topbar"><a class="brand" href="${courseUrl(course.slug)}" data-nav><span class="brand-mark">L</span><span>Learn</span></a><div class="lesson-progress-copy"><span>${escapeHtml(course.title)}</span><strong>${percent}%</strong></div><div class="top-actions"><button class="outline-link" data-outline>Outline</button><a class="mode-switch" href="${location.pathname}${presenterMode ? '' : '?mode=presenter'}">${presenterMode ? 'Participant' : 'Presenter'}</a></div></header>
    <div class="progress-track"><span style="width:${percent}%"></span></div>
    <main class="lesson-stage"><div class="lesson-stage__meta"><span class="eyebrow">Module ${module.number} · Lesson ${route.lessonNumber} · ${escapeHtml(lesson.type)}</span>${presenterMode ? '<span class="mode-badge">Presenter mode</span>' : ''}</div>
      <div class="${bodyClass}"><section class="lesson-copy"><p class="lesson-kicker">${escapeHtml(module.title)}</p><h1>${escapeHtml(lesson.title)}</h1>${lesson.explanation ? `<div class="lesson-explanation">${textBlock(lesson.explanation)}</div>` : ''}${lesson.steps.length ? `<ol class="walkthrough">${lesson.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}${lesson.takeaway ? `<div class="takeaway"><span>Key takeaway</span><p>${escapeHtml(lesson.takeaway)}</p></div>` : ''}${lesson.troubleshooting.length ? `<details class="trouble"><summary>Troubleshooting</summary><ul>${lesson.troubleshooting.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul></details>` : ''}</section>${lesson.diagram ? `<section class="visual-panel">${renderDiagram(lesson.diagram)}</section>` : ''}</div>
      ${renderAction(course, module, lesson, route, done)}${renderBuildTracker(course, module)}
      ${presenterMode ? `<aside class="presenter-notes" data-notes><span class="action-label">Presenter notes</span><p>${escapeHtml(lesson.presenter_notes || 'Explain the concept, show the example, then check that participants are ready before continuing.')}</p>${action ? `<div class="presenter-cue"><strong>Participant action</strong><span>${escapeHtml(action.title || 'Complete the activity')}</span></div>` : ''}</aside>` : ''}
    </main>
    <footer class="lesson-footer">${previous ? `<a class="button button--secondary" href="${previous.url}${presenterMode ? '?mode=presenter' : ''}" data-nav>← <span class="button-label">Previous</span></a>` : '<span></span>'}<span class="lesson-position">${currentIndex+1} / ${flat.length}</span><button class="button button--primary" data-continue ${canContinue ? '' : 'disabled'}>${next ? 'Continue →' : 'Finish course →'}</button></footer>
    <div class="drawer-root" hidden>${outlineMarkup(course, module, route)}</div>
  </div>`;

  const completeAndRefresh = () => { markComplete(course.slug, key); renderLesson(route); };
  root.querySelector('[data-complete]')?.addEventListener('click', completeAndRefresh);
  const checks = [...root.querySelectorAll('[data-check]')];
  checks.forEach((box) => box.addEventListener('change', () => { const btn = root.querySelector('[data-complete]'); if (btn) btn.disabled = !checks.every((x) => x.checked); }));
  const textInput = root.querySelector('[data-text-input]');
  if (textInput) textInput.addEventListener('input', () => { saveText(course.slug, key, textInput.value); const btn = root.querySelector('[data-complete]'); if (btn) btn.disabled = !textInput.value.trim(); });
  root.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
    const selected = Number(button.dataset.choice); saveAnswer(course.slug, key, selected); const feedback = root.querySelector('[data-feedback]'); const correct = Number((action || {}).correct_index);
    root.querySelectorAll('[data-choice]').forEach((b) => b.classList.toggle('is-selected', b === button));
    if (selected === correct) { feedback.innerHTML = `<strong>Correct.</strong> ${escapeHtml(action.correct_feedback || 'You can continue.')}`; feedback.className = 'feedback is-correct'; markComplete(course.slug, key); root.querySelector('[data-continue]').disabled = false; }
    else { feedback.innerHTML = `<strong>Not quite.</strong> ${escapeHtml(action.incorrect_feedback || 'Try again.')}`; feedback.className = 'feedback is-wrong'; }
  }));
  const doContinue = () => { if (root.querySelector('[data-continue]').disabled) return; if (!isComplete(course.slug, key)) markComplete(course.slug, key); navigate(next ? `${next.url}${presenterMode ? '?mode=presenter' : ''}` : courseUrl(course.slug)); };
  root.querySelector('[data-continue]').addEventListener('click', doContinue);
  const drawer = root.querySelector('.drawer-root'); const toggleDrawer = (show) => { drawer.hidden = !show; };
  root.querySelector('[data-outline]').addEventListener('click', () => toggleDrawer(true)); root.querySelectorAll('[data-close-drawer]').forEach((el) => el.addEventListener('click', () => toggleDrawer(false)));
  cleanup = () => document.removeEventListener('keydown', onKey);
  function onKey(event) {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (event.key.toLowerCase() === 'o') return toggleDrawer(drawer.hidden);
    if (event.key.toLowerCase() === 'n' && presenterMode) return root.querySelector('[data-notes]')?.classList.toggle('is-hidden');
    if (event.key === 'ArrowLeft' && previous) return navigate(`${previous.url}${presenterMode ? '?mode=presenter' : ''}`);
    if ((event.key === 'ArrowRight' || event.key === ' ') && !event.repeat) { event.preventDefault(); doContinue(); }
    if (event.key === 'Escape') toggleDrawer(false);
  }
  document.addEventListener('keydown', onKey);
}

function renderNotFound() { document.title = 'Page not found — Learn'; root.innerHTML = shell(`<section class="empty-state"><span class="eyebrow">404</span><h1>That lesson is not here.</h1><p>Return to the course library and choose a workshop.</p><a class="button button--primary" href="/" data-nav>Back to courses</a></section>`, { compact: true }); }
function render() { if (cleanup) { cleanup(); cleanup = null; } window.scrollTo(0,0); try { const route = parseRoute(); if (route.name === 'home') return renderHome(); if (route.name === 'course') return renderCourse(route); if (route.name === 'module') return renderModule(route); if (route.name === 'lesson') return renderLesson(route); return renderNotFound(); } catch (error) { console.error(error); root.innerHTML = shell(`<section class="empty-state"><span class="eyebrow">Course error</span><h1>We could not load the course.</h1><p>Check the YAML content and reload.</p></section>`, {compact:true}); } }
initRouter(render); render();
