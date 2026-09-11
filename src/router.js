export function courseUrl(slug) { return `/courses/${slug}/`; }
export function moduleUrl(slug, moduleNumber) { return `/courses/${slug}/module/${moduleNumber}/`; }
export function lessonUrl(slug, moduleNumber, lessonNumber) { return `/courses/${slug}/module/${moduleNumber}/lesson/${lessonNumber}/`; }

export function parseRoute() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'courses')) return { name: 'home' };
  if (parts[0] !== 'courses') return { name: 'notFound' };
  if (parts.length === 2) return { name: 'course', courseSlug: parts[1] };
  if (parts.length === 4 && parts[2] === 'module') return { name: 'module', courseSlug: parts[1], moduleNumber: Number(parts[3]) };
  if (parts.length === 6 && parts[2] === 'module' && parts[4] === 'lesson') {
    return { name: 'lesson', courseSlug: parts[1], moduleNumber: Number(parts[3]), lessonNumber: Number(parts[5]) };
  }
  return { name: 'notFound' };
}

export function navigate(url) {
  history.pushState({}, '', url);
  window.dispatchEvent(new Event('app:navigate'));
}

export function initRouter(render) {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-nav]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    event.preventDefault();
    navigate(href);
  });
  window.addEventListener('popstate', render);
  window.addEventListener('app:navigate', render);
}
