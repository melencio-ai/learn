import './styles/app.css';
import { getCourse, loadCourses } from './course-loader.js';
import { courseUrl, initRouter, lessonUrl, moduleUrl, parseRoute } from './router.js';

const root = document.querySelector('#app');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function shell(content, options = {}) {
  const { compact = false } = options;
  return `
    <div class="app-shell ${compact ? 'app-shell--compact' : ''}">
      <header class="topbar">
        <a class="brand" href="/" data-nav aria-label="Learn home">
          <span class="brand-mark">L</span>
          <span>Learn</span>
        </a>
        <span class="topbar-note">Hands-on HighLevel workshops</span>
      </header>
      <main class="main-content">${content}</main>
    </div>
  `;
}

function renderHome() {
  const courses = loadCourses();
  document.title = 'Learn — HighLevel Workshops';

  const cards = courses.map((course) => `
    <a class="course-card" href="${courseUrl(course.slug)}" data-nav>
      <div class="course-card__top">
        <span class="course-number">${escapeHtml(course.catalogNumber)}</span>
        <span class="course-level">${escapeHtml(course.level || 'Course')}</span>
      </div>
      <div>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.outcome || '')}</p>
      </div>
      <div class="course-card__meta">
        <span>${course.modules.length} modules</span>
        <span>${course.lessonCount} lessons</span>
        <span class="course-card__arrow" aria-hidden="true">→</span>
      </div>
    </a>
  `).join('');

  root.innerHTML = shell(`
    <section class="hero">
      <span class="eyebrow">Interactive learning</span>
      <h1>Learn it. Do it. Keep moving.</h1>
      <p>Practical HighLevel training built around real steps, not passive slides.</p>
    </section>

    <section class="catalog" aria-labelledby="courses-heading">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Course library</span>
          <h2 id="courses-heading">Start a workshop</h2>
        </div>
        <span class="section-count">${courses.length} courses</span>
      </div>
      <div class="course-grid">${cards}</div>
    </section>
  `);
}

function renderCourse(route) {
  const course = getCourse(route.courseSlug);
  if (!course) return renderNotFound();

  document.title = `${course.title} — Learn`;
  const firstModule = course.modules[0];
  const firstLessonUrl = firstModule?.lessons?.length
    ? lessonUrl(course.slug, firstModule.number, 1)
    : courseUrl(course.slug);

  const modules = course.modules.map((module) => `
    <a class="module-row" href="${moduleUrl(course.slug, module.number)}" data-nav>
      <span class="module-index">${String(module.number).padStart(2, '0')}</span>
      <span class="module-copy">
        <strong>${escapeHtml(module.title)}</strong>
        <small>${module.lessons.length} lessons</small>
      </span>
      <span class="module-arrow" aria-hidden="true">→</span>
    </a>
  `).join('');

  root.innerHTML = shell(`
    <div class="breadcrumb"><a href="/" data-nav>Courses</a><span>/</span><span>${escapeHtml(course.catalogNumber)}</span></div>
    <section class="course-hero">
      <div class="course-hero__copy">
        <span class="eyebrow">${escapeHtml(course.level || 'Course')}</span>
        <h1>${escapeHtml(course.title)}</h1>
        <p>${escapeHtml(course.outcome || '')}</p>
        <div class="hero-actions">
          <a class="button button--primary" href="${firstLessonUrl}" data-nav>Start course <span aria-hidden="true">→</span></a>
          <span class="course-summary">${course.modules.length} modules · ${course.lessonCount} lessons</span>
        </div>
      </div>
      <div class="course-hero__number">${escapeHtml(course.catalogNumber)}</div>
    </section>

    <section class="module-list" aria-labelledby="modules-heading">
      <div class="section-heading">
        <div>
          <span class="eyebrow">Course outline</span>
          <h2 id="modules-heading">Modules</h2>
        </div>
      </div>
      <div class="module-stack">${modules}</div>
    </section>
  `);
}

function renderModule(route) {
  const course = getCourse(route.courseSlug);
  const module = course?.modules.find((item) => Number(item.number) === route.moduleNumber);
  if (!course || !module) return renderNotFound();

  document.title = `${module.title} — ${course.title}`;
  const lessons = module.lessons.map((lesson, index) => `
    <a class="lesson-row" href="${lessonUrl(course.slug, module.number, index + 1)}" data-nav>
      <span class="lesson-dot">${index + 1}</span>
      <span class="lesson-title">${escapeHtml(lesson.title)}</span>
      <span aria-hidden="true">→</span>
    </a>
  `).join('');

  const practice = module.practical || module.build;

  root.innerHTML = shell(`
    <div class="breadcrumb">
      <a href="/" data-nav>Courses</a><span>/</span>
      <a href="${courseUrl(course.slug)}" data-nav>${escapeHtml(course.catalogNumber)}</a><span>/</span>
      <span>Module ${module.number}</span>
    </div>
    <section class="module-hero">
      <span class="eyebrow">Module ${module.number} of ${course.modules.length}</span>
      <h1>${escapeHtml(module.title)}</h1>
      ${practice ? `<div class="practice-callout"><span>Practical target</span><strong>${escapeHtml(practice)}</strong></div>` : ''}
    </section>
    <section class="lesson-list" aria-label="Lessons">${lessons}</section>
  `, { compact: true });
}

function flattenCourseLessons(course) {
  return course.modules.flatMap((module) => module.lessons.map((lesson, index) => ({
    module,
    lesson,
    lessonNumber: index + 1,
    url: lessonUrl(course.slug, module.number, index + 1),
  })));
}

function renderLesson(route) {
  const course = getCourse(route.courseSlug);
  const module = course?.modules.find((item) => Number(item.number) === route.moduleNumber);
  const lesson = module?.lessons[route.lessonNumber - 1];
  if (!course || !module || !lesson) return renderNotFound();

  document.title = `${lesson.title} — ${course.title}`;
  const lessons = flattenCourseLessons(course);
  const currentIndex = lessons.findIndex((item) => item.module.number === module.number && item.lessonNumber === route.lessonNumber);
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const overall = currentIndex + 1;
  const percent = Math.max(0, Math.min(100, Math.round((overall / lessons.length) * 100)));
  const presenterMode = new URLSearchParams(window.location.search).get('mode') === 'presenter';
  const practice = module.practical || module.build;

  root.innerHTML = `
    <div class="lesson-shell ${presenterMode ? 'lesson-shell--presenter' : ''}">
      <header class="lesson-topbar">
        <a class="brand" href="${courseUrl(course.slug)}" data-nav aria-label="Back to course outline">
          <span class="brand-mark">L</span><span>Learn</span>
        </a>
        <div class="lesson-progress-copy">
          <span>${escapeHtml(course.title)}</span>
          <strong>${percent}%</strong>
        </div>
        <a class="outline-link" href="${moduleUrl(course.slug, module.number)}" data-nav>Outline</a>
      </header>
      <div class="progress-track" aria-label="Course progress"><span style="width:${percent}%"></span></div>

      <main class="lesson-stage">
        <div class="lesson-stage__meta">
          <span class="eyebrow">Module ${module.number} · Lesson ${route.lessonNumber}</span>
          ${presenterMode ? '<span class="mode-badge">Presenter mode</span>' : ''}
        </div>
        <div class="lesson-stage__content">
          <p class="lesson-kicker">${escapeHtml(module.title)}</p>
          <h1>${escapeHtml(lesson.title)}</h1>
          ${practice ? `<div class="lesson-practice"><span>Module target</span><p>${escapeHtml(practice)}</p></div>` : ''}
        </div>
      </main>

      <footer class="lesson-footer">
        ${previous
          ? `<a class="button button--secondary" href="${previous.url}" data-nav><span aria-hidden="true">←</span> Previous</a>`
          : '<span></span>'}
        <span class="lesson-position">${overall} / ${lessons.length}</span>
        ${next
          ? `<a class="button button--primary" href="${next.url}" data-nav>Continue <span aria-hidden="true">→</span></a>`
          : `<a class="button button--primary" href="${courseUrl(course.slug)}" data-nav>Course outline <span aria-hidden="true">→</span></a>`}
      </footer>
    </div>
  `;
}

function renderNotFound() {
  document.title = 'Page not found — Learn';
  root.innerHTML = shell(`
    <section class="empty-state">
      <span class="eyebrow">404</span>
      <h1>That lesson is not here.</h1>
      <p>Return to the course library and choose a workshop.</p>
      <a class="button button--primary" href="/" data-nav>Back to courses</a>
    </section>
  `, { compact: true });
}

function render() {
  try {
    const route = parseRoute();
    if (route.name === 'home') return renderHome();
    if (route.name === 'course') return renderCourse(route);
    if (route.name === 'module') return renderModule(route);
    if (route.name === 'lesson') return renderLesson(route);
    return renderNotFound();
  } catch (error) {
    console.error(error);
    root.innerHTML = shell(`
      <section class="empty-state">
        <span class="eyebrow">Course error</span>
        <h1>We could not load the course content.</h1>
        <p>Check the YAML files and reload the page.</p>
      </section>
    `, { compact: true });
  }
}

initRouter(render);
render();
