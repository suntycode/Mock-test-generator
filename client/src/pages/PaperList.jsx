import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import {
  FileStack,
  UploadCloud,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ArrowRight,
  Loader2,
  Trash2,
  Search,
  Layers,
  Database,
  Calendar,
  Layers3,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PaperList() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPapers, setExpandedPapers] = useState({});
  const [retryingPapers, setRetryingPapers] = useState({});
  const [retryingChunks, setRetryingChunks] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, extracted, pending, failed
  const [deleteTargetPaper, setDeleteTargetPaper] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchPapers(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const response = await apiClient.get('/papers');
      if (response.data?.ok) {
        setPapers(response.data.data || []);
      }
    } catch (err) {
      if (!quiet) {
        setError(err.response?.data?.error?.message || err.message || 'Could not load papers.');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    fetchPapers();
  }, []);

  // Poll automatically every 3 seconds if any paper is actively extracting
  const hasActiveExtraction = useMemo(() => {
    return papers.some((p) => p.status === 'extracting');
  }, [papers]);

  useEffect(() => {
    if (!hasActiveExtraction) return undefined;
    const interval = window.setInterval(() => {
      fetchPapers(true);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [hasActiveExtraction]);

  // Automatically clear local retrying states when server reports paper/chunk is no longer extracting
  useEffect(() => {
    setRetryingChunks((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!next[key]) continue;
        const [pId, cId] = key.split('-');
        const p = papers.find((item) => String(item._id) === pId);
        if (p) {
          const c = p.chunks?.find((chunk) => String(chunk.id) === cId);
          if (c && c.status !== 'extracting' && p.status !== 'extracting') {
            delete next[key];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });

    setRetryingPapers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const pId of Object.keys(next)) {
        if (!next[pId]) continue;
        const p = papers.find((item) => String(item._id) === pId);
        if (p && p.status !== 'extracting') {
          delete next[pId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [papers]);

  function toggleExpand(paperId) {
    setExpandedPapers((prev) => ({
      ...prev,
      [paperId]: !prev[paperId],
    }));
  }

  // Retry or extract remaining chunks (ONLY those not extracted yet)
  async function handleExtractRemaining(paper) {
    const paperId = paper._id;
    setRetryingPapers((prev) => ({ ...prev, [paperId]: true }));
    try {
      const response = await apiClient.post(`/papers/${paperId}/extract`);
      toast.success('Extraction started for remaining pending/failed chunks!');
      await fetchPapers(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Extraction failed to start.';
      toast.error(msg);
    } finally {
      setRetryingPapers((prev) => ({ ...prev, [paperId]: false }));
    }
  }

  // Retry a specific chunk individually
  async function handleRetrySingleChunk(paperId, chunkId) {
    const key = `${paperId}-${chunkId}`;
    setRetryingChunks((prev) => ({ ...prev, [key]: true }));
    try {
      await apiClient.post(`/papers/${paperId}/extract`, { chunkId });
      toast.success(`Extraction started for Chunk ${chunkId}!`);
      await fetchPapers(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || `Failed to retry Chunk ${chunkId}.`;
      toast.error(msg);
      setRetryingChunks((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // Delete paper
  async function handleDeletePaper() {
    if (!deleteTargetPaper) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/papers/${deleteTargetPaper._id}`);
      toast.success(`"${deleteTargetPaper.title}" deleted.`);
      setDeleteTargetPaper(null);
      await fetchPapers(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to delete paper.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  // Metrics summary
  const summary = useMemo(() => {
    let totalPapers = papers.length;
    let totalChunks = 0;
    let extractedChunks = 0;
    let pendingChunks = 0;
    let failedChunks = 0;

    for (const p of papers) {
      const cs = p.chunkSummary || {};
      totalChunks += cs.total || 0;
      extractedChunks += cs.extracted || 0;
      pendingChunks += cs.pending || 0;
      failedChunks += cs.failed || 0;
    }

    return {
      totalPapers,
      totalChunks,
      extractedChunks,
      pendingChunks,
      failedChunks,
    };
  }, [papers]);

  // Filtered papers
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.examKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shift?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      const cs = p.chunkSummary || {};
      if (statusFilter === 'extracted') {
        return cs.allExtracted || p.status === 'extracted';
      }
      if (statusFilter === 'pending') {
        return (cs.pending > 0 || p.status === 'extracting') && !cs.allExtracted;
      }
      if (statusFilter === 'failed') {
        return cs.failed > 0 || p.status === 'failed';
      }
      return true;
    });
  }, [papers, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Question Papers"
        description="Monitor uploaded question papers, inspect chunk extraction statuses, and trigger smart retries for pending chunks."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPapers()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/upload?tab=json">
              <FileCode className="h-4 w-4 text-primary" />
              Import JSON
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link to="/upload">
              <UploadCloud className="h-4 w-4" />
              Upload Paper
            </Link>
          </Button>
        </div>
      </PageHeader>

      {error && (
        <ErrorState
          title="Could Not Load Papers"
          message={error}
          onRetry={() => {
            setError('');
            fetchPapers();
          }}
        />
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-border/80 shadow-none bg-card/60">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Papers</span>
              <FileStack className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.totalPapers}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none bg-card/60">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Chunks</span>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.totalChunks}</div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <span>Extracted Chunks</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {summary.extractedChunks}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-medium">
              <span>Pending Chunks</span>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {summary.pendingChunks}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none bg-destructive/5 border-destructive/20 col-span-2 sm:col-span-1">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-destructive text-xs font-medium">
              <span>Failed Chunks</span>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold text-destructive">
              {summary.failedChunks}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search papers by title, shift, or exam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className="text-xs h-8"
          >
            All Papers ({papers.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'extracted' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('extracted')}
            className="text-xs h-8"
          >
            All Extracted
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            className="text-xs h-8"
          >
            Pending / In Progress
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'failed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('failed')}
            className="text-xs h-8"
          >
            Has Failed
          </Button>
        </div>
      </div>

      {/* Papers List */}
      {loading ? (
        <div className="rounded-xl border bg-card p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading papers & chunk statuses…</p>
        </div>
      ) : filteredPapers.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title={searchQuery || statusFilter !== 'all' ? 'No Matching Papers Found' : 'No Papers Uploaded Yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : 'Upload previous-year question papers to start extracting questions and generating mock tests.'
          }
        >
          {searchQuery || statusFilter !== 'all' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button asChild size="sm" className="gap-2">
              <Link to="/upload">
                <UploadCloud className="h-4 w-4" />
                Upload Your First Paper
              </Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {filteredPapers.map((paper) => {
            const cs = paper.chunkSummary || {
              total: paper.chunks?.length || 0,
              extracted: 0,
              pending: paper.chunks?.length || 0,
              failed: 0,
              allExtracted: false,
            };
            const chunks = paper.chunks || [];
            const isExtracting = paper.status === 'extracting';
            const isRetrying = retryingPapers[paper._id];
            const isExpanded = expandedPapers[paper._id];
            const percentExtracted =
              cs.total > 0 ? Math.round((cs.extracted / cs.total) * 100) : 0;
            const remainingCount = cs.pending + cs.failed;

            return (
              <Card
                key={paper._id}
                className="border-border/80 shadow-none overflow-hidden transition-all hover:border-border"
              >
                {/* Paper Header Row */}
                <CardHeader className="p-5 pb-4 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg font-bold">{paper.title}</CardTitle>
                        <StatusBadge status={paper.status} />
                        {cs.allExtracted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            All Chunks Extracted ({cs.extracted}/{cs.total})
                          </Badge>
                        ) : cs.failed > 0 ? (
                          <Badge variant="destructive" className="text-xs font-semibold gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {cs.failed} Failed Chunk{cs.failed > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold gap-1">
                            <Clock className="h-3 w-3" />
                            {cs.pending} Chunk{cs.pending > 1 ? 's' : ''} Pending
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers3 className="h-3.5 w-3.5" />
                          {paper.totalPages || 0} Pages · {cs.total} Chunks
                        </span>
                        {paper.shift && <span>· {paper.shift}</span>}
                        {paper.examDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(paper.examDate).toLocaleDateString()}
                          </span>
                        )}
                        {paper.extractionStats?.found > 0 && (
                          <span className="font-medium text-foreground">
                            · {paper.extractionStats.found} questions found
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                      {/* Retry Remaining Chunks button */}
                      {!cs.allExtracted && (
                        <Button
                          size="sm"
                          onClick={() => handleExtractRemaining(paper)}
                          disabled={isExtracting || isRetrying}
                          className="gap-1.5 text-xs h-8"
                        >
                          {isExtracting || isRetrying ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Extracting…
                            </>
                          ) : cs.failed > 0 ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              Retry Failed & Pending ({remainingCount})
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Extract Remaining ({remainingCount})
                            </>
                          )}
                        </Button>
                      )}

                      {/* Review Questions button if questions exist */}
                      {paper.extractionStats?.found > 0 && (
                        <Button asChild variant="outline" size="sm" className="gap-1 text-xs h-8">
                          <Link to={`/review?paperId=${paper._id}`}>
                            <FileCheck className="h-3.5 w-3.5 text-primary" />
                            Review
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}

                      {/* Expand / Collapse Chunks breakdown */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(paper._id)}
                        className="gap-1 text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Chunks</span>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            <span>View Chunks ({chunks.length})</span>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>

                      {/* Delete Paper button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTargetPaper(paper)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete paper"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Extraction Progress Bar & Chunk Summary Line */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <div className="flex items-center gap-2">
                        {isExtracting && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        <span>
                          Chunk extraction: <strong>{cs.extracted}</strong> of <strong>{cs.total}</strong> completed
                        </span>
                      </div>
                      <span className="tabular-nums font-semibold text-foreground">
                        {percentExtracted}%
                      </span>
                    </div>
                    <Progress value={percentExtracted} className="h-2" />
                  </div>

                  {/* Visual Chunk Blocks / Mini Strip */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-1.5">
                      <span>Chunk Map ({chunks.length} total)</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Extracted ({cs.extracted})
                        </span>
                        {cs.pending > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending ({cs.pending})
                          </span>
                        )}
                        {cs.failed > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-destructive" /> Failed ({cs.failed})
                          </span>
                        )}
                      </div>
                    </div>

                    <TooltipProvider delayDuration={150}>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {chunks.map((chunk) => {
                          const isThisChunkRetrying = Boolean(retryingChunks[`${paper._id}-${chunk.id}`]);
                          const isThisChunkExtracting = chunk.status === 'extracting' || isThisChunkRetrying;

                          let tileClass = 'bg-muted/60 text-muted-foreground border-border/80';
                          let icon = null;

                          if (chunk.status === 'extracted') {
                            tileClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
                            icon = <CheckCircle2 className="h-3 w-3 shrink-0" />;
                          } else if (chunk.status === 'failed') {
                            tileClass = 'bg-destructive/15 text-destructive border-destructive/30';
                            icon = <AlertCircle className="h-3 w-3 shrink-0" />;
                          } else if (isThisChunkExtracting) {
                            tileClass = 'bg-primary/10 text-primary border-primary/30';
                            icon = <Loader2 className="h-3 w-3 shrink-0 animate-spin" />;
                          } else {
                            tileClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
                            icon = <Clock className="h-3 w-3 shrink-0" />;
                          }

                          return (
                            <Tooltip key={chunk.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (chunk.status !== 'extracted' && !isThisChunkExtracting && !isExtracting) {
                                      handleRetrySingleChunk(paper._id, chunk.id);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border transition-all ${tileClass} ${
                                    chunk.status !== 'extracted' && !isThisChunkExtracting && !isExtracting
                                      ? 'cursor-pointer hover:ring-2 hover:ring-primary/40'
                                      : 'cursor-default'
                                  }`}
                                >
                                  {icon}
                                  <span>Chunk {chunk.id}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-semibold">Chunk {chunk.id}</p>
                                <p>Pages {chunk.startPage} – {chunk.endPage} ({chunk.pageCount} pages)</p>
                                <p className="capitalize mt-0.5">
                                  Status: <strong>{isThisChunkExtracting ? 'extracting' : chunk.status}</strong>
                                </p>
                                {chunk.hasCache && <p className="text-emerald-500 text-[10px]">✓ Cached on disk</p>}
                                {chunk.status !== 'extracted' && !isThisChunkExtracting && !isExtracting && (
                                  <p className="text-primary text-[10px] mt-1 font-medium">Click to extract/retry this chunk</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  </div>
                </CardHeader>

                {/* Collapsible Chunk Details Table */}
                {isExpanded && (
                  <CardContent className="p-0 border-t bg-muted/10">
                    <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Chunk Breakdown & Retry Controls
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Extracted chunks are preserved and skipped automatically during retry.
                        </p>
                      </div>
                      {!cs.allExtracted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExtractRemaining(paper)}
                          disabled={isExtracting || isRetrying}
                          className="h-7 text-xs gap-1.5"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Extract All Remaining ({remainingCount})
                        </Button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-24 text-xs font-semibold">Chunk</TableHead>
                            <TableHead className="text-xs font-semibold">Pages</TableHead>
                            <TableHead className="text-xs font-semibold">Disk Cache</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                            <TableHead className="text-right text-xs font-semibold">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chunks.map((chunk) => {
                            const chunkKey = `${paper._id}-${chunk.id}`;
                            const isChunkRetrying = Boolean(retryingChunks[chunkKey]);
                            const isChunkExtracting = chunk.status === 'extracting' || isChunkRetrying;

                            return (
                              <TableRow key={chunk.id} className="text-xs">
                                <TableCell className="font-semibold text-foreground">
                                  Chunk #{chunk.id}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  Pages {chunk.startPage} – {chunk.endPage}{' '}
                                  <span className="text-[11px]">({chunk.pageCount} pages)</span>
                                </TableCell>
                                <TableCell>
                                  {chunk.hasCache ? (
                                    <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1">
                                      <Database className="h-2.5 w-2.5" />
                                      Cached
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-[11px]">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {chunk.status === 'extracted' ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Extracted
                                    </Badge>
                                  ) : chunk.status === 'failed' ? (
                                    <Badge variant="destructive" className="text-[11px] font-medium gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Failed
                                    </Badge>
                                  ) : isChunkExtracting ? (
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Processing…
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px] font-medium gap-1">
                                      <Clock className="h-3 w-3" />
                                      Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {chunk.status === 'extracted' ? (
                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-end gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      Already extracted
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant={chunk.status === 'failed' ? 'destructive' : 'outline'}
                                      disabled={isExtracting || isChunkExtracting}
                                      onClick={() => handleRetrySingleChunk(paper._id, chunk.id)}
                                      className="h-7 text-xs gap-1.5"
                                    >
                                      {isChunkExtracting ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Extracting…
                                        </>
                                      ) : chunk.status === 'failed' ? (
                                        <>
                                          <RefreshCw className="h-3 w-3" />
                                          Retry Chunk
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="h-3 w-3" />
                                          Extract Chunk
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTargetPaper)} onOpenChange={(open) => !open && setDeleteTargetPaper(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question Paper?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTargetPaper?.title}</strong>? This will remove all rendered pages, cached chunks, and associated questions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTargetPaper(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePaper}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Paper
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

