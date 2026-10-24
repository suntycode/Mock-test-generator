import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import FormField from '@/components/common/FormField';
import FileDropzone from '@/components/common/FileDropzone';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import {
  UploadCloud,
  FileText,
  FileStack,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Loader2,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export default function UploadPaper() {
  const [form, setForm] = useState({
    examKey: 'rrb-ntpc-ug-cbt2',
    title: '',
    examDate: '',
    shift: 'Shift 1',
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paper, setPaper] = useState(null);
  const [startingExtraction, setStartingExtraction] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paper?._id || paper.status !== 'extracting') return undefined;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await apiClient.get(`/papers/${paper._id}`);
        if (active) setPaper(response.data.data);
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.error?.message || requestError.message || 'Could not refresh extraction progress.');
        }
      }
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [paper?._id, paper?.status]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setFileError(null);

    if (!file) {
      setFileError('Please select a PDF file to upload.');
      return;
    }

    if (!form.title.trim()) {
      setError('Please provide a paper title.');
      return;
    }

    setPaper(null);
    setProgress(0);

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append('file', file);

    setUploading(true);
    try {
      const response = await apiClient.post('/papers', body, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        },
      });
      setPaper(response.data.data);
      setProgress(100);
      toast.success('Paper uploaded and pages rendered successfully!');
    } catch (requestError) {
      const msg = requestError.response?.data?.error?.message || requestError.message || 'Upload failed.';
      setError(msg);
      toast.error('Failed to upload paper');
    } finally {
      setUploading(false);
    }
  }

  async function startExtraction() {
    if (!paper) return;
    setError('');
    setStartingExtraction(true);
    try {
      const response = await apiClient.post(`/papers/${paper._id}/extract`);
      setPaper((current) => ({
        ...current,
        status: response.data.data.status,
        progress: response.data.data.progress || current.progress,
      }));
      toast.info('AI Question extraction started');
    } catch (requestError) {
      const msg = requestError.response?.data?.error?.message || requestError.message || 'Could not start extraction.';
      setError(msg);
      toast.error(msg);
    } finally {
      setStartingExtraction(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Paper"
        description="Add a previous-year paper. Pages are saved locally and rendered for review."
      />

      {error && (
        <ErrorState
          title="Upload Error"
          message={error}
          onRetry={() => {
            setError('');
          }}
        />
      )}

      {/* Two Column Layout: 2/3 Left + 1/3 Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Paper Details Card (2 Cols) */}
        <div className="lg:col-span-2">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Paper Details</CardTitle>
              <CardDescription>
                Provide the exam metadata and upload the original PDF file.
              </CardDescription>
            </CardHeader>

            <form onSubmit={submit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Exam Profile */}
                  <FormField label="Exam Profile" hint="Fixed to RRB NTPC for this profile">
                    <Select
                      value={form.examKey}
                      onValueChange={(val) => updateField('examKey', val)}
                    >
                      <SelectTrigger id="examKey">
                        <SelectValue placeholder="Select Exam" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rrb-ntpc-ug-cbt2">
                          RRB NTPC Undergraduate CBT-II
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  {/* Paper Title */}
                  <FormField
                    label="Paper Title"
                    required
                    hint="A descriptive title for this question set"
                  >
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="e.g. RRB NTPC UG CBT-II 17-Sep-2026 Shift 1"
                      required
                    />
                  </FormField>

                  {/* Exam Date */}
                  <FormField label="Exam Date" required hint="Date when the exam was held">
                    <Input
                      id="examDate"
                      type="date"
                      value={form.examDate}
                      onChange={(e) => updateField('examDate', e.target.value)}
                      required
                    />
                  </FormField>

                  {/* Shift */}
                  <FormField label="Shift" required hint="Exam shift or session">
                    <Select
                      value={form.shift}
                      onValueChange={(val) => updateField('shift', val)}
                    >
                      <SelectTrigger id="shift">
                        <SelectValue placeholder="Select Shift" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Shift 1">Shift 1 (Morning)</SelectItem>
                        <SelectItem value="Shift 2">Shift 2 (Afternoon)</SelectItem>
                        <SelectItem value="Shift 3">Shift 3 (Evening)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                {/* PDF File Dropzone */}
                <FormField
                  label="Exam Paper (PDF)"
                  required
                  hint="Accepts standard PDF files up to 50 MB. Files are stored on your local disk."
                  error={fileError}
                >
                  <FileDropzone
                    file={file}
                    error={fileError}
                    accept="application/pdf,.pdf"
                    maxSizeMB={50}
                    onChange={(f, err) => {
                      setFile(f);
                      setFileError(err);
                    }}
                  />
                </FormField>

                {/* Uploading Progress */}
                {uploading && (
                  <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                    <div className="flex items-center justify-between text-xs font-medium text-foreground">
                      <span>Uploading and rendering pages…</span>
                      <span className="tabular-nums font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={uploading}
                  className="w-full sm:w-auto gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing PDF…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Upload Paper
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right: How It Works Card (1 Col) */}
        <div>
          <Card className="border-border/80 shadow-none bg-card/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                How It Works
              </CardTitle>
              <CardDescription>
                Automated vision extraction pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className="flex gap-3 items-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  1
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Local PDF Splitting</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The paper is split into chunks and rendered into crisp 150 DPI page images.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  2
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Gemini Vision Extraction</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI detects questions, LaTeX math formulas, and reads the visual green tick answer.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  3
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Side-by-Side Review</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review flagged questions alongside the source page image and approve into your question bank.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 flex items-center gap-2.5 text-xs text-muted-foreground">
                <Lock className="h-4 w-4 text-primary shrink-0" />
                <span>Files stay on your computer. Nothing is hosted publicly.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Paper Extraction Result Card */}
      {paper && (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{paper.title}</CardTitle>
                <StatusBadge status={paper.status} />
              </div>
              <CardDescription>
                {paper.totalPages || 0} pages rendered · {paper.originalFilename}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['uploaded', 'failed'].includes(paper.status) && (
                <Button
                  onClick={startExtraction}
                  disabled={startingExtraction}
                  className="gap-2"
                >
                  {startingExtraction ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : paper.status === 'failed' ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Retry Failed Chunks
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Extract Questions
                    </>
                  )}
                </Button>
              )}

              {paper.extractionStats?.found > 0 && (
                <Button asChild variant="outline" className="gap-2">
                  <Link to={`/review?paperId=${paper._id}`}>
                    <FileCheck className="h-4 w-4 text-primary" />
                    Review Questions
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}

              <Button asChild variant="outline" className="gap-2">
                <Link to="/papers">
                  <FileStack className="h-4 w-4 text-primary" />
                  All Papers
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Extraction Progress Bar */}
            {paper.status === 'extracting' && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Processing page chunks: {paper.progress?.chunksDone || 0} / {paper.progress?.chunksTotal || '…'}
                  </span>
                  <span className="tabular-nums text-primary">
                    {paper.progress?.chunksTotal
                      ? `${Math.round(((paper.progress?.chunksDone || 0) / paper.progress.chunksTotal) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <Progress
                  value={
                    paper.progress?.chunksTotal
                      ? Math.round(((paper.progress?.chunksDone || 0) / paper.progress.chunksTotal) * 100)
                      : 10
                  }
                  className="h-2"
                />
                {!!paper.progress?.retryPagesTotal && (
                  <p className="text-xs text-muted-foreground">
                    Retrying pages near missing question numbers: {paper.progress.retryPagesDone || 0} / {paper.progress.retryPagesTotal}
                  </p>
                )}
              </div>
            )}

            {/* Extraction Stats */}
            {paper.extractionStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border p-3.5 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">Questions Found</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {paper.extractionStats.found} / {paper.extractionStats.expected}
                  </p>
                </div>
                <div className="rounded-lg border p-3.5 bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">Needs Review</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {paper.extractionStats.needsReview}
                  </p>
                </div>
                <div className="rounded-lg border p-3.5 bg-muted/20 col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground font-medium">Approval Status</p>
                  <p className="text-lg font-bold text-foreground mt-0.5 capitalize">
                    {paper.status}
                  </p>
                </div>
              </div>
            )}

            {/* Warnings and Missing Questions */}
            {!!paper.extractionStats?.missingQNos?.length && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Missing question numbers in extraction: <strong>{paper.extractionStats.missingQNos.join(', ')}</strong>
                </span>
              </div>
            )}

            {!!paper.progress?.failedChunks?.length && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Failed chunks: {paper.progress.failedChunks.join(', ')}. Retry will process only these chunks.
                </span>
              </div>
            )}

            {/* Page Thumbnails */}
            {paper.pageImageUrls && paper.pageImageUrls.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-semibold text-foreground">Rendered Page Previews</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {paper.pageImageUrls.map((imageUrl, index) => (
                    <div
                      key={imageUrl}
                      className="group relative overflow-hidden rounded-lg border border-border/80 bg-muted/20 transition-all hover:border-primary/50"
                    >
                      <img
                        src={`${apiRoot}${imageUrl.replace(/^\/api/, '')}`}
                        alt={`Page ${index + 1} of ${paper.title}`}
                        loading="lazy"
                        className="aspect-[0.72] w-full object-contain bg-background"
                      />
                      <div className="p-1.5 text-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
