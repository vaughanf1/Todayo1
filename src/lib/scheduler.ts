import { ParsedTask, Task, DayPlan } from '@/types';
import { generateId, getTodayDate, minutesToTime, parseTimeToMinutes } from './utils';

interface ScheduleConfig {
  dayStartHour: number;  // e.g., 9 for 9 AM
  dayEndHour: number;    // e.g., 18 for 6 PM
  bufferMinutes: number; // Buffer between tasks
}

const DEFAULT_CONFIG: ScheduleConfig = {
  dayStartHour: 9,
  dayEndHour: 18,
  bufferMinutes: 5,
};

export function scheduleTasks(
  parsedTasks: ParsedTask[],
  rawInput: string,
  config: ScheduleConfig = DEFAULT_CONFIG
): DayPlan {
  const { dayStartHour, dayEndHour, bufferMinutes } = config;

  // Separate fixed-time tasks from flexible tasks
  const fixedTasks = parsedTasks.filter(t => t.fixedTime !== null);
  const flexibleTasks = parsedTasks.filter(t => t.fixedTime === null);

  // Sort flexible tasks by priority (highest first)
  flexibleTasks.sort((a, b) => b.priority - a.priority);

  // Create time slots (in minutes from midnight)
  const dayStart = dayStartHour * 60;
  const dayEnd = dayEndHour * 60;

  // Track occupied time slots
  const occupiedSlots: Array<{ start: number; end: number }> = [];

  // First, place fixed-time tasks
  const scheduledTasks: Task[] = [];

  for (const task of fixedTasks) {
    const startMinutes = parseTimeToMinutes(task.fixedTime!);
    const endMinutes = startMinutes + task.estimatedMinutes;

    occupiedSlots.push({ start: startMinutes, end: endMinutes });

    scheduledTasks.push({
      id: generateId(),
      rawText: task.title,
      title: task.title,
      group: task.group,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes,
      scheduledStart: task.fixedTime,
      scheduledEnd: minutesToTime(endMinutes),
      status: 'pending',
      actualMinutes: null,
      completedAt: null,
      sortOrder: 0,
    });
  }

  // Sort occupied slots by start time
  occupiedSlots.sort((a, b) => a.start - b.start);

  // Find available slots for flexible tasks
  function findNextAvailableSlot(duration: number, preferredStart: number): number | null {
    let currentTime = preferredStart;

    while (currentTime + duration <= dayEnd) {
      // Check if this slot conflicts with any occupied slot
      const conflictingSlot = occupiedSlots.find(slot =>
        (currentTime < slot.end && currentTime + duration > slot.start)
      );

      if (!conflictingSlot) {
        return currentTime;
      }

      // Move to after the conflicting slot
      currentTime = conflictingSlot.end + bufferMinutes;
    }

    return null;
  }

  // Schedule deep work tasks in the morning (higher energy)
  const deepWorkTasks = flexibleTasks.filter(t => t.group === 'deep-work');
  const otherFlexibleTasks = flexibleTasks.filter(t => t.group !== 'deep-work');

  // Prioritize deep work for morning slots
  const orderedFlexibleTasks = [...deepWorkTasks, ...otherFlexibleTasks];

  let nextPreferredStart = dayStart;

  for (const task of orderedFlexibleTasks) {
    const slotStart = findNextAvailableSlot(task.estimatedMinutes, nextPreferredStart);

    if (slotStart === null) {
      // No more room today, schedule anyway at end
      const overflowStart = dayEnd;
      scheduledTasks.push({
        id: generateId(),
        rawText: task.title,
        title: task.title,
        group: task.group,
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes,
        scheduledStart: minutesToTime(overflowStart),
        scheduledEnd: minutesToTime(overflowStart + task.estimatedMinutes),
        status: 'pending',
        actualMinutes: null,
        completedAt: null,
        sortOrder: 0,
      });
      continue;
    }

    const slotEnd = slotStart + task.estimatedMinutes;
    occupiedSlots.push({ start: slotStart, end: slotEnd });
    occupiedSlots.sort((a, b) => a.start - b.start);

    scheduledTasks.push({
      id: generateId(),
      rawText: task.title,
      title: task.title,
      group: task.group,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes,
      scheduledStart: minutesToTime(slotStart),
      scheduledEnd: minutesToTime(slotEnd),
      status: 'pending',
      actualMinutes: null,
      completedAt: null,
      sortOrder: 0,
    });

    nextPreferredStart = slotEnd + bufferMinutes;
  }

  // Sort all tasks by scheduled start time and assign sort order
  scheduledTasks.sort((a, b) => {
    const aStart = a.scheduledStart ? parseTimeToMinutes(a.scheduledStart) : 0;
    const bStart = b.scheduledStart ? parseTimeToMinutes(b.scheduledStart) : 0;
    return aStart - bStart;
  });

  scheduledTasks.forEach((task, index) => {
    task.sortOrder = index;
  });

  return {
    id: generateId(),
    date: getTodayDate(),
    rawInput,
    tasks: scheduledTasks,
    createdAt: new Date().toISOString(),
  };
}
