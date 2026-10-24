import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function ErrorState({ title = 'Error', message, onRetry, className }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const rawMessage = typeof message === 'string' ? message : message?.message || String(message || '');

  const isNetworkError =
    rawMessage.toLowerCase().includes('network error') ||
    rawMessage.toLowerCase().includes('failed to fetch') ||
    rawMessage.toLowerCase().includes('econnrefused');

  const displayMessage = isNetworkError
    ? "Can't reach the server. Check that the backend is running on port 5000 and try again."
    : rawMessage || 'An unexpected error occurred. Please try again.';

  return (
    <Alert variant="destructive" className={cn('relative my-4 border-destructive/30 bg-destructive/5 text-destructive dark:border-destructive/40 dark:bg-destructive/10', className)}>
      <AlertCircle className="h-4 w-4" />
      <div className="flex-1 space-y-2">
        <AlertTitle className="font-semibold tracking-tight">{title}</AlertTitle>
        <AlertDescription className="text-sm text-foreground/90 font-normal leading-relaxed">
          {displayMessage}
        </AlertDescription>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 gap-1.5 border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}

          {rawMessage && (
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Technical details
                  {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <pre className="overflow-x-auto rounded-md bg-muted/70 p-2.5 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap max-w-2xl">
                  {rawMessage}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </Alert>
  );
}

