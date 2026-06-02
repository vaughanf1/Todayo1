'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { ScheduledItem } from '@/types';
import { cn, ymd } from '@/lib/utils';

export function MonthView() {
  const { state, startTask } = useStore();
  const { dayPlan } = state;

  // Forward-dated schedule grouped by day, so every day — not just today —
  // shows its planned milestones and content steps.
  const scheduleByDate = useMemo(() => {
    const map = new Map<string, ScheduledItem[]>();
    for (const item of state.memory.schedule) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [state.memory.schedule]);

  const calendar = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // Build calendar grid
    const weeks: { date: Date | null; isToday: boolean; dayNum: number | null }[][] = [];
    let currentWeek: { date: Date | null; isToday: boolean; dayNum: number | null }[] = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDay; i++) {
      currentWeek.push({ date: null, isToday: false, dayNum: null });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      currentWeek.push({
        date,
        isToday: date.toDateString() === today.toDateString(),
        dayNum: day,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: null, isToday: false, dayNum: null });
      }
      weeks.push(currentWeek);
    }

    return {
      monthName: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      weeks,
    };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const hasTodayPlan = dayPlan && dayPlan.date === todayStr;
  const pendingCount = hasTodayPlan
    ? dayPlan.tasks.filter(t => t.status === 'pending' || t.status === 'paused').length
    : 0;
  const completedCount = hasTodayPlan
    ? dayPlan.tasks.filter(t => t.status === 'completed').length
    : 0;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex-1 px-6 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Month header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-medium text-foreground">{calendar.monthName}</h2>
        </div>

        {/* Calendar grid */}
        <div className="glass rounded-2xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px bg-border/30">
            {dayNames.map((day) => (
              <div
                key={day}
                className="bg-card/40 p-3 text-center text-xs font-medium text-muted-foreground uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="grid gap-px bg-border/20">
            {calendar.weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-px">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={cn(
                      'bg-card/20 min-h-[80px] p-2 transition-colors',
                      day.date && 'hover:bg-card/40',
                      day.isToday && 'bg-foreground/10',
                      !day.date && 'bg-transparent'
                    )}
                  >
                    {day.dayNum && (
                      <>
                        <div className={cn(
                          'text-sm font-medium mb-1',
                          day.isToday ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {day.isToday ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background">
                              {day.dayNum}
                            </span>
                          ) : (
                            day.dayNum
                          )}
                        </div>

                        {/* Show task indicators for today */}
                        {day.isToday && hasTodayPlan && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {completedCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="w-2 h-2 rounded-full bg-green-500/70" />
                                <span>{completedCount}</span>
                              </div>
                            )}
                            {pendingCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="w-2 h-2 rounded-full bg-foreground/50" />
                                <span>{pendingCount}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Scheduled milestones + content steps for any day */}
                        {(() => {
                          const items = day.date ? scheduleByDate.get(ymd(day.date)) ?? [] : [];
                          if (items.length === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {items.slice(0, 4).map(item => (
                                <span
                                  key={item.id}
                                  title={item.title}
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    item.done && 'opacity-40'
                                  )}
                                  style={{ backgroundColor: item.color ?? '#6B7280' }}
                                />
                              ))}
                              {items.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{items.length - 4}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Today's summary */}
        {hasTodayPlan && (
          <div className="mt-6 glass rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Today&apos;s Tasks</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dayPlan.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => startTask(task.id)}
                  className={cn(
                    'w-full text-left p-2 rounded-lg text-sm transition-colors',
                    'bg-card/40 hover:bg-card/60 border border-border/20',
                    task.status === 'completed' && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      task.status === 'completed' ? 'bg-green-500/70' :
                      task.status === 'active' ? 'bg-blue-500' :
                      'bg-foreground/30'
                    )} />
                    <span className={cn(
                      'truncate',
                      task.status === 'completed' && 'line-through'
                    )}>
                      {task.title}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {task.estimatedMinutes}m
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
