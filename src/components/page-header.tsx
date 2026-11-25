import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 mb-6 border-b border-slate-200/80 dark:border-white/10">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-[#064E3B]/60 border border-[#065F46]/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[#065F46] dark:bg-[#C8A253]" />
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#065F46] dark:text-[#E5C882]">
            Sistem Terpadu Kecamatan
          </span>
        </div>
        <h1 className="font-hero text-xl md:text-2xl font-extrabold tracking-tight text-[#041E17] dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="font-hero text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{children}</div>}
    </div>
  );
}
