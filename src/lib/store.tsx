'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppView, CalendarView, DayPlan, Priority, Project, Task, TaskStatus } from '@/types';
import { generateId, minutesToTime, parseTimeToMinutes } from './utils';
import {
  PersistedData,
  emptyMemory,
  loadPersisted,
  savePersisted,
} from './persistence';

type Action =
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'SET_DAY_PLAN'; dayPlan: DayPlan }
  | { type: 'SET_ACTIVE_TASK'; taskId: string | null }
  | { type: 'UPDATE_TASK_STATUS'; taskId: string; status: TaskStatus }
  | { type: 'UPDATE_TASK'; taskId: string; updates: Partial<Task> }
  | { type: 'SET_TIMER'; seconds: number }
  | { type: 'TICK_TIMER' }
  | { type: 'START_TIMER' }
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESET_TIMER' }
  | { type: 'SYNC_TIMER' }
  | { type: 'SET_CALENDAR_VIEW'; calendarView: CalendarView }
  | { type: 'RESCHEDULE_REMAINING_TASKS' }
  | { type: 'REORDER_TASKS'; fromIndex: number; toIndex: number }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; id: string; updates: Partial<Project> }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'ADD_PRIORITY'; priority: Priority }
  | { type: 'UPDATE_PRIORITY'; id: string; updates: Partial<Priority> }
  | { type: 'DELETE_PRIORITY'; id: string }
  | { type: 'ASSIGN_TASK_PROJECT'; taskId: string; projectId: string | null }
  | { type: 'LOAD_STATE'; state: AppState };

const initialState: AppState = {
  view: 'input',
  dayPlan: null,
  activeTaskId: null,
  timerSeconds: 0,
  isTimerRunning: false,
  timerEndTime: null,
  calendarView: 'day',
  memory: emptyMemory(),
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_DAY_PLAN':
      return { ...state, dayPlan: action.dayPlan, view: 'timeline' };

    case 'SET_ACTIVE_TASK': {
      if (action.taskId === null) {
        return { ...state, activeTaskId: null, view: 'timeline', isTimerRunning: false, timerEndTime: null };
      }
      const task = state.dayPlan?.tasks.find(t => t.id === action.taskId);
      const seconds = task ? task.estimatedMinutes * 60 : 0;
      return {
        ...state,
        activeTaskId: action.taskId,
        view: 'active-task',
        timerSeconds: seconds,
        isTimerRunning: false,
        timerEndTime: null,
      };
    }

    case 'UPDATE_TASK_STATUS': {
      if (!state.dayPlan) return state;
      const tasks = state.dayPlan.tasks.map(t =>
        t.id === action.taskId
          ? {
              ...t,
              status: action.status,
              completedAt: action.status === 'completed' ? new Date().toISOString() : t.completedAt,
            }
          : t
      );
      return { ...state, dayPlan: { ...state.dayPlan, tasks } };
    }

    case 'UPDATE_TASK': {
      if (!state.dayPlan) return state;
      const tasks = state.dayPlan.tasks.map(t =>
        t.id === action.taskId ? { ...t, ...action.updates } : t
      );
      return { ...state, dayPlan: { ...state.dayPlan, tasks } };
    }

    case 'SET_TIMER':
      return { ...state, timerSeconds: action.seconds, timerEndTime: null };

    case 'TICK_TIMER': {
      // Calculate remaining time from timerEndTime for accuracy
      if (state.timerEndTime) {
        const remaining = Math.max(0, Math.ceil((state.timerEndTime - Date.now()) / 1000));
        return { ...state, timerSeconds: remaining };
      }
      return { ...state, timerSeconds: Math.max(0, state.timerSeconds - 1) };
    }

    case 'START_TIMER': {
      // Set the end time based on current remaining seconds
      const endTime = Date.now() + state.timerSeconds * 1000;
      return { ...state, isTimerRunning: true, timerEndTime: endTime };
    }

    case 'PAUSE_TIMER': {
      // Calculate and store remaining seconds, clear end time
      const remaining = state.timerEndTime
        ? Math.max(0, Math.ceil((state.timerEndTime - Date.now()) / 1000))
        : state.timerSeconds;
      return { ...state, isTimerRunning: false, timerSeconds: remaining, timerEndTime: null };
    }

    case 'RESET_TIMER': {
      const task = state.dayPlan?.tasks.find(t => t.id === state.activeTaskId);
      return { ...state, timerSeconds: task ? task.estimatedMinutes * 60 : 0, isTimerRunning: false, timerEndTime: null };
    }

    case 'SYNC_TIMER': {
      // Sync timer from timerEndTime (used when page becomes visible)
      if (state.timerEndTime && state.isTimerRunning) {
        const remaining = Math.max(0, Math.ceil((state.timerEndTime - Date.now()) / 1000));
        return { ...state, timerSeconds: remaining };
      }
      return state;
    }

    case 'SET_CALENDAR_VIEW':
      return { ...state, calendarView: action.calendarView };

    case 'REORDER_TASKS': {
      if (!state.dayPlan) return state;

      const tasks = [...state.dayPlan.tasks];
      const [movedTask] = tasks.splice(action.fromIndex, 1);
      tasks.splice(action.toIndex, 0, movedTask);

      // Update sort orders
      tasks.forEach((task, index) => {
        task.sortOrder = index;
      });

      return {
        ...state,
        dayPlan: { ...state.dayPlan, tasks },
      };
    }

    case 'RESCHEDULE_REMAINING_TASKS': {
      if (!state.dayPlan) return state;

      // Get current time in minutes from midnight
      const now = new Date();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      const bufferMinutes = 5;

      // Get remaining tasks (pending or paused) sorted by their current order
      const remainingTasks = state.dayPlan.tasks
        .filter(t => t.status === 'pending' || t.status === 'paused')
        .sort((a, b) => {
          const aStart = a.scheduledStart ? parseTimeToMinutes(a.scheduledStart) : 0;
          const bStart = b.scheduledStart ? parseTimeToMinutes(b.scheduledStart) : 0;
          return aStart - bStart;
        });

      // Build a map of new scheduled times
      const newSchedules = new Map<string, { start: string; end: string }>();
      let nextStartTime = currentTimeMinutes;

      for (const task of remainingTasks) {
        // Check if task has a fixed time that's still in the future
        const originalStart = task.scheduledStart ? parseTimeToMinutes(task.scheduledStart) : 0;

        // If the task's original time is in the future and it was a fixed-time task, keep it
        // Otherwise, reschedule from current time
        const startTime = Math.max(nextStartTime, originalStart > currentTimeMinutes ? originalStart : nextStartTime);
        const endTime = startTime + task.estimatedMinutes;

        newSchedules.set(task.id, {
          start: minutesToTime(startTime),
          end: minutesToTime(endTime),
        });

        nextStartTime = endTime + bufferMinutes;
      }

      // Update all tasks with new schedules
      const updatedTasks = state.dayPlan.tasks.map(task => {
        const newSchedule = newSchedules.get(task.id);
        if (newSchedule) {
          return {
            ...task,
            scheduledStart: newSchedule.start,
            scheduledEnd: newSchedule.end,
          };
        }
        return task;
      });

      return {
        ...state,
        dayPlan: { ...state.dayPlan, tasks: updatedTasks },
      };
    }

    case 'ADD_PROJECT':
      return {
        ...state,
        memory: {
          ...state.memory,
          projects: [...state.memory.projects, action.project],
        },
      };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        memory: {
          ...state.memory,
          projects: state.memory.projects.map(p =>
            p.id === action.id
              ? { ...p, ...action.updates, updatedAt: new Date().toISOString() }
              : p
          ),
        },
      };

    case 'DELETE_PROJECT': {
      // Drop the project and detach it from any of today's tasks.
      const tasks = state.dayPlan
        ? state.dayPlan.tasks.map(t =>
            t.projectId === action.id ? { ...t, projectId: null } : t
          )
        : null;
      return {
        ...state,
        dayPlan: state.dayPlan && tasks ? { ...state.dayPlan, tasks } : state.dayPlan,
        memory: {
          ...state.memory,
          projects: state.memory.projects.filter(p => p.id !== action.id),
        },
      };
    }

    case 'ADD_PRIORITY':
      return {
        ...state,
        memory: {
          ...state.memory,
          priorities: [...state.memory.priorities, action.priority],
        },
      };

    case 'UPDATE_PRIORITY':
      return {
        ...state,
        memory: {
          ...state.memory,
          priorities: state.memory.priorities.map(p =>
            p.id === action.id ? { ...p, ...action.updates } : p
          ),
        },
      };

    case 'DELETE_PRIORITY':
      return {
        ...state,
        memory: {
          ...state.memory,
          priorities: state.memory.priorities.filter(p => p.id !== action.id),
        },
      };

    case 'ASSIGN_TASK_PROJECT': {
      if (!state.dayPlan) return state;
      const tasks = state.dayPlan.tasks.map(t =>
        t.id === action.taskId ? { ...t, projectId: action.projectId } : t
      );
      return { ...state, dayPlan: { ...state.dayPlan, tasks } };
    }

    case 'LOAD_STATE': {
      // If there was a running timer with an end time, recalculate remaining seconds
      if (action.state.timerEndTime && action.state.isTimerRunning) {
        const remaining = Math.max(0, Math.ceil((action.state.timerEndTime - Date.now()) / 1000));
        return { ...action.state, timerSeconds: remaining };
      }
      return action.state;
    }

    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  setView: (view: AppView) => void;
  setDayPlan: (dayPlan: DayPlan) => void;
  setCalendarView: (view: CalendarView) => void;
  startTask: (taskId: string) => void;
  pauseTask: () => void;
  completeTask: () => void;
  skipTask: () => void;
  closeActiveTask: () => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  addProject: (name: string, opts?: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addPriority: (text: string) => Priority;
  updatePriority: (id: string, updates: Partial<Priority>) => void;
  deletePriority: (id: string) => void;
  assignTaskToProject: (taskId: string, projectId: string | null) => void;
}

const PROJECT_COLORS = [
  '#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2', '#FF453A', '#64D2FF',
];

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load durable memory + today's plan on mount. Stale days are archived
  // and unfinished work is carried forward inside loadPersisted().
  useEffect(() => {
    const data = loadPersisted();
    if (!data) return;

    const timerStillValid =
      data.isTimerRunning &&
      !!data.timerEndTime &&
      data.timerEndTime > Date.now();

    const restored: AppState = {
      view: data.view,
      dayPlan: data.today,
      activeTaskId: data.activeTaskId,
      timerSeconds: data.timerSeconds,
      isTimerRunning: timerStillValid ? data.isTimerRunning : false,
      timerEndTime: timerStillValid ? data.timerEndTime : null,
      calendarView: data.calendarView,
      memory: data.memory,
    };

    dispatch({ type: 'LOAD_STATE', state: restored });
  }, []);

  // Persist everything durable on every change.
  useEffect(() => {
    const data: PersistedData = {
      memory: state.memory,
      today: state.dayPlan,
      view: state.view,
      activeTaskId: state.activeTaskId,
      timerSeconds: state.timerSeconds,
      isTimerRunning: state.isTimerRunning,
      timerEndTime: state.timerEndTime,
      calendarView: state.calendarView,
    };
    savePersisted(data);
  }, [state]);

  // Timer effect - runs every second but uses timestamp for accuracy
  useEffect(() => {
    if (!state.isTimerRunning) return;
    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isTimerRunning]);

  // Visibility change handler - sync timer when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.isTimerRunning) {
        dispatch({ type: 'SYNC_TIMER' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isTimerRunning]);

  const setView = useCallback((view: AppView) => {
    dispatch({ type: 'SET_VIEW', view });
  }, []);

  const setDayPlan = useCallback((dayPlan: DayPlan) => {
    dispatch({ type: 'SET_DAY_PLAN', dayPlan });
  }, []);

  const setCalendarView = useCallback((calendarView: CalendarView) => {
    dispatch({ type: 'SET_CALENDAR_VIEW', calendarView });
  }, []);

  const startTask = useCallback((taskId: string) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', taskId, status: 'active' });
    dispatch({ type: 'SET_ACTIVE_TASK', taskId });
    dispatch({ type: 'START_TIMER' });
  }, []);

  const pauseTask = useCallback(() => {
    if (state.activeTaskId) {
      dispatch({ type: 'UPDATE_TASK_STATUS', taskId: state.activeTaskId, status: 'paused' });
    }
    dispatch({ type: 'PAUSE_TIMER' });
  }, [state.activeTaskId]);

  const completeTask = useCallback(() => {
    if (state.activeTaskId) {
      dispatch({ type: 'UPDATE_TASK_STATUS', taskId: state.activeTaskId, status: 'completed' });
    }
    dispatch({ type: 'SET_ACTIVE_TASK', taskId: null });
    // Reschedule remaining tasks to start from current time
    dispatch({ type: 'RESCHEDULE_REMAINING_TASKS' });
  }, [state.activeTaskId]);

  const skipTask = useCallback(() => {
    if (state.activeTaskId) {
      dispatch({ type: 'UPDATE_TASK_STATUS', taskId: state.activeTaskId, status: 'skipped' });
    }
    dispatch({ type: 'SET_ACTIVE_TASK', taskId: null });
  }, [state.activeTaskId]);

  const closeActiveTask = useCallback(() => {
    if (state.activeTaskId) {
      const task = state.dayPlan?.tasks.find(t => t.id === state.activeTaskId);
      if (task?.status === 'active') {
        dispatch({ type: 'UPDATE_TASK_STATUS', taskId: state.activeTaskId, status: 'paused' });
      }
    }
    dispatch({ type: 'SET_ACTIVE_TASK', taskId: null });
  }, [state.activeTaskId, state.dayPlan?.tasks]);

  const reorderTasks = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_TASKS', fromIndex, toIndex });
    // Reschedule tasks after reordering
    dispatch({ type: 'RESCHEDULE_REMAINING_TASKS' });
  }, []);

  const addProject = useCallback((name: string, opts?: Partial<Project>) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId(),
      name,
      description: '',
      color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      priority: 3,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...opts,
    };
    dispatch({ type: 'ADD_PROJECT', project });
    return project;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    dispatch({ type: 'UPDATE_PROJECT', id, updates });
  }, []);

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', id });
  }, []);

  const addPriority = useCallback((text: string) => {
    const priority: Priority = {
      id: generateId(),
      text,
      rank: Date.now(), // appended to the end; reorder adjusts rank
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PRIORITY', priority });
    return priority;
  }, []);

  const updatePriority = useCallback((id: string, updates: Partial<Priority>) => {
    dispatch({ type: 'UPDATE_PRIORITY', id, updates });
  }, []);

  const deletePriority = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PRIORITY', id });
  }, []);

  const assignTaskToProject = useCallback(
    (taskId: string, projectId: string | null) => {
      dispatch({ type: 'ASSIGN_TASK_PROJECT', taskId, projectId });
    },
    []
  );

  return (
    <StoreContext.Provider value={{
      state,
      dispatch,
      setView,
      setDayPlan,
      setCalendarView,
      startTask,
      pauseTask,
      completeTask,
      skipTask,
      closeActiveTask,
      reorderTasks,
      addProject,
      updateProject,
      deleteProject,
      addPriority,
      updatePriority,
      deletePriority,
      assignTaskToProject,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
