'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Task } from '@/types';
import { cn, formatHour, formatTime, calculateProgress } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { UserMenu } from './UserMenu';
import { CalendarViewSelector } from './CalendarViewSelector';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { Plus } from 'lucide-react';

interface TimelineProps {
  onNewDay: () => void;
}

export function Timeline({ onNewDay }: TimelineProps) {
  const { state, startTask, setCalendarView, reorderTasks } = useStore();
  const { dayPlan, calendarView } = state;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!dayPlan) return null;

  const { completed, total, remainingMinutes } = calculateProgress(dayPlan.tasks);
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  // Group tasks by scheduled hour
  const tasksByHour = dayPlan.tasks.reduce<Record<number, Task[]>>((acc, task) => {
    if (task.scheduledStart) {
      const hour = parseInt(task.scheduledStart.split(':')[0]);
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(task);
    }
    return acc;
  }, {});

  const hours = Object.keys(tasksByHour).map(Number).sort((a, b) => a - b);
  const currentHour = new Date().getHours();

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (dragIndex !== null && index !== dragIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderTasks(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-5 glass">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-medium text-foreground">{dateString}</h1>
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
            {hours.length === 0 ? (
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
                {hours.map((hour, idx) => {
                  const tasks = tasksByHour[hour];
                  const isCurrent = hour === currentHour;

                  return (
                    <div
                      key={hour}
                      className="flex gap-4 animate-slide-up"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      {/* Time column */}
                      <div className="w-14 flex-shrink-0 pt-4 text-right">
                        <span className={cn(
                          'text-xs font-medium',
                          isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {formatHour(hour)}
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
                                isDragging={dragIndex === globalIndex}
                                isDragOver={dragOverIndex === globalIndex}
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
    </div>
  );
}
