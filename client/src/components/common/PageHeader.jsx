import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, description, actions, badge, className }) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-center md:justify-between', className)}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
