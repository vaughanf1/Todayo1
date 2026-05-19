'use client';

import { Task } from '@/types';
import { cn, formatTime, getTaskGroupLabel, getTaskGroupColor } from '@/lib/utils';

// "14:05" -> "2:05 PM"
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

interface TaskCardProps {
  task: Task;
  onStart: () => void;
  isCompact?: boolean;
  index?: number;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function TaskCard({
  task,
  onStart,
  isCompact = false,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: TaskCardProps) {
  const groupColor = getTaskGroupColor(task.group);
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';
  const isActive = task.status === 'active';
  const isPaused = task.status === 'paused';

  // Every card is draggable regardless of status — drop reorders the day.
  const canDrag = onDragStart !== undefined && index !== undefined;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    onDragStart?.(index!);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== undefined) {
      onDragOver?.(index);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnd?.();
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  const handleClick = () => {
    if (!isCompleted && !isSkipped) {
      onStart();
    }
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={cn(
        'w-full text-left rounded-xl transition-all duration-200 group cursor-pointer select-none',
        isCompact ? 'p-3' : 'p-4',
        isCompleted || isSkipped
          ? 'opacity-40 cursor-default'
          : 'hover-lift active:scale-[0.98]',
        isActive && 'ring-1 ring-foreground/20',
        isPaused && 'ring-1 ring-orange-500/30',
        'bg-card/60 backdrop-blur-sm border border-border/30',
        canDrag && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 scale-95 shadow-lg',
        isDragOver && 'border-foreground/50 bg-card/80 scale-[1.02]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            {isCompleted && (
              <div className="w-4 h-4 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {isActive && (
              <div className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 animate-pulse-subtle">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
              </div>
            )}
            {isPaused && (
              <div className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-2 bg-orange-500 rounded-full" />
                  <div className="w-0.5 h-2 bg-orange-500 rounded-full" />
                </div>
              </div>
            )}
            <h3 className={cn(
              'font-medium text-sm truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </h3>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${groupColor}15`,
                color: groupColor,
              }}
            >
              {getTaskGroupLabel(task.group)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(task.estimatedMinutes)}
            </span>
            {task.scheduledStart && task.scheduledEnd && !isCompleted && !isSkipped && (
              <span className="text-xs font-medium text-foreground/70 tabular-nums">
                {to12h(task.scheduledStart)} – {to12h(task.scheduledEnd)}
              </span>
            )}
          </div>

          {/* Defer reason */}
          {task.deferReason && !isCompleted && !isSkipped && (
            <p className="text-xs text-muted-foreground/80 italic mt-2 truncate">
              ↩ {task.deferReason}
            </p>
          )}
        </div>

        {/* Priority dots */}
        {!isCompleted && !isSkipped && (
          <div className="flex gap-0.5 opacity-40 group-hover:opacity-70 transition-opacity">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={cn(
                  'w-1 h-3 rounded-full transition-colors',
                  i <= task.priority ? 'bg-foreground' : 'bg-muted'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
