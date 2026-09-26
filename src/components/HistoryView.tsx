import React, { useState } from "react";
import { DailyHistoryRecord, TodoItem } from "../types";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  Archive,
  ChevronDown,
  ChevronUp,
  Settings,
  X
} from "lucide-react";

interface HistoryViewProps {
  history: DailyHistoryRecord[];
  retentionDays: number;
  accentColor: string;
  onRestoreTodos: (todos: TodoItem[]) => Promise<void>;
  onOpenSettings: () => void;
  onManualArchive?: () => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history = [],
  retentionDays = 7,
  accentColor = "#ff5733",
  onRestoreTodos,
  onOpenSettings,
  onManualArchive,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [restoringDayId, setRestoringDayId] = useState<string | null>(null);

  const toggleDayCollapse = (id: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Calculate statistics across all history
  const totalDays = history.length;
  const totalTasks = history.reduce((sum, h) => sum + (h.totalCount || h.todos.length), 0);
  const totalCompleted = history.reduce((sum, h) => sum + (h.completedCount || h.todos.filter((t) => t.completed).length), 0);
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // Filter history items by search query
  const filteredHistory = history.filter((record) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (record.formattedDate.toLowerCase().includes(q)) return true;
    if (record.date.toLowerCase().includes(q)) return true;
    if (record.title && record.title.toLowerCase().includes(q)) return true;
    return record.todos.some((t) => t.text.toLowerCase().includes(q));
  });

  const handleRestore = async (dayId: string, todosToRestore: TodoItem[]) => {
    setRestoringDayId(dayId);
    try {
      await onRestoreTodos(todosToRestore);
    } finally {
      setTimeout(() => setRestoringDayId(null), 600);
    }
  };

  const getRetentionLabel = (days: number) => {
    if (days === 7) return "1 Week (7 Days)";
    if (days === 14) return "2 Weeks (14 Days)";
    if (days === 30) return "1 Month (30 Days)";
    return `${days} Days`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Archived Days</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalDays}
            </span>
            <span className="text-[11px] text-neutral-400 ml-1.5 font-sans">days on record</span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {totalCompleted}
            </span>
            <span className="text-[11px] text-neutral-400 ml-1.5 font-sans">of {totalTasks} tasks</span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Success Rate</span>
            <TrendingUp className="w-4 h-4 text-[#ff5733]" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {completionRate}%
            </span>
            <span className="text-[11px] text-neutral-400 ml-1.5 font-sans">overall finish rate</span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Retention Window</span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Change retention in Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2.5">
            <span className="text-sm font-semibold text-neutral-200 tracking-tight block">
              {getRetentionLabel(retentionDays)}
            </span>
            <span className="text-[10px] text-neutral-400">auto-prunes older history</span>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search past tasks, notes, or dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#16181c]/90 border border-white/[0.08] hover:border-white/[0.14] focus:border-[#ff5733]/65 rounded-full pl-9 pr-8 py-2 text-xs text-white placeholder:text-neutral-500 transition-all focus:outline-none focus:ring-2 focus:ring-[#ff5733]/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {onManualArchive && (
          <button
            type="button"
            onClick={onManualArchive}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all cursor-pointer"
            title="Archive current to-dos into History now and empty list"
          >
            <Archive className="w-3.5 h-3.5 text-neutral-400" />
            <span>Archive Today Now</span>
          </button>
        )}
      </div>

      {/* History Stacks List */}
      {filteredHistory.length === 0 ? (
        <div className="liquid-glass-card rounded-[22px] p-10 text-center border border-white/[0.06] shadow-xl flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733] border border-[#ff5733]/30">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {searchQuery ? "No matching tasks found" : "No Daily History Recorded Yet"}
          </h3>
          <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
            {searchQuery
              ? `No archived tasks matching "${searchQuery}". Try searching for another term.`
              : "Every night at 12:00 AM (midnight), your active to-do list automatically gets saved here into a daily stack and your list is emptied for a fresh morning. Completed tasks store their exact checklist timestamp."}
          </p>
          {!searchQuery && onManualArchive && (
            <button
              type="button"
              onClick={onManualArchive}
              className="liquid-coral-btn mt-3 text-xs px-4 py-2 rounded-full font-semibold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Snapshot Current To-Dos into History</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((record) => {
            const isCollapsed = !!collapsedDays[record.id];
            const completedCount = record.todos.filter((t) => t.completed).length;
            const totalCount = record.todos.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const incompleteTodos = record.todos.filter((t) => !t.completed);

            return (
              <div
                key={record.id}
                className="liquid-glass-card rounded-[22px] border border-white/[0.08] shadow-xl overflow-hidden transition-all duration-200"
              >
                {/* Daily Stack Header */}
                <div className="p-4 sm:px-5 flex items-center justify-between gap-3 bg-white/[0.02] border-b border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleDayCollapse(record.id)}
                      className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title={isCollapsed ? "Expand stack" : "Collapse stack"}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-tight">
                          {record.formattedDate || record.date}
                        </span>
                        {record.title && (
                          <span className="text-[11px] font-mono text-neutral-400 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] truncate max-w-[200px]">
                            {record.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {completedCount}/{totalCount} tasks completed ({pct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Progress Pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Progress Bar pill */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? "#10b981" : accentColor,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-neutral-300">
                        {pct}%
                      </span>
                    </div>

                    {/* Restore Incomplete button */}
                    {incompleteTodos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRestore(record.id, incompleteTodos)}
                        disabled={restoringDayId === record.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all cursor-pointer disabled:opacity-50"
                        title="Copy uncompleted tasks back into Today's to-do list"
                      >
                        <RotateCcw className={`w-3 h-3 text-[#ff5733] ${restoringDayId === record.id ? "animate-spin" : ""}`} />
                        <span className="hidden md:inline">Carry Incomplete to Today</span>
                        <span className="md:hidden">Carry ({incompleteTodos.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stacked Task Items */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4 space-y-2">
                    {record.todos.map((todo) => {
                      return (
                        <div
                          key={todo.id}
                          className={`rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 border transition-all ${
                            todo.completed
                              ? "bg-emerald-500/[0.04] border-emerald-500/20"
                              : "bg-[#ff5733]/[0.04] border-[#ff5733]/20"
                          }`}
                        >
                          {/* Left: Green Tick or Orange Cross Sign */}
                          <div className="flex items-center gap-3 min-w-0">
                            {todo.completed ? (
                              <div
                                className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0"
                                title="Completed task"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full bg-[#ff5733]/20 border border-[#ff5733]/40 flex items-center justify-center text-[#ff5733] shrink-0"
                                title="Incomplete at midnight"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <span
                              className={`text-xs font-medium truncate ${
                                todo.completed
                                  ? "text-neutral-300 line-through decoration-neutral-500"
                                  : "text-neutral-100"
                              }`}
                            >
                              {todo.text}
                            </span>
                          </div>

                          {/* Right: Timestamp or Status badge */}
                          <div className="shrink-0 flex items-center gap-2">
                            {todo.completed ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {todo.completedAt ? (
                                  <span>{todo.completedAt}</span>
                                ) : (
                                  <span>Done</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff5733]/15 text-[#ff5733] border border-[#ff5733]/30">
                                Incomplete
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
