import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, FileText, CheckCheck } from 'lucide-react';

export default function StatusBadge({ status, className }) {
  const norm = String(status || '').toLowerCase().replace(/[-_]/g, ' ');

  let variant = 'secondary';
  let Icon = null;
  let customClass = '';

  if (['approved', 'verified', 'completed', 'submitted', 'extracted'].includes(norm)) {
    variant = 'success';
    Icon = CheckCircle2;
    customClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  } else if (['extracting', 'review', 'in progress', 'needs review', 'processing'].includes(norm)) {
    variant = 'warning';
    Icon = Clock;
    customClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  } else if (['failed', 'error', 'rejected'].includes(norm)) {
    variant = 'destructive';
    Icon = AlertCircle;
  } else if (['uploaded', 'auto submitted'].includes(norm)) {
    variant = 'secondary';
    Icon = FileText;
    customClass = 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20';
  }

  return (
    <Badge
      variant={variant}
      className={cn('inline-flex items-center gap-1 font-medium capitalize py-0.5 px-2 text-xs', customClass, className)}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{norm || 'Unknown'}</span>
    </Badge>
  );
}
