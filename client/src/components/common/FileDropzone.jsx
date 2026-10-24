import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FileDropzone({
  accept = '.pdf,application/pdf',
  maxSizeMB = 50,
  file,
  onChange,
  error,
  className,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndPass(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (selectedFile) => {
    if (maxSizeMB && selectedFile.size > maxSizeMB * 1024 * 1024) {
      if (onChange) onChange(null, `File size exceeds ${maxSizeMB} MB limit.`);
      return;
    }
    if (onChange) onChange(selectedFile, null);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    if (onChange) onChange(null, null);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDragOver
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border/80 hover:border-primary/50 hover:bg-muted/40',
          error && 'border-destructive/60 bg-destructive/5',
          file && 'border-solid border-border/90 bg-muted/20'
        )}
      >
        {file ? (
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                <span className="text-primary font-semibold underline-offset-4 hover:underline">
                  Click to browse
                </span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PDF exam papers up to {maxSizeMB} MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

