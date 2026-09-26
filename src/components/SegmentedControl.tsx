import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface SegmentedOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  pillClassName?: string;
  buttonClassName?: string;
  as?: "nav" | "div";
  accentColor?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
  pillClassName = "",
  buttonClassName = "",
  as = "div",
  accentColor,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());

  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [isReady, setIsReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const updateIndicator = () => {
    const button = buttonRefs.current.get(value);
    if (!button) return;

    setIndicator({
      left: button.offsetLeft,
      top: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
    });
    setIsReady(true);
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [value, options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateIndicator();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateIndicator();
      });
      observer.observe(container);
    }

    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => updateIndicator());
    }

    // Enable smooth animation only after initial mount/measurement to avoid flying in from (0,0)
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [value]);

  const Component = as === "nav" ? "nav" : "div";
  const hasCustomPadding = /\bp[xy]?-/.test(className);

  const hasCustomButtonX = /\bpx-/.test(buttonClassName);
  const hasCustomButtonY = /\bpy-/.test(buttonClassName);
  const hasCustomButtonAll = /\bp-[0-9\[]/.test(buttonClassName);

  const buttonPaddingX = !hasCustomButtonAll && !hasCustomButtonX ? "px-3 sm:px-3.5" : "";
  const buttonPaddingY = !hasCustomButtonAll && !hasCustomButtonY ? "py-1.5" : "";
  const defaultButtonPadding = [buttonPaddingX, buttonPaddingY].filter(Boolean).join(" ");

  return (
    <Component
      ref={containerRef as any}
      role="tablist"
      className={`relative inline-flex items-center bg-[#15171b]/90 ${hasCustomPadding ? "" : "p-1"} rounded-full border border-white/[0.08] shadow-inner shrink-0 select-none isolate ${className}`}
    >
      {/* Sliding Active Pill Indicator */}
      <div
        aria-hidden="true"
        className={`absolute left-0 top-0 rounded-full pointer-events-none z-0 ${
          isMounted
            ? "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "transition-none"
        } ${pillClassName || "bg-[#ff5733] border border-[#ff5733] shadow-md shadow-[#ff5733]/30"}`}
        style={{
          transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
          width: `${indicator.width}px`,
          height: `${indicator.height}px`,
          opacity: isReady ? 1 : 0,
          ...((accentColor && accentColor !== "#ff902b" && !accentColor.toLowerCase().includes("ff902b"))
            ? {
                backgroundColor: accentColor,
                borderColor: accentColor,
                boxShadow: `0 4px 14px -2px ${accentColor}66`,
              }
            : {
                backgroundColor: "#ff5733",
                borderColor: "#ff5733",
                boxShadow: "0 4px 14px -2px rgba(255, 87, 51, 0.4)",
              }),
        }}
      />

      {/* Segment Option Buttons */}
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(option.id, el);
              else buttonRefs.current.delete(option.id);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={option.title}
            onClick={() => onChange(option.id)}
            className={`relative z-10 flex items-center gap-1.5 ${defaultButtonPadding} rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 cursor-pointer outline-none focus:outline-none focus-visible:outline-none border-0 bg-transparent ${
              isActive ? "text-white" : "text-neutral-400 hover:text-white"
            } ${buttonClassName}`}
          >
            {option.icon}
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </Component>
  );
}
