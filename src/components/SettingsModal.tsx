import React, { useState } from "react";
import { OverlayTheme } from "../types";
import {
  X,
  Palette,
  ArrowUpCircle,
  Sliders,
  Calendar,
  Trash2,
  RefreshCw,
  Archive,
  CheckCircle2,
  Clock,
  Sparkles,
  Type
} from "lucide-react";
import { ThemedSelect, ThemedSelectOption } from "./ThemedSelect";
import { SegmentedControl, SegmentedOption } from "./SegmentedControl";
import { CURRENT_VERSION } from "../utils/updater";

const SETTINGS_TAB_OPTIONS: SegmentedOption<"daily" | "appearance" | "updates">[] = [
  {
    id: "daily",
    label: "Daily To-Do",
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="w-3.5 h-3.5" />,
  },
  {
    id: "updates",
    label: "Software Update",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: OverlayTheme;
  onUpdateTheme: (newTheme: OverlayTheme) => Promise<void>;
  historyRetentionDays: number;
  onUpdateRetentionDays: (days: number) => Promise<void>;
  dailyResetTime?: string;
  onUpdateDailyResetTime?: (time: string) => Promise<void>;
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
  { name: "Crimson Eclipse", card: "#201a1c", text: "#ffffff", accent: "#ff4757" },
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

const PROGRESS_OPTIONS: ThemedSelectOption[] = [
  { value: "both", label: "Bar and fraction (2/5)", description: "Visual progress bar and count" },
  { value: "bar", label: "Bar only", description: "Minimal visual progress bar" },
  { value: "fraction", label: "Fraction only", description: "Numeric count (e.g. 2/5)" },
  { value: "none", label: "Hidden", description: "Hide progress indicators" },
];

const COMPLETED_STYLE_OPTIONS: ThemedSelectOption[] = [
  { value: "strike", label: "Strikethrough & Dim", description: "Cross out task and reduce opacity" },
  { value: "dim", label: "Dim text only", description: "Subtle muted opacity" },
  { value: "tick", label: "Checkmark only", description: "Only show checkmark in checkbox" },
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

const RESET_TIME_OPTIONS: ThemedSelectOption[] = [
  { value: "00:00", label: "12:00 AM (Midnight - Default)", description: "Standard midnight reset (default)" },
  { value: "01:00", label: "01:00 AM", description: "1 hour past midnight" },
  { value: "02:00", label: "02:00 AM", description: "2 hours past midnight" },
  { value: "03:00", label: "03:00 AM (Night Owl)", description: "For late workers and night owls" },
  { value: "04:00", label: "04:00 AM (Late Night)", description: "Reset before early morning start" },
  { value: "05:00", label: "05:00 AM (Early Riser)", description: "Fresh morning daily schedule" },
  { value: "06:00", label: "06:00 AM (Dawn Start)", description: "Standard morning work day start" },
];

const formatDisplayTime = (timeStr: string = "00:00") => {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const padH = displayH < 10 ? `0${displayH}` : `${displayH}`;
  const padM = m < 10 ? `0${m}` : `${m}`;
  if (h === 0 && m === 0) {
    return "12:00 AM (Default)";
  }
  return `${padH}:${padM} ${period}`;
};

const isPreset = (timeStr: string = "00:00") => {
  return RESET_TIME_OPTIONS.some((opt) => opt.value === timeStr);
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onUpdateTheme,
  historyRetentionDays = 7,
  onUpdateRetentionDays,
  dailyResetTime = "00:00",
  onUpdateDailyResetTime,
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
        className="w-full max-w-[760px] max-h-[92vh] flex flex-col rounded-[26px] bg-[#14161a] border border-white/[0.12] shadow-2xl overflow-hidden text-neutral-100 selection:bg-[#ff5733]/30"
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

        {/* Modal Navigation Tabs (Segmented Liquid Glass Control) */}
        <div className="flex items-center px-6 py-2.5 border-b border-white/[0.06] bg-[#15171b]/60 shrink-0 select-none">
          <SegmentedControl<"daily" | "appearance" | "updates">
            as="nav"
            className="p-1"
            buttonClassName="px-3.5 py-1.5 text-xs font-semibold gap-2"
            options={SETTINGS_TAB_OPTIONS}
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            accentColor={theme.accentColor || "#ff5733"}
          />
        </div>

        {/* Modal Scrollable Content (Scrollbar hidden, spacious padding) */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-6 pb-28 space-y-5">
          {/* TAB 1: DAILY TO-DO & HISTORY */}
          {activeTab === "daily" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Daily Reset Time Selector */}
              <div className="liquid-glass-card rounded-[22px] p-5 border border-white/[0.08] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-white tracking-tight">Daily Rollover & Reset Time</label>
                    <p className="text-xs text-neutral-400 leading-relaxed max-w-md">
                      Choose what time of day active to-dos automatically archive into the History stack and empty for the fresh day.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap shadow-sm">
                      {formatDisplayTime(dailyResetTime)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <span className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Preset Time</span>
                    <ThemedSelect
                      value={isPreset(dailyResetTime) ? dailyResetTime : "custom"}
                      onChange={(val) => {
                        if (val !== "custom" && onUpdateDailyResetTime) {
                          onUpdateDailyResetTime(val);
                        }
                      }}
                      options={[
                        ...RESET_TIME_OPTIONS,
                        { value: "custom", label: "Custom Time...", description: "Pick any exact hour and minute" },
                      ]}
                      accentColor={theme.accentColor || "#ff5733"}
                    />
                  </div>

                  {/* Custom Time Picker */}
                  <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-neutral-200 block">Set Custom Rollover Time</span>
                        <span className="text-[11px] text-neutral-500 block">Exact hour and minute of the reset</span>
                      </div>
                    </div>
                    <input
                      type="time"
                      value={dailyResetTime}
                      onChange={(e) => {
                        if (e.target.value && onUpdateDailyResetTime) {
                          onUpdateDailyResetTime(e.target.value);
                        }
                      }}
                      className="bg-[#181a1f] text-white text-xs font-mono px-3.5 py-2 rounded-xl border border-white/[0.12] hover:border-white/[0.2] focus:border-[#ff5733] focus:outline-none cursor-pointer transition-colors shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Retention Selector */}
              <div className="liquid-glass-card rounded-[20px] p-5 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-white">History Retention Period</label>
                    <p className="text-[11px] text-neutral-400">Choose how long daily to-do history stacks are maintained before pruning</p>
                  </div>
                  <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
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
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#ff8a65]" />
                          <span className="text-[#ff8a65]">Archived to History!</span>
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

          {/* TAB 2: APPEARANCE & THEME - Complete Controls Restored */}
          {activeTab === "appearance" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Card 1: Curated Color Presets */}
              <div className="liquid-glass-card rounded-[22px] p-5 border border-white/[0.08] shadow-xl">
                <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
                  <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Curated Color Presets</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                  {PRESET_THEMES.map((preset) => {
                    const isSelected =
                      theme.cardColor === preset.card && theme.accentColor === preset.accent;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#ff5733] bg-[#ff5733]/15 shadow-lg shadow-[#ff5733]/20"
                            : "border-white/[0.06] bg-[#14161a]/60 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.card }}
                          />
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-300 truncate w-full text-center">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Custom Palette */}
              <div className="liquid-glass-card rounded-[22px] p-5 border border-white/[0.08] shadow-xl">
                <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
                  <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
                    <Palette className="w-4 h-4" />
                  </div>
                  <span>Custom Palette</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  {/* Card background */}
                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">Card Background</label>
                    <div className="flex items-center gap-2.5 bg-[#14161a]/90 border border-white/[0.08] rounded-xl px-3 py-2">
                      <input
                        type="color"
                        value={theme.cardColor || "#22252a"}
                        onChange={(e) => updateThemeField("cardColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={theme.cardColor || "#22252a"}
                        onChange={(e) => updateThemeField("cardColor", e.target.value)}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Text color */}
                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">Text Color</label>
                    <div className="flex items-center gap-2.5 bg-[#14161a]/90 border border-white/[0.08] rounded-xl px-3 py-2">
                      <input
                        type="color"
                        value={theme.textColor || "#ffffff"}
                        onChange={(e) => updateThemeField("textColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={theme.textColor || "#ffffff"}
                        onChange={(e) => updateThemeField("textColor", e.target.value)}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Accent color */}
                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">Accent Color</label>
                    <div className="flex items-center gap-2.5 bg-[#14161a]/90 border border-white/[0.08] rounded-xl px-3 py-2">
                      <input
                        type="color"
                        value={theme.accentColor || "#ff5733"}
                        onChange={(e) => updateThemeField("accentColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={theme.accentColor || "#ff5733"}
                        onChange={(e) => updateThemeField("accentColor", e.target.value)}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Sticky Widget Dimensions & Glassmorphism */}
              <div className="liquid-glass-card rounded-[22px] p-5 border border-white/[0.08] shadow-xl">
                <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
                  <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <span>Sticky Widget Dimensions & Glassmorphism</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-4">
                  {/* Card Width */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                      <span>Card Width</span>
                      <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-0.5 rounded border border-white/20 shadow-sm">
                        {theme.width ?? 440}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="800"
                      value={theme.width ?? 440}
                      onChange={(e) => updateThemeField("width", Number(e.target.value))}
                      className="w-full accent-[#ff5733] cursor-pointer"
                    />
                  </div>

                  {/* Corner Roundness */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                      <span>Corner Roundness</span>
                      <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-0.5 rounded border border-white/20 shadow-sm">
                        {theme.radius ?? 22}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="48"
                      value={theme.radius ?? 22}
                      onChange={(e) => updateThemeField("radius", Number(e.target.value))}
                      className="w-full accent-[#ff5733] cursor-pointer"
                    />
                  </div>

                  {/* Internal Padding */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                      <span>Internal Padding</span>
                      <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-0.5 rounded border border-white/20 shadow-sm">
                        {theme.padding ?? 12}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="32"
                      value={theme.padding ?? 12}
                      onChange={(e) => updateThemeField("padding", Number(e.target.value))}
                      className="w-full accent-[#ff5733] cursor-pointer"
                    />
                  </div>

                  {/* Glass Opacity */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                      <span>Glass Opacity</span>
                      <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-0.5 rounded border border-white/20 shadow-sm">
                        {theme.opacity ?? 92}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={theme.opacity ?? 92}
                      onChange={(e) => updateThemeField("opacity", Number(e.target.value))}
                      className="w-full accent-[#ff5733] cursor-pointer"
                    />
                  </div>

                  {/* Backdrop Blur */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                      <span>Backdrop Blur</span>
                      <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-0.5 rounded border border-white/20 shadow-sm">
                        {theme.blur ?? 30}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={theme.blur ?? 30}
                      onChange={(e) => updateThemeField("blur", Number(e.target.value))}
                      className="w-full accent-[#ff5733] cursor-pointer"
                    />
                  </div>

                  {/* Item Spacing */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-neutral-300 mb-2">
                      <span>Item Spacing</span>
                      <span className="text-xs font-mono font-medium text-white bg-white/[0.08] px-2.5 py-0.5 rounded border border-white/20 shadow-sm">
                        {theme.spacing ?? 10}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="32"
                      value={theme.spacing ?? 10}
                      onChange={(e) => updateThemeField("spacing", Number(e.target.value))}
                      className="w-full accent-[#ff5733] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Typography & Task Styles */}
              <div className="liquid-glass-card rounded-[22px] p-5 border border-white/[0.08] shadow-xl">
                <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
                  <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
                    <Type className="w-4 h-4" />
                  </div>
                  <span>Typography & Task Styles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {/* Font Family */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Font Family</label>
                    <ThemedSelect
                      value={theme.font || "inter"}
                      onChange={(val) => updateThemeField("font", val)}
                      options={FONT_OPTIONS}
                      accentColor={theme.accentColor || "#ff5733"}
                    />
                  </div>

                  {/* Progress Style */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Progress Style</label>
                    <ThemedSelect
                      value={theme.progressStyle || "both"}
                      onChange={(val) => updateThemeField("progressStyle", val)}
                      options={PROGRESS_OPTIONS}
                      accentColor={theme.accentColor || "#ff5733"}
                    />
                  </div>

                  {/* Completed Task Style */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Completed Task Style</label>
                    <ThemedSelect
                      value={theme.completedStyle || "strike"}
                      onChange={(val) => updateThemeField("completedStyle", val)}
                      options={COMPLETED_STYLE_OPTIONS}
                      accentColor={theme.accentColor || "#ff5733"}
                    />
                  </div>

                  {/* Task Completion Order */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Task Completion Order</label>
                    <ThemedSelect
                      value={theme.completionOrder || "maintain"}
                      onChange={(val) => updateThemeField("completionOrder", val as "maintain" | "queue")}
                      options={COMPLETION_ORDER_OPTIONS}
                      accentColor={theme.accentColor || "#ff5733"}
                    />
                  </div>

                  {/* Task Density */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Task Density</label>
                    <ThemedSelect
                      value={theme.density || "comfortable"}
                      onChange={(val) => updateThemeField("density", val)}
                      options={DENSITY_OPTIONS}
                      accentColor={theme.accentColor || "#ff5733"}
                    />
                  </div>

                  {/* Motion Animations */}
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

                {/* Show Title Header Toggle */}
                <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={theme.showTitle ?? true}
                      onChange={(e) => updateThemeField("showTitle", e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer accent-[#ff5733]"
                    />
                    <span className="text-xs text-neutral-200 font-medium">Show List Title Header</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    Toggles visibility of widget title header
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOFTWARE UPDATES */}
          {activeTab === "updates" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="liquid-glass-card rounded-[22px] p-6 border border-white/[0.08] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  <img
                    src="/logo2.png"
                    alt="Taskmaster"
                    className="w-12 h-12 object-contain select-none shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white tracking-tight">Taskmaster</h3>
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
                Taskmaster automatically checks for updates on launch. When an update is detected, an update banner appears with one-click direct installer & portable download options.
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
