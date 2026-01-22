'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Task } from '@/types';
import { cn, formatHour } from '@/lib/utils';
import { TaskCard } from './TaskCard';

export function WeekView() {
  const { state, startTask } = useStore();
  const { dayPlan } = state;

  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        dateStr: date.toISOString().split('T')[0],
      };
    });
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Group today's tasks by hour for display
  const tasksByHour = useMemo(() => {
    if (!dayPlan || dayPlan.date !== todayStr) return {};
    return dayPlan.tasks.reduce<Record<number, Task[]>>((acc, task) => {
      if (task.scheduledStart) {
        const hour = parseInt(task.scheduledStart.split(':')[0]);
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(task);
      }
      return acc;
    }, {});
  }, [dayPlan, todayStr]);

  // Get the hours range (8am to 8pm default, or based on tasks)
  const hours = useMemo(() => {
    const taskHours = Object.keys(tasksByHour).map(Number);
    const minHour = taskHours.length > 0 ? Math.min(...taskHours, 8) : 8;
    const maxHour = taskHours.length > 0 ? Math.max(...taskHours, 20) : 20;
    return Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  }, [tasksByHour]);

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Week header */}
        <div className="grid grid-cols-8 gap-px bg-border/30 sticky top-0 z-10">
          <div className="bg-background/80 backdrop-blur-sm p-2" /> {/* Time column */}
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                'bg-background/80 backdrop-blur-sm p-3 text-center',
                day.isToday && 'bg-foreground/5'
              )}
            >
              <div className="text-xs text-muted-foreground uppercase">{day.dayName}</div>
              <div className={cn(
                'text-lg font-medium mt-1',
                day.isToday ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {day.dayNum}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-8 gap-px bg-border/20">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="bg-background/50 p-2 text-right">
                <span className="text-xs text-muted-foreground">{formatHour(hour)}</span>
              </div>
              {/* Day cells */}
              {weekDays.map((day) => {
                const isToday = day.isToday;
                const tasksForCell = isToday ? (tasksByHour[hour] || []) : [];
                const currentHour = new Date().getHours();
                const isCurrent = isToday && hour === currentHour;

                return (
                  <div
                    key={`${day.dateStr}-${hour}`}
                    className={cn(
                      'bg-background/30 min-h-[60px] p-1 border-b border-border/10 relative',
                      isToday && 'bg-foreground/5',
                      isCurrent && 'bg-foreground/10'
                    )}
                  >
                    {isCurrent && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-foreground/50 rounded-r" />
                    )}
                    {tasksForCell.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => startTask(task.id)}
                        className={cn(
                          'text-xs p-1.5 rounded-md mb-1 cursor-pointer transition-colors',
                          'bg-card/80 border border-border/30 hover:bg-card',
                          task.status === 'completed' && 'opacity-50 line-through',
                          task.status === 'active' && 'ring-1 ring-foreground/50'
                        )}
                      >
                        <div className="font-medium truncate">{task.title}</div>
                        <div className="text-muted-foreground mt-0.5">
                          {task.estimatedMinutes}m
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
