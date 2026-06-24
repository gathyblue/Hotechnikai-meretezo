import React from 'react';
import { motion } from 'motion/react';

interface Option<T> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  layoutId,
  className = '',
  theme = 'light',
}: SegmentedControlProps<T>) {
  const isDark = theme === 'dark';
  
  return (
    <div
      className={`relative p-[2px] rounded-lg border flex gap-0.5 items-stretch select-none transition-colors duration-200 ${
        isDark
          ? 'bg-slate-950 border-slate-800 text-slate-300'
          : 'bg-slate-200 border-slate-300 text-slate-600'
      } ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 flex items-center justify-center text-[10px] font-bold py-1.5 px-2.5 rounded-md transition-colors cursor-pointer select-none whitespace-nowrap focus:outline-none focus:ring-0 ${
              isActive
                ? isDark
                  ? 'text-slate-100'
                  : 'text-slate-900 font-extrabold'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={`active-pill-${layoutId}`}
                transition={{ type: 'spring', stiffness: 400, damping: 33 }}
                className={`absolute inset-0 rounded-[5px] shadow-sm ${
                  isDark ? 'bg-slate-850 border border-slate-700/50' : 'bg-white border border-slate-250'
                }`}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
