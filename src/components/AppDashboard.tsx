import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { OverlayState, OverlayTheme, TodoItem } from "../types";
import { UseTimerReturn } from "../hooks/useTimer";
import { FocusTimer } from "./FocusTimer";
import { fontFamilies } from "./StickyWidget";
import { SegmentedControl } from "./SegmentedControl";
import { HistoryView } from "./HistoryView";
import { SettingsModal } from "./SettingsModal";
import {
  Check,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  GripVertical,
  Target,
  CheckSquare,
  ArrowUpCircle,
  Archive,
  Sparkles,
  Minus,
  Copy,
  X,
  Flame,
  Hourglass,
  Clock,
  Lightbulb,
  Search,
  TrendingUp,
  Square,
  Calendar,
  Settings
} from "lucide-react";
import { checkForUpdate, UpdateInfo, CURRENT_VERSION } from "../utils/updater";
import { UpdateNotificationModal } from "./UpdateNotificationModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AppDashboardProps {
  state: OverlayState;
  timer: UseTimerReturn;
  onAddTodo: (text: string) => Promise<void>;
  onToggleTodo: (id: string) => Promise<void>;
  onEditTodo: (id: string, text: string) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onReorderTodos: (fromIndex: number, toIndex: number) => Promise<void>;
  onSetTitle: (title: string) => Promise<void>;
  onUpdateTheme: (newTheme: OverlayTheme) => Promise<void>;
  onUpdateRetentionDays: (days: number) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onDeleteHistoryRecord: (id: string) => Promise<void>;
  onRestoreTodos: (todos: TodoItem[]) => Promise<void>;
  onRolloverDailyTodos: () => Promise<void>;
  onUpdateDailyResetTime?: (time: string) => Promise<void>;
}

type DashboardView = "todo" | "history";

interface SortableGoalRowProps {
  todo: TodoItem;
  index: number;
  total: number;
  accentColor: string;
  fontFamily?: string;
  isFocused: boolean;
  isQueueMode: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onFocusTask: (id: string) => void;
}

const SortableGoalRow: React.FC<SortableGoalRowProps> = ({
  todo,
  index: _index,
  total: _total,
  accentColor,
  fontFamily,
  isFocused,
  isQueueMode,
  onToggle,
  onEdit,
  onDelete,
  onFocusTask,
}) => {
  const isReorderDisabled = isQueueMode && todo.completed;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: isReorderDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.4 : 1,
  };

  const [localText, setLocalText] = useState(todo.text);

  useEffect(() => {
    setLocalText(todo.text);
  }, [todo.text]);

  const handleBlur = () => {
    if (localText.trim() && localText !== todo.text) {
      onEdit(todo.id, localText.trim());
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group liquid-glass-row rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-all duration-200 ${isFocused
          ? "border-[#ff5733]/60 bg-[#ff5733]/[0.08] ring-1 ring-[#ff5733]/30 shadow-lg shadow-[#ff5733]/10"
          : "border-white/[0.06] hover:border-white/[0.12]"
        } ${isDragging ? "ring-2 ring-[#ff5733]/60 z-50 shadow-2xl scale-[1.01]" : ""}`}
    >
      {/* Checkbox button */}
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className="w-5 h-5 min-w-[20px] rounded-lg border flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        style={{
          borderColor: todo.completed ? accentColor : "rgba(255, 255, 255, 0.18)",
          backgroundColor: todo.completed ? accentColor : "rgba(20, 22, 26, 0.5)",
          boxShadow: todo.completed ? `0 2px 10px ${accentColor}50` : "none",
        }}
      >
        {todo.completed && (
          <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
        )}
      </button>

      {/* Drag Handle - compact, disabled for completed tasks in queue mode */}
      {!isReorderDisabled ? (
        <div
          {...attributes}
          {...listeners}
          className="-mr-1 p-0.5 cursor-grab active:cursor-grabbing text-neutral-500 hover:text-neutral-300 transition-colors touch-none select-none rounded hover:bg-white/[0.05]"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      ) : (
        <div className="w-4 shrink-0" />
      )}

      {/* Task text editable input */}
      <input
        type="text"
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlur();
        }}
        style={fontFamily ? { fontFamily } : undefined}
        className={`flex-1 bg-transparent text-[13px] font-medium text-white focus:outline-none focus:bg-white/[0.05] rounded-lg px-2 py-1 transition-colors ${todo.completed ? "line-through text-neutral-400 opacity-60" : ""
          }`}
      />

      {/* Tracked completion timestamp badge (visible in application, not in widget) */}
      {todo.completed && todo.completedAt && (
        <span
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-neutral-300 select-none animate-in fade-in"
          title={`Checked at ${todo.completedAt}`}
        >
          <Clock className="w-2.5 h-2.5 text-[#2ea043]" />
          <span>{todo.completedAt}</span>
        </span>
      )}

      {/* Action buttons on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Link to focus timer */}
        <button
          type="button"
          onClick={() => onFocusTask(todo.id)}
          className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${isFocused
              ? "text-[#ff5733] bg-[#ff5733]/15 border border-[#ff5733]/30 shadow-sm"
              : "text-neutral-400 hover:text-[#ff5733] hover:bg-[#ff5733]/10"
            }`}
          title={isFocused ? "Currently active focus task" : "Focus on this task in Timer"}
        >
          <Target className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          className="p-1.5 text-neutral-400 hover:text-[#ff5733] hover:bg-[#ff5733]/15 rounded-lg transition-colors cursor-pointer"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const AppDashboard: React.FC<AppDashboardProps> = ({
  state,
  timer,
  onAddTodo,
  onToggleTodo,
  onEditTodo,
  onDeleteTodo,
  onReorderTodos,
  onSetTitle,
  onUpdateTheme,
  onUpdateRetentionDays,
  onClearHistory,
  onDeleteHistoryRecord,
  onRestoreTodos,
  onRolloverDailyTodos,
  onUpdateDailyResetTime,
}) => {
  const [activeView, setActiveView] = useState<DashboardView>("todo");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [titleInput, setTitleInput] = useState(state.title);
  const [newTodoText, setNewTodoText] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<"daily" | "appearance" | "updates">("daily");

  // Auto-update notification state
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);

  // Sync widget window visibility state
  useEffect(() => {
    async function checkWidget() {
      try {
        const open = await invoke<boolean>("is_widget_open");
        setIsWidgetOpen(open);
      } catch {
        // In preview mode
      }
    }
    checkWidget();
    const interval = setInterval(checkWidget, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to window maximize state
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    async function initMaximizedState() {
      try {
        const appWindow = getCurrentWebviewWindow();
        if (appWindow) {
          const max = await appWindow.isMaximized();
          setIsMaximized(max);
          unlisten = await appWindow.onResized(async () => {
            const isMax = await appWindow.isMaximized();
            setIsMaximized(isMax);
          });
        }
      } catch {
        // In preview mode or web environment
      }
    }
    initMaximizedState();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWebviewWindow();
      await appWindow.minimize();
    } catch {
      try {
        await invoke("minimize_main_window");
      } catch (err) {
        console.warn("Minimize window failed:", err);
      }
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const appWindow = getCurrentWebviewWindow();
      await appWindow.toggleMaximize();
      const max = await appWindow.isMaximized();
      setIsMaximized(max);
    } catch {
      try {
        const max = await invoke<boolean>("toggle_maximize_main_window");
        setIsMaximized(max);
      } catch (err) {
        console.warn("Toggle maximize failed:", err);
      }
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWebviewWindow();
      await appWindow.close();
    } catch {
      try {
        await invoke("close_main_window");
      } catch (err) {
        console.warn("Close window failed:", err);
      }
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, a, [data-no-drag]")) return;
    try {
      const appWindow = getCurrentWebviewWindow();
      appWindow.startDragging();
    } catch {
      // preview mode
    }
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, a, [data-no-drag]")) return;
    handleToggleMaximize();
  };

  const { theme, todos } = state;
  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const accentColor = theme.accentColor || "#ff5733";

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    setTitleInput(state.title);
  }, [state.title]);

  // Automatic update check on app launch
  useEffect(() => {
    const checkTimer = setTimeout(async () => {
      try {
        const info = await checkForUpdate();
        if (info && info.hasUpdate) {
          setUpdateInfo(info);
          const dismissed = localStorage.getItem("dismissed_update_version");
          if (dismissed !== info.version) {
            setIsUpdateModalOpen(true);
          }
        }
      } catch (e) {
        console.warn("Auto update check failed:", e);
      }
    }, 2500);

    return () => clearTimeout(checkTimer);
  }, []);

  const handleManualCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMessage(null);
    try {
      const info = await checkForUpdate();
      if (info && info.hasUpdate) {
        setUpdateInfo(info);
        setIsUpdateModalOpen(true);
        setUpdateStatusMessage(`Update v${info.version} available!`);
      } else {
        setUpdateStatusMessage(`You're running the latest version (v${CURRENT_VERSION}).`);
      }
    } catch (e) {
      setUpdateStatusMessage("Could not connect to update server.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleToggleWidget = async () => {
    try {
      const nextState = await invoke<boolean>("toggle_widget_window");
      setIsWidgetOpen(nextState);
    } catch (err) {
      console.error("Error toggling widget window:", err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    await onAddTodo(newTodoText.trim());
    setNewTodoText("");
  };

  const handleResetAll = async () => {
    for (const t of todos) {
      if (t.completed) {
        await onToggleTodo(t.id);
      }
    }
  };


  const handleTitleBlur = async () => {
    if (titleInput.trim() && titleInput !== state.title) {
      await onSetTitle(titleInput.trim());
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = todos.findIndex((t) => t.id === active.id);
    let newIndex = todos.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const isQueue = theme.completionOrder === "queue";
    if (isQueue) {
      // Completed tasks cannot be moved in queue mode
      if (todos[oldIndex]?.completed) return;

      // Unchecked tasks cannot be placed past the first completed task
      const firstCompletedIdx = todos.findIndex((t) => t.completed);
      if (firstCompletedIdx !== -1 && newIndex >= firstCompletedIdx) {
        newIndex = Math.max(0, firstCompletedIdx - 1);
      }
    }

    if (oldIndex !== newIndex) {
      onReorderTodos(oldIndex, newIndex);
    }
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (searchQuery.trim() && !t.text.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen text-neutral-100 flex flex-col font-sans selection:bg-[#ff5733]/30">
      {/* Liquid Glass Desktop Header & Navigation Bar */}
      <header
        data-tauri-drag-region
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={handleHeaderDoubleClick}
        className="liquid-glass-shell border-b border-white/[0.08] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-2xl select-none"
      >
        {/* Left: App Logo & View Switcher */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0" data-no-drag>
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo2.png"
              alt="Taskmaster Logo"
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain select-none transition-transform hover:scale-105 duration-200"
            />
            <span className="text-sm font-bold tracking-tight text-white select-none whitespace-nowrap">
              Taskmaster
            </span>
          </div>

          {/* Desktop View Navigation Switcher (Segmented Liquid Glass Pills) */}
          <SegmentedControl
            as="nav"
            options={[
              {
                id: "todo",
                label: "To do",
                icon: <CheckSquare className="w-3.5 h-3.5 shrink-0" />,
                title: "To do: Task List & Focus Timer",
              },
              {
                id: "history",
                label: "History",
                icon: <Calendar className="w-3.5 h-3.5 shrink-0" />,
                title: "History: Daily Task Stacks & Archive",
              },
            ]}
            value={activeView}
            onChange={(val) => setActiveView(val as "todo" | "history")}
          />
        </div>

        {/* Center: Search pill (visible on wide screens for both To-do and History) */}
        <div className="relative hidden lg:flex items-center max-w-xs flex-1 min-w-0 mx-2" data-no-drag>
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder={activeView === "history" ? "Search past tasks or dates..." : "Search tasks or goals..."}
            value={activeView === "history" ? historySearchQuery : searchQuery}
            onChange={(e) => {
              if (activeView === "history") {
                setHistorySearchQuery(e.target.value);
              } else {
                setSearchQuery(e.target.value);
              }
            }}
            className="w-full bg-[#16181c]/90 border border-white/[0.08] hover:border-white/[0.14] focus:border-[#ff5733]/65 rounded-full pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-neutral-500 transition-all focus:outline-none focus:ring-2 focus:ring-[#ff5733]/20"
          />
          {(activeView === "history" ? historySearchQuery : searchQuery) && (
            <button
              type="button"
              onClick={() => {
                if (activeView === "history") {
                  setHistorySearchQuery("");
                } else {
                  setSearchQuery("");
                }
              }}
              className="absolute right-3 text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right: Update, Timer Badge, Widget Action & Window Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0" data-no-drag>
          {/* Update Available Header Notification Pill */}
          {updateInfo && updateInfo.hasUpdate && (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff5733]/15 text-[#ff5733] border border-[#ff5733]/30 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#ff5733]/25 transition-all shadow-sm"
              title="Click to view update details"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-[#ff5733] shrink-0" />
              <span className="whitespace-nowrap">v{updateInfo.version} Available!</span>
            </button>
          )}

          {/* Mini Running Timer Badge (Matching Coral Theme) */}
          {timer.timerState.isRunning && (
            <button
              type="button"
              onClick={() => setActiveView("todo")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff5733]/15 border border-[#ff5733]/30 text-[#ff5733] text-xs font-mono font-bold whitespace-nowrap shrink-0 animate-pulse cursor-pointer shadow-sm shadow-[#ff5733]/10"
              title="Click to view running timer"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff5733] animate-ping shrink-0" />
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                {timer.timerState.mode === "stopwatch" ? (
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                ) : timer.timerState.mode === "pomodoro" ? (
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Hourglass className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {Math.floor(timer.timerState.timeRemaining / 60)}:
                  {(timer.timerState.timeRemaining % 60).toString().padStart(2, "0")}
                </span>
              </span>
            </button>
          )}

          {/* Sticky Widget Toggle Button (Theme-matching pill button) */}
          <button
            type="button"
            onClick={handleToggleWidget}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-md cursor-pointer ${isWidgetOpen
                ? "bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12]"
                : "liquid-coral-btn"
              }`}
            title={isWidgetOpen ? "Close floating desktop widget" : "Open floating desktop widget"}
          >
            {isWidgetOpen ? (
              <>
                <X className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Close Widget</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current shrink-0" />
                <span className="whitespace-nowrap">Open Widget</span>
              </>
            )}
          </button>

          {/* Settings Gear Icon Button */}
          <button
            type="button"
            onClick={() => {
              setSettingsDefaultTab("daily");
              setIsSettingsModalOpen(true);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
            title="Settings (Daily To-Do, Appearance, Updates)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Native Windows Controls */}
          <div className="flex items-center ml-1 sm:ml-2 border-l border-white/[0.08] pl-1.5 sm:pl-2 gap-1 shrink-0">
            <button
              type="button"
              onClick={handleMinimize}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleToggleMaximize}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Copy className="w-3 h-3 rotate-180" />
              ) : (
                <Square className="w-3 h-3" />
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#ff5733] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeView === "history" ? (
          <HistoryView
            history={state.history || []}
            retentionDays={state.historyRetentionDays || 7}
            accentColor={accentColor}
            searchQuery={historySearchQuery}
            onRestoreTodos={onRestoreTodos}
            onDeleteHistoryRecord={onDeleteHistoryRecord}
            onOpenSettings={() => {
              setSettingsDefaultTab("daily");
              setIsSettingsModalOpen(true);
            }}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top 4 Metric Summary Cards matching reference image */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Goals */}
              <div className="liquid-glass-card rounded-[22px] p-5 flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Total Goals
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {totalCount}
                  </span>
                  <span className="bg-white/[0.06] text-neutral-300 border border-white/[0.08] rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                    {totalCount - completedCount} active
                  </span>
                </div>
              </div>

              {/* Card 2: Completed */}
              <div className="liquid-glass-card rounded-[22px] p-5 flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Goals Completed
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {completedCount}
                  </span>
                  <span className="bg-[#ff5733]/15 text-[#ff5733] border border-[#ff5733]/30 rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                    <TrendingUp className="w-3 h-3" />
                    +{progressPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Card 3: Focus Cycles */}
              <div className="liquid-glass-card rounded-[22px] p-5 flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Focus Cycles
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {timer.timerState.currentRound}
                  </span>
                  <span className="bg-white/[0.08] text-white border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                    {timer.timerState.pomodoroPhase}
                  </span>
                </div>
              </div>

              {/* Card 4: Timer Engine */}
              <div className="liquid-glass-card rounded-[22px] p-5 flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Timer Mode
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-xl font-bold text-white tracking-tight uppercase">
                    {timer.timerState.mode}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${timer.timerState.isRunning
                      ? "bg-[#ff5733]/15 text-[#ff5733] border border-[#ff5733]/30"
                      : "bg-white/[0.06] text-neutral-400 border border-white/[0.08]"
                    }`}>
                    {timer.timerState.isRunning ? "RUNNING" : "STANDBY"}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Workspace: Tasks Panel & Focus Timer */}
            <div className="grid gap-6 items-start grid-cols-1 lg:grid-cols-12">
              {/* Tasks Panel */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Tasks Container Card */}
                <div className="liquid-glass-card rounded-[22px] p-6 shadow-2xl flex flex-col">
                  {/* Top Bar: Title & Counters */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleTitleBlur();
                        }}
                        className="bg-transparent text-base font-bold text-white tracking-tight focus:outline-none focus:bg-white/[0.05] rounded px-1.5 py-0.5 uppercase"
                        placeholder="Today's Focus"
                      />
                    </div>

                    {/* Progress pill & Quick Actions */}
                    <div className="flex items-center gap-2">
                      {/* Archive Button on the left side of the completion bar */}
                      <button
                        type="button"
                        onClick={onRolloverDailyTodos}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Archive current to-dos into History and start a fresh day"
                      >
                        <Archive className="w-3.5 h-3.5 text-[#ff5733]" />
                        <span>Archive</span>
                      </button>

                      <span className="bg-[#191b20]/80 border border-white/[0.08] rounded-full px-3 py-1 text-xs text-neutral-300 font-mono">
                        {completedCount}/{totalCount} complete
                      </span>

                      <button
                        type="button"
                        onClick={handleResetAll}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer rounded-lg"
                        title="Reset all tasks to incomplete"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Liquid Gradient Progress Line */}
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden my-4">
                    <div
                      className="h-full rounded-full transition-all duration-400 ease-out"
                      style={{
                        width: `${progressPct}%`,
                        background: "linear-gradient(90deg, #ff5733, #ff7a5c)",
                        boxShadow: "0 0 10px rgba(255, 87, 51, 0.45)",
                      }}
                    />
                  </div>

                  {/* Quick Add Task Input Form */}
                  <form onSubmit={handleAddSubmit} className="mt-1 mb-4 flex items-center gap-2.5">
                    <input
                      type="text"
                      placeholder="Add a new goal or task & press Enter..."
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      className="flex-1 min-w-0 liquid-glass-input rounded-full px-4 py-2.5 text-xs text-white placeholder:text-neutral-500 transition-colors"
                    />
                    <button
                      type="submit"
                      className="liquid-coral-btn px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Add Goal</span>
                    </button>
                  </form>

                  {/* Filter tabs: All, Active, Completed */}
                  <div className="flex items-center gap-2 pb-3 text-xs overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className={`px-3.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${filter === "all"
                          ? "bg-[#ff5733] text-white shadow-sm shadow-[#ff5733]/30 border border-[#ff5733]"
                          : "liquid-glass-pill"
                        }`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("active")}
                      className={`px-3.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${filter === "active"
                          ? "bg-[#ff5733] text-white shadow-sm shadow-[#ff5733]/30 border border-[#ff5733]"
                          : "liquid-glass-pill"
                        }`}
                    >
                      Active ({totalCount - completedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("completed")}
                      className={`px-3.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${filter === "completed"
                          ? "bg-[#ff5733] text-white shadow-sm shadow-[#ff5733]/30 border border-[#ff5733]"
                          : "liquid-glass-pill"
                        }`}
                    >
                      Completed ({completedCount})
                    </button>
                  </div>

                  {/* Sortable List of Todos */}
                  <div className="flex flex-col gap-2 mt-1">
                    {filteredTodos.length === 0 ? (
                      <div className="text-center py-12 text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
                        {filter === "completed" ? (
                          <span>No completed tasks yet</span>
                        ) : filter === "active" ? (
                          <div className="flex items-center gap-2 text-[#ff5733] font-medium">
                            <Sparkles className="w-4 h-4 text-[#ff5733]" />
                            <span>All tasks completed! Excellent work</span>
                          </div>
                        ) : (
                          <span>No tasks found matching your filter. Add one above!</span>
                        )}
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={filteredTodos.map((t) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredTodos.map((todo, index) => (
                            <SortableGoalRow
                              key={todo.id}
                              todo={todo}
                              index={index}
                              total={filteredTodos.length}
                              accentColor={accentColor}
                              fontFamily={fontFamilies[theme.font || "inter"]}
                              isQueueMode={theme.completionOrder === "queue"}
                              isFocused={timer.timerState.activeTodoId === todo.id}
                              onToggle={onToggleTodo}
                              onEdit={onEditTodo}
                              onDelete={onDeleteTodo}
                              onFocusTask={(id) => timer.setActiveTodoId(id)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  {/* Bottom App Keyboard Guide */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 select-none">
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-[#ff5733] shrink-0" />
                      <span>Click Target icon on any task to bind it to Focus Timer</span>
                    </span>
                    <span>Hold & drag to reorder</span>
                  </div>
                </div>
              </div>

              {/* Focus Timer Hub (Right Column) */}
              <div className="lg:col-span-5">
                <FocusTimer
                  timer={timer.timerState}
                  todos={todos}
                  accentColor={accentColor}
                  onTogglePlay={timer.togglePlay}
                  onReset={timer.resetTimer}
                  onSetMode={timer.setMode}
                  onSetPhase={timer.setPomodoroPhase}
                  onSkipPhase={timer.skipPhase}
                  onAddFiveMinutes={timer.addFiveMinutes}
                  onSetCountdownDuration={timer.setCountdownDuration}
                  onAddLap={timer.addLap}
                  onSetActiveTodoId={timer.setActiveTodoId}
                  onCompleteTodo={onToggleTodo}
                  onUpdateSettings={timer.updateSettings}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auto-Update Notification Modal */}
      <UpdateNotificationModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onDismissVersion={(v) => localStorage.setItem("dismissed_update_version", v)}
      />

      {/* Unified Liquid Glass Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onUpdateTheme={onUpdateTheme}
        historyRetentionDays={state.historyRetentionDays || 7}
        onUpdateRetentionDays={onUpdateRetentionDays}
        dailyResetTime={state.dailyResetTime || "00:00"}
        onUpdateDailyResetTime={onUpdateDailyResetTime}
        onClearHistory={onClearHistory}
        onManualArchive={onRolloverDailyTodos}
        onCheckUpdates={handleManualCheckUpdates}
        isCheckingUpdate={isCheckingUpdate}
        updateStatusMessage={updateStatusMessage}
        defaultTab={settingsDefaultTab}
      />
    </div>
  );
};
