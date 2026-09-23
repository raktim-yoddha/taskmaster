import React, { useState, useRef, useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { OverlayState, TodoItem } from "../types";
import { 
  Check, 
  Plus, 
  Settings, 
  Trash2, 
  X, 
  GripVertical,
  Minimize2,
  Maximize2,
  Play,
  Pause,
  Clock,
  Flame,
  Hourglass
} from "lucide-react";
import { UseTimerReturn } from "../hooks/useTimer";
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

interface StickyWidgetProps {
  state: OverlayState;
  timer?: UseTimerReturn;
  onAddTodo: (text: string) => Promise<void>;
  onToggleTodo: (id: string) => Promise<void>;
  onEditTodo: (id: string, text: string) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onReorderTodos: (fromIndex: number, toIndex: number) => Promise<void>;
  onSetTitle: (title: string) => Promise<void>;
}

function hexToRgba(hex: string, alpha: number) {
  if (!hex) return "rgba(34, 37, 44, 0.92)";
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const fontFamilies: Record<string, string> = {
  inter: "var(--font-inter), 'Inter', -apple-system, sans-serif",
  jakarta: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
  outfit: "var(--font-outfit), 'Outfit', sans-serif",
  dmsans: "var(--font-dmsans), 'DM Sans', sans-serif",
  poppins: "var(--font-poppins), 'Poppins', sans-serif",
  spacegrotesk: "var(--font-spacegrotesk), 'Space Grotesk', sans-serif",
  montserrat: "var(--font-montserrat), 'Montserrat', sans-serif",
  quicksand: "var(--font-quicksand), 'Quicksand', sans-serif",
  space: "var(--font-mono), 'JetBrains Mono', monospace",
  firacode: "var(--font-firacode), 'Fira Code', monospace",
  playfair: "var(--font-playfair), 'Playfair Display', Georgia, serif",
  serif: "var(--font-serif), Georgia, serif",
};

interface SortableItemProps {
  todo: TodoItem;
  index: number;
  totalTodos: number;
  density: string;
  completedStyle: string;
  accentColor: string;
  isQueueMode: boolean;
  editingId: string | null;
  editingText: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onToggle: (id: string) => void;
  onStartEdit: (todo: TodoItem) => void;
  onTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

const SortableTodoItem: React.FC<SortableItemProps> = ({
  todo,
  index: _index,
  totalTodos: _totalTodos,
  density,
  completedStyle,
  accentColor,
  isQueueMode,
  editingId,
  editingText,
  editInputRef,
  onToggle,
  onStartEdit,
  onTextChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
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

  const isEditing = editingId === todo.id;
  const isCompleted = todo.completed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-1 group/item transition-all rounded-lg px-0.5 ${
        density === "compact" ? "py-0.5" : "py-1"
      } ${
        isDragging 
          ? "bg-white/10 shadow-lg border border-white/20" 
          : "hover:bg-white/[0.04] border border-transparent hover:border-white/[0.05]"
      }`}
    >
      {/* Hold and Drag Grip Handle - tightly aligned with minimal spacing, disabled for completed tasks in queue mode */}
      {!isReorderDisabled ? (
        <div
          {...attributes}
          {...listeners}
          className="mt-1 p-0 cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white opacity-25 group-hover/item:opacity-90 transition-opacity touch-none shrink-0"
          title="Hold and drag to reorder"
        >
          <GripVertical className="w-3 h-3.5" />
        </div>
      ) : (
        <div className="w-3 shrink-0" />
      )}

      {/* Custom Rounded Liquid Glass Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className="mt-0.5 w-[16px] h-[16px] min-w-[16px] rounded-md flex items-center justify-center transition-all duration-200 border cursor-pointer shrink-0"
        style={{
          borderColor: isCompleted ? accentColor : "rgba(255, 255, 255, 0.2)",
          backgroundColor: isCompleted ? accentColor : "rgba(0, 0, 0, 0.3)",
          boxShadow: isCompleted ? `0 2px 8px ${accentColor}40` : "none",
        }}
      >
        {isCompleted && (
          <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
        )}
      </button>

      {/* Todo Text / Inline Edit */}
      <div className="flex-1 min-w-0 px-0.5">
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editingText}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="w-full bg-[#181a1f] border border-[#ff5733] rounded-md px-1.5 py-0.5 text-xs text-white focus:outline-none"
          />
        ) : (
          <div
            onDoubleClick={() => onStartEdit(todo)}
            className={`text-[0.84rem] font-medium leading-snug break-words cursor-pointer transition-all select-text ${
              isCompleted
                ? completedStyle === "strike"
                  ? "line-through opacity-40 text-neutral-400"
                  : completedStyle === "dim"
                  ? "opacity-35 text-neutral-400"
                  : "opacity-85 text-neutral-200"
                : "text-neutral-100 opacity-95"
            }`}
            title="Double-click to edit text"
          >
            {todo.text}
          </div>
        )}
      </div>

      {/* Delete button - always positioned at the far right end */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        className="mt-0.5 p-1 rounded-md text-neutral-400 hover:text-[#ff5733] hover:bg-[#ff5733]/15 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer shrink-0 ml-auto"
        title="Delete task"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

export const StickyWidget: React.FC<StickyWidgetProps> = ({
  state,
  timer,
  onAddTodo,
  onToggleTodo,
  onEditTodo,
  onDeleteTodo,
  onReorderTodos,
  onSetTitle,
}) => {
  const { todos, theme } = state;
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(state.title);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCapsuleHovered, setIsCapsuleHovered] = useState(false);
  const expandedSizeRef = useRef<{ width: number; height: number }>({ width: 380, height: 320 });

  const handleCollapse = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCapsuleHovered(false);
    try {
      const appWindow = getCurrentWebviewWindow();
      const factor = await appWindow.scaleFactor().catch(() => 1);
      const size = await appWindow.innerSize().catch(() => ({ width: window.innerWidth * factor, height: window.innerHeight * factor }));
      const logicalWidth = Math.round(size.width / factor);
      const logicalHeight = Math.round(size.height / factor);
      expandedSizeRef.current = {
        width: Math.max(logicalWidth, 260),
        height: Math.max(logicalHeight, 160),
      };
      setIsCollapsed(true);
      await appWindow.setSize(new LogicalSize(196, 48));
    } catch {
      expandedSizeRef.current = {
        width: window.innerWidth || 380,
        height: window.innerHeight || 320,
      };
      setIsCollapsed(true);
    }
  };

  const handleExpand = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCapsuleHovered(false);
    try {
      const appWindow = getCurrentWebviewWindow();
      const target = expandedSizeRef.current || { width: 380, height: 320 };
      await appWindow.setSize(new LogicalSize(target.width, target.height));
    } catch {
      // ignore
    }
    setIsCollapsed(false);
  };

  useEffect(() => {
    if (!isCollapsed) {
      setIsCapsuleHovered(false);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        setIsCapsuleHovered(false);
      }
    };

    const handleBlur = () => {
      setIsCapsuleHovered(false);
    };

    window.addEventListener("mouseout", handleMouseLeave);
    window.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isCollapsed]);

  const editInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  // Robust Tauri Window Dragging
  const handleStartDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, a, [data-no-drag]")) return;
    try {
      const appWindow = getCurrentWebviewWindow();
      appWindow.startDragging();
    } catch (err) {
      console.warn("startDragging error:", err);
    }
  };

  // In-widget Resizing with Screen Boundary Clamping & Pointer Capture
  const handleStartResize = (
    e: React.MouseEvent | React.PointerEvent,
    direction: "SouthEast" | "East" | "South"
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    startManualResize(e, direction);
  };

  const startManualResize = async (
    startEvent: React.MouseEvent | React.PointerEvent,
    direction: "SouthEast" | "East" | "South"
  ) => {
    try {
      const appWindow = getCurrentWebviewWindow();
      let factor = 1;
      let startLogicalWidth = 380;
      let startLogicalHeight = 320;
      let startLogicalX = 0;
      let startLogicalY = 0;

      try {
        factor = await appWindow.scaleFactor().catch(() => 1);
        const size = await appWindow.innerSize();
        startLogicalWidth = Math.round(size.width / factor);
        startLogicalHeight = Math.round(size.height / factor);
        const pos = await appWindow.innerPosition();
        startLogicalX = Math.round(pos.x / factor);
        startLogicalY = Math.round(pos.y / factor);
      } catch {
        startLogicalWidth = window.innerWidth || 380;
        startLogicalHeight = window.innerHeight || 320;
      }

      // Constrain resizing so it cannot push the widget outside the screen boundaries
      const screenWidth = Math.round(window.screen.availWidth || 1920);
      const screenHeight = Math.round(window.screen.availHeight || 1080);
      const maxWidth = Math.max(260, screenWidth - startLogicalX);
      const maxHeight = Math.max(140, screenHeight - startLogicalY);

      const startX = startEvent.screenX;
      const startY = startEvent.screenY;

      const targetEl = startEvent.currentTarget as HTMLElement;
      if (targetEl && "setPointerCapture" in targetEl && "pointerId" in startEvent) {
        try {
          targetEl.setPointerCapture((startEvent as unknown as { pointerId: number }).pointerId);
        } catch {
          // ignore
        }
      }

      let isResizing = true;

      const onPointerMove = (moveEvent: MouseEvent | PointerEvent) => {
        if (!isResizing) return;
        const deltaX = moveEvent.screenX - startX;
        const deltaY = moveEvent.screenY - startY;

        let newWidth = startLogicalWidth;
        let newHeight = startLogicalHeight;

        if (direction === "East" || direction === "SouthEast") {
          newWidth = Math.max(240, Math.min(maxWidth, startLogicalWidth + deltaX));
        }
        if (direction === "South" || direction === "SouthEast") {
          newHeight = Math.max(140, Math.min(maxHeight, startLogicalHeight + deltaY));
        }

        expandedSizeRef.current = { width: newWidth, height: newHeight };
        appWindow.setSize(new LogicalSize(newWidth, newHeight)).catch(() => {});
      };

      const onPointerUp = (upEvent: MouseEvent | PointerEvent) => {
        isResizing = false;
        if (targetEl && "releasePointerCapture" in targetEl && "pointerId" in upEvent) {
          try {
            targetEl.releasePointerCapture((upEvent as unknown as { pointerId: number }).pointerId);
          } catch {
            // ignore
          }
        }
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("mousemove", onPointerMove);
      window.addEventListener("mouseup", onPointerUp);
    } catch (err) {
      console.error("In-build resize error:", err);
    }
  };



  const handleOpenSettings = async () => {
    try {
      await invoke("show_main_window");
    } catch (e) {
      console.error("Failed to open main app window", e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    await onAddTodo(newText.trim());
    setNewText("");
    setIsAdding(false);
  };

  const handleStartEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
  };

  const handleSaveEdit = async () => {
    if (editingId && editingText.trim()) {
      await onEditTodo(editingId, editingText.trim());
    }
    setEditingId(null);
  };

  const handleSaveTitle = async () => {
    if (titleInput.trim()) {
      await onSetTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleClose = async () => {
    try {
      await invoke("close_widget_window");
    } catch (e) {
      try {
        const appWindow = getCurrentWebviewWindow();
        await appWindow.hide();
      } catch (err) {
        console.error(err);
      }
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

  const opacityDecimal = (theme.opacity || 92) / 100;
  const bgStyle = hexToRgba(theme.cardColor || "#22252a", opacityDecimal);
  const accentColor = theme.accentColor || "#ff5733";
  const fontFamily = fontFamilies[theme.font || "inter"] || fontFamilies.inter;

  const showTitle = theme.showTitle !== false;
  const showFraction = theme.progressStyle !== "bar";
  const showBar = theme.progressStyle !== "fraction";

  if (isCollapsed) {
    return (
      <div 
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        onClick={handleExpand}
        onMouseLeave={() => setIsCapsuleHovered(false)}
        onPointerLeave={() => setIsCapsuleHovered(false)}
        className="w-screen h-screen p-1.5 box-border overflow-hidden bg-transparent flex items-center justify-center select-none cursor-pointer"
        title="Click anywhere to expand Taskmaster"
      >
        <div
          data-tauri-drag-region
          onMouseEnter={() => setIsCapsuleHovered(true)}
          onMouseLeave={() => setIsCapsuleHovered(false)}
          onPointerEnter={() => setIsCapsuleHovered(true)}
          onPointerLeave={() => setIsCapsuleHovered(false)}
          className="w-full h-full flex items-center justify-between px-2.5 py-0.5 rounded-full transition-all duration-200 overflow-hidden box-border"
          style={{
            backgroundColor: bgStyle,
            backdropFilter: `blur(${theme.blur || 32}px)`,
            WebkitBackdropFilter: `blur(${theme.blur || 32}px)`,
            border: `1.5px solid ${isCapsuleHovered ? accentColor : "rgba(255, 255, 255, 0.2)"}`,
            boxShadow: isCapsuleHovered
              ? `0 0 0 1px ${accentColor}30, 0 0 6px ${accentColor}40`
              : "none",
          }}
        >
          {/* Logo & Counter Badge */}
          <div data-tauri-drag-region className="flex items-center gap-1.5 min-w-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-4 h-4 object-contain shrink-0 select-none pointer-events-none"
            />
            <span className="font-bold text-[11px] font-mono tracking-tight text-white/95 truncate pointer-events-none">
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="flex-1 mx-2 h-1 bg-white/15 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>

          {/* Expand icon */}
          <button
            type="button"
            onClick={handleExpand}
            className={`p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer shrink-0 ${
              isCapsuleHovered ? "text-white" : "text-neutral-400"
            }`}
            title="Expand widget"
          >
            <Maximize2 className="w-3 h-3 text-white/80" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen p-0 m-0 box-border overflow-hidden bg-transparent flex flex-col select-none relative">
      {/* Edge resize strips (functional but completely transparent - zero hover color) */}
      <div
        onMouseDown={(e) => handleStartResize(e, "East")}
        onPointerDown={(e) => handleStartResize(e, "East")}
        data-no-drag="true"
        className="absolute top-0 right-0 w-2.5 h-full cursor-ew-resize z-50 bg-transparent select-none touch-none"
        title="Resize width"
      />
      <div
        onMouseDown={(e) => handleStartResize(e, "South")}
        onPointerDown={(e) => handleStartResize(e, "South")}
        data-no-drag="true"
        className="absolute bottom-0 left-0 w-full h-2.5 cursor-ns-resize z-50 bg-transparent select-none touch-none"
        title="Resize height"
      />

      {/* Main Liquid Glass Container - Fills the widget window cleanly with zero outer shadow */}
      <div
        className="w-full h-full flex flex-col relative group box-border overflow-hidden liquid-widget-shell"
        style={{
          backgroundColor: bgStyle,
          backdropFilter: `blur(${theme.blur || 32}px)`,
          WebkitBackdropFilter: `blur(${theme.blur || 32}px)`,
          borderRadius: `${theme.radius || 22}px`,
          padding: `${theme.padding ? Math.min(theme.padding, 10) : 8}px`,
          fontFamily,
          color: theme.textColor || "#ffffff",
        }}
      >
        {/* Floating Quick Action / Window Drag Bar */}
        <div 
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="flex items-center justify-between pb-1 mb-1 border-b border-white/[0.06] opacity-75 hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing shrink-0"
        >
          <div 
            data-tauri-drag-region
            onMouseDown={handleStartDrag}
            className="flex items-center gap-1 text-xs text-white/90 select-none cursor-grab active:cursor-grabbing"
            title="Drag to reposition widget"
          >
            <img 
              src="/logo.png" 
              alt="Taskmaster Widget Logo" 
              className="w-3.5 h-3.5 object-contain select-none cursor-grab active:cursor-grabbing" 
            />
            <span className="font-semibold text-[10.5px] tracking-tight text-white/80 cursor-grab active:cursor-grabbing">
              Taskmaster
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Add task"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleCollapse}
              className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Collapse to mini capsule"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleOpenSettings}
              className="p-1 rounded-md hover:bg-white/10 text-neutral-400 hover:text-[#ff5733] transition-colors cursor-pointer"
              title="Open App & Customizer"
            >
              <Settings className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-md hover:bg-[#ff5733]/20 text-neutral-400 hover:text-[#ff5733] transition-colors cursor-pointer"
              title="Close Widget"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Header: Title & Fraction */}
        {(showTitle || showFraction) && (
          <div 
            data-tauri-drag-region
            onMouseDown={handleStartDrag}
            className="flex items-center justify-between mt-0.5 mb-1 gap-1.5 cursor-grab shrink-0"
          >
            {showTitle && (
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    className="w-full bg-[#14161a] border border-[#ff5733] rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wider uppercase text-white focus:outline-none"
                  />
                ) : (
                  <h1
                    onDoubleClick={() => setIsEditingTitle(true)}
                    className="text-[0.8rem] font-bold tracking-[0.05em] uppercase text-white/90 truncate cursor-pointer hover:opacity-80 transition-opacity"
                    title="Double-click to rename title"
                  >
                    {state.title || "TONIGHT'S GOAL"}
                  </h1>
                )}
              </div>
            )}

            {showFraction && (
              <div className="font-bold text-[0.72rem] font-mono tracking-tight text-white tabular-nums shrink-0 bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.08]">
                {completedCount}/{totalCount}
              </div>
            )}
          </div>
        )}

        {/* Optional mini timer strip */}
        {timer && (
          <div className="flex items-center justify-between bg-[#15171b]/80 border border-white/[0.06] rounded-lg px-2.5 py-1 my-1 shrink-0 text-xs select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex items-center">
                {timer.timerState.mode === "stopwatch" ? (
                  <Clock className="w-3 h-3 text-neutral-400" />
                ) : timer.timerState.mode === "pomodoro" ? (
                  <Flame className="w-3 h-3 text-[#ff5733]" />
                ) : (
                  <Hourglass className="w-3 h-3 text-neutral-400" />
                )}
              </span>
              <span className="font-mono font-bold text-white text-[10.5px]">
                {timer.timerState.mode === "stopwatch"
                  ? `${Math.floor(timer.timerState.elapsedTime / 60)}:${(timer.timerState.elapsedTime % 60).toString().padStart(2, "0")}`
                  : `${Math.floor(timer.timerState.timeRemaining / 60)}:${(timer.timerState.timeRemaining % 60).toString().padStart(2, "0")}`}
              </span>
              {timer.timerState.mode === "pomodoro" && (
                <span className="text-[9.5px] text-[#ff5733] font-semibold uppercase tracking-wider">
                  {timer.timerState.pomodoroPhase === "focus" ? "Focus" : "Break"}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={timer.togglePlay}
              className="p-1 rounded-md text-xs transition-colors cursor-pointer text-[#ff5733] hover:text-[#ff6847] hover:bg-[#ff5733]/10"
              title={timer.timerState.isRunning ? "Pause timer" : "Start timer"}
            >
              {timer.timerState.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </button>
          </div>
        )}

        {/* Thin divider & progress bar line */}
        {showBar && (
          <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden my-1 relative shrink-0">
            <div
              className="h-full rounded-full transition-all duration-400 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #ff5733, #ff7a5c)",
                boxShadow: `0 0 6px ${accentColor}80`,
              }}
            />
          </div>
        )}

        {/* Inline Quick Add Input */}
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="mb-2.5 flex items-center gap-2 shrink-0">
            <input
              ref={addInputRef}
              type="text"
              placeholder="Type goal & press Enter..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="liquid-glass-input flex-1 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#ff5733]"
            />
            <button
              type="submit"
              className="liquid-coral-btn px-3 py-1.5 text-xs rounded-xl"
            >
              Add
            </button>
          </form>
        )}

        {/* Todo List Items with Drag-and-Drop Reordering */}
        <div
          className="flex-1 min-h-0 overflow-y-auto flex flex-col pr-0.5"
          style={{ gap: `${theme.spacing ? Math.min(theme.spacing, 8) : 6}px` }}
        >
          {todos.length === 0 ? (
            <div className="text-center py-6 text-xs text-neutral-400">
              No tasks yet. Click <span className="text-[#ff5733] font-bold">+</span> above or open To do!
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={todos.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {todos.map((todo, index) => (
                  <SortableTodoItem
                    key={todo.id}
                    todo={todo}
                    index={index}
                    totalTodos={todos.length}
                    density={theme.density || "comfortable"}
                    completedStyle={theme.completedStyle || "strike"}
                    accentColor={accentColor}
                    isQueueMode={theme.completionOrder === "queue"}
                    editingId={editingId}
                    editingText={editingText}
                    editInputRef={editInputRef}
                    onToggle={onToggleTodo}
                    onStartEdit={handleStartEdit}
                    onTextChange={setEditingText}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={onDeleteTodo}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        
        {/* Visible Bottom-Right Corner Resize Grip Handle */}
        <div
          onMouseDown={(e) => handleStartResize(e, "SouthEast")}
          onPointerDown={(e) => handleStartResize(e, "SouthEast")}
          data-no-drag="true"
          className="absolute bottom-1 right-1 p-1.5 cursor-nwse-resize text-white/30 hover:text-white/90 active:text-[#ff5733] transition-colors z-50 select-none touch-none"
          title="Drag to resize widget window"
        >
          <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="8.5" cy="8.5" r="1.2" />
            <circle cx="8.5" cy="4.5" r="1.2" />
            <circle cx="4.5" cy="8.5" r="1.2" />
          </svg>
        </div>

      </div>
    </div>
  );
};
