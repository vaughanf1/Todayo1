// Single source of truth for durable storage.
//
// Everything that must survive across days/sessions goes through here.
// Today this is backed by localStorage; the load/save interface is kept
// deliberately narrow so it can be swapped for a cloud backend (Supabase)
// later without touching the store or UI.

import {
  AiMemory,
  AppMemory,
  AppState,
  CalendarView,
  DayArchive,
  DayPlan,
  Task,
} from '@/types';
import { generateId, getTodayDate } from './utils';

export const MEMORY_VERSION = 1;

const STORAGE_KEY = 'todayo_v2';
const LEGACY_KEY = 'todayo_state';
const HISTORY_CAP = 90; // keep at most ~3 months of archived days
const RECURRING_CAP = 40; // keep the most frequent recurring-task patterns

// The shape we actually persist. Ephemeral timer/view fields are included
// so an in-progress task survives a reload, exactly as before.
export interface PersistedData {
  memory: AppMemory;
  today: DayPlan | null;
  view: AppState['view'];
  activeTaskId: string | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  timerEndTime: number | null;
  calendarView: CalendarView;
}

export function emptyAiMemory(): AiMemory {
  return { recurringTasks: [], notes: '', updatedAt: null };
}

export function emptyMemory(): AppMemory {
  return {
    version: MEMORY_VERSION,
    projects: [],
    priorities: [],
    history: [],
    aiContext: emptyAiMemory(),
  };
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Roll the previous day's plan into history and carry unfinished work
// forward into a fresh plan for `todayDate`. Pure: returns new data.
export function applyDayRollover(
  data: PersistedData,
  todayDate: string = getTodayDate()
): PersistedData {
  const plan = data.today;
  if (!plan || plan.date === todayDate) return data;

  const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
  const archive: DayArchive = {
    id: generateId(),
    date: plan.date,
    rawInput: plan.rawInput,
    tasks: plan.tasks.map(t => ({ ...t })),
    completedCount,
    totalCount: plan.tasks.length,
    archivedAt: new Date().toISOString(),
  };

  const history = [...data.memory.history, archive].slice(-HISTORY_CAP);
  const aiContext = learnFromArchive(data.memory.aiContext, archive);

  // Unfinished work moves to a clean day with status reset.
  const carried: Task[] = plan.tasks
    .filter(t => t.status === 'pending' || t.status === 'paused')
    .map((t, index) => ({
      ...t,
      id: generateId(),
      status: 'pending',
      actualMinutes: null,
      completedAt: null,
      sortOrder: index,
    }));

  const today: DayPlan | null =
    carried.length > 0
      ? {
          id: generateId(),
          date: todayDate,
          rawInput: '',
          tasks: carried,
          createdAt: new Date().toISOString(),
        }
      : null;

  return {
    ...data,
    memory: { ...data.memory, history, aiContext },
    today,
    // a carried plan should land on the timeline; a clean slate on input
    view: today ? 'timeline' : 'input',
    activeTaskId: null,
    isTimerRunning: false,
    timerEndTime: null,
    timerSeconds: 0,
  };
}

// Fold an archived day's tasks into the recurring-task tally so the
// parser can later be told "you usually plan these".
function learnFromArchive(ai: AiMemory, archive: DayArchive): AiMemory {
  const byTitle = new Map(
    ai.recurringTasks.map(r => [normalizeTitle(r.title), { ...r }])
  );

  for (const task of archive.tasks) {
    const key = normalizeTitle(task.title);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = archive.date;
      existing.estimatedMinutes = task.estimatedMinutes;
      existing.group = task.group;
    } else {
      byTitle.set(key, {
        title: task.title,
        group: task.group,
        estimatedMinutes: task.estimatedMinutes,
        count: 1,
        lastSeen: archive.date,
      });
    }
  }

  const recurringTasks = [...byTitle.values()]
    .sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1))
    .slice(0, RECURRING_CAP);

  return { ...ai, recurringTasks, updatedAt: new Date().toISOString() };
}

// Condense durable memory into a short brief the task parser can use to
// stay aligned with standing context day to day. Returns '' when empty.
export function buildMemoryContext(memory: AppMemory): string {
  const sections: string[] = [];

  const priorities = [...memory.priorities].sort((a, b) => a.rank - b.rank);
  if (priorities.length > 0) {
    sections.push(
      'STANDING PRIORITIES (most important first — weight tasks that advance these higher):\n' +
        priorities.map((p, i) => `${i + 1}. ${p.text}`).join('\n')
    );
  }

  const activeProjects = memory.projects.filter(
    p => p.status === 'active' || p.status === 'paused'
  );
  if (activeProjects.length > 0) {
    sections.push(
      'ONGOING PROJECTS (P1 = highest standing priority):\n' +
        activeProjects
          .map(
            p =>
              `- ${p.name} [P${p.priority}, ${p.status}]` +
              (p.description ? ` — ${p.description}` : '')
          )
          .join('\n')
    );
  }

  const recurring = memory.aiContext.recurringTasks
    .filter(r => r.count >= 2)
    .slice(0, 10);
  if (recurring.length > 0) {
    sections.push(
      'RECURRING TASKS (the user plans these often — reuse the typical duration and grouping for consistency):\n' +
        recurring
          .map(r => `- "${r.title}" (${r.group}, ~${r.estimatedMinutes}m, seen ${r.count}x)`)
          .join('\n')
    );
  }

  return sections.join('\n\n');
}

function migrateLegacy(): PersistedData | null {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    const old = JSON.parse(legacy) as Partial<AppState>;
    return {
      memory: emptyMemory(),
      today: old.dayPlan ?? null,
      view: old.dayPlan ? 'timeline' : 'input',
      activeTaskId: old.activeTaskId ?? null,
      timerSeconds: old.timerSeconds ?? 0,
      isTimerRunning: old.isTimerRunning ?? false,
      timerEndTime: old.timerEndTime ?? null,
      calendarView: old.calendarView ?? 'day',
    };
  } catch {
    return null;
  }
}

export function loadPersisted(): PersistedData | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  let data: PersistedData | null = null;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PersistedData;
      data = {
        ...parsed,
        memory: { ...emptyMemory(), ...parsed.memory },
      };
    } catch {
      data = null;
    }
  }

  // First run on the new format: pull anything from the old key forward.
  if (!data) data = migrateLegacy();
  if (!data) return null;

  return applyDayRollover(data);
}

export function savePersisted(data: PersistedData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full / unavailable — non-fatal
  }
}
