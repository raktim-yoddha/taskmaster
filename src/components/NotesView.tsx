import React, { useState, useEffect, useRef, useMemo, useImperativeHandle } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import { NoteItem } from "../types";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Check,
  Search,
  Code,
  Sparkles,
  X,
  FileCode2,
} from "lucide-react";

export interface NotionEditorHandle {
  getMarkdown: () => string;
  focus: () => void;
}

interface NotionEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  accentColor?: string;
}

export const NotionEditor = React.forwardRef<NotionEditorHandle, NotionEditorProps>(
  ({ initialContent, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const crepeRef = useRef<Crepe | null>(null);
    const latestMarkdownRef = useRef(initialContent);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        try {
          if (crepeRef.current) {
            const md = crepeRef.current.getMarkdown();
            latestMarkdownRef.current = md;
            return md;
          }
        } catch (e) {
          console.warn("Could not get markdown from Crepe:", e);
        }
        return latestMarkdownRef.current;
      },
      focus: () => {
        const pm = containerRef.current?.querySelector(".ProseMirror") as HTMLElement | null;
        pm?.focus();
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      let isDisposed = false;
      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue: initialContent,
        features: {
          [Crepe.Feature.BlockEdit]: true,
          [Crepe.Feature.Toolbar]: true,
          [Crepe.Feature.ListItem]: true,
          [Crepe.Feature.Placeholder]: true,
          [Crepe.Feature.CodeMirror]: true,
          [Crepe.Feature.Table]: true,
          [Crepe.Feature.LinkTooltip]: true,
          [Crepe.Feature.Cursor]: true,
          [Crepe.Feature.TopBar]: false,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: "Type '/' for commands, or write freely...",
            mode: "block",
          },
        },
      });

      crepeRef.current = crepe;

      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          if (!isDisposed) {
            latestMarkdownRef.current = markdown;
            onChangeRef.current(markdown);
          }
        });
      });

      crepe.create().catch((err) => {
        if (!isDisposed) {
          console.error("Failed to create Crepe editor:", err);
        }
      });

      return () => {
        isDisposed = true;
        crepeRef.current = null;
        crepe.destroy().catch(() => {});
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className="notion-wysiwyg-container w-full min-h-[460px] cursor-text"
        onClick={(e) => {
          if (e.target === containerRef.current) {
            const pm = containerRef.current?.querySelector(".ProseMirror") as HTMLElement | null;
            pm?.focus();
          }
        }}
      />
    );
  }
);

NotionEditor.displayName = "NotionEditor";

interface NotesViewProps {
  notes?: NoteItem[];
  activeNoteId?: string | null;
  accentColor?: string;
  searchQuery?: string;
  onSaveNote: (note: NoteItem) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onSetActiveNote: (id: string | null) => Promise<void>;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes = [],
  activeNoteId,
  accentColor: _accentColor = "#ff5733",
  searchQuery = "",
  onSaveNote,
  onDeleteNote,
  onSetActiveNote,
}) => {
  const [localSearch, setLocalSearch] = useState("");
  const [viewMode, setViewMode] = useState<"wysiwyg" | "markdown">("wysiwyg");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  const editorRef = useRef<NotionEditorHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active note resolution
  const activeNote = useMemo(() => {
    if (!notes || notes.length === 0) return null;
    if (activeNoteId) {
      const found = notes.find((n) => n.id === activeNoteId);
      if (found) return found;
    }
    return notes[0] || null;
  }, [notes, activeNoteId]);

  // Synchronize active note content to local state
  useEffect(() => {
    if (activeNote) {
      setEditingTitle(activeNote.title);
      setEditingContent(activeNote.content);
      setIsSaved(true);
      if (activeNote.updatedAt) {
        try {
          const d = new Date(activeNote.updatedAt);
          setLastSavedTime(d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
        } catch {
          setLastSavedTime(null);
        }
      }
    } else {
      setEditingTitle("");
      setEditingContent("");
      setIsSaved(true);
      setLastSavedTime(null);
    }
  }, [activeNote?.id]);

  // Filter notes by search
  const effectiveSearch = (searchQuery || localSearch).toLowerCase().trim();
  const filteredNotes = useMemo(() => {
    if (!effectiveSearch) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(effectiveSearch) ||
        n.content.toLowerCase().includes(effectiveSearch)
    );
  }, [notes, effectiveSearch]);

  // Handle changes
  const handleContentChange = (val: string) => {
    setEditingContent(val);
    setIsSaved(false);
  };

  const handleTitleChange = (val: string) => {
    setEditingTitle(val);
    setIsSaved(false);
  };

  // Save current note
  const handleSave = async () => {
    if (!activeNote && !editingTitle.trim() && !editingContent.trim()) return;

    const currentMarkdown =
      viewMode === "wysiwyg" && editorRef.current
        ? editorRef.current.getMarkdown()
        : editingContent;

    const id = activeNote ? activeNote.id : `note-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const noteToSave: NoteItem = {
      id,
      title: editingTitle.trim() || "Untitled Note",
      content: currentMarkdown,
      createdAt: activeNote ? activeNote.createdAt : nowIso,
      updatedAt: nowIso,
    };

    await onSaveNote(noteToSave);
    setIsSaved(true);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  };

  // Auto-save debounced after 1200ms of inactivity
  useEffect(() => {
    if (isSaved) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1200);
    return () => clearTimeout(timer);
  }, [editingTitle, editingContent, isSaved]);

  // Keyboard shortcut Ctrl+S / Cmd+S and Ctrl+E to toggle mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        handleToggleViewMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNote, editingTitle, editingContent, viewMode]);

  // Toggle view mode between WYSIWYG and Raw Markdown
  const handleToggleViewMode = () => {
    if (viewMode === "wysiwyg") {
      if (editorRef.current) {
        const md = editorRef.current.getMarkdown();
        setEditingContent(md);
      }
      setViewMode("markdown");
    } else {
      setViewMode("wysiwyg");
    }
  };

  // Switch note safely saving current
  const handleSelectNote = async (id: string) => {
    if (id === activeNote?.id) return;
    if (!isSaved && activeNote) {
      await handleSave();
    }
    await onSetActiveNote(id);
  };

  // Create new note
  const handleCreateNewNote = async () => {
    if (!isSaved && activeNote) {
      await handleSave();
    }

    const newId = `note-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newNote: NoteItem = {
      id: newId,
      title: "Untitled Note",
      content: "Start typing markdown here...",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await onSaveNote(newNote);
    await onSetActiveNote(newId);
    setEditingTitle(newNote.title);
    setEditingContent(newNote.content);
    setIsSaved(true);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  };

  // Delete note
  const confirmDelete = async () => {
    if (!noteToDelete) return;
    await onDeleteNote(noteToDelete.id);
    setNoteToDelete(null);
  };

  // Word & character stats
  const stats = useMemo(() => {
    const chars = editingContent.length;
    const words = editingContent.trim() ? editingContent.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [editingContent]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[640px] max-h-[calc(100vh-140px)]">
        {/* Left Sidebar: Notes Navigator & List */}
        <div className="w-full md:w-72 lg:w-80 liquid-glass-card rounded-[22px] border border-white/[0.08] shadow-xl flex flex-col overflow-hidden shrink-0">
          {/* Sidebar Top: Title & New Note Button */}
          <div className="p-4 pb-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#ff5733] flex items-center justify-center text-white shadow-sm shadow-[#ff5733]/25">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Notes</h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {notes.length} {notes.length === 1 ? "page" : "pages"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateNewNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white border border-white/[0.08] transition-all cursor-pointer shadow-sm active:scale-95"
              title="Create new Notion page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Local Search Input inside sidebar */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search notes..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full h-7 bg-white/[0.03] border border-white/[0.08] focus:border-[#ff5733]/60 rounded-xl pl-7 pr-6 text-xs text-white placeholder:text-neutral-500 transition-colors focus:outline-none"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch("")}
                  className="absolute right-2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Note Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 [scrollbar-width:thin]">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs flex flex-col items-center justify-center space-y-2">
                <FileText className="w-8 h-8 text-neutral-500 opacity-40" />
                <p>{effectiveSearch ? "No notes matching search" : "No notes created yet."}</p>
                {!effectiveSearch && (
                  <button
                    type="button"
                    onClick={handleCreateNewNote}
                    className="mt-2 text-[11px] font-semibold text-[#ff5733] hover:underline cursor-pointer"
                  >
                    + Create your first page
                  </button>
                )}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isActive = activeNote?.id === note.id;
                let updatedDisplay = "";
                try {
                  const d = new Date(note.updatedAt || note.createdAt);
                  updatedDisplay = d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                } catch {
                  updatedDisplay = "";
                }

                // Clean snippet without markdown symbols
                const snippet = note.content
                  .replace(/^[#\s\-*>`_~]+/gm, "")
                  .trim()
                  .slice(0, 75);

                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={`group relative p-3 rounded-xl transition-all cursor-pointer border select-none ${
                      isActive
                        ? "bg-white/[0.08] border-[#ff5733]/40 shadow-md shadow-black/20 ring-1 ring-[#ff5733]/20"
                        : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className={`text-xs font-bold tracking-tight truncate flex-1 ${
                          isActive ? "text-white" : "text-neutral-200"
                        }`}
                      >
                        {note.title || "Untitled Note"}
                      </h4>

                      {/* Delete button on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-[#ff5733] hover:bg-white/[0.08] rounded-lg transition-all cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                      {snippet || "No additional text"}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.04] text-[9.5px] text-neutral-500 font-mono">
                      <span>{updatedDisplay}</span>
                      <span>{note.content.length} chars</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Notion WYSIWYG Document Editor */}
        <div className="flex-1 liquid-glass-card rounded-[22px] border border-white/[0.08] shadow-xl flex flex-col overflow-hidden min-w-0">
          {activeNote ? (
            <>
              {/* Note Header Bar */}
              <div className="p-3.5 px-5 border-b border-white/[0.06] flex items-center justify-between gap-3 bg-white/[0.015]">
                {/* Left Breadcrumb / Status */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-neutral-400 font-medium">Notes</span>
                  <span className="text-xs text-neutral-600">/</span>
                  <span className="text-xs font-semibold text-neutral-200 truncate max-w-[200px] sm:max-w-xs">
                    {editingTitle || "Untitled"}
                  </span>
                </div>

                {/* Right Controls: Mode Toggle & Save Button */}
                <div className="flex items-center gap-2">
                  {/* Mode switcher: Notion WYSIWYG vs Raw Markdown */}
                  <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMode === "markdown") handleToggleViewMode();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        viewMode === "wysiwyg"
                          ? "bg-[#ff5733] text-white font-semibold shadow-sm shadow-[#ff5733]/25"
                          : "text-neutral-400 hover:text-white"
                      }`}
                      title="Notion WYSIWYG Mode (Block Editor)"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>WYSIWYG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMode === "wysiwyg") handleToggleViewMode();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        viewMode === "markdown"
                          ? "bg-[#ff5733] text-white font-semibold shadow-sm shadow-[#ff5733]/25"
                          : "text-neutral-400 hover:text-white"
                      }`}
                      title="Raw Markdown Source Editor"
                    >
                      <FileCode2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Markdown</span>
                    </button>
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                      isSaved
                        ? "bg-white/[0.05] hover:bg-white/[0.09] text-neutral-300 border border-white/[0.08]"
                        : "bg-[#ff5733] text-white shadow-md shadow-[#ff5733]/30 hover:brightness-110"
                    }`}
                    title="Save Note (Ctrl+S)"
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#39d353]" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Main Document Body Canvas (Notion Canvas) */}
              <div className="flex-1 overflow-y-auto [scrollbar-width:thin] flex flex-col items-center">
                <div className="w-full max-w-3xl px-6 sm:px-10 py-7 flex flex-col flex-1">
                  {/* Notion Page Title Header */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Untitled Note"
                      className="text-2xl sm:text-3xl font-extrabold text-white placeholder:text-neutral-600 bg-transparent border-0 outline-none w-full tracking-tight selection:bg-[#ff5733]/30"
                    />

                    {/* Metadata Sub-row */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-neutral-400 font-mono">
                      <span>{stats.words} words</span>
                      <span>•</span>
                      <span>{stats.chars} characters</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-neutral-400">
                        Type <kbd className="text-[#ff5733] font-mono font-bold bg-white/[0.06] px-1 rounded text-[10px]">/</kbd> for blocks
                      </span>
                    </div>
                  </div>

                  {/* Notion Document Separator */}
                  <div className="w-full h-[1px] bg-white/[0.06] mb-4" />

                  {/* Editor View: Notion WYSIWYG vs Raw Markdown */}
                  {viewMode === "wysiwyg" ? (
                    <div className="flex-1 flex flex-col">
                      <NotionEditor
                        key={`${activeNote.id}-${viewMode}`}
                        ref={editorRef}
                        initialContent={editingContent}
                        onChange={handleContentChange}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="p-2 mb-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-neutral-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-mono">
                          <Code className="w-3 h-3 text-[#ff5733]" /> Raw Markdown Mode
                        </span>
                        <span>Switch to WYSIWYG to view rendered blocks</span>
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={editingContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="Write raw markdown here..."
                        className="w-full flex-1 min-h-[460px] p-4 bg-black/20 border border-white/[0.06] rounded-xl text-white font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-[#ff5733]/50 [scrollbar-width:thin]"
                        spellCheck={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Status Bar */}
              <div className="px-5 py-2 border-t border-white/[0.06] bg-white/[0.015] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline">
                    💡 Tip: Type <kbd className="text-[#ff5733] font-bold">/</kbd> for Headings, Tasks & Quotes
                  </span>
                </div>
                <div>
                  {lastSavedTime ? (
                    <span className="text-neutral-400">
                      Last saved: <strong className="text-neutral-200">{lastSavedTime}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-400">Unsaved draft</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ff5733] flex items-center justify-center text-white shadow-lg shadow-[#ff5733]/25">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">No Note Selected</h3>
              <p className="text-xs text-neutral-400 max-w-sm">
                Choose a note from the left sidebar or create a fresh Notion document.
              </p>
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="mt-2 px-4 py-2 rounded-xl bg-[#ff5733] text-white text-xs font-semibold shadow-md shadow-[#ff5733]/30 hover:brightness-110 cursor-pointer"
              >
                + Create New Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-md liquid-glass-card rounded-[24px] border border-white/[0.12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Delete Note?</h3>
                <p className="text-xs text-neutral-400">
                  Permanently delete &ldquo;{noteToDelete.title || "Untitled"}&rdquo;?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
