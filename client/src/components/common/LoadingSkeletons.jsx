import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CardGridSkeleton({ count = 4, className }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${count > 4 ? 4 : count} ${className || ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border/80 shadow-none">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4, className }) {
  return (
    <Card className={`border-border/80 shadow-none ${className || ''}`}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-3">
        <div className="flex gap-4 border-b pb-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-2 border-b border-border/40 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function FormSkeleton({ fields = 4, className }) {
  return (
    <Card className={`border-border/80 shadow-none ${className || ''}`}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </CardContent>
    </Card>
  );
}

