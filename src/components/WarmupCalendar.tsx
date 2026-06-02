'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { buildMemoryContext } from '@/lib/persistence';
import { Project, ScheduledItem } from '@/types';
import { addDays, formatDateShort, getTodayDate, cn } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Wand2,
  Loader2,
  Target,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface WarmupCalendarProps {
  onBack: () => void;
}

const HORIZON = 30; // days

export function WarmupCalendar({ onBack }: WarmupCalendarProps) {
  const {
    state,
    addProject,
    updateProject,
    setProjectMilestones,
    toggleScheduledDone,
  } = useStore();

  const [building, setBuilding] = useState<string | null>(null);
  const [newProject, setNewProject] = useState('');

  const context = useMemo(() => buildMemoryContext(state.memory), [state.memory]);

  const projects = useMemo(
    () =>
      state.memory.projects
        .filter(p => p.status === 'active' || p.status === 'paused')
        .sort((a, b) => a.priority - b.priority),
    [state.memory.projects]
  );

  // Build the next-30-days agenda from the forward schedule.
  const today = getTodayDate();
  const days = useMemo(() => {
    const byDate = new Map<string, ScheduledItem[]>();
    for (const item of state.memory.schedule) {
      if (item.date < today || item.date > addDays(today, HORIZON - 1)) continue;
      const list = byDate.get(item.date) ?? [];
      list.push(item);
      byDate.set(item.date, list);
    }
    return Array.from({ length: HORIZON }, (_, i) => {
      const date = addDays(today, i);
      return { date, items: (byDate.get(date) ?? []).sort((a, b) => a.title.localeCompare(b.title)) };
    });
  }, [state.memory.schedule, today]);

  const plannedDays = days.filter(d => d.items.length > 0);
  const totalItems = plannedDays.reduce((n, d) => n + d.items.length, 0);

  const handleGenerate = async (project: Project) => {
    setBuilding(project.id);
    try {
      const res = await fetch('/api/warmup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          objective: project.objective ?? '',
          targetDate: project.targetDate ?? null,
          context: context || undefined,
        }),
      });
      if (res.ok) {
        const { milestones } = await res.json();
        setProjectMilestones(project.id, milestones);
      }
    } catch {
      // non-fatal — leave existing plan in place
    } finally {
      setBuilding(null);
    }
  };

  const handleAddProject = () => {
    const name = newProject.trim();
    if (!name) return;
    addProject(name);
    setNewProject('');
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 glass">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-card/60 border border-border/30 flex items-center justify-center hover:bg-card transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-medium text-foreground">Warm-Up Calendar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalItems > 0
                ? `${totalItems} steps across ${plannedDays.length} days`
                : 'Reverse-engineer the next 30 days from your objectives'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Objectives */}
          <section>
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#0A84FF]" /> Your projects &amp; objectives
            </h2>

            <div className="space-y-3">
              {projects.map(project => {
                const milestoneCount = state.memory.schedule.filter(
                  s => s.kind === 'milestone' && s.refId === project.id
                ).length;
                return (
                  <div
                    key={project.id}
                    className="glass rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-medium text-foreground">{project.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        P{project.priority}
                      </span>
                    </div>

                    <textarea
                      defaultValue={project.objective ?? ''}
                      onBlur={e =>
                        updateProject(project.id, { objective: e.target.value.trim() })
                      }
                      placeholder="What does 'done' look like? e.g. Launch the v2 landing page with 3 case studies"
                      rows={2}
                      className="w-full resize-none rounded-xl bg-card/60 border border-border/30 px-3 py-2 text-sm
                               text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                    />

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Target</label>
                      <input
                        type="date"
                        defaultValue={project.targetDate ?? ''}
                        onChange={e =>
                          updateProject(project.id, { targetDate: e.target.value || null })
                        }
                        className="rounded-lg bg-card/60 border border-border/30 px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[#0A84FF]/50"
                      />
                      <button
                        onClick={() => handleGenerate(project)}
                        disabled={building === project.id}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A84FF] text-white text-xs font-medium
                                 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {building === project.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        {milestoneCount > 0 ? 'Rebuild plan' : 'Build 30-day plan'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add a project */}
              <div className="flex items-center gap-2">
                <input
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                  placeholder="Add a project…"
                  className="flex-1 rounded-xl bg-card/40 border border-border/30 px-3 py-2.5 text-sm
                           text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
                />
                <button
                  onClick={handleAddProject}
                  disabled={!newProject.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card/60 border border-border/30 text-sm font-medium text-foreground
                           hover:bg-card transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </section>

          {/* 30-day agenda */}
          <section>
            <h2 className="text-sm font-medium text-foreground mb-3">Next 30 days</h2>

            {plannedDays.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Set an objective above and build a plan — your milestones and
                  content steps will fill in here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plannedDays.map(({ date, items }) => {
                  const totalMin = items.reduce((s, i) => s + i.estimatedMinutes, 0);
                  return (
                    <div key={date} className="glass rounded-2xl p-4">
                      <div className="flex items-baseline justify-between mb-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            date === today ? 'text-[#0A84FF]' : 'text-foreground'
                          )}
                        >
                          {date === today ? 'Today' : formatDateShort(date)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(totalMin / 60 * 10) / 10}h
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => toggleScheduledDone(item.id)}
                            className="w-full flex items-center gap-2 text-left group"
                          >
                            {item.done ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500/80 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 group-hover:text-muted-foreground" />
                            )}
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color ?? '#6B7280' }}
                            />
                            <span
                              className={cn(
                                'text-sm flex-1 min-w-0 truncate',
                                item.done
                                  ? 'text-muted-foreground line-through'
                                  : 'text-foreground/90'
                              )}
                            >
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                              {item.estimatedMinutes}m
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
