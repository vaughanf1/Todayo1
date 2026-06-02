'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { cn, formatTimeFromSeconds, getTaskGroupLabel, getTaskGroupColor, formatTime } from '@/lib/utils';
import { X, Play, Pause, Check, CalendarClock } from 'lucide-react';

export function ActiveTask() {
  const { state, dispatch, pauseTask, completeTask, skipTask, closeActiveTask, deferTask, extendTimer } = useStore();
  const { dayPlan, activeTaskId, timerSeconds, isTimerRunning } = state;
  const [showDefer, setShowDefer] = useState(false);
  const [reason, setReason] = useState('');

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

          {/* Extend timer */}
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs text-muted-foreground mr-1">Need more time?</span>
            <button
              onClick={() => extendTimer(5)}
              className="px-3 py-1.5 rounded-full bg-card/60 border border-border/30 text-xs font-medium
                       text-foreground hover:bg-card active:scale-95 transition-all tabular-nums"
            >
              +5m
            </button>
            <button
              onClick={() => extendTimer(15)}
              className="px-3 py-1.5 rounded-full bg-card/60 border border-border/30 text-xs font-medium
                       text-foreground hover:bg-card active:scale-95 transition-all tabular-nums"
            >
              +15m
            </button>
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
        <footer className="px-6 py-8 flex items-center justify-center gap-6">
          <button
            onClick={() => setShowDefer(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <CalendarClock className="w-4 h-4" />
            Can&apos;t complete
          </button>
          <span className="text-border/40">·</span>
          <button
            onClick={skipTask}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Skip this task
          </button>
        </footer>
      </div>

      {/* Defer sheet */}
      {showDefer && (
        <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDefer(false)}
          />
          <div className="relative w-full max-w-md glass rounded-2xl p-6 animate-scale-in">
            <h2 className="text-lg font-medium text-foreground">
              Can&apos;t finish this now?
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a quick reason — it stays on the task and it moves to the
              end of today&apos;s remaining work.
            </p>
            <textarea
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Blocked — waiting on design feedback"
              className="w-full h-24 p-3 text-sm rounded-xl bg-card/50 border border-border/40
                       text-foreground placeholder:text-muted-foreground/60 resize-none
                       focus:outline-none focus:border-[#0A84FF]/60 transition-colors"
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setShowDefer(false)}
                className="flex-1 py-3 rounded-xl bg-card/60 border border-border/30 text-sm
                         text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deferTask(reason.trim());
                  setReason('');
                  setShowDefer(false);
                }}
                disabled={!reason.trim()}
                className="flex-1 py-3 rounded-xl bg-[#0A84FF] text-white text-sm font-medium
                         hover:opacity-90 active:scale-[0.98] transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Reschedule for later today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
