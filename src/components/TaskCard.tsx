'use client';

import { Task } from '@/types';
import { cn, formatTime, getTaskGroupLabel, getTaskGroupColor } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

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

  const canDrag = !isCompleted && !isSkipped && onDragStart !== undefined;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag || index === undefined) return;
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (index === undefined) return;
    onDragOver?.(index);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      className={cn(
        'w-full text-left rounded-xl transition-all duration-200 group',
        isCompact ? 'p-3' : 'p-4',
        isCompleted || isSkipped
          ? 'opacity-40'
          : 'hover-lift',
        isActive && 'ring-1 ring-foreground/20',
        isPaused && 'ring-1 ring-orange-500/30',
        'bg-card/60 backdrop-blur-sm border border-border/30',
        isDragging && 'opacity-50 scale-95',
        isDragOver && 'border-foreground/50 bg-card/80'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {canDrag && (
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60 transition-opacity pt-0.5">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        <button
          onClick={onStart}
          disabled={isCompleted || isSkipped}
          className="flex-1 text-left disabled:cursor-default"
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
          </div>
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
        </button>
      </div>
    </div>
  );
}
