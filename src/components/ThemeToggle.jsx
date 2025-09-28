"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Check, ChevronDown } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, themes, setTheme, themeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleThemeSelect = (themeKey) => {
    setTheme(themeKey);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: isOpen ? themeConfig.primary : themeConfig.surface,
          color: isOpen ? 'white' : themeConfig.text,
          border: `1px solid ${themeConfig.border}`
        }}
        title="Change Theme"
      >
        <Palette size={18} />
        <span className="hidden sm:inline text-sm font-medium">
          {themeConfig.icon} {themeConfig.name}
        </span>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Theme Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 py-2 w-48 rounded-xl shadow-lg border z-50"
          style={{
            backgroundColor: themeConfig.cardBackground,
            borderColor: themeConfig.border,
            boxShadow: `0 10px 25px ${themeConfig.shadow}`
          }}
        >
          <div 
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: themeConfig.textSecondary }}
          >
            Choose Theme
          </div>
          
          {Object.entries(themes).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleThemeSelect(key)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:scale-[0.98]"
              style={{
                backgroundColor: theme === key ? `${themeConfig.primary}15` : 'transparent',
                color: themeConfig.text
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === key 
                  ? `${themeConfig.primary}25` 
                  : `${themeConfig.primary}10`;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === key 
                  ? `${themeConfig.primary}15` 
                  : 'transparent';
              }}
            >
              {/* Theme Preview Circle */}
              <div 
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: config.primary,
                  borderColor: config.border
                }}
              />
              
              {/* Theme Info */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {config.icon} {config.name}
                  </span>
                  {theme === key && (
                    <Check size={14} style={{ color: themeConfig.primary }} />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for mobile/small spaces
export function CompactThemeToggle({ className = "" }) {
  const { themeConfig, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${className}`}
      style={{
        backgroundColor: themeConfig.surface,
        color: themeConfig.text,
        border: `1px solid ${themeConfig.border}`
      }}
      title={`Current: ${themeConfig.name} Theme`}
    >
      <Palette size={18} />
    </button>
  );
}
