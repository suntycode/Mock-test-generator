import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function FormField({ label, hint, error, required, htmlFor, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground/90 flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground leading-normal">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-destructive leading-normal">{error}</p>
      )}
    </div>
  );
}

