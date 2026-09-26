import React, { useState } from "react";
import { TimerState, PomodoroPhase, TodoItem, PomodoroSettings } from "../types";
import { ThemedSelect } from "./ThemedSelect";
import { SegmentedControl } from "./SegmentedControl";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Volume2,
  VolumeX,
  Settings2,
  CheckCircle2,
  Target,
  Flag,
  X,
  Flame,
  Hourglass,
  Clock
} from "lucide-react";

interface FocusTimerProps {
  timer: TimerState;
  todos: TodoItem[];
  accentColor: string;
  onTogglePlay: () => void;
  onReset: () => void;
  onSetMode: (mode: "pomodoro" | "countdown" | "stopwatch") => void;
  onSetPhase: (phase: PomodoroPhase) => void;
  onSkipPhase: () => void;
  onAddFiveMinutes: () => void;
  onSetCountdownDuration: (seconds: number) => void;
  onAddLap: () => void;
  onSetActiveTodoId: (id: string | null) => void;
  onCompleteTodo: (id: string) => Promise<void>;
  onUpdateSettings: (partial: Partial<PomodoroSettings>) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatStopwatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  timer,
  todos,
  accentColor,
  onTogglePlay,
  onReset,
  onSetMode,
  onSetPhase,
  onSkipPhase,
  onAddFiveMinutes,
  onSetCountdownDuration,
  onAddLap,
  onSetActiveTodoId,
  onCompleteTodo,
  onUpdateSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("10");

  const activeTodo = todos.find((t) => t.id === timer.activeTodoId);

  // Circular progress calculation
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  const progressFraction = timer.targetDuration > 0
    ? (timer.targetDuration - timer.timeRemaining) / timer.targetDuration
    : 0;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progressFraction)));

  const handleCustomCountdown = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      onSetCountdownDuration(mins * 60);
    }
  };

  const primaryAccent = (accentColor && accentColor !== "#ff902b" && !accentColor.toLowerCase().includes("ff902b"))
    ? accentColor
    : "#ff5733";

  return (
    <div className="liquid-glass-card rounded-[22px] p-6 flex flex-col relative overflow-hidden shadow-2xl">
      {/* Top Header: Mode Switcher & Quick Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] z-10">
        {/* Segmented Mode Control */}
        <SegmentedControl
          options={[
            {
              id: "pomodoro",
              label: "Pomodoro",
              icon: <Flame className="w-3.5 h-3.5" />,
            },
            {
              id: "countdown",
              label: "Timer",
              icon: <Hourglass className="w-3.5 h-3.5" />,
            },
            {
              id: "stopwatch",
              label: "Stopwatch",
              icon: <Clock className="w-3.5 h-3.5" />,
            },
          ]}
          value={timer.mode}
          onChange={(val) => onSetMode(val as "pomodoro" | "countdown" | "stopwatch")}
          accentColor={primaryAccent}
        />

        {/* Sound toggle & Settings button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ soundEnabled: !timer.settings.soundEnabled })}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            title={timer.settings.soundEnabled ? "Mute notification chime" : "Enable notification chime"}
          >
            {timer.settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#ff5733]" />
            ) : (
              <VolumeX className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${showSettings
                ? "bg-[#ff5733] text-white border-[#ff5733] shadow-md shadow-[#ff5733]/30"
                : "bg-white/[0.04] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            title="Timer durations & settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="mt-4 p-5 rounded-2xl bg-[#1a1c22]/95 border border-white/10 shadow-2xl space-y-4 animate-in fade-in duration-200 z-20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Pomodoro Durations
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-neutral-400 mb-1 font-medium">Focus (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={Math.round(timer.settings.focusDuration / 60)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) onUpdateSettings({ focusDuration: val * 60 });
                }}
                className="liquid-glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#ff5733] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 mb-1 font-medium">Short Break</label>
              <input
                type="number"
                min="1"
                max="60"
                value={Math.round(timer.settings.shortBreakDuration / 60)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) onUpdateSettings({ shortBreakDuration: val * 60 });
                }}
                className="liquid-glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#ff5733] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 mb-1 font-medium">Long Break</label>
              <input
                type="number"
                min="1"
                max="90"
                value={Math.round(timer.settings.longBreakDuration / 60)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) onUpdateSettings({ longBreakDuration: val * 60 });
                }}
                className="liquid-glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#ff5733] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
            <span className="text-neutral-300">Auto-start Breaks</span>
            <input
              type="checkbox"
              checked={timer.settings.autoStartBreaks}
              onChange={(e) => onUpdateSettings({ autoStartBreaks: e.target.checked })}
              className="accent-[#ff5733] cursor-pointer w-4 h-4 rounded"
            />
          </div>
        </div>
      )}

      {/* Pomodoro Phase Switcher (Segmented Liquid Glass Pills) */}
      {timer.mode === "pomodoro" && (
        <div className="flex items-center justify-center mt-4 z-10">
          <SegmentedControl
            options={[
              { id: "focus", label: "Focus" },
              { id: "shortBreak", label: "Short Break" },
              { id: "longBreak", label: "Long Break" },
            ]}
            value={timer.pomodoroPhase}
            onChange={(val) => onSetPhase(val as PomodoroPhase)}
            accentColor={primaryAccent}
            className="bg-[#14161a]/80 border-white/[0.06]"
            buttonClassName="px-4 py-1.5 font-medium"
          />
        </div>
      )}

      {/* Linked Task Banner */}
      <div className="mt-4 px-4 py-3 rounded-2xl liquid-glass-row border border-white/[0.06] flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <Target className="w-4 h-4 text-[#ff5733] shrink-0" />
          {activeTodo ? (
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-[#ff5733] block tracking-wider">
                Current Focus Task
              </span>
              <span className={`text-xs font-medium truncate block ${activeTodo.completed ? "line-through text-neutral-500" : "text-white"}`}>
                {activeTodo.text}
              </span>
            </div>
          ) : (
            <div className="truncate">
              <span className="text-xs text-neutral-400">
                No task linked. Select one to focus on it.
              </span>
            </div>
          )}
        </div>

        {activeTodo ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onCompleteTodo(activeTodo.id)}
              className="px-2.5 py-1 bg-[#ff5733]/20 hover:bg-[#ff5733]/30 text-[#ff5733] border border-[#ff5733]/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Mark task completed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
            <button
              type="button"
              onClick={() => onSetActiveTodoId(null)}
              className="p-1 text-neutral-500 hover:text-neutral-300 rounded cursor-pointer"
              title="Unlink task"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          todos.length > 0 && (
            <div className="w-44 shrink-0">
              <ThemedSelect
                value=""
                onChange={(val) => {
                  if (val) onSetActiveTodoId(val);
                }}
                options={todos
                  .filter((t) => !t.completed)
                  .map((t) => ({ value: t.id, label: t.text }))}
                placeholder="Link task..."
                accentColor={accentColor}
              />
            </div>
          )
        )}
      </div>

      {/* Main Visual Display (SVG Circular Ring for Pomodoro/Countdown, or Digital Stopwatch) */}
      <div className="flex flex-col items-center justify-center my-6 relative z-10">
        {timer.mode !== "stopwatch" ? (
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg width="250" height="250" className="transform -rotate-90 filter drop-shadow-xl">
              {/* Background Track */}
              <circle
                cx="125"
                cy="125"
                r={radius}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress Value Stroke */}
              <circle
                cx="125"
                cy="125"
                r={radius}
                stroke={primaryAccent}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Inner Content Inside the Ring */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase mb-1">
                {timer.mode === "pomodoro"
                  ? timer.pomodoroPhase === "focus"
                    ? "Focus Session"
                    : timer.pomodoroPhase === "shortBreak"
                      ? "Short Break"
                      : "Long Break"
                  : "Countdown"}
              </span>

              {/* Big Digital Monospace Clock */}
              <span className="text-5xl font-extrabold tracking-tight text-white font-mono select-none drop-shadow-md">
                {formatTime(timer.timeRemaining)}
              </span>

              {/* Rounds dots for Pomodoro */}
              {timer.mode === "pomodoro" && (
                <div className="flex items-center gap-1.5 mt-3">
                  {Array.from({ length: timer.settings.longBreakInterval }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${idx + 1 <= timer.currentRound
                          ? "bg-[#ff5733] shadow-md shadow-[#ff5733]/60 scale-110"
                          : "bg-white/10 border border-white/10"
                        }`}
                      title={`Round ${idx + 1} of ${timer.settings.longBreakInterval}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Stopwatch Display */
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase mb-2">
              Stopwatch
            </span>
            <span className="text-6xl font-extrabold tracking-tight text-white font-mono select-none drop-shadow-md">
              {formatStopwatch(timer.elapsedTime)}
            </span>
          </div>
        )}

        {/* Quick presets for Countdown Mode */}
        {timer.mode === "countdown" && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            {[5, 10, 15, 25, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSetCountdownDuration(m * 60)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${timer.targetDuration === m * 60
                    ? "bg-[#ff5733] text-white font-bold shadow-md shadow-[#ff5733]/30 border border-[#ff5733]"
                    : "liquid-glass-pill"
                  }`}
              >
                {m}m
              </button>
            ))}

            <form onSubmit={handleCustomCountdown} className="flex items-center gap-1 ml-1">
              <input
                type="number"
                min="1"
                max="300"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-12 liquid-glass-input rounded-full px-2 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-[#ff5733] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="m"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-neutral-200 text-xs rounded-full font-medium cursor-pointer"
              >
                Set
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Play / Pause Controls Row */}
      <div className="flex items-center justify-center gap-4 z-10">
        {/* Reset button */}
        <button
          type="button"
          onClick={onReset}
          className="p-3 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white rounded-full border border-white/10 transition-all shadow-md cursor-pointer active:scale-95"
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Primary Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          className="liquid-coral-btn px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-2.5 active:scale-95 cursor-pointer shadow-lg shadow-[#ff5733]/30"
        >
          {timer.isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Start</span>
            </>
          )}
        </button>

        {/* Stopwatch Lap or Pomodoro Skip */}
        {timer.mode === "stopwatch" ? (
          <button
            type="button"
            onClick={onAddLap}
            disabled={!timer.isRunning}
            className="p-3 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white rounded-full border border-white/10 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Record Lap"
          >
            <Flag className="w-4 h-4" />
          </button>
        ) : timer.mode === "pomodoro" ? (
          <button
            type="button"
            onClick={onSkipPhase}
            className="p-3 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white rounded-full border border-white/10 transition-all shadow-md cursor-pointer active:scale-95"
            title="Skip to next phase"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onAddFiveMinutes}
            className="p-3 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white rounded-full border border-white/10 transition-all shadow-md cursor-pointer active:scale-95"
            title="+5 Minutes"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stopwatch Laps Table */}
      {timer.mode === "stopwatch" && timer.laps.length > 0 && (
        <div className="mt-5 max-h-36 overflow-y-auto border-t border-white/[0.06] pt-3 z-10">
          <div className="flex justify-between text-[11px] font-bold text-neutral-400 uppercase px-2 mb-1.5">
            <span>Lap</span>
            <span>Split</span>
            <span>Total</span>
          </div>
          <div className="flex flex-col gap-1">
            {timer.laps.map((lap) => (
              <div
                key={lap.id}
                className="flex justify-between text-xs font-mono text-neutral-300 px-3 py-1.5 liquid-glass-row rounded-xl"
              >
                <span className="text-neutral-400 font-sans font-medium">#{lap.lapNumber}</span>
                <span className="text-neutral-300">+{formatStopwatch(lap.lapTime)}</span>
                <span className="text-white font-semibold">{formatStopwatch(lap.totalTime)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
