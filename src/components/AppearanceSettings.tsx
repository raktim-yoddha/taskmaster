import React from "react";
import { OverlayTheme } from "../types";
import { Palette, Sliders, Type, Sparkles } from "lucide-react";
import { ThemedSelect } from "./ThemedSelect";
import { CURRENT_VERSION } from "../utils/updater";

interface AppearanceSettingsProps {
  theme: OverlayTheme;
  onUpdateTheme: (newTheme: OverlayTheme) => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  isCheckingUpdate: boolean;
  updateStatusMessage: string | null;
}

const PRESET_THEMES = [
  { name: "Liquid Glass Coral", card: "#22252a", text: "#ffffff", accent: "#ff5733" },
  { name: "Smoked Obsidian", card: "#181a1e", text: "#f4f4f5", accent: "#ff6847" },
  { name: "Deep Amber", card: "#23211e", text: "#ffffff", accent: "#ff902b" },
  { name: "Slate Minimal", card: "#20232a", text: "#f8fafc", accent: "#ff5733" },
  { name: "Monochrome Pitch", card: "#16171a", text: "#ffffff", accent: "#ffffff" },
  { name: "Frost Graphite", card: "#262930", text: "#ffffff", accent: "#ff5733" },
];

const FONT_OPTIONS = [
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

const PROGRESS_OPTIONS = [
  { value: "both", label: "Bar and fraction (2/5)", description: "Visual progress bar and count" },
  { value: "bar", label: "Bar only", description: "Minimal visual progress bar" },
  { value: "fraction", label: "Fraction only", description: "Numeric count (e.g. 2/5)" },
  { value: "none", label: "Hidden", description: "Hide progress indicators" },
];

const COMPLETED_STYLE_OPTIONS = [
  { value: "strike", label: "Strikethrough & Dim", description: "Cross out task and reduce opacity" },
  { value: "dim", label: "Dim text only", description: "Subtle muted opacity" },
  { value: "tick", label: "Checkmark only", description: "Only show checkmark in checkbox" },
];

const COMPLETION_ORDER_OPTIONS = [
  { value: "maintain", label: "Stay in place", description: "Tasks stay in their exact position when checked" },
  { value: "queue", label: "Move to bottom (Queue)", description: "Checked tasks move to bottom in completion order" },
];

const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable", description: "Spacious row padding for relaxed viewing" },
  { value: "compact", label: "Compact (High density)", description: "Tighter spacing to fit more tasks" },
];

const ANIMATION_OPTIONS = [
  { value: "subtle", label: "Subtle & Smooth", description: "Gentle fluid transitions" },
  { value: "playful", label: "Playful", description: "Lively spring interactions" },
  { value: "none", label: "None (Instant)", description: "Instant without transitions" },
];

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  onUpdateTheme,
  onCheckUpdates,
  isCheckingUpdate,
  updateStatusMessage,
}) => {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Preset Themes Card */}
      <div className="liquid-glass-card rounded-[22px] p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
          <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>Curated Color Presets</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-5">
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

      {/* Custom Color Palette */}
      <div className="liquid-glass-card rounded-[22px] p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
          <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
            <Palette className="w-4 h-4" />
          </div>
          <span>Custom Palette</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          {/* Card color */}
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

      {/* Geometry, Glassmorphism & Sizing */}
      <div className="liquid-glass-card rounded-[22px] p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
          <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
            <Sliders className="w-4 h-4" />
          </div>
          <span>Sticky Widget Dimensions & Glassmorphism</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Card Width</span>
              <span className="font-mono text-neutral-300">{theme.width ?? 440}px</span>
            </div>
            <input
              type="range"
              min="200"
              max="800"
              value={theme.width ?? 440}
              onChange={(e) => updateThemeField("width", Number(e.target.value))}
              className="w-full accent-[#ff5733] cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Corner Roundness</span>
              <span className="font-mono text-neutral-300">{theme.radius ?? 22}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="48"
              value={theme.radius ?? 22}
              onChange={(e) => updateThemeField("radius", Number(e.target.value))}
              className="w-full accent-[#ff5733] cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Internal Padding</span>
              <span className="font-mono text-neutral-300">{theme.padding ?? 12}px</span>
            </div>
            <input
              type="range"
              min="6"
              max="32"
              value={theme.padding ?? 12}
              onChange={(e) => updateThemeField("padding", Number(e.target.value))}
              className="w-full accent-[#ff5733] cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Glass Opacity</span>
              <span className="font-mono text-neutral-300">{theme.opacity ?? 92}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={theme.opacity ?? 92}
              onChange={(e) => updateThemeField("opacity", Number(e.target.value))}
              className="w-full accent-[#ff5733] cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Backdrop Blur</span>
              <span className="font-mono text-neutral-300">{theme.blur ?? 30}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={theme.blur ?? 30}
              onChange={(e) => updateThemeField("blur", Number(e.target.value))}
              className="w-full accent-[#ff5733] cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Item Spacing</span>
              <span className="font-mono text-neutral-300">{theme.spacing ?? 10}px</span>
            </div>
            <input
              type="range"
              min="4"
              max="32"
              value={theme.spacing ?? 10}
              onChange={(e) => updateThemeField("spacing", Number(e.target.value))}
              className="w-full accent-[#ff5733] cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Typography & Display Behavior */}
      <div className="liquid-glass-card rounded-[22px] p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] text-sm font-semibold text-white">
          <div className="w-7 h-7 rounded-xl bg-[#ff5733]/15 flex items-center justify-center text-[#ff5733]">
            <Type className="w-4 h-4" />
          </div>
          <span>Typography & Task Styles</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-5">
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
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Progress Style</label>
            <ThemedSelect
              value={theme.progressStyle || "both"}
              onChange={(val) => updateThemeField("progressStyle", val)}
              options={PROGRESS_OPTIONS}
              accentColor={theme.accentColor || "#ff5733"}
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Completed Task Style</label>
            <ThemedSelect
              value={theme.completedStyle || "strike"}
              onChange={(val) => updateThemeField("completedStyle", val)}
              options={COMPLETED_STYLE_OPTIONS}
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

        <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={theme.showTitle ?? true}
              onChange={(e) => updateThemeField("showTitle", e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: theme.accentColor || "#ff5733" }}
            />
            <span className="text-xs text-neutral-200 font-medium">Show List Title Header</span>
          </label>
          <span className="text-[11px] text-neutral-400">
            Toggles visibility of widget title header
          </span>
        </div>
      </div>

      {/* Software Updates & About Card */}
      <div className="liquid-glass-card rounded-[22px] p-6 shadow-xl flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Taskmaster Everywhere" className="w-6 h-6 object-contain select-none" />
            <span className="text-sm font-bold text-white tracking-tight">Taskmaster Everywhere</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ff5733]/15 text-[#ff5733] border border-[#ff5733]/30">
              v{CURRENT_VERSION}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">
            Liquid glass task management, desktop widget, and Pomodoro focus timer.
          </p>
          {updateStatusMessage && (
            <p className="text-xs text-[#ff5733] font-medium mt-1.5 animate-in fade-in">
              {updateStatusMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onCheckUpdates}
          disabled={isCheckingUpdate}
          className="liquid-coral-btn text-xs px-4 py-2.5 rounded-full font-semibold flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isCheckingUpdate ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <span>Check for Updates</span>
          )}
        </button>
      </div>
    </div>
  );
};
