import React from 'react';

export default function Skeleton({ className = '', variant = 'text', ...props }) {
  const baseClasses = 'bg-slate-200 dark:bg-slate-850/60 animate-pulse';
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || ''} ${className}`}
      {...props}
    />
  );
}
