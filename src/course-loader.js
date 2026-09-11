import YAML from 'yaml';
import localPaymentsRaw from '../courses/01-highlevel-local-payments-integration.yaml?raw';
import androidSmsRaw from '../courses/02-highlevel-android-sms-gateway.yaml?raw';
import marketplaceRaw from '../courses/03-highlevel-marketplace-app-development.yaml?raw';

const sources = [
  { slug: 'local-payments', raw: localPaymentsRaw, number: '01' },
  { slug: 'android-sms', raw: androidSmsRaw, number: '02' },
  { slug: 'marketplace-app-development', raw: marketplaceRaw, number: '03' },
];

function normalizeLesson(lesson, index) {
  if (typeof lesson === 'string') {
    return {
      id: `lesson-${index + 1}`,
      title: lesson,
      type: 'topic',
    };
  }

  return {
    id: lesson.id || `lesson-${index + 1}`,
    type: lesson.type || 'topic',
    ...lesson,
    title: lesson.title || `Lesson ${index + 1}`,
  };
}

function normalizeCourse(source) {
  const parsed = YAML.parse(source.raw);
  const course = parsed.course || parsed;
  const modules = (course.modules || []).map((module, moduleIndex) => ({
    ...module,
    number: module.number || moduleIndex + 1,
    lessons: (module.lessons || []).map(normalizeLesson),
  }));

  return {
    ...course,
    slug: source.slug,
    catalogNumber: source.number,
    modules,
    lessonCount: modules.reduce((total, module) => total + module.lessons.length, 0),
  };
}

let cache;

export function loadCourses() {
  if (!cache) cache = sources.map(normalizeCourse);
  return cache;
}

export function getCourse(slug) {
  return loadCourses().find((course) => course.slug === slug) || null;
}
