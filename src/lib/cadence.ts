// Cadence engine — turns a publishing target ("2 YouTube/week, a Reel every
// other day") into concrete dates. AI handles the *creative* polish; this
// handles the *scheduling*, deterministically, so dates never drift or
// collide. Given a content piece it finds the next open publish slot that
// respects the cadence, then back-calculates the prep days (script → film →
// edit → publish) and mirrors them onto the forward schedule.

import {
  CadenceConfig,
  ContentPiece,
  ContentType,
  ScheduledItem,
  TaskGroup,
} from '@/types';
import { addDays, dayOfWeek, daysBetween, generateId, getTodayDate } from './utils';

interface StagePlan {
  scriptOffset: number; // days relative to publish (negative = before)
  shootOffset: number;
  editOffset: number;
}

// YouTube needs real lead time; reels are near-same-day.
const STAGE_PLAN: Record<ContentType, StagePlan> = {
  youtube: { scriptOffset: -4, shootOffset: -2, editOffset: -1 },
  reel: { scriptOffset: -1, shootOffset: -1, editOffset: 0 },
};

// Rough effort per stage (minutes) so the steps land as real time blocks.
const STAGE_MINUTES: Record<
  ContentType,
  { script: number; shoot: number; edit: number; publish: number }
> = {
  youtube: { script: 90, shoot: 120, edit: 120, publish: 30 },
  reel: { script: 15, shoot: 30, edit: 45, publish: 15 },
};

export interface ContentDates {
  scriptDate: string;
  shootDate: string;
  editDate: string;
  publishDate: string;
}

// Which weekdays YouTube publishes on, spread across the work week.
// (0 = Sun … 6 = Sat)
export function youtubePublishWeekdays(perWeek: number): number[] {
  const presets: Record<number, number[]> = {
    1: [2], // Tue
    2: [2, 5], // Tue, Fri
    3: [1, 3, 5], // Mon, Wed, Fri
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
  };
  return presets[perWeek] ?? [2, 5];
}

function leadDays(type: ContentType): number {
  return Math.abs(STAGE_PLAN[type].scriptOffset);
}

// Find the next publish date for `type` that honours the cadence and doesn't
// clash with anything already scheduled. Always leaves enough runway today
// to actually do the prep work.
export function nextPublishDate(
  type: ContentType,
  existingPublishDates: string[],
  cadence: CadenceConfig,
  today: string = getTodayDate()
): string {
  const taken = new Set(existingPublishDates);
  const earliest = addDays(today, leadDays(type));

  if (type === 'youtube') {
    const weekdays = new Set(youtubePublishWeekdays(cadence.youtubePerWeek));
    let d = earliest;
    for (let i = 0; i < 180; i++) {
      if (weekdays.has(dayOfWeek(d)) && !taken.has(d)) return d;
      d = addDays(d, 1);
    }
    return earliest;
  }

  // Reels: keep at least `reelEveryNDays` between any two publishes.
  const gap = Math.max(1, cadence.reelEveryNDays);
  const sorted = [...existingPublishDates].sort();
  let candidate = earliest;
  if (sorted.length > 0) {
    const afterLast = addDays(sorted[sorted.length - 1], gap);
    if (afterLast > candidate) candidate = afterLast;
  }
  for (let i = 0; i < 365; i++) {
    const tooClose = existingPublishDates.some(
      p => Math.abs(daysBetween(p, candidate)) < gap
    );
    if (!tooClose && !taken.has(candidate)) return candidate;
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

export function computeContentDates(
  type: ContentType,
  publishDate: string
): ContentDates {
  const plan = STAGE_PLAN[type];
  return {
    scriptDate: addDays(publishDate, plan.scriptOffset),
    shootDate: addDays(publishDate, plan.shootOffset),
    editDate: addDays(publishDate, plan.editOffset),
    publishDate,
  };
}

// Pick a publish slot + back-calc the prep dates for a brand-new piece,
// considering everything already on the board of the same type.
export function planContentDates(
  type: ContentType,
  board: ContentPiece[],
  cadence: CadenceConfig,
  today: string = getTodayDate()
): ContentDates {
  const existing = board
    .filter(p => p.type === type && p.publishDate)
    .map(p => p.publishDate as string);
  const publishDate = nextPublishDate(type, existing, cadence, today);
  return computeContentDates(type, publishDate);
}

// Expand a scheduled piece into the dated calendar steps it implies.
export function scheduledItemsForPiece(
  piece: ContentPiece,
  color: string | null
): ScheduledItem[] {
  const mins = STAGE_MINUTES[piece.type];
  const tag = piece.type === 'youtube' ? 'YT' : 'Reel';
  const steps: Array<{
    date: string | null;
    verb: string;
    minutes: number;
    group: TaskGroup;
  }> = [
    { date: piece.scriptDate, verb: 'Script', minutes: mins.script, group: 'deep-work' },
    { date: piece.shootDate, verb: 'Film', minutes: mins.shoot, group: 'deep-work' },
    { date: piece.editDate, verb: 'Edit', minutes: mins.edit, group: 'deep-work' },
    { date: piece.publishDate, verb: 'Publish', minutes: mins.publish, group: 'admin' },
  ];

  return steps
    .filter(s => s.date)
    .map(s => ({
      id: generateId(),
      date: s.date as string,
      title: `${s.verb}: ${piece.title} (${tag})`,
      kind: 'content-step' as const,
      refId: piece.id,
      refType: 'content' as const,
      group: s.group,
      estimatedMinutes: s.minutes,
      done: false,
      color,
    }));
}
