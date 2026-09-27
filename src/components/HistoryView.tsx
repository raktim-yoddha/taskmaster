import React, { useState, useMemo } from "react";
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
  AlertTriangle,
  Flame,
  Trophy,
  ListTodo,
  Info,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface HistoryViewProps {
  history: DailyHistoryRecord[];
  currentTodos?: TodoItem[];
  retentionDays: number;
  accentColor: string;
  searchQuery?: string;
  onRestoreTodos: (todos: TodoItem[]) => Promise<void>;
  onDeleteHistoryRecord?: (id: string) => Promise<void>;
  onOpenSettings?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history = [],
  currentTodos = [],
  retentionDays: _retentionDays = 7,
  accentColor = "#ff5733",
  searchQuery = "",
  onRestoreTodos,
  onDeleteHistoryRecord,
}) => {
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [restoringDayId, setRestoringDayId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<DailyHistoryRecord | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    formattedDate: string;
    completed: number;
    incomplete: number;
    total: number;
    netScore: number;
    isFuture: boolean;
  } | null>(null);

  const toggleDayCollapse = (id: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Base current date for calculations
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayKey = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, [today]);

  // Aggregate day-by-day activity across history and current active tasks
  const activityByDate = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        formattedDate: string;
        completed: number;
        incomplete: number;
        total: number;
        netScore: number;
      }
    > = {};

    // 1. Process archived records
    history.forEach((record) => {
      const dateKey = record.date;
      if (!dateKey) return;
      const completed = record.completedCount ?? record.todos.filter((t) => t.completed).length;
      const total = record.totalCount ?? record.todos.length;
      const incomplete = Math.max(0, total - completed);

      if (map[dateKey]) {
        map[dateKey].completed += completed;
        map[dateKey].incomplete += incomplete;
        map[dateKey].total += total;
        map[dateKey].netScore = map[dateKey].completed - map[dateKey].incomplete;
      } else {
        map[dateKey] = {
          date: dateKey,
          formattedDate: record.formattedDate || dateKey,
          completed,
          incomplete,
          total,
          netScore: completed - incomplete,
        };
      }
    });

    // 2. Add today's live tasks if any
    if (currentTodos && currentTodos.length > 0) {
      const todayCompleted = currentTodos.filter((t) => t.completed).length;
      const todayIncomplete = currentTodos.filter((t) => !t.completed).length;
      const todayTotal = currentTodos.length;
      const todayFormatted = today.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      if (map[todayKey]) {
        map[todayKey].completed += todayCompleted;
        map[todayKey].incomplete += todayIncomplete;
        map[todayKey].total += todayTotal;
        map[todayKey].netScore = map[todayKey].completed - map[todayKey].incomplete;
      } else {
        map[todayKey] = {
          date: todayKey,
          formattedDate: todayFormatted,
          completed: todayCompleted,
          incomplete: todayIncomplete,
          total: todayTotal,
          netScore: todayCompleted - todayIncomplete,
        };
      }
    }

    return map;
  }, [history, currentTodos, today, todayKey]);

  // Overall statistics for Block 1 & Block 2
  const { totalCompleted, totalIncomplete, totalTasks, completionRate } = useMemo(() => {
    let completed = 0;
    let incomplete = 0;

    Object.values(activityByDate).forEach((day) => {
      completed += day.completed;
      incomplete += day.incomplete;
    });

    const total = completed + incomplete;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalCompleted: completed,
      totalIncomplete: incomplete,
      totalTasks: total,
      completionRate: rate,
    };
  }, [activityByDate]);

  // Calculate percentage change in success rate from yesterday
  const successRateComparison = useMemo(() => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const yesterdayData = activityByDate[yesterdayKey];

    const todayData = activityByDate[todayKey];
    const todayTotal = todayData?.total || 0;
    const todayCompleted = todayData?.completed || 0;

    const completedPrior = totalCompleted - todayCompleted;
    const totalPrior = totalTasks - todayTotal;

    let diff = 0;
    if (totalPrior > 0) {
      const priorRate = Math.round((completedPrior / totalPrior) * 100);
      diff = completionRate - priorRate;
    } else if (yesterdayData && yesterdayData.total > 0) {
      const yesterdayDailyRate = Math.round((yesterdayData.completed / yesterdayData.total) * 100);
      diff = completionRate - yesterdayDailyRate;
    } else {
      diff = 0;
    }

    return diff;
  }, [activityByDate, today, todayKey, totalCompleted, totalTasks, completionRate]);

  // Streak calculation (Block 3 & Block 4)
  const { currentStreak, longestStreak } = useMemo(() => {
    const formatDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    let streak = 0;
    const checkDate = new Date(today);

    // Check today:
    const todayAct = activityByDate[formatDateKey(checkDate)];
    if (todayAct && todayAct.completed > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const prevAct = activityByDate[formatDateKey(checkDate)];
        if (prevAct && prevAct.completed > 0) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // If today has no completed tasks yet, check from yesterday so in-progress day doesn't break active streak
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayAct = activityByDate[formatDateKey(checkDate)];
      if (yesterdayAct && yesterdayAct.completed > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        while (true) {
          const prevAct = activityByDate[formatDateKey(checkDate)];
          if (prevAct && prevAct.completed > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Longest streak across all recorded history
    const activeDates = Object.keys(activityByDate)
      .filter((k) => activityByDate[k].completed > 0)
      .sort();

    let maxStreak = 0;
    let runningStreak = 0;
    let lastDate: Date | null = null;

    for (const dateStr of activeDates) {
      const [y, m, d] = dateStr.split("-").map(Number);
      const curr = new Date(y, m - 1, d);
      if (!lastDate) {
        runningStreak = 1;
      } else {
        const diffDays = Math.round((curr.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          runningStreak++;
        } else {
          runningStreak = 1;
        }
      }
      if (runningStreak > maxStreak) {
        maxStreak = runningStreak;
      }
      lastDate = curr;
    }

    maxStreak = Math.max(maxStreak, streak);

    return { currentStreak: streak, longestStreak: maxStreak };
  }, [activityByDate, today]);

  // Generate 53 weeks (1 year) grid for the GitHub-style heatmap
  const { weeks, monthLabels } = useMemo(() => {
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    // End of the current week (Saturday):
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));

    // Start date: 53 weeks * 7 days - 1 day before endOfWeek
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - (53 * 7 - 1));

    const weeksList: Array<{
      weekIndex: number;
      days: Array<{
        date: string;
        dateObj: Date;
        dayOfWeek: number;
        isFuture: boolean;
        activity: (typeof activityByDate)[string] | null;
      }>;
    }> = [];

    const months: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;
    const cursor = new Date(startDate);

    for (let w = 0; w < 53; w++) {
      const days = [];
      let weekMonth = -1;

      for (let d = 0; d < 7; d++) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
        const isFuture = cursor > today;
        const activity = activityByDate[dateKey] || null;

        days.push({
          date: dateKey,
          dateObj: new Date(cursor),
          dayOfWeek: cursor.getDay(),
          isFuture,
          activity,
        });

        if (cursor.getDate() === 1 || (w === 0 && d === 0)) {
          weekMonth = cursor.getMonth();
        }

        cursor.setDate(cursor.getDate() + 1);
      }

      weeksList.push({ weekIndex: w, days });

      if (weekMonth !== -1 && weekMonth !== lastMonth) {
        const monthName = new Date(weeksList[w].days[0].dateObj).toLocaleDateString("en-US", { month: "short" });
        months.push({ label: monthName, weekIndex: w });
        lastMonth = weekMonth;
      }
    }

    return { weeks: weeksList, monthLabels: months };
  }, [activityByDate, today]);

  // Year totals for heatmap header
  const { netScoreInYear, activeDaysInYear } = useMemo(() => {
    let net = 0;
    let activeDays = 0;

    weeks.forEach((w) => {
      w.days.forEach((d) => {
        if (!d.isFuture && d.activity && d.activity.total > 0) {
          net += d.activity.netScore;
          activeDays++;
        }
      });
    });

    return {
      netScoreInYear: net,
      activeDaysInYear: activeDays,
    };
  }, [weeks]);

  // Determine cell color based on net score: completed minus incomplete
  const getCellColor = (day: (typeof weeks)[0]["days"][0]) => {
    if (day.isFuture) {
      return {
        className: "bg-white/[0.02] border border-transparent opacity-25 pointer-events-none",
        style: {},
      };
    }

    const act = day.activity;
    if (!act || act.total === 0) {
      return {
        className: "bg-white/[0.04] border border-transparent hover:scale-125 hover:z-20",
        style: {},
      };
    }

    const { netScore } = act;

    // Positive side: more completed than incomplete -> Green scale (uniform solid colors, no bright outlines)
    if (netScore > 0) {
      if (netScore === 1) {
        return {
          className: "bg-[#0e4429] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      } else if (netScore <= 3) {
        return {
          className: "bg-[#006d32] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      } else if (netScore <= 5) {
        return {
          className: "bg-[#26a641] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      } else {
        return {
          className: "bg-[#39d353] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      }
    }

    // Negative side: more incomplete than completed -> Orange scale (uniform solid colors, no bright outlines)
    if (netScore < 0) {
      const abs = Math.abs(netScore);
      if (abs === 1) {
        return {
          className: "bg-[#4a221a] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      } else if (abs <= 3) {
        return {
          className: "bg-[#7a2e1d] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      } else if (abs <= 5) {
        return {
          className: "bg-[#bd3d1e] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      } else {
        return {
          className: "bg-[#ff5733] border border-transparent hover:scale-125 hover:z-20",
          style: {},
        };
      }
    }

    // netScore === 0 but total > 0 (equal completed & incomplete)
    return {
      className: "bg-[#785b12] border border-transparent hover:scale-125 hover:z-20",
      style: {},
    };
  };

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    day: (typeof weeks)[0]["days"][0]
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      date: day.date,
      formattedDate:
        day.activity?.formattedDate ||
        day.dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      completed: day.activity?.completed || 0,
      incomplete: day.activity?.incomplete || 0,
      total: day.activity?.total || 0,
      netScore: day.activity?.netScore || 0,
      isFuture: day.isFuture,
    });
  };

  const handleCellMouseLeave = () => {
    setTooltip(null);
  };

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
      {/* Top 4 Metric Overview Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Block 1: Tasks (Completed, Incomplete, Total) */}
        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Tasks Overview</span>
            <ListTodo className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-2xl font-bold font-mono text-white tracking-tight">{totalTasks}</span>
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider ml-1.5">Total</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
              <span
                className="bg-white/[0.05] border border-white/[0.08] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[#39d353] font-semibold"
                title={`${totalCompleted} completed`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#39d353]" />
                <span>{totalCompleted}</span>
              </span>
              <span
                className="bg-white/[0.05] border border-white/[0.08] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[#ff5733] font-semibold"
                title={`${totalIncomplete} incomplete`}
              >
                <XCircle className="w-3.5 h-3.5 text-[#ff5733]" />
                <span>{totalIncomplete}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Block 2: Success Rate in % */}
        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Success Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span
              className={`text-2xl font-bold font-mono tracking-tight ${
                successRateComparison > 0
                  ? "text-[#39d353]"
                  : successRateComparison < 0
                  ? "text-[#ff5733]"
                  : "text-neutral-300"
              }`}
            >
              {completionRate}%
            </span>
            {successRateComparison > 0 && (
              <ArrowUp className="w-4 h-4 text-[#39d353] stroke-[2.5]" />
            )}
            {successRateComparison < 0 && (
              <ArrowDown className="w-4 h-4 text-[#ff5733] stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Block 3: Current Streak */}
        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Current Streak</span>
            <Flame className="w-3.5 h-3.5 text-[#ff5733]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {currentStreak}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Block 4: Longest Streak */}
        <div className="liquid-glass-card rounded-[20px] p-4 flex flex-col justify-between border border-white/[0.07] shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Longest Streak</span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {longestStreak}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {longestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      {/* 1-Year GitHub-Style Activity & Streak Heatmap */}
      <div className="liquid-glass-card rounded-[22px] p-5 sm:p-6 border border-white/[0.08] shadow-xl space-y-4">
        {/* Heatmap Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ff5733] flex items-center justify-center text-white shadow-md shadow-[#ff5733]/25">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Yearly Activity Heatmap
              </h3>
            </div>
          </div>

          {/* Quick stats on the right */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300">
              Net Score:{" "}
              <strong className={netScoreInYear >= 0 ? "text-[#39d353]" : "text-[#ff5733]"}>
                {netScoreInYear >= 0 ? `+${netScoreInYear}` : netScoreInYear}
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300">
              Active Days: <strong className="text-white">{activeDaysInYear}</strong>
            </span>
          </div>
        </div>

        {/* Heatmap Grid (53 weeks x 7 days) */}
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-2 pb-1">
          <div className="min-w-[760px] select-none">
            {/* Month Labels Header */}
            <div className="flex text-[10px] text-neutral-400 font-medium pl-8 mb-1.5 h-4 relative">
              {monthLabels.map((m, idx) => (
                <span
                  key={`${m.label}-${idx}`}
                  className="absolute truncate"
                  style={{ left: `${m.weekIndex * 14 + 32}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Grid with Weekday Labels */}
            <div className="flex gap-2">
              {/* Day of Week Labels (Mon, Wed, Fri matching GitHub) */}
              <div className="flex flex-col justify-between text-[9px] font-medium text-neutral-500 w-6 h-[98px] py-[2px] shrink-0">
                <span className="leading-none h-3"></span>
                <span className="leading-none h-3">Mon</span>
                <span className="leading-none h-3"></span>
                <span className="leading-none h-3">Wed</span>
                <span className="leading-none h-3"></span>
                <span className="leading-none h-3">Fri</span>
                <span className="leading-none h-3"></span>
              </div>

              {/* 53 Columns of 7 Days */}
              <div className="flex gap-[3px] flex-1">
                {weeks.map((week) => (
                  <div key={week.weekIndex} className="flex flex-col gap-[3px] shrink-0">
                    {week.days.map((day) => {
                      const cellStyle = getCellColor(day);
                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                          onMouseLeave={handleCellMouseLeave}
                          className={`w-[11px] h-[11px] rounded-[2.5px] transition-all duration-150 cursor-pointer ${cellStyle.className}`}
                          style={cellStyle.style}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Card Footer: Math explanation and scale legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06] text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Day math = completed − incomplete to-dos (green is positive, orange is negative)</span>
          </div>

          {/* GitHub-style Legend */}
          <div className="flex items-center gap-1.5 text-[10px] font-medium self-end sm:self-auto select-none">
            <span className="text-[#ff5733]">More Incomplete</span>
            <div className="flex items-center gap-[2.5px] px-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#ff5733] border border-transparent" title="Incomplete >= 6 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#bd3d1e] border border-transparent" title="Incomplete 4-5 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#7a2e1d] border border-transparent" title="Incomplete 2-3 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#4a221a] border border-transparent" title="Incomplete 1 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-white/[0.04] border border-transparent" title="No tasks / Balanced" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#0e4429] border border-transparent" title="Completed 1 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#006d32] border border-transparent" title="Completed 2-3 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#26a641] border border-transparent" title="Completed 4-5 net" />
              <div className="w-[11px] h-[11px] rounded-[2px] bg-[#39d353] border border-transparent" title="Completed >= 6 net" />
            </div>
            <span className="text-[#39d353]">More Done</span>
          </div>
        </div>
      </div>

      {/* Floating Day Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-[#14161a]/95 backdrop-blur-2xl border border-white/20 shadow-2xl text-white text-xs space-y-1 animate-in fade-in zoom-in-95 duration-75"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className="font-semibold text-neutral-200 text-[11px] pb-1 border-b border-white/10 whitespace-nowrap">
            {tooltip.formattedDate}
          </div>
          {tooltip.isFuture ? (
            <div className="text-[10px] text-neutral-400 italic">Upcoming day</div>
          ) : tooltip.total === 0 ? (
            <div className="text-[10px] text-neutral-400 whitespace-nowrap">No to-dos recorded on this day</div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-[#39d353] font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39d353]" />
                  {tooltip.completed} done
                </span>
                <span className="text-[#ff5733] font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5733]" />
                  {tooltip.incomplete} incomplete
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/[0.08] text-[10px]">
                <span className="text-neutral-400">
                  Net Math ({tooltip.completed} − {tooltip.incomplete}):
                </span>
                <span
                  className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                    tooltip.netScore > 0
                      ? "text-[#39d353] bg-[#2ea043]/20"
                      : tooltip.netScore < 0
                      ? "text-[#ff5733] bg-[#ff5733]/20"
                      : "text-amber-400 bg-amber-400/20"
                  }`}
                >
                  {tooltip.netScore > 0 ? `+${tooltip.netScore}` : tooltip.netScore}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Stacks List */}
      {filteredHistory.length === 0 ? (
        <div className="liquid-glass-card rounded-[22px] p-10 text-center border border-white/[0.06] shadow-xl flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ff5733] flex items-center justify-center text-white shadow-lg shadow-[#ff5733]/25">
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
