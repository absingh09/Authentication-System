import React from 'react';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm font-semibold',
  lg: 'h-16 w-16 text-xl font-bold',
  xl: 'h-24 w-24 text-3xl font-extrabold',
};

export default function Avatar({ src, name = '', size = 'md', className = '', isLoading = false }) {
  const sizeClasses = sizeMap[size] || sizeMap.md;
  
  // Calculate placeholder letter and a deterministic background color based on name length/hash
  const letter = name ? name.charAt(0).toUpperCase() : '?';
  const colors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-sky-500',
    'from-teal-500 to-emerald-500',
    'from-amber-500 to-orange-500',
  ];
  const colorIndex = name ? name.length % colors.length : 0;
  const gradientClass = colors[colorIndex];

  return (
    <div className={`relative rounded-full flex items-center justify-center overflow-hidden select-none shadow-inner border border-slate-200/50 dark:border-white/10 ${sizeClasses} ${className}`}>
      {isLoading ? (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center">
          <span className="sr-only">Loading...</span>
        </div>
      ) : src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-200"
          onError={(e) => {
            // Fallback if image fails to load
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-tr ${gradientClass} text-white flex items-center justify-center`}>
          {letter}
        </div>
      )}
    </div>
  );
}
