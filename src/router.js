export function parseRoute(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'courses') return { name: 'home' };

  if (parts[0] !== 'courses' || !parts[1]) return { name: 'not-found' };

  const courseSlug = parts[1];
  if (parts.length === 2) return { name: 'course', courseSlug };

  if (parts[2] === 'module' && parts[3]) {
    const moduleNumber = Number(parts[3]);
    if (!Number.isInteger(moduleNumber) || moduleNumber < 1) return { name: 'not-found' };

    if (parts.length === 4) return { name: 'module', courseSlug, moduleNumber };

    if (parts[4] === 'lesson' && parts[5]) {
      const lessonNumber = Number(parts[5]);
      if (!Number.isInteger(lessonNumber) || lessonNumber < 1) return { name: 'not-found' };
      return { name: 'lesson', courseSlug, moduleNumber, lessonNumber };
    }
  }

  return { name: 'not-found' };
}

export function courseUrl(slug) {
  return `/courses/${slug}/`;
}

export function moduleUrl(slug, moduleNumber) {
  return `/courses/${slug}/module/${moduleNumber}/`;
}

export function lessonUrl(slug, moduleNumber, lessonNumber) {
  return `/courses/${slug}/module/${moduleNumber}/lesson/${lessonNumber}/`;
}

export function navigate(url) {
  const target = new URL(url, window.location.origin);
  window.history.pushState({}, '', `${target.pathname}${target.search}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function initRouter(render) {
  window.addEventListener('popstate', render);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-nav]');
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target && link.target !== '_self') return;

    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    navigate(`${url.pathname}${url.search}`);
  });
}
