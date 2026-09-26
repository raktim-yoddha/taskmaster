import React, { useState } from "react";
import { OverlayTheme } from "../types";
import {
  X,
  Palette,
  Sparkles,
  Sliders,
  Calendar,
  Trash2,
  RefreshCw,
  Archive,
  Info,
  CheckCircle2
} from "lucide-react";
import { ThemedSelect, ThemedSelectOption } from "./ThemedSelect";
import { CURRENT_VERSION } from "../utils/updater";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: OverlayTheme;
  onUpdateTheme: (newTheme: OverlayTheme) => Promise<void>;
  historyRetentionDays: number;
  onUpdateRetentionDays: (days: number) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onManualArchive?: () => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  isCheckingUpdate: boolean;
  updateStatusMessage: string | null;
  defaultTab?: "daily" | "appearance" | "updates";
}

const PRESET_THEMES = [
  { name: "Liquid Glass Coral", card: "#22252a", text: "#ffffff", accent: "#ff5733" },
  { name: "Smoked Obsidian", card: "#181a1e", text: "#f4f4f5", accent: "#ff6847" },
  { name: "Deep Amber", card: "#23211e", text: "#ffffff", accent: "#ff902b" },
  { name: "Slate Minimal", card: "#20232a", text: "#f8fafc", accent: "#ff5733" },
  { name: "Monochrome Pitch", card: "#16171a", text: "#ffffff", accent: "#ffffff" },
  { name: "Frost Graphite", card: "#262930", text: "#ffffff", accent: "#ff5733" },
];

const FONT_OPTIONS: ThemedSelectOption[] = [
  { value: "inter", label: "Inter (Modern Clean)", fontFamily: "var(--font-inter), sans-serif", description: "Default clean & balanced sans" },
  { value: "jakarta", label: "Plus Jakarta Sans", fontFamily: "var(--font-jakarta), sans-serif", description: "Modern geometric grotesque" },
  { value: "outfit", label: "Outfit", fontFamily: "var(--font-outfit), sans-serif", description: "Futuristic & sleek minimal" },
  { value: "poppins", label: "Poppins", fontFamily: "var(--font-poppins), sans-serif", description: "Geometric with friendly curves" },
  { value: "dmsans", label: "DM Sans", fontFamily: "var(--font-dmsans), sans-serif", description: "Subtle & contemporary" },
  { value: "spacegrotesk", label: "Space Grotesk", fontFamily: "var(--font-spacegrotesk), sans-serif", description: "Cyberpunk tech monospace flavor" },
  { value: "montserrat", label: "Montserrat", fontFamily: "var(--font-montserrat), sans-serif", description: "Bold architectural sans" },
  { value: "quicksand", label: "Quicksand", fontFamily: "var(--font-quicksand), sans-serif", description: "Soft & rounded friendly" },
  { value: "space", label: "JetBrains Mono", fontFamily: "var(--font-mono), monospace", description: "Developer code monospace" },
  { value: "firacode", label: "Fira Code", fontFamily: "var(--font-firacode), monospace", description: "Coding terminal monospace" },
  { value: "playfair", label: "Playfair Display", fontFamily: "var(--font-playfair), Georgia, serif", description: "High-end luxury editorial serif" },
  { value: "serif", label: "Georgia Serif", fontFamily: "var(--font-serif), serif", description: "Classic literary serif" },
];

const COMPLETION_ORDER_OPTIONS: ThemedSelectOption[] = [
  { value: "maintain", label: "Stay in place", description: "Tasks stay in their exact position when checked" },
  { value: "queue", label: "Move to bottom (Queue)", description: "Checked tasks move to bottom in completion order" },
];

const DENSITY_OPTIONS: ThemedSelectOption[] = [
  { value: "comfortable", label: "Comfortable", description: "Spacious row padding for relaxed viewing" },
  { value: "compact", label: "Compact (High density)", description: "Tighter spacing to fit more tasks" },
];

const ANIMATION_OPTIONS: ThemedSelectOption[] = [
  { value: "subtle", label: "Subtle & Smooth", description: "Gentle fluid transitions" },
  { value: "playful", label: "Playful", description: "Lively spring interactions" },
  { value: "none", label: "None (Instant)", description: "Instant without transitions" },
];

const RETENTION_OPTIONS: ThemedSelectOption[] = [
  { value: "7", label: "1 Week (7 Days)", description: "Keep past 7 days of daily to-dos" },
  { value: "14", label: "2 Weeks (14 Days)", description: "Keep past 14 days of daily to-dos" },
  { value: "30", label: "1 Month (30 Days)", description: "Keep past 30 days of daily to-dos" },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onUpdateTheme,
  historyRetentionDays = 7,
  onUpdateRetentionDays,
  onClearHistory,
  onManualArchive,
  onCheckUpdates,
  isCheckingUpdate,
  updateStatusMessage,
  defaultTab = "daily",
}) => {
  const [activeTab, setActiveTab] = useState<"daily" | "appearance" | "updates">(defaultTab);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [archivedSuccess, setArchivedSuccess] = useState(false);

  if (!isOpen) return null;

  const updateThemeField = <K extends keyof OverlayTheme>(key: K, value: OverlayTheme[K]) => {
    onUpdateTheme({
      ...theme,
      [key]: value,
    });
  };

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    onUpdateTheme({
      ...theme,
      cardColor: preset.card,
      textColor: preset.text,
      accentColor: preset.accent,
    });
  };

  const handleManualArchiveClick = async () => {
    if (onManualArchive) {
      await onManualArchive();
      setArchivedSuccess(true);
      setTimeout(() => setArchivedSuccess(false), 2000);
    }
  };

  const handleClearHistoryClick = async () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      return;
    }
    await onClearHistory();
    setIsConfirmingClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[26px] bg-[#14161a] border border-white/[0.12] shadow-2xl overflow-hidden text-neutral-100 selection:bg-[#ff5733]/30"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#181a1f]/80 backdrop-blur-xl shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff5733]/15 border border-[#ff5733]/30 flex items-center justify-center text-[#ff5733]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Settings & Preferences</h2>
              <p className="text-[11px] text-neutral-400">Configure daily to-do, appearance, and updates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs (Pills) */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-white/[0.06] bg-[#15171b]/60 shrink-0 text-xs font-semibold select-none">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "daily"
                ? "bg-[#ff5733] text-white shadow-md shadow-[#ff5733]/25"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily To-Do & History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "appearance"
                ? "bg-[#ff5733] text-white shadow-md shadow-[#ff5733]/25"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance & Theme</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("updates")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "updates"
                ? "bg-[#ff5733] text-white shadow-md shadow-[#ff5733]/25"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Software Update</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DAILY TO-DO & HISTORY */}
          {activeTab === "daily" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* How it works info card */}
              <div className="liquid-glass-card rounded-[20px] p-4 border border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white tracking-tight">12:00 AM Midnight Rollover & Time Tracking</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    At <strong>12:00 AM (midnight)</strong>, your active to-do list automatically archives all completed and uncompleted tasks into the <strong>History stack</strong> and empties the list for a clean day.
                  </p>
                  <p className="text-[11px] text-neutral-400 pt-0.5">
                    Completed tasks record their exact check timestamp inside the app and history (remaining hidden from the desktop widget for a clean look).
                  </p>
                </div>
              </div>

              {/* Retention Selector */}
              <div className="liquid-glass-card rounded-[20px] p-5 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-white">History Retention Period</label>
                    <p className="text-[11px] text-neutral-400">Choose how long daily to-do history stacks are maintained before pruning</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#ff5733]">
                    {historyRetentionDays} Days
                  </span>
                </div>

                <ThemedSelect
                  value={String(historyRetentionDays)}
                  onChange={(val) => onUpdateRetentionDays(Number(val))}
                  options={RETENTION_OPTIONS}
                  accentColor={theme.accentColor || "#ff5733"}
                />
              </div>

              {/* Action Buttons */}
              <div className="liquid-glass-card rounded-[20px] p-5 border border-white/[0.08] space-y-3">
                <h4 className="text-xs font-bold text-white tracking-tight">Manual Archive & Data Management</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {onManualArchive && (
                    <button
                      type="button"
                      onClick={handleManualArchiveClick}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-semibold text-neutral-200 hover:text-white transition-all cursor-pointer"
                    >
                      {archivedSuccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Archived to History!</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Archive Today's To-Dos Now</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearHistoryClick}
                    onMouseLeave={() => setIsConfirmingClear(false)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isConfirmingClear
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                        : "bg-white/[0.04] hover:bg-rose-500/15 text-neutral-300 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isConfirmingClear ? "Click Again to Confirm Clear" : "Clear All History"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & THEME */}
          {activeTab === "appearance" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Presets */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Color Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_THEMES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="p-3 rounded-xl bg-[#1b1d22] hover:bg-[#23262c] border border-white/[0.08] hover:border-white/[0.16] transition-all text-left group cursor-pointer flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: preset.card }}
                        />
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-neutral-300 group-hover:text-white truncate">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#1b1d22] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Card Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.cardColor}
                      onChange={(e) => updateThemeField("cardColor", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[11px] text-neutral-400">{theme.cardColor}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#1b1d22] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Accent Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => updateThemeField("accentColor", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[11px] text-neutral-400">{theme.accentColor}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#1b1d22] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Text Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.textColor}
                      onChange={(e) => updateThemeField("textColor", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[11px] text-neutral-400">{theme.textColor}</span>
                  </div>
                </div>
              </div>

              {/* Sliders: Opacity & Blur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#1b1d22] border border-white/[0.08]">
                  <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                    <span>Card Opacity</span>
                    <span className="text-neutral-400 font-mono">{theme.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={theme.opacity}
                    onChange={(e) => updateThemeField("opacity", Number(e.target.value))}
                    className="w-full accent-[#ff5733] cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#1b1d22] border border-white/[0.08]">
                  <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                    <span>Backdrop Blur</span>
                    <span className="text-neutral-400 font-mono">{theme.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="48"
                    value={theme.blur}
                    onChange={(e) => updateThemeField("blur", Number(e.target.value))}
                    className="w-full accent-[#ff5733] cursor-pointer"
                  />
                </div>
              </div>

              {/* Typography & Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Font Family</label>
                  <ThemedSelect
                    value={theme.font || "inter"}
                    onChange={(val) => updateThemeField("font", val)}
                    options={FONT_OPTIONS}
                    accentColor={theme.accentColor || "#ff5733"}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Task Completion Order</label>
                  <ThemedSelect
                    value={theme.completionOrder || "maintain"}
                    onChange={(val) => updateThemeField("completionOrder", val as "maintain" | "queue")}
                    options={COMPLETION_ORDER_OPTIONS}
                    accentColor={theme.accentColor || "#ff5733"}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Task Density</label>
                  <ThemedSelect
                    value={theme.density || "comfortable"}
                    onChange={(val) => updateThemeField("density", val)}
                    options={DENSITY_OPTIONS}
                    accentColor={theme.accentColor || "#ff5733"}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Motion Animations</label>
                  <ThemedSelect
                    value={theme.animation || "subtle"}
                    onChange={(val) => updateThemeField("animation", val)}
                    options={ANIMATION_OPTIONS}
                    accentColor={theme.accentColor || "#ff5733"}
                  />
                </div>
              </div>

              {/* Show title header toggle */}
              <div className="p-3.5 rounded-xl bg-[#1b1d22] border border-white/[0.08] flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={theme.showTitle ?? true}
                    onChange={(e) => updateThemeField("showTitle", e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-[#ff5733]"
                  />
                  <span className="text-xs text-neutral-200 font-medium">Show List Title Header in Widget</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: SOFTWARE UPDATES */}
          {activeTab === "updates" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="liquid-glass-card rounded-[22px] p-6 border border-white/[0.08] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  <img
                    src="/logo.png"
                    alt="Taskmaster Everywhere"
                    className="w-12 h-12 object-contain select-none shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white tracking-tight">Taskmaster Everywhere</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ff5733]/15 text-[#ff5733] border border-[#ff5733]/30">
                        v{CURRENT_VERSION}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Liquid glass daily task management, floating sticky widget, and Pomodoro focus studio.
                    </p>
                    {updateStatusMessage && (
                      <p className="text-xs text-[#ff5733] font-semibold mt-2 animate-in fade-in">
                        {updateStatusMessage}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCheckUpdates}
                  disabled={isCheckingUpdate}
                  className="liquid-coral-btn text-xs px-5 py-2.5 rounded-full font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isCheckingUpdate ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking GitHub...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Check for Updates</span>
                    </>
                  )}
                </button>
              </div>

              {/* Auto-update information */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-neutral-400 leading-relaxed">
                Taskmaster Everywhere automatically checks for updates on launch. When an update is detected, an update banner appears with one-click direct installer & portable download options.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#181a1f] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.1] hover:bg-white/[0.18] text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
