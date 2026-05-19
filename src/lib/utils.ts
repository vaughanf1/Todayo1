import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Task, TimeBlock } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatTimeFromSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function getCurrentHour(): number {
  return new Date().getHours();
}

export function getTodayDate(): string {
  // LOCAL calendar date (not UTC) — using toISOString() here caused the
  // day to roll over at UTC midnight, archiving the active plan while it
  // was still "today" for the user.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getGreeting(): string {
  const hour = getCurrentHour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function groupTasksByHour(tasks: Task[]): TimeBlock[] {
  const currentHour = getCurrentHour();
  const blocks: TimeBlock[] = [];

  for (let hour = 6; hour <= 22; hour++) {
    const hourTasks = tasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskHour = parseInt(task.scheduledStart.split(':')[0]);
      return taskHour === hour;
    });

    blocks.push({
      hour,
      tasks: hourTasks,
      isCurrent: hour === currentHour,
    });
  }

  return blocks;
}

export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function getTaskGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    'deep-work': 'Deep Work',
    'admin': 'Admin',
    'personal': 'Personal',
    'meetings': 'Meetings',
    'health': 'Health',
    'other': 'Other',
  };
  return labels[group] || group;
}

export function getTaskGroupColor(group: string): string {
  const colors: Record<string, string> = {
    'deep-work': '#6366F1',
    'admin': '#F59E0B',
    'personal': '#10B981',
    'meetings': '#A855F7',
    'health': '#EF4444',
    'other': '#6B7280',
  };
  return colors[group] || colors.other;
}

export function calculateProgress(tasks: Task[]): { completed: number; total: number; remainingMinutes: number } {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const remainingMinutes = tasks
    .filter(t => t.status !== 'completed' && t.status !== 'skipped')
    .reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return { completed, total, remainingMinutes };
}
