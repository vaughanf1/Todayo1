export type TaskStatus = 'pending' | 'active' | 'paused' | 'completed' | 'skipped';

export type TaskGroup = 'deep-work' | 'admin' | 'personal' | 'meetings' | 'health' | 'other';

export interface Task {
  id: string;
  rawText: string;
  title: string;
  group: TaskGroup;
  priority: number; // 1-5
  estimatedMinutes: number; // 15, 30, 60, 120
  scheduledStart: string | null; // HH:MM format
  scheduledEnd: string | null; // HH:MM format
  status: TaskStatus;
  actualMinutes: number | null;
  completedAt: string | null;
  sortOrder: number;
  projectId?: string | null; // optional link to an ongoing Project
  deferReason?: string | null; // why it was pushed to later today
}

export interface DayPlan {
  id: string;
  date: string; // YYYY-MM-DD
  rawInput: string;
  tasks: Task[];
  createdAt: string;
}

export interface TimeBlock {
  hour: number; // 0-23
  tasks: Task[];
  isCurrent: boolean;
}

// AI parsing response type
export interface ParsedTask {
  title: string;
  group: TaskGroup;
  priority: number;
  estimatedMinutes: number;
  fixedTime: string | null; // HH:MM if time is mentioned
}

export interface AIParseResponse {
  tasks: ParsedTask[];
}

// ---- Durable memory: projects, priorities, history, AI context ----

export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  priority: number; // 1-5 standing priority
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  objective?: string; // what "done" looks like — drives the warm-up planner
  targetDate?: string | null; // YYYY-MM-DD deadline the 30-day plan works back from
}

// A standing priority / goal that outlives any single day.
export interface Priority {
  id: string;
  text: string;
  rank: number; // lower = higher priority
  createdAt: string;
}

// A past day, snapshotted at rollover so nothing is lost.
export interface DayArchive {
  id: string;
  date: string; // YYYY-MM-DD
  rawInput: string;
  tasks: Task[]; // final task state for that day
  completedCount: number;
  totalCount: number;
  archivedAt: string;
}

// A task title the user keeps planning, learned over time.
export interface RecurringTaskPattern {
  title: string;
  group: TaskGroup;
  estimatedMinutes: number;
  count: number;
  lastSeen: string; // YYYY-MM-DD
}

export interface AiMemory {
  recurringTasks: RecurringTaskPattern[];
  notes: string;
  updatedAt: string | null;
}

// ---- Content Studio: YouTube + Instagram Reels pipeline ----

export type ContentType = 'youtube' | 'reel';

// Board columns. `published` is the terminal state; the rest are work stages.
export type ContentStage = 'idea' | 'scripting' | 'filming' | 'editing' | 'published';

export const CONTENT_STAGES: ContentStage[] = [
  'idea',
  'scripting',
  'filming',
  'editing',
  'published',
];

export const CONTENT_STAGE_LABEL: Record<ContentStage, string> = {
  idea: 'Ideas',
  scripting: 'Scripting',
  filming: 'Filming',
  editing: 'Editing',
  published: 'Published',
};

// One video/reel as it moves across the board. Raw title is what the user
// dropped in; the rest is AI-polished. Stage dates are computed by the
// cadence engine and mirrored onto the forward schedule as ScheduledItems.
export interface ContentPiece {
  id: string;
  type: ContentType;
  rawTitle: string;
  title: string; // polished
  hook: string; // opening angle / thumbnail concept
  outline: string; // beat-by-beat script outline
  stage: ContentStage;
  scriptDate: string | null; // YYYY-MM-DD
  shootDate: string | null;
  editDate: string | null;
  publishDate: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
}

// ---- Forward-dated schedule: the calendar's real backbone ----
// Until now Week/Month only rendered "today". ScheduledItems are dated
// work that lives on any future day — milestones from the warm-up planner
// and the per-stage steps generated for each content piece.

export type ScheduledItemKind = 'milestone' | 'content-step';

export interface ScheduledItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: ScheduledItemKind;
  refId: string | null; // ContentPiece.id or Project.id this belongs to
  refType: 'content' | 'project' | null;
  group: TaskGroup;
  estimatedMinutes: number;
  done: boolean;
  color: string | null; // inherits its project/content colour for the calendar
}

// Standing publishing cadence the scheduler works to.
export interface CadenceConfig {
  youtubePerWeek: number; // target videos per week
  reelEveryNDays: number; // a reel at least this often
}

export interface AppMemory {
  version: number;
  projects: Project[];
  priorities: Priority[];
  history: DayArchive[];
  aiContext: AiMemory;
  content: ContentPiece[]; // Studio board
  schedule: ScheduledItem[]; // forward-dated calendar
  cadence: CadenceConfig; // publishing targets
}

// Calendar view type
export type CalendarView = 'day' | 'week' | 'month';

// App state
export type AppView = 'input' | 'timeline' | 'active-task' | 'warmup' | 'studio';

// Response from the content-polish AI route.
export interface ContentPolish {
  title: string;
  hook: string;
  outline: string;
}

// One milestone from the warm-up planner, positioned relative to today.
export interface PlannedMilestone {
  title: string;
  dayOffset: number; // 0 = today, 29 = day 30
  estimatedMinutes: number;
  group: TaskGroup;
}

export interface WarmupPlanResponse {
  milestones: PlannedMilestone[];
}

export interface AppState {
  view: AppView;
  dayPlan: DayPlan | null;
  activeTaskId: string | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  timerEndTime: number | null; // Timestamp when timer should end (for background accuracy)
  calendarView: CalendarView;
  memory: AppMemory; // durable: projects, priorities, history, AI context
}
