import { parse } from 'yaml';

const rawCourses = import.meta.glob('../courses/*.yaml', { query: '?raw', import: 'default', eager: true });
let cache;

function normalizeLesson(lesson, index) {
  if (typeof lesson === 'string') return { id: `lesson-${index + 1}`, title: lesson, type: 'concept', explanation: '' };
  return {
    id: lesson.id || `lesson-${index + 1}`,
    title: lesson.title || `Lesson ${index + 1}`,
    type: lesson.type || 'concept',
    explanation: lesson.explanation || '',
    presenter_notes: lesson.presenter_notes || '',
    takeaway: lesson.takeaway || lesson.key_takeaway || '',
    steps: Array.isArray(lesson.steps) ? lesson.steps : [],
    diagram: lesson.diagram || null,
    required_action: lesson.required_action || null,
    quiz: lesson.quiz || null,
    troubleshooting: Array.isArray(lesson.troubleshooting) ? lesson.troubleshooting : [],
    resources: Array.isArray(lesson.resources) ? lesson.resources : [],
  };
}

function generatedLessons(module) {
  if (!module.auto_lessons || !Array.isArray(module.topics)) return [];
  const n = Number(module.number);
  return [
    {
      id: `m${n}-concept`, title: `${module.title}: Core Idea`, type: 'concept',
      explanation: module.intro || `Understand why ${module.title.toLowerCase()} matters in a real HighLevel Marketplace application.`,
      takeaway: module.takeaway || module.objective,
      presenter_notes: module.presenter_notes || 'Use one practical example. Keep the explanation focused on what participants need for the build milestone.'
    },
    {
      id: `m${n}-walkthrough`, title: 'What You Need to Know', type: 'walkthrough',
      explanation: 'Work through the essential pieces for this module. You do not need to master every edge case yet.',
      steps: module.topics,
      takeaway: 'Learn enough to complete the module build milestone.'
    },
    {
      id: `m${n}-build`, title: `Build Milestone ${n}`, type: 'action',
      explanation: 'Apply the module immediately so the course keeps producing a real app instead of isolated notes.',
      required_action: {
        type: 'checklist', title: module.build,
        items: [`Review the goal: ${module.objective}`, `Complete: ${module.build}`, 'Save the working result or screenshot for your own reference'],
        help: 'If the build does not work, return to the walkthrough and isolate the smallest failing step.'
      },
      presenter_notes: 'Give participants work time. Do not advance until they know what a successful milestone looks like.'
    },
    {
      id: `m${n}-check`, title: `Module ${n} Checkpoint`, type: 'quiz',
      explanation: 'Use this quick check to confirm the main idea before moving to the next layer.',
      quiz: {
        type: 'multiple_choice', title: `What is the main goal of Module ${n}?`,
        options: [module.objective, 'Memorize every HighLevel endpoint', 'Avoid testing until production', 'Replace HighLevel entirely'],
        correct_index: 0,
        correct_feedback: 'Correct. The module is about achieving this practical capability.',
        incorrect_feedback: 'Choose the answer that matches the module objective.'
      }
    }
  ];
}

function normalizeCourse(doc, filename) {
  const course = doc.course || doc;
  const modules = (course.modules || []).map((module, moduleIndex) => {
    const numbered = { ...module, number: Number(module.number || moduleIndex + 1) };
    const lessons = module.lessons?.length ? module.lessons : generatedLessons(numbered);
    return { ...numbered, lessons: (lessons || []).map(normalizeLesson) };
  });
  return {
    ...course,
    slug: course.slug || course.id,
    catalogNumber: course.catalog_number || filename.match(/(\d+)/)?.[1] || '',
    modules,
    lessonCount: modules.reduce((sum, module) => sum + module.lessons.length, 0),
  };
}

export function loadCourses() {
  if (cache) return cache;
  cache = Object.entries(rawCourses)
    .map(([filename, raw]) => normalizeCourse(parse(raw), filename))
    .sort((a, b) => Number(a.catalogNumber) - Number(b.catalogNumber));
  return cache;
}

export function getCourse(slug) { return loadCourses().find((course) => course.slug === slug); }
