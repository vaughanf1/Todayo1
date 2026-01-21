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

// App state
export type AppView = 'input' | 'timeline' | 'active-task';

export interface AppState {
  view: AppView;
  dayPlan: DayPlan | null;
  activeTaskId: string | null;
  timerSeconds: number;
  isTimerRunning: boolean;
}
