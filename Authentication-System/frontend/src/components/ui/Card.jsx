import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-slate-950/40 p-6 md:p-8 transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
