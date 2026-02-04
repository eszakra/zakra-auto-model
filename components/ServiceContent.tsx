import React, { useState } from 'react';
import { ArrowLeft, Check, BookOpen, Settings, Lightbulb, HelpCircle, Play, Lock } from 'lucide-react';
import { getServiceById } from '../services/servicesData';

interface ServiceContentProps {
  purchaseId: string;
  serviceId: string;
  onBack: () => void;
}

interface Module {
  id: string;
  title: string;
  icon: React.ReactNode;
  lessons: { id: string; title: string; duration: string; }[];
}

const MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Play className="w-4 h-4" />,
    lessons: [
      { id: '1-1', title: 'Welcome & Overview', duration: '3 min' },
      { id: '1-2', title: 'What You\'ll Need', duration: '5 min' },
      { id: '1-3', title: 'Quick Start Guide', duration: '8 min' },
    ]
  },
  {
    id: 'setup',
    title: 'Setup Guide',
    icon: <Settings className="w-4 h-4" />,
    lessons: [
      { id: '2-1', title: 'Installing ComfyUI', duration: '10 min' },
      { id: '2-2', title: 'Loading Your Files', duration: '7 min' },
      { id: '2-3', title: 'First Test Run', duration: '5 min' },
    ]
  },
  {
    id: 'how-to-use',
    title: 'How to Use',
    icon: <BookOpen className="w-4 h-4" />,
    lessons: [
      { id: '3-1', title: 'Basic Workflow Walkthrough', duration: '12 min' },
      { id: '3-2', title: 'Customizing Prompts', duration: '8 min' },
      { id: '3-3', title: 'Resolution & Quality Settings', duration: '6 min' },
      { id: '3-4', title: 'Batch Processing', duration: '10 min' },
    ]
  },
  {
    id: 'tips',
    title: 'Tips & Tricks',
    icon: <Lightbulb className="w-4 h-4" />,
    lessons: [
      { id: '4-1', title: 'Getting Better Results', duration: '7 min' },
      { id: '4-2', title: 'Common Mistakes to Avoid', duration: '5 min' },
      { id: '4-3', title: 'Advanced Techniques', duration: '15 min' },
    ]
  },
  {
    id: 'support',
    title: 'Support',
    icon: <HelpCircle className="w-4 h-4" />,
    lessons: [
      { id: '5-1', title: 'FAQ', duration: '5 min' },
      { id: '5-2', title: 'Troubleshooting', duration: '8 min' },
      { id: '5-3', title: 'Contact Support', duration: '2 min' },
    ]
  }
];

export const ServiceContent: React.FC<ServiceContentProps> = ({
  purchaseId,
  serviceId,
  onBack
}) => {
  const service = getServiceById(serviceId);
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const [activeLesson, setActiveLesson] = useState(MODULES[0].lessons[0].id);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentModule = MODULES.find(m => m.id === activeModule) || MODULES[0];
  const currentLesson = currentModule.lessons.find(l => l.id === activeLesson) || currentModule.lessons[0];

  const toggleCompleted = (lessonId: string) => {
    setCompletedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const totalLessons = MODULES.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">My Purchases</span>
              </button>
              <div className="h-6 w-px bg-[var(--border-color)]" />
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {service?.name || 'Service Content'}
              </h1>
            </div>

            {/* Progress */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-32 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-reed-red rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] font-medium">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} flex-shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-y-auto transition-all duration-300`}>
          <div className="p-4 space-y-1">
            {MODULES.map((module) => {
              const moduleCompleted = module.lessons.every(l => completedLessons.has(l.id));

              return (
                <div key={module.id}>
                  <button
                    onClick={() => {
                      setActiveModule(module.id);
                      setActiveLesson(module.lessons[0].id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeModule === module.id
                        ? 'bg-reed-red/10 text-reed-red'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${moduleCompleted ? 'text-green-500' : ''}`}>
                      {moduleCompleted ? <Check className="w-4 h-4" /> : module.icon}
                    </span>
                    <span className="text-sm font-medium">{module.title}</span>
                  </button>

                  {activeModule === module.id && (
                    <div className="ml-7 mt-1 space-y-0.5">
                      {module.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            activeLesson === lesson.id
                              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          {completedLessons.has(lesson.id) ? (
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)] flex-shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                          <span className="text-xs text-[var(--text-muted)] ml-auto flex-shrink-0">{lesson.duration}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8">
            {/* Lesson Header */}
            <div className="mb-8">
              <p className="text-xs text-reed-red font-semibold uppercase tracking-wider mb-2">
                {currentModule.title}
              </p>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {currentLesson.title}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Estimated time: {currentLesson.duration}
              </p>
            </div>

            {/* Placeholder Content */}
            <div className="prose prose-sm max-w-none">
              <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-reed-red mb-3">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-semibold">Content Coming Soon</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>

              <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>

              <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>

              <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-6 border border-[var(--border-color)]">
                <h4 className="font-semibold text-[var(--text-primary)] mb-3">Key Takeaways:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    Sed do eiusmod tempor incididunt ut labore
                  </li>
                  <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    Ut enim ad minim veniam, quis nostrud exercitation
                  </li>
                </ul>
              </div>

              <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
              </p>
            </div>

            {/* Mark as completed + Navigation */}
            <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
              <button
                onClick={() => toggleCompleted(activeLesson)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  completedLessons.has(activeLesson)
                    ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-green-500 hover:text-green-500'
                }`}
              >
                <Check className="w-4 h-4" />
                {completedLessons.has(activeLesson) ? 'Completed' : 'Mark as Complete'}
              </button>

              <div className="flex items-center gap-2">
                {/* Find next lesson */}
                {(() => {
                  const allLessons = MODULES.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })));
                  const currentIndex = allLessons.findIndex(l => l.id === activeLesson);
                  const nextLesson = allLessons[currentIndex + 1];
                  if (!nextLesson) return null;
                  return (
                    <button
                      onClick={() => {
                        setActiveModule(nextLesson.moduleId);
                        setActiveLesson(nextLesson.id);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors"
                    >
                      Next Lesson
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceContent;
