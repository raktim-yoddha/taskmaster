import React, { useState } from "react";
import { DailyHistoryRecord, TodoItem } from "../types";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  TrendingUp,
  Archive,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  AlertTriangle
} from "lucide-react";

interface HistoryViewProps {
  history: DailyHistoryRecord[];
  retentionDays: number;
  accentColor: string;
  searchQuery?: string;
  onRestoreTodos: (todos: TodoItem[]) => Promise<void>;
  onDeleteHistoryRecord?: (id: string) => Promise<void>;
  onOpenSettings?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history = [],
  retentionDays = 7,
  accentColor = "#ff5733",
  searchQuery = "",
  onRestoreTodos,
  onDeleteHistoryRecord,
}) => {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [restoringDayId, setRestoringDayId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<DailyHistoryRecord | null>(null);

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

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Overview Stats Cards - Cleaned and trimmed down */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Archived Days</span>
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalDays}
            </span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2ea043]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalCompleted}
            </span>
            <span className="text-xs font-mono text-neutral-500">
              / {totalTasks}
            </span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Success Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#ff5733]" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {completionRate}%
            </span>
          </div>
        </div>

        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Retention Window</span>
          </div>
          <div className="mt-2.5">
            <span className="text-lg font-bold font-mono text-white tracking-tight">
              {retentionDays === 7 ? "7 Days" : retentionDays === 14 ? "14 Days" : retentionDays === 30 ? "30 Days" : `${retentionDays} Days`}
            </span>
          </div>
        </div>
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
              : "At your daily reset time, active to-dos automatically archive into history stacks and reset for a fresh day. Completed tasks track their exact checklist timestamp."}
          </p>
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
                      <span className="text-sm font-bold text-white tracking-tight">
                        {record.formattedDate || record.date}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Progress Pill */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Delete Entire Card Button */}
                    <button
                      type="button"
                      onClick={() => setCardToDelete(record)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/25 transition-all cursor-pointer"
                      title="Delete this entire daily history card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Progress Bar pill with to-dos done on the left */}
                    <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      <span className="text-[11px] font-mono text-neutral-400 whitespace-nowrap">
                        {completedCount} out of {totalCount}
                      </span>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? "#ff6847" : accentColor,
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
                        <span>Carry Over</span>
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
                              ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
                              : "bg-[#ff5733]/[0.035] border-[#ff5733]/15 hover:border-[#ff5733]/25"
                          }`}
                        >
                          {/* Left: Dimmed Green Checkmark or Subtle Terracotta Cross */}
                          <div className="flex items-center gap-3 min-w-0">
                            {todo.completed ? (
                              <div
                                className="w-5 h-5 rounded-full bg-[#2ea043]/15 border border-[#2ea043]/30 flex items-center justify-center text-[#2ea043] shrink-0"
                                title="Completed task"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400/80 shrink-0"
                                title="Incomplete at rollover"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <span
                              className={`text-xs font-medium truncate ${
                                todo.completed
                                  ? "text-neutral-300"
                                  : "text-neutral-100"
                              }`}
                            >
                              {todo.text}
                            </span>
                          </div>

                          {/* Right: Timestamp or Status badge - neutral badge with dimmed green clock icon only */}
                          <div className="shrink-0 flex items-center gap-2">
                            {todo.completed ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08] flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5 text-[#2ea043]" />
                                <span>{todo.completedAt || "Done"}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300/80 border border-rose-500/20">
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

      {/* Delete Confirmation Warning Pop-up Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200 select-none">
          <div
            className="relative w-full max-w-md rounded-[24px] liquid-glass-card border border-white/[0.12] p-6 shadow-2xl space-y-5 text-neutral-100 overflow-hidden"
            style={{
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Ambient Coral Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-[#ff5733]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Header: Title and Dismiss */}
            <div className="flex items-start justify-between gap-3 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[#ff6847] shrink-0 shadow-inner">
                  <Trash2 className="w-4 h-4 text-[#ff5733]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Delete Daily History Card?
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Permanently remove this archived record
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Card Preview */}
            <div className="rounded-2xl bg-black/35 border border-white/[0.07] p-4 space-y-2 relative">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white tracking-tight flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#ff5733]" />
                  {cardToDelete.formattedDate || cardToDelete.date}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
                  {cardToDelete.todos.length} {cardToDelete.todos.length === 1 ? "task" : "tasks"}
                </span>
              </div>
              {cardToDelete.title && (
                <p className="text-[11px] text-neutral-400 truncate">
                  Goal: <span className="text-neutral-300 font-medium">{cardToDelete.title}</span>
                </p>
              )}
            </div>

            {/* Warning Text */}
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 relative">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ff5733] shrink-0" />
              <span>This card and all its archived tasks will be permanently removed.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-white/[0.08] relative">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteHistoryRecord) {
                    await onDeleteHistoryRecord(cardToDelete.id);
                  }
                  setCardToDelete(null);
                }}
                className="liquid-coral-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete History Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
