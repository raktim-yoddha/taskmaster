import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { OverlayState, OverlayTheme } from "./types";
import { StickyWidget } from "./components/StickyWidget";
import { AppDashboard } from "./components/AppDashboard";
import { useTimer } from "./hooks/useTimer";

const defaultState: OverlayState = {
  title: "TONIGHT'S GOAL",
  todos: [
    { id: "1", text: "Make a desktop app for to do overlay", completed: false },
    { id: "2", text: "improve Orchestration layer Edge cases", completed: false },
    { id: "3", text: "Fix the browser use feature edge cases", completed: false },
    { id: "4", text: "Release version 0.2.1", completed: false },
    { id: "5", text: "40 hours watch time", completed: false },
  ],
  theme: {
    cardColor: "#22252a",
    textColor: "#ffffff",
    accentColor: "#ff5733",
    opacity: 92,
    blur: 30,
    width: 440,
    radius: 22,
    padding: 12,
    spacing: 8,
    font: "inter",
    density: "comfortable",
    showTitle: true,
    progressStyle: "both",
    completedStyle: "strike",
    animation: "subtle",
    completionOrder: "maintain",
  },
};

export default function App() {
  const [windowLabel, setWindowLabel] = useState<string>("main");
  const [state, setState] = useState<OverlayState>(defaultState);
  const [loading, setLoading] = useState(true);
  const timer = useTimer();

  // Detect which Tauri window this is
  useEffect(() => {
    try {
      const appWindow = getCurrentWebviewWindow();
      if (appWindow && appWindow.label) {
        setWindowLabel(appWindow.label);
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.get("window") === "widget") {
          setWindowLabel("widget");
        }
      }
    } catch {
      const params = new URLSearchParams(window.location.search);
      if (params.get("window") === "widget") {
        setWindowLabel("widget");
      }
    }
  }, []);

  // Update root transparency styling
  useEffect(() => {
    if (windowLabel === "widget") {
      document.body.classList.add("is-widget");
      document.documentElement.classList.add("is-widget");
    } else {
      document.body.classList.remove("is-widget");
      document.documentElement.classList.remove("is-widget");
    }
  }, [windowLabel]);

  // Native Tauri event listener for instant zero-latency cross-window synchronization
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let isMounted = true;

    listen<OverlayState>("state-changed", (event) => {
      if (isMounted && event.payload) {
        const payload = event.payload;
        if (payload.theme?.accentColor === "#ff902b") {
          payload.theme.accentColor = "#ff5733";
        }
        setState(payload);
      }
    })
      .then((fn) => {
        if (isMounted) {
          unlisten = fn;
        } else {
          fn();
        }
      })
      .catch((err) => {
        console.warn("Native event listen error (preview mode):", err);
      });

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  // Fetch initial state
  useEffect(() => {
    async function fetchInitial() {
      try {
        const fetchedState = await invoke<OverlayState>("get_state");
        if (fetchedState) {
          if (fetchedState.theme?.accentColor === "#ff902b") {
            fetchedState.theme.accentColor = "#ff5733";
          }
          setState(fetchedState);
        }
      } catch (err) {
        console.warn("Tauri API not active or preview mode:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitial();
  }, []);

  const handleAddTodo = useCallback(async (text: string) => {
    setState((prev) => ({
      ...prev,
      todos: [...prev.todos, { id: `temp-${Date.now()}`, text, completed: false }],
    }));
    try {
      const updated = await invoke<OverlayState>("add_todo", { text });
      if (updated) setState(updated);
    } catch (e) {
      console.error("add_todo error:", e);
    }
  }, []);

  const handleToggleTodo = useCallback(async (id: string) => {
    setState((prev) => {
      const todoIndex = prev.todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) return prev;
      const target = prev.todos[todoIndex];
      const newCompleted = !target.completed;
      const nowFormatted = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const updatedItem = {
        ...target,
        completed: newCompleted,
        completedAt: newCompleted ? nowFormatted : null,
      };

      if (prev.theme.completionOrder === "queue") {
        const remaining = prev.todos.filter((t) => t.id !== id);
        if (newCompleted) {
          // Checked: moves to the very back in a queue
          return { ...prev, todos: [...remaining, updatedItem] };
        } else {
          // Unchecked: moves to the back side of the unchecked to-dos
          const firstCompletedIdx = remaining.findIndex((t) => t.completed);
          if (firstCompletedIdx === -1) {
            return { ...prev, todos: [...remaining, updatedItem] };
          } else {
            const nextTodos = [...remaining];
            nextTodos.splice(firstCompletedIdx, 0, updatedItem);
            return { ...prev, todos: nextTodos };
          }
        }
      } else {
        return {
          ...prev,
          todos: prev.todos.map((t) => (t.id === id ? updatedItem : t)),
        };
      }
    });
    try {
      const updated = await invoke<OverlayState>("toggle_todo", { id });
      if (updated) setState(updated);
    } catch (e) {
      console.error("toggle_todo error:", e);
    }
  }, []);

  const handleEditTodo = useCallback(async (id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === id ? { ...t, text } : t)),
    }));
    try {
      const updated = await invoke<OverlayState>("edit_todo", { id, text });
      if (updated) setState(updated);
    } catch (e) {
      console.error("edit_todo error:", e);
    }
  }, []);

  const handleDeleteTodo = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.filter((t) => t.id !== id),
    }));
    try {
      const updated = await invoke<OverlayState>("delete_todo", { id });
      if (updated) setState(updated);
    } catch (e) {
      console.error("delete_todo error:", e);
    }
  }, []);

  const handleReorderTodos = useCallback(async (fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const isQueue = prev.theme.completionOrder === "queue";
      if (isQueue && prev.todos[fromIndex]?.completed) {
        return prev;
      }
      let targetIndex = toIndex;
      if (isQueue) {
        const firstCompletedIdx = prev.todos.findIndex((t) => t.completed);
        if (firstCompletedIdx !== -1 && targetIndex >= firstCompletedIdx) {
          targetIndex = Math.max(0, firstCompletedIdx - 1);
        }
      }
      const newTodos = [...prev.todos];
      const [moved] = newTodos.splice(fromIndex, 1);
      newTodos.splice(targetIndex, 0, moved);
      return { ...prev, todos: newTodos };
    });
    try {
      const updated = await invoke<OverlayState>("reorder_todos", {
        fromIndex,
        toIndex,
      });
      if (updated) setState(updated);
    } catch (e) {
      console.error("reorder_todos error:", e);
    }
  }, []);

  const handleSetTitle = useCallback(async (title: string) => {
    setState((prev) => ({ ...prev, title }));
    try {
      const updated = await invoke<OverlayState>("set_title", { title });
      if (updated) setState(updated);
    } catch (e) {
      console.error("set_title error:", e);
    }
  }, []);

  const handleUpdateTheme = useCallback(async (newTheme: OverlayTheme) => {
    const cleanTheme = {
      ...newTheme,
      accentColor: (newTheme.accentColor === "#ff902b" || newTheme.accentColor?.toLowerCase().includes("ff902b")) ? "#ff5733" : newTheme.accentColor,
    };
    setState((prev) => {
      const switchingToQueue = cleanTheme.completionOrder === "queue" && prev.theme.completionOrder !== "queue";
      let newTodos = prev.todos;
      if (switchingToQueue) {
        const unchecked = prev.todos.filter((t) => !t.completed);
        const checked = prev.todos.filter((t) => t.completed);
        newTodos = [...unchecked, ...checked];
      }
      return { ...prev, theme: cleanTheme, todos: newTodos };
    });
    try {
      const updated = await invoke<OverlayState>("update_theme", {
        theme: cleanTheme,
      });
      if (updated) {
        if (updated.theme?.accentColor === "#ff902b") {
          updated.theme.accentColor = "#ff5733";
        }
        setState(updated);
      }
    } catch (e) {
      console.error("update_theme error:", e);
    }
  }, []);

  const handleUpdateRetentionDays = useCallback(async (days: number) => {
    setState((prev) => ({ ...prev, historyRetentionDays: days }));
    try {
      const updated = await invoke<OverlayState>("update_history_retention", { days });
      if (updated) setState(updated);
    } catch (e) {
      console.error("update_history_retention error:", e);
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    setState((prev) => ({ ...prev, history: [] }));
    try {
      const updated = await invoke<OverlayState>("clear_history");
      if (updated) setState(updated);
    } catch (e) {
      console.error("clear_history error:", e);
    }
  }, []);

  const handleDeleteHistoryRecord = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      history: prev.history ? prev.history.filter((r) => r.id !== id) : [],
    }));
    try {
      const updated = await invoke<OverlayState>("delete_history_record", { id });
      if (updated) setState(updated);
    } catch (e) {
      console.error("delete_history_record error:", e);
    }
  }, []);

  const handleRestoreTodos = useCallback(async (todosToRestore: any[]) => {
    try {
      const updated = await invoke<OverlayState>("restore_history_todos", { todos: todosToRestore });
      if (updated) setState(updated);
    } catch (e) {
      console.error("restore_history_todos error:", e);
    }
  }, []);

  const handleRolloverDailyTodos = useCallback(async () => {
    try {
      const updated = await invoke<OverlayState>("rollover_daily_todos");
      if (updated) setState(updated);
    } catch (e) {
      console.error("rollover_daily_todos error:", e);
    }
  }, []);

  const handleUpdateDailyResetTime = useCallback(async (time: string) => {
    setState((prev) => ({ ...prev, dailyResetTime: time }));
    try {
      const updated = await invoke<OverlayState>("update_daily_reset_time", { time });
      if (updated) setState(updated);
    } catch (e) {
      console.error("update_daily_reset_time error:", e);
    }
  }, []);

  const handleSaveNote = useCallback(async (note: any) => {
    setState((prev) => {
      const notes = prev.notes || [];
      const idx = notes.findIndex((n) => n.id === note.id);
      let nextNotes: any[];
      if (idx !== -1) {
        nextNotes = [...notes];
        nextNotes[idx] = note;
      } else {
        nextNotes = [note, ...notes];
      }
      return { ...prev, notes: nextNotes, activeNoteId: note.id };
    });
    try {
      const updated = await invoke<OverlayState>("save_note", { note });
      if (updated) setState(updated);
    } catch (e) {
      console.error("save_note error:", e);
    }
  }, []);

  const handleDeleteNote = useCallback(async (id: string) => {
    setState((prev) => {
      const notes = (prev.notes || []).filter((n) => n.id !== id);
      const activeNoteId = prev.activeNoteId === id ? (notes[0]?.id || null) : prev.activeNoteId;
      return { ...prev, notes, activeNoteId };
    });
    try {
      const updated = await invoke<OverlayState>("delete_note", { id });
      if (updated) setState(updated);
    } catch (e) {
      console.error("delete_note error:", e);
    }
  }, []);

  const handleSetActiveNote = useCallback(async (id: string | null) => {
    setState((prev) => ({ ...prev, activeNoteId: id }));
    try {
      const updated = await invoke<OverlayState>("set_active_note", { id });
      if (updated) setState(updated);
    } catch (e) {
      console.error("set_active_note error:", e);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-950 text-slate-400 text-xs font-mono">
        Connecting to TaskMaster...
      </div>
    );
  }

  // If this window is the floating Sticky Widget:
  if (windowLabel === "widget") {
    return (
      <StickyWidget
        state={state}
        timer={timer}
        onAddTodo={handleAddTodo}
        onToggleTodo={handleToggleTodo}
        onEditTodo={handleEditTodo}
        onDeleteTodo={handleDeleteTodo}
        onReorderTodos={handleReorderTodos}
        onSetTitle={handleSetTitle}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote}
        onSetActiveNote={handleSetActiveNote}
      />
    );
  }

  // Otherwise, render the Main Studio & Customizer App
  return (
    <AppDashboard
      state={state}
      timer={timer}
      onAddTodo={handleAddTodo}
      onToggleTodo={handleToggleTodo}
      onEditTodo={handleEditTodo}
      onDeleteTodo={handleDeleteTodo}
      onReorderTodos={handleReorderTodos}
      onSetTitle={handleSetTitle}
      onUpdateTheme={handleUpdateTheme}
      onUpdateRetentionDays={handleUpdateRetentionDays}
      onClearHistory={handleClearHistory}
      onDeleteHistoryRecord={handleDeleteHistoryRecord}
      onRestoreTodos={handleRestoreTodos}
      onRolloverDailyTodos={handleRolloverDailyTodos}
      onUpdateDailyResetTime={handleUpdateDailyResetTime}
      onSaveNote={handleSaveNote}
      onDeleteNote={handleDeleteNote}
      onSetActiveNote={handleSetActiveNote}
    />
  );
}
