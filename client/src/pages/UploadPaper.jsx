import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Code2,
  FileCode,
  FileJson,
  RotateCcw,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const SAMPLE_JSON_TEMPLATE = {
  examKey: 'rrb-ntpc-ug-cbt2',
  title: 'RRB NTPC CBT-2 Mock Test Set 1',
  examDate: new Date().toISOString().split('T')[0],
  shift: 'Shift 1',
  autoApprove: true,
  questions: [
    {
      qNo: 1,
      section: 'General Awareness',
      category: 'General Science',
      subcategory: 'Chemistry',
      difficulty: 'easy',
      language: 'hi',
      text: 'बेकिंग सोडा (Baking Soda) का रासायनिक नाम निम्नलिखित में से क्या है?',
      options: {
        A: 'सोडियम कार्बोनेट',
        B: 'सोडियम हाइड्रोजनकार्बोनेट',
        C: 'कैल्शियम ऑक्सीक्लोराइड',
        D: 'सोडियम हाइड्रॉक्साइड'
      },
      correctOption: 'B',
      explanation: 'बेकिंग सोडा का रासायनिक नाम सोडियम हाइड्रोजनकार्बोनेट ($NaHCO_3$) है।',
      hasFigure: false
    },
    {
      qNo: 2,
      section: 'Mathematics',
      category: 'Arithmetic',
      subcategory: 'Percentage',
      difficulty: 'medium',
      language: 'en',
      text: 'If A is 20% more than B, then by what percentage is B less than A?',
      options: [
        '16.67%',
        '20%',
        '25%',
        '15%'
      ],
      correctOption: 'A',
      explanation: 'Let B = 100, then A = 120. Percentage difference = ((120 - 100) / 120) * 100 = 16.67%.',
      hasFigure: false
    }
  ]
};

export default function UploadPaper() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'json' ? 'json' : 'pdf';
  const [activeTab, setActiveTab] = useState(initialTab);

  // PDF Upload Form State
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

  // JSON Import State
  const [jsonInputMode, setJsonInputMode] = useState('text'); // 'text' | 'file'
  const [jsonText, setJsonText] = useState('');
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonFileError, setJsonFileError] = useState(null);
  const [jsonMeta, setJsonMeta] = useState({
    examKey: 'rrb-ntpc-ug-cbt2',
    title: '',
    examDate: new Date().toISOString().split('T')[0],
    shift: 'Shift 1',
    autoApprove: true
  });
  const [jsonParseError, setJsonParseError] = useState('');
  const [parsedPayload, setParsedPayload] = useState(null);
  const [importingJson, setImportingJson] = useState(false);
  const [jsonImportResult, setJsonImportResult] = useState(null);

  // Sync tab change with URL query param
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'json' ? { tab: 'json' } : {});
  };

  // Poll for PDF extraction progress
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

  function updateJsonMeta(name, value) {
    setJsonMeta((current) => ({ ...current, [name]: value }));
  }

  // Parse JSON text and update live preview
  const parseJsonContent = (text) => {
    if (!text || !text.trim()) {
      setJsonParseError('');
      setParsedPayload(null);
      return;
    }
    try {
      const data = JSON.parse(text);
      setJsonParseError('');
      setParsedPayload(data);

      // Auto-populate paper metadata if contained inside the JSON
      const paperObj = data.paper || data;
      if (paperObj.title && !jsonMeta.title) {
        setJsonMeta((prev) => ({
          ...prev,
          title: paperObj.title || prev.title,
          shift: paperObj.shift || prev.shift,
          examKey: paperObj.examKey || prev.examKey,
          autoApprove: paperObj.autoApprove !== undefined ? Boolean(paperObj.autoApprove) : prev.autoApprove
        }));
      }
    } catch (err) {
      setJsonParseError(`JSON Syntax Error: ${err.message}`);
      setParsedPayload(null);
    }
  };

  const handleJsonTextChange = (e) => {
    const val = e.target.value;
    setJsonText(val);
    parseJsonContent(val);
  };

  const handleJsonFileDrop = async (f, err) => {
    setJsonFile(f);
    setJsonFileError(err);
    if (!f) {
      return;
    }
    try {
      const text = await f.text();
      setJsonText(text);
      parseJsonContent(text);
      toast.success(`Loaded "${f.name}"`);
    } catch {
      setJsonFileError('Failed to read JSON file.');
      toast.error('Failed to read JSON file.');
    }
  };

  const loadSampleTemplate = () => {
    const sampleStr = JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2);
    setJsonText(sampleStr);
    parseJsonContent(sampleStr);
    setJsonMeta({
      examKey: SAMPLE_JSON_TEMPLATE.examKey,
      title: SAMPLE_JSON_TEMPLATE.title,
      examDate: SAMPLE_JSON_TEMPLATE.examDate,
      shift: SAMPLE_JSON_TEMPLATE.shift,
      autoApprove: SAMPLE_JSON_TEMPLATE.autoApprove
    });
    toast.info('Sample JSON template loaded');
  };

  const formatJson = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      toast.success('JSON formatted');
    } catch (e) {
      toast.error('Cannot format invalid JSON');
    }
  };

  // Derived stats from parsed JSON
  const detectedQuestions = useMemo(() => {
    if (!parsedPayload) return [];
    if (Array.isArray(parsedPayload.questions)) return parsedPayload.questions;
    if (Array.isArray(parsedPayload)) return parsedPayload;
    return [];
  }, [parsedPayload]);

  const sectionsBreakdown = useMemo(() => {
    const counts = {};
    for (const q of detectedQuestions) {
      const sec = q.section || 'General Awareness';
      counts[sec] = (counts[sec] || 0) + 1;
    }
    return counts;
  }, [detectedQuestions]);

  // Submit JSON Paper Import
  async function submitJsonImport(e) {
    e.preventDefault();
    setError('');
    setJsonParseError('');

    if (!jsonText.trim()) {
      setJsonParseError('Please provide JSON content or upload a JSON file.');
      toast.error('Please provide JSON content');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setJsonParseError(`Invalid JSON: ${err.message}`);
      toast.error('Invalid JSON structure');
      return;
    }

    const questionsList = Array.isArray(parsed.questions) ? parsed.questions : (Array.isArray(parsed) ? parsed : []);
    if (!questionsList.length) {
      setJsonParseError('The JSON must contain a "questions" array with at least 1 question.');
      toast.error('No questions found in JSON');
      return;
    }

    const titleToUse = jsonMeta.title.trim() || parsed.title || parsed.paper?.title || 'Imported Question Paper';

    const payload = {
      examKey: jsonMeta.examKey || parsed.examKey || parsed.paper?.examKey || 'rrb-ntpc-ug-cbt2',
      title: titleToUse,
      examDate: jsonMeta.examDate || parsed.examDate || parsed.paper?.examDate,
      shift: jsonMeta.shift || parsed.shift || parsed.paper?.shift || 'Shift 1',
      autoApprove: jsonMeta.autoApprove,
      questions: questionsList
    };

    setImportingJson(true);
    setJsonImportResult(null);

    try {
      const response = await apiClient.post('/papers/import-json', payload);
      if (response.data?.ok) {
        setJsonImportResult(response.data.data);
        toast.success(`Imported ${response.data.data.questionsCount} questions successfully!`);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to import JSON paper.';
      setError(msg);
      toast.error(msg);
    } finally {
      setImportingJson(false);
    }
  }

  // Submit PDF Upload
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
        title="Upload & Import Papers"
        description="Add previous-year question papers via PDF extraction or direct JSON import."
      />

      {error && (
        <ErrorState
          title="Operation Error"
          message={error}
          onRetry={() => {
            setError('');
          }}
        />
      )}

      {/* Tabs: PDF vs JSON */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pdf" className="gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload PDF (AI Vision)
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-2">
            <FileCode className="h-4 w-4" />
            Import via JSON
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: PDF UPLOAD ================= */}
        <TabsContent value="pdf" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: Paper Details Card */}
            <div className="lg:col-span-2">
              <Card className="border-border/80 shadow-none">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">PDF Paper Details</CardTitle>
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

            {/* Right: How It Works Card */}
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
                  </div>
                )}

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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================= TAB 2: JSON IMPORT ================= */}
        <TabsContent value="json" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left: JSON Form Card (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/80 shadow-none">
                <CardHeader className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">Import Paper from JSON</CardTitle>
                      <CardDescription>
                        Import pre-formatted exam papers and questions directly without PDF processing.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadSampleTemplate}
                        className="gap-1.5 text-xs"
                      >
                        <FileCode className="h-3.5 w-3.5 text-primary" />
                        Load Template
                      </Button>
                      {jsonText && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={formatJson}
                          className="gap-1.5 text-xs"
                        >
                          Prettify
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <form onSubmit={submitJsonImport}>
                  <CardContent className="space-y-6">
                    {/* Metadata Overrides */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
                      <FormField label="Paper Title" required hint="Name of the question set">
                        <Input
                          value={jsonMeta.title}
                          onChange={(e) => updateJsonMeta('title', e.target.value)}
                          placeholder="e.g. RRB NTPC CBT-2 Mock Test Set 1"
                          required
                        />
                      </FormField>

                      <FormField label="Exam Profile" hint="Fixed to RRB NTPC profile">
                        <Select
                          value={jsonMeta.examKey}
                          onValueChange={(val) => updateJsonMeta('examKey', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Exam" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rrb-ntpc-ug-cbt2">
                              RRB NTPC Undergraduate CBT-II
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Exam Date" hint="Date held or scheduled">
                        <Input
                          type="date"
                          value={jsonMeta.examDate}
                          onChange={(e) => updateJsonMeta('examDate', e.target.value)}
                        />
                      </FormField>

                      <FormField label="Exam Shift">
                        <Select
                          value={jsonMeta.shift}
                          onValueChange={(val) => updateJsonMeta('shift', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Shift" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Shift 1">Shift 1 (Morning)</SelectItem>
                            <SelectItem value="Shift 2">Shift 2 (Afternoon)</SelectItem>
                            <SelectItem value="Shift 3">Shift 3 (Evening)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      <div className="md:col-span-2 flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="autoApprove" className="text-sm font-medium">
                            Auto-Approve Verified Questions
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            When enabled, questions with valid options and answers are verified immediately for mock tests.
                          </p>
                        </div>
                        <Switch
                          id="autoApprove"
                          checked={jsonMeta.autoApprove}
                          onCheckedChange={(val) => updateJsonMeta('autoApprove', val)}
                        />
                      </div>
                    </div>

                    {/* Input Mode Selector: Paste vs File */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">JSON Data</Label>
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setJsonInputMode('text')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                              jsonInputMode === 'text'
                                ? 'bg-background text-foreground shadow-sm font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Paste / Edit JSON
                          </button>
                          <button
                            type="button"
                            onClick={() => setJsonInputMode('file')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                              jsonInputMode === 'file'
                                ? 'bg-background text-foreground shadow-sm font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Upload .json File
                          </button>
                        </div>
                      </div>

                      {jsonInputMode === 'file' ? (
                        <FileDropzone
                          file={jsonFile}
                          error={jsonFileError}
                          accept=".json,application/json"
                          maxSizeMB={20}
                          onChange={handleJsonFileDrop}
                        />
                      ) : (
                        <Textarea
                          value={jsonText}
                          onChange={handleJsonTextChange}
                          rows={14}
                          placeholder='Paste your JSON here (e.g. { "title": "...", "questions": [ { "text": "...", "options": { "A": "..." }, "correctOption": "A" } ] })'
                          className="font-mono text-xs leading-relaxed"
                          spellCheck={false}
                        />
                      )}
                    </div>

                    {/* Live Validation Banner */}
                    {jsonParseError && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{jsonParseError}</span>
                      </div>
                    )}

                    {detectedQuestions.length > 0 && !jsonParseError && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-semibold text-primary">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Detected {detectedQuestions.length} Questions
                          </span>
                          <span className="text-muted-foreground font-normal">Ready to import</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(sectionsBreakdown).map(([sec, count]) => (
                            <Badge key={sec} variant="secondary" className="text-[11px] font-normal">
                              {sec}: <strong className="ml-1 text-foreground">{count}</strong>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={importingJson || !detectedQuestions.length || !!jsonParseError}
                      className="w-full sm:w-auto gap-2"
                    >
                      {importingJson ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing Paper…
                        </>
                      ) : (
                        <>
                          <FileCode className="h-4 w-4" />
                          Import Paper & Questions
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* JSON Import Success Result Card */}
              {jsonImportResult && (
                <Card className="border-green-500/30 bg-green-500/5 shadow-none">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <CardTitle className="text-lg">
                          {jsonImportResult.paper.title}
                        </CardTitle>
                        <StatusBadge status={jsonImportResult.paper.status} />
                      </div>
                      <CardDescription>
                        Imported directly via JSON · Ready in Question Bank
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="default" size="sm" className="gap-2">
                        <Link to={`/review?paperId=${jsonImportResult.paper._id}`}>
                          <FileCheck className="h-4 w-4" />
                          Review Questions
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link to="/create-mock">
                          <PlusCircle className="h-4 w-4 text-primary" />
                          Create Mock
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link to="/papers">
                          <FileStack className="h-4 w-4 text-primary" />
                          All Papers
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground font-medium">Total Imported</p>
                        <p className="text-xl font-bold text-foreground mt-0.5">
                          {jsonImportResult.questionsCount}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground font-medium">Verified</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">
                          {jsonImportResult.verifiedCount}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground font-medium">Needs Review</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          {jsonImportResult.needsReviewCount}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-xs text-muted-foreground font-medium">Missing Qs (120)</p>
                        <p className="text-xl font-bold text-muted-foreground mt-0.5">
                          {jsonImportResult.missingQNos?.length ?? 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Format Guide Card (1 Col) */}
            <div>
              <Card className="border-border/80 shadow-none bg-card/60">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    JSON Format Guide
                  </CardTitle>
                  <CardDescription>
                    Required schema for questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Each Question Requires:</p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li><code className="text-primary font-mono">text</code>: Question text (supports <code className="text-foreground">$LaTeX$</code>)</li>
                      <li><code className="text-primary font-mono">options</code>: Object with <code className="text-foreground">A, B, C, D</code> or an array of 4 strings</li>
                      <li><code className="text-primary font-mono">correctOption</code>: <code className="text-foreground">"A"</code>, <code className="text-foreground">"B"</code>, <code className="text-foreground">"C"</code>, or <code className="text-foreground">"D"</code></li>
                      <li><code className="text-primary font-mono">section</code>: <code className="text-foreground">General Awareness</code>, <code className="text-foreground">Mathematics</code>, or <code className="text-foreground">Reasoning</code></li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-1.5 text-muted-foreground">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      Tip
                    </p>
                    <p className="leading-relaxed">
                      Click <strong>"Load Template"</strong> to paste a pre-filled valid JSON template. You can edit question texts, answers, and add as many questions as needed.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-muted/40 p-3 flex items-center gap-2.5 text-muted-foreground">
                    <Lock className="h-4 w-4 text-primary shrink-0" />
                    <span>Imported directly into your local database.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
