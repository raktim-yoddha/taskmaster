import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface ThemedSelectOption {
  value: string;
  label: string;
  description?: string;
  fontFamily?: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  accentColor?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const ThemedSelect: React.FC<ThemedSelectProps> = ({
  value,
  onChange,
  options,
  accentColor = "#ff5733",
  placeholder = "Select an option",
  className = "",
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Auto-scroll scrollable ancestor so the section moves up and the full dropdown is visible
  useEffect(() => {
    if (!isOpen) return;

    const scrollToFit = () => {
      if (!menuRef.current) return;
      const menuEl = menuRef.current;

      // Find the nearest scrollable ancestor container (e.g. SettingsModal scroll container)
      let parent: HTMLElement | null = menuEl.parentElement;
      let scrollContainer: HTMLElement | null = null;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
          parent.scrollHeight > parent.clientHeight
        ) {
          scrollContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }

      if (scrollContainer) {
        const menuRect = menuEl.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // Calculate how much the dropdown exceeds the bottom of the visible scroll container
        const buffer = 24; // comfortable breathing room above footer / bottom boundary
        const overflowBottom = menuRect.bottom - containerRect.bottom + buffer;

        if (overflowBottom > 0) {
          scrollContainer.scrollBy({
            top: overflowBottom,
            behavior: "smooth",
          });
        }
      } else {
        menuEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    // Small delay to allow dropdown entrance animation and DOM layout measurement
    const timer = setTimeout(scrollToFit, 40);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${isOpen ? "z-40" : "z-10"} ${className}`}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 bg-[#14161a] border rounded-xl px-3 py-2 text-xs text-left transition-all duration-200 cursor-pointer group"
        style={{
          borderColor: isOpen ? accentColor : "rgba(255, 255, 255, 0.08)",
          boxShadow: isOpen
            ? `0 0 0 2px ${accentColor}25, 0 4px 14px rgba(0, 0, 0, 0.4)`
            : "none",
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className="truncate text-white font-medium"
          style={selectedOption?.fontFamily ? { fontFamily: selectedOption.fontFamily } : undefined}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 shrink-0"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            color: isOpen ? accentColor : undefined,
          }}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/[0.12] bg-[#16181d]/95 backdrop-blur-2xl shadow-2xl p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            boxShadow:
              "0 20px 45px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg text-left transition-all duration-150 cursor-pointer ${isSelected
                      ? "font-medium"
                      : "text-neutral-300 hover:text-white hover:bg-white/[0.07]"
                    }`}
                  style={{
                    backgroundColor: isSelected ? `${accentColor}1c` : undefined,
                    color: isSelected ? accentColor : undefined,
                  }}
                >
                  <div className="flex flex-col min-w-0 pr-1">
                    <span
                      className="truncate leading-snug"
                      style={
                        option.fontFamily
                          ? { fontFamily: option.fontFamily }
                          : undefined
                      }
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight line-clamp-1">
                        {option.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 shrink-0 stroke-[2.5]"
                      style={{ color: accentColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
