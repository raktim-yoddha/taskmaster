export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface DailyHistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  formattedDate: string; // "Saturday, Sep 26, 2026"
  title: string;
  todos: TodoItem[];
  completedCount: number;
  totalCount: number;
  archivedAt: string;
}

export interface OverlayTheme {
  cardColor: string;
  textColor: string;
  accentColor: string;
  opacity: number;
  blur: number;
  width: number;
  radius: number;
  padding: number;
  spacing: number;
  font: string; // 'inter' | 'jakarta' | 'space' | 'serif'
  density: string; // 'comfortable' | 'compact'
  showTitle: boolean;
  progressStyle: string; // 'both' | 'bar' | 'fraction' | 'none'
  completedStyle: string; // 'strike' | 'dim' | 'tick'
  animation: string; // 'none' | 'subtle' | 'playful'
  completionOrder?: "maintain" | "queue"; // 'maintain' | 'queue'
}

export interface OverlayState {
  title: string;
  todos: TodoItem[];
  theme: OverlayTheme;
  historyRetentionDays?: number;
  history?: DailyHistoryRecord[];
  lastActiveDate?: string;
}

export type TimerMode = "pomodoro" | "countdown" | "stopwatch";
export type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export interface PomodoroSettings {
  focusDuration: number; // in seconds (e.g. 1500)
  shortBreakDuration: number; // in seconds (e.g. 300)
  longBreakDuration: number; // in seconds (e.g. 900)
  longBreakInterval: number; // e.g. 4 rounds
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
}

export interface LapTime {
  id: string;
  lapNumber: number;
  lapTime: number;
  totalTime: number;
}

export interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  timeRemaining: number;
  elapsedTime: number;
  targetDuration: number;
  pomodoroPhase: PomodoroPhase;
  currentRound: number;
  activeTodoId: string | null;
  laps: LapTime[];
  settings: PomodoroSettings;
}

