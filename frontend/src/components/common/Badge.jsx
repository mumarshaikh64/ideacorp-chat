import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md' }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold'
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    online: 'bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5',
    busy: 'bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5',
    offline: 'bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5',
    open: 'bg-blue-50 text-blue-700 border border-blue-200',
    closed: 'bg-slate-100 text-slate-600 border border-slate-200',
    admin: 'bg-purple-50 text-purple-700 border border-purple-200',
    agent: 'bg-telecom-50 text-telecom-700 border border-telecom-200',
    supervisor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    viewer: 'bg-gray-100 text-gray-600 border border-gray-200'
  };

  const dotColors = {
    online: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClasses[size]} ${variantClasses[variant] || variantClasses.default}`}>
      {dotColors[variant] && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${variant === 'online' ? 'pulse-green' : ''}`} />
      )}
      {children}
    </span>
  );
}
