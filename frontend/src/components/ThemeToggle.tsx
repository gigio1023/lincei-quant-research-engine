import React from "react";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative h-8 w-14 rounded-full border border-[#2b3139] bg-[#181a20] transition focus:outline-none focus:ring-2 focus:ring-[#fcd535]/60"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-[#fcd535] transition-transform ${
          isDark ? "translate-x-6" : "translate-x-1"
        }`}
      />
      <span className="sr-only">Theme</span>
    </button>
  );
};

export default ThemeToggle;
