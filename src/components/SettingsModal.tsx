import React, { useState } from "react";
import { OverlayTheme } from "../types";
import { 
  X, 
  Palette, 
  Layout, 
  Type, 
  Sliders 
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: OverlayTheme;
  onUpdateTheme: (newTheme: OverlayTheme) => void;
}

const PRESET_THEMES: { name: string; card: string; text: string; accent: string }[] = [
  { name: "Slate Minimal", card: "#0f172a", text: "#f8fafc", accent: "#38bdf8" },
  { name: "Obsidian Sun", card: "#18181b", text: "#fafafa", accent: "#f59e0b" },
  { name: "Cyber Violet", card: "#1e1b4b", text: "#ffffff", accent: "#a855f7" },
  { name: "Emerald Pro", card: "#06281e", text: "#ecfdf5", accent: "#10b981" },
  { name: "Pure Dark", card: "#000000", text: "#ededed", accent: "#3b82f6" },
  { name: "Alabaster Light", card: "#f8fafc", text: "#0f172a", accent: "#0284c7" },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onUpdateTheme,
}) => {
  const [activeTab, setActiveTab] = useState<"appearance" | "layout">("appearance");

  if (!isOpen) return null;

  const updateField = <K extends keyof OverlayTheme>(key: K, value: OverlayTheme[K]) => {
    onUpdateTheme({
      ...theme,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[360px] max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl overflow-hidden text-slate-200"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">Appearance & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-3 pt-2 gap-1 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium transition-all ${
              activeTab === "appearance"
                ? "bg-slate-800 text-sky-400 border-b-2 border-sky-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Style
          </button>
          <button
            onClick={() => setActiveTab("layout")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium transition-all ${
              activeTab === "layout"
                ? "bg-slate-800 text-sky-400 border-b-2 border-sky-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Layout
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === "appearance" && (
            <div className="space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Theme Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_THEMES.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        onUpdateTheme({
                          ...theme,
                          cardColor: preset.card,
                          textColor: preset.text,
                          accentColor: preset.accent,
                        });
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 transition-all text-left group"
                    >
                      <div className="flex gap-1 items-center">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: preset.card }}
                        />
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <span className="truncate text-[11px] font-medium text-slate-300 group-hover:text-white">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="space-y-2.5 pt-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Colors
                </label>
                
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-300">Card Background</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.cardColor}
                      onChange={(e) => updateField("cardColor", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-400">{theme.cardColor}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-300">Accent Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => updateField("accentColor", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-400">{theme.accentColor}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-300">Text Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.textColor}
                      onChange={(e) => updateField("textColor", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-400">{theme.textColor}</span>
                  </div>
                </div>
              </div>

              {/* Sliders: Opacity & Blur */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Opacity</span>
                    <span className="text-slate-400 font-mono">{theme.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={theme.opacity}
                    onChange={(e) => updateField("opacity", Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Backdrop Blur</span>
                    <span className="text-slate-400 font-mono">{theme.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={theme.blur}
                    onChange={(e) => updateField("blur", Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "layout" && (
            <div className="space-y-4">
              {/* Font Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  Font Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "inter", label: "Inter" },
                    { id: "jakarta", label: "Plus Jakarta" },
                    { id: "outfit", label: "Outfit" },
                    { id: "poppins", label: "Poppins" },
                    { id: "dmsans", label: "DM Sans" },
                    { id: "spacegrotesk", label: "Space Grotesk" },
                    { id: "montserrat", label: "Montserrat" },
                    { id: "quicksand", label: "Quicksand" },
                    { id: "space", label: "JetBrains Mono" },
                    { id: "firacode", label: "Fira Code" },
                    { id: "playfair", label: "Playfair Display" },
                    { id: "serif", label: "Georgia Serif" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => updateField("font", f.id)}
                      className={`p-2 rounded-lg text-left border transition-all ${
                        theme.font === f.id
                          ? "bg-sky-500/20 border-sky-400 text-sky-200 font-medium"
                          : "bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Density */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Density
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateField("density", "comfortable")}
                    className={`p-2 rounded-lg text-center border transition-all ${
                      theme.density === "comfortable"
                        ? "bg-sky-500/20 border-sky-400 text-sky-200 font-medium"
                        : "bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    onClick={() => updateField("density", "compact")}
                    className={`p-2 rounded-lg text-center border transition-all ${
                      theme.density === "compact"
                        ? "bg-sky-500/20 border-sky-400 text-sky-200 font-medium"
                        : "bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              {/* Sliders: Radius & Spacing */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Corner Roundness</span>
                    <span className="text-slate-400 font-mono">{theme.radius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={theme.radius}
                    onChange={(e) => updateField("radius", Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Item Spacing</span>
                    <span className="text-slate-400 font-mono">{theme.spacing}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="18"
                    value={theme.spacing}
                    onChange={(e) => updateField("spacing", Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Completed Style */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Completed Task Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "strike", label: "Strike" },
                    { id: "dim", label: "Dim Only" },
                    { id: "tick", label: "Tick Only" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateField("completedStyle", s.id)}
                      className={`p-2 rounded-lg text-center text-[11px] border transition-all ${
                        theme.completedStyle === s.id
                          ? "bg-sky-500/20 border-sky-400 text-sky-200 font-medium"
                          : "bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Display */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Progress Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "both", label: "Both" },
                    { id: "bar", label: "Bar Only" },
                    { id: "fraction", label: "Count Only" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => updateField("progressStyle", p.id)}
                      className={`p-2 rounded-lg text-center text-[11px] border transition-all ${
                        theme.progressStyle === p.id
                          ? "bg-sky-500/20 border-sky-400 text-sky-200 font-medium"
                          : "bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
