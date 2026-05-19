'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Task } from '@/types';
import { cn, formatTime, calculateProgress } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { UserMenu } from './UserMenu';
import { CalendarViewSelector } from './CalendarViewSelector';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { ProjectsPanel } from './ProjectsPanel';
import { HistoryPanel } from './HistoryPanel';
import { Plus, FolderKanban, History } from 'lucide-react';

// Minutes-from-midnight (a :00 or :30 slot) -> "9:30 AM"
function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m === 0 ? '00' : '30'} ${period}`;
}

interface TimelineProps {
  onNewDay: () => void;
}

export function Timeline({ onNewDay }: TimelineProps) {
  const { state, startTask, setCalendarView, reorderTasks } = useStore();
  const { dayPlan, calendarView } = state;

  // Use refs for drag indices (synchronous access)
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  // State for visual feedback only
  const [dragState, setDragState] = useState<{ dragging: number | null; over: number | null }>({ dragging: null, over: null });

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProjects, setShowProjects] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!dayPlan) return null;

  const { completed, total, remainingMinutes } = calculateProgress(dayPlan.tasks);
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  // Group tasks into 30-minute slots (minutes-from-midnight, floored to :00/:30)
  const tasksBySlot = dayPlan.tasks.reduce<Record<number, Task[]>>((acc, task) => {
    if (task.scheduledStart) {
      const [h, m] = task.scheduledStart.split(':').map(Number);
      const slot = Math.floor((h * 60 + m) / 30) * 30;
      if (!acc[slot]) acc[slot] = [];
      acc[slot].push(task);
    }
    return acc;
  }, {});

  const slots = Object.keys(tasksBySlot).map(Number).sort((a, b) => a - b);
  const currentSlot =
    Math.floor((currentTime.getHours() * 60 + currentTime.getMinutes()) / 30) * 30;

  // Drag handlers using refs for synchronous access
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
    setDragState({ dragging: index, over: null });
  };

  const handleDragOver = (index: number) => {
    if (dragIndexRef.current !== null && index !== dragIndexRef.current) {
      dragOverIndexRef.current = index;
      setDragState(prev => ({ ...prev, over: index }));
    }
  };

  const handleDragEnd = () => {
    const fromIndex = dragIndexRef.current;
    const toIndex = dragOverIndexRef.current;

    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      reorderTasks(fromIndex, toIndex);
    }

    // Reset refs and state
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
    setDragState({ dragging: null, over: null });
  };

  const dateString = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen flex flex-col pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-5 glass">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-medium text-foreground">{dateString}</h1>
                <span className="text-lg font-light text-muted-foreground">{timeString}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completed}/{total} complete · {formatTime(remainingMinutes)} left
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CalendarViewSelector
                value={calendarView}
                onChange={setCalendarView}
              />
              <button
                onClick={() => setShowHistory(true)}
                className="w-9 h-9 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                         hover:bg-card transition-colors"
                title="History"
              >
                <History className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => setShowProjects(true)}
                className="w-9 h-9 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                         hover:bg-card transition-colors"
                title="Projects & priorities"
              >
                <FolderKanban className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={onNewDay}
                className="w-9 h-9 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                         hover:bg-card transition-colors"
                title="Start new day"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
              <UserMenu />
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/80 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content based on calendar view */}
      {calendarView === 'week' ? (
        <WeekView />
      ) : calendarView === 'month' ? (
        <MonthView />
      ) : (
        /* Day View - Timeline */
        <div className="flex-1 px-6 py-6">
          <div className="max-w-lg mx-auto">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
                <p className="text-muted-foreground mb-4">No tasks scheduled</p>
                <button
                  onClick={onNewDay}
                  className="text-foreground font-medium hover:opacity-70 transition-opacity"
                >
                  Add tasks
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {slots.map((slot, idx) => {
                  const tasks = tasksBySlot[slot];
                  const isCurrent = slot === currentSlot;

                  return (
                    <div
                      key={slot}
                      className="flex gap-4 animate-slide-up"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      {/* Time column */}
                      <div className="w-16 flex-shrink-0 pt-4 text-right">
                        <span className={cn(
                          'text-xs font-medium tabular-nums',
                          isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {formatSlot(slot)}
                        </span>
                      </div>

                      {/* Tasks column */}
                      <div className="flex-1 pb-4 border-l border-border/30 pl-4 relative">
                        {/* Current time indicator */}
                        {isCurrent && (
                          <div className="absolute -left-1 top-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-foreground animate-pulse-subtle" />
                          </div>
                        )}

                        <div className="space-y-2">
                          {tasks.map(task => {
                            const globalIndex = dayPlan.tasks.findIndex(t => t.id === task.id);
                            return (
                              <TaskCard
                                key={task.id}
                                task={task}
                                onStart={() => startTask(task.id)}
                                index={globalIndex}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                isDragging={dragState.dragging === globalIndex}
                                isDragOver={dragState.over === globalIndex}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating CTA */}
      {total > 0 && completed < total && (
        <div className="fixed bottom-6 left-6 right-6 z-20 animate-slide-up">
          <div className="max-w-lg mx-auto">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {total - completed} task{total - completed !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(remainingMinutes)} of focused work
                  </p>
                </div>
                {dayPlan.tasks.find(t => t.status === 'pending' || t.status === 'paused') && (
                  <button
                    onClick={() => {
                      const nextTask = dayPlan.tasks.find(t => t.status === 'pending' || t.status === 'paused');
                      if (nextTask) startTask(nextTask.id);
                    }}
                    className="px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium
                             hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    Start Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ProjectsPanel isOpen={showProjects} onClose={() => setShowProjects(false)} />
      <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}
