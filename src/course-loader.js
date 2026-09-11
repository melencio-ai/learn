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
  if (!module.auto_lessons) return [];
  const n = Number(module.number);
  const concepts = Array.isArray(module.concepts) && module.concepts.length ? module.concepts : (module.topics || []);
  const walkthrough = Array.isArray(module.walkthrough_steps) && module.walkthrough_steps.length ? module.walkthrough_steps : (module.topics || []);
  const buildSteps = Array.isArray(module.build_steps) && module.build_steps.length
    ? module.build_steps
    : [`Review the goal: ${module.objective}`, `Complete: ${module.build}`, 'Save the working result or screenshot for your own reference'];
  const successCriteria = Array.isArray(module.success_criteria) && module.success_criteria.length
    ? module.success_criteria
    : [`You can explain what you built`, `You can show the working result for: ${module.build}`];
  const troubleshooting = Array.isArray(module.troubleshooting) ? module.troubleshooting : [];
  const quiz = module.quiz || {
    question: `What is the main goal of Module ${n}?`,
    options: [module.objective, 'Memorize every HighLevel endpoint', 'Avoid testing until production', 'Replace HighLevel entirely'],
    correct_index: 0,
    correct_feedback: 'Correct. The module is about achieving this practical capability.',
    incorrect_feedback: 'Choose the answer that matches the module objective.'
  };

  return [
    {
      id: `m${n}-concept`,
      title: module.concept_title || `${module.title}: Core Idea`,
      type: 'concept',
      explanation: module.intro || `Understand why ${module.title.toLowerCase()} matters in a real HighLevel Marketplace application.`,
      takeaway: module.takeaway || module.objective,
      presenter_notes: module.presenter_notes || 'Connect this concept to the app participants are building. Avoid abstract theory when a practical example can explain it faster.'
    },
    {
      id: `m${n}-concepts`,
      title: module.concepts_title || 'The Pieces You Need to Understand',
      type: 'walkthrough',
      explanation: module.concepts_intro || 'These are the pieces you need to recognize before touching the build. Focus on what each piece does and how it connects to the others.',
      steps: concepts,
      takeaway: module.concepts_takeaway || 'You do not need to memorize everything. You need to know what each part is responsible for.'
    },
    {
      id: `m${n}-walkthrough`,
      title: module.walkthrough_title || 'Walk Through the Real Flow',
      type: module.diagram ? 'diagram' : 'walkthrough',
      explanation: module.walkthrough_intro || 'Follow the flow in order. Pay attention to which system owns each step and what data moves between them.',
      steps: walkthrough,
      diagram: module.diagram || null,
      takeaway: module.walkthrough_takeaway || 'If you can explain the flow from start to finish, debugging becomes much easier.'
    },
    {
      id: `m${n}-build`,
      title: `Build Milestone ${n}`,
      type: 'action',
      explanation: module.build_intro || 'Apply the module immediately. The goal is to leave this lesson with a real artifact or working result, not just notes.',
      required_action: {
        type: 'checklist',
        title: module.build,
        items: buildSteps,
        help: module.build_help || troubleshooting[0] || 'If the build does not work, return to the walkthrough and isolate the smallest failing step.'
      },
      takeaway: module.build_takeaway || `Your result for this module should prove that you can: ${module.objective}`,
      presenter_notes: module.build_presenter_notes || 'Give participants work time. Ask them to show the result, not just say they understand it.'
    },
    {
      id: `m${n}-verify`,
      title: 'Verify It Before Moving On',
      type: 'troubleshooting',
      explanation: module.verify_intro || 'A build is not complete just because there was no error. Check the result against clear success criteria and fix the most common failure points.',
      steps: successCriteria,
      troubleshooting,
      required_action: {
        type: 'confirmation',
        title: module.verify_title || 'Does your result match the success criteria?',
        instructions: successCriteria,
        button: module.verify_button || 'Yes — my result matches'
      },
      takeaway: module.verify_takeaway || 'Verify behavior, not just configuration.'
    },
    {
      id: `m${n}-check`,
      title: `Module ${n} Checkpoint`,
      type: 'quiz',
      explanation: module.checkpoint_intro || 'Use this quick check to make sure the main idea is clear before adding the next layer to your app.',
      quiz: {
        type: 'multiple_choice',
        title: quiz.question || `What is the main goal of Module ${n}?`,
        options: quiz.options || [],
        correct_index: Number(quiz.correct_index || 0),
        correct_feedback: quiz.correct_feedback || 'Correct. You are ready for the next layer.',
        incorrect_feedback: quiz.incorrect_feedback || 'Review the flow and choose the answer that matches the module objective.'
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
