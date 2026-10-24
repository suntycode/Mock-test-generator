import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ label, title, value, hint, description, icon: Icon, trend, className }) {
  const displayLabel = label || title;
  const displayHint = hint || description;

  return (
    <Card className={cn('overflow-hidden border border-border/80 bg-card shadow-none', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{displayLabel}</p>
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
          {trend && (
            <span className={cn(
              'text-xs font-medium',
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}>
              {trend.value}
            </span>
          )}
        </div>
        {displayHint && (
          <p className="mt-1 text-xs text-muted-foreground">{displayHint}</p>
        )}
      </CardContent>
    </Card>
  );
}
