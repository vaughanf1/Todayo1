'use client';

import { useStore } from '@/lib/store';
import { cn, formatTimeFromSeconds, getTaskGroupLabel, getTaskGroupColor, formatTime } from '@/lib/utils';
import { X, Play, Pause, Check } from 'lucide-react';

export function ActiveTask() {
  const { state, dispatch, pauseTask, completeTask, skipTask, closeActiveTask } = useStore();
  const { dayPlan, activeTaskId, timerSeconds, isTimerRunning } = state;

  const task = dayPlan?.tasks.find(t => t.id === activeTaskId);
  if (!task) return null;

  const groupColor = getTaskGroupColor(task.group);
  const totalSeconds = task.estimatedMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - (timerSeconds / totalSeconds) : 0;
  const isOvertime = timerSeconds === 0 && isTimerRunning;

  // SVG circle calculations
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={closeActiveTask}
            className="w-10 h-10 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                     hover:bg-card transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: `${groupColor}15`,
              color: groupColor,
            }}
          >
            {getTaskGroupLabel(task.group)}
          </span>
        </header>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Task title */}
          <h1 className="text-2xl font-medium text-center mb-2 max-w-sm text-foreground">
            {task.title}
          </h1>
          <p className="text-muted-foreground text-sm mb-16">
            Estimated: {formatTime(task.estimatedMinutes)}
          </p>

          {/* Timer ring */}
          <div className="relative mb-16">
            <svg className="w-64 h-64 -rotate-90" viewBox="0 0 280 280">
              {/* Background circle */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border/30"
              />
              {/* Progress circle */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke={isOvertime ? '#F59E0B' : 'currentColor'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  'transition-all duration-1000',
                  !isOvertime && 'text-foreground'
                )}
              />
            </svg>

            {/* Timer text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                'text-5xl font-light tabular-nums tracking-tight',
                isOvertime && 'text-orange-500'
              )}>
                {formatTimeFromSeconds(timerSeconds)}
              </span>
              <span className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
                {isOvertime ? 'overtime' : 'remaining'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {isTimerRunning ? (
              <button
                onClick={pauseTask}
                className="w-14 h-14 rounded-full bg-card/60 border border-border/30 flex items-center justify-center
                         hover:bg-card active:scale-95 transition-all"
              >
                <Pause className="w-6 h-6 text-foreground" />
              </button>
            ) : (
              <button
                onClick={() => dispatch({ type: 'START_TIMER' })}
                className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center
                         hover:opacity-90 active:scale-95 transition-all"
              >
                <Play className="w-6 h-6 text-background ml-0.5" />
              </button>
            )}

            <button
              onClick={completeTask}
              className="px-8 py-4 bg-emerald-500/90 text-white rounded-2xl font-medium
                       flex items-center gap-2 hover:bg-emerald-500 active:scale-[0.98] transition-all"
            >
              <Check className="w-5 h-5" />
              Complete
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-8 text-center">
          <button
            onClick={skipTask}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Skip this task
          </button>
        </footer>
      </div>
    </div>
  );
}
