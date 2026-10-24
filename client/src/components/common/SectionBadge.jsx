import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookOpen, Calculator, Brain } from 'lucide-react';

export default function SectionBadge({ section = '', showIcon = true, className }) {
  const norm = String(section || '').toLowerCase();

  let colorClasses = 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20';
  let Icon = BookOpen;

  if (norm.includes('math')) {
    colorClasses = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    Icon = Calculator;
  } else if (norm.includes('reason') || norm.includes('intelligence')) {
    colorClasses = 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    Icon = Brain;
  } else if (norm.includes('aware') || norm.includes('general')) {
    colorClasses = 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20';
    Icon = BookOpen;
  }

  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1.5 font-medium px-2 py-0.5 text-xs border', colorClasses, className)}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0 opacity-80" />}
      <span className="truncate">{section || 'General'}</span>
    </Badge>
  );
}

