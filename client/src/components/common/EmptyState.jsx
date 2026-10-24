import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <Card className={cn('border-dashed border-border/80 bg-card/40 shadow-none', className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}
