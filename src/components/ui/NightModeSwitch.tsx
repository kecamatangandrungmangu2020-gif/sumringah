'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';

interface NightModeSwitchProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function NightModeSwitch({ className, size = 'md' }: NightModeSwitchProps) {
  const { isDark, toggleTheme } = useTheme();

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Mode Malam Aktif — Klik untuk Mode Siang' : 'Mode Siang Aktif — Klik untuk Mode Malam'}
      onClick={toggleTheme}
      title={isDark ? 'Mode Malam Aktif — Klik untuk Mode Siang' : 'Mode Siang Aktif — Klik untuk Mode Malam'}
      className={cn(
        'group relative inline-flex items-center shrink-0 cursor-pointer select-none rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7490] focus-visible:ring-offset-2',
        isSmall
          ? 'h-[26px] w-[48px] p-[2px]'
          : 'h-[30px] w-[56px] p-[2.5px]',
        isDark
          ? 'bg-slate-800/95 border border-slate-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
          : 'bg-cyan-100/80 border border-cyan-300/60 shadow-[inset_0_1px_3px_rgba(14,116,144,0.18)]',
        'hover:scale-105 active:scale-95',
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none select-none">
        <Sun
          className={cn(
            isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5',
            'text-amber-500 transition-opacity duration-300',
            isDark ? 'opacity-30' : 'opacity-0'
          )}
        />
        <Moon
          className={cn(
            isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5',
            'text-sky-500 transition-opacity duration-300',
            isDark ? 'opacity-0' : 'opacity-40'
          )}
        />
      </div>

      <motion.div
        layout
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 32,
        }}
        className={cn(
          'relative rounded-full flex items-center justify-center pointer-events-none z-10 transition-colors',
          isSmall ? 'h-[22px] w-[22px]' : 'h-[25px] w-[25px]',
          isDark
            ? isSmall ? 'left-[22px]' : 'left-[26px]'
            : 'left-0',
          isDark
            ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-sky-200 border border-slate-600/80 shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
            : 'bg-gradient-to-br from-white to-cyan-50 text-[#0E7490] border border-cyan-200/90 shadow-[0_2px_6px_rgba(14,116,144,0.25)]'
        )}
      >
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -45, scale: 0.7, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className={cn(isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5', 'fill-sky-300/40 text-sky-200')} />
          ) : (
            <Sun className={cn(isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5', 'fill-amber-400/50 text-amber-500')} />
          )}
        </motion.div>
      </motion.div>
    </button>
  );
}
