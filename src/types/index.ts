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

export interface AppMemory {
  version: number;
  projects: Project[];
  priorities: Priority[];
  history: DayArchive[];
  aiContext: AiMemory;
}

// Calendar view type
export type CalendarView = 'day' | 'week' | 'month';

// App state
export type AppView = 'input' | 'timeline' | 'active-task';

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
